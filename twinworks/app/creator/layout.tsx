import Link from 'next/link'
import { CreatorSidebar } from '@/components/creator/CreatorSidebar'

export const dynamic = 'force-dynamic'

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-zinc-200">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center h-14 px-6 gap-8">
          <Link href="/me/dashboard" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
            #NBD
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-white font-medium">Контент</span>
        </div>
      </header>
      <div className="flex">
        <aside className="w-56 shrink-0 border-r border-white/5 min-h-[calc(100vh-3.5rem)] py-6 px-4">
          <CreatorSidebar />
        </aside>
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
