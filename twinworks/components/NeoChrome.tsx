'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Включает оформление Sophia-like (тёмный фон + синий акцент) для URL /neo/...
 */
export function NeoChrome() {
  const pathname = usePathname()

  useEffect(() => {
    const neo = pathname?.startsWith('/neo') ?? false
    document.documentElement.classList.toggle('neo-ui', neo)
    document.body.classList.toggle('neo-ui-body', neo)
  }, [pathname])

  return null
}
