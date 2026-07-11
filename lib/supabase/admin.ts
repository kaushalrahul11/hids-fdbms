import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. Never import this from a Client Component or expose the key
// with a NEXT_PUBLIC_ prefix — it bypasses Row Level Security entirely.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
