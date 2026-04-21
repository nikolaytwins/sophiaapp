import type { StrategyMonthlyPlanDef } from '@/features/strategy/strategyMonthlyPlanTypes';

/** Февраль 2027 — открытость к переезду и неожиданным сценариям. */
export const STRATEGY_MONTHLY_2027_02: StrategyMonthlyPlanDef = {
  id: '2027-02',
  tabLabel: 'Фев 2027',
  monthTitle: 'Февраль',
  monthYear: '2027',
  monthTagline: 'Открытость к смене базы и неожиданным поворотам',
  cards: [
    {
      id: 'mp-2027-02-01',
      emoji: '📦',
      title: 'Быть открытым к возможному переезду, предложению и т.д.',
      description:
        'Может быть: неожиданное предложение, обстоятельства которые вынуждают, или внезапно появляется идеальный вариант. Не резать сценарии заранее — собрать факты, посмотреть цифры и решить без паники.',
      tag: { label: 'февраль 2027', variant: 'sky' },
      accent: 'slate',
    },
  ],
};
