'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TransactionsList, { type Account, type Transaction } from '@/components/TransactionsList'
import { fetchJsonArray } from '@/lib/safe-fetch'

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async (preserveScroll = false) => {
    let scrollY = 0
    if (preserveScroll && typeof window !== 'undefined') {
      scrollY = window.scrollY ?? document.documentElement.scrollTop
    }
    try {
      const t = Date.now()
      const [accountsRes, transactionsRes] = await Promise.all([
        fetchJsonArray<Account>(`/api/accounts?t=${t}`),
        fetchJsonArray<Transaction>(`/api/transactions?t=${t}`),
      ])
      setAccounts(accountsRes)
      setTransactions(transactionsRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      if (preserveScroll && scrollY > 0 && typeof window !== 'undefined') {
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY)))
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="text-gray-500">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/me/finance"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← К финансам
        </Link>
        <Link
          href="/me/transactions/new"
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Новая транзакция
        </Link>
      </div>
      <TransactionsList
        transactions={transactions}
        accounts={accounts}
        onRefresh={fetchData}
        onTransactionAdded={(t) => setTransactions(prev => [t, ...prev])}
      />
    </div>
  )
}
