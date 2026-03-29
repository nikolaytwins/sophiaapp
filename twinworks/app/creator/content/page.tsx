'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { filterContent } from '@/lib/creator-stats'
import type { ContentFilters, Platform } from '@/types/creator'

const TOPICS = ['дизайн', 'деньги', 'личная история', 'ошибки новичков', 'агентство', 'мотивация', 'фриланс', 'психология']
const FORMATS = ['личная история', 'обучение', 'разбор ошибки', 'провокация', 'кейс', 'мотивация', 'реалити']
const STATUS_LABEL = { success: 'Успешный', average: 'Средний', weak: 'Слабый' }

export default function CreatorContentPage() {
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [topic, setTopic] = useState('')
  const [format, setFormat] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')

  const filters: ContentFilters = useMemo(() => ({
    platform: platform || undefined,
    topic: topic || undefined,
    format: format || undefined,
    period: periodFrom || periodTo ? { from: periodFrom, to: periodTo } : undefined,
  }), [platform, topic, format, periodFrom, periodTo])

  const list = useMemo(() => filterContent(filters), [filters])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Content</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Таблица роликов с фильтрами</p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <select
          value={platform}
          onChange={(e) => setPlatform((e.target.value || '') as Platform | '')}
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          <option value="">Платформа</option>
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
        </select>
        <input
          type="date"
          value={periodFrom}
          onChange={(e) => setPeriodFrom(e.target.value)}
          placeholder="От"
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <input
          type="date"
          value={periodTo}
          onChange={(e) => setPeriodTo(e.target.value)}
          placeholder="До"
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          <option value="">Тема</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          <option value="">Формат</option>
          {FORMATS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Платформа</th>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Тема</th>
                <th className="px-4 py-3 font-medium">Формат</th>
                <th className="px-4 py-3 font-medium">Хук</th>
                <th className="px-4 py-3 font-medium">Дл.</th>
                <th className="px-4 py-3 font-medium">Просмотры</th>
                <th className="px-4 py-3 font-medium">Retention</th>
                <th className="px-4 py-3 font-medium">CTR</th>
                <th className="px-4 py-3 font-medium">Лайки</th>
                <th className="px-4 py-3 font-medium">Комменты</th>
                <th className="px-4 py-3 font-medium">Сохр.</th>
                <th className="px-4 py-3 font-medium">Репосты</th>
                <th className="px-4 py-3 font-medium">Подп.</th>
                <th className="px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-zinc-400">{row.platform === 'youtube' ? 'YouTube' : 'Reels'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/creator/content/${row.id}`} className="text-white hover:text-blue-400 line-clamp-2 max-w-[200px]">
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{row.publishedAt}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.topic}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.format}</td>
                  <td className="px-4 py-3 text-zinc-500 max-w-[140px] truncate" title={row.hook}>{row.hook}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.durationSec}s</td>
                  <td className="px-4 py-3 text-zinc-300">{row.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.avgViewPercent ?? '—'}%</td>
                  <td className="px-4 py-3 text-zinc-400">{row.ctr ?? '—'}%</td>
                  <td className="px-4 py-3 text-zinc-400">{row.likes.toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.comments}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.saves ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.shares ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.subscribersGained ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                      row.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                      row.status === 'average' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && (
          <div className="py-12 text-center text-zinc-500 text-sm">Нет контента по выбранным фильтрам</div>
        )}
      </div>
    </div>
  )
}
