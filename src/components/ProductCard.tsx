import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Price } from "@/components/Price";
import { imageUrl } from "@/lib/images";
import { priceData } from "@/lib/pricing";
import type { Product, Settings } from "@/lib/types";

export function ProductCard({ product, settings }: { product: Product; settings: Settings }) {
  const price = priceData(product, settings);
  const image = imageUrl(product.images[0]?.path ?? product.cover_image);
  return (
    <article className="product-card" data-category={product.category.toLowerCase()}>
      <div className="product-image-wrap">
        {price.onSale ? <span className="sale-badge">-{price.discountPercentage}% OFF</span> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="product-image" src={image} alt={`${product.name} preview`} loading="lazy" />
      </div>
      <div className="product-body">
        <span className="badge badge-outline">{product.category}</span>
        <h3>
          <Link href={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-meta">
          <Price price={price} />
          <Link className="button button-primary button-icon" href={`/product/${product.id}`} aria-label={`Choose options for ${product.name}`} title="Choose options">
            <Icon name="plus" />
          </Link>
        </div>
      </div>
    </article>
  );
}
