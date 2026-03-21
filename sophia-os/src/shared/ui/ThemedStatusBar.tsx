import { StatusBar } from 'expo-status-bar';

import { useAppTheme } from '@/theme';

export function ThemedStatusBar() {
  const { isLight } = useAppTheme();
  return <StatusBar style={isLight ? 'dark' : 'light'} />;
}
