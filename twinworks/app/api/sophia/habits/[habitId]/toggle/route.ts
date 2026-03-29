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
  try {
    const body = await request.json()
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

  const nextDone = !existing?.done

  await prisma.habitCheckIn.upsert({
    where: {
      habitDefinitionId_dateKey: { habitDefinitionId: habitId, dateKey },
    },
    create: {
      habitDefinitionId: habitId,
      dateKey,
      done: true,
    },
    update: {
      done: nextDone,
    },
  })

  const payload = await buildSophiaHabitsPayload(dateKey)
  return json(request, payload)
}
