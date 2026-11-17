import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { clean } from "@/lib/format";

export const metadata: Metadata = { title: "Payment cancelled" };

export default async function PaymentCancelledPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const ticket = clean((await searchParams).ticket, 40).toUpperCase();
  return (
    <section className="section">
      <div className="container-narrow stack">
        <p className="eyebrow">Payment</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Payment not completed</h1>
        <Notice tone="warning">No money was taken. Your cart is still saved{ticket ? ` and order ${ticket} is waiting for payment` : ""}.</Notice>
        <div className="cluster">
          <Link className="button button-primary" href="/checkout">
            <Icon name="credit-card" /> Try again
          </Link>
          <Link className="button button-secondary" href="/cart">
            Back to cart
          </Link>
        </div>
      </div>
    </section>
  );
}
