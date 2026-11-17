import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Cart</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Your sticker haul</h1>
        <p className="lead">Adjust quantities, remove items, and continue to checkout when you are ready.</p>
        <CartView />
      </div>
    </section>
  );
}
