import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { createClient } from "@/lib/supabase/server";
import { formatDate, money } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_STATUS, orderBadge, paymentBadge } from "@/lib/options";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

const TABS = [
  { key: "to-ship", label: "Paid - to fulfil" },
  { key: "unpaid", label: "Awaiting payment" },
  { key: "all", label: "All orders" }
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; success?: string; error?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "to-ship";
  const q = String(sp.q ?? "").trim().slice(0, 80);
  const supabase = await createClient();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (tab === "to-ship") query = query.in("payment_status", ["paid", "offline"]).not("status", "in", "(completed,cancelled)");
  if (tab === "unpaid") query = query.in("payment_status", ["pending", "failed", "expired"]).neq("status", "cancelled");
  if (q) query = query.or(`order_ticket.ilike.%${q.replace(/[%,()]/g, "")}%,customer_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query.returns<Order[]>();
  const orders = data ?? [];
  return (
    <>
      <div className="page-head">
        <h1>Orders</h1>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <nav className="tab-list" aria-label="Order views">
        {TABS.map((t) => (
          <Link key={t.key} className="tab" href={`/admin/orders?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <form method="get" className="cluster">
        <input type="hidden" name="tab" value={tab} />
        <label className="sr-only" htmlFor="o-q">
          Search orders
        </label>
        <input id="o-q" className="input" name="q" defaultValue={q} placeholder="Ticket, name or email" style={{ maxWidth: "24rem" }} />
        <button className="button button-secondary" type="submit">
          <Icon name="search" /> Search
        </button>
      </form>
      {orders.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: "var(--fs-h4)" }}>No orders in this view.</h2>
          <p className="mb-0">Paid checkout orders appear here as soon as PayMongo confirms them.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table-stack">
            <thead>
              <tr>
                <th scope="col">Ticket</th>
                <th scope="col">Customer</th>
                <th scope="col">Payment</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col">Placed</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Ticket">
                    <strong>{o.order_ticket}</strong>
                  </td>
                  <td data-label="Customer">
                    <span>
                      {o.customer_name}
                      <br />
                      <span className="caption">{o.email}</span>
                    </span>
                  </td>
                  <td data-label="Payment">
                    <span className={paymentBadge(o.payment_status)}>{PAYMENT_STATUS[o.payment_status]}</span>
                  </td>
                  <td data-label="Status">
                    <span className={orderBadge(o.status)}>{ORDER_STATUS[o.status]}</span>
                  </td>
                  <td data-label="Total" className="num">
                    {money(o.total_price)}
                  </td>
                  <td data-label="Placed">{formatDate(o.created_at)}</td>
                  <td data-label="Open">
                    <Link className="text-button" href={`/admin/orders/${o.id}`} aria-label={`Open order ${o.order_ticket}`}>
                      <Icon name="chevron-right" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
