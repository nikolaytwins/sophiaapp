import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { newAnnualCardId } from '@/features/goals/annualGoals.logic';
import type {
  AnnualGoalCard,
  AnnualGoalsDocument,
  AnnualSphere,
  QueuedAnnualSprintGoal,
} from '@/features/goals/annualGoals.types';

function shouldRemoveTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('москв') ||
    t.includes('агентств') ||
    t.includes('тендер') ||
    t.includes('психолог')
  );
}

function filterCards(cards: AnnualGoalCard[]): AnnualGoalCard[] {
  return cards.filter((c) => !shouldRemoveTitle(c.title));
}

function filterQueued(rows: QueuedAnnualSprintGoal[]): QueuedAnnualSprintGoal[] {
  return rows.filter((r) => !shouldRemoveTitle(r.title));
}

function hasChinaGeneral(goals: AnnualGoalCard[]): boolean {
  return goals.some((g) => g.title.toLowerCase().includes('китай'));
}

function hasCushionGeneral(goals: AnnualGoalCard[]): boolean {
  return goals.some((g) => g.title.toLowerCase().includes('подуш'));
}

function appendGeneral(doc: AnnualGoalsDocument): AnnualGoalCard[] {
  let list = [...doc.generalGoals];
  const sortBase =
    list.length === 0 ? 0 : Math.max(...list.map((g) => g.sortOrder), 0) + 1;
  let o = sortBase;
  if (!hasChinaGeneral(list)) {
    list.push({
      id: newAnnualCardId(),
      title: 'Поездка в Китай — накопить 300 000 ₽',
      sortOrder: o++,
    });
  }
  if (!hasCushionGeneral(list)) {
    list.push({
      id: newAnnualCardId(),
      title: 'Финансовая подушка — 700 000 ₽',
      sortOrder: o++,
    });
  }
  return list;
}

export function applyNikolayAnnualGoalsProfile(
  doc: AnnualGoalsDocument,
  email: string | null | undefined
): AnnualGoalsDocument {
  if (!isNikolayPrimaryAccount(email)) return doc;

  const spheres: Record<AnnualSphere, (typeof doc)['spheres'][AnnualSphere]> = { ...doc.spheres };
  (['relationships', 'energy', 'work'] as const).forEach((sp) => {
    spheres[sp] = {
      ...doc.spheres[sp],
      cards: filterCards(doc.spheres[sp].cards),
    };
  });

  const queuedBySprintSlot = { ...doc.queuedBySprintSlot };
  for (const k of ['1', '2', '3', '4'] as const) {
    queuedBySprintSlot[k] = filterQueued(doc.queuedBySprintSlot[k] ?? []);
  }

  let generalGoals = filterCards(doc.generalGoals);
  generalGoals = appendGeneral({ ...doc, generalGoals });

  return {
    ...doc,
    spheres,
    queuedBySprintSlot,
    generalGoals,
    updatedAt: new Date().toISOString(),
  };
}
