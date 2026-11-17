import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="login-shell">
      <div className="stack text-center" style={{ justifyItems: "center" }}>
        <Logo />
        <p className="eyebrow">Error</p>
        <div className="error-code" aria-hidden="true">
          404
        </div>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Page not found.</h1>
        <p className="lead">The page you requested does not exist or has moved.</p>
        <div className="cluster" style={{ justifyContent: "center" }}>
          <Link className="button button-primary" href="/">
            Back home
          </Link>
          <Link className="button button-secondary" href="/shop">
            Browse stickers
          </Link>
        </div>
      </div>
    </main>
  );
}
