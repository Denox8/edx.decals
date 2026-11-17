import type { Metadata } from "next";
import { CustomOrderForm } from "@/components/PublicForms";
import { getCustomWall } from "@/lib/data";

export const metadata: Metadata = { title: "Custom Order" };
export const revalidate = 300;

export default async function CustomPage() {
  const wall = await getCustomWall(12).catch(() => []);
  return (
    <>
      <section className="section">
        <div className="container grid grid-sidebar">
          <div className="form-card">
            <p className="eyebrow">Custom order</p>
            <h1 style={{ fontSize: "var(--fs-h2)" }}>Request a custom sticker cut</h1>
            <p className="lead">Upload a reference image and tell us how large you want the final piece to be.</p>
            <CustomOrderForm />
          </div>
          <aside className="info-card">
            <h3>Custom order notes</h3>
            <p className="muted">
              Send us a rough design, brand mark, mascot, or reference image and we will help shape it into a finished decal. Include at least one contact method so we can send quotes and updates.
            </p>
            <ul className="plain-list">
              <li>Accepted uploads: JPG, PNG, GIF, WEBP</li>
              <li>Maximum upload size: 5 MB</li>
              <li>Common uses: car decals, laptop stickers, packaging labels, helmets</li>
              <li>When your quote is ready you get a payment link - pay with GCash, Maya or card</li>
              <li>Custom Wall only shows orders that are completed and approved by admin</li>
            </ul>
          </aside>
        </div>
      </section>
      {wall.length ? (
        <section className="section-tight">
          <div className="container">
            <div className="section-title">
              <div>
                <p className="eyebrow">Custom Wall</p>
                <h2 style={{ fontSize: "var(--fs-h3)" }}>Recent customer custom orders</h2>
              </div>
            </div>
            <div className="custom-wall-grid">
              {wall.map((w) => (
                <a key={w.id} className="custom-wall-card" href={w.url} target="_blank" rel="noopener noreferrer" aria-label={`Open custom order image: ${w.description.slice(0, 80)}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.url} alt="" loading="lazy" />
                  <strong>{w.description.length > 60 ? `${w.description.slice(0, 57)}...` : w.description}</strong>
                  <span>{w.size}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
