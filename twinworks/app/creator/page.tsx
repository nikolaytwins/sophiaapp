import Link from 'next/link'
import {
  getOverviewStats,
  getTopContent,
  getWeeklyInsights,
  getContentIdeas,
  getFunnelStats,
  getContentIdeasList,
} from '@/lib/creator-stats'
import { MetricCard } from '@/components/creator/MetricCard'

export default function CreatorDashboardPage() {
  const stats = getOverviewStats()
  const funnel = getFunnelStats()
  const topContent = getTopContent(5)
  const insights = getWeeklyInsights()
  const ideaStrings = getContentIdeas()
  const ideasList = getContentIdeasList().filter((i) => i.status === 'idea' || i.status === 'in_progress').slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Главная</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Обзор: что работает, где рост, что делать дальше</p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Всего просмотров" value={stats.totalViews.toLocaleString()} />
        <MetricCard label="Новые подписчики" value={stats.newSubscribers.toLocaleString()} />
        <MetricCard label="Средний retention" value={`${stats.avgRetention}%`} />
        <MetricCard label="Средний CTR" value={`${stats.avgCtr}%`} />
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Лучший ролик недели</p>
          <Link href={`/creator/content/${stats.bestVideoOfWeek.id}`} className="text-white font-medium hover:text-blue-400 transition-colors line-clamp-2">
            {stats.bestVideoOfWeek.title}
          </Link>
          <p className="text-sm text-zinc-500 mt-1">{stats.bestVideoOfWeek.views.toLocaleString()} просмотров</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Лучший контент</h2>
          <ul className="space-y-3">
            {topContent.map((c) => (
              <li key={c.id}>
                <Link href={`/creator/content/${c.id}`} className="flex items-center justify-between gap-4 py-2 rounded-lg hover:bg-white/5 px-2 -mx-2 transition-colors">
                  <span className="text-sm text-zinc-300 line-clamp-1">{c.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{c.views.toLocaleString()} · {c.retention}%</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/creator/youtube" className="text-xs text-blue-400 hover:text-blue-300 mt-3 inline-block">YouTube →</Link>
          <span className="text-zinc-600 mx-1">·</span>
          <Link href="/creator/reels" className="text-xs text-blue-400 hover:text-blue-300 inline-block">Reels →</Link>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Выводы недели</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            {insights.slice(0, 4).map((card) => (
              <li key={card.id}>
                <span className="text-zinc-500">{card.title}: </span>
                {card.items.slice(0, 2).join(' · ')}
              </li>
            ))}
          </ul>
          <Link href="/creator/insights" className="text-xs text-blue-400 hover:text-blue-300 mt-3 inline-block">Подробнее →</Link>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Воронка</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500 text-xs">Запусков всего</p>
              <p className="text-white font-medium">{funnel.totalStarts.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">За неделю</p>
              <p className="text-white font-medium">{funnel.weekStarts}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Заявки</p>
              <p className="text-white font-medium">{funnel.leads}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Созвоны / Продажи</p>
              <p className="text-white font-medium">{funnel.calls} / {funnel.sales}</p>
            </div>
          </div>
          <Link href="/creator/funnel" className="text-xs text-blue-400 hover:text-blue-300 mt-3 inline-block">В раздел воронки →</Link>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Идеи и следующие шаги</h2>
          {ideasList.length > 0 ? (
            <ul className="space-y-2 text-sm text-zinc-400">
              {ideasList.map((i) => (
                <li key={i.id}>
                  <Link href="/creator/ideas" className="hover:text-white transition-colors">{i.name}</Link>
                  <span className="text-zinc-600 ml-1">({i.status === 'in_progress' ? 'в работе' : 'идея'})</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-1.5 text-sm text-zinc-400">
              {ideaStrings.slice(0, 3).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          <Link href="/creator/ideas" className="text-xs text-blue-400 hover:text-blue-300 mt-3 inline-block">Все идеи →</Link>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Быстрые рекомендации</h2>
        <ul className="text-sm text-zinc-400 space-y-1">
          {insights.find((c) => c.title.includes('рекомендации'))?.items.map((item, i) => (
            <li key={i}>• {item}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
