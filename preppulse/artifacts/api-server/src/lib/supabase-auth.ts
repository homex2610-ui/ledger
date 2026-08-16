interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
}

export function supabaseAuthConfig(): SupabaseAuthConfig {
  return {
    url: (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, ""),
    anonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
  };
}

export function supabaseAuthConfigured(): boolean {
  const { url, anonKey } = supabaseAuthConfig();
  return url.length > 0 && anonKey.length > 0;
}

/** Asks Supabase Auth to email a recovery link. Generic for unknown emails. */
export async function sendRecoveryEmail(email: string, redirectTo: string): Promise<void> {
  const { url, anonKey } = supabaseAuthConfig();
  if (!url || !anonKey) throw new Error("Supabase Auth is not configured");
  const response = await fetch(`${url}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, options: { redirectTo } }),
  });
  if (!response.ok) {
    throw new Error(`Recovery request failed (${response.status})`);
  }
}

/** Verifies a recovery access token against Supabase Auth. */
export async function verifyRecoveryToken(
  accessToken: string,
): Promise<{ id: string; email: string } | null> {
  const { url, anonKey } = supabaseAuthConfig();
  if (!url || !anonKey) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { id?: string; email?: string | null };
    if (!data.id || !data.email) return null;
    return { id: data.id, email: data.email };
  } catch {
    return null;
  }
}

/**
 * Deletes a Supabase Auth user (admin API, service-role key). Called when the
 * app account is deleted so the email cannot be resurrected via a recovery
 * link. No-op when the service-role key is not configured. A missing user
 * (404) is treated as success.
 */
export async function deleteSupabaseUser(userId: string): Promise<boolean> {
  const { url } = supabaseAuthConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE ?? "";
  if (!url || !serviceRoleKey) return false;
  try {
    const response = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}