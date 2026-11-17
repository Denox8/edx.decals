"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clean, cleanMultiline, isEmail, slug } from "@/lib/format";
import { CUSTOM_STATUS, ORDER_STATUS, PALETTES, isOneOf } from "@/lib/options";
import { isRealFile, removeStored, uploadImage } from "@/lib/upload";
import { publicEnv } from "@/lib/env";
import type { ActionState, ColorOption, TextureOption } from "@/lib/types";

function id(form: FormData, key = "id"): number {
  const n = Number(form.get(key));
  if (!Number.isInteger(n) || n < 1) throw new Error("Invalid id.");
  return n;
}
function back(path: string, message: string, tone: "success" | "error" = "success"): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${tone}=${encodeURIComponent(message)}`);
}
function refreshStore() {
  revalidatePath("/", "layout");
}

/* ---------------- Products ---------------- */
export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const productId = Number(form.get("id")) || null;
  const name = clean(form.get("name"), 200);
  const price = Number(form.get("price"));
  const category = clean(form.get("category"), 100);
  const description = cleanMultiline(form.get("description"), 5000);
  const is_active = form.get("is_active") === "on";
  const sale_selected = form.get("sale_selected") === "on";
  const errors: string[] = [];
  if (!name) errors.push("Product name is required.");
  if (!category) errors.push("Category is required.");
  if (!(price > 0)) errors.push("Price must be greater than zero.");
  if (!description) errors.push("Description is required.");

  const labels = form.getAll("color_label").map((v) => clean(v, 60));
  const hexes = form.getAll("color_hex").map((v) => String(v));
  const existing = form.getAll("color_existing_image").map((v) => String(v));
  const files = form.getAll("color_image");
  const textures: TextureOption[] = [];
  form.getAll("texture_label").forEach((v) => {
    const label = clean(v, 60);
    if (label && !textures.some((t) => t.value === slug(label, "glossy"))) textures.push({ value: slug(label, "glossy"), label });
  });
  if (!labels.some(Boolean)) errors.push("Add at least one sticker color.");
  if (textures.length === 0) errors.push("Add at least one sticker texture.");
  if (errors.length) return { ok: false, message: "Please fix the highlighted fields.", errors };

  try {
    const colors: ColorOption[] = [];
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (!label) continue;
      const value = slug(label, "white");
      if (colors.some((c) => c.value === value)) continue;
      let image: string | null = existing[i] || null;
      const f = files[i];
      if (isRealFile(f)) image = await uploadImage(supabase, "products", f, `${name}-${value}`, { allowSvg: true });
      colors.push({ value, label, hex: /^#[0-9A-Fa-f]{6}$/.test(hexes[i] ?? "") ? hexes[i].toUpperCase() : "#D9D9D9", image });
    }

    let cover_image: string | undefined;
    const cover = form.get("cover_image");
    if (isRealFile(cover)) cover_image = await uploadImage(supabase, "products", cover, `${name}-cover`, { allowSvg: true });

    await supabase.from("categories").upsert({ name: category }, { onConflict: "name", ignoreDuplicates: true });

    let savedId = productId;
    if (productId) {
      const { error } = await supabase
        .from("products")
        .update({ name, price, category, description, colors, textures, is_active, sale_selected, ...(cover_image ? { cover_image } : {}) })
        .eq("id", productId);
      if (error) throw new Error(error.message);
    } else {
      const { data: last } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase
        .from("products")
        .insert({ name, price, category, description, colors, textures, is_active, sale_selected, cover_image: cover_image ?? "/images/sticker-default.svg", sort_order: Number(last?.sort_order ?? 0) + 1 })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Insert failed.");
      savedId = Number(data.id);
    }

    const gallery = form.getAll("gallery_images").filter(isRealFile);
    const { data: lastImg } = await supabase.from("product_images").select("sort_order").eq("product_id", savedId!).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    let order = Number(lastImg?.sort_order ?? -1) + 1;
    if (cover_image && gallery.length === 0) {
      await supabase.from("product_images").insert({ product_id: savedId, path: cover_image, sort_order: order++ });
    }
    for (let i = 0; i < gallery.length; i++) {
      const path = await uploadImage(supabase, "products", gallery[i], `${name}-gallery-${i + 1}`, { allowSvg: true });
      await supabase.from("product_images").insert({ product_id: savedId, path, sort_order: order++ });
    }
    refreshStore();
    revalidatePath("/admin/products");
    if (!productId) redirect(`/admin/products/${savedId}/edit?success=${encodeURIComponent("Product created.")}`);
    return { ok: true, message: "Product updated." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // let redirect() through
    return { ok: false, message: e instanceof Error ? e.message : "Save failed." };
  }
}

export async function deleteProductImage(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const imageId = id(form, "image_id");
  const productId = id(form, "product_id");
  const { data } = await supabase.from("product_images").select("path").eq("id", imageId).single();
  await supabase.from("product_images").delete().eq("id", imageId);
  if (data?.path) await removeStored(supabase, "products", data.path);
  refreshStore();
  back(`/admin/products/${productId}/edit`, "Gallery image removed.");
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const productId = id(form);
  const { error } = await supabase.from("products").delete().eq("id", productId);
  refreshStore();
  if (error) back("/admin/products", "Could not delete product.", "error");
  back("/admin/products", "Product deleted.");
}

export async function moveProduct(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const productId = id(form);
  const direction = String(form.get("direction"));
  const position = Number(form.get("position"));
  const { data } = await supabase.from("products").select("id").order("sort_order").order("id", { ascending: false });
  const ids = (data ?? []).map((r) => Number(r.id)).filter((x) => x !== productId);
  const current = (data ?? []).findIndex((r) => Number(r.id) === productId);
  if (current < 0) back("/admin/products", "Product not found.", "error");
  let target = current;
  if (direction === "up") target = current - 1;
  else if (direction === "down") target = current + 1;
  else if (Number.isInteger(position)) target = position - 1;
  target = Math.max(0, Math.min(ids.length, target));
  ids.splice(target, 0, productId);
  await Promise.all(ids.map((pid, i) => supabase.from("products").update({ sort_order: i + 1 }).eq("id", pid)));
  refreshStore();
  back("/admin/products", "Product order updated.");
}

/* ---------------- Categories ---------------- */
export async function categoryAction(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const action = String(form.get("action"));
  const name = clean(form.get("name"), 100);
  if (action === "create") {
    if (!name) back("/admin/categories", "Category name is required.", "error");
    await supabase.from("categories").upsert({ name }, { onConflict: "name", ignoreDuplicates: true });
    refreshStore();
    back("/admin/categories", "Category added.");
  }
  const catId = id(form);
  const { data: cat } = await supabase.from("categories").select("name").eq("id", catId).single();
  if (!cat) back("/admin/categories", "Category not found.", "error");
  if (action === "rename") {
    if (!name) back("/admin/categories", "Category name is required.", "error");
    await supabase.from("categories").update({ name }).eq("id", catId);
    await supabase.from("products").update({ category: name }).eq("category", cat.name);
    refreshStore();
    back("/admin/categories", "Category updated.");
  }
  if (action === "delete") {
    await supabase.from("categories").upsert({ name: "Uncategorized" }, { onConflict: "name", ignoreDuplicates: true });
    await supabase.from("products").update({ category: "Uncategorized" }).eq("category", cat.name);
    await supabase.from("categories").delete().eq("id", catId);
    refreshStore();
    back("/admin/categories", "Category deleted. Its products moved to Uncategorized.");
  }
}

/* ---------------- Orders ---------------- */
export async function updateOrder(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const orderId = id(form);
  const action = String(form.get("action"));
  const path = `/admin/orders/${orderId}`;
  if (action === "status") {
    const status = String(form.get("status"));
    if (!isOneOf(status, ORDER_STATUS)) back(path, "Invalid status.", "error");
    await supabase.from("orders").update({ status, status_notes: cleanMultiline(form.get("status_notes"), 1000) || null }).eq("id", orderId);
    back(path, "Order status updated.");
  }
  if (action === "mark_offline") {
    await supabase.from("orders").update({ payment_status: "offline", paid_at: new Date().toISOString() }).eq("id", orderId).neq("payment_status", "paid");
    back(path, "Marked as paid offline (cash / bank transfer).");
  }
  if (action === "delete") {
    await supabase.from("orders").delete().eq("id", orderId);
    back("/admin/orders", "Order deleted.");
  }
  back(path, "Unknown action.", "error");
}

/* ---------------- Custom orders ---------------- */
export async function updateCustomOrder(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const orderId = id(form);
  const view = form.get("view") === "archived" ? "archived" : "active";
  const path = `/admin/custom-orders?view=${view}`;
  const action = String(form.get("action"));
  const { data: existing } = await supabase.from("custom_orders").select("*").eq("id", orderId).single();
  if (!existing) back(path, "Custom order not found.", "error");

  if (action === "archive" || action === "restore") {
    await supabase
      .from("custom_orders")
      .update(action === "archive" ? { archived_at: new Date().toISOString(), is_featured: false } : { archived_at: null })
      .eq("id", orderId);
    refreshStore();
    back(path, action === "archive" ? "Custom request archived." : "Custom request restored.");
  }
  if (action === "delete") {
    await supabase.from("custom_orders").delete().eq("id", orderId);
    if (existing.image_path) await createAdminClient().storage.from("custom-orders").remove([existing.image_path]);
    refreshStore();
    back(path, "Custom request deleted.");
  }
  if (action === "mark_offline") {
    await supabase.from("custom_orders").update({ payment_status: "offline", paid_at: new Date().toISOString() }).eq("id", orderId);
    back(path, "Marked as paid offline.");
  }

  const status = String(form.get("status"));
  if (!isOneOf(status, CUSTOM_STATUS)) back(path, "Invalid status.", "error");
  const quotedRaw = clean(form.get("quoted_price"), 30);
  const quoted = quotedRaw === "" ? null : Number(quotedRaw);
  if (quoted !== null && (!Number.isFinite(quoted) || quoted < 0)) back(path, "Quoted price must be a valid number, zero or higher.", "error");
  const featured = form.get("is_featured") === "on";
  if (featured && status !== "completed") back(path, "Only completed custom orders can be featured on the Custom Wall.", "error");
  if (status === "quoted" && !(quoted && quoted > 0)) back(path, "Set a quoted price before marking the request as Quoted.", "error");
  const contacted_at = existing.contacted_at ?? (["contacted", "quoted", "approved", "in_progress", "completed"].includes(status) ? new Date().toISOString() : null);
  await supabase
    .from("custom_orders")
    .update({ status, quoted_price: quoted, is_featured: featured, admin_notes: cleanMultiline(form.get("admin_notes"), 4000) || null, contacted_at })
    .eq("id", orderId);
  refreshStore();
  back(path, "Custom order updated.");
}

/* ---------------- Messages ---------------- */
export async function messageAction(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const msgId = id(form);
  const view = form.get("view") === "archived" ? "archived" : "active";
  const action = String(form.get("action"));
  const path = `/admin/requests?view=${view}`;
  if (action === "archive") await supabase.from("messages").update({ archived_at: new Date().toISOString() }).eq("id", msgId);
  else if (action === "restore") await supabase.from("messages").update({ archived_at: null }).eq("id", msgId);
  else if (action === "delete") await supabase.from("messages").delete().eq("id", msgId);
  back(path, action === "delete" ? "Message deleted." : action === "archive" ? "Message archived." : "Message restored.");
}

/* ---------------- Sale mode ---------------- */
export async function saveSale(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const sale_mode = form.get("sale_mode") === "on";
  const sale_discount = Math.trunc(Number(form.get("sale_discount")));
  let sale_scope = form.get("sale_scope") === "selected" ? "selected" : "all";
  const selected = form.getAll("products").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (selected.length && sale_scope === "all") sale_scope = "selected"; // same rule as the PHP sale page
  if (!Number.isFinite(sale_discount) || sale_discount < 0 || sale_discount > 100) back("/admin/sale", "Discount must be between 0 and 100.", "error");
  if (sale_scope === "selected" && sale_mode && sale_discount > 0 && selected.length === 0) back("/admin/sale", "Choose at least one product for selected-product sale mode.", "error");
  await supabase.from("settings").update({ sale_mode, sale_discount, sale_scope }).eq("id", 1);
  await supabase.from("products").update({ sale_selected: false }).neq("id", 0);
  if (selected.length) await supabase.from("products").update({ sale_selected: true }).in("id", selected);
  refreshStore();
  back(
    "/admin/sale",
    sale_mode && sale_discount > 0 ? `Sale Mode enabled at ${sale_discount}% off for ${sale_scope === "selected" ? "selected products" : "all products"}.` : "Sale Mode updated. Customers now see regular prices."
  );
}

/* ---------------- Theme ---------------- */
export async function saveTheme(form: FormData) {
  await requireAdmin();
  const palette = String(form.get("site_palette"));
  if (!isOneOf(palette, PALETTES)) back("/admin/theme", "Invalid theme.", "error");
  const supabase = await createClient();
  await supabase.from("settings").update({ site_palette: palette }).eq("id", 1);
  refreshStore();
  back("/admin/theme", `Theme switched to ${PALETTES[palette].label}.`);
}

/* ---------------- Admin users ---------------- */
export async function inviteAdmin(form: FormData) {
  await requireAdmin();
  const email = clean(form.get("email"), 200).toLowerCase();
  const display_name = clean(form.get("display_name"), 150);
  if (!isEmail(email) || !display_name) back("/admin/users", "Enter a display name and a valid email.", "error");
  const admin = createAdminClient();
  const { siteUrl } = publicEnv();
  // Existing Supabase user? Otherwise send an invite email (they set their own password).
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl}/admin/login` });
    if (error || !data.user) back("/admin/users", `Invite failed: ${error?.message ?? "unknown error"}`, "error");
    user = data.user;
  }
  const { error } = await admin.from("admins").upsert({ user_id: user.id, display_name });
  if (error) back("/admin/users", "Could not add admin.", "error");
  back("/admin/users", `${display_name} can now manage the shop.`);
}

export async function removeAdmin(form: FormData) {
  const me = await requireAdmin();
  const userId = String(form.get("user_id"));
  if (userId === me.userId) back("/admin/users", "You cannot remove the account you are using.", "error");
  const admin = createAdminClient();
  const { count } = await admin.from("admins").select("user_id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) back("/admin/users", "At least one admin account must remain.", "error");
  await admin.from("admins").delete().eq("user_id", userId);
  back("/admin/users", "Admin access removed.");
}

export async function renameMe(form: FormData) {
  const me = await requireAdmin();
  const display_name = clean(form.get("display_name"), 150);
  if (!display_name) back("/admin/users", "Display name is required.", "error");
  const supabase = await createClient();
  await supabase.from("admins").update({ display_name }).eq("user_id", me.userId);
  back("/admin/users", "Display name updated.");
}
