/**
 * Демо-данные для экрана «Финансы».
 * Twinworks / внешний API: заменить на ответ сервиса и маппинг в этот же shape.
 */
export type FinanceHeroSlide = {
  id: string;
  eyebrow: string;
  balance: number;
  income: number;
  expense: number;
};

export type FinanceBudgetCardMock = {
  id: string;
  title: string;
  subtitle: string;
  amountRight: number;
  /** Доля заполнения полосы (0–1). */
  progress01: number;
  variant: 'budget' | 'saving';
};

export const FINANCE_HERO_MOCK: FinanceHeroSlide[] = [
  {
    id: 'main',
    eyebrow: 'ТВОЙ БАЛАНС',
    balance: 171_600,
    income: 200_000,
    expense: 28_400,
  },
  {
    id: 'cards',
    eyebrow: 'НА КАРТАХ',
    balance: 98_200,
    income: 120_000,
    expense: 45_000,
  },
  {
    id: 'cash',
    eyebrow: 'НАЛИЧНЫЕ',
    balance: 12_500,
    income: 15_000,
    expense: 8_200,
  },
];

export const FINANCE_MONTHLY_BUDGET_MOCK: FinanceBudgetCardMock[] = [
  {
    id: 'budget',
    title: 'Бюджет',
    subtitle: 'Лимит 200 000 ₽',
    amountRight: 171_600,
    progress01: Math.min(1, 171_600 / 200_000),
    variant: 'budget',
  },
  {
    id: 'saving',
    title: 'Накопления',
    subtitle: 'Осталось до цели: 58 000 ₽',
    amountRight: 300_000,
    progress01: 0.32,
    variant: 'saving',
  },
];
