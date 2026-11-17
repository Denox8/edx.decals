#!/usr/bin/env node
/**
 * EDX Decals - one-time import from the old PHP app (SQLite + uploads/) into Supabase.
 *
 * 1. Copy the old app's files into this project:
 *      legacy/database.sqlite
 *      legacy/uploads/...          (the whole uploads folder)
 * 2. Run the SQL files in supabase/migrations first (NOT seed.sql products if you import real data).
 * 3. Put NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 4. npm run migrate:sqlite -- --dry-run      (prints what would happen)
 *    npm run migrate:sqlite                   (imports)
 *
 * Not imported on purpose: admin_users (password hashes). Create admins with Supabase Auth (see README).
 * Old orders were never paid online, so they are imported as:
 *   processing/printing/ready/shipped/completed -> payment "offline" (paid outside the site)
 *   received -> payment "pending",  cancelled -> payment "failed"
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DRY = process.argv.includes("--dry-run");
const LEGACY = path.join(ROOT, "legacy");

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}
const dbFile = path.join(LEGACY, "database.sqlite");
if (!fs.existsSync(dbFile)) {
  console.error(`Not found: ${dbFile}\nCopy the old app's database.sqlite into legacy/ first.`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const db = new Database(dbFile, { readonly: true });
const has = (table) => Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));
const all = (sql) => db.prepare(sql).all();

const slug = (v, fb) =>
  String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || fb;
const ts = (v) => (v ? new Date(String(v).replace(" ", "T") + (String(v).includes("T") || String(v).endsWith("Z") ? "" : "+08:00")).toISOString() : null);
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };

const uploaded = new Map();
async function migrateImage(p, bucket) {
  const value = String(p ?? "").trim();
  if (!value) return null;
  if (value.startsWith("assets/images/")) return "/images/" + path.basename(value);
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith("uploads/")) return null;
  const cacheKey = `${bucket}:${value}`;
  if (uploaded.has(cacheKey)) return uploaded.get(cacheKey);
  const file = path.join(LEGACY, value);
  if (!fs.existsSync(file)) {
    console.warn(`  ! missing file ${value} (skipped)`);
    return null;
  }
  const ext = path.extname(file).toLowerCase();
  if (!MIME[ext] || (bucket === "custom-orders" && ext === ".svg")) {
    console.warn(`  ! unsupported type ${value} (skipped)`);
    return null;
  }
  const objectKey = `${slug(path.basename(file, ext), "legacy")}-${crypto.randomBytes(3).toString("hex")}${ext}`;
  if (!DRY) {
    const { error } = await supabase.storage.from(bucket).upload(objectKey, fs.readFileSync(file), { contentType: MIME[ext], upsert: false });
    if (error) throw new Error(`upload ${value}: ${error.message}`);
  }
  uploaded.set(cacheKey, objectKey);
  return objectKey;
}

function parseOptions(raw, fallback, kind) {
  let list = [];
  try {
    const decoded = JSON.parse(raw ?? "");
    if (Array.isArray(decoded)) list = decoded;
  } catch {
    list = String(raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!list.length) list = fallback;
  const out = [];
  for (const item of list) {
    const label = typeof item === "string" ? item.charAt(0).toUpperCase() + item.slice(1) : String(item.label ?? "");
    if (!label) continue;
    const value = slug(typeof item === "string" ? item : item.value ?? label, kind === "color" ? "white" : "glossy");
    if (out.some((o) => o.value === value)) continue;
    out.push(kind === "color" ? { value, label, hex: /^#[0-9a-f]{6}$/i.test(item.hex ?? "") ? item.hex.toUpperCase() : "#D9D9D9" } : { value, label });
  }
  return out;
}

async function insert(table, rows, select = "id") {
  if (DRY || rows.length === 0) return rows.map((_, i) => ({ id: -(i + 1) }));
  const { data, error } = await supabase.from(table).insert(rows).select(select);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function main() {
  console.log(DRY ? "DRY RUN - nothing is written.\n" : "Importing...\n");

  // settings
  const themeMap = { default: "blue", christmas: "noel", araw: "araw", festival: "festival", cyber: "cyber" };
  if (has("settings")) {
    const s = all("SELECT * FROM settings ORDER BY id LIMIT 1")[0];
    if (s) {
      const row = { site_palette: themeMap[s.site_theme] ?? "cyber", sale_mode: Boolean(s.sale_mode), sale_discount: Number(s.sale_discount ?? 0), sale_scope: s.sale_scope === "selected" ? "selected" : "all" };
      console.log("settings:", row);
      if (!DRY) await supabase.from("settings").upsert({ id: 1, ...row });
    }
  }

  // categories
  const cats = has("categories") ? all("SELECT name FROM categories") : [];
  console.log(`categories: ${cats.length}`);
  if (!DRY && cats.length) await supabase.from("categories").upsert(cats.map((c) => ({ name: c.name })), { onConflict: "name", ignoreDuplicates: true });

  // products (+ gallery + colour images)
  const productMap = new Map();
  const productNames = new Map();
  const colorImages = has("product_color_images") ? all("SELECT * FROM product_color_images") : [];
  const gallery = has("product_images") ? all("SELECT * FROM product_images ORDER BY sort_order, id") : [];
  const products = all("SELECT * FROM products ORDER BY sort_order, id DESC");
  console.log(`products: ${products.length}`);
  for (const p of products) {
    const colors = parseOptions(p.sticker_colors, ["white", "black", "red", "blue", "yellow"], "color");
    for (const c of colors) {
      const ci = colorImages.find((x) => x.product_id === p.id && slug(x.color_value, "white") === c.value);
      c.image = ci ? await migrateImage(ci.image_path, "products") : null;
    }
    const textures = parseOptions(p.sticker_textures, ["glossy", "matte"], "texture");
    const cover = (await migrateImage(p.image, "products")) ?? "/images/sticker-default.svg";
    const [row] = await insert("products", [
      { sort_order: p.sort_order, name: p.name, price: Number(p.price) > 0 ? Number(p.price) : 0.01, category: p.category || "Uncategorized", description: p.description || p.name, cover_image: cover, colors, textures, sale_selected: Boolean(p.sale_selected) }
    ]);
    productMap.set(p.id, row.id);
    productNames.set(p.id, { name: p.name, image: cover, colors, textures });
    const imgs = [];
    for (const g of gallery.filter((x) => x.product_id === p.id)) {
      const key = await migrateImage(g.image_path, "products");
      if (key) imgs.push({ product_id: row.id, path: key, sort_order: g.sort_order });
    }
    if (imgs.length) await insert("product_images", imgs);
    console.log(`  - ${p.name} (${imgs.length} gallery, ${colors.filter((c) => c.image).length} variant images)`);
  }

  // orders + items
  const payMap = { received: "pending", cancelled: "failed" };
  const orders = has("orders") ? all("SELECT * FROM orders ORDER BY id") : [];
  const items = has("order_items") ? all("SELECT * FROM order_items ORDER BY id") : [];
  console.log(`orders: ${orders.length}, items: ${items.length}`);
  for (const o of orders) {
    const status = ["received", "processing", "printing", "ready", "shipped", "completed", "cancelled"].includes(o.status) ? o.status : "received";
    const payment_status = payMap[status] ?? "offline";
    const [row] = await insert("orders", [
      {
        order_ticket: o.order_ticket || `ORD-${String(o.id).padStart(6, "0")}`,
        customer_name: o.customer_name,
        email: String(o.email).toLowerCase(),
        address: o.address,
        status,
        status_notes: o.status_notes,
        payment_status,
        subtotal_price: Number(o.subtotal_price || o.total_price || 0),
        discount_amount: Number(o.discount_amount || 0),
        discount_percentage: Number(o.discount_percentage || 0),
        total_price: Number(o.total_price || 0),
        paid_at: payment_status === "offline" ? ts(o.created_at) : null,
        created_at: ts(o.created_at)
      }
    ]);
    const rows = items
      .filter((i) => i.order_id === o.id)
      .map((i) => {
        const info = productNames.get(i.product_id);
        const color = info?.colors.find((c) => c.value === slug(i.sticker_color, "white"));
        const texture = info?.textures.find((t) => t.value === slug(i.sticker_texture, "glossy"));
        return {
          order_id: row.id,
          product_id: productMap.get(i.product_id) ?? null,
          product_name: info?.name ?? `Product #${i.product_id}`,
          product_image: info?.image ?? null,
          sticker_color: slug(i.sticker_color, "white"),
          color_label: color?.label ?? i.sticker_color ?? "White",
          sticker_texture: slug(i.sticker_texture, "glossy"),
          texture_label: texture?.label ?? i.sticker_texture ?? "Glossy",
          unit_price: Number(i.unit_price || 0),
          final_unit_price: Number(i.final_unit_price || i.unit_price || 0),
          discount_percentage: Number(i.discount_percentage || 0),
          quantity: Math.max(1, Number(i.quantity || 1))
        };
      });
    if (rows.length) await insert("order_items", rows);
  }

  // custom orders
  const customs = has("custom_orders") ? all("SELECT * FROM custom_orders ORDER BY id") : [];
  console.log(`custom orders: ${customs.length}`);
  for (const c of customs) {
    const status = ["new", "contacted", "quoted", "approved", "in_progress", "completed", "cancelled"].includes(c.status) ? c.status : "new";
    const image_path = await migrateImage(c.image, "custom-orders");
    await insert("custom_orders", [
      {
        customer_name: c.customer_name || "",
        email: String(c.email || "").toLowerCase(),
        phone: c.phone || "",
        social_handle: c.social_handle || "",
        preferred_contact: ["email", "phone", "social", "any"].includes(c.preferred_contact) ? c.preferred_contact : "email",
        description: c.description || "-",
        image_path,
        size: c.size || "-",
        status,
        admin_notes: c.admin_notes,
        quoted_price: c.quoted_price === null || c.quoted_price === undefined ? null : Number(c.quoted_price),
        is_featured: Boolean(c.is_featured) && status === "completed",
        payment_status: status === "completed" && c.quoted_price ? "offline" : "unpaid",
        contacted_at: ts(c.contacted_at),
        archived_at: ts(c.archived_at),
        created_at: ts(c.created_at)
      }
    ]);
  }

  // messages
  const messages = has("messages") ? all("SELECT * FROM messages ORDER BY id") : [];
  console.log(`messages: ${messages.length}`);
  if (messages.length) await insert("messages", messages.map((m) => ({ name: m.name, email: m.email, message: m.message, archived_at: ts(m.archived_at), created_at: ts(m.created_at) ?? new Date().toISOString() })));

  console.log(`\nfiles uploaded: ${uploaded.size}`);
  console.log(DRY ? "Dry run finished." : "Import finished. Next: create your admin account (README step 5).");
}

main().catch((e) => {
  console.error("\nImport stopped:", e.message);
  process.exit(1);
});
