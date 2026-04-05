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

/** Дефолты только при пустой таблице (POST bootstrap). На проде — скрипт `scripts/sophia-habits-reset.ts`. */
export const SOPHIA_DEFAULT_HABIT_SEEDS = [
  {
    name: '3–5 действий на привлечение клиентов',
    icon: 'megaphone-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 0,
    isMain: true,
    category: 'money',
    subtitle:
      'Написал, выложил, ответил, предложил — не важно что, важно каждый день (кроме выходного можно меньше). Жми + за каждое действие.',
    trackMode: 'count',
    countMin: 3,
    countMax: 5,
  },
  {
    name: 'Сон до 01:00',
    icon: 'moon-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 1,
    isMain: true,
    category: 'body',
    subtitle: null,
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    name: 'Прогулка без цели',
    icon: 'walk-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 2,
    isMain: true,
    category: 'body',
    subtitle: 'Без цели по шагам — просто выйти.',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    name: 'Тренировка (3× в неделю)',
    icon: 'barbell-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 3,
    isMain: false,
    category: 'body',
    subtitle: 'Отмечай в дни тренировки, не каждый день.',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    name: '1 выходной в неделю',
    icon: 'umbrella-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 4,
    isMain: false,
    category: 'body',
    subtitle: 'Полноценный день без работы.',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    name: '1 яркое событие в неделю',
    icon: 'star-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 5,
    isMain: false,
    category: 'body',
    subtitle: 'Что-то запоминающееся для энергии.',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    name: 'Дневник 10–15 минут',
    icon: 'book-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 6,
    isMain: false,
    category: 'life',
    subtitle: 'Выписать всё из головы.',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    name: 'В отношениях: не «отец/спасатель»',
    icon: 'heart-outline',
    type: 'weekly',
    slotsCount: 7,
    order: 7,
    isMain: false,
    category: 'life',
    subtitle: 'Не оправдывался, не объяснялся лишний раз, не подстраивался под чужие ожидания.',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
] as const
