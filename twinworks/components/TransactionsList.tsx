'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  notes?: string | null
  order?: number
}

export interface Transaction {
  id: string
  date: string
  type: string
  amount: number
  category: string | null
  description: string | null
  fromAccountId: string | null
  toAccountId: string | null
  fromAccountName: string | null
  toAccountName: string | null
  currency: string
}

function normalizeCategoryName(name: string | null | undefined): string {
  const raw = (name || 'Без категории').trim()
  const lower = raw.toLowerCase()
  if (lower === 'лера' || lower === 'на леру') return 'На Леру'
  return raw || 'Без категории'
}

  function TransactionRow({
    transaction,
    accounts,
    categories,
    editingId,
    setEditingId,
    onUpdate,
    onDelete,
  }: {
    transaction: Transaction
    accounts: Account[]
    categories: any[]
    editingId: string | null
    setEditingId: (id: string | null) => void
    onUpdate: (id: string, field: string, value: any) => void
    onDelete: (id: string) => void
  }) {
    const [editingField, setEditingField] = useState<string | null>(null)
    const [tempValue, setTempValue] = useState('')

    const handleStartEdit = (field: string, currentValue: any) => {
      setEditingId(transaction.id)
      setEditingField(field)
      setTempValue(currentValue?.toString() || '')
    }

    const handleSave = (field: string, directValue?: any) => {
      let value: any = directValue !== undefined ? directValue : tempValue
      if (field === 'amount') {
        value = parseFloat(value?.toString() || tempValue) || 0
      } else if (field === 'date') {
        value = directValue !== undefined ? directValue : tempValue
      }
      onUpdate(transaction.id, field, value)
      setEditingField(null)
      setEditingId(null)
    }

    const handleCancel = () => {
      setEditingField(null)
      setEditingId(null)
      setTempValue('')
    }

    const isEditing = editingId === transaction.id

    return (
      <tr className={isEditing ? 'bg-blue-50' : ''}>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {editingField === 'date' ? (
            <input
              type="date"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => handleSave('date')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave('date')
                if (e.key === 'Escape') handleCancel()
              }}
              autoFocus
              className="w-full px-2 py-1 border border-blue-500 rounded text-sm"
            />
          ) : (
            <button
              onClick={() => handleStartEdit('date', transaction.date.split('T')[0])}
              className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            >
              {formatDate(new Date(transaction.date))}
            </button>
          )}
        </td>
        <td className={`px-6 py-4 whitespace-nowrap text-left text-sm font-medium ${
          transaction.type === 'income' ? 'text-green-600' :
          transaction.type === 'expense' ? 'text-red-600' : 'text-gray-900'
        }`}>
          {editingField === 'amount' ? (
            <input
              type="number"
              step="0.01"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => handleSave('amount')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave('amount')
                if (e.key === 'Escape') handleCancel()
              }}
              autoFocus
              className="w-24 px-2 py-1 border border-blue-500 rounded text-sm text-right"
            />
          ) : (
            <button
              onClick={() => handleStartEdit('amount', transaction.amount)}
              className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-left"
            >
              {transaction.type === 'expense' ? '-' : '+'}
              {transaction.amount.toLocaleString('ru-RU')} {transaction.currency}
            </button>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {editingField === 'category' ? (
            <select
              value={tempValue}
              onChange={(e) => {
                const newValue = e.target.value
                setTempValue(newValue)
                handleSave('category', newValue)
              }}
              onBlur={() => handleSave('category')}
              autoFocus
              className="w-full px-2 py-1 border border-blue-500 rounded text-sm"
            >
              <option value="">Без категории</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => handleStartEdit('category', transaction.category || '')}
              className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            >
              {transaction.category || '—'}
            </button>
          )}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {editingField === 'description' ? (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => handleSave('description')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave('description')
                if (e.key === 'Escape') handleCancel()
              }}
              autoFocus
              className="w-full px-2 py-1 border border-blue-500 rounded text-sm"
            />
          ) : (
            <button
              onClick={() => handleStartEdit('description', transaction.description || '')}
              className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-left w-full"
            >
              {transaction.description || '—'}
            </button>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            transaction.type === 'income' ? 'bg-green-100 text-green-800' :
            transaction.type === 'expense' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {transaction.type === 'income' ? 'Доход' :
             transaction.type === 'expense' ? 'Расход' : 'Перевод'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => onDelete(transaction.id)}
            className="text-red-600 hover:text-red-900 mr-3"
          >
            Удалить
          </button>
        </td>
      </tr>
    )
  }
  export default function TransactionsList({
    transactions,
    accounts,
    onRefresh,
    onTransactionAdded,
  }: {
    transactions: Transaction[]
    accounts: Account[]
    onRefresh: (preserveScroll?: boolean) => void
    onTransactionAdded?: (transaction: Transaction) => void
  }) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [categories, setCategories] = useState<any[]>([])
    const [quickAdd, setQuickAdd] = useState({
      type: 'expense' as 'income' | 'expense',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      fromAccountId: accounts.find(a => a.type === 'card' || a.type === 'cash')?.id || accounts[0]?.id || '',
      toAccountId: accounts.find(a => a.type === 'card' || a.type === 'cash')?.id || accounts[0]?.id || '',
    })
    const [quickAddLoading, setQuickAddLoading] = useState(false)
    const [lastCategory, setLastCategory] = useState<string>('')
    
    // Месяц для фильтрации
    const today = new Date()
    const [selectedYear, setSelectedYear] = useState(today.getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
    
    useEffect(() => {
      fetch('/api/categories')
        .then(r => r.json())
        .then(data => setCategories(Array.isArray(data) ? data : []))
        .catch(() => setCategories([]))
    }, [])

    // Фокус на поле суммы при монтировании (без autoFocus — он вызывает скролл при re-render)
    useEffect(() => {
      const el = document.getElementById('quick-add-amount') as HTMLInputElement
      if (el) el.focus({ preventScroll: true })
    }, [])
    
    // Фильтруем транзакции по выбранному месяцу
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1)
    const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59)
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate >= monthStart && transactionDate <= monthEnd
    })

    const handleQuickAdd = async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (!quickAdd.amount || parseFloat(quickAdd.amount) <= 0) return
      
      // Жёсткая фиксация скролла: сохраняем позицию до любых обновлений state
      const savedScrollY = typeof window !== 'undefined' ? (window.scrollY ?? document.documentElement.scrollTop) : 0
      
      setQuickAddLoading(true)
      try {
        const data = {
          date: quickAdd.date || new Date().toISOString().split('T')[0], // Используем дату из формы или сегодняшнюю
          type: quickAdd.type,
          amount: parseFloat(quickAdd.amount),
          currency: 'RUB',
          category: quickAdd.category && quickAdd.category.trim() ? quickAdd.category.trim() : null,
          description: quickAdd.description && quickAdd.description.trim() ? quickAdd.description.trim() : null,
          fromAccountId: null, // Не сохраняем счёт в быстрой форме
          toAccountId: null,
        }

        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (res.ok) {
          const responseData = await res.json().catch(() => ({}))
          const newTransaction = responseData.transaction
          // Оптимистичное обновление — добавляем транзакцию в state без refetch, чтобы не было скролла
          if (onTransactionAdded && newTransaction) {
            const t = newTransaction as any
            onTransactionAdded({
              id: t.id,
              date: t.date,
              type: t.type,
              amount: t.amount,
              category: t.category ?? null,
              description: t.description ?? null,
              fromAccountId: t.fromAccountId ?? null,
              toAccountId: t.toAccountId ?? null,
              fromAccountName: t.fromAccountName ?? null,
              toAccountName: t.toAccountName ?? null,
              currency: t.currency ?? 'RUB',
            })
          } else {
            onRefresh(true)
          }
          if (quickAdd.category) {
            setLastCategory(quickAdd.category)
          }
          setQuickAdd({
            type: 'expense',
            category: quickAdd.category,
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            fromAccountId: '',
            toAccountId: '',
          })
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.error('Error creating transaction:', errorData, 'Sent data:', data)
        }
      } catch (error) {
        console.error('Error creating transaction:', error)
      } finally {
        setQuickAddLoading(false)
        // Жёсткая фиксация: восстанавливаем скролл после рендера и ещё раз после отложенного layout (React перерисовывает список — без повторного restore уносит к блоку «Расходы по категориям»)
        if (typeof window !== 'undefined' && savedScrollY !== undefined) {
          const restoreScroll = () => { window.scrollTo(0, savedScrollY) }
          const restoreScrollAndFocus = () => {
            window.scrollTo(0, savedScrollY)
            const amountEl = document.getElementById('quick-add-amount') as HTMLInputElement | null
            if (amountEl) amountEl.focus({ preventScroll: true })
          }
          requestAnimationFrame(() => requestAnimationFrame(restoreScrollAndFocus))
          setTimeout(restoreScroll, 0)
          setTimeout(restoreScroll, 100)
        }
      }
    }

    const handleDelete = async (id: string) => {
      if (!confirm('Удалить транзакцию?')) return
      
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          await onRefresh(true)
        }
      } catch (error) {
        console.error('Error deleting transaction:', error)
      }
    }

    const handleUpdate = async (id: string, field: string, value: any) => {
      try {
        const transaction = transactions.find(t => t.id === id)
        if (!transaction) return

        const updatedTransaction = { ...transaction, [field]: value }
        
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTransaction),
        })

        if (res.ok) {
          onRefresh()
          setEditingId(null)
        }
      } catch (error) {
        console.error('Error updating transaction:', error)
      }
    }

    // Группировка категорий по типам (для селекта в форме)
    const personalCategories = categories.filter(c => c.type === 'personal')
    const businessCategories = categories.filter(c => c.type === 'business')

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    const currentYear = new Date().getFullYear()
    const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)

    return (
      <div className="space-y-6">
        {/* Селектор месяца */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Фильтр по месяцу</h3>
            <div className="flex items-center space-x-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>{name}</option>
                ))}
              </select>
              {selectedYear !== today.getFullYear() || selectedMonth !== today.getMonth() + 1 ? (
                <button
                  onClick={() => {
                    setSelectedYear(today.getFullYear())
                    setSelectedMonth(today.getMonth() + 1)
                  }}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                  title="Вернуться к текущему месяцу"
                >
                  Сегодня
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Таблица транзакций */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Быстрое добавление - первая строка */}
              <tr className="bg-blue-50 border-t-2 border-blue-300">
                <td className="px-6 py-2">
                  <input
                    type="date"
                    value={quickAdd.date}
                    onChange={(e) => setQuickAdd({ ...quickAdd, date: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-2">
                  <input
                    id="quick-add-amount"
                    type="number"
                    step="0.01"
                    value={quickAdd.amount}
                    onChange={(e) => setQuickAdd({ ...quickAdd, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleQuickAdd()
                      }
                    }}
                  />
                </td>
                <td className="px-6 py-2">
                  <select
                    value={quickAdd.category}
                    onChange={(e) => setQuickAdd({ ...quickAdd, category: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    {categories
                      .filter(c => c.type === 'personal' || (quickAdd.type === 'expense' && c.type === 'business'))
                      .map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                  </select>
                </td>
                <td className="px-6 py-2">
                  <input
                    type="text"
                    value={quickAdd.description}
                    onChange={(e) => setQuickAdd({ ...quickAdd, description: e.target.value })}
                    placeholder="Описание (необязательно)"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleQuickAdd()
                      }
                    }}
                  />
                </td>
                <td className="px-6 py-2">
                  <select
                    value={quickAdd.type}
                    onChange={(e) => setQuickAdd({ ...quickAdd, type: e.target.value as 'income' | 'expense' })}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="expense">Расход</option>
                    <option value="income">Доход</option>
                  </select>
                </td>
                <td className="px-6 py-2 text-right">
                  <button
                    onClick={() => handleQuickAdd()}
                    disabled={quickAddLoading || !quickAdd.amount || parseFloat(quickAdd.amount) <= 0}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {quickAddLoading ? '...' : '✓'}
                  </button>
                </td>
              </tr>
              {[...filteredTransactions].sort((a, b) => {
                // Сначала сортируем по дате (убывание - новые сверху)
                const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
                if (dateDiff !== 0) return dateDiff
                // Если даты одинаковые, сортируем по ID (убывание) для новых транзакций сверху
                // ID содержит timestamp (t_1234567890), извлекаем числовую часть
                const aTimestamp = parseInt(a.id.replace('t_', '')) || 0
                const bTimestamp = parseInt(b.id.replace('t_', '')) || 0
                return bTimestamp - aTimestamp
              }).map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  accounts={accounts}
                  categories={categories}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Нет транзакций. <Link href="/me/transactions/new" className="text-blue-600 hover:underline">Добавить первую транзакцию</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
