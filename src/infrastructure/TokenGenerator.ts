export interface TokenGenerator {
  /** A new random secret, shown to the owner once. */
  generate(): string;
  /** SHA-256 hex digest: the only form of the token that is stored. */
  hash(token: string): Promise<string>;
}

export class WebCryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    // base64url without padding: safe in HTTP headers and C strings.
    return btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  }

  async hash(token: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
