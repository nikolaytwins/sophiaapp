import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeSophiaHabits, sophiaHabitsCorsHeaders, SOPHIA_DEFAULT_HABIT_SEEDS } from '@/lib/sophia-habits'
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

function resolveDateKey(request: NextRequest): string {
  const url = new URL(request.url)
  const q = url.searchParams.get('dateKey')?.trim()
  if (q && DATE_KEY_RE.test(q)) return q
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  if (!authorizeSophiaHabits(request)) {
    return json(request, { error: 'Unauthorized' }, { status: 401 })
  }

  const dateKey = resolveDateKey(request)
  const payload = await buildSophiaHabitsPayload(dateKey)

  if (payload.habits.length === 0) {
    return json(request, {
      ...payload,
      hint: 'POST this path with {"bootstrap":true} to create default habits, or add rows in habit_definitions.',
    })
  }

  return json(request, payload)
}

/** Создать дефолтные привычки, если таблица пустая. */
export async function POST(request: NextRequest) {
  if (!authorizeSophiaHabits(request)) {
    return json(request, { error: 'Unauthorized' }, { status: 401 })
  }

  let body: { bootstrap?: boolean }
  try {
    body = await request.json()
  } catch {
    return json(request, { error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.bootstrap) {
    return json(request, { error: 'Expected {"bootstrap":true}' }, { status: 400 })
  }

  const dateKey = resolveDateKey(request)
  const count = await prisma.habitDefinition.count()
  if (count > 0) {
    const payload = await buildSophiaHabitsPayload(dateKey)
    return json(request, { ok: true, seeded: false, count, ...payload })
  }

  await prisma.$transaction(
    SOPHIA_DEFAULT_HABIT_SEEDS.map((h) =>
      prisma.habitDefinition.create({
        data: {
          name: h.name,
          type: h.type,
          slotsCount: h.slotsCount,
          order: h.order,
          isMain: h.isMain,
          icon: h.icon,
          category: h.category,
          subtitle: h.subtitle,
          trackMode: h.trackMode,
          countMin: h.countMin,
          countMax: h.countMax,
        },
      })
    )
  )

  const payload = await buildSophiaHabitsPayload(dateKey)
  return json(request, { ok: true, seeded: true, ...payload })
}
