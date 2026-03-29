import type { FunnelStats } from '@/types/creator'

function dayOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export const MOCK_FUNNEL: FunnelStats = {
  totalStarts: 1247,
  todayStarts: 23,
  weekStarts: 156,
  leads: 89,
  calls: 34,
  sales: 12,
  byDay: [
    { date: dayOffset(6), starts: 18, leads: 10, calls: 4, sales: 1 },
    { date: dayOffset(5), starts: 22, leads: 12, calls: 5, sales: 2 },
    { date: dayOffset(4), starts: 25, leads: 14, calls: 6, sales: 2 },
    { date: dayOffset(3), starts: 20, leads: 11, calls: 4, sales: 1 },
    { date: dayOffset(2), starts: 28, leads: 15, calls: 5, sales: 2 },
    { date: dayOffset(1), starts: 21, leads: 13, calls: 5, sales: 2 },
    { date: dayOffset(0), starts: 23, leads: 14, calls: 5, sales: 2 },
  ],
}
