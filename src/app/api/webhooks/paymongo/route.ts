import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCentavos, verifyWebhookSignature } from "@/lib/paymongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * PayMongo webhook. Register in PayMongo Dashboard > Developers > Webhooks:
 *   URL:    https://YOUR-DOMAIN/api/webhooks/paymongo
 *   Events: checkout_session.payment.paid
 * Rules: signature must match, each event id is processed once, paid amount must equal the saved amount.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("paymongo-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: Json;
  try {
    event = JSON.parse(raw).data;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const eventId = String(event?.id ?? "");
  const type = String(event?.attributes?.type ?? "");
  if (!eventId || !type) return NextResponse.json({ error: "missing event" }, { status: 400 });

  const admin = createAdminClient();
  const { error: dupErr } = await admin.from("payment_events").insert({ id: eventId, type });
  if (dupErr) {
    if (dupErr.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }

  try {
    if (type === "checkout_session.payment.paid") {
      const session: Json = event.attributes.data;
      const sessionId = String(session?.id ?? "");
      const attrs: Json = session?.attributes ?? {};
      const payment: Json | undefined = Array.isArray(attrs.payments) ? attrs.payments[0] : undefined;
      const paidCentavos = Number(payment?.attributes?.amount ?? 0);
      const method = String(payment?.attributes?.source?.type ?? attrs.payment_method_used ?? "") || null;

      const { data: record } = await admin.from("payments").select("*").eq("provider_checkout_id", sessionId).maybeSingle();
      if (!record) {
        // Unknown session (e.g. created by another app on the same PayMongo account). Acknowledge, do nothing.
        return NextResponse.json({ ok: true, ignored: "unknown session" });
      }
      if (record.status === "paid") return NextResponse.json({ ok: true, already: true });

      const now = new Date().toISOString();
      if (paidCentavos !== toCentavos(Number(record.amount))) {
        await admin.from("payments").update({ status: "failed", raw_event: event }).eq("id", record.id);
        return NextResponse.json({ ok: true, flagged: "amount mismatch" });
      }

      await admin
        .from("payments")
        .update({ status: "paid", paid_at: now, provider_payment_id: payment?.id ?? null, payment_method: method, raw_event: event })
        .eq("id", record.id);

      if (record.order_id) {
        await admin.from("orders").update({ payment_status: "paid", paid_at: now }).eq("id", record.order_id);
      }
      if (record.custom_order_id) {
        const { data: co } = await admin.from("custom_orders").select("status").eq("id", record.custom_order_id).single();
        const status = co && ["quoted", "approved"].includes(co.status) ? "in_progress" : co?.status;
        await admin.from("custom_orders").update({ payment_status: "paid", paid_at: now, status }).eq("id", record.custom_order_id);
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Let PayMongo retry: forget this event id so the retry is processed.
    await admin.from("payment_events").delete().eq("id", eventId);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
