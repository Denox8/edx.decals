import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { inviteAdmin, removeAdmin, renameMe } from "../actions";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Admin users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: rows }, { data: list }] = await Promise.all([
    admin.from("admins").select("user_id, display_name, created_at").order("display_name"),
    admin.auth.admin.listUsers({ perPage: 1000 })
  ]);
  const emails = new Map((list?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const admins = rows ?? [];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Admin users</p>
          <h1>Share access with your team</h1>
          <p className="muted mb-0">Each person signs in with their own email. Passwords are handled by Supabase Auth.</p>
        </div>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <div className="grid grid-sidebar">
        <div className="stack">
          {admins.map((a) => (
            <article key={a.user_id} className="card between">
              <span className="cluster">
                <span className="avatar" aria-hidden="true">
                  {String(a.display_name)
                    .split(/\s+/)
                    .map((p: string) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span>
                  <strong>{a.display_name}</strong> {a.user_id === me.userId ? <span className="badge badge-accent">You</span> : null}
                  <br />
                  <span className="caption">
                    {emails.get(a.user_id) || "-"} · added {formatDate(a.created_at, false)}
                  </span>
                </span>
              </span>
              {a.user_id !== me.userId ? (
                <form action={removeAdmin}>
                  <input type="hidden" name="user_id" value={a.user_id} />
                  <SubmitButton className="text-button icon-only" aria-label={`Remove ${a.display_name}`} confirmText={`Remove admin access for ${a.display_name}?`}>
                    <Icon name="trash" />
                  </SubmitButton>
                </form>
              ) : null}
            </article>
          ))}
        </div>
        <aside className="stack-lg">
          <form action={inviteAdmin} className="form-card stack-form">
            <h3>Add admin user</h3>
            <div className="field">
              <label htmlFor="u-name">Display name</label>
              <input id="u-name" className="input" name="display_name" required maxLength={150} />
            </div>
            <div className="field">
              <label htmlFor="u-email">Email</label>
              <input id="u-email" className="input" type="email" name="email" required maxLength={200} />
              <span className="hint">New people get an invite email to set their own password.</span>
            </div>
            <SubmitButton>
              <Icon name="plus" /> Add admin user
            </SubmitButton>
          </form>
          <form action={renameMe} className="form-card stack-form">
            <h3>Your display name</h3>
            <div className="field">
              <label htmlFor="u-me">Display name</label>
              <input id="u-me" className="input" name="display_name" required maxLength={150} defaultValue={me.displayName} />
            </div>
            <SubmitButton className="button button-secondary">
              <Icon name="save" /> Save name
            </SubmitButton>
          </form>
          <div className="form-card">
            <h3>Change password</h3>
            <PasswordForm />
          </div>
        </aside>
      </div>
    </>
  );
}
