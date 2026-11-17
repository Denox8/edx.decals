import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductsByIdsForCheckout, getSettingsForCheckout } from "@/lib/data";
import { createOrderCheckout } from "@/lib/checkout";
import { clean, cleanMultiline, isEmail } from "@/lib/format";
import { priceCart } from "@/lib/pricing";
import { publicEnv } from "@/lib/env";
import type { CartLine } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(errors: string[], status = 400) {
  return NextResponse.json({ errors }, { status });
}

/**
 * Checkout (replaces checkout.php):
 * 1. validate customer details  2. reprice the cart from the database  3. create the order (status received, payment pending)
 * 4. create a PayMongo Checkout Session and return its URL. The order becomes PAID only from the webhook.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad(["Invalid request."]);
  }
  if (clean(body.website as string)) return bad(["Invalid request."]); // honeypot

  const name = clean(body.name as string, 150);
  const email = clean(body.email as string, 200).toLowerCase();
  const phone = clean(body.phone as string, 30);
  const address = cleanMultiline(body.address as string, 1000);
  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!isEmail(email)) errors.push("A valid email address is required.");
  if (!address) errors.push("Address is required.");

  const rawLines = Array.isArray(body.lines) ? (body.lines as CartLine[]).slice(0, 100) : [];
  const lines: CartLine[] = rawLines.flatMap((l) => {
    const productId = Number(l?.productId);
    const quantity = Math.trunc(Number(l?.quantity));
    const color = String(l?.color ?? "");
    const texture = String(l?.texture ?? "");
    if (!Number.isInteger(productId) || productId < 1 || !(quantity > 0) || !color || !texture) return [];
    return [{ key: `${productId}:${color}:${texture}`, productId, color, texture, quantity: Math.min(999, quantity) }];
  });
  if (lines.length === 0) errors.push("Your cart is empty.");
  if (errors.length) return bad(errors);

  const [products, settings] = await Promise.all([getProductsByIdsForCheckout([...new Set(lines.map((l) => l.productId))]), getSettingsForCheckout()]);
  const summary = priceCart(lines, products, settings);
  if (summary.invalid.length) return bad(["Some items in your cart are no longer available. Please review your cart."], 409);
  if (summary.total <= 0) return bad(["Order total must be greater than zero."]);

  const admin = createAdminClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("email", email).eq("payment_status", "pending").gte("created_at", hourAgo);
  if ((count ?? 0) >= 10) return bad(["Too many unpaid orders for this email. Please finish or wait before trying again."], 429);

  const { data: order, error } = await admin
    .rpc("place_order", {
      p_order: {
        customer_name: name,
        email,
        phone,
        address,
        subtotal_price: summary.subtotal,
        discount_amount: summary.discount,
        discount_percentage: settings.sale_mode ? settings.sale_discount : 0,
        total_price: summary.total
      },
      p_items: summary.lines.map((l) => ({
        product_id: l.product.id,
        product_name: l.product.name,
        product_image: l.color.image ?? l.product.images[0]?.path ?? l.product.cover_image,
        sticker_color: l.color.value,
        color_label: l.color.label,
        sticker_texture: l.texture.value,
        texture_label: l.texture.label,
        unit_price: l.price.original,
        final_unit_price: l.price.final,
        discount_percentage: l.price.discountPercentage,
        quantity: l.quantity
      }))
    })
    .single<{ id: number; order_ticket: string }>();
  if (error || !order) return bad(["We could not place your order right now. Please try again."], 500);

  const origin = request.headers.get("origin");
  const base = origin && origin.startsWith("http") ? origin : publicEnv().siteUrl;
  try {
    const checkoutUrl = await createOrderCheckout(order.id, base);
    return NextResponse.json({ checkoutUrl, ticket: order.order_ticket });
  } catch {
    return bad([`Your order ${order.order_ticket} was saved, but the payment page could not be opened. Use Track Order with your ticket and email to pay, or try again shortly.`], 502);
  }
}
