import { type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { HeaderTabMenuBurger } from '@/shared/ui/HeaderTabMenuBurger';
import { useAppTheme } from '@/theme';

type Props = {
  /** Центральная зона (заголовки экрана). Если пусто — только аватар и меню. */
  children?: ReactNode;
  /** Кнопки справа до бургера (например, шестерёнка на экране спринта). */
  trailing?: ReactNode;
  avatarMarginTop?: number;
  marginBottom?: number;
};

/**
 * Шапка таб-экранов: аватар слева, опциональный контент по центру, бургер справа.
 */
export function ScreenHeaderChrome({ children, trailing, avatarMarginTop = 4, marginBottom }: Props) {
  const { spacing } = useAppTheme();
  const mb = marginBottom ?? spacing.md;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: mb,
      }}
    >
      <HeaderProfileAvatar marginTop={avatarMarginTop} />
      {children != null && children !== false ? (
        <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>{children}</View>
      ) : (
        <View style={{ flex: 1, minWidth: 0 }} />
      )}
      {trailing ? <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>{trailing}</View> : null}
      {Platform.OS !== 'web' ? <HeaderTabMenuBurger /> : null}
    </View>
  );
}
