import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { getSupabase } from '@/lib/supabase';

/** После входа/выхода обновляет кэш привычек (локально ↔ облако). */
export function SupabaseAuthListener() {
  const qc = useQueryClient();
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return undefined;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      qc.invalidateQueries({ queryKey: [...HABITS_QUERY_KEY] });
    });
    return () => subscription.unsubscribe();
  }, [qc]);
  return null;
}
