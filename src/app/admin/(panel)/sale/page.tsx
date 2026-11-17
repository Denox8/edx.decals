import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { getProducts, getSettings } from "@/lib/data";
import { money } from "@/lib/format";
import { priceData } from "@/lib/pricing";
import { saveSale } from "../actions";

export const metadata: Metadata = { title: "Sale mode" };

export default async function SalePage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const sp = await searchParams;
  const [settings, products] = await Promise.all([getSettings(), getProducts({ includeHidden: true })]);
  const sample = products[0];
  const live = settings.sale_mode && settings.sale_discount > 0;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Global sale mode</p>
          <h1>Control sitewide decal discounts</h1>
          <p className="muted mb-0">One discount for the storefront, cart and checkout. PayMongo is charged the discounted price.</p>
        </div>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <div className="grid grid-sidebar">
        <form action={saveSale} className="form-card stack-form">
          <label className="switch">
            <input type="checkbox" name="sale_mode" defaultChecked={settings.sale_mode} /> Enable sale mode
          </label>
          <div className="form-row form-row-2">
            <div className="field">
              <label htmlFor="s-discount">Discount percentage</label>
              <input id="s-discount" className="input" type="number" name="sale_discount" min={0} max={100} step={1} defaultValue={settings.sale_discount} />
            </div>
            <div className="field">
              <label htmlFor="s-scope">Sale applies to</label>
              <select id="s-scope" className="select" name="sale_scope" defaultValue={settings.sale_scope}>
                <option value="all">All products</option>
                <option value="selected">Selected products only</option>
              </select>
            </div>
          </div>
          <fieldset>
            <legend>Choose sale products</legend>
            <p className="hint">Checking any product switches the sale to selected-products mode when you save.</p>
            <div className="stack" style={{ maxHeight: "20rem", overflow: "auto", padding: "var(--space-3)", border: "1px solid var(--line)" }}>
              {products.map((p) => (
                <label key={p.id} className="check">
                  <input type="checkbox" name="products" value={p.id} defaultChecked={p.sale_selected} /> {p.name}
                </label>
              ))}
            </div>
          </fieldset>
          <SubmitButton>
            <Icon name="save" /> Save sale settings
          </SubmitButton>
        </form>
        <aside className="summary-card">
          <span className={live ? "pill" : "badge badge-outline"}>{live ? "Live sale" : "Preview"}</span>
          <h3>{live ? `${settings.sale_discount}% OFF` : "Regular pricing"}</h3>
          <p className="muted">
            {live
              ? `Customers see a sale banner, discount badges and reduced prices on ${settings.sale_scope === "selected" ? "selected products" : "every product"}.`
              : "Turn sale mode on to discount all decals or only the products you choose."}
          </p>
          {sample ? (
            <div className="summary-line">
              <span>{sample.name}</span>
              <span className="price-stack price-stack-inline">
                {priceData({ ...sample, sale_selected: true }, settings).onSale ? <span className="old-price">{money(sample.price)}</span> : null}
                <strong>{money(priceData({ ...sample, sale_selected: true }, settings).final)}</strong>
              </span>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
