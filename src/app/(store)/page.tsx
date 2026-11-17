import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { getProducts, getSettings } from "@/lib/data";

export const revalidate = 60;

export default async function HomePage() {
  const [products, settings] = await Promise.all([getProducts({ limit: 4 }), getSettings()]);
  return (
    <>
      <section className="section">
        <div className="container hero-grid">
          <div className="card hero-copy">
            <p className="eyebrow">New sticker drops every week</p>
            <h1>Decals for motors, cars, helmets, and many more.</h1>
            <p className="lead">Made to look instantly sharper. Order ready-made designs or send your own artwork - and pay online in a few taps.</p>
            <div className="hero-actions">
              <Link className="button button-primary button-lg" href="/shop">
                <Icon name="bag" /> Shop stickers
              </Link>
              <Link className="button button-secondary button-lg" href="/custom">
                <Icon name="scissors" /> Start a custom order
              </Link>
            </div>
          </div>
          <div className="hero-panel chamfer-lg chamfer">
            <div className="hero-stat">
              <strong>GCash · Maya · Card</strong>
              <span className="muted">Secure online payment at checkout</span>
            </div>
            <div className="hero-stat">
              <strong>Ticket tracking</strong>
              <span className="muted">Follow every order from received to shipped</span>
            </div>
            <div className="hero-stat">
              <strong>Custom cuts</strong>
              <span className="muted">Upload a reference, get a quote, pay online</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="section-title">
            <div>
              <p className="eyebrow">Featured stickers</p>
              <h2>Popular picks</h2>
            </div>
            <Link className="text-link" href="/shop">
              View full shop
            </Link>
          </div>
          {products.length ? (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} settings={settings} />
              ))}
            </div>
          ) : (
            <p className="muted">New designs are on the way.</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-3">
          <article className="info-card">
            <Icon name="scissors" size="lg" />
            <h3>Precision-cut vinyl</h3>
            <p className="muted mb-0">Durable materials for car panels, packaging, laptops, helmets, and storefront glass.</p>
          </article>
          <article className="info-card">
            <Icon name="upload" size="lg" />
            <h3>Responsive custom orders</h3>
            <p className="muted mb-0">Upload your concept, pick a size, and send a request without leaving the site.</p>
          </article>
          <article className="info-card">
            <Icon name="credit-card" size="lg" />
            <h3>Pay your way</h3>
            <p className="muted mb-0">Checkout with GCash, Maya, cards or QR Ph through PayMongo. No card details are stored here.</p>
          </article>
        </div>
      </section>
    </>
  );
}
