import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getProducts, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Shop" };
export const revalidate = 60;

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category = "all" } = await searchParams;
  const [products, categories, settings] = await Promise.all([getProducts(), getCategories(), getSettings()]);
  const active = category.toLowerCase();
  const visible = active === "all" ? products : products.filter((p) => p.category.toLowerCase() === active);
  const used = categories.filter((c) => products.some((p) => p.category.toLowerCase() === c.name.toLowerCase()));
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Shop</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Browse the sticker wall</h1>
        <p className="lead">Filter by theme, open a product, and choose the options you want before adding it to the cart.</p>
        <nav className="filter-bar" aria-label="Filter by category">
          <Link className={`filter-button${active === "all" ? " is-active" : ""}`} href="/shop" aria-current={active === "all" ? "page" : undefined}>
            All
          </Link>
          {used.map((c) => {
            const key = c.name.toLowerCase();
            return (
              <Link key={c.id} className={`filter-button${active === key ? " is-active" : ""}`} href={`/shop?category=${encodeURIComponent(key)}`} aria-current={active === key ? "page" : undefined}>
                {c.name}
              </Link>
            );
          })}
        </nav>
        {visible.length ? (
          <div className="product-grid">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>
        ) : (
          <p className="muted text-center">No stickers match this category yet.</p>
        )}
      </div>
    </section>
  );
}
