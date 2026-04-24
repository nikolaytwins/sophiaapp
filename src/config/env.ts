/**
 * URL astro API.
 * В вебе приоритет: тот же host, что у страницы (localhost vs 127.0.0.1 / LAN) — иначе fetch часто падает с «Failed to fetch».
 * Дальше: EXPO_PUBLIC_ASTRO_API_URL, expo.extra.astroApiUrl.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function trimBase(u: string) {
  return u.replace(/\/$/, '');
}

function isPrivateDevHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

export const astroApiBaseUrl = (() => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (isPrivateDevHost(h)) {
      return trimBase(`http://${h}:8765`);
    }
  }

  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_ASTRO_API_URL
      ? String(process.env.EXPO_PUBLIC_ASTRO_API_URL).trim()
      : '';
  if (fromEnv) return trimBase(fromEnv);

  const extra = Constants.expoConfig?.extra as { astroApiUrl?: string } | undefined;
  if (extra?.astroApiUrl && String(extra.astroApiUrl).trim()) {
    return trimBase(String(extra.astroApiUrl).trim());
  }

  return '';
})();

/**
 * Сервер синхронизации привычек (см. `server/habits-sync.mjs`).
 * Нужны оба: URL и длинный секрет в Bearer — одинаковые на всех устройствах.
 */
export const sophiaHabitsApiBaseUrl = (() => {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SOPHIA_HABITS_URL
      ? String(process.env.EXPO_PUBLIC_SOPHIA_HABITS_URL).trim()
      : '';
  if (fromEnv) return trimBase(fromEnv);

  const extra = Constants.expoConfig?.extra as { sophiaHabitsUrl?: string } | undefined;
  if (extra?.sophiaHabitsUrl && String(extra.sophiaHabitsUrl).trim()) {
    return trimBase(String(extra.sophiaHabitsUrl).trim());
  }

  return '';
})();

/** Секрет синка (попадает в клиентский бандл — для личного использования; в проде лучше свой домен + HTTPS). */
export const sophiaHabitsSyncKey = (() => {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SOPHIA_HABITS_SYNC_KEY
      ? String(process.env.EXPO_PUBLIC_SOPHIA_HABITS_SYNC_KEY).trim()
      : '';
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { sophiaHabitsSyncKey?: string } | undefined;
  if (extra?.sophiaHabitsSyncKey && String(extra.sophiaHabitsSyncKey).trim()) {
    return String(extra.sophiaHabitsSyncKey).trim();
  }

  return '';
})();

export const useRemoteHabitsSync = Boolean(sophiaHabitsApiBaseUrl && sophiaHabitsSyncKey);

/** Supabase: Project URL и anon key из Dashboard → Settings → API */
export const supabaseUrl = (() => {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SUPABASE_URL
      ? String(process.env.EXPO_PUBLIC_SUPABASE_URL).trim()
      : '';
  if (fromEnv) return trimBase(fromEnv);

  const extra = Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined;
  if (extra?.supabaseUrl && String(extra.supabaseUrl).trim()) {
    return trimBase(String(extra.supabaseUrl).trim());
  }
  return '';
})();

export const supabaseAnonKey = (() => {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      ? String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY).trim()
      : '';
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { supabaseAnonKey?: string } | undefined;
  if (extra?.supabaseAnonKey && String(extra.supabaseAnonKey).trim()) {
    return String(extra.supabaseAnonKey).trim();
  }
  return '';
})();

export const useSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Teamtracker (Next, обычно `npm run dev` → порт 3003): выручка агентства за месяц для дашборда Sophia.
 * Секрет совпадает с `TT_INTEGRATION_SECRET` в Teamtracker — попадает в клиентский бандл; только для личного/LAN.
 */
export const teamtrackerBaseUrl = (() => {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_TEAMTRACKER_URL
      ? String(process.env.EXPO_PUBLIC_TEAMTRACKER_URL).trim()
      : '';
  if (fromEnv) return trimBase(fromEnv);

  const extra = Constants.expoConfig?.extra as { teamtrackerUrl?: string } | undefined;
  if (extra?.teamtrackerUrl && String(extra.teamtrackerUrl).trim()) {
    return trimBase(String(extra.teamtrackerUrl).trim());
  }

  return '';
})();

export const teamtrackerIntegrationSecret = (() => {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_TEAMTRACKER_INTEGRATION_SECRET
      ? String(process.env.EXPO_PUBLIC_TEAMTRACKER_INTEGRATION_SECRET).trim()
      : '';
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { teamtrackerIntegrationSecret?: string } | undefined;
  if (extra?.teamtrackerIntegrationSecret && String(extra.teamtrackerIntegrationSecret).trim()) {
    return String(extra.teamtrackerIntegrationSecret).trim();
  }

  return '';
})();

export const useTeamtrackerAgencyIncomeConfigured = Boolean(
  teamtrackerBaseUrl && teamtrackerIntegrationSecret.length >= 16
);
