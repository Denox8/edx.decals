import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/ThemeScript";
import { CartProvider } from "@/components/CartProvider";
import { getSettings } from "@/lib/data";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/app.css";


export const metadata: Metadata = {
  title: { default: "EDX Decals | Sticker Shop", template: "%s | EDX Decals" },
  description: "Bold stickers, clean finishes, and custom vinyl that sticks with your brand. Pay online with GCash, Maya or card.",
  icons: { icon: "/brand/favicon.svg" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" data-theme="dark" data-palette={settings.site_palette} data-text="normal" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="has-grid">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
