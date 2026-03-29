import { getWeeklyInsights } from '@/lib/creator-stats'

export default function CreatorInsightsPage() {
  const insights = getWeeklyInsights()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Weekly Insights</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Что зашло, какие темы и форматы работают, рекомендации</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {insights.map((card) => (
          <div key={card.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold text-white mb-3">{card.title}</h2>
            <ul className="space-y-2">
              {card.items.map((item, i) => (
                <li key={i} className="text-sm text-zinc-400">{item}</li>
              ))}
            </ul>
            {card.source === 'ai' && (
              <p className="mt-3 text-xs text-blue-400/80">На основе AI-аналитики</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
