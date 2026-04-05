import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { newGoalId } from '@/features/sprint/sprint.logic';
import type { Sprint, SprintGoal } from '@/features/sprint/sprint.types';

function shouldRemoveSprintGoalTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('москв') ||
    t.includes('агентств') ||
    t.includes('тендер') ||
    t.includes('психолог')
  );
}

function hasChina(goals: SprintGoal[]): boolean {
  return goals.some((g) => g.title.toLowerCase().includes('китай'));
}

function hasCushion(goals: SprintGoal[]): boolean {
  return goals.some((g) => g.title.toLowerCase().includes('подуш'));
}

function addMissingActiveGoals(goals: SprintGoal[]): SprintGoal[] {
  const next = [...goals];
  const baseOrder = next.length === 0 ? 0 : Math.max(...next.map((g) => g.sortOrder), 0) + 1;
  let o = baseOrder;
  if (!hasChina(next)) {
    next.push({
      id: newGoalId(),
      sphere: 'work',
      title: 'Китай — накопить 300 000 ₽',
      kind: 'progress',
      target: 300_000,
      current: 0,
      habitLinks: [],
      sortOrder: o++,
    });
  }
  if (!hasCushion(next)) {
    next.push({
      id: newGoalId(),
      sphere: 'work',
      title: 'Подушка безопасности — 700 000 ₽',
      kind: 'progress',
      target: 700_000,
      current: 0,
      habitLinks: [],
      sortOrder: o++,
    });
  }
  return next;
}

export function applyNikolaySprintProfile(
  sprints: Sprint[],
  email: string | null | undefined
): Sprint[] {
  if (!isNikolayPrimaryAccount(email)) return sprints;
  return sprints.map((s) => {
    let goals = s.goals.filter((g) => !shouldRemoveSprintGoalTitle(g.title));
    if (s.status === 'active') {
      goals = addMissingActiveGoals(goals);
    }
    return { ...s, goals };
  });
}
