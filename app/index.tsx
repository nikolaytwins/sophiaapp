import { Redirect } from 'expo-router';

/**
 * Корень / → основной экран трекера привычек.
 */
export default function Index() {
  return <Redirect href="/habits" />;
}
