import type { Metadata } from "next";
import { ContactForm } from "@/components/PublicForms";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="section">
      <div className="container grid grid-sidebar">
        <div className="form-card">
          <p className="eyebrow">Contact</p>
          <h1 style={{ fontSize: "var(--fs-h2)" }}>Let&apos;s talk decals</h1>
          <p className="lead">Use the form below and we will get back to you about your decal needs.</p>
          <ContactForm />
        </div>
        <aside className="info-card">
          <h3>Need something specific?</h3>
          <p className="muted">We handle branded sticker packs, event merch, vehicle graphics, and one-off custom runs.</p>
          <p className="muted mb-0">Tell us what you need and we will help you find the right finish, size, and quantity.</p>
        </aside>
      </div>
    </section>
  );
}
