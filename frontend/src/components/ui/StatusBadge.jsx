export function StatusBadge({ status }) {
  const m = {
    OK:       { cls: 'badge-ok',       dot: 'bg-emerald-400', label: 'OK' },
    WARNING:  { cls: 'badge-warning',  dot: 'bg-amber-400',   label: 'Revisar' },
    CRITICAL: { cls: 'badge-critical', dot: 'bg-red-400',     label: 'Crítico' },
    REPLACED: { cls: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 text-xs font-medium', dot: 'bg-zinc-400', label: 'Reemplazado' },
  }
  const s = m[status] || m.OK
  return <span className={s.cls}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>
}

export function TrafficLight({ status }) {
  const cfg = {
    OK:       'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    WARNING:  'bg-amber-400  shadow-[0_0_8px_rgba(251,191,36,0.7)]',
    CRITICAL: 'bg-red-400    shadow-[0_0_8px_rgba(248,113,113,0.7)]',
  }
  return (
    <div className="flex flex-col gap-1.5 items-center p-2 bg-zinc-800/50 rounded-xl border border-zinc-700">
      {['OK','WARNING','CRITICAL'].map(l => (
        <div key={l} className={`w-4 h-4 rounded-full transition-all ${status === l ? cfg[l] : 'bg-zinc-800'}`} />
      ))}
    </div>
  )
}

export function HealthBar({ value, className = '' }) {
  const c = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className={`h-1.5 bg-zinc-800 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-700 ${c}`} style={{ width: `${value}%` }} />
    </div>
  )
}
