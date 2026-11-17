"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { useCart } from "@/components/CartProvider";
import { quoteCart, type Quote } from "@/app/(store)/actions";
import { money } from "@/lib/format";

export function useQuote() {
  const { lines, ready, remove } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const signature = JSON.stringify(lines.map((l) => [l.key, l.quantity]));

  useEffect(() => {
    if (!ready) return;
    start(async () => {
      try {
        const q = await quoteCart(lines);
        setQuote(q);
        setError("");
        q.invalidKeys.forEach((k) => remove(k));
      } catch {
        setError("Prices could not be loaded. Check your connection and refresh.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature]);

  return { quote, error, pending, ready };
}

export function CartView() {
  const { lines, update, remove, clear } = useCart();
  const { quote, error, pending, ready } = useQuote();

  if (!ready || (!quote && !error)) {
    return <p className="muted" aria-busy="true">Loading your cart...</p>;
  }
  if (lines.length === 0) {
    return (
      <div className="empty-state">
        <h2 style={{ fontSize: "var(--fs-h3)" }}>Your cart is empty.</h2>
        <p>Pick a few designs from the shop and they will appear here.</p>
        <Link className="button button-primary" href="/shop">
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-sidebar">
      <div className="cart-items">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {quote?.invalidKeys.length ? <Notice tone="warning">Some items are no longer available and were removed from your cart.</Notice> : null}
        {quote?.lines.map((l) => (
          <article key={l.key} className="cart-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cart-item-image" src={l.image} alt={l.name} />
            <div>
              <h3>
                <Link href={`/product/${l.productId}`}>{l.name}</Link>
              </h3>
              <p className="muted mb-0 cluster" style={{ gap: "var(--space-2)" }}>
                <span className="swatch" style={{ ["--swatch-color" as string]: l.colorHex }} /> {l.colorLabel} · Texture: {l.textureLabel}
              </p>
              <p className="caption mb-0">
                {money(l.unitFinal)} each{l.onSale ? ` (-${l.discountPercentage}% OFF)` : ""}
              </p>
            </div>
            <div className="cart-item-side">
              <span className="price-stack price-stack-inline">
                {l.onSale ? <span className="old-price">{money(l.originalSubtotal)}</span> : null}
                <strong className={l.onSale ? "new-price" : ""}>{money(l.subtotal)}</strong>
              </span>
              <div className="cluster">
                <div className="stepper">
                  <button type="button" aria-label={`Decrease quantity of ${l.name}`} onClick={() => update(l.key, l.quantity - 1)}>
                    <Icon name="minus" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    aria-label={`Quantity of ${l.name}`}
                    value={l.quantity}
                    onChange={(e) => update(l.key, Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                  />
                  <button type="button" aria-label={`Increase quantity of ${l.name}`} onClick={() => update(l.key, l.quantity + 1)}>
                    <Icon name="plus" />
                  </button>
                </div>
                <button type="button" className="text-button icon-only" aria-label={`Remove ${l.name}`} title="Remove" onClick={() => remove(l.key)}>
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <aside className="summary-card is-sticky" aria-busy={pending}>
        <h2 style={{ fontSize: "var(--fs-h4)" }}>Order summary</h2>
        <div className="summary-line">
          <span>Items</span>
          <strong>{quote?.items ?? 0}</strong>
        </div>
        {quote && quote.discount > 0 ? (
          <>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong className="old-price">{money(quote.subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Sale discount</span>
              <strong className="new-price">-{money(quote.discount)}</strong>
            </div>
          </>
        ) : null}
        <div className="summary-line total">
          <span>Total</span>
          <strong className={quote && quote.discount > 0 ? "new-price" : ""}>{money(quote?.total ?? 0)}</strong>
        </div>
        <Link className="button button-primary button-block" href="/checkout" aria-disabled={!quote || quote.lines.length === 0}>
          Proceed to checkout <Icon name="arrow-right" />
        </Link>
        <button type="button" className="button button-ghost button-block" onClick={() => window.confirm("Remove every item from your cart?") && clear()}>
          Clear cart
        </button>
      </aside>
    </div>
  );
}
