import { money } from "@/lib/format";
import type { PriceData } from "@/lib/pricing";

export function Price({ price, inline, large }: { price: PriceData; inline?: boolean; large?: boolean }) {
  const cls = ["price-stack", inline ? "price-stack-inline" : ""].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      {price.onSale ? <span className="old-price">{money(price.original)}</span> : null}
      <strong className={[large ? "price" : "", price.onSale ? "new-price" : ""].filter(Boolean).join(" ")}>{money(price.final)}</strong>
    </span>
  );
}
