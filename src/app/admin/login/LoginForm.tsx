"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { createClient } from "@/lib/supabase/browser";

/** Supabase Auth email + password sign-in (replaces the PHP admin_users table and password hashes). */
export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const { error: err } = await createClient().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? "")
    });
    if (err) {
      setError("Email or password is incorrect.");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="field">
        <label htmlFor="l-email">Email</label>
        <div className="input-group" style={{ position: "relative" }}>
          <input id="l-email" className="input" type="email" name="email" required autoComplete="username" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="l-password">Password</label>
        <div className="cluster" style={{ flexWrap: "nowrap" }}>
          <input id="l-password" className="input" type={show ? "text" : "password"} name="password" required autoComplete="current-password" />
          <button type="button" className="text-button icon-only" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"}>
            <Icon name={show ? "eye-off" : "eye"} />
          </button>
        </div>
      </div>
      <button className={`button button-primary button-block${busy ? " is-loading" : ""}`} type="submit" disabled={busy}>
        <Icon name="log-in" /> Log in
      </button>
    </form>
  );
}
