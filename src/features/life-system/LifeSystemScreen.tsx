import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GenZFinanceReservePlaque } from '@/features/accounts/nikolayFinanceReservePlaque';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { formatSideGoalDateCaption } from '@/features/goals/sideGoals.logic';
import {
  LIFE_SYSTEM_DAILY_PRACTICES,
  LIFE_SYSTEM_FINANCE,
  LIFE_SYSTEM_LIFE_RULES,
  LIFE_SYSTEM_NAV_SECTIONS,
  LIFE_SYSTEM_PASSIVE_INCOME_RUB,
  LIFE_SYSTEM_ROADMAP,
  LIFE_SYSTEM_SIDE_GOAL_SEEDS,
  LIFE_SYSTEM_TWINLABS_STEPS,
  LIFE_SYSTEM_WORK_MODE,
} from '@/features/life-system/lifeSystem.config';
import {
  fmtRub,
  LsCard,
  LsLabel,
  LsLinkRow,
  LsProgressBar,
  LsSectionHead,
  LsSticky,
  LsValue,
  LS_ACCENT,
  LS_ACCENT_SOFT,
  LS_MUTED,
  LS_TEXT,
} from '@/features/life-system/LifeSystemUi';
import { useLifeSystemData } from '@/features/life-system/useLifeSystemData';
import { getSupabase } from '@/lib/supabase';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { ScreenHeaderChrome } from '@/shared/ui/ScreenHeaderChrome';
import { useSideGoalsStore } from '@/stores/sideGoals.store';
import { useAppTheme } from '@/theme';

const HORIZON_FALLBACK_IMAGE: Record<string, string> = {
  'sg-mercedes': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=700&q=80',
  'sg-house': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80',
};

const ACCENT_MAP = {
  violet: LS_ACCENT_SOFT,
  teal: '#67e8f9',
  amber: '#fbbf24',
  rose: '#fb7185',
  mint: '#86efac',
} as const;

function TwoCol({ children, wide }: { children: ReactNode; wide: boolean }) {
  if (!wide) return <View style={{ gap: 12 }}>{children}</View>;
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
      {children}
    </View>
  );
}

function Col({ children, wide, flex = 1 }: { children: ReactNode; wide: boolean; flex?: number }) {
  return (
    <View style={{ flex: wide ? flex : undefined, width: wide ? undefined : '100%', gap: 12 }}>{children}</View>
  );
}

