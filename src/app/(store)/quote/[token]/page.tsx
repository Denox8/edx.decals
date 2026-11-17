import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { money } from "@/lib/format";
import { CUSTOM_STATUS, PAYMENT_STATUS, paymentBadge } from "@/lib/options";
import type { CustomOrder } from "@/lib/types";
import { startQuotePayment } from "../../actions";

export const metadata: Metadata = { title: "Your custom quote", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QuotePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string; cancelled?: string; error?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  if (!UUID.test(token)) notFound();
  const { data: order } = await createAdminClient().from("custom_orders").select("*").eq("pay_token", token).maybeSingle<CustomOrder>();
  if (!order) notFound();
  const ref = `CUS-${String(order.id).padStart(6, "0")}`;
  const paid = order.payment_status === "paid" || order.payment_status === "offline";
  const payable = !paid && order.quoted_price !== null && Number(order.quoted_price) > 0 && ["quoted", "approved"].includes(order.status);

  return (
    <section className="section">
      <div className="container-narrow stack">
        <p className="eyebrow">Custom quote</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>{ref}</h1>
        {sp.paid ? <Notice tone="success">Thank you! We are confirming your payment. This page updates once PayMongo confirms it.</Notice> : null}
        {sp.cancelled ? <Notice tone="warning">Payment was not completed. No money was taken.</Notice> : null}
        {sp.error === "payment" ? <Notice tone="error">The payment page could not be opened. Please try again shortly.</Notice> : null}
        {sp.error === "unavailable" ? <Notice tone="error">This quote cannot be paid yet. We will contact you.</Notice> : null}
        <div className="card stack">
          <dl className="kv">
            <div>
              <dt>Customer</dt>
              <dd>{order.customer_name}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{order.size}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{CUSTOM_STATUS[order.status]}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                <span className={paymentBadge(order.payment_status)}>{PAYMENT_STATUS[order.payment_status]}</span>
              </dd>
            </div>
            <div>
              <dt>Quoted price</dt>
              <dd className="price">{order.quoted_price !== null ? money(order.quoted_price) : "Not set yet"}</dd>
            </div>
          </dl>
          <p className="muted pre-line mb-0">{order.description}</p>
          {payable ? (
            <form action={startQuotePayment}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="button button-primary button-lg button-block">
                <Icon name="credit-card" /> Accept and pay {money(order.quoted_price)}
              </SubmitButton>
            </form>
          ) : null}
          {paid ? <Notice tone="success">Paid. Your custom decal is in production.</Notice> : null}
        </div>
        <Link className="text-link" href="/contact">
          Questions about this quote? Contact us
        </Link>
      </div>
    </section>
  );
}
