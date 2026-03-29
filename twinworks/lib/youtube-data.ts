import type { ContentItem, ContentStatus } from '@/types/creator'
import type { ChartDataPoint } from '@/types/creator'
import {
  getChannelId,
  fetchChannelsMine,
  fetchPlaylistItems,
  fetchVideosDetails,
  fetchDailyViews,
  fetchDailySubscribers,
  fetchVideoAnalytics,
} from './youtube-api'

export interface YoutubeChannelOverview {
  totalViews: number
  subscriberCount: number
  videoCount: number
  channelTitle: string
  channelId: string
}

export interface YoutubeOverviewStats {
  totalViews: number
  newSubscribers: number
  avgRetention: number
  avgCtr: number
  avgViewDurationSec: number
  bestVideoOfWeek: { id: string; title: string; views: number }
}

function computeStatus(views: number, allViews: number[]): ContentStatus {
  if (allViews.length === 0) return 'average'
  const sorted = [...allViews].sort((a, b) => a - b)
  const p33 = sorted[Math.floor(sorted.length / 3)] ?? 0
  const p66 = sorted[Math.floor((sorted.length * 2) / 3)] ?? 0
  if (views >= p66) return 'success'
  if (views <= p33) return 'weak'
  return 'average'
}

export async function getYoutubeChannelOverview(): Promise<YoutubeChannelOverview | null> {
  const channel = await fetchChannelsMine()
  if (!channel) return null
  return {
    totalViews: parseInt(channel.statistics.viewCount, 10) || 0,
    subscriberCount: parseInt(channel.statistics.subscriberCount, 10) || 0,
    videoCount: parseInt(channel.statistics.videoCount, 10) || 0,
    channelTitle: channel.title,
    channelId: channel.id,
  }
}

function fillDailyChart(rows: { date: string; value: number }[], days: number): ChartDataPoint[] {
  const map = new Map(rows.map((r) => [r.date, r.value]))
  const result: ChartDataPoint[] = []
  const end = new Date()
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(end)
    date.setDate(date.getDate() - d)
    const key = date.toISOString().slice(0, 10)
    result.push({ date: key, value: map.get(key) ?? 0 })
  }
  return result
}

export async function getYoutubeDailyViews(days: number = 14): Promise<ChartDataPoint[]> {
  const channelId = await getChannelId()
  if (!channelId) return []
  const rows = await fetchDailyViews(channelId, days)
  return fillDailyChart(rows, days)
}

export async function getYoutubeDailySubscribers(days: number = 14): Promise<ChartDataPoint[]> {
  const channelId = await getChannelId()
  if (!channelId) return []
  const rows = await fetchDailySubscribers(channelId, days)
  return fillDailyChart(rows, days)
}

export async function getYoutubeVideosTable(options?: {
  startDate?: string
  endDate?: string
  maxVideos?: number
}): Promise<ContentItem[]> {
  const channel = await fetchChannelsMine()
  if (!channel) return []
  const channelId = channel.id
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - 3)
  const startDate = options?.startDate ?? start.toISOString().slice(0, 10)
  const endDate = options?.endDate ?? end.toISOString().slice(0, 10)

  const allItems: { videoId: string; title: string; publishedAt: string }[] = []
  let pageToken: string | undefined
  do {
    const page = await fetchPlaylistItems(channel.uploadsPlaylistId, pageToken)
    allItems.push(...page.items)
    pageToken = page.nextPageToken
  } while (pageToken && allItems.length < (options?.maxVideos ?? 200))

  const videoIds = allItems.map((i) => i.videoId)
  const [details, analytics] = await Promise.all([
    fetchVideosDetails(videoIds),
    fetchVideoAnalytics(channelId, startDate, endDate),
  ])
  const detailsMap = new Map(details.map((d) => [d.id, d]))
  const analyticsMap = new Map(analytics.map((a) => [a.videoId, a]))

  const allViews = analytics.map((a) => a.views)
  const items: ContentItem[] = allItems.map((item) => {
    const det = detailsMap.get(item.videoId)
    const an = analyticsMap.get(item.videoId)
    const durationSec = det?.durationSec ?? 0
    const avgViewDurationSec = an?.averageViewDuration ?? 0
    const avgViewPercent =
      durationSec > 0 ? Math.round((avgViewDurationSec / durationSec) * 1000) / 10 : 0
    const views = an?.views ?? parseInt(det?.statistics.viewCount ?? '0', 10) ?? 0
    return {
      id: item.videoId,
      platform: 'youtube' as const,
      title: item.title,
      url: `https://www.youtube.com/watch?v=${item.videoId}`,
      publishedAt: item.publishedAt,
      topic: '',
      format: '',
      hook: '',
      durationSec,
      views,
      likes: an?.likes ?? parseInt(det?.statistics.likeCount ?? '0', 10) ?? 0,
      comments: an?.comments ?? parseInt(det?.statistics.commentCount ?? '0', 10) ?? 0,
      subscribersGained: an?.subscribersGained,
      avgViewDurationSec: avgViewDurationSec > 0 ? Math.round(avgViewDurationSec) : undefined,
      avgViewPercent: avgViewPercent > 0 ? avgViewPercent : undefined,
      retentionCurve: [],
      status: computeStatus(views, allViews),
    }
  })

  return items.sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : -1))
}

export async function getYoutubeOverviewStats(): Promise<YoutubeOverviewStats | null> {
  const items = await getYoutubeVideosTable({ maxVideos: 100 })
  if (items.length === 0) return null
  const totalViews = items.reduce((s, c) => s + c.views, 0)
  const newSubscribers = items.reduce((s, c) => s + (c.subscribersGained ?? 0), 0)
  const withRet = items.filter((c) => (c.avgViewPercent ?? 0) > 0)
  const avgRetention =
    withRet.length > 0
      ? withRet.reduce((s, c) => s + (c.avgViewPercent ?? 0), 0) / withRet.length
      : 0
  const withDur = items.filter((c) => (c.avgViewDurationSec ?? 0) > 0)
  const avgViewDurationSec =
    withDur.length > 0
      ? withDur.reduce((s, c) => s + (c.avgViewDurationSec ?? 0), 0) / withDur.length
      : 0
  const best = items.reduce((best, c) => (c.views > best.views ? c : best), items[0])
  return {
    totalViews,
    newSubscribers,
    avgRetention: Math.round(avgRetention * 10) / 10,
    avgCtr: 0,
    avgViewDurationSec: Math.round(avgViewDurationSec),
    bestVideoOfWeek: { id: best.id, title: best.title, views: best.views },
  }
}

export async function getYoutubeTopVideos(limit: number = 5): Promise<Array<{ id: string; title: string; views: number; retention: number }>> {
  const items = await getYoutubeVideosTable({ maxVideos: 100 })
  return items
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      title: c.title,
      views: c.views,
      retention: c.avgViewPercent ?? 0,
    }))
}

export async function getYoutubeWorstVideos(limit: number = 5): Promise<Array<{ id: string; title: string; views: number; retention: number }>> {
  const items = await getYoutubeVideosTable({ maxVideos: 100 })
  return items
    .sort((a, b) => a.views - b.views)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      title: c.title,
      views: c.views,
      retention: c.avgViewPercent ?? 0,
    }))
}

export async function getYoutubeVideoById(videoId: string): Promise<ContentItem | null> {
  const items = await getYoutubeVideosTable({ maxVideos: 200 })
  return items.find((v) => v.id === videoId) ?? null
}
