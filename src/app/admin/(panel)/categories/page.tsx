import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { getCategories } from "@/lib/data";
import { categoryAction } from "../actions";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const sp = await searchParams;
  const categories = await getCategories();
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Categories</p>
          <h1>Shape the shop filters</h1>
        </div>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <div className="grid grid-sidebar">
        <div className="stack">
          {categories.map((c) => (
            <div key={c.id} className="card between">
              <form action={categoryAction} className="cluster" style={{ flex: 1 }}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="action" value="rename" />
                <label className="sr-only" htmlFor={`cat-${c.id}`}>
                  Category name
                </label>
                <input id={`cat-${c.id}`} className="input" name="name" defaultValue={c.name} required maxLength={100} style={{ maxWidth: "20rem" }} />
                <SubmitButton className="button button-secondary button-sm">
                  <Icon name="check" /> Save
                </SubmitButton>
              </form>
              <form action={categoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="action" value="delete" />
                <SubmitButton className="text-button icon-only" aria-label={`Delete ${c.name}`} confirmText={`Delete ${c.name}? Its products move to Uncategorized.`}>
                  <Icon name="trash" />
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
        <aside className="form-card">
          <h3>New category</h3>
          <form action={categoryAction} className="stack-form">
            <input type="hidden" name="action" value="create" />
            <div className="field">
              <label htmlFor="cat-new">Category name</label>
              <input id="cat-new" className="input" name="name" required maxLength={100} />
            </div>
            <SubmitButton>
              <Icon name="plus" /> Add category
            </SubmitButton>
          </form>
        </aside>
      </div>
    </>
  );
}
