import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** True when both env vars are set; otherwise the app runs in local mode. */
export const isSupabaseConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | null = null;

/** The browser only ever gets the publishable key. Row Level Security protects the data. */
export function getSupabase(): SupabaseClient {
  if (!url || !publishableKey) throw new Error("Supabase is not configured");
  client ??= createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}
