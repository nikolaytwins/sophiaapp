'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

function normalizeCategoryName(name: string | null | undefined): string {
  const raw = (name || 'Без категории').trim()
  const lower = raw.toLowerCase()
  if (lower === 'лера' || lower === 'на леру') return 'На Леру'
  return raw || 'Без категории'
}

function safeNum(v: unknown): number {
  if (typeof v === 'bigint') return Number(v)
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function isCategoryRow(c: unknown): c is { id: string; name: string; type: string } {
  if (!c || typeof c !== 'object') return false
  const o = c as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.name === 'string' && typeof o.type === 'string'
}

function isExpenseRow(t: unknown): t is { type: string; date: string; amount: unknown; category?: string | null } {
  if (!t || typeof t !== 'object') return false
  const o = t as Record<string, unknown>
  return o.type === 'expense' && typeof o.date === 'string'
}

function monthKeyFromDateString(dateStr: string): string | null {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null
  return `${y}-${String(m).padStart(2, '0')}`
}

function labelForMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  const year = parseInt(y, 10)
  const month = parseInt(m, 10)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey
  }
  const date = new Date(year, month - 1, 1)
  if (Number.isNaN(date.getTime())) return monthKey
  return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
}

async function fetchJsonArray(url: string): Promise<unknown[]> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetch failed', url, res.status)
    return []
  }
  const data = await res.json().catch(() => null)
  return Array.isArray(data) ? data : []
}

