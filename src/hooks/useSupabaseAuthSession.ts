import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import { getSupabase } from "@/lib/supabase";

function readAvatarUrl(user: User | null): string | null {
  if (!user?.user_metadata) return null;
  const u = user.user_metadata.avatar_url;
  return typeof u === "string" && u.trim().length > 0 ? u.trim() : null;
}

function readDisplayName(user: User | null): string {
  if (!user) return "";
  const m = user.user_metadata;
  const raw = m?.full_name ?? m?.name;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const email = user.email;
  if (email && email.includes("@")) return email.split("@")[0] ?? "";
  return "";
}

const SESSION_TIMEOUT_MS = 8000;

export function useSupabaseAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setSession(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await Promise.race([
        sb.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase не отвечает (таймаут)")), SESSION_TIMEOUT_MS)
        ),
      ]);
      setSession(result.data.session);
    } catch (e) {
      setSession(null);
      setError(e instanceof Error ? e.message : "Ошибка Supabase");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return undefined;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setError(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  return {
    session,
    user,
    loading,
    error,
    isAuthed: Boolean(user),
    avatarUrl: readAvatarUrl(user),
    displayName: readDisplayName(user),
    email: user?.email ?? null,
    refresh,
  };
}
