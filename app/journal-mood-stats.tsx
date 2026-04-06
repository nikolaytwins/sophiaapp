import { Redirect } from 'expo-router';

/** Статистика настроений перенесена на экран «Привычки». */
export default function JournalMoodStatsRedirect() {
  return <Redirect href="/habits?focus=mood" />;
}