export default function ExpensesByCategoryPage() {
  const [transactions, setTransactions] = useState<unknown[]>([])
  const [categories, setCategories] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = Date.now()
    Promise.all([
      fetchJsonArray(`/api/transactions?t=${t}`),
      fetchJsonArray(`/api/categories?t=${t}`),
    ])
      .then(([tx, cat]) => {
        setTransactions(tx)
        setCategories(cat)
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  const personalCategories = useMemo(
    () => categories.filter(isCategoryRow).filter((c) => c.type === 'personal'),
    [categories]
  )
  const businessCategories = useMemo(
    () => categories.filter(isCategoryRow).filter((c) => c.type === 'business'),
    [categories]
  )

  const { expensesByCategoryAndMonth, sortedMonths, monthLabelsMap } = useMemo(() => {
    const byCat: Record<string, Record<string, number>> = {}
    const months = new Set<string>()

    for (const raw of transactions) {
      if (!isExpenseRow(raw)) continue
      const monthKey = monthKeyFromDateString(raw.date)
      if (!monthKey) continue
      months.add(monthKey)
      const cat = normalizeCategoryName(raw.category)
      const amt = safeNum(raw.amount)
      if (!byCat[cat]) byCat[cat] = {}
      byCat[cat][monthKey] = (byCat[cat][monthKey] || 0) + amt
    }

    const sorted = Array.from(months).sort()
    const labels: Record<string, string> = {}
    for (const mk of sorted) {
      labels[mk] = labelForMonthKey(mk)
    }
    return { expensesByCategoryAndMonth: byCat, sortedMonths: sorted, monthLabelsMap: labels }
  }, [transactions])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="text-gray-500">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/me/finance" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← К финансам
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Расходы по категориям по месяцам</h2>
          <p className="text-sm text-gray-500 mt-1">Сравнение расходов по категориям в разные месяцы</p>
        </div>
        <div className="p-6 overflow-x-auto">
          {sortedMonths.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Нет данных о расходах</div>
          ) : (
            <div className="space-y-6">
              <div className="border-b pb-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Итоги по месяцам</h3>
                <div className="space-y-4">
                  <div className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-900">Личные расходы (всего)</div>
                      <div className="text-xs text-gray-500">
                        Среднее:{' '}
                        {(() => {
                          const personalTotalByMonth: Record<string, number> = {}
                          sortedMonths.forEach((monthKey) => {
                            personalTotalByMonth[monthKey] = personalCategories.reduce(
                              (sum, cat) =>
                                sum + safeNum(expensesByCategoryAndMonth[cat.name]?.[monthKey]),
                              0
                            )
                          })
                          const monthsWithData = Object.values(personalTotalByMonth).filter((v) => v > 0).length
                          const total = Object.values(personalTotalByMonth).reduce((s, v) => s + safeNum(v), 0)
                          return monthsWithData > 0
                            ? (total / monthsWithData).toLocaleString('ru-RU', { maximumFractionDigits: 0 })
                            : '0'
                        })()}{' '}
                        ₽
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {sortedMonths.map((monthKey) => {
                        const total = personalCategories.reduce(
                          (sum, cat) =>
                            sum + safeNum(expensesByCategoryAndMonth[cat.name]?.[monthKey]),
                          0
                        )
                        if (total === 0) return null
                        return (
                          <div
                            key={`personal-${monthKey}`}
                            className="bg-blue-50 rounded-lg p-3 border border-blue-200 min-w-[140px]"
                          >
                            <div className="text-sm font-semibold text-blue-700 mb-1">
                              {monthLabelsMap[monthKey]}
                            </div>
                            <div className="text-base font-bold text-blue-900">
                              {total.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-900">Бизнес расходы (всего)</div>
                      <div className="text-xs text-gray-500">
                        Среднее:{' '}
                        {(() => {
                          const businessTotalByMonth: Record<string, number> = {}
                          sortedMonths.forEach((monthKey) => {
                            businessTotalByMonth[monthKey] = businessCategories.reduce(
                              (sum, cat) =>
                                sum + safeNum(expensesByCategoryAndMonth[cat.name]?.[monthKey]),
                              0
                            )
                          })
                          const monthsWithData = Object.values(businessTotalByMonth).filter((v) => v > 0).length
                          const total = Object.values(businessTotalByMonth).reduce((s, v) => s + safeNum(v), 0)
                          return monthsWithData > 0
                            ? (total / monthsWithData).toLocaleString('ru-RU', { maximumFractionDigits: 0 })
                            : '0'
                        })()}{' '}
                        ₽
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {sortedMonths.map((monthKey) => {
                        const total = businessCategories.reduce(
                          (sum, cat) =>
                            sum + safeNum(expensesByCategoryAndMonth[cat.name]?.[monthKey]),
                          0
                        )
                        if (total === 0) return null
                        return (
                          <div
                            key={`business-${monthKey}`}
                            className="bg-purple-50 rounded-lg p-3 border border-purple-200 min-w-[140px]"
                          >
                            <div className="text-sm font-semibold text-purple-700 mb-1">
                              {monthLabelsMap[monthKey]}
                            </div>
                            <div className="text-base font-bold text-purple-900">
                              {total.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {personalCategories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Личные расходы</h3>
                  <div className="space-y-4">
                    {personalCategories.map((cat) => {
                      const categoryExpenses = expensesByCategoryAndMonth[cat.name] || {}
                      const monthsWithData = sortedMonths.filter(
                        (monthKey) => safeNum(categoryExpenses[monthKey]) > 0
                      )
                      const total = Object.values(categoryExpenses).reduce((s, v) => s + safeNum(v), 0)
                      const avg = monthsWithData.length > 0 ? total / monthsWithData.length : 0
                      if (monthsWithData.length === 0) return null
                      return (
                        <div key={cat.id} className="border-b pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                            <div className="text-xs text-gray-500">
                              Среднее: {avg.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {sortedMonths.map((monthKey) => {
                              const amount = safeNum(categoryExpenses[monthKey])
                              if (amount === 0) return null
                              return (
                                <div
                                  key={`${cat.id}-${monthKey}`}
                                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 min-w-[140px]"
                                >
                                  <div className="text-sm font-semibold text-gray-700 mb-1">
                                    {monthLabelsMap[monthKey]}
                                  </div>
                                  <div className="text-base font-bold text-gray-900">
                                    {amount.toLocaleString('ru-RU')} ₽
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {businessCategories.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Бизнес расходы</h3>
                  <div className="space-y-4">
                    {businessCategories.map((cat) => {
                      const categoryExpenses = expensesByCategoryAndMonth[cat.name] || {}
                      const monthsWithData = sortedMonths.filter(
                        (monthKey) => safeNum(categoryExpenses[monthKey]) > 0
                      )
                      const total = Object.values(categoryExpenses).reduce((s, v) => s + safeNum(v), 0)
                      const avg = monthsWithData.length > 0 ? total / monthsWithData.length : 0
                      if (monthsWithData.length === 0) return null
                      return (
                        <div key={cat.id} className="border-b pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                            <div className="text-xs text-gray-500">
                              Среднее: {avg.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {sortedMonths.map((monthKey) => {
                              const amount = safeNum(categoryExpenses[monthKey])
                              if (amount === 0) return null
                              return (
                                <div
                                  key={`${cat.id}-${monthKey}`}
                                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 min-w-[140px]"
                                >
                                  <div className="text-sm font-semibold text-gray-700 mb-1">
                                    {monthLabelsMap[monthKey]}
                                  </div>
                                  <div className="text-base font-bold text-gray-900">
                                    {amount.toLocaleString('ru-RU')} ₽
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
