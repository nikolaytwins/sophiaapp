import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** Из app.json experiments.baseUrl, например `/sophia` */
function routerBasePath(): string {
  const raw =
    (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '';
  return raw.replace(/\/$/, '');
}

/**
 * URL для Supabase `emailRedirectTo` и для Redirect URLs в Dashboard.
 * На вебе с basePath `/sophia` должен быть `https://хост/sophia/auth/callback`, иначе письмо ведёт на `/auth/callback` → 500.
 */
export function getEmailAuthRedirectUri(): string {
  const base = routerBasePath();

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${base}/auth/callback`;
  }

  return Linking.createURL('auth/callback');
}
