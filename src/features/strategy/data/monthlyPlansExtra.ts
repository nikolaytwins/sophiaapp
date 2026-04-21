import type { StrategyMonthlyPlanDef } from '@/features/strategy/strategyMonthlyPlanTypes';

import { STRATEGY_MONTHLY_2026_12 } from '@/features/strategy/data/monthlyPlan.2026-12';
import { STRATEGY_MONTHLY_2027_H1 } from '@/features/strategy/data/monthlyPlan.2027-h1';
import { STRATEGY_MONTHLY_2027_02 } from '@/features/strategy/data/monthlyPlan.2027-02';
import { STRATEGY_MONTHLY_2027_07 } from '@/features/strategy/data/monthlyPlan.2027-07';
import { STRATEGY_MONTHLY_2027_08 } from '@/features/strategy/data/monthlyPlan.2027-08';
import { STRATEGY_MONTHLY_2027_12 } from '@/features/strategy/data/monthlyPlan.2027-12';

/** Месяцы из контент-плана (декабрь 2026 — декабрь 2027), подключаются к `strategyData.monthlyPlans`. */
export const EXTRA_STRATEGY_MONTHLY_PLANS: StrategyMonthlyPlanDef[] = [
  STRATEGY_MONTHLY_2026_12,
  STRATEGY_MONTHLY_2027_H1,
  STRATEGY_MONTHLY_2027_02,
  STRATEGY_MONTHLY_2027_07,
  STRATEGY_MONTHLY_2027_08,
  STRATEGY_MONTHLY_2027_12,
];
