import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Checkout</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Complete your order</h1>
        <p className="lead">Enter your details, then pay securely with GCash, Maya, card or QR Ph.</p>
        <CheckoutForm />
      </div>
    </section>
  );
}
