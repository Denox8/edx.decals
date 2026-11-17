import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/paymongo";
import { publicEnv } from "@/lib/env";
import type { Order, OrderItem } from "@/lib/types";

/**
 * Creates a PayMongo Checkout Session for an existing order using the prices SAVED on the order
 * (never prices from the browser) and records a pending row in public.payments.
 */
export async function createOrderCheckout(orderId: number, baseUrl?: string): Promise<string> {
  const admin = createAdminClient();
  const { data: order, error } = await admin.from("orders").select("*").eq("id", orderId).single<Order>();
  if (error || !order) throw new Error("Order not found.");
  if (order.payment_status === "paid" || order.payment_status === "offline") throw new Error("This order is already paid.");
  if (order.status === "cancelled") throw new Error("This order was cancelled.");
  const { data: items } = await admin.from("order_items").select("*").eq("order_id", orderId).returns<OrderItem[]>();
  if (!items?.length) throw new Error("Order has no items.");

  const site = (baseUrl ?? publicEnv().siteUrl).replace(/\/+$/, "");
  const ticket = order.order_ticket;
  const session = await createCheckoutSession({
    lineItems: items.map((i) => ({
      name: `${i.product_name} (${i.color_label}, ${i.texture_label})`,
      quantity: i.quantity,
      amount: Number(i.final_unit_price)
    })),
    description: `EDX Decals order ${ticket}`,
    referenceNumber: ticket,
    metadata: { kind: "order", order_id: String(order.id), order_ticket: ticket },
    successUrl: `${site}/payment/success?ticket=${encodeURIComponent(ticket)}`,
    cancelUrl: `${site}/payment/cancelled?ticket=${encodeURIComponent(ticket)}`,
    customer: { name: order.customer_name, email: order.email, phone: order.phone || undefined }
  });

  const { error: payErr } = await admin.from("payments").insert({
    order_id: order.id,
    provider_checkout_id: session.id,
    amount: Number(order.total_price),
    status: "pending"
  });
  if (payErr) throw new Error("Could not record the payment session.");
  if (order.payment_status !== "pending") await admin.from("orders").update({ payment_status: "pending" }).eq("id", order.id);
  return session.checkoutUrl;
}
