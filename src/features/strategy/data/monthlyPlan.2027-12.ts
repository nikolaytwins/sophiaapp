import type { StrategyMonthlyPlanDef } from '@/features/strategy/strategyMonthlyPlanTypes';

/** Декабрь 2027 — недвижимость и празднование года. */
export const STRATEGY_MONTHLY_2027_12: StrategyMonthlyPlanDef = {
  id: '2027-12',
  tabLabel: 'Дек 2027',
  monthTitle: 'Декабрь',
  monthYear: '2027',
  monthTitleBadge: { label: 'Недвижимость' },
  monthTagline: 'Подписать договор — Юпитер в 8м доме',
  cards: [
    {
      id: 'mp-2027-12-01',
      emoji: '🔑',
      title: '4–10 декабря — подписать договор по недвижимости',
      description:
        'Юпитер соединение 8му дому — ипотека или сделка через чужие деньги. Лучшее астрологическое время за весь период 2025–2028. К этому дню нужно знать что покупаешь.',
      tag: { label: '4–10 декабря 2027', variant: 'orange' },
      accent: 'orange',
    },
    {
      id: 'mp-2027-12-02',
      emoji: '🥂',
      title: 'Отпраздновать — BMW и квартира в одном году',
      description:
        'К концу 2027 это реально. Остановиться и осознать. Красивый ужин, поездка, что-то особенное. Сатурн в 4м доме любит когда фундамент признан.',
      tag: { label: '31 декабря 2027', variant: 'slate' },
      accent: 'slate',
    },
  ],
};
