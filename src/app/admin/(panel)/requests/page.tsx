import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Message } from "@/lib/types";
import { messageAction } from "../actions";

export const metadata: Metadata = { title: "Messages" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ view?: string; success?: string; error?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "archived" ? "archived" : "active";
  const supabase = await createClient();
  let q = supabase.from("messages").select("*").order("created_at", { ascending: false });
  q = view === "archived" ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  const { data } = await q.returns<Message[]>();
  const messages = data ?? [];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Messages</p>
          <h1>Customer messages</h1>
          <p className="muted mb-0">Custom sticker requests live in Custom orders.</p>
        </div>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <nav className="tab-list" aria-label="Message views">
        <Link className="tab" href="/admin/requests?view=active" aria-current={view === "active" ? "page" : undefined}>
          Active
        </Link>
        <Link className="tab" href="/admin/requests?view=archived" aria-current={view === "archived" ? "page" : undefined}>
          Archived
        </Link>
      </nav>
      {messages.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: "var(--fs-h4)" }}>No {view} messages.</h2>
          <p className="mb-0">Messages from the contact page appear here.</p>
        </div>
      ) : (
        <div className="stack">
          {messages.map((m) => (
            <article key={m.id} className="card stack">
              <div className="between">
                <div>
                  <strong>{m.name}</strong>
                  <br />
                  <a className="text-link" href={`mailto:${m.email}`}>
                    {m.email}
                  </a>
                </div>
                <span className="badge badge-outline">{formatDate(m.created_at)}</span>
              </div>
              <p className="pre-line mb-0">{m.message}</p>
              <div className="cluster">
                <form action={messageAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="view" value={view} />
                  <input type="hidden" name="action" value={view === "archived" ? "restore" : "archive"} />
                  <SubmitButton className="button button-secondary button-sm">
                    <Icon name={view === "archived" ? "undo" : "archive"} /> {view === "archived" ? "Restore" : "Archive"}
                  </SubmitButton>
                </form>
                <form action={messageAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="view" value={view} />
                  <input type="hidden" name="action" value="delete" />
                  <SubmitButton className="button button-danger button-sm" confirmText="Delete this message permanently?">
                    <Icon name="trash" /> Delete
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
