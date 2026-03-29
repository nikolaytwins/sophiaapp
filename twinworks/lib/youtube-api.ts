import { getValidAccessToken } from './youtube-oauth'
import { getYoutubeTokens } from './youtube-tokens'

async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken()
  if (!token) throw new Error('YouTube not connected')
  return fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
}

export async function getChannelId(): Promise<string | null> {
  const tokens = await getYoutubeTokens()
  return tokens?.channelId ?? null
}

export async function fetchChannelsMine(): Promise<{
  id: string
  title: string
  statistics: { viewCount: string; subscriberCount: string; videoCount: string }
  uploadsPlaylistId: string
} | null> {
  const res = await apiFetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true'
  )
  if (!res.ok) return null
  const data = (await res.json()) as {
    items?: Array<{
      id: string
      snippet: { title: string }
      statistics: { viewCount: string; subscriberCount: string; videoCount: string }
      contentDetails: { relatedPlaylists: { uploads: string } }
    }>
  }
  const ch = data.items?.[0]
  if (!ch) return null
  return {
    id: ch.id,
    title: ch.snippet.title,
    statistics: ch.statistics,
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
  }
}

export async function fetchPlaylistItems(
  playlistId: string,
  pageToken?: string
): Promise<{
  items: { videoId: string; title: string; publishedAt: string }[]
  nextPageToken?: string
}> {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: '50',
  })
  if (pageToken) params.set('pageToken', pageToken)
  const res = await apiFetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?${params}`
  )
  if (!res.ok) throw new Error(`Playlist items failed: ${res.status}`)
  const data = (await res.json()) as {
    items?: Array<{
      snippet: {
        resourceId: { videoId: string }
        title: string
        publishedAt: string
      }
    }>,
    nextPageToken?: string
  }
  const items = (data.items ?? []).map((i) => ({
    videoId: i.snippet.resourceId.videoId,
    title: i.snippet.title,
    publishedAt: i.snippet.publishedAt.slice(0, 10),
  }))
  return { items, nextPageToken: data.nextPageToken }
}

export async function fetchVideosDetails(
  videoIds: string[]
): Promise<
  Array<{
    id: string
    durationSec: number
    statistics: { viewCount: string; likeCount: string; commentCount: string }
  }>
> {
  if (videoIds.length === 0) return []
  const ids = videoIds.slice(0, 50).join(',')
  const res = await apiFetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}`
  )
  if (!res.ok) return []
  const data = (await res.json()) as {
    items?: Array<{
      id: string
      contentDetails: { duration: string }
      statistics: { viewCount: string; likeCount: string; commentCount: string }
    }>
  }
  const parseDuration = (iso: string): number => {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const h = parseInt(match[1] ?? '0', 10)
    const m = parseInt(match[2] ?? '0', 10)
    const s = parseInt(match[3] ?? '0', 10)
    return h * 3600 + m * 60 + s
  }
  return (data.items ?? []).map((i) => ({
    id: i.id,
    durationSec: parseDuration(i.contentDetails.duration),
    statistics: i.statistics,
  }))
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function fetchAnalyticsReport(params: {
  channelId: string
  startDate: string
  endDate: string
  dimensions: string
  metrics: string
  sort?: string
}): Promise<{ rows?: (string | number)[][]; columnHeaders?: { name: string }[] }> {
  const q = new URLSearchParams({
    ids: `channel==${params.channelId}`,
    startDate: params.startDate,
    endDate: params.endDate,
    dimensions: params.dimensions,
    metrics: params.metrics,
  })
  if (params.sort) q.set('sort', params.sort)
  const res = await apiFetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${q}`
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Analytics API: ${res.status} ${err}`)
  }
  const data = (await res.json()) as {
    rows?: (string | number)[][]
    columnHeaders?: { name: string }[]
  }
  return data
}

export async function fetchDailyViews(channelId: string, days: number): Promise<{ date: string; value: number }[]> {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  const report = await fetchAnalyticsReport({
    channelId,
    startDate: formatDate(start),
    endDate: formatDate(end),
    dimensions: 'day',
    metrics: 'views',
  })
  const rows = report.rows ?? []
  const colIndex = report.columnHeaders?.findIndex((h) => h.name === 'day') ?? 0
  const valIndex = report.columnHeaders?.findIndex((h) => h.name === 'views') ?? 1
  return rows.map((r) => ({
    date: String(r[colIndex]),
    value: Number(r[valIndex] ?? 0),
  }))
}

export async function fetchDailySubscribers(channelId: string, days: number): Promise<{ date: string; value: number }[]> {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  const report = await fetchAnalyticsReport({
    channelId,
    startDate: formatDate(start),
    endDate: formatDate(end),
    dimensions: 'day',
    metrics: 'subscribersGained',
  })
  const rows = report.rows ?? []
  const colIndex = report.columnHeaders?.findIndex((h) => h.name === 'day') ?? 0
  const valIndex = report.columnHeaders?.findIndex((h) => h.name === 'subscribersGained') ?? 1
  return rows.map((r) => ({
    date: String(r[colIndex]),
    value: Number(r[valIndex] ?? 0),
  }))
}

export async function fetchVideoAnalytics(
  channelId: string,
  startDate: string,
  endDate: string
): Promise<
  Array<{
    videoId: string
    views: number
    estimatedMinutesWatched: number
    averageViewDuration: number
    subscribersGained: number
    likes: number
    comments: number
  }>
> {
  const report = await fetchAnalyticsReport({
    channelId,
    startDate,
    endDate,
    dimensions: 'video',
    metrics:
      'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,likes,comments',
    sort: '-views',
  })
  const rows = report.rows ?? []
  const headers = report.columnHeaders ?? []
  const idx = (name: string) => headers.findIndex((h) => h.name === name)
  const videoIdI = idx('video') >= 0 ? idx('video') : 0
  const viewsI = idx('views') >= 0 ? idx('views') : 1
  const minI = idx('estimatedMinutesWatched') >= 0 ? idx('estimatedMinutesWatched') : 2
  const avgI = idx('averageViewDuration') >= 0 ? idx('averageViewDuration') : 3
  const subsI = idx('subscribersGained') >= 0 ? idx('subscribersGained') : 4
  const likesI = idx('likes') >= 0 ? idx('likes') : 5
  const commentsI = idx('comments') >= 0 ? idx('comments') : 6
  return rows.map((r) => ({
    videoId: String(r[videoIdI] ?? ''),
    views: Number(r[viewsI] ?? 0),
    estimatedMinutesWatched: Number(r[minI] ?? 0),
    averageViewDuration: Number(r[avgI] ?? 0),
    subscribersGained: Number(r[subsI] ?? 0),
    likes: Number(r[likesI] ?? 0),
    comments: Number(r[commentsI] ?? 0),
  }))
}
