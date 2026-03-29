'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import type { ChartDataPoint } from '@/types/creator'

interface ViewsChartProps {
  data: ChartDataPoint[]
  height?: number
  title?: string
}

export function ViewsChart({ data, height = 220, title = 'Просмотры по дням' }: ViewsChartProps) {
  const chartData = data.map((d) => ({ ...d, dateShort: d.date.slice(5) }))
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="dateShort" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
          <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: unknown) => [Number(value).toLocaleString(), 'Просмотры']} />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fill="url(#viewsGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
