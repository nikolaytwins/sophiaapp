'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  getReelsContent,
  getViewsChartData,
  getSubscribersChartData,
  getTopContent,
  getWorstContent,
  getWeeklyInsights,
} from '@/lib/creator-stats'
import { MetricCard } from '@/components/creator/MetricCard'
import { ViewsChart } from '@/components/creator/ViewsChart'
import { SubscribersChart } from '@/components/creator/SubscribersChart'
import type { ContentFilters } from '@/types/creator'

const TOPICS = ['дизайн', 'деньги', 'личная история', 'ошибки новичков', 'агентство', 'мотивация', 'фриланс', 'психология']
const FORMATS = ['личная история', 'обучение', 'разбор ошибки', 'провокация', 'кейс', 'мотивация', 'реалити']
const STATUS_LABEL = { success: 'Успешный', average: 'Средний', weak: 'Слабый' }

export default function CreatorReelsPage() {
  const [topic, setTopic] = useState('')
  const [format, setFormat] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')

  const filters: ContentFilters = useMemo(() => ({
    platform: 'instagram',
    topic: topic || undefined,
    format: format || undefined,
    period: periodFrom || periodTo ? { from: periodFrom, to: periodTo } : undefined,
  }), [topic, format, periodFrom, periodTo])

  const list = useMemo(() => getReelsContent(filters), [filters])
  const viewsChartData = useMemo(() => getViewsChartData(14, list), [list])
  const subscribersChartData = useMemo(() => getSubscribersChartData(14, list), [list])
  const totalViews = useMemo(() => list.reduce((s, c) => s + c.views, 0), [list])
  const totalImpressions = useMemo(() => list.reduce((s, c) => s + (c.impressions ?? 0), 0), [list])
  const totalLikes = useMemo(() => list.reduce((s, c) => s + c.likes, 0), [list])
  const totalSaves = useMemo(() => list.reduce((s, c) => s + (c.saves ?? 0), 0), [list])
  const totalSubs = useMemo(() => list.reduce((s, c) => s + (c.subscribersGained ?? 0), 0), [list])
  const best = useMemo(() => getTopContent(5, list), [list])
  const worst = useMemo(() => getWorstContent(5, list), [list])
  const insights = useMemo(() => getWeeklyInsights(list), [list])

  const byTopic = useMemo(() => {
    const acc: Record<string, number> = {}
    list.forEach((c) => { acc[c.topic] = (acc[c.topic] || 0) + c.views; })
    return Object.entries(acc).sort(([, a], [, b]) => b - a).slice(0, 5)
  }, [list])
  const byFormat = useMemo(() => {
    const acc: Record<string, number> = {}
    list.forEach((c) => { acc[c.format] = (acc[c.format] || 0) + c.views; })
    return Object.entries(acc).sort(([, a], [, b]) => b - a).slice(0, 5)
  }, [list])
  const topHooksByRetention = useMemo(() => {
    const sorted = [...list].filter((c) => (c.avgViewPercent ?? 0) >= 50).sort((a, b) => (b.avgViewPercent ?? 0) - (a.avgViewPercent ?? 0))
    return [...new Set(sorted.map((c) => c.hook))].slice(0, 5)
  }, [list])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Reels</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Аналитика Reels: просмотры, охваты, вовлечённость, что заходит</p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Просмотры" value={totalViews.toLocaleString()} />
        <MetricCard label="Охваты (impressions)" value={totalImpressions.toLocaleString()} />
        <MetricCard label="Лайки" value={totalLikes.toLocaleString()} />
        <MetricCard label="Сохранения" value={totalSaves.toLocaleString()} />
        <MetricCard label="Подписчики с рилсов" value={totalSubs.toLocaleString()} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ViewsChart data={viewsChartData} />
        <SubscribersChart data={subscribersChartData} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Лучшие рилсы</h2>
          <ul className="space-y-2">
            {best.map((c) => (
              <li key={c.id}>
                <Link href={`/creator/content/${c.id}`} className="flex items-center justify-between gap-4 py-2 rounded-lg hover:bg-white/5 px-2 -mx-2 transition-colors text-sm">
                  <span className="text-zinc-300 line-clamp-1">{c.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{c.views.toLocaleString()} · {c.retention}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Худшие рилсы (просадка)</h2>
          <ul className="space-y-2">
            {worst.map((c) => (
              <li key={c.id}>
                <Link href={`/creator/content/${c.id}`} className="flex items-center justify-between gap-4 py-2 rounded-lg hover:bg-white/5 px-2 -mx-2 transition-colors text-sm">
                  <span className="text-zinc-400 line-clamp-1">{c.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{c.views.toLocaleString()} · {c.retention}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Темы, которые заходят</h2>
          <ul className="text-sm text-zinc-400 space-y-1.5">
            {byTopic.map(([t, v]) => (
              <li key={t}>{t} — {(v / 1000).toFixed(1)}k</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Форматы, которые заходят</h2>
          <ul className="text-sm text-zinc-400 space-y-1.5">
            {byFormat.map(([f, v]) => (
              <li key={f}>{f} — {(v / 1000).toFixed(1)}k</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Хуки с высоким retention</h2>
          <ul className="text-sm text-zinc-400 space-y-1.5">
            {topHooksByRetention.map((h) => (
              <li key={h} className="line-clamp-2">{h}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Выводы: причины успеха и провала</h2>
        <ul className="text-sm text-zinc-400 space-y-2">
          {insights.slice(0, 4).map((card) => (
            <li key={card.id}><span className="text-zinc-500">{card.title}:</span> {card.items.slice(0, 2).join(' · ')}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Таблица рилсов</h2>
        <div className="flex flex-wrap gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 mb-4">
          <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2" />
          <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2" />
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2">
            <option value="">Тема</option>
            {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2">
            <option value="">Формат</option>
            {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
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
                  <th className="px-4 py-3 font-medium">Просмотры</th>
                  <th className="px-4 py-3 font-medium">Лайки</th>
                  <th className="px-4 py-3 font-medium">Сохр.</th>
                  <th className="px-4 py-3 font-medium">Репосты</th>
                  <th className="px-4 py-3 font-medium">Retention</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/creator/content/${row.id}`} className="text-white hover:text-blue-400 line-clamp-2 max-w-[220px]">{row.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{row.publishedAt}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.topic}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.format}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.saves ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.shares ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.avgViewPercent ?? '—'}%</td>
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
          {list.length === 0 && <div className="py-12 text-center text-zinc-500 text-sm">Нет рилсов по фильтрам</div>}
        </div>
      </section>
    </div>
  )
}
