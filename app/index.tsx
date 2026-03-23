import { Redirect } from 'expo-router';

/**
 * Корень сайта / → сразу вкладка «День» (иначе web показывал +not-found).
 */
export default function Index() {
  return <Redirect href="/(tabs)/day" />;
}
