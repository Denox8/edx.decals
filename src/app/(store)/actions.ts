"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductsByIdsForCheckout, getSettingsForCheckout } from "@/lib/data";
import { clean, cleanMultiline, isEmail } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { priceCart } from "@/lib/pricing";
import { createCheckoutSession } from "@/lib/paymongo";
import { createOrderCheckout } from "@/lib/checkout";
import { publicEnv } from "@/lib/env";
import { isRealFile, uploadImage } from "@/lib/upload";
import { CONTACT_OPTIONS, isOneOf } from "@/lib/options";
import type { ActionState, CartLine } from "@/lib/types";

export type QuotedLine = {
  key: string;
  productId: number;
  name: string;
  image: string;
  colorLabel: string;
  colorHex: string;
  textureLabel: string;
  quantity: number;
  unitOriginal: number;
  unitFinal: number;
  discountPercentage: number;
  onSale: boolean;
  originalSubtotal: number;
  subtotal: number;
};
export type Quote = { lines: QuotedLine[]; invalidKeys: string[]; items: number; subtotal: number; discount: number; total: number };

function sanitizeLines(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 100).flatMap((l) => {
    const productId = Number((l as CartLine)?.productId);
    const color = String((l as CartLine)?.color ?? "");
    const texture = String((l as CartLine)?.texture ?? "");
    const quantity = Math.trunc(Number((l as CartLine)?.quantity));
    if (!Number.isInteger(productId) || productId < 1 || !color || !texture || !(quantity > 0)) return [];
    return [{ key: `${productId}:${color}:${texture}`, productId, color, texture, quantity: Math.min(999, quantity) }];
  });
}

/** Reprices the browser cart on the server (cart page + checkout summary). */
export async function quoteCart(rawLines: unknown): Promise<Quote> {
  const lines = sanitizeLines(rawLines);
  const [products, settings] = await Promise.all([getProductsByIdsForCheckout([...new Set(lines.map((l) => l.productId))]), getSettingsForCheckout()]);
  const summary = priceCart(lines, products, settings);
  return {
    lines: summary.lines.map((l) => ({
      key: l.key,
      productId: l.product.id,
      name: l.product.name,
      image: imageUrl(l.color.image ?? l.product.images[0]?.path ?? l.product.cover_image),
      colorLabel: l.color.label,
      colorHex: l.color.hex,
      textureLabel: l.texture.label,
      quantity: l.quantity,
      unitOriginal: l.price.original,
      unitFinal: l.price.final,
      discountPercentage: l.price.discountPercentage,
      onSale: l.price.onSale,
      originalSubtotal: l.originalSubtotal,
      subtotal: l.subtotal
    })),
    invalidKeys: summary.invalid.map((l) => l.key),
    items: summary.items,
    subtotal: summary.subtotal,
    discount: summary.discount,
    total: summary.total
  };
}

async function tooManyRequests(table: "messages" | "custom_orders", email: string): Promise<boolean> {
  // Light spam guard: max 5 submissions per email per hour.
  if (!email) return false;
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
  return (count ?? 0) >= 5;
}

export async function submitContact(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (clean(form.get("website"))) return { ok: true, message: "Your message has been sent." }; // honeypot
  const name = clean(form.get("name"), 150);
  const email = clean(form.get("email"), 200).toLowerCase();
  const message = cleanMultiline(form.get("message"), 3000);
  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!isEmail(email)) errors.push("A valid email address is required.");
  if (!message) errors.push("Message is required.");
  if (errors.length) return { ok: false, message: "Please fix the highlighted fields.", errors };
  if (await tooManyRequests("messages", email)) return { ok: false, message: "Too many messages from this email. Please try again later." };
  const { error } = await createAdminClient().from("messages").insert({ name, email, message });
  if (error) return { ok: false, message: "We could not send your message right now. Please try again." };
  return { ok: true, message: "Your message has been sent." };
}

