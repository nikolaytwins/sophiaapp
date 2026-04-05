import { prisma } from '@/lib/prisma'
import { computeStreak } from '@/lib/sophia-habits'
import { SOPHIA_HABITS_MANIFEST } from '@/lib/sophia-habits-manifest'

type HabitDefRow = {
  trackMode: string
  countMin: number
  countMax: number
}
type HabitCheckRow = { done: boolean; count: number }

export type SophiaHabitDto = {
  id: string
  name: string
  streak: number
  icon: string
  todayDone: boolean
  category: string | null
  subtitle: string | null
  trackMode: string
  todayCount: number
  countMin: number
  countMax: number
}

export type SophiaHabitsPayload = {
  dateKey: string
  habits: SophiaHabitDto[]
  manifest: typeof SOPHIA_HABITS_MANIFEST
  dailyReflection: {
    prompt: string
    note: string | null
  }
}

function daySuccessful(def: HabitDefRow, row: HabitCheckRow | undefined): boolean {
  if (!row) return false
  if (def.trackMode === 'count') {
    const min = def.countMin > 0 ? def.countMin : 1
    return row.count >= min
  }
  return row.done === true
}

export async function buildSophiaHabitsPayload(dateKey: string): Promise<SophiaHabitsPayload> {
  const definitions = await prisma.habitDefinition.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  const log = await prisma.dailyLog.findUnique({ where: { date: dateKey } })

  const baseManifest = SOPHIA_HABITS_MANIFEST
  const dailyReflection = {
    prompt: baseManifest.journalPrompt,
    note: log?.selfAuditNote ?? null,
  }

  if (definitions.length === 0) {
    return {
      dateKey,
      habits: [],
      manifest: baseManifest,
      dailyReflection,
    }
  }

  const ids = definitions.map((d) => d.id)
  const checkIns = await prisma.habitCheckIn.findMany({
    where: { habitDefinitionId: { in: ids } },
  })

  const byHabit = new Map<string, typeof checkIns>()
  for (const c of checkIns) {
    const list = byHabit.get(c.habitDefinitionId) ?? []
    list.push(c)
    byHabit.set(c.habitDefinitionId, list)
  }

  const habits: SophiaHabitDto[] = definitions.map((def) => {
    const rows = byHabit.get(def.id) ?? []
    const successDates = rows.filter((r) => daySuccessful(def, r)).map((r) => r.dateKey)
    const streak = computeStreak(successDates, dateKey)
    const todayRow = rows.find((r) => r.dateKey === dateKey)
    const todayCount = todayRow?.count ?? 0
    const todayDone = daySuccessful(def, todayRow)
    return {
      id: def.id,
      name: def.name,
      streak,
      icon: def.icon ?? 'ellipse-outline',
      todayDone,
      category: def.category ?? null,
      subtitle: def.subtitle ?? null,
      trackMode: def.trackMode || 'toggle',
      todayCount,
      countMin: def.countMin,
      countMax: def.countMax,
    }
  })

  return { dateKey, habits, manifest: baseManifest, dailyReflection }
}
