"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { useCart } from "@/components/CartProvider";
import { useQuote } from "@/components/CartView";
import { money } from "@/lib/format";

export function CheckoutForm() {
  const { lines } = useCart();
  const { quote, error: quoteError, ready } = useQuote();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          address: form.get("address"),
          website: form.get("website"),
          lines
        })
      });
      const data = (await res.json()) as { checkoutUrl?: string; errors?: string[] };
      if (!res.ok || !data.checkoutUrl) {
        setErrors(data.errors?.length ? data.errors : ["We could not start the payment. Please try again."]);
        setBusy(false);
        return;
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      setErrors(["Network error. Check your connection and try again."]);
      setBusy(false);
    }
  }

  if (!ready || (!quote && !quoteError)) return <p className="muted">Loading your order...</p>;
  if (lines.length === 0)
    return (
      <div className="empty-state">
        <h2 style={{ fontSize: "var(--fs-h3)" }}>Your cart is empty.</h2>
        <p>Add stickers before checking out.</p>
        <Link className="button button-primary" href="/shop">
          Go to shop
        </Link>
      </div>
    );

  return (
    <div className="grid grid-sidebar">
      <div className="form-card">
        {quoteError ? <Notice tone="error">{quoteError}</Notice> : null}
        {errors.length ? (
          <Notice tone="error" title="Please check your order">
            <ul className="mb-0">
              {errors.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Notice>
        ) : null}
        <form className="stack-form" onSubmit={onSubmit} noValidate={false}>
          <div className="form-row form-row-2">
            <div className="field">
              <label htmlFor="co-name">
                Full name <span className="req">*</span>
              </label>
              <input id="co-name" className="input" name="name" required maxLength={150} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="co-phone">Mobile number</label>
              <input id="co-phone" className="input" name="phone" maxLength={30} autoComplete="tel" inputMode="tel" placeholder="09xx xxx xxxx" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="co-email">
              Email address <span className="req">*</span>
            </label>
            <input id="co-email" className="input" type="email" name="email" required maxLength={200} autoComplete="email" />
            <span className="hint">Your receipt and order ticket are sent here.</span>
          </div>
          <div className="field">
            <label htmlFor="co-address">
              Shipping address <span className="req">*</span>
            </label>
            <textarea id="co-address" className="textarea" name="address" required maxLength={1000} autoComplete="street-address" />
          </div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
          <button className={`button button-primary button-lg${busy ? " is-loading" : ""}`} type="submit" disabled={busy || !quote || quote.lines.length === 0}>
            <Icon name="credit-card" /> Pay {money(quote?.total ?? 0)}
          </button>
          <p className="caption mb-0">
            <Icon name="lock" size="sm" /> You will be sent to PayMongo to pay securely with GCash, Maya, card or QR Ph. Your order is confirmed only after the payment succeeds.
          </p>
        </form>
      </div>
      <aside className="summary-card is-sticky">
        <h2 style={{ fontSize: "var(--fs-h4)" }}>Checkout summary</h2>
        {quote?.lines.map((l) => (
          <div key={l.key} className="summary-line">
            <span>
              {l.name} ({l.colorLabel}, {l.textureLabel}) x {l.quantity}
            </span>
            <span className="price-stack price-stack-inline">
              {l.onSale ? <span className="old-price">{money(l.originalSubtotal)}</span> : null}
              <strong className={l.onSale ? "new-price" : ""}>{money(l.subtotal)}</strong>
            </span>
          </div>
        ))}
        {quote && quote.discount > 0 ? (
          <div className="summary-line">
            <span>Sale discount</span>
            <strong className="new-price">-{money(quote.discount)}</strong>
          </div>
        ) : null}
        <div className="summary-line total">
          <span>Total</span>
          <strong>{money(quote?.total ?? 0)}</strong>
        </div>
        <Link className="text-link" href="/cart">
          Edit cart
        </Link>
      </aside>
    </div>
  );
}
