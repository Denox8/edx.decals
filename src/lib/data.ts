import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { slug } from "@/lib/format";
import type { Category, ColorOption, CustomOrder, Product, Settings, TextureOption } from "@/lib/types";

export const DEFAULT_SETTINGS: Settings = { site_palette: "cyber", sale_mode: false, sale_discount: 0, sale_scope: "all" };

// Same defaults as PHP parse_product_sticker_colors()/textures() when a product has none saved.
const DEFAULT_COLORS: ColorOption[] = [
  { value: "white", label: "White", hex: "#F4F4F4" },
  { value: "black", label: "Black", hex: "#111111" },
  { value: "red", label: "Red", hex: "#FF4D5A" },
  { value: "blue", label: "Blue", hex: "#3EA2FF" },
  { value: "yellow", label: "Yellow", hex: "#FFC72E" }
];
const DEFAULT_TEXTURES: TextureOption[] = [
  { value: "glossy", label: "Glossy" },
  { value: "matte", label: "Matte" }
];

type Row = Record<string, unknown>;

export function normalizeProduct(row: Row): Product {
  const rawColors = Array.isArray(row.colors) ? (row.colors as Row[]) : [];
  const rawTextures = Array.isArray(row.textures) ? (row.textures as Row[]) : [];
  const colors: ColorOption[] = rawColors
    .filter((c) => String(c.label ?? "").trim() !== "")
    .map((c) => ({
      value: slug(String(c.value ?? c.label), "white"),
      label: String(c.label),
      hex: /^#[0-9A-Fa-f]{6}$/.test(String(c.hex ?? "")) ? String(c.hex).toUpperCase() : "#D9D9D9",
      image: c.image ? String(c.image) : null
    }));
  const textures: TextureOption[] = rawTextures
    .filter((t) => String(t.label ?? "").trim() !== "")
    .map((t) => ({ value: slug(String(t.value ?? t.label), "glossy"), label: String(t.label) }));
  const images = (Array.isArray(row.images) ? (row.images as Row[]) : [])
    .map((i) => ({ id: Number(i.id), path: String(i.path), sort_order: Number(i.sort_order ?? 0) }))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  if (images.length === 0 && row.cover_image) images.push({ id: 0, path: String(row.cover_image), sort_order: 0 });
  return {
    id: Number(row.id),
    sort_order: Number(row.sort_order ?? 0),
    name: String(row.name ?? ""),
    price: Number(row.price ?? 0),
    category: String(row.category ?? ""),
    description: String(row.description ?? ""),
    cover_image: row.cover_image ? String(row.cover_image) : null,
    colors: colors.length ? colors : DEFAULT_COLORS,
    textures: textures.length ? textures : DEFAULT_TEXTURES,
    sale_selected: Boolean(row.sale_selected),
    is_active: row.is_active !== false,
    images
  };
}

const PRODUCT_SELECT = "*, images:product_images(id, path, sort_order)";

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase.from("settings").select("site_palette, sale_mode, sale_discount, sale_scope").eq("id", 1).maybeSingle();
    if (!data) return DEFAULT_SETTINGS;
    return {
      site_palette: (data.site_palette as Settings["site_palette"]) ?? "cyber",
      sale_mode: Boolean(data.sale_mode),
      sale_discount: Math.max(0, Math.min(100, Number(data.sale_discount ?? 0))),
      sale_scope: data.sale_scope === "selected" ? "selected" : "all"
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});

/** Storefront: public cached read. includeHidden (admin pages): uses the signed-in admin's session. */
export async function getProducts(options: { limit?: number; includeHidden?: boolean } = {}): Promise<Product[]> {
  let supabase;
  try {
    supabase = options.includeHidden ? await createClient() : createPublicClient();
  } catch (e) {
    if (options.includeHidden) throw e;
    console.error("[edx]", e instanceof Error ? e.message : e);
    return [];
  }
  let query = supabase.from("products").select(PRODUCT_SELECT).order("sort_order", { ascending: true }).order("id", { ascending: false });
  if (!options.includeHidden) query = query.eq("is_active", true);
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) {
    if (options.includeHidden) throw new Error(`Could not load products: ${error.message}`);
    console.error(`[edx] Could not load products: ${error.message}`);
    return [];
  }
  return (data ?? []).map((r) => normalizeProduct(r as Row));
}

export async function getProduct(id: number, options: { asAdmin?: boolean } = {}): Promise<Product | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const supabase = options.asAdmin ? await createClient() : createPublicClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  return data ? normalizeProduct(data as Row) : null;
}

/** Server-side lookup used by checkout: always the service role, always fresh prices. */
export async function getProductsByIdsForCheckout(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.from("products").select(PRODUCT_SELECT).in("id", ids).eq("is_active", true);
  if (error) throw new Error(`Could not load products: ${error.message}`);
  return (data ?? []).map((r) => normalizeProduct(r as Row));
}

export async function getSettingsForCheckout(): Promise<Settings> {
  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("site_palette, sale_mode, sale_discount, sale_scope").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    site_palette: data.site_palette ?? "cyber",
    sale_mode: Boolean(data.sale_mode),
    sale_discount: Math.max(0, Math.min(100, Number(data.sale_discount ?? 0))),
    sale_scope: data.sale_scope === "selected" ? "selected" : "all"
  };
}

export async function getCategories(): Promise<Category[]> {
  try {
    const { data } = await createPublicClient().from("categories").select("id, name").order("name");
    return (data ?? []).map((c) => ({ id: Number(c.id), name: String(c.name) }));
  } catch {
    return [];
  }
}

/** Signed URLs for private custom-order images (bucket "custom-orders"). */
export async function signCustomImages(paths: (string | null)[], seconds = 3600): Promise<Record<string, string>> {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return {};
  const admin = createAdminClient();
  const { data } = await admin.storage.from("custom-orders").createSignedUrls(list, seconds);
  const out: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

/** Custom Wall: completed + featured + has image (same rule as PHP fetch_custom_wall_orders). */
export async function getCustomWall(limit = 12): Promise<(Pick<CustomOrder, "id" | "description" | "size"> & { url: string })[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("custom_orders")
    .select("id, description, size, image_path")
    .eq("is_featured", true)
    .eq("status", "completed")
    .not("image_path", "is", null)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const urls = await signCustomImages(rows.map((r) => r.image_path as string), 60 * 60 * 6);
  return rows
    .filter((r) => urls[r.image_path as string])
    .map((r) => ({ id: Number(r.id), description: String(r.description), size: String(r.size), url: urls[r.image_path as string] }));
}
