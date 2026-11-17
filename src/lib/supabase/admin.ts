import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role client. SERVER ONLY - bypasses RLS.
 * Used for: checkout, webhooks, public form submissions (after validation), signed URLs, admin user invites.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }
  const { supabaseUrl } = publicEnv();
  const { serviceRoleKey } = serverEnv();
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
