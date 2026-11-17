import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetail } from "@/components/ProductDetail";
import { getProduct, getProducts, getSettings } from "@/lib/data";
import { priceData } from "@/lib/pricing";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await getProduct(Number((await params).id));
  return { title: product ? product.name : "Sticker not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [product, settings] = await Promise.all([getProduct(id), getSettings()]);
  if (!product || !product.is_active) notFound();
  const more = (await getProducts({ limit: 8 })).filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  return (
    <section className="section">
      <div className="container stack-lg">
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumb">
            <li>
              <Link href="/shop">Shop</Link>
            </li>
            <li>
              <Link href={`/shop?category=${encodeURIComponent(product.category.toLowerCase())}`}>{product.category}</Link>
            </li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>
        <ProductDetail product={product} price={priceData(product, settings)} />
        {more.length ? (
          <div>
            <div className="section-title">
              <h2 style={{ fontSize: "var(--fs-h3)" }}>More from the shop</h2>
              <Link className="text-link" href="/shop">
                View all
              </Link>
            </div>
            <div className="product-grid">
              {more.map((p) => (
                <ProductCard key={p.id} product={p} settings={settings} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
