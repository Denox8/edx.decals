import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { OrderSteps } from "@/components/OrderSteps";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { formatDate, money } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { ORDER_STATUS, PAYMENT_STATUS, paymentBadge } from "@/lib/options";
import type { Order, OrderItem } from "@/lib/types";
import { updateOrder } from "../../actions";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const orderId = Number((await params).id);
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle<Order>();
  if (!order) notFound();
  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", orderId).order("id").returns<OrderItem[]>(),
    supabase.from("payments").select("id, status, amount, payment_method, provider_checkout_id, paid_at, created_at").eq("order_id", orderId).order("created_at", { ascending: false })
  ]);
  const paid = order.payment_status === "paid" || order.payment_status === "offline";
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li>
            <Link href="/admin/orders">Orders</Link>
          </li>
          <li aria-current="page">{order.order_ticket}</li>
        </ol>
      </nav>
      <div className="page-head">
        <h1>{order.order_ticket}</h1>
        <span className={paymentBadge(order.payment_status)}>{PAYMENT_STATUS[order.payment_status]}</span>
      </div>
      <Flash success={sp.success} error={sp.error} />
      {!paid ? (
        <div className="notice warning">
          <Icon name="alert-triangle" />
          <div className="notice-body">
            <span className="notice-title">Not paid yet</span>
            Do not print or ship until payment is confirmed. If the customer paid by cash or bank transfer, mark it below.
          </div>
        </div>
      ) : null}
      <div className="grid grid-sidebar">
        <div className="stack-lg">
          <div className="card">
            <h3>Items</h3>
            <div className="stack">
              {(items ?? []).map((i) => (
                <div key={i.id} className="between">
                  <span className="cluster">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(i.product_image)} alt="" width={56} height={56} style={{ width: 56, height: 56, objectFit: "contain", background: "var(--surface-soft)" }} />
                    <span>
                      <strong>{i.product_name}</strong>
                      <br />
                      <span className="caption">
                        {i.color_label} | {i.texture_label} | {money(i.final_unit_price)} x {i.quantity}
                        {i.discount_percentage ? ` (-${i.discount_percentage}%)` : ""}
                      </span>
                    </span>
                  </span>
                  <strong>{money(Number(i.final_unit_price) * i.quantity)}</strong>
                </div>
              ))}
            </div>
            <hr />
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(order.subtotal_price)}</strong>
            </div>
            <div className="summary-line">
              <span>Discount</span>
              <strong>-{money(order.discount_amount)}</strong>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <strong>{money(order.total_price)}</strong>
            </div>
          </div>
          <div className="card">
            <h3>Payments</h3>
            {payments?.length ? (
              <div className="table-wrap">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      <th scope="col">Created</th>
                      <th scope="col">Status</th>
                      <th scope="col">Method</th>
                      <th scope="col" className="num">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td data-label="Created">{formatDate(p.created_at)}</td>
                        <td data-label="Status">
                          <span className={paymentBadge(p.status)}>{PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS]}</span>
                        </td>
                        <td data-label="Method">{p.payment_method ?? "-"}</td>
                        <td data-label="Amount" className="num">
                          {money(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted mb-0">No online payment attempts.</p>
            )}
          </div>
        </div>
        <aside className="stack-lg">
          <div className="summary-card">
            <h3>Customer</h3>
            <dl className="kv">
              <div>
                <dt>Name</dt>
                <dd>{order.customer_name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{order.phone || "-"}</dd>
              </div>
              <div>
                <dt>Placed</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>{formatDate(order.paid_at)}</dd>
              </div>
            </dl>
            <p className="pre-line mb-0">{order.address}</p>
          </div>
          <div className="summary-card">
            <h3>Fulfilment</h3>
            <OrderSteps status={order.status} />
            <form action={updateOrder} className="stack-form">
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="action" value="status" />
              <div className="field">
                <label htmlFor="o-status">Status</label>
                <select id="o-status" className="select" name="status" defaultValue={order.status}>
                  {Object.entries(ORDER_STATUS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="o-notes">Tracking note (shown to the customer)</label>
                <textarea id="o-notes" className="textarea" name="status_notes" maxLength={1000} defaultValue={order.status_notes ?? ""} />
              </div>
              <SubmitButton>
                <Icon name="save" /> Update order
              </SubmitButton>
            </form>
            {!paid ? (
              <form action={updateOrder}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="action" value="mark_offline" />
                <SubmitButton className="button button-secondary button-block" confirmText="Mark this order as paid by cash or bank transfer?">
                  <Icon name="check" /> Mark paid (offline)
                </SubmitButton>
              </form>
            ) : null}
            <form action={updateOrder}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="action" value="delete" />
              <SubmitButton className="button button-danger button-block" confirmText="Delete this order permanently?">
                <Icon name="trash" /> Delete order
              </SubmitButton>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
