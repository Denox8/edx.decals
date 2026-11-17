import { round2 } from "@/lib/format";
import type { CartLine, ColorOption, Product, Settings, TextureOption } from "@/lib/types";

/** Port of PHP build_price_data(): same rounding, same sale rules. */
export type PriceData = {
  original: number;
  final: number;
  discountPercentage: number;
  discountAmount: number;
  onSale: boolean;
};

export function isSaleEligible(product: Pick<Product, "sale_selected">, settings: Settings): boolean {
  return settings.sale_scope === "all" || Boolean(product.sale_selected);
}

export function priceData(product: Pick<Product, "price" | "sale_selected">, settings: Settings): PriceData {
  const original = Math.max(0, round2(Number(product.price)));
  const discount = settings.sale_mode ? Math.max(0, Math.min(100, Math.trunc(settings.sale_discount))) : 0;
  const eligible = isSaleEligible(product, settings);
  const final = discount > 0 && eligible ? Math.max(0, round2(original - original * (discount / 100))) : original;
  return {
    original,
    final,
    discountPercentage: discount > 0 && eligible ? discount : 0,
    discountAmount: Math.max(0, round2(original - final)),
    onSale: settings.sale_mode && discount > 0 && eligible && final < original
  };
}

export function saleBannerMessage(settings: Settings): string {
  if (!settings.sale_mode || settings.sale_discount <= 0) return "";
  return settings.sale_scope === "selected"
    ? `SALE! Get ${settings.sale_discount}% OFF on selected decals!`
    : `SALE! Get ${settings.sale_discount}% OFF on all decals!`;
}

export function cartKey(productId: number, color: string, texture: string): string {
  return `${productId}:${color}:${texture}`;
}

export type PricedLine = {
  key: string;
  product: Product;
  quantity: number;
  color: ColorOption;
  texture: TextureOption;
  price: PriceData;
  originalSubtotal: number;
  subtotal: number;
};

export type CartSummary = {
  lines: PricedLine[];
  invalid: CartLine[];
  items: number;
  subtotal: number;
  discount: number;
  total: number;
};

/**
 * Port of PHP get_cart_items() + get_cart_summary().
 * Lines whose product, colour or texture no longer exists are returned in `invalid` and never charged.
 */
export function priceCart(lines: CartLine[], products: Product[], settings: Settings): CartSummary {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: PricedLine[] = [];
  const invalid: CartLine[] = [];
  for (const line of lines) {
    const product = byId.get(line.productId);
    const qty = Math.max(0, Math.min(999, Math.trunc(line.quantity)));
    const color = product?.colors.find((c) => c.value === line.color);
    const texture = product?.textures.find((t) => t.value === line.texture);
    if (!product || !color || !texture || qty < 1) {
      invalid.push(line);
      continue;
    }
    const price = priceData(product, settings);
    out.push({
      key: cartKey(product.id, color.value, texture.value),
      product,
      quantity: qty,
      color,
      texture,
      price,
      originalSubtotal: round2(price.original * qty),
      subtotal: round2(price.final * qty)
    });
  }
  const subtotal = round2(out.reduce((s, l) => s + l.originalSubtotal, 0));
  const total = round2(out.reduce((s, l) => s + l.subtotal, 0));
  return {
    lines: out,
    invalid,
    items: out.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    discount: Math.max(0, round2(subtotal - total)),
    total
  };
}
