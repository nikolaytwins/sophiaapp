'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  if (pathname === '/login') return null

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      /* ignore */
    }
    window.location.href = '/login'
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/me/dashboard" className="text-xl font-bold text-gray-900">
                #NBD
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/me/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/me/dashboard'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Дашборд
              </Link>
              <Link
                href="/agency"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname?.startsWith('/agency')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Агентство
              </Link>
              <Link
                href="/impulse"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname?.startsWith('/impulse')
                    ? 'border-purple-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Импульс
              </Link>
              <Link
                href="/me/finance"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/me/finance' ||
                  pathname?.startsWith('/me/finance/') ||
                  pathname?.startsWith('/me/accounts') ||
                  pathname?.startsWith('/me/history')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Финансы
              </Link>
              <Link
                href="/me/transactions"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname?.startsWith('/me/transactions')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Транзакции
              </Link>
              <Link
                href="/me/checklist"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/me/checklist' || pathname?.startsWith('/me/planning')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Планирование
              </Link>
              <Link
                href="/me/planning-goals"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/me/planning-goals'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Цели
              </Link>
              <Link
                href="/creator"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname?.startsWith('/creator')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Контент
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pathname?.startsWith('/neo') ? (
              <a
                href="/api/neo/reset"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
              >
                Обычный вид
              </a>
            ) : (
              <a
                href="/neo/agency"
                className="text-xs text-gray-500 hover:text-blue-600 hidden sm:inline"
              >
                Neo UI
              </a>
            )}
            <span className="text-xs text-gray-400 hidden sm:inline">Twinworks</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
