import { getExperiments } from '@/lib/creator-stats'

const STATUS_STYLE = {
  validated: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  rejected: 'bg-zinc-500/20 text-zinc-400',
}
const STATUS_LABEL = { validated: 'Подтверждена', in_progress: 'В тесте', rejected: 'Отклонена' }

export default function CreatorExperimentsPage() {
  const experiments = getExperiments()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Эксперименты</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Гипотезы и результаты тестов</p>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-zinc-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Название гипотезы</th>
              <th className="px-4 py-3 font-medium">Что тестируем</th>
              <th className="px-4 py-3 font-medium">Роликов</th>
              <th className="px-4 py-3 font-medium">Результат</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((e) => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{e.name}</td>
                <td className="px-4 py-3 text-zinc-400 max-w-xs">{e.whatWeTest}</td>
                <td className="px-4 py-3 text-zinc-400">{e.videosTested}</td>
                <td className="px-4 py-3 text-zinc-400 max-w-sm">{e.result}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_STYLE[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
