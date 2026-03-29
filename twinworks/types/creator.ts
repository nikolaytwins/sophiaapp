export type Platform = 'youtube' | 'instagram'

export type ContentStatus = 'success' | 'average' | 'weak'

export interface ContentItem {
  id: string
  platform: Platform
  title: string
  url: string
  publishedAt: string
  topic: string
  format: string
  hook: string
  durationSec: number
  views: number
  impressions?: number
  ctr?: number
  avgViewDurationSec?: number
  avgViewPercent?: number
  likes: number
  comments: number
  saves?: number
  shares?: number
  subscribersGained?: number
  retentionCurve: number[]
  status: ContentStatus
  aiSummary?: string
  strengths?: string[]
  weaknesses?: string[]
  nextTest?: string[]
}

export interface OverviewStats {
  totalViews: number
  newSubscribers: number
  avgRetention: number
  avgCtr: number
  bestVideoOfWeek: { id: string; title: string; views: number }
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface TopContentItem {
  id: string
  title: string
  platform: Platform
  views: number
  retention: number
  status: ContentStatus
}

export interface WeeklyPattern {
  id: string
  title: string
  description: string
  metric?: string
}

export interface WeeklyHypothesis {
  id: string
  text: string
  confidence: 'high' | 'medium' | 'low'
}

export interface WeeklyInsightCard {
  id: string
  title: string
  items: string[]
  source?: 'ai' | 'aggregate'
}

export interface ExperimentHypothesis {
  id: string
  name: string
  whatWeTest: string
  videosTested: number
  result: string
  status: 'validated' | 'in_progress' | 'rejected'
}

export interface ContentFilters {
  platform?: Platform | ''
  period?: { from: string; to: string }
  topic?: string
  format?: string
}

// Telegram
export interface TelegramPost {
  id: string
  title: string
  publishedAt: string
  topic: string
  format: string
  views: number
  reactions: number
  comments: number
  linkClicks: number
  funnelStarts: number
  subscribersGained?: number
  status: ContentStatus
}

// Воронка
export interface FunnelStats {
  totalStarts: number
  todayStarts: number
  weekStarts: number
  leads: number
  calls: number
  sales: number
  byDay: { date: string; starts: number; leads: number; calls: number; sales: number }[]
}

// Идеи контента
export type IdeaStatus = 'idea' | 'in_progress' | 'shot' | 'published' | 'postponed'
export type IdeaPriority = 'high' | 'medium' | 'low'

export interface ContentIdea {
  id: string
  name: string
  platform: 'youtube' | 'instagram' | 'telegram'
  topic: string
  format: string
  hook: string
  status: IdeaStatus
  priority: IdeaPriority
  notes: string
  createdAt: string
}
