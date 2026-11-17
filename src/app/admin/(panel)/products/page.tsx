import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { getProducts } from "@/lib/data";
import { money } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { deleteProduct, moveProduct } from "../actions";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const sp = await searchParams;
  const products = await getProducts({ includeHidden: true });
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Products</p>
          <h1>Product cards</h1>
          <p className="muted mb-0">The order here is the order on the homepage and shop.</p>
        </div>
        <Link className="button button-primary" href="/admin/products/new">
          <Icon name="plus" /> Add product
        </Link>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <div className="admin-product-grid">
        {products.map((p, index) => (
          <article key={p.id} className="card stack">
            <Link href={`/admin/products/${p.id}/edit`} className="stack">
              <div className="product-image-wrap" style={{ aspectRatio: "1 / 0.7" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="product-image" src={imageUrl(p.images[0]?.path ?? p.cover_image)} alt="" />
              </div>
              <div className="between">
                <strong>{p.name}</strong>
                <span>{money(p.price)}</span>
              </div>
            </Link>
            <div className="cluster">
              <span className="badge badge-outline">{p.category}</span>
              {!p.is_active ? <span className="badge badge-warning">Hidden</span> : null}
              {p.sale_selected ? <span className="badge badge-accent">Sale pick</span> : null}
              <span className="caption">
                {p.images.length} image{p.images.length === 1 ? "" : "s"} · {p.colors.length} color{p.colors.length === 1 ? "" : "s"} · {p.textures.length} texture
                {p.textures.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="between">
              <form action={moveProduct} className="cluster">
                <input type="hidden" name="id" value={p.id} />
                <label className="sr-only" htmlFor={`pos-${p.id}`}>
                  Position
                </label>
                <input id={`pos-${p.id}`} className="input" type="number" name="position" min={1} max={products.length} defaultValue={index + 1} style={{ width: "5rem" }} />
                <button className="button button-secondary button-sm" type="submit" name="direction" value="set">
                  Set
                </button>
                <button className="text-button icon-only" type="submit" name="direction" value="up" aria-label={`Move ${p.name} up`} disabled={index === 0}>
                  <Icon name="arrow-up" />
                </button>
                <button className="text-button icon-only" type="submit" name="direction" value="down" aria-label={`Move ${p.name} down`} disabled={index === products.length - 1}>
                  <Icon name="arrow-down" />
                </button>
              </form>
              <span className="cluster">
                <Link className="text-button icon-only" href={`/admin/products/${p.id}/edit`} aria-label={`Edit ${p.name}`}>
                  <Icon name="edit" />
                </Link>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="text-button icon-only" aria-label={`Delete ${p.name}`} confirmText={`Delete ${p.name}? Past orders keep their saved name and price.`}>
                    <Icon name="trash" />
                  </SubmitButton>
                </form>
              </span>
            </div>
          </article>
        ))}
        <Link href="/admin/products/new" className="card card-link stack" style={{ alignContent: "center" }}>
          <span className="avatar" aria-hidden="true">
            <Icon name="plus" />
          </span>
          <strong>Add a new product</strong>
          <span className="muted">Pricing, category, description, colors, textures and gallery images.</span>
        </Link>
      </div>
    </>
  );
}
