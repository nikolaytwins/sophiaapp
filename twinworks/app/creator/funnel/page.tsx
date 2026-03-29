import { getFunnelStats } from '@/lib/creator-stats'
import { MetricCard } from '@/components/creator/MetricCard'

export default function CreatorFunnelPage() {
  const funnel = getFunnelStats()
  const convLeads = funnel.totalStarts > 0 ? ((funnel.leads / funnel.totalStarts) * 100).toFixed(1) : '0'
  const convCalls = funnel.leads > 0 ? ((funnel.calls / funnel.leads) * 100).toFixed(1) : '0'
  const convSales = funnel.calls > 0 ? ((funnel.sales / funnel.calls) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Воронка</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Запуски, заявки, созвоны, продажи. Конверсии по этапам.</p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <MetricCard label="Запусков всего" value={funnel.totalStarts.toLocaleString()} />
        <MetricCard label="За сегодня" value={funnel.todayStarts.toString()} />
        <MetricCard label="За неделю" value={funnel.weekStarts.toString()} />
        <MetricCard label="Заявки" value={funnel.leads.toString()} />
        <MetricCard label="Созвоны" value={funnel.calls.toString()} />
        <MetricCard label="Продажи" value={funnel.sales.toString()} />
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Конверсии по этапам</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Запуск → Заявка</p>
            <p className="text-2xl font-semibold text-white mt-1">{convLeads}%</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Заявка → Созвон</p>
            <p className="text-2xl font-semibold text-white mt-1">{convCalls}%</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Созвон → Продажа</p>
            <p className="text-2xl font-semibold text-white mt-1">{convSales}%</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Динамика по дням</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Запуски</th>
                <th className="px-4 py-3 font-medium">Заявки</th>
                <th className="px-4 py-3 font-medium">Созвоны</th>
                <th className="px-4 py-3 font-medium">Продажи</th>
              </tr>
            </thead>
            <tbody>
              {funnel.byDay.map((d) => (
                <tr key={d.date} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-400">{d.date}</td>
                  <td className="px-4 py-3 text-white">{d.starts}</td>
                  <td className="px-4 py-3 text-zinc-300">{d.leads}</td>
                  <td className="px-4 py-3 text-zinc-300">{d.calls}</td>
                  <td className="px-4 py-3 text-zinc-300">{d.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-2">Где может быть просадка</h2>
        <p className="text-sm text-zinc-400">
          Анализ конверсий помогает увидеть узкое место: если «Запуск → Заявка» низкая — доработать лид-магнит или трафик; если «Заявка → Созвон» — качество заявок или скорость отклика; если «Созвон → Продажа» — скрипт и оффер.
        </p>
      </section>
    </div>
  )
}
