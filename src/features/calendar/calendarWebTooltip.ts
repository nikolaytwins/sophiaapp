import { Platform } from 'react-native';

/** Нативная подсказка браузера с полным названием события (web). */
export function webEventTitleProps(title: string): Record<string, string> {
  if (Platform.OS !== 'web' || !title.trim()) return {};
  return { title: title.trim() };
}
