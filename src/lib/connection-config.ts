// Only public browser configuration belongs here; never substitute private keys.
export function validPublicConnection(url: unknown, key: unknown): boolean {
  if (typeof url !== "string" || typeof key !== "string" || !key.trim() || key.startsWith("sb_secret_")) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) && !parsed.username && !parsed.password;
  } catch { return false; }
}

export function hasPublicConnection(): boolean {
  return validPublicConnection(import.meta.env['VITE_SUPABASE_URL'], import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']);
}