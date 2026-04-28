import Constants from 'expo-constants';
import { createElement, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

/** Как в `getEmailAuthRedirectUri` — путь к статике при `experiments.baseUrl`. */
function routerBasePath(): string {
  const raw =
    (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '';
  return raw.replace(/\/$/, '');
}

const IFRAME_STYLE: CSSProperties = {
  width: '100%',
  minHeight: 720,
  border: 'none',
  display: 'block',
  background: '#060606',
};

/**
 * Встраивает `public/strategy-vision-hub.html` в iframe (тот же origin и baseUrl, что у приложения).
 * Содержимое и стили — из внешнего HTML; здесь только оболочка под скролл приложения.
 */
export function StrategyVisionHubEmbed() {
  const { radius, spacing, brand } = useAppTheme();

  const src =
    typeof window !== 'undefined'
      ? `${window.location.origin}${routerBasePath()}/strategy-vision-hub.html`
      : '';

  if (!src) {
    return null;
  }

  return (
    <View
      style={[
        styles.shell,
        {
          marginTop: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: brand.surfaceBorder,
          backgroundColor: '#060606',
        },
      ]}
      collapsable={false}
    >
      {createElement('iframe', {
        src,
        title: 'Стратегия и видение · Sophia',
        style: {
          ...IFRAME_STYLE,
          borderRadius: radius.lg,
        },
        loading: 'lazy',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    overflow: 'hidden',
    minHeight: 400,
  },
});
