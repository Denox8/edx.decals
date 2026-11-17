"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { createClient } from "@/lib/supabase/browser";

export function PasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    if (password.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (password !== String(data.get("confirm") ?? "")) return setMsg({ ok: false, text: "Password confirmation does not match." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    form.reset();
    setMsg({ ok: true, text: "Password updated." });
  }

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      {msg ? <Notice tone={msg.ok ? "success" : "error"}>{msg.text}</Notice> : null}
      <div className="field">
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">Confirm new password</label>
        <input id="pw-confirm" className="input" type="password" name="confirm" required minLength={8} autoComplete="new-password" />
      </div>
      <button className={`button button-secondary${busy ? " is-loading" : ""}`} type="submit" disabled={busy}>
        <Icon name="lock" /> Update password
      </button>
    </form>
  );
}
