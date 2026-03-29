import { prisma } from '@/lib/prisma'
import { computeStreak } from '@/lib/sophia-habits'

export type SophiaHabitDto = {
  id: string
  name: string
  streak: number
  icon: string
  todayDone: boolean
}

export async function buildSophiaHabitsPayload(dateKey: string): Promise<{
  dateKey: string
  habits: SophiaHabitDto[]
}> {
  const definitions = await prisma.habitDefinition.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  if (definitions.length === 0) {
    return { dateKey, habits: [] }
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
    const doneDates = rows.filter((r) => r.done).map((r) => r.dateKey)
    const todayRow = rows.find((r) => r.dateKey === dateKey)
    const todayDone = todayRow?.done === true
    const streak = computeStreak(doneDates, dateKey)
    return {
      id: def.id,
      name: def.name,
      streak,
      icon: def.icon ?? 'ellipse-outline',
      todayDone,
    }
  })

  return { dateKey, habits }
}
