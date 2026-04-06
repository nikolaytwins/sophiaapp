import { Redirect } from 'expo-router';

/** Старые ссылки /journal ведут на экран «День». Экран не в табах. */
export default function JournalRedirect() {
  return <Redirect href="/day" />;
}
