export const PLACEHOLDER_IMAGE = "/images/sticker-default.svg";

/**
 * Resolves an image path to a URL.
 * - "/images/..." (files in /public) and full URLs are returned as-is.
 * - anything else is a key inside the public Supabase "products" bucket.
 */
export function imageUrl(path: string | null | undefined): string {
  const p = String(path ?? "").trim();
  if (!p) return PLACEHOLDER_IMAGE;
  if (p.startsWith("/") || /^https?:\/\//i.test(p) || p.startsWith("data:")) return p;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/products/${p.split("/").map(encodeURIComponent).join("/")}`;
}
