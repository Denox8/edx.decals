import Link from "next/link";

/** EDX brand mark: black ink on light, soft-white ink on night (swap driven by tokens). Never recoloured. */
export function Logo({ href = "/", label = "EDX Decals home" }: { href?: string; label?: string }) {
  return (
    <Link className="brand" href={href} aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo brand-logo-light" src="/brand/symbol-light.svg" alt="" width={28} height={36} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo brand-logo-dark" src="/brand/symbol-dark.svg" alt="" width={28} height={36} />
      <span className="brand-word" aria-hidden="true">
        <strong>EDX</strong> <span className="muted">Decals</span>
      </span>
    </Link>
  );
}
