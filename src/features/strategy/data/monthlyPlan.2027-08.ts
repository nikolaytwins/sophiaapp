import type { StrategyMonthlyPlanDef } from '@/features/strategy/strategyMonthlyPlanTypes';

/** Август 2027 — пик месяца: BMW, публичность, сделки. */
export const STRATEGY_MONTHLY_2027_08: StrategyMonthlyPlanDef = {
  id: '2027-08',
  tabLabel: 'Авг 2027',
  monthTitle: 'Август',
  monthYear: '2027',
  monthTitleBadge: { label: 'Лучший месяц', starCount: 3 },
  monthTagline: 'BMW + всё открыто одновременно',
  cards: [
    {
      id: 'mp-2027-08-01',
      emoji: '🚗',
      title: 'Купить BMW — 8–15 августа',
      description:
        'Юпитер трин натальному Юпитеру 8 августа — 12-летний цикл удачи. Органичная покупка без страха. Именно так должна ощущаться эта машина. После — сразу поехать куда-то.',
      tag: { label: '8–15 августа 2027', variant: 'amber' },
      accent: 'amber',
    },
    {
      id: 'mp-2027-08-02',
      emoji: '🎤',
      title: '17–19 августа — выступить публично или дать интервью',
      description:
        'Венера + Солнце соединение Венеры. Ты в пике привлекательности и харизмы. Конференция, подкаст, интервью для медиа о TwinTech.',
      tag: { label: '17–20 августа 2027', variant: 'violet' },
      accent: 'violet',
    },
    {
      id: 'mp-2027-08-03',
      emoji: '💎',
      title: 'Закрыть крупнейшую сделку года',
      description: 'Лучший месяц для продаж. Готовить переговоры с июля, закрывать в августе.',
      tag: { label: 'весь август 2027', variant: 'emerald' },
      accent: 'teal',
    },
    {
      id: 'mp-2027-08-04',
      emoji: '🔮',
      title: 'Неочевидное: первая поездка на BMW — в горы или на море',
      description:
        'Марс Стрелец — свобода движения на своей машине это отдельный вид счастья. Сразу после покупки уехать на 3–4 дня. Это закрепляет новую идентичность.',
      tag: { label: 'конец августа 2027', variant: 'rose' },
      accent: 'pink',
    },
  ],
};
