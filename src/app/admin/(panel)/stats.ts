import { createClient } from "@/lib/supabase/server";
import { round2 } from "@/lib/format";

const PAID = ["paid", "offline"];

/** Port of PHP sales_tracker_summary(): revenue counts only PAID orders + PAID custom orders. */
export async function salesSummary() {
  const supabase = await createClient();
  const now = new Date();
  const manila = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const offset = manila.getTime() - now.getTime();
  const startOfDay = new Date(new Date(manila.getFullYear(), manila.getMonth(), manila.getDate()).getTime() - offset).toISOString();
  const startOfMonth = new Date(new Date(manila.getFullYear(), manila.getMonth(), 1).getTime() - offset).toISOString();

  const [{ data: orders }, { data: customs }, { data: items }] = await Promise.all([
    supabase.from("orders").select("id, total_price, subtotal_price, discount_amount, paid_at, created_at").in("payment_status", PAID),
    supabase.from("custom_orders").select("id, quoted_price, paid_at, updated_at").in("payment_status", PAID),
    supabase.from("order_items").select("quantity, orders!inner(payment_status)").in("orders.payment_status", PAID)
  ]);
  const o = orders ?? [];
  const c = customs ?? [];
  const when = (r: { paid_at: string | null; created_at?: string; updated_at?: string }) => r.paid_at ?? r.created_at ?? r.updated_at ?? "";
  const sum = (rows: Record<string, unknown>[], key: string) => round2(rows.reduce((s, r) => s + Number(r[key] ?? 0), 0));
  const orderCount = o.length + c.length;
  const revenue = round2(sum(o, "total_price") + sum(c, "quoted_price"));
  const todayO = o.filter((r) => when(r) >= startOfDay);
  const todayC = c.filter((r) => when(r) >= startOfDay);
  const monthO = o.filter((r) => when(r) >= startOfMonth);
  const monthC = c.filter((r) => when(r) >= startOfMonth);
  return {
    orders: orderCount,
    revenue,
    subtotal: round2(sum(o, "subtotal_price") + sum(c, "quoted_price")),
    discounts: sum(o, "discount_amount"),
    averageOrder: orderCount ? round2(revenue / orderCount) : 0,
    itemsSold: (items ?? []).reduce((s, r) => s + Number(r.quantity ?? 0), 0),
    todayOrders: todayO.length + todayC.length,
    todayRevenue: round2(sum(todayO, "total_price") + sum(todayC, "quoted_price")),
    monthOrders: monthO.length + monthC.length,
    monthRevenue: round2(sum(monthO, "total_price") + sum(monthC, "quoted_price")),
    paidOrders: o.map((r) => ({ when: when(r), total: Number(r.total_price) }))
  };
}

export function dailySeries(rows: { when: string; total: number }[], days = 14) {
  const out: { label: string; value: number; orders: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const match = rows.filter((r) => r.when && new Date(r.when).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) === key);
    out.push({ label: d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" }), value: round2(match.reduce((s, r) => s + r.total, 0)), orders: match.length });
  }
  return out;
}

export function monthlySeries(rows: { when: string; total: number }[], months = 6) {
  const out: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const count = rows.filter((r) => {
      const w = new Date(r.when);
      return `${w.getFullYear()}-${w.getMonth()}` === key;
    }).length;
    out.push({ label: d.toLocaleDateString("en-PH", { month: "short" }), value: count });
  }
  return out;
}
