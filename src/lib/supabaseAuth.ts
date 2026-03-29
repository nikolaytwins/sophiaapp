import type { SupabaseClient } from '@supabase/supabase-js';

function extractAuthCode(url: string): string | null {
  try {
    const qIndex = url.indexOf('?');
    const hIndex = url.indexOf('#');
    const search =
      qIndex >= 0
        ? url.slice(qIndex + 1, hIndex >= 0 ? hIndex : undefined)
        : hIndex >= 0
          ? url.slice(hIndex + 1)
          : '';
    const params = new URLSearchParams(search);
    const fromQuery = params.get('code');
    if (fromQuery) return fromQuery;
    if (hIndex >= 0) {
      const hashParams = new URLSearchParams(url.slice(hIndex + 1));
      return hashParams.get('code');
    }
  } catch {
    /* ignore */
  }
  return null;
}

function extractTokensFromHash(url: string): { access_token: string; refresh_token: string } | null {
  const h = url.indexOf('#');
  if (h < 0) return null;
  const p = new URLSearchParams(url.slice(h + 1));
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  if (access_token && refresh_token) return { access_token, refresh_token };
  return null;
}

/**
 * Завершает вход по ссылке из письма (PKCE: ?code=… или старый поток #access_token).
 * `ok: false` — в URL не было ни кода, ни токенов (ещё не ошибка сети).
 */
export async function completeAuthFromUrl(
  supabase: SupabaseClient,
  url: string
): Promise<{ error: Error | null; ok: boolean }> {
  const code = extractAuthCode(url);
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return { error: error ?? null, ok: !error };
  }
  const tokens = extractTokensFromHash(url);
  if (tokens) {
    const { error } = await supabase.auth.setSession(tokens);
    return { error: error ?? null, ok: !error };
  }
  return { error: null, ok: false };
}
