import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, usePathname, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_ROUTE_ORDER, TAB_HREF, TAB_ICONS, TAB_LABELS } from '@/navigation/tabBarCatalog';
import { useAppTheme } from '@/theme';

/** Сравнение по последнему сегменту пути — работает и при деплое в подпапку (например `/sophia/goals`). */
function pathMatchesTab(pathname: string, routeName: string): boolean {
  const norm = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '') || '/';
  const segments = norm.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  return last === routeName;
}

function includeInMenu(name: string): boolean {
  return name !== 'inbox';
}

/**
 * Кнопка «меню разделов» — те же пункты, что в нижнем таббаре, для узких экранов.
 */
export function HeaderTabMenuBurger() {
  const { colors, spacing, typography, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const routes = useMemo(() => TAB_BAR_ROUTE_ORDER.filter(includeInMenu), []);

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (href: Href) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.selectionAsync();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Меню разделов"
        hitSlop={10}
        style={({ pressed }) => [
          styles.btn,
          {
            marginTop: width < 420 ? 2 : 4,
            borderColor: isLight ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.14)',
            backgroundColor: pressed ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.06)',
          },
          webPointer,
        ]}
      >
        <Ionicons name="menu" size={24} color={isLight ? colors.text : 'rgba(248,250,252,0.92)'} />
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                paddingTop: Math.max(insets.top, 14) + 8,
                paddingBottom: Math.max(insets.bottom, 16),
                backgroundColor: isLight ? '#f4f4f8' : '#121018',
                borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
              },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                paddingHorizontal: spacing.md,
              }}
            >
              <Text style={[typography.title1, { color: colors.text, fontWeight: '800', fontSize: 18 }]}>Разделы</Text>
              <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Закрыть">
                <Ionicons name="close" size={28} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {routes.map((name) => {
                const label = TAB_LABELS[name] ?? name;
                const icon = (TAB_ICONS[name] ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap;
                const href = (TAB_HREF[name] ?? `/${name}`) as Href;
                const active = pathMatchesTab(pathname, name);
                const tint = active ? (isLight ? '#7c3aed' : '#c084fc') : colors.textMuted;

                return (
                  <Pressable
                    key={name}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      go(href);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 14,
                      paddingHorizontal: spacing.md,
                      backgroundColor: pressed
                        ? isLight
                          ? 'rgba(124,58,237,0.08)'
                          : 'rgba(168,85,247,0.1)'
                        : active
                          ? isLight
                            ? 'rgba(124,58,237,0.06)'
                            : 'rgba(168,85,247,0.08)'
                          : 'transparent',
                    })}
                  >
                    <Ionicons name={icon} size={22} color={tint} />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: active ? '800' : '600',
                        color: active ? colors.text : colors.textMuted,
                      }}
                    >
                      {label}
                    </Text>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={tint} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
});
