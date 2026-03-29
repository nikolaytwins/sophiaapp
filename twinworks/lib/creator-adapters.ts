import type { ContentItem, ContentFilters } from '@/types/creator'

/**
 * Data source abstraction. Replace with YouTube API / Instagram Graph API / PostgreSQL.
 * For now returns mock data; later: fetch from API and transform to ContentItem[].
 */
export async function fetchContentList(_filters?: ContentFilters): Promise<ContentItem[]> {
  const { getContentList, filterContent } = await import('./creator-stats')
  const list = getContentList()
  return _filters ? filterContent(_filters) : list
}

/**
 * Single item by id. Later: GET /api/content/:id or DB query.
 */
export async function fetchContentById(id: string): Promise<ContentItem | null> {
  const { getContentById } = await import('./creator-stats')
  return getContentById(id) ?? null
}

/**
 * Placeholder: YouTube Analytics API → transform to ContentItem[].
 * See https://developers.google.com/youtube/analytics
 */
export function transformYouTubeAnalyticsToContent(_raw: unknown): ContentItem[] {
  return []
}

/**
 * Placeholder: Instagram Graph API → transform to ContentItem[].
 * See https://developers.facebook.com/docs/instagram-api
 */
export function transformInstagramInsightsToContent(_raw: unknown): ContentItem[] {
  return []
}

/**
 * Placeholder: AI/OpenClaw insights for weekly recommendations.
 * Returns structured insights that can be rendered in Weekly Insights block.
 */
export async function fetchWeeklyInsightsFromAI(_contentIds?: string[]): Promise<{ title: string; items: string[] }[]> {
  return []
}
