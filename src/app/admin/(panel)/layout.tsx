import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | EDX Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const supabase = await createClient();
  const [toShip, newCustom, newMessages] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).in("payment_status", ["paid", "offline"]).in("status", ["received", "processing", "printing", "ready"]),
    supabase.from("custom_orders").select("id", { count: "exact", head: true }).eq("status", "new").is("archived_at", null),
    supabase.from("messages").select("id", { count: "exact", head: true }).is("archived_at", null)
  ]);
  return (
    <AdminShell
      displayName={me.displayName}
      badges={{ "/admin/orders": toShip.count ?? 0, "/admin/custom-orders": newCustom.count ?? 0, "/admin/requests": newMessages.count ?? 0 }}
    >
      {children}
    </AdminShell>
  );
}
