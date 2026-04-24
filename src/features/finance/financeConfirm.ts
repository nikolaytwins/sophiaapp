import { Alert, Platform } from 'react-native';

/** На web `Alert.alert` с кнопками часто не показывается — используем `confirm`. */
export function confirmFinanceDestructive(
  title: string,
  message: string,
  onConfirm: () => void
): void {
  if (Platform.OS === 'web' && typeof globalThis !== 'undefined') {
    const w = globalThis as unknown as { window?: { confirm?: (m: string) => boolean } };
    if (w.window?.confirm && w.window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: onConfirm },
  ]);
}
