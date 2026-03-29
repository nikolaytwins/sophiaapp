import type { TelegramPost } from '@/types/creator'

const baseDate = new Date('2026-02-01')
function dateOffset(days: number): string {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export const MOCK_TELEGRAM_POSTS: TelegramPost[] = [
  { id: 'tg1', title: 'Как я вышел на первый 100к в месяц', publishedAt: dateOffset(2), topic: 'деньги', format: 'личная история', views: 3200, reactions: 180, comments: 42, linkClicks: 89, funnelStarts: 12, subscribersGained: 28, status: 'success' },
  { id: 'tg2', title: '3 ошибки новичков в дизайне', publishedAt: dateOffset(1), topic: 'ошибки новичков', format: 'обучение', views: 2100, reactions: 95, comments: 18, linkClicks: 34, funnelStarts: 5, subscribersGained: 15, status: 'average' },
  { id: 'tg3', title: 'Почему агентства сгорают', publishedAt: dateOffset(0), topic: 'агентство', format: 'разбор ошибки', views: 4500, reactions: 210, comments: 56, linkClicks: 120, funnelStarts: 18, subscribersGained: 42, status: 'success' },
  { id: 'tg4', title: 'Фриланс vs офис: мой опыт', publishedAt: dateOffset(-1), topic: 'фриланс', format: 'личная история', views: 1800, reactions: 72, comments: 14, linkClicks: 28, funnelStarts: 4, subscribersGained: 11, status: 'average' },
  { id: 'tg5', title: 'Мотивация на понедельник', publishedAt: dateOffset(-2), topic: 'мотивация', format: 'мотивация', views: 950, reactions: 45, comments: 8, linkClicks: 12, funnelStarts: 2, subscribersGained: 5, status: 'weak' },
  { id: 'tg6', title: 'Психология переговоров с клиентом', publishedAt: dateOffset(-3), topic: 'психология', format: 'обучение', views: 2800, reactions: 134, comments: 31, linkClicks: 67, funnelStarts: 9, subscribersGained: 33, status: 'success' },
]
