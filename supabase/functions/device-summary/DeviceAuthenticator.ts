import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

export interface AuthenticatedDevice {
  id: string;
  userId: string;
  lastSeenAt: string | null;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hashes the token, finds an active (not revoked) device, and records that it was seen. */
export class DeviceAuthenticator {
  private readonly db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async authenticate(token: string | null): Promise<AuthenticatedDevice | null> {
    if (!token || token.length < 20 || token.length > 200) return null;
    const { data, error } = await this.db
      .from("devices")
      .select("id, user_id, last_seen_at")
      .eq("token_hash", await sha256Hex(token))
      .is("revoked_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { id: data.id, userId: data.user_id, lastSeenAt: data.last_seen_at } : null;
  }

  async markSeen(deviceId: string, now: Date): Promise<void> {
    const { error } = await this.db
      .from("devices")
      .update({ last_seen_at: now.toISOString() })
      .eq("id", deviceId);
    if (error) throw new Error(error.message);
  }
}
