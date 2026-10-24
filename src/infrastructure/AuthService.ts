import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthService {
  currentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<void>;
  /** Returns true when Supabase asks the user to confirm their email first. */
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  onChange(listener: (user: AuthUser | null) => void): () => void;
}

export class SupabaseAuthService implements AuthService {
  private readonly db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async currentUser(): Promise<AuthUser | null> {
    const { data } = await this.db.auth.getSession();
    const user = data.session?.user;
    return user ? { id: user.id, email: user.email ?? "" } : null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  }

  async signOut(): Promise<void> {
    const { error } = await this.db.auth.signOut();
    if (error) throw new Error(error.message);
  }

  onChange(listener: (user: AuthUser | null) => void): () => void {
    const { data } = this.db.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      listener(user ? { id: user.id, email: user.email ?? "" } : null);
    });
    return () => data.subscription.unsubscribe();
  }
}
