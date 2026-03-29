'use client'

import { useMemo, useState } from 'react'
import { getContentIdeasList } from '@/lib/creator-stats'
import type { ContentIdea, IdeaStatus, IdeaPriority } from '@/types/creator'

const STATUS_LABEL: Record<IdeaStatus, string> = {
  idea: 'Идея',
  in_progress: 'В работе',
  shot: 'Снято',
  published: 'Опубликовано',
  postponed: 'Отложено',
}
const PRIORITY_LABEL: Record<IdeaPriority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}
const PLATFORM_LABEL = { youtube: 'YouTube', instagram: 'Reels', telegram: 'Telegram' }

export default function CreatorIdeasPage() {
  const [platform, setPlatform] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const list = useMemo(() => {
    let items = getContentIdeasList()
    if (platform) items = items.filter((i) => i.platform === platform)
    if (status) items = items.filter((i) => i.status === status)
    if (priority) items = items.filter((i) => i.priority === priority)
    return items
  }, [platform, status, priority])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Идеи контента</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Планирование: идеи, статусы, приоритеты</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2"
        >
          <option value="">Платформа</option>
          <option value="youtube">YouTube</option>
          <option value="instagram">Reels</option>
          <option value="telegram">Telegram</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2"
        >
          <option value="">Статус</option>
          {(Object.keys(STATUS_LABEL) as IdeaStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm px-3 py-2"
        >
          <option value="">Приоритет</option>
          {(Object.keys(PRIORITY_LABEL) as IdeaPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Таблица
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Карточки
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Платформа</th>
                  <th className="px-4 py-3 font-medium">Тема</th>
                  <th className="px-4 py-3 font-medium">Формат</th>
                  <th className="px-4 py-3 font-medium">Хук</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Приоритет</th>
                  <th className="px-4 py-3 font-medium">Заметки</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white font-medium max-w-[200px]">{row.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{PLATFORM_LABEL[row.platform]}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.topic}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.format}</td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[160px] truncate" title={row.hook}>{row.hook}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-white/10 text-zinc-300">
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{PRIORITY_LABEL[row.priority]}</td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[180px] truncate" title={row.notes}>{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === 0 && <div className="py-12 text-center text-zinc-500 text-sm">Нет идей по фильтрам</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((idea) => (
            <div key={idea.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
              <h3 className="text-white font-medium line-clamp-2">{idea.name}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-400">{PLATFORM_LABEL[idea.platform]}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-400">{STATUS_LABEL[idea.status]}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-400">{PRIORITY_LABEL[idea.priority]}</span>
              </div>
              <p className="text-sm text-zinc-500">Тема: {idea.topic} · {idea.format}</p>
              <p className="text-sm text-zinc-500 truncate" title={idea.hook}>Хук: {idea.hook}</p>
              {idea.notes && <p className="text-sm text-zinc-400 pt-2 border-t border-white/5">{idea.notes}</p>}
            </div>
          ))}
          {list.length === 0 && <div className="col-span-full py-12 text-center text-zinc-500 text-sm">Нет идей по фильтрам</div>}
        </div>
      )}
    </div>
  )
}
