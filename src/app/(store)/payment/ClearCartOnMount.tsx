"use client";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

/** Empties the cart once the customer returns from a successful PayMongo checkout. */
export function ClearCartOnMount() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return null;
}
