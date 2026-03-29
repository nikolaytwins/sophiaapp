import Link from 'next/link'

const cards = [
  {
    title: 'Финансы',
    description: 'Счета, баланс и общий финансовый обзор.',
    href: '/me/finance',
    cta: 'Открыть финансы',
  },
  {
    title: 'Транзакции',
    description: 'Доходы, расходы и переводы между счетами.',
    href: '/me/transactions',
    cta: 'Открыть транзакции',
  },
  {
    title: 'Цели',
    description: 'Месячные и квартальные цели с прогрессом.',
    href: '/me/goals',
    cta: 'Открыть цели',
  },
  {
    title: 'Чеклист',
    description: 'Ежедневные задачи и планирование.',
    href: '/me/checklist',
    cta: 'Открыть чеклист',
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
          <p className="mt-1 text-sm text-gray-600">
            Трекер, Привычки и Соцсети удалены из приложения. Используйте разделы ниже.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <div key={card.href} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{card.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {card.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
