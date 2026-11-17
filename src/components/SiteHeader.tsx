"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCart } from "@/components/CartProvider";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/shop", label: "Shop", icon: "bag" },
  { href: "/custom", label: "Custom", icon: "scissors" },
  { href: "/track-order", label: "Track", icon: "pin" },
  { href: "/cart", label: "Cart", icon: "cart" },
  { href: "/contact", label: "Contact", icon: "mail" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  return (
    <header className="site-header">
      <div className="container header-row">
        <Logo />
        <nav aria-label="Main">
          <ul className="site-nav">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined}>
                    <Icon name={item.icon} />
                    <span className="nav-label">{item.label}</span>
                    {item.href === "/cart" && count > 0 ? (
                      <span className="cart-count" aria-label={`${count} items in cart`}>
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
