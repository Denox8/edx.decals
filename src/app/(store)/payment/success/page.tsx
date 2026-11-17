import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { createAdminClient } from "@/lib/supabase/admin";
import { clean } from "@/lib/format";
import { PAYMENT_STATUS, paymentBadge } from "@/lib/options";
import type { PaymentStatus } from "@/lib/types";
import { ClearCartOnMount } from "../ClearCartOnMount";

export const metadata: Metadata = { title: "Payment received" };
export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const ticket = clean((await searchParams).ticket, 40).toUpperCase();
  let status: PaymentStatus | null = null;
  if (ticket) {
    const { data } = await createAdminClient().from("orders").select("payment_status").eq("order_ticket", ticket).maybeSingle();
    status = (data?.payment_status as PaymentStatus) ?? null;
  }
  const confirmed = status === "paid" || status === "offline";
  return (
    <section className="section">
      <ClearCartOnMount />
      <div className="container-narrow stack">
        <p className="eyebrow">Order locked in</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Thank you for your order</h1>
        {ticket ? (
          <div className="card stack">
            <h2 style={{ fontSize: "var(--fs-h5)" }}>Track this order with your ticket</h2>
            <div className="order-ticket-code">{ticket}</div>
            {status ? (
              <p className="mb-0">
                Payment: <span className={paymentBadge(status)}>{PAYMENT_STATUS[status]}</span>
              </p>
            ) : null}
            {confirmed ? (
              <Notice tone="success">Payment confirmed. We will start working on your stickers.</Notice>
            ) : (
              <Notice tone="info">We are confirming your payment with PayMongo. This usually takes a few seconds - refresh this page or check Track Order.</Notice>
            )}
            <p className="muted mb-0">Save this code. Use it with your email on Track Order anytime to check your latest status.</p>
          </div>
        ) : null}
        <div className="cluster">
          <Link className="button button-primary" href={`/track-order?ticket=${encodeURIComponent(ticket)}`}>
            <Icon name="pin" /> Track order
          </Link>
          <Link className="button button-secondary" href="/shop">
            Keep shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
