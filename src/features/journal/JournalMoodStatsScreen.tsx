import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  JOURNAL_MOODS,
  aggregateMoodsInMonth,
  totalMoodDaysInMonth,
} from '@/features/journal/journalMood';
import { localDateKey } from '@/features/habits/habitLogic';
import { useDayJournalStore } from '@/stores/dayJournal.store';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

function monthTitleRu(y: number, month: number): string {
  const s = new Date(y, month - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const d = new Date(y, m - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

export function JournalMoodStatsScreen() {
  const { colors, spacing, radius, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const doc = useDayJournalStore((s) => s.doc);
  const todayKey = localDateKey();
  const [ty, tm] = todayKey.split('-').map(Number);

  const [y1, setY1] = useState(ty);
  const [m1, setM1] = useState(tm);
  const [y2, setY2] = useState(() => shiftMonth(ty, tm, -1).y);
  const [m2, setM2] = useState(() => shiftMonth(ty, tm, -1).m);

  const c1 = useMemo(() => aggregateMoodsInMonth(doc, y1, m1, todayKey), [doc, y1, m1, todayKey]);
  const c2 = useMemo(() => aggregateMoodsInMonth(doc, y2, m2, todayKey), [doc, y2, m2, todayKey]);
  const t1 = totalMoodDaysInMonth(c1);
  const t2 = totalMoodDaysInMonth(c2);

  const bump = (which: 1 | -1, slot: 1 | 2) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (slot === 1) {
      const n = shiftMonth(y1, m1, which);
      setY1(n.y);
      setM1(n.m);
    } else {
      const n = shiftMonth(y2, m2, which);
      setY2(n.y);
      setM2(n.m);
    }
  };

  const renderBlock = (
    label: string,
    counts: ReturnType<typeof aggregateMoodsInMonth>,
    total: number,
    slot: 1 | 2
  ) => (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Pressable onPress={() => bump(-1, slot)} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', flex: 1 }}>{label}</Text>
        <Pressable onPress={() => bump(1, slot)} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md }}>
        Отмечено дней с настроением: {total}
      </Text>
      {JOURNAL_MOODS.map((row) => {
        const n = counts[row.id];
        const pct = total > 0 ? n / total : 0;
        return (
          <View key={row.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{row.label}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                {n}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.round(pct * 1000) / 10}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: row.circleBg,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Настроения',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScreenCanvas>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textMuted, marginBottom: spacing.lg }}>
            Сколько дней в месяце с каким настроением. Ниже — два месяца рядом для сравнения (листай стрелками).
          </Text>

          {renderBlock(monthTitleRu(y1, m1), c1, t1, 1)}
          <View
            style={{
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.08)',
              marginVertical: spacing.md,
            }}
          />
          <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1, color: brand.primarySoft, marginBottom: spacing.sm }}>
            СРАВНЕНИЕ
          </Text>
          {renderBlock(monthTitleRu(y2, m2), c2, t2, 2)}

          <View style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 10 }}>Разница по типам</Text>
            {JOURNAL_MOODS.map((row) => {
              const d = c1[row.id] - c2[row.id];
              const sign = d > 0 ? '+' : '';
              return (
                <View
                  key={row.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.text }}>
                    {row.emoji} {row.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      fontVariant: ['tabular-nums'],
                      color: d === 0 ? colors.textMuted : d > 0 ? '#86EFAC' : '#FCA5A5',
                    }}
                  >
                    {sign}
                    {d}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScreenCanvas>
    </>
  );
}
