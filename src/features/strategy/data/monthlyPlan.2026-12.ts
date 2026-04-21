import type { StrategyMonthlyPlanDef } from '@/features/strategy/strategyMonthlyPlanTypes';

/** Декабрь 2026 — горы и итоги года. */
export const STRATEGY_MONTHLY_2026_12: StrategyMonthlyPlanDef = {
  id: '2026-12',
  tabLabel: 'Дек 2026',
  monthTitle: 'Декабрь',
  monthYear: '2026',
  monthTagline: 'Горы одному — закрыть год',
  cards: [
    {
      id: 'mp-2026-12-01',
      emoji: '🏔️',
      title: 'Горы — Красная Поляна или Домбай',
      description:
        '4–5 дней одному. Снег, тишина, никаких созвонов. Сатурн снова давит 10 декабря — тело просит уединения. Это не слабость, это правильная перезарядка.',
      tag: { label: '12–18 декабря', variant: 'emerald' },
      accent: 'emerald',
    },
    {
      id: 'mp-2026-12-02',
      emoji: '📔',
      title: 'Итоги года + 3 главные цели на 2027',
      description:
        'В горах или после. Что сделал, что стало другим. BMW, недвижимость, 500к/мес — три вектора на 2027. В Sofiю занести.',
      tag: { label: '25–31 декабря', variant: 'slate' },
      accent: 'slate',
    },
  ],
};
