import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeSophiaHabits, sophiaHabitsCorsHeaders } from '@/lib/sophia-habits'
import { buildSophiaHabitsPayload } from '@/lib/sophia-habits-payload'

export const dynamic = 'force-dynamic'

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function json(request: NextRequest, data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  const cors = sophiaHabitsCorsHeaders(request)
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v)
  }
  return NextResponse.json(data, { ...init, headers })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: sophiaHabitsCorsHeaders(request) })
}

type ToggleBody = {
  dateKey?: string
  /** Для trackMode=count: задать счётчик явно */
  setCount?: number
  /** Для trackMode=count: шаг +1 / −1 */
  bump?: 1 | -1
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ habitId: string }> }
) {
  if (!authorizeSophiaHabits(request)) {
    return json(request, { error: 'Unauthorized' }, { status: 401 })
  }

  const { habitId } = await ctx.params
  if (!habitId) {
    return json(request, { error: 'Missing habitId' }, { status: 400 })
  }

  let dateKey = new Date().toISOString().slice(0, 10)
  let body: ToggleBody = {}
  try {
    body = (await request.json()) as ToggleBody
    if (body?.dateKey && typeof body.dateKey === 'string' && DATE_KEY_RE.test(body.dateKey)) {
      dateKey = body.dateKey
    }
  } catch {
    /* body optional */
  }

  const def = await prisma.habitDefinition.findUnique({ where: { id: habitId } })
  if (!def) {
    return json(request, { error: 'Habit not found' }, { status: 404 })
  }

  const existing = await prisma.habitCheckIn.findUnique({
    where: {
      habitDefinitionId_dateKey: { habitDefinitionId: habitId, dateKey },
    },
  })

  const maxC = def.countMax > 0 ? def.countMax : 5
  const minC = def.countMin > 0 ? def.countMin : 3

  if (def.trackMode === 'count') {
    let nextCount = existing?.count ?? 0
    if (typeof body.setCount === 'number' && Number.isFinite(body.setCount)) {
      nextCount = clamp(Math.round(body.setCount), 0, maxC)
    } else if (body.bump === 1) {
      nextCount = clamp(nextCount + 1, 0, maxC)
    } else if (body.bump === -1) {
      nextCount = clamp(nextCount - 1, 0, maxC)
    } else {
      nextCount = clamp(nextCount + 1, 0, maxC)
    }
    const nextDone = nextCount >= minC
    await prisma.habitCheckIn.upsert({
      where: {
        habitDefinitionId_dateKey: { habitDefinitionId: habitId, dateKey },
      },
      create: {
        habitDefinitionId: habitId,
        dateKey,
        done: nextDone,
        count: nextCount,
      },
      update: {
        count: nextCount,
        done: nextDone,
      },
    })
  } else {
    const nextDone = !existing?.done
    await prisma.habitCheckIn.upsert({
      where: {
        habitDefinitionId_dateKey: { habitDefinitionId: habitId, dateKey },
      },
      create: {
        habitDefinitionId: habitId,
        dateKey,
        done: nextDone,
        count: 0,
      },
      update: {
        done: nextDone,
        count: 0,
      },
    })
  }

  const payload = await buildSophiaHabitsPayload(dateKey)
  return json(request, payload)
}
