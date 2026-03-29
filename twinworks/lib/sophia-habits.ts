import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'tw_site_auth'

export function getSophiaHabitsAuthToken(): string {
  return process.env.TW_SITE_AUTH_TOKEN ?? 'twinworks-secret-please-change'
}

/** Cookie (после логина в Twinworks) или Bearer с тем же значением, что TW_SITE_AUTH_TOKEN. */
export function authorizeSophiaHabits(request: NextRequest): boolean {
  const expected = getSophiaHabitsAuthToken()
  const cookie = request.cookies.get(AUTH_COOKIE)?.value
  if (cookie === expected) return true
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim()
  if (bearer === expected) return true
  return false
}

export function sophiaHabitsCorsHeaders(request: NextRequest): Record<string, string> {
  const configured = process.env.SOPHIA_HABITS_CORS_ORIGIN?.trim()
  const origin = request.headers.get('origin')
  const allow =
    configured ||
    (origin && process.env.NODE_ENV !== 'production' ? origin : '')
  if (!allow) return {}
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
}

export function prevDateKey(dateKey: string): string {
  const dt = new Date(`${dateKey}T12:00:00.000Z`)
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

/** Подряд идущие дни с done, считая от anchor (включительно). Если anchor не отмечен — 0. */
export function computeStreak(doneDateKeys: Iterable<string>, anchor: string): number {
  const set = new Set(doneDateKeys)
  let n = 0
  let d = anchor
  while (set.has(d)) {
    n += 1
    d = prevDateKey(d)
  }
  return n
}

export const SOPHIA_DEFAULT_HABIT_SEEDS = [
  {
    name: 'Утро без телефона 30 мин',
    icon: 'phone-portrait-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 0,
    isMain: true,
  },
  {
    name: '10k шагов',
    icon: 'walk-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 1,
    isMain: true,
  },
  {
    name: 'Вода 2.2л',
    icon: 'water-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 2,
    isMain: false,
  },
  {
    name: 'Силовая 45 мин',
    icon: 'barbell-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 3,
    isMain: false,
  },
] as const
