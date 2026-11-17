import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Cookie-free anon client for public catalogue reads (products, categories, settings).
 * Not tied to a visitor, so storefront pages can be cached and revalidated by Next.js.
 */
export function createPublicClient() {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
