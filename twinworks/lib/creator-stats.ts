import type {
  ContentItem,
  OverviewStats,
  ChartDataPoint,
  TopContentItem,
  WeeklyPattern,
  WeeklyHypothesis,
  WeeklyInsightCard,
  ContentFilters,
  ExperimentHypothesis,
  TelegramPost,
  FunnelStats,
  ContentIdea,
} from '@/types/creator'
import { MOCK_EXPERIMENTS } from '@/data/mock-experiments'
import { MOCK_CONTENT } from '@/data/mock-content'
import { MOCK_TELEGRAM_POSTS } from '@/data/mock-telegram'
import { MOCK_FUNNEL } from '@/data/mock-funnel'
import { MOCK_IDEAS } from '@/data/mock-ideas'

export function getExperiments(): ExperimentHypothesis[] {
  return MOCK_EXPERIMENTS
}

const MS_IN_DAY = 86400000

export function getContentList(): ContentItem[] {
  return MOCK_CONTENT
}

export function getContentById(id: string): ContentItem | undefined {
  return MOCK_CONTENT.find((c) => c.id === id)
}

export function filterContent(filters: ContentFilters): ContentItem[] {
  let list = [...MOCK_CONTENT]
  if (filters.platform) {
    list = list.filter((c) => c.platform === filters.platform)
  }
  if (filters.period?.from) {
    list = list.filter((c) => c.publishedAt >= filters.period!.from)
  }
  if (filters.period?.to) {
    list = list.filter((c) => c.publishedAt <= filters.period!.to)
  }
  if (filters.topic) {
    list = list.filter((c) => c.topic === filters.topic)
  }
  if (filters.format) {
    list = list.filter((c) => c.format === filters.format)
  }
  return list
}

export function getYouTubeContent(filters?: Omit<ContentFilters, 'platform'>): ContentItem[] {
  return filterContent({ ...filters, platform: 'youtube' })
}

export function getReelsContent(filters?: Omit<ContentFilters, 'platform'>): ContentItem[] {
  return filterContent({ ...filters, platform: 'instagram' })
}

export function getWorstContent(limit: number = 5, content: ContentItem[] = MOCK_CONTENT): TopContentItem[] {
  return [...content]
    .sort((a, b) => a.views - b.views)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      views: c.views,
      retention: c.avgViewPercent ?? 0,
      status: c.status,
    }))
}

export function getOverviewStats(content: ContentItem[] = MOCK_CONTENT): OverviewStats {
  const totalViews = content.reduce((s, c) => s + c.views, 0)
  const newSubscribers = content.reduce((s, c) => s + (c.subscribersGained ?? 0), 0)
  const withRetention = content.filter((c) => c.avgViewPercent != null)
  const avgRetention =
    withRetention.length > 0
      ? withRetention.reduce((s, c) => s + (c.avgViewPercent ?? 0), 0) / withRetention.length
      : 0
  const withCtr = content.filter((c) => c.ctr != null)
  const avgCtr = withCtr.length > 0 ? withCtr.reduce((s, c) => s + (c.ctr ?? 0), 0) / withCtr.length : 0
  const weekAgo = new Date(Date.now() - 7 * MS_IN_DAY).toISOString().split('T')[0]
  const lastWeek = content.filter((c) => c.publishedAt >= weekAgo)
  const bestVideoOfWeek =
    lastWeek.length > 0
      ? lastWeek.reduce((best, c) => (c.views > best.views ? c : best), lastWeek[0])
      : content.reduce((best, c) => (c.views > best.views ? c : best), content[0])
  return {
    totalViews,
    newSubscribers,
    avgRetention: Math.round(avgRetention * 10) / 10,
    avgCtr: Math.round(avgCtr * 10) / 10,
    bestVideoOfWeek: {
      id: bestVideoOfWeek.id,
      title: bestVideoOfWeek.title,
      views: bestVideoOfWeek.views,
    },
  }
}

export function getViewsChartData(days: number = 14, content: ContentItem[] = MOCK_CONTENT): ChartDataPoint[] {
  const points: Record<string, number> = {}
  const end = new Date()
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(end)
    date.setDate(date.getDate() - d)
    const key = date.toISOString().split('T')[0]
    points[key] = 0
  }
  content.forEach((c) => {
    const key = c.publishedAt
    if (points[key] !== undefined) points[key] += c.views
  })
  return Object.entries(points)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

export function getSubscribersChartData(days: number = 14, content: ContentItem[] = MOCK_CONTENT): ChartDataPoint[] {
  const points: Record<string, number> = {}
  const end = new Date()
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(end)
    date.setDate(date.getDate() - d)
    const key = date.toISOString().split('T')[0]
    points[key] = 0
  }
  content.filter((c) => c.subscribersGained != null).forEach((c) => {
    const key = c.publishedAt
    if (points[key] !== undefined) points[key] += c.subscribersGained!
  })
  return Object.entries(points)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

export function getTopContent(limit: number = 5, content: ContentItem[] = MOCK_CONTENT): TopContentItem[] {
  return [...content]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      views: c.views,
      retention: c.avgViewPercent ?? 0,
      status: c.status,
    }))
}

