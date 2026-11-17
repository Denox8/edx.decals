import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { salesSummary } from "./stats";

const SHORTCUTS: { href: string; icon: IconName; tag: string; title: string; text: string }[] = [
  { href: "/admin/orders", icon: "receipt", tag: "Orders", title: "Ship paid orders", text: "Paid orders first, then update status and tracking notes." },
  { href: "/admin/products", icon: "package", tag: "Products", title: "Open product manager", text: "Product cards, quick edits, gallery and variant images." },
  { href: "/admin/custom-orders", icon: "scissors", tag: "Custom", title: "Quote custom requests", text: "Set a price and send the customer a payment link." },
  { href: "/admin/requests", icon: "inbox", tag: "Messages", title: "Review customer messages", text: "Archive finished conversations, delete spam." },
  { href: "/admin/sale", icon: "percent", tag: "Sale mode", title: "Run a promo", text: "Discount every decal or only selected products." },
  { href: "/admin/theme", icon: "swatch", tag: "Theme", title: "Switch the whole site vibe", text: "Pick a palette for the shop and admin." }
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const [s, products, categories, custom, messages] = await Promise.all([
    salesSummary(),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("custom_orders").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("messages").select("id", { count: "exact", head: true }).is("archived_at", null)
  ]);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Admin</p>
          <h1>Dashboard</h1>
        </div>
        <Link className="button button-primary" href="/admin/products/new">
          <Icon name="plus" /> Add product
        </Link>
      </div>
      <div className="admin-stats cols-6">
        <article className="stat-card">
          <span>Paid revenue</span>
          <strong>{money(s.revenue)}</strong>
        </article>
        <article className="stat-card">
          <span>Paid orders</span>
          <strong>{s.orders}</strong>
        </article>
        <article className="stat-card">
          <span>Revenue today</span>
          <strong>{money(s.todayRevenue)}</strong>
        </article>
        <article className="stat-card">
          <span>Products</span>
          <strong>{products.count ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Categories</span>
          <strong>{categories.count ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Open requests</span>
          <strong>{(custom.count ?? 0) + (messages.count ?? 0)}</strong>
        </article>
      </div>
      <div className="grid grid-3">
        {SHORTCUTS.map((x) => (
          <Link key={x.href} href={x.href} className="card card-link stack">
            <span className="badge badge-accent">
              <Icon name={x.icon} size="sm" /> {x.tag}
            </span>
            <h3 style={{ fontSize: "var(--fs-h5)", textTransform: "none" }}>{x.title}</h3>
            <p className="muted mb-0">{x.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
