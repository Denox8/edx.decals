import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { getCategories } from "@/lib/data";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li>
            <Link href="/admin/products">Products</Link>
          </li>
          <li aria-current="page">Add product</li>
        </ol>
      </nav>
      <h1 style={{ fontSize: "var(--fs-h2)" }}>Add product</h1>
      <div className="form-card">
        <ProductForm product={null} categories={categories.map((c) => c.name)} />
      </div>
    </>
  );
}
