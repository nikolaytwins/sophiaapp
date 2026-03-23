import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { repos } from '@/services/repositories';
import { GlassCard } from '@/shared/ui/GlassCard';
import { useAppTheme } from '@/theme';

const accentGrad: Record<'astro' | 'tarot' | 'moon' | 'self', [string, string]> = {
  astro: ['#5B4BFF', '#2D2366'],
  tarot: ['#7A5CFF', '#3B2A66'],
  moon: ['#4FA9FF', '#1E3A66'],
  self: ['#5ED4C8', '#1E4A44'],
};

const afterDarkGrad = ['#3D1F2E', '#1A0B14'] as const;

export function EsotericaScreen() {
  const { colors, typography, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hub = useQuery({ queryKey: ['esoteric'], queryFn: () => repos.esoteric.getHub() });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: spacing.xl,
        },
        cardInner: {
          padding: spacing.xl,
        },
        cardTitle: {
          ...typography.title1,
          color: '#F4F5F8',
        },
        cardSub: {
          ...typography.body,
          color: 'rgba(244,245,248,0.85)',
          marginTop: spacing.sm,
        },
        cardHint: {
          ...typography.caption,
          color: 'rgba(244,245,248,0.55)',
          marginTop: spacing.lg,
        },
        afterDarkInner: {
          padding: spacing.xl,
        },
        afterDarkKicker: {
          ...typography.caption,
          color: 'rgba(244,245,248,0.55)',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        },
        afterDarkTitle: {
          ...typography.title1,
          color: '#F4F5F8',
          marginTop: spacing.sm,
          letterSpacing: -0.3,
        },
        afterDarkSub: {
          ...typography.body,
          color: 'rgba(244,245,248,0.82)',
          marginTop: spacing.md,
          lineHeight: 22,
        },
        afterDarkHint: {
          ...typography.caption,
          color: 'rgba(201,168,108,0.95)',
          marginTop: spacing.lg,
          fontWeight: '600',
        },
      }),
    [colors, typography, spacing]
  );

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={typography.caption}>Модуль</Text>
      <Text style={typography.hero}>Эзотерика</Text>
      <Text style={[typography.body, { marginTop: spacing.sm }]}>
        Астро, периоды, таро, портрет — AI-интерпретации подключим отдельными endpoints.
      </Text>

      <Pressable onPress={() => router.push('/(private)')} style={{ marginTop: spacing.lg }}>
        <GlassCard padding={0} style={{ overflow: 'hidden' }}>
          <LinearGradient colors={afterDarkGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.afterDarkInner}>
              <Text style={styles.afterDarkKicker}>Приватно · только для тебя</Text>
              <Text style={styles.afterDarkTitle}>After Dark</Text>
              <Text style={styles.afterDarkSub}>
                Интимный навигатор: энергия дня, риски, отношения, окна контакта и чат с Софией —
                без пошлости, как премиум-lounge.
              </Text>
              <Text style={styles.afterDarkHint}>Открыть →</Text>
            </View>
          </LinearGradient>
        </GlassCard>
      </Pressable>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {(hub.data ?? []).map((item) => (
          <GlassCard key={item.id} padding={0} style={{ overflow: 'hidden' }}>
            <LinearGradient colors={accentGrad[item.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.cardInner}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
                <Text style={styles.cardHint}>Preview · tap → детали (этап 2)</Text>
              </View>
            </LinearGradient>
          </GlassCard>
        ))}
      </View>
    </ScrollView>
  );
}
