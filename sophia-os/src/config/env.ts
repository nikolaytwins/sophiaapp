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
