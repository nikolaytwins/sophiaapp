import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeSophiaHabits, sophiaHabitsCorsHeaders } from '@/lib/sophia-habits'

export const dynamic = 'force-dynamic'

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

/** Полный снимок для анализа (GPT и т.д.). Только чтение, без DELETE. */
export async function GET(request: NextRequest) {
  if (!authorizeSophiaHabits(request)) {
    return json(request, { error: 'Unauthorized' }, { status: 401 })
  }

  const definitions = await prisma.habitDefinition.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
  const checkIns = await prisma.habitCheckIn.findMany({
    orderBy: [{ dateKey: 'asc' }, { habitDefinitionId: 'asc' }],
  })

  return json(request, {
    exportedAt: new Date().toISOString(),
    habitDefinitions: definitions,
    habitCheckIns: checkIns,
  })
}
