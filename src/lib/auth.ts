import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = { userId: string; email: string; displayName: string };

/** Use at the top of every admin page and admin Server Action. Redirects to /admin/login when not allowed. */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await supabase.from("admins").select("display_name").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/admin/login?error=not-admin");
  return { userId: user.id, email: user.email ?? "", displayName: String(admin.display_name) };
}
