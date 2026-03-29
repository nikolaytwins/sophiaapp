'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { MetricCard } from '@/components/creator/MetricCard'
import { ViewsChart } from '@/components/creator/ViewsChart'
import { SubscribersChart } from '@/components/creator/SubscribersChart'
import type { ContentItem } from '@/types/creator'

const STATUS_LABEL = { success: 'Успешный', average: 'Средний', weak: 'Слабый' }

type OverviewState = {
  stats: {
    totalViews: number
    newSubscribers: number
    avgRetention: number
    avgCtr: number
    avgViewDurationSec: number
    bestVideoOfWeek: { id: string; title: string; views: number }
  }
  channel?: { channelTitle: string }
} | null

export default function CreatorYouTubePage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [overview, setOverview] = useState<OverviewState>(null)
  const [viewsChart, setViewsChart] = useState<{ date: string; value: number }[]>([])
  const [subscribersChart, setSubscribersChart] = useState<{ date: string; value: number }[]>([])
  const [videos, setVideos] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')

  const fetchData = async () => {
    setError(null)
    try {
      const [statusRes, overviewRes, viewsRes, subsRes, videosRes] = await Promise.all([
        fetch('/api/youtube/status'),
        fetch('/api/youtube/overview'),
        fetch('/api/youtube/charts/views?days=14'),
        fetch('/api/youtube/charts/subscribers?days=14'),
        fetch('/api/youtube/videos'),
      ])
      const status = await statusRes.json()
      setConnected(!!status.connected)
      if (!status.connected) {
        setLoading(false)
        return
      }
      if (!overviewRes.ok) throw new Error('Не удалось загрузить обзор')
      const overviewData = await overviewRes.json()
      setOverview(overviewData)
      if (viewsRes.ok) setViewsChart(await viewsRes.json())
      if (subsRes.ok) setSubscribersChart(await subsRes.json())
      if (videosRes.ok) setVideos(await videosRes.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredList = useMemo(() => {
    let list = videos
    if (periodFrom) list = list.filter((v) => v.publishedAt >= periodFrom)
    if (periodTo) list = list.filter((v) => v.publishedAt <= periodTo)
    return list
  }, [videos, periodFrom, periodTo])

  const best = useMemo(
    () => [...filteredList].sort((a, b) => b.views - a.views).slice(0, 5),
    [filteredList]
  )
  const worst = useMemo(
    () => [...filteredList].sort((a, b) => a.views - b.views).slice(0, 5),
    [filteredList]
  )

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-white">YouTube</h1>
        <p className="text-zinc-500">Загрузка...</p>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">YouTube</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Подключите канал для аналитики</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 max-w-lg">
          <p className="text-zinc-400 mb-4">
            Чтобы видеть реальные данные канала, нужно один раз войти через Google и разрешить доступ к YouTube Data API и YouTube Analytics API.
          </p>
          <a
            href="/api/youtube/auth"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium"
          >
            Подключить через Google
          </a>
          {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') && (
            <p className="mt-4 text-sm text-amber-400">
              Ошибка: {new URLSearchParams(window.location.search).get('error')}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error || !overview?.stats) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-white">YouTube</h1>
        <p className="text-zinc-500">{error ?? 'Нет данных'}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
        >
          Обновить
        </button>
      </div>
    )
  }

  const stats = overview.stats
  const avgViewDurationSec = stats.avgViewDurationSec ?? 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">YouTube</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {overview.channel?.channelTitle ? `Канал: ${overview.channel.channelTitle}` : 'Аналитика канала'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setLoading(true); fetchData(); }}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-zinc-300 text-sm hover:bg-white/20"
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/youtube/disconnect', { method: 'POST' })
              window.location.reload()
            }}
            className="px-3 py-1.5 rounded-lg text-zinc-500 text-sm hover:text-zinc-300"
          >
            Отключить
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Просмотры" value={stats.totalViews.toLocaleString()} />
        <MetricCard label="Подписчики с роликов" value={stats.newSubscribers.toLocaleString()} />
        <MetricCard label="Средний CTR" value={stats.avgCtr > 0 ? `${stats.avgCtr}%` : '—'} />
        <MetricCard label="Средний retention" value={stats.avgRetention > 0 ? `${stats.avgRetention}%` : '—'} />
        <MetricCard label="Средняя длительность просмотра" value={avgViewDurationSec > 0 ? `${Math.floor(avgViewDurationSec / 60)} мин` : '—'} />
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Лучший ролик</p>
          <Link href={`/creator/content/${stats.bestVideoOfWeek.id}`} className="text-white font-medium hover:text-blue-400 transition-colors line-clamp-2">
            {stats.bestVideoOfWeek.title}
          </Link>
          <p className="text-sm text-zinc-500 mt-1">{stats.bestVideoOfWeek.views.toLocaleString()} просмотров</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ViewsChart data={viewsChart} />
        <SubscribersChart data={subscribersChart} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Лучшие ролики</h2>
          <ul className="space-y-2">
            {best.map((c) => (
              <li key={c.id}>
                <Link href={`/creator/content/${c.id}`} className="flex items-center justify-between gap-4 py-2 rounded-lg hover:bg-white/5 px-2 -mx-2 transition-colors text-sm">
                  <span className="text-zinc-300 line-clamp-1">{c.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{c.views.toLocaleString()} · {(c.avgViewPercent ?? 0)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Худшие ролики (просадка)</h2>
          <ul className="space-y-2">
            {worst.map((c) => (
              <li key={c.id}>
                <Link href={`/creator/content/${c.id}`} className="flex items-center justify-between gap-4 py-2 rounded-lg hover:bg-white/5 px-2 -mx-2 transition-colors text-sm">
                  <span className="text-zinc-400 line-clamp-1">{c.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{c.views.toLocaleString()} · {(c.avgViewPercent ?? 0)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Темы, которые заходят</h2>
          <p className="text-sm text-zinc-500">Появится после подключения расширенной аналитики (разметка тем).</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Форматы, которые заходят</h2>
          <p className="text-sm text-zinc-500">Появится после подключения расширенной аналитики (разметка форматов).</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Хуки с высоким retention</h2>
          <p className="text-sm text-zinc-500">Появится после разметки хуков или подключения AI-аналитики.</p>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Выводы: почему залетает / не залетает</h2>
        <p className="text-sm text-zinc-500">Появится после подключения расширенной аналитики или AI-инсайтов.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Таблица роликов</h2>
        <div className="flex flex-wrap gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 mb-4">
          <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2" />
          <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2" />
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Тема</th>
                  <th className="px-4 py-3 font-medium">Формат</th>
                  <th className="px-4 py-3 font-medium">Хук</th>
                  <th className="px-4 py-3 font-medium">Дл.</th>
                  <th className="px-4 py-3 font-medium">Просмотры</th>
                  <th className="px-4 py-3 font-medium">Retention</th>
                  <th className="px-4 py-3 font-medium">CTR</th>
                  <th className="px-4 py-3 font-medium">Подп.</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/creator/content/${row.id}`} className="text-white hover:text-blue-400 line-clamp-2 max-w-[220px]">{row.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{row.publishedAt}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.topic || '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.format || '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[140px] truncate" title={row.hook || ''}>{row.hook || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.durationSec} сек</td>
                    <td className="px-4 py-3 text-zinc-300">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.avgViewPercent ?? '—'}{typeof row.avgViewPercent === 'number' ? '%' : ''}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.ctr ?? '—'}{typeof row.ctr === 'number' ? '%' : ''}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.subscribersGained ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                        row.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                        row.status === 'average' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'
                      }`}>{STATUS_LABEL[row.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredList.length === 0 && <div className="py-12 text-center text-zinc-500 text-sm">Нет роликов по фильтрам</div>}
        </div>
      </section>
    </div>
  )
}