export async function submitCustomOrder(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (clean(form.get("website"))) return { ok: true, message: "Custom request submitted." };
  const customer_name = clean(form.get("customer_name"), 255);
  const email = clean(form.get("email"), 200).toLowerCase();
  const phone = clean(form.get("phone"), 100);
  const social_handle = clean(form.get("social_handle"), 255);
  const preferredRaw = clean(form.get("preferred_contact"), 20);
  const preferred_contact = isOneOf(preferredRaw, CONTACT_OPTIONS) ? preferredRaw : "email";
  const description = cleanMultiline(form.get("description"), 2000);
  const size = clean(form.get("size"), 120);
  const file = form.get("image");
  const errors: string[] = [];
  if (!customer_name) errors.push("Your name is required.");
  if (!email && !phone && !social_handle) errors.push("Add at least one way to reach you (email, phone, or social).");
  if (email && !isEmail(email)) errors.push("Email address is not valid.");
  if (!description) errors.push("Sticker description is required.");
  if (!size) errors.push("Preferred size is required.");
  if (!isRealFile(file)) errors.push("Upload a reference image.");
  if (errors.length) return { ok: false, message: "Please fix the highlighted fields.", errors };
  if (await tooManyRequests("custom_orders", email)) return { ok: false, message: "Too many requests from this email. Please try again later." };

  const admin = createAdminClient();
  let image_path: string;
  try {
    image_path = await uploadImage(admin, "custom-orders", file as File, `custom-${customer_name}`);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Upload failed." };
  }
  const { error } = await admin.from("custom_orders").insert({ customer_name, email, phone, social_handle, preferred_contact, description, size, image_path });
  if (error) {
    await admin.storage.from("custom-orders").remove([image_path]);
    return { ok: false, message: "We could not save your request right now. Please try again." };
  }
  return { ok: true, message: "Custom request submitted. We will contact you with a quote." };
}

/** Customer pays an admin-approved quote from /quote/[token]. */
export async function startQuotePayment(form: FormData): Promise<void> {
  const token = clean(form.get("token"), 60);
  const admin = createAdminClient();
  const { data: order } = await admin.from("custom_orders").select("*").eq("pay_token", token).maybeSingle();
  if (!order || order.quoted_price === null || Number(order.quoted_price) <= 0) redirect(`/quote/${token}?error=unavailable`);
  if (order.payment_status === "paid" || order.payment_status === "offline") redirect(`/quote/${token}`);
  if (!["quoted", "approved"].includes(order.status)) redirect(`/quote/${token}?error=unavailable`);

  const { siteUrl } = publicEnv();
  const origin = (await headers()).get("origin") ?? siteUrl;
  const base = origin.startsWith("http") ? origin : siteUrl;
  const ref = `CUS-${String(order.id).padStart(6, "0")}`;
  const amount = Number(order.quoted_price);
  let checkoutUrl = "";
  try {
    const session = await createCheckoutSession({
      lineItems: [{ name: `Custom decal ${ref} (${order.size})`, quantity: 1, amount }],
      description: `EDX Decals custom order ${ref}`,
      referenceNumber: ref,
      metadata: { kind: "custom_order", custom_order_id: String(order.id) },
      successUrl: `${base}/quote/${token}?paid=1`,
      cancelUrl: `${base}/quote/${token}?cancelled=1`,
      customer: { name: order.customer_name || "Customer", email: order.email || undefined, phone: order.phone || undefined }
    });
    await admin.from("payments").insert({ custom_order_id: order.id, provider_checkout_id: session.id, amount, status: "pending" });
    await admin.from("custom_orders").update({ payment_status: "pending" }).eq("id", order.id);
    checkoutUrl = session.checkoutUrl;
  } catch {
    redirect(`/quote/${token}?error=payment`);
  }
  redirect(checkoutUrl);
}

/** "Pay now" from the Track Order page for an unpaid / expired / failed order. */
export async function retryOrderPayment(form: FormData): Promise<void> {
  const ticket = clean(form.get("ticket"), 40).toUpperCase();
  const email = clean(form.get("email"), 200).toLowerCase();
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, email").eq("order_ticket", ticket).maybeSingle();
  const back = `/track-order?ticket=${encodeURIComponent(ticket)}&email=${encodeURIComponent(email)}`;
  if (!order || String(order.email).toLowerCase() !== email) redirect(`${back}&error=notfound`);
  let url = "";
  try {
    const { siteUrl } = publicEnv();
    url = await createOrderCheckout(Number(order.id), siteUrl);
  } catch {
    redirect(`${back}&error=payment`);
  }
  redirect(url);
}
