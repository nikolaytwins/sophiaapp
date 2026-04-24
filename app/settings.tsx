import { type Href, Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Старый маршрут /settings → /profile с тем же query tab=habits.
 */
export default function SettingsLegacyRedirect() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const t = Array.isArray(tab) ? tab[0] : tab;
  const href = (t === 'habits' ? '/profile?tab=habits' : '/profile?tab=settings') as Href;
  return <Redirect href={href} />;
}
