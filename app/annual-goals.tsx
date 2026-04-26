import { Redirect } from 'expo-router';

/** Старый URL: годовые цели теперь в разделе «Цели». */
export default function AnnualGoalsRedirect() {
  return <Redirect href="/goals" />;
}
