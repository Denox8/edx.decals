import crypto from "node:crypto";
import { paymongoEnv } from "@/lib/env";

const API = "https://api.paymongo.com/v1";

export type PayMongoLineItem = { name: string; quantity: number; amount: number /* PHP, not centavos */ };

function authHeader(secretKey: string): string {
  return "Basic " + Buffer.from(`${secretKey}:`).toString("base64");
}

/** PayMongo amounts are integer centavos. */
export function toCentavos(php: number): number {
  return Math.round(php * 100);
}

/**
 * Creates a hosted Checkout Session. The customer chooses GCash / Maya / card / QR Ph on PayMongo's page,
 * so card numbers and wallet logins never touch this app.
 */
export async function createCheckoutSession(input: {
  lineItems: PayMongoLineItem[];
  description: string;
  referenceNumber: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  customer: { name: string; email?: string; phone?: string };
}): Promise<{ id: string; checkoutUrl: string }> {
  const { secretKey, methods } = paymongoEnv();
  const body = {
    data: {
      attributes: {
        ...(input.customer.email
          ? { billing: { name: input.customer.name, email: input.customer.email, ...(input.customer.phone ? { phone: input.customer.phone } : {}) } }
          : {}),
        line_items: input.lineItems.map((li) => ({
          name: li.name.slice(0, 255),
          quantity: li.quantity,
          amount: toCentavos(li.amount),
          currency: "PHP"
        })),
        payment_method_types: methods,
        description: input.description.slice(0, 255),
        reference_number: input.referenceNumber,
        metadata: input.metadata,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true
      }
    }
  };
  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader(secretKey) },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { id: string; attributes?: { checkout_url?: string } };
    errors?: { detail?: string }[];
  };
  if (!res.ok || !json.data?.attributes?.checkout_url) {
    const detail = json.errors?.map((e) => e.detail).filter(Boolean).join("; ") || `HTTP ${res.status}`;
    throw new Error(`PayMongo checkout could not be created: ${detail}`);
  }
  return { id: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
}

/**
 * Verifies the "Paymongo-Signature" header: t=<timestamp>,te=<test sig>,li=<live sig>
 * signature = HMAC-SHA256(webhookSecret, `${t}.${rawBody}`) as hex.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const { webhookSecret, isLive } = paymongoEnv();
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    })
  );
  const timestamp = parts.t;
  const provided = isLive ? parts.li : parts.te;
  if (!timestamp || !provided) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
