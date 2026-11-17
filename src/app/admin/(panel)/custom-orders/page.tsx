import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { signCustomImages } from "@/lib/data";
import { formatDate, money } from "@/lib/format";
import { publicEnv } from "@/lib/env";
import { CONTACT_OPTIONS, CUSTOM_STATUS, PAYMENT_STATUS, paymentBadge } from "@/lib/options";
import type { CustomOrder } from "@/lib/types";
import { updateCustomOrder } from "../actions";

export const metadata: Metadata = { title: "Custom orders" };

const ORDER = ["new", "contacted", "quoted", "approved", "in_progress", "completed", "cancelled"];

export default async function CustomOrdersPage({ searchParams }: { searchParams: Promise<{ view?: string; success?: string; error?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "archived" ? "archived" : "active";
  const supabase = await createClient();
  let q = supabase.from("custom_orders").select("*").order("updated_at", { ascending: false });
  q = view === "archived" ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  const { data } = await q.returns<CustomOrder[]>();
  const orders = (data ?? []).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const urls = await signCustomImages(orders.map((o) => o.image_path));
  const { siteUrl } = publicEnv();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Custom orders</p>
          <h1>Quotes, contacts and Custom Wall</h1>
        </div>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <nav className="tab-list" aria-label="Custom order views">
        <Link className="tab" href="/admin/custom-orders?view=active" aria-current={view === "active" ? "page" : undefined}>
          Active
        </Link>
        <Link className="tab" href="/admin/custom-orders?view=archived" aria-current={view === "archived" ? "page" : undefined}>
          Archived
        </Link>
      </nav>
      {orders.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: "var(--fs-h4)" }}>No {view} custom orders.</h2>
          <p className="mb-0">{view === "archived" ? "Archived custom orders will appear here." : "New requests from the custom order page will appear here."}</p>
        </div>
      ) : (
        <div className="stack-lg">
          {orders.map((o) => {
            const img = o.image_path ? urls[o.image_path] : undefined;
            const payLink = `${siteUrl}/quote/${o.pay_token}`;
            const paid = o.payment_status === "paid" || o.payment_status === "offline";
            return (
              <article key={o.id} className="card request-card">
                <div className="between">
                  <div className="cluster">
                    <span className="badge badge-accent">{CUSTOM_STATUS[o.status]}</span>
                    <span className={paymentBadge(o.payment_status)}>{PAYMENT_STATUS[o.payment_status]}</span>
                    {o.is_featured ? <span className="pill">On Custom Wall</span> : null}
                  </div>
                  <span className="caption">CUS-{String(o.id).padStart(6, "0")}</span>
                </div>
                <div className={`request-body${img ? " has-image" : ""}`}>
                  {img ? (
                    <a href={img} target="_blank" rel="noopener noreferrer" aria-label="Open reference image in a new tab">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="request-image" src={img} alt={o.description.slice(0, 120)} />
                    </a>
                  ) : null}
                  <div className="stack">
                    <h2 style={{ fontSize: "var(--fs-h4)", textTransform: "none", margin: 0 }}>{o.customer_name || "Unnamed customer"}</h2>
                    <p className="muted pre-line mb-0">{o.description}</p>
                    <dl className="meta-grid">
                      <div>
                        <dt>Size</dt>
                        <dd>{o.size}</dd>
                      </div>
                      <div>
                        <dt>Preferred contact</dt>
                        <dd>{CONTACT_OPTIONS[o.preferred_contact]}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>{o.email || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{o.phone || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Social</dt>
                        <dd>{o.social_handle || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Submitted</dt>
                        <dd>{formatDate(o.created_at)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <form action={updateCustomOrder} className="stack-form">
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="view" value={view} />
                  <input type="hidden" name="action" value="update" />
                  <div className="form-row form-row-3">
                    <div className="field">
                      <label htmlFor={`s-${o.id}`}>Status</label>
                      <select id={`s-${o.id}`} className="select" name="status" defaultValue={o.status}>
                        {Object.entries(CUSTOM_STATUS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`q-${o.id}`}>Quoted price (PHP)</label>
                      <input id={`q-${o.id}`} className="input" type="number" name="quoted_price" min="0" step="0.01" defaultValue={o.quoted_price ?? ""} disabled={paid} />
                      {paid ? <input type="hidden" name="quoted_price" value={o.quoted_price ?? ""} /> : null}
                    </div>
                    <div className="field" style={{ alignContent: "end" }}>
                      <label className="switch">
                        <input type="checkbox" name="is_featured" defaultChecked={o.is_featured} /> Feature on Custom Wall
                      </label>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor={`n-${o.id}`}>Admin notes</label>
                    <textarea id={`n-${o.id}`} className="textarea" name="admin_notes" maxLength={4000} defaultValue={o.admin_notes ?? ""} />
                  </div>
                  <SubmitButton>
                    <Icon name="save" /> Save custom order
                  </SubmitButton>
                </form>

                {o.quoted_price && ["quoted", "approved"].includes(o.status) && !paid ? (
                  <div className="notice">
                    <Icon name="credit-card" />
                    <div className="notice-body">
                      <span className="notice-title">Payment link for {money(o.quoted_price)}</span>
                      Send this to the customer: <code style={{ overflowWrap: "anywhere" }}>{payLink}</code>
                    </div>
                  </div>
                ) : null}

                <div className="cluster">
                  {!paid && o.quoted_price ? (
                    <form action={updateCustomOrder}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="view" value={view} />
                      <input type="hidden" name="action" value="mark_offline" />
                      <SubmitButton className="button button-secondary button-sm" confirmText="Mark this quote as paid by cash or bank transfer?">
                        <Icon name="check" /> Mark paid (offline)
                      </SubmitButton>
                    </form>
                  ) : null}
                  <form action={updateCustomOrder}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="view" value={view} />
                    <input type="hidden" name="action" value={view === "archived" ? "restore" : "archive"} />
                    <SubmitButton className="button button-secondary button-sm">
                      <Icon name={view === "archived" ? "undo" : "archive"} /> {view === "archived" ? "Restore" : "Archive"}
                    </SubmitButton>
                  </form>
                  <form action={updateCustomOrder}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="view" value={view} />
                    <input type="hidden" name="action" value="delete" />
                    <SubmitButton className="button button-danger button-sm" confirmText="Delete this custom request and its image permanently?">
                      <Icon name="trash" /> Delete
                    </SubmitButton>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
