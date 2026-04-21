/** Типы плашек «фокус месяца» — вынесены, чтобы данные по месяцам не циклили импорт с `strategy.config`. */

export type StrategyMonthlyPlanTagVariant =
  | 'sky'
  | 'violet'
  | 'orange'
  | 'pink'
  | 'slate'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'teal';

export type StrategyMonthlyPlanCardAccent =
  | 'slate'
  | 'violet'
  | 'blue'
  | 'orange'
  | 'pink'
  | 'amber'
  | 'emerald'
  | 'teal';

export type StrategyMonthlyPlanCardDef = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  tag: { label: string; variant: StrategyMonthlyPlanTagVariant };
  /** Курсивная строка снизу (астро и т.п.) */
  footerItalic?: string;
  accent: StrategyMonthlyPlanCardAccent;
};

export type StrategyMonthlyPlanDef = {
  id: string;
  /** Подпись на горизонтальном табе */
  tabLabel: string;
  /** Слева в шапке блока (название месяца или полная строка вроде «Октябрь 2026 🎂»). */
  monthTitle: string;
  /** Год второй строкой мельче рядом с месяцем (как «Сентябрь» + «2026»). */
  monthYear?: string;
  /** Плашка рядом с заголовком (звёздочки + текст). */
  monthTitleBadge?: { label: string; starCount?: 1 | 2 | 3 };
  /** Справа в шапке — слоган месяца */
  monthTagline: string;
  cards: StrategyMonthlyPlanCardDef[];
};