export function LifeSystemScreen() {
  const { spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});

  const {
    nearestGoals,
    horizonGoals,
    reserves,
    cushionTarget,
    cushionCurrent,
    cushionPct,
    growthCurrent,
    growthTarget,
    upcomingTasks,
  } = useLifeSystemData();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const sb = getSupabase();
      if (!sb) return;
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user?.id && isNikolayPrimaryAccount(user.email)) setUserId(user.id);
    })();
  }, []);

  const go = useCallback((href: Href) => () => router.push(href), [router]);

  const scrollToSection = useCallback((id: string) => {
    const y = sectionY.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }, []);

  const updatedLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const registerSection = (id: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionY.current[id] = e.nativeEvent.layout.y;
  };

  return (
    <ScreenCanvas>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: spacing.lg,
          maxWidth: wide ? 1200 : undefined,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeaderChrome marginBottom={spacing.md} avatarMarginTop={2}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, color: LS_MUTED, textTransform: 'uppercase' }}>
              Персональная система
            </Text>
            <Text style={{ fontSize: clampTitle(width), fontWeight: '800', color: LS_TEXT, letterSpacing: -0.5, marginTop: 6, lineHeight: 1.1 }}>
              Система <Text style={{ color: LS_ACCENT_SOFT }}>жизни</Text>
            </Text>
            <Text style={{ fontSize: 13, color: LS_MUTED, marginTop: 6 }}>
              Цели · Деньги · Проекты · Режим · Здоровье
            </Text>
            <Text style={{ fontSize: 11, color: LS_MUTED, marginTop: 4 }}>Обновлено {updatedLabel}</Text>
          </View>
        </ScreenHeaderChrome>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.lg }}
          contentContainerStyle={{ gap: 6, paddingRight: 8 }}
        >
          {LIFE_SYSTEM_NAV_SECTIONS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => scrollToSection(s.id)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              })}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: LS_MUTED }}>{s.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* GOALS */}
        <View onLayout={registerSection('goals')}>
          <LsSectionHead>Цели</LsSectionHead>
          <TwoCol wide={wide}>
            <Col wide={wide} flex={1}>
              <LsCard accent>
                <LsLabel dotColor={LS_ACCENT_SOFT}>Глобальная цель</LsLabel>
                <LsValue color={LS_ACCENT_SOFT}>{`${fmtRub(LIFE_SYSTEM_PASSIVE_INCOME_RUB)} ₽`}</LsValue>
                <Text style={{ fontSize: 13, fontWeight: '600', color: LS_TEXT, marginTop: 4 }}>Пассивный доход / мес</Text>
                <Text style={{ fontSize: 12, color: LS_MUTED, marginTop: 6, lineHeight: 18 }}>
                  Не зависит от включённости — капает регулярно, даже если не работал.
                </Text>
                <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                  <LsLabel>Подушка безопасности</LsLabel>
                  <Text style={{ fontSize: 12, color: LS_MUTED, marginBottom: 4 }}>
                    Цель {fmtRub(cushionTarget)} ₽ · сейчас {fmtRub(cushionCurrent)} ₽
                  </Text>
                  <LsProgressBar pct={cushionPct} />
                  {reserves.cushion && userId ? (
                    <View style={{ marginTop: 14 }}>
                      <GenZFinanceReservePlaque
                        variant="cushion"
                        defaultTitle="Подушка безопасности"
                        account={reserves.cushion}
                        userId={userId}
                        presentation="accountTile"
                      />
                    </View>
                  ) : (
                    <LsLinkRow label="Открыть в Финансах" hint="счёт подушки" onPress={go('/finance' as Href)} />
                  )}
                </View>
              </LsCard>
            </Col>
            <Col wide={wide} flex={1}>
              <LsCard onPress={go('/goals' as Href)}>
                <LsLabel>Ближайшие цели</LsLabel>
                {nearestGoals.length === 0 ? (
                  <Text style={{ fontSize: 13, color: LS_MUTED }}>Добавьте цели во вкладке «Цели»</Text>
                ) : (
                  nearestGoals.map((g) => (
                    <View
                      key={g.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 10,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: LS_ACCENT_SOFT, marginTop: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: LS_TEXT, fontWeight: '500' }}>{g.title}</Text>
                        {g.description ? (
                          <Text style={{ fontSize: 11, color: LS_MUTED, marginTop: 2 }}>{g.description}</Text>
                        ) : null}
                        {formatSideGoalDateCaption(g) ? (
                          <Text style={{ fontSize: 10, color: LS_ACCENT_SOFT, marginTop: 2 }}>{formatSideGoalDateCaption(g)}</Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={LS_MUTED} />
                    </View>
                  ))
                )}
                <LsLinkRow label="Все цели" onPress={go('/goals' as Href)} />
              </LsCard>
            </Col>
          </TwoCol>

          <View style={{ height: 12 }} />
          <LsSectionHead>Глобальные цели — горизонт</LsSectionHead>
          <TwoCol wide={wide}>
            {(horizonGoals.length > 0
              ? horizonGoals
              : LIFE_SYSTEM_SIDE_GOAL_SEEDS.filter((s) => s.isHorizon).map((s) => ({
                  id: s.id,
                  title: s.title,
                  description: s.description ?? '',
                  photoUris: [] as string[],
                }))
            ).map((g) => {
              const uri = ('photoUris' in g && g.photoUris[0]) || HORIZON_FALLBACK_IMAGE[g.id];
              return (
                <Col key={g.id} wide={wide} flex={1}>
                  <Pressable onPress={go('/goals' as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}>
                    <View style={{ borderRadius: 16, overflow: 'hidden', height: 190, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                      {uri ? (
                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : (
                        <LinearGradient colors={['#1a1028', '#0a0a0c']} style={{ flex: 1 }} />
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(10,10,12,0.95)']}
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%', padding: 20, justifyContent: 'flex-end' }}
                      >
                        <Text style={{ fontSize: 9, letterSpacing: 2, color: LS_MUTED, fontWeight: '700' }}>ГОРИЗОНТ</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: LS_TEXT, marginTop: 4, letterSpacing: -0.3 }}>
                          {g.title}
                        </Text>
                        {'description' in g && g.description ? (
                          <Text style={{ fontSize: 11, color: LS_MUTED, marginTop: 4 }}>{g.description}</Text>
                        ) : null}
                      </LinearGradient>
                    </View>
                  </Pressable>
                </Col>
              );
            })}
          </TwoCol>
        </View>

        {/* MONEY */}
        <View style={{ marginTop: 24 }} onLayout={registerSection('money')}>
          <LsSectionHead>Деньги — ежемесячная структура</LsSectionHead>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {LIFE_SYSTEM_FINANCE.buckets.map((b) => (
              <View key={b.id} style={{ flex: wide ? 1 : undefined, minWidth: wide ? 160 : '100%' }}>
                <LsCard>
                  <LsLabel>{b.label}</LsLabel>
                  <LsValue color={LS_ACCENT_SOFT}>{`${fmtRub(b.amountRub)} ₽`}</LsValue>
                  <Text style={{ fontSize: 12, color: LS_MUTED, marginTop: 4 }}>{b.note}</Text>
                </LsCard>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 12 }}>
            <LsCard>
              <LsLabel>Детали распределения</LsLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {LIFE_SYSTEM_FINANCE.buckets[0].breakdown?.map((row) => (
                  <View
                    key={row.label}
                    style={{
                      flexBasis: wide ? '48%' : '100%',
                      flexGrow: 1,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: LS_MUTED, letterSpacing: 0.8 }}>{row.label.toUpperCase()}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: LS_TEXT, marginTop: 4 }}>{fmtRub(row.amountRub)} ₽</Text>
                  </View>
                ))}
                <View
                  style={{
                    flexBasis: wide ? '48%' : '100%',
                    flexGrow: 1,
                    backgroundColor: 'rgba(115,55,221,0.1)',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(192,132,252,0.2)',
                  }}
                >
                  <Text style={{ fontSize: 10, color: LS_MUTED }}>НА КАРТУ / МЕС</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: LS_ACCENT_SOFT, marginTop: 4 }}>
                    {fmtRub(LIFE_SYSTEM_FINANCE.cardDepositRub)} ₽
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                <LsLabel>Счёт роста и хотелок</LsLabel>
                {reserves.growth && userId ? (
                  <GenZFinanceReservePlaque
                    variant="cushion"
                    overline="Накопления"
                    defaultTitle={reserves.growth.name}
                    account={reserves.growth}
                    userId={userId}
                    presentation="accountTile"
                  />
                ) : (
                  <>
                    <Text style={{ fontSize: 13, color: LS_MUTED, lineHeight: 20 }}>
                      {LIFE_SYSTEM_FINANCE.growthAccountHint}
                    </Text>
                    {growthTarget > 0 ? (
                      <Text style={{ fontSize: 12, color: LS_TEXT, marginTop: 8 }}>
                        {fmtRub(growthCurrent)} / {fmtRub(growthTarget)} ₽
                      </Text>
                    ) : null}
                    <LsLinkRow label="Создать в Финансах" onPress={go('/finance' as Href)} />
                  </>
                )}
              </View>
              <LsSticky>{LIFE_SYSTEM_FINANCE.principle}</LsSticky>
            </LsCard>
          </View>
        </View>

        {/* PROJECTS */}
        <View style={{ marginTop: 24 }} onLayout={registerSection('projects')}>
          <LsSectionHead>Проекты — дорожная карта</LsSectionHead>
          <TwoCol wide={wide}>
            <Col wide={wide} flex={1}>
              <LsCard>
                <LsLabel>Временная шкала</LsLabel>
                {LIFE_SYSTEM_ROADMAP.map((item, idx) => (
                  <View key={item.id} style={{ flexDirection: 'row', gap: 12, marginBottom: idx < LIFE_SYSTEM_ROADMAP.length - 1 ? 4 : 0 }}>
                    <Text style={{ width: 72, fontSize: 10, color: LS_MUTED, textAlign: 'right', lineHeight: 14, paddingTop: 4 }}>
                      {item.when.replace('\n', ' ')}
                    </Text>
                    <View style={{ alignItems: 'center', width: 12 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: ACCENT_MAP[item.accent],
                          marginTop: 4,
                          ...(item.highlight && Platform.OS === 'web'
                            ? ({ boxShadow: `0 0 8px ${ACCENT_MAP[item.accent]}` } as object)
                            : {}),
                        }}
                      />
                      {idx < LIFE_SYSTEM_ROADMAP.length - 1 ? (
                        <View style={{ width: 1, flex: 1, minHeight: 28, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 2 }} />
                      ) : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 20 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT_MAP[item.accent] }}>{item.title}</Text>
                      <Text style={{ fontSize: 11, color: LS_MUTED, marginTop: 2, lineHeight: 16 }}>{item.subtitle}</Text>
                      {item.chips ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {item.chips.map((c) => (
                            <Text
                              key={c}
                              style={{
                                fontSize: 10,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 20,
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                color: LS_MUTED,
                              }}
                            >
                              {c}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
                <LsLinkRow label="Стратегия и проекты" onPress={go('/strategy' as Href)} />
              </LsCard>
            </Col>
            <Col wide={wide} flex={1}>
              <LsCard>
                <LsLabel>Twijnlabs — автоматизация (май)</LsLabel>
                {LIFE_SYSTEM_TWINLABS_STEPS.map((step) => (
                  <View
                    key={step.n}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      marginTop: 6,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Text style={{ width: 20, fontSize: 10, color: LS_MUTED }}>{step.n}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: LS_TEXT }}>{step.title}</Text>
                      <Text style={{ fontSize: 11, color: LS_MUTED }}>{step.note}</Text>
                    </View>
                    <Text style={{ color: LS_ACCENT_SOFT, fontSize: 12 }}>→</Text>
                  </View>
                ))}
              </LsCard>
            </Col>
          </TwoCol>
        </View>

        {/* WORK */}
        <View style={{ marginTop: 24 }} onLayout={registerSection('work')}>
          <LsSectionHead>Режим работы</LsSectionHead>
          <TwoCol wide={wide}>
            <Col wide={wide} flex={1}>
              <LsCard>
                <LsLabel>Структура дня</LsLabel>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {LIFE_SYSTEM_WORK_MODE.blocks.map((b) => (
                    <View
                      key={b.label}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        padding: 14,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Text style={{ fontSize: 26, fontWeight: '800', color: LS_ACCENT_SOFT }}>{b.value}</Text>
                      <Text style={{ fontSize: 10, color: LS_MUTED, marginTop: 4 }}>{b.label}</Text>
                    </View>
                  ))}
                </View>
                {LIFE_SYSTEM_WORK_MODE.rhythm.map((line) => (
                  <View
                    key={line}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 8,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: LS_ACCENT_SOFT }} />
                    <Text style={{ fontSize: 12, color: LS_TEXT }}>{line}</Text>
                  </View>
                ))}
              </LsCard>
            </Col>
            <Col wide={wide} flex={1.4}>
              <LsCard>
                <LsLabel>Приоритеты — порядок работы</LsLabel>
                {LIFE_SYSTEM_WORK_MODE.priorities.map((p) => {
                  const bg =
                    p.tone === 'urgent'
                      ? 'rgba(248,113,113,0.08)'
                      : p.tone === 'primary'
                        ? 'rgba(115,55,221,0.12)'
                        : 'rgba(255,255,255,0.04)';
                  const border =
                    p.tone === 'urgent'
                      ? 'rgba(248,113,113,0.2)'
                      : p.tone === 'primary'
                        ? 'rgba(192,132,252,0.25)'
                        : 'transparent';
                  return (
                    <View
                      key={p.n}
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        padding: 12,
                        marginTop: 8,
                        borderRadius: 10,
                        backgroundColor: bg,
                        borderWidth: p.tone === 'muted' ? 0 : 1,
                        borderColor: border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: p.tone === 'urgent' ? '#f87171' : LS_ACCENT_SOFT, width: 18 }}>
                        {p.n}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: LS_TEXT }}>{p.title}</Text>
                        <Text style={{ fontSize: 11, color: LS_MUTED, marginTop: 2 }}>{p.note}</Text>
                      </View>
                    </View>
                  );
                })}
                <LsSticky>{LIFE_SYSTEM_WORK_MODE.rule90}</LsSticky>
              </LsCard>
            </Col>
          </TwoCol>
        </View>

        {/* HEALTH */}
        <View style={{ marginTop: 24 }} onLayout={registerSection('health')}>
          <LsSectionHead>Здоровье — ближайшие задачи</LsSectionHead>
          <TwoCol wide={wide}>
            <Col wide={wide} flex={1}>
              <LsCard onPress={go('/tasks' as Href)}>
                <LsLabel>Из таск-менеджера</LsLabel>
                {upcomingTasks.length === 0 ? (
                  <Text style={{ fontSize: 13, color: LS_MUTED }}>Нет открытых задач на 2 недели</Text>
                ) : (
                  upcomingTasks.map((t) => (
                    <Pressable
                      key={`${t.source}-${t.id}`}
                      onPress={go('/tasks' as Href)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.2)',
                        }}
                      />
                      <Text style={{ flex: 1, fontSize: 13, color: LS_TEXT }}>{t.title}</Text>
                      <Text style={{ fontSize: 9, color: LS_MUTED }}>
                        {t.dayDate ?? (t.source === 'backlog' ? 'бэклог' : '')}
                      </Text>
                    </Pressable>
                  ))
                )}
                <LsLinkRow label="Открыть задачи" onPress={go('/tasks' as Href)} />
              </LsCard>
            </Col>
            <Col wide={wide} flex={1}>
              <LsCard>
                <LsLabel>Ежедневные практики</LsLabel>
                {LIFE_SYSTEM_DAILY_PRACTICES.map((p) => (
                  <View
                    key={p.title}
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      padding: 10,
                      marginTop: 6,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(115,55,221,0.15)',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{p.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: LS_TEXT }}>{p.title}</Text>
                      <Text style={{ fontSize: 11, color: LS_MUTED }}>{p.note}</Text>
                    </View>
                  </View>
                ))}
                <LsLinkRow label="Привычки и аналитика" onPress={go('/habits' as Href)} />
              </LsCard>
            </Col>
          </TwoCol>
        </View>

        {/* LIFE RULES */}
        <View style={{ marginTop: 24, marginBottom: 32 }} onLayout={registerSection('life')}>
          <LsSectionHead>Правила жизни</LsSectionHead>
          <LsCard>
            <LsLabel>Питание и режим тела</LsLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {LIFE_SYSTEM_LIFE_RULES.map((r) => (
                <View
                  key={r.title}
                  style={{
                    flexBasis: wide ? '48%' : '100%',
                    flexGrow: 1,
                    flexDirection: 'row',
                    gap: 10,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{r.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: LS_TEXT }}>{r.title}</Text>
                    <Text style={{ fontSize: 10, color: LS_MUTED, marginTop: 2 }}>{r.note}</Text>
                  </View>
                </View>
              ))}
            </View>
          </LsCard>
          <View style={{ marginTop: 12 }}>
            <LsCard accent>
              <LsLabel dotColor={LS_ACCENT_SOFT}>Главный принцип</LsLabel>
              <Text style={{ fontSize: 16, fontWeight: '800', color: LS_TEXT, lineHeight: 24, letterSpacing: -0.3 }}>
                Амбиции — да. Масштаб — да.{'\n'}
                <Text style={{ color: LS_ACCENT_SOFT }}>Саморазрушение — нет.</Text>
              </Text>
              <Text style={{ fontSize: 13, color: LS_MUTED, marginTop: 12, lineHeight: 20, maxWidth: 560 }}>
                Цель — не меньше работать, а перестать работать в режиме войны. Система, где продуктивность и
                восстановление усиливают друг друга.
              </Text>
            </LsCard>
          </View>
        </View>
      </ScrollView>
    </ScreenCanvas>
  );
}

function clampTitle(w: number): number {
  if (w < 400) return 26;
  if (w < 700) return 32;
  return 38;
}
