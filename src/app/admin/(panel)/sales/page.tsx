import type { Metadata } from "next";
import Link from "next/link";
import { BarChart, LineChart } from "@/components/admin/Charts";
import { createClient } from "@/lib/supabase/server";
import { formatDate, money, round2 } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_STATUS, paymentBadge } from "@/lib/options";
import type { Order } from "@/lib/types";
import { dailySeries, monthlySeries, salesSummary } from "../stats";

export const metadata: Metadata = { title: "Sales tracker" };

export default async function SalesPage() {
  const supabase = await createClient();
  const [s, { data: recent }, { data: items }] = await Promise.all([
    salesSummary(),
    supabase.from("orders").select("*").in("payment_status", ["paid", "offline"]).order("paid_at", { ascending: false }).limit(12).returns<Order[]>(),
    supabase.from("order_items").select("product_id, product_name, quantity, final_unit_price, orders!inner(payment_status)").in("orders.payment_status", ["paid", "offline"])
  ]);
  const top = new Map<string, { name: string; units: number; revenue: number }>();
  (items ?? []).forEach((i) => {
    const key = String(i.product_id ?? i.product_name);
    const row = top.get(key) ?? { name: String(i.product_name), units: 0, revenue: 0 };
    row.units += Number(i.quantity);
    row.revenue = round2(row.revenue + Number(i.final_unit_price) * Number(i.quantity));
    top.set(key, row);
  });
  const best = [...top.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 8);
  const daily = dailySeries(s.paidOrders, 14);
  const monthly = monthlySeries(s.paidOrders, 6);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Sales tracker</p>
          <h1>Revenue, discounts and order flow</h1>
          <p className="muted mb-0">Only paid orders (online or marked offline) and paid custom quotes count as revenue.</p>
        </div>
      </div>
      <div className="admin-stats cols-6">
        <article className="stat-card">
          <span>Paid orders</span>
          <strong>{s.orders}</strong>
        </article>
        <article className="stat-card">
          <span>Total revenue</span>
          <strong>{money(s.revenue)}</strong>
        </article>
        <article className="stat-card">
          <span>Average order</span>
          <strong>{money(s.averageOrder)}</strong>
        </article>
        <article className="stat-card">
          <span>Items sold</span>
          <strong>{s.itemsSold}</strong>
        </article>
        <article className="stat-card">
          <span>Discounts given</span>
          <strong>{money(s.discounts)}</strong>
        </article>
        <article className="stat-card">
          <span>Revenue today</span>
          <strong>{money(s.todayRevenue)}</strong>
        </article>
      </div>
      <div className="grid grid-split">
        <section className="card stack">
          <div className="between">
            <h3 className="mb-0">Revenue pulse</h3>
            <span className="badge badge-outline">Last 14 days</span>
          </div>
          <LineChart series={daily} label="Paid revenue per day, last 14 days" />
        </section>
        <section className="card stack">
          <div className="between">
            <h3 className="mb-0">Order volume</h3>
            <span className="badge badge-outline">Last 6 months</span>
          </div>
          <BarChart series={monthly} label="Paid orders per month, last 6 months" />
        </section>
      </div>
      <div className="grid grid-sidebar">
        <section className="card stack">
          <h3>Latest paid orders</h3>
          {recent?.length ? (
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
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td data-label="Ticket">
                        <Link className="text-link" href={`/admin/orders/${o.id}`}>
                          {o.order_ticket}
                        </Link>
                      </td>
                      <td data-label="Customer">
                        <span>
                          {o.customer_name}
                          <br />
                          <span className="caption">{formatDate(o.paid_at ?? o.created_at)}</span>
                        </span>
                      </td>
                      <td data-label="Payment">
                        <span className={paymentBadge(o.payment_status)}>{PAYMENT_STATUS[o.payment_status]}</span>
                      </td>
                      <td data-label="Status">{ORDER_STATUS[o.status]}</td>
                      <td data-label="Total" className="num">
                        {o.discount_amount > 0 ? <span className="old-price">{money(o.subtotal_price)} </span> : null}
                        {money(o.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted mb-0">Paid orders will appear here after the first completed payment.</p>
          )}
        </section>
        <aside className="stack-lg">
          <section className="summary-card">
            <h3>Period snapshot</h3>
            <div className="summary-line">
              <span>Orders today</span>
              <strong>{s.todayOrders}</strong>
            </div>
            <div className="summary-line">
              <span>Orders this month</span>
              <strong>{s.monthOrders}</strong>
            </div>
            <div className="summary-line">
              <span>Revenue this month</span>
              <strong>{money(s.monthRevenue)}</strong>
            </div>
            <div className="summary-line">
              <span>Sales before discounts</span>
              <strong>{money(s.subtotal)}</strong>
            </div>
            <div className="summary-line total">
              <span>Net revenue</span>
              <strong className="new-price">{money(s.revenue)}</strong>
            </div>
          </section>
          <section className="summary-card">
            <h3>Best sellers</h3>
            {best.length ? (
              best.map((b) => (
                <div key={b.name} className="summary-line">
                  <span>
                    {b.name}
                    <br />
                    <span className="caption">{b.units} sold</span>
                  </span>
                  <strong>{money(b.revenue)}</strong>
                </div>
              ))
            ) : (
              <p className="muted mb-0">No paid sales yet.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