export function getWeeklyPatterns(content: ContentItem[] = MOCK_CONTENT): WeeklyPattern[] {
  const weekAgo = new Date(Date.now() - 7 * MS_IN_DAY).toISOString().split('T')[0]
  const week = content.filter((c) => c.publishedAt >= weekAgo)
  const byTopic = week.reduce((acc, c) => {
    acc[c.topic] = (acc[c.topic] || 0) + c.views
    return acc
  }, {} as Record<string, number>)
  const topTopic = Object.entries(byTopic).sort(([, a], [, b]) => b - a)[0]
  const byFormat = week.reduce((acc, c) => {
    acc[c.format] = (acc[c.format] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  return [
    { id: 'p1', title: 'Топ-тема недели', description: topTopic ? `${topTopic[0]} (${(topTopic[1] / 1000).toFixed(1)}k просмотров)` : 'Нет данных', metric: 'views' },
    { id: 'p2', title: 'Частый формат', description: Object.entries(byFormat).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—' },
    { id: 'p3', title: 'Лучший хук по retention', description: week.filter((c) => (c.avgViewPercent ?? 0) >= 60).sort((a, b) => (b.avgViewPercent ?? 0) - (a.avgViewPercent ?? 0))[0]?.hook ?? '—' },
  ]
}

export function getWeeklyHypotheses(content: ContentItem[] = MOCK_CONTENT): WeeklyHypothesis[] {
  return [
    { id: 'h1', text: 'Короткие хуки (до 2 сек) дают выше retention', confidence: 'high' },
    { id: 'h2', text: 'Цифры в заголовке улучшают CTR', confidence: 'medium' },
    { id: 'h3', text: 'Личная история даёт больше подписчиков', confidence: 'high' },
    { id: 'h4', text: 'Провокационный вход усиливает досмотр', confidence: 'medium' },
  ]
}

export function getWeeklyInsights(content: ContentItem[] = MOCK_CONTENT): WeeklyInsightCard[] {
  const weekAgo = new Date(Date.now() - 7 * MS_IN_DAY).toISOString().split('T')[0]
  const week = content.filter((c) => c.publishedAt >= weekAgo)
  const best = week.sort((a, b) => b.views - a.views)[0]
  const byTopic = week.reduce((acc, c) => {
    acc[c.topic] = (acc[c.topic] || 0) + c.views
    return acc
  }, {} as Record<string, number>)
  const topTopics = Object.entries(byTopic).sort(([, a], [, b]) => b - a).slice(0, 3).map(([t]) => t)
  const highRetentionHooks = [...new Set(week.filter((c) => (c.avgViewPercent ?? 0) >= 65).map((c) => c.hook))].slice(0, 3)
  const byFormatSubs = week.filter((c) => c.subscribersGained != null).reduce((acc, c) => {
    acc[c.format] = (acc[c.format] || 0) + (c.subscribersGained ?? 0)
    return acc
  }, {} as Record<string, number>)
  const bestFormatSubs = Object.entries(byFormatSubs).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—'
  const weak = week.filter((c) => c.status === 'weak')
  return [
    { id: 'i1', title: 'Что зашло лучше всего', items: best ? [best.title, `${(best.views / 1000).toFixed(1)}k просмотров`, `Retention ${best.avgViewPercent ?? 0}%`] : ['Нет данных'], source: 'aggregate' },
    { id: 'i2', title: 'Какие темы лучше работают', items: topTopics.length ? topTopics : ['Нет данных'], source: 'aggregate' },
    { id: 'i3', title: 'Хуки с высоким retention', items: highRetentionHooks.length ? highRetentionHooks : ['Нет данных'], source: 'aggregate' },
    { id: 'i4', title: 'Форматы с большим приростом подписчиков', items: [bestFormatSubs], source: 'aggregate' },
    { id: 'i5', title: 'Где просадка', items: weak.length ? weak.map((c) => c.title).slice(0, 3) : ['Нет просадок'], source: 'aggregate' },
    { id: 'i6', title: '3 рекомендации на следующую неделю', items: ['Сделать 2 ролика с личной историей', 'Протестировать хук с цифрой в первых 2 сек', 'Укоротить длинные видео до 5–6 мин'], source: 'ai' },
  ]
}

export function getContentIdeas(content: ContentItem[] = MOCK_CONTENT): string[] {
  const topics = [...new Set(content.map((c) => c.topic))]
  const formats = [...new Set(content.map((c) => c.format))]
  return [
    `Продолжить тему «${topics[0]}» в формате кейса`,
    `Личная история про ${topics[1]}`,
    `Разбор ошибки: ${formats[2]} для новичков`,
    `Провокация на тему ${topics[3]}`,
    `Реалити: день в работе над ${topics[0]}`,
  ]
}

export function getTelegramPosts(): TelegramPost[] {
  return MOCK_TELEGRAM_POSTS
}

export function getTelegramViewsChartData(days: number = 14): ChartDataPoint[] {
  const points: Record<string, number> = {}
  const end = new Date()
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(end)
    date.setDate(date.getDate() - d)
    const key = date.toISOString().split('T')[0]
    points[key] = 0
  }
  MOCK_TELEGRAM_POSTS.forEach((p) => {
    if (points[p.publishedAt] !== undefined) points[p.publishedAt] += p.views
  })
  return Object.entries(points)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

export function getTelegramSubscribersChartData(days: number = 14): ChartDataPoint[] {
  const points: Record<string, number> = {}
  const end = new Date()
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(end)
    date.setDate(date.getDate() - d)
    const key = date.toISOString().split('T')[0]
    points[key] = 0
  }
  MOCK_TELEGRAM_POSTS.forEach((p) => {
    if (p.subscribersGained != null && points[p.publishedAt] !== undefined) points[p.publishedAt] += p.subscribersGained
  })
  return Object.entries(points)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

export function getFunnelStats(): FunnelStats {
  return MOCK_FUNNEL
}

export function getContentIdeasList(): ContentIdea[] {
  return MOCK_IDEAS
}
