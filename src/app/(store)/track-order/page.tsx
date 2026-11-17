import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { OrderSteps } from "@/components/OrderSteps";
import { SubmitButton } from "@/components/SubmitButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { clean, formatDate, money } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { ORDER_STATUS, PAYMENT_STATUS, orderBadge, paymentBadge } from "@/lib/options";
import type { Order, OrderItem } from "@/lib/types";
import { retryOrderPayment } from "../actions";

export const metadata: Metadata = { title: "Track Order" };
export const dynamic = "force-dynamic";

type Search = { ticket?: string; email?: string; error?: string };

export default async function TrackOrderPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const ticket = clean(sp.ticket, 40).toUpperCase();
  const email = clean(sp.email, 200).toLowerCase();
  let order: Order | null = null;
  let items: OrderItem[] = [];
  if (ticket && email) {
    // Ticket AND email must match: tickets are sequential, so a ticket alone must not reveal customer details.
    const admin = createAdminClient();
    const { data } = await admin.from("orders").select("*").eq("order_ticket", ticket).maybeSingle<Order>();
    if (data && data.email.toLowerCase() === email) {
      order = data;
      const { data: rows } = await admin.from("order_items").select("*").eq("order_id", data.id).order("id").returns<OrderItem[]>();
      items = rows ?? [];
    }
  }
  const canPay = order && !["paid", "offline", "refunded"].includes(order.payment_status) && order.status !== "cancelled";

  return (
    <section className="section">
      <div className="container stack-lg">
        <div>
          <p className="eyebrow">Track order</p>
          <h1 style={{ fontSize: "var(--fs-h2)" }}>Check your order status</h1>
          <p className="lead">Enter the ticket you received after checkout and the email you used.</p>
        </div>
        <div className="grid grid-sidebar">
          <div className="form-card">
            <form method="get" className="stack-form">
              <div className="form-row form-row-2">
                <div className="field">
                  <label htmlFor="t-ticket">Order ticket</label>
                  <input id="t-ticket" className="input" name="ticket" defaultValue={ticket} placeholder="ORD-000123" required maxLength={40} />
                </div>
                <div className="field">
                  <label htmlFor="t-email">Email used at checkout</label>
                  <input id="t-email" className="input" type="email" name="email" defaultValue={email} required maxLength={200} />
                </div>
              </div>
              <button className="button button-primary" type="submit">
                <Icon name="search" /> Track order
              </button>
            </form>
            {sp.error === "payment" ? <Notice tone="error">The payment page could not be opened. Please try again in a moment.</Notice> : null}
            {ticket && email && !order ? <Notice tone="warning">No order matches that ticket and email.</Notice> : null}
          </div>

          <aside className="summary-card">
            <h2 style={{ fontSize: "var(--fs-h4)" }}>Order status</h2>
            {order ? (
              <>
                <div className="order-ticket-code">{order.order_ticket}</div>
                <dl className="kv">
                  <div>
                    <dt>Payment</dt>
                    <dd>
                      <span className={paymentBadge(order.payment_status)}>{PAYMENT_STATUS[order.payment_status]}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={orderBadge(order.status)}>{ORDER_STATUS[order.status]}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Customer</dt>
                    <dd>{order.customer_name}</dd>
                  </div>
                  <div>
                    <dt>Placed</dt>
                    <dd>{formatDate(order.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{money(order.total_price)}</dd>
                  </div>
                </dl>
                {order.status_notes ? (
                  <Notice title="Latest update">
                    <p className="mb-0 pre-line">{order.status_notes}</p>
                  </Notice>
                ) : null}
                {canPay ? (
                  <form action={retryOrderPayment}>
                    <input type="hidden" name="ticket" value={order.order_ticket} />
                    <input type="hidden" name="email" value={email} />
                    <SubmitButton className="button button-primary button-block">
                      <Icon name="credit-card" /> Pay {money(order.total_price)} now
                    </SubmitButton>
                  </form>
                ) : null}
              </>
            ) : (
              <p className="muted mb-0">Submit your ticket and email to view progress, notes, and order details.</p>
            )}
          </aside>
        </div>

        {order ? (
          <div className="grid grid-split">
            <div className="card">
              <h3>Progress</h3>
              <OrderSteps status={order.status} />
            </div>
            <div className="card">
              <h3>What&apos;s in your order</h3>
              <div className="stack">
                {items.map((i) => (
                  <div key={i.id} className="cluster" style={{ alignItems: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(i.product_image)} alt="" width={56} height={56} style={{ width: 56, height: 56, objectFit: "contain", background: "var(--surface-soft)" }} />
                    <div style={{ flex: 1 }}>
                      <strong>{i.product_name}</strong>
                      <div className="caption">
                        {i.color_label} | {i.texture_label} | Qty {i.quantity}
                      </div>
                    </div>
                    <strong>{money(Number(i.final_unit_price) * i.quantity)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
