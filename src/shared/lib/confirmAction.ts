import { Alert, Platform } from 'react-native';

/** Простое сообщение (ошибка, подсказка). На web — `window.alert`. */
export function alertInfo(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  if (message != null && message !== '') {
    Alert.alert(title, message);
  } else {
    Alert.alert(title);
  }
}

/**
 * Подтверждение опасного действия. На web — `window.confirm` (Alert с двумя кнопками в RN Web часто не работает).
 */
export function confirmDestructive(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}): void {
  const { title, message, onConfirm, confirmLabel = 'Удалить' } = options;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`${title}\n\n${message}`);
      if (ok) onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Отмена', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
