import Link from 'next/link'
import { getTelegramPosts, getTelegramViewsChartData, getTelegramSubscribersChartData } from '@/lib/creator-stats'
import { MetricCard } from '@/components/creator/MetricCard'
import { ViewsChart } from '@/components/creator/ViewsChart'
import { SubscribersChart } from '@/components/creator/SubscribersChart'

const STATUS_LABEL = { success: 'Успешный', average: 'Средний', weak: 'Слабый' }

export default function CreatorTelegramPage() {
  const posts = getTelegramPosts()
  const viewsChartData = getTelegramViewsChartData(14)
  const subscribersChartData = getTelegramSubscribersChartData(14)
  const totalViews = posts.reduce((s, p) => s + p.views, 0)
  const totalReactions = posts.reduce((s, p) => s + p.reactions, 0)
  const totalClicks = posts.reduce((s, p) => s + p.linkClicks, 0)
  const totalFunnel = posts.reduce((s, p) => s + p.funnelStarts, 0)
  const engagement = posts.length ? Math.round((totalReactions + posts.reduce((s, p) => s + p.comments, 0)) / posts.length) : 0
  const best = [...posts].sort((a, b) => b.views - a.views).slice(0, 5)
  const worst = [...posts].sort((a, b) => a.views - b.views).slice(0, 5)
  const byTopic = Object.entries(
    posts.reduce((acc, p) => {
      acc[p.topic] = (acc[p.topic] || 0) + p.views
      return acc
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a).slice(0, 5)
  const byFormat = Object.entries(
    posts.reduce((acc, p) => {
      acc[p.format] = (acc[p.format] || 0) + p.funnelStarts
      return acc
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a).slice(0, 5)
  const topByTransition = [...posts].sort((a, b) => b.funnelStarts - a.funnelStarts).slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Telegram</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Аналитика канала: подписчики, просмотры, вовлечённость, переходы в воронку</p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Просмотры постов" value={totalViews.toLocaleString()} />
        <MetricCard label="Реакции + комментарии" value={totalReactions.toLocaleString()} />
        <MetricCard label="Вовлечённость (средн.)" value={engagement.toString()} />
        <MetricCard label="Переходы по ссылкам" value={totalClicks.toLocaleString()} />
        <MetricCard label="Запуски воронки" value={totalFunnel.toLocaleString()} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ViewsChart data={viewsChartData} title="Просмотры постов по дням" />
        <SubscribersChart data={subscribersChartData} title="Прирост подписчиков по дням" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Лучшие посты</h2>
          <ul className="space-y-2">
            {best.map((p) => (
              <li key={p.id} className="text-sm text-zinc-300 py-2 border-b border-white/5 last:border-0">
                {p.title}
                <span className="text-zinc-500 ml-2">{p.views.toLocaleString()} просмотров · {p.funnelStarts} в воронку</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Худшие посты</h2>
          <ul className="space-y-2">
            {worst.map((p) => (
              <li key={p.id} className="text-sm text-zinc-400 py-2 border-b border-white/5 last:border-0">
                {p.title}
                <span className="text-zinc-500 ml-2">{p.views.toLocaleString()} просмотров</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Темы постов, которые лучше работают</h2>
          <ul className="text-sm text-zinc-400 space-y-1.5">
            {byTopic.map(([t, v]) => (
              <li key={t}>{t} — {v.toLocaleString()} просмотров</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Форматы с максимальным переходом в воронку</h2>
          <ul className="text-sm text-zinc-400 space-y-1.5">
            {byFormat.map(([f, v]) => (
              <li key={f}>{f} — {v} переходов</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Посты с максимальным переходом в воронку / бота</h2>
        <ul className="space-y-2">
          {topByTransition.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
              <span className="text-zinc-300">{p.title}</span>
              <span className="text-zinc-500">{p.funnelStarts} переходов · {p.linkClicks} кликов</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Таблица постов</h2>
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
                  <th className="px-4 py-3 font-medium">Реакции</th>
                  <th className="px-4 py-3 font-medium">Комменты</th>
                  <th className="px-4 py-3 font-medium">Клики</th>
                  <th className="px-4 py-3 font-medium">В воронку</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white font-medium max-w-[240px]">{row.title}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.publishedAt}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.topic}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.format}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.reactions}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.comments}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.linkClicks}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.funnelStarts}</td>
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
        </div>
      </section>
    </div>
  )
}
