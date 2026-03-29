interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  className?: string
}

export function MetricCard({ label, value, sub, className = '' }: MetricCardProps) {
  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] p-5 ${className}`}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      {sub != null && <p className="text-sm text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}
