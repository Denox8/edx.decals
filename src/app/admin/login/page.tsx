import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main id="main" className="login-shell">
      <div className="form-card login-card stack">
        <div className="between">
          <Logo href="/" />
          <ThemeToggle />
        </div>
        <p className="eyebrow mb-0">Admin access</p>
        <h1 style={{ fontSize: "var(--fs-h3)" }}>Manage your decal shop</h1>
        <p className="muted">Authorized shop staff only.</p>
        {error === "not-admin" ? <Notice tone="error">This account is not an admin. Ask an existing admin to add you.</Notice> : null}
        <LoginForm />
      </div>
    </main>
  );
}
