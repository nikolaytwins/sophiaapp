import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnualGoalsScreen } from '@/features/goals/AnnualGoalsScreen';
import { GlobalVisionScreen } from '@/features/goals/GlobalVisionScreen';
import { GOALS_ACCENT } from '@/features/goals/goalsNotionTheme';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { ScreenTitle } from '@/shared/ui/ScreenTitle';
import { useAppTheme } from '@/theme';

const CARD_R = 18;

type GoalsMainTabId = 'annual' | 'global';

const GOALS_MAIN_TABS: {
  id: GoalsMainTabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'annual', label: 'Годовые цели', icon: 'layers-outline' },
  { id: 'global', label: 'Глобальное видение', icon: 'globe-outline' },
];

const PERSONAL_BOARD_HREF = '/personal-targets' as Href;

/**
 * Годовые цели и глобальное видение — вкладка «Цели» (`/goals`).
 * Персональная доска (николаевский блок и боковые цели): `/personal-targets`.
 */
export function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useAppTheme();
  const [mainTab, setMainTab] = useState<GoalsMainTabId>('annual');

  return (
    <ScreenCanvas>
      <View
        style={{
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.xl + 4,
          paddingBottom: spacing.md,
        }}
      >
        <ScreenTitle eyebrow="Раздел" title="Цели" trailing={<HeaderProfileAvatar marginTop={0} />} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.xl + 4, marginBottom: spacing.sm }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.3,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 12,
            }}
          >
            ЦЕЛИ
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {GOALS_MAIN_TABS.map(({ id, label, icon }) => {
              const activeTab = mainTab === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setMainTab(id)}
                  style={activeTab ? { flex: 1 } : { flex: 1, opacity: 0.88 }}
                >
                  {activeTab ? (
                    <LinearGradient
                      colors={['rgba(168,85,247,0.45)', 'rgba(168,85,247,0.12)']}
                      style={{
                        borderRadius: CARD_R,
                        paddingVertical: 14,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(168,85,247,0.55)',
                        alignItems: 'center',
                        gap: 8,
                        flexDirection: 'row',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={icon} size={22} color={GOALS_ACCENT} />
                      <Text
                        numberOfLines={2}
                        style={{
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: '800',
                          color: '#FAFAFC',
                          lineHeight: 17,
                          flexShrink: 1,
                        }}
                      >
                        {label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={{
                        borderRadius: CARD_R,
                        paddingVertical: 14,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        alignItems: 'center',
                        gap: 8,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        minHeight: 52,
                      }}
                    >
                      <Ionicons name={icon} size={22} color="rgba(255,255,255,0.42)" />
                      <Text
                        numberOfLines={2}
                        style={{
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: '700',
                          color: colors.textMuted,
                          lineHeight: 17,
                          flexShrink: 1,
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 14, alignItems: 'flex-start' }}>
            <Link href={PERSONAL_BOARD_HREF} asChild>
              <Pressable hitSlop={6}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOALS_ACCENT, textDecorationLine: 'underline' }}>
                  Персональная доска целей →
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        {mainTab === 'annual' ? <AnnualGoalsScreen /> : <GlobalVisionScreen />}
      </View>
    </ScreenCanvas>
  );
}
