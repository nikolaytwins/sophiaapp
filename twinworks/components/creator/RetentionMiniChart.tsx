'use client'

interface RetentionMiniChartProps {
  data: number[]
  height?: number
}

export function RetentionMiniChart({ data, height = 120 }: RetentionMiniChartProps) {
  if (!data?.length) return null
  const max = Math.max(...data)
  const points = data.map((v, i) => ({ x: (i / (data.length - 1)) * 100, y: (v / max) * 100 }))
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${100 - p.y}`).join(' ')
  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="retentionGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#retentionGrad)" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
