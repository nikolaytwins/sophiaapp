import type { StrategyMonthlyPlanDef } from '@/features/strategy/strategyMonthlyPlanTypes';

/** Июль 2027 — Юпитер на Венере, путешествие и близость. */
export const STRATEGY_MONTHLY_2027_07: StrategyMonthlyPlanDef = {
  id: '2027-07',
  tabLabel: 'Июль 2027',
  monthTitle: 'Июль',
  monthYear: '2027',
  monthTitleBadge: { label: 'Юп на Венере' },
  monthTagline: 'Глубокий опыт близости или путешествие',
  cards: [
    {
      id: 'mp-2027-07-01',
      emoji: '🌊',
      title: 'Путешествие — море за границей',
      description:
        'Юпитер соединение натальной Венеры 4 июля. Греция, Черногория, Мальдивы — что по деньгам. Венера Лев хочет красоты и роскоши. С кем-то близким или один если отношения изменились.',
      tag: { label: '1–15 июля 2027', variant: 'emerald' },
      accent: 'emerald',
    },
    {
      id: 'mp-2027-07-02',
      emoji: '🔥',
      title: '4–10 июля — глубокий опыт близости',
      description:
        'Юпитер на Венере в 8м доме. Второй большой пик по сексуальности после ноября 2026. Если к тому времени договорились с Лерой — реализовать. Если нет — открытость к тому что придёт.',
      tag: { label: '4–10 июля 2027', variant: 'rose' },
      accent: 'pink',
    },
  ],
};
