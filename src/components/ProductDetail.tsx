"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Price } from "@/components/Price";
import { useCart } from "@/components/CartProvider";
import { imageUrl } from "@/lib/images";
import type { PriceData } from "@/lib/pricing";
import type { Product } from "@/lib/types";

/** Gallery + colour/texture/quantity + Add to cart (port of product.php + main.js gallery/variant logic). */
export function ProductDetail({ product, price }: { product: Product; price: PriceData }) {
  const { add } = useCart();
  const gallery = useMemo(() => product.images.map((i) => imageUrl(i.path)), [product.images]);
  const [color, setColor] = useState(product.colors[0]?.value ?? "white");
  const [texture, setTexture] = useState(product.textures[0]?.value ?? "glossy");
  const [qty, setQty] = useState(1);
  const firstVariant = product.colors[0]?.image ? imageUrl(product.colors[0].image) : null;
  const [main, setMain] = useState(firstVariant ?? gallery[0] ?? imageUrl(null));

  function pickColor(value: string) {
    setColor(value);
    const variant = product.colors.find((c) => c.value === value)?.image;
    if (variant) setMain(imageUrl(variant));
  }

  return (
    <div className="product-detail-grid">
      <div className="card product-detail-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="product-detail-image" src={main} alt={product.name} />
        {gallery.length > 1 || product.colors.some((c) => c.image) ? (
          <div className="product-thumb-row">
            {[...gallery, ...product.colors.filter((c) => c.image).map((c) => imageUrl(c.image))]
              .filter((src, i, all) => all.indexOf(src) === i)
              .map((src, i) => (
                <button key={src} type="button" className={`product-thumb${src === main ? " is-active" : ""}`} onClick={() => setMain(src)} aria-label={`Show image ${i + 1}`} aria-pressed={src === main}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </button>
              ))}
          </div>
        ) : null}
      </div>

      <div className="card stack">
        <span className="badge badge-outline">{product.category}</span>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>{product.name}</h1>
        <div className="cluster">
          <Price price={price} large />
          {price.onSale ? <span className="pill">Sale -{price.discountPercentage}%</span> : null}
        </div>
        <p className="lead pre-line">{product.description}</p>

        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            add(product.id, color, texture, qty, product.name);
          }}
        >
          <fieldset>
            <legend>Sticker color</legend>
            <div className="swatch-options">
              {product.colors.map((c) => (
                <label key={c.value} className="swatch-option">
                  <input type="radio" name="color" value={c.value} checked={color === c.value} onChange={() => pickColor(c.value)} />
                  <span className="swatch" style={{ ["--swatch-color" as string]: c.hex }} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Sticker texture</legend>
            <div className="swatch-options">
              {product.textures.map((t) => (
                <label key={t.value} className="swatch-option">
                  <input type="radio" name="texture" value={t.value} checked={texture === t.value} onChange={() => setTexture(t.value)} />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="qty">Quantity</label>
            <div className="stepper">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                <Icon name="minus" />
              </button>
              <input id="qty" type="number" inputMode="numeric" min={1} max={999} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(999, Math.trunc(Number(e.target.value) || 1))))} />
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(999, q + 1))}>
                <Icon name="plus" />
              </button>
            </div>
          </div>
          <button className="button button-primary button-lg" type="submit">
            <Icon name="cart" /> Add to cart
          </button>
        </form>
        <ul className="plain-list">
          <li>Pay online with GCash, Maya, or card at checkout.</li>
          <li>Track progress anytime with your order ticket.</li>
        </ul>
      </div>
    </div>
  );
}
