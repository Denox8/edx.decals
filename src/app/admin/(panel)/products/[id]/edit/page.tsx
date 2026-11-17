import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { ProductForm } from "@/components/admin/ProductForm";
import { SubmitButton } from "@/components/SubmitButton";
import { getCategories, getProduct } from "@/lib/data";
import { imageUrl } from "@/lib/images";
import { deleteProductImage } from "../../../actions";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const [product, categories] = await Promise.all([getProduct(id, { asAdmin: true }), getCategories()]);
  if (!product) notFound();
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li>
            <Link href="/admin/products">Products</Link>
          </li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>
      <div className="page-head">
        <h1 style={{ fontSize: "var(--fs-h2)" }}>{product.name}</h1>
        <Link className="button button-secondary" href={`/product/${product.id}`} target="_blank">
          <Icon name="external-link" /> View in shop
        </Link>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <div className="grid grid-sidebar">
        <div className="form-card">
          <ProductForm product={product} categories={categories.map((c) => c.name)} />
        </div>
        <aside className="summary-card">
          <h3>Gallery</h3>
          {product.images.filter((i) => i.id > 0).length ? (
            <div className="admin-gallery">
              {product.images
                .filter((i) => i.id > 0)
                .map((img) => (
                  <figure key={img.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(img.path)} alt="Gallery image" />
                    <form action={deleteProductImage}>
                      <input type="hidden" name="image_id" value={img.id} />
                      <input type="hidden" name="product_id" value={product.id} />
                      <SubmitButton className="text-button icon-only" aria-label="Remove gallery image" confirmText="Remove this gallery image?">
                        <Icon name="trash" />
                      </SubmitButton>
                    </form>
                  </figure>
                ))}
            </div>
          ) : (
            <p className="muted mb-0">No gallery images yet. Upload a cover or gallery images to improve the customer experience.</p>
          )}
        </aside>
      </div>
    </>
  );
}
