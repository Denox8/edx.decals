import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slug } from "@/lib/format";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const RASTER: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

function sniff(bytes: Uint8Array): string | null {
  const hex = Array.from(bytes.slice(0, 12)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.startsWith("89504e47")) return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("47494638")) return "image/gif";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "image/webp";
  return null;
}

export function isRealFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && (value as File).size > 0;
}

/**
 * Checks size and the REAL file type (magic bytes, not just the extension).
 * Customers: JPG/PNG/WEBP/GIF only. Admins may also upload SVG, which is rejected if it contains script or event handlers.
 */
export async function validateImage(file: File, options: { allowSvg?: boolean } = {}): Promise<{ bytes: Uint8Array; mime: string; ext: string }> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is too large. Maximum size is 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniff(bytes);
  if (sniffed) return { bytes, mime: sniffed, ext: RASTER[sniffed] };
  if (options.allowSvg) {
    const text = new TextDecoder().decode(bytes.slice(0, 200000)).toLowerCase();
    if (text.includes("<svg") && !/<script|on[a-z]+\s*=|javascript:|<foreignobject/.test(text)) {
      return { bytes, mime: "image/svg+xml", ext: "svg" };
    }
    throw new Error("Only JPG, PNG, WEBP, GIF and safe SVG files are allowed.");
  }
  throw new Error("Only JPG, PNG, WEBP and GIF files are allowed.");
}

/** Uploads to a Supabase Storage bucket and returns the object key (stored in the database). */
export async function uploadImage(
  client: SupabaseClient,
  bucket: "products" | "custom-orders",
  file: File,
  baseName: string,
  options: { allowSvg?: boolean } = {}
): Promise<string> {
  const { bytes, mime, ext } = await validateImage(file, options);
  const key = `${slug(baseName, "upload")}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const { error } = await client.storage.from(bucket).upload(key, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return key;
}

/** Deletes a stored object if the path is a bucket key (files in /public are never touched). */
export async function removeStored(client: SupabaseClient, bucket: "products" | "custom-orders", path: string | null | undefined) {
  const p = String(path ?? "").trim();
  if (!p || p.startsWith("/") || /^https?:/i.test(p)) return;
  await client.storage.from(bucket).remove([p]);
}
