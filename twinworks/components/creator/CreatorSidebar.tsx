'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/creator', label: 'Главная' },
  { href: '/creator/youtube', label: 'YouTube' },
  { href: '/creator/reels', label: 'Reels' },
  { href: '/creator/telegram', label: 'Telegram' },
  { href: '/creator/funnel', label: 'Воронка' },
  { href: '/creator/ideas', label: 'Идеи' },
  { href: '/creator/experiments', label: 'Эксперименты' },
  { href: '/creator/settings', label: 'Настройки' },
]

export function CreatorSidebar() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map(({ href, label }) => {
        const isActive = href === '/creator' ? pathname === '/creator' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
