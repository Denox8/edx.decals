"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { cartKey } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";

/**
 * Replaces PHP $_SESSION['cart']. Lines live in localStorage ("edx-cart"); prices are never stored
 * here - the server reprices every line on the cart page and again at checkout.
 */
type Toast = { id: number; title: string; message: string; tone: "ok" | "error" };
type CartContextValue = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (productId: number, color: string, texture: string, quantity: number, name?: string) => void;
  update: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  toast: (title: string, message: string, tone?: "ok" | "error") => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "edx-cart";

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l) => l && Number.isInteger(l.productId) && typeof l.color === "string" && typeof l.texture === "string")
      .map((l) => ({ ...l, key: cartKey(l.productId, l.color, l.texture), quantity: Math.max(1, Math.min(999, Math.trunc(Number(l.quantity) || 1))) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    setLines(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLines(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const toast = useCallback((title: string, message: string, tone: "ok" | "error" = "ok") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, title, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      add(productId, color, texture, quantity, name) {
        const key = cartKey(productId, color, texture);
        const qty = Math.max(1, Math.min(999, Math.trunc(quantity)));
        const existing = lines.find((l) => l.key === key);
        const next = existing
          ? lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(999, l.quantity + qty) } : l))
          : [...lines, { key, productId, color, texture, quantity: qty }];
        persist(next);
        toast("Added to cart", name ? `${name} x ${qty}` : "Sticker added to cart.");
      },
      update(key, quantity) {
        const qty = Math.trunc(quantity);
        persist(qty < 1 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(999, qty) } : l)));
      },
      remove(key) {
        persist(lines.filter((l) => l.key !== key));
      },
      clear() {
        persist([]);
      },
      toast
    }),
    [lines, ready, persist, toast]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-card">
            <span className="toast-icon">
              <Icon name={t.tone === "ok" ? "check" : "alert-triangle"} />
            </span>
            <div>
              <strong>{t.title}</strong>
              <p>{t.message}</p>
            </div>
            <button type="button" className="text-button icon-only" aria-label="Close notification" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart() must be used inside <CartProvider>.");
  return ctx;
}
