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

/** Сохранить ответ на вопрос дневника (поле «оправдывался? …») за день. */
export async function POST(request: NextRequest) {
  if (!authorizeSophiaHabits(request)) {
    return json(request, { error: 'Unauthorized' }, { status: 401 })
  }

  let body: { dateKey?: string; note?: string | null }
  try {
    body = await request.json()
  } catch {
    return json(request, { error: 'Invalid JSON' }, { status: 400 })
  }

  let dateKey = new Date().toISOString().slice(0, 10)
  if (body.dateKey && DATE_KEY_RE.test(body.dateKey)) {
    dateKey = body.dateKey
  }

  const note = body.note == null ? '' : String(body.note)
  const trimmed = note.trim() === '' ? null : note.trim()

  await prisma.dailyLog.upsert({
    where: { date: dateKey },
    create: {
      date: dateKey,
      selfAuditNote: trimmed,
    },
    update: {
      selfAuditNote: trimmed,
    },
  })

  const payload = await buildSophiaHabitsPayload(dateKey)
  return json(request, payload)
}
