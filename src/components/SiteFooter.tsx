import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <div className="footer-brand">
          <Link href="/admin" aria-label="Admin sign in" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo brand-logo-light" src="/brand/symbol-light.svg" alt="" width={24} height={31} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo brand-logo-dark" src="/brand/symbol-dark.svg" alt="" width={24} height={31} />
          </Link>
          <p>Clean cuts, strong adhesives, and bold decals made to stand out on every surface.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/shop">Browse Stickers</Link>
          <Link href="/custom">Custom Orders</Link>
          <Link href="/track-order">Track Order</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
