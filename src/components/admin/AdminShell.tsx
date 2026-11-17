"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV: { section: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  {
    section: "Manage",
    items: [
      { href: "/admin", label: "Dashboard", icon: "grid" },
      { href: "/admin/orders", label: "Orders", icon: "receipt" },
      { href: "/admin/products", label: "Products", icon: "package" },
      { href: "/admin/categories", label: "Categories", icon: "tag" },
      { href: "/admin/custom-orders", label: "Custom orders", icon: "scissors" },
      { href: "/admin/requests", label: "Messages", icon: "inbox" },
      { href: "/admin/sales", label: "Sales tracker", icon: "chart" }
    ]
  },
  {
    section: "Settings",
    items: [
      { href: "/admin/sale", label: "Sale mode", icon: "percent" },
      { href: "/admin/theme", label: "Theme", icon: "swatch" },
      { href: "/admin/users", label: "Admin users", icon: "users" }
    ]
  }
];

export function AdminShell({ displayName, badges, children }: { displayName: string; badges: Record<string, number>; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const all = NAV.flatMap((s) => s.items);
  const current = all
    .filter((i) => (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? " is-open" : ""}`} id="admin-sidebar" aria-label="Admin navigation">
        <div className="sidebar-head">
          <Logo href="/admin" label="Admin dashboard" />
          <button type="button" className="text-button icon-only sidebar-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </div>
        {NAV.map((s) => (
          <nav key={s.section} aria-label={s.section}>
            <p className="sidebar-section">{s.section}</p>
            <ul className="sidebar-nav">
              {s.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} aria-current={current?.href === i.href ? "page" : undefined}>
                    <Icon name={i.icon} /> {i.label}
                    {badges[i.href] ? <span className="badge badge-accent">{badges[i.href]}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="sidebar-foot">
          <ul className="sidebar-nav">
            <li>
              <Link href="/" target="_blank">
                <Icon name="external-link" /> View storefront
              </Link>
            </li>
          </ul>
          <div className="between">
            <span className="cluster">
              <span className="avatar" aria-hidden="true">
                {initials || "AD"}
              </span>
              <span className="caption">{displayName}</span>
            </span>
            <ThemeToggle />
          </div>
          <form action="/api/auth/signout" method="post">
            <button className="button button-ghost button-block button-sm" type="submit">
              <Icon name="log-out" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      {open ? <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <div className="app-main">
        <header className="app-topbar">
          <button type="button" className="text-button icon-only sidebar-toggle" aria-controls="admin-sidebar" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <p className="topbar-title">{current?.label ?? "Admin"}</p>
        </header>
        <main id="main" className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
