import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContentById } from '@/lib/creator-stats'
import { getYoutubeVideoById } from '@/lib/youtube-data'
import { RetentionMiniChart } from '@/components/creator/RetentionMiniChart'

export default async function CreatorContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let item = getContentById(id)
  if (!item && id.length === 11) {
    try {
      item = await getYoutubeVideoById(id) ?? undefined
    } catch {
      item = undefined
    }
  }
  if (!item) notFound()

  const statusLabel = { success: 'Успешный', average: 'Средний', weak: 'Слабый' }[item.status]

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={item.platform === 'youtube' ? '/creator/youtube' : '/creator/reels'} className="text-sm text-zinc-500 hover:text-zinc-400 mb-2 inline-block">
            ← К таблице
          </Link>
          <h1 className="text-2xl font-semibold text-white mt-1">{item.title}</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {item.platform === 'youtube' ? 'YouTube' : 'Instagram Reels'} · {item.publishedAt}
          </p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-lg text-sm ${
          item.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
          item.status === 'average' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'
        }`}>
          {statusLabel}
        </span>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Основное</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div><span className="text-zinc-500">Ссылка</span><br /><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{item.url}</a></div>
          <div><span className="text-zinc-500">Хук</span><br /><span className="text-zinc-300">{item.hook || '—'}</span></div>
          <div><span className="text-zinc-500">Тема</span><br /><span className="text-zinc-300">{item.topic || '—'}</span></div>
          <div><span className="text-zinc-500">Формат</span><br /><span className="text-zinc-300">{item.format || '—'}</span></div>
          <div><span className="text-zinc-500">Длительность</span><br /><span className="text-zinc-300">{item.durationSec} сек</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Просмотры</p>
          <p className="text-xl font-semibold text-white mt-1">{item.views.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Retention</p>
          <p className="text-xl font-semibold text-white mt-1">{item.avgViewPercent ?? '—'}%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">CTR</p>
          <p className="text-xl font-semibold text-white mt-1">{item.ctr ?? '—'}%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Лайки</p>
          <p className="text-xl font-semibold text-white mt-1">{item.likes.toLocaleString()}</p>
        </div>
      </div>

      {item.retentionCurve?.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Удержание</h2>
          <RetentionMiniChart data={item.retentionCurve} />
        </div>
      )}

      {item.aiSummary && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-2">AI summary</h2>
          <p className="text-sm text-zinc-400">{item.aiSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {item.strengths && item.strengths.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold text-emerald-400/90 mb-3">Что сработало</h2>
            <ul className="space-y-1.5 text-sm text-zinc-400">
              {item.strengths.map((s, i) => <li key={i}>· {s}</li>)}
            </ul>
          </div>
        )}
        {item.weaknesses && item.weaknesses.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold text-amber-400/90 mb-3">Что не сработало</h2>
            <ul className="space-y-1.5 text-sm text-zinc-400">
              {item.weaknesses.map((w, i) => <li key={i}>· {w}</li>)}
            </ul>
          </div>
        )}
        {item.nextTest && item.nextTest.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold text-blue-400/90 mb-3">Что протестировать в следующем</h2>
            <ul className="space-y-1.5 text-sm text-zinc-400">
              {item.nextTest.map((t, i) => <li key={i}>· {t}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
