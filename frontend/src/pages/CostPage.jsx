import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, TrendingDown, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'

export default function CostPage() {
  const { equipmentId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/costs/equipment/${equipmentId}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [equipmentId])

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!data) return null

  const { equipment, summary, tires } = data

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to={`/equipments/${equipmentId}`} className="btn-ghost p-2 mt-0.5"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-semibold text-white">Costo x Kilómetro</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{equipment.name} · {equipment.code}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Inversión total" value={formatCLP(summary.totalInvestment)} icon={<DollarSign size={16} />} color="zinc" />
        <KpiCard label="Costo total/km" value={`$${summary.totalCostPerKm}/km`} icon={<TrendingDown size={16} />} color="brand" />
        <KpiCard label="Km acumulados" value={summary.totalKm?.toLocaleString()} icon={<span className="text-base">📍</span>} color="zinc" />
        <KpiCard label="Vida útil prom." value={`${summary.avgLifeUsedPct}%`} icon={<span className="text-base">⏱</span>}
          color={summary.avgLifeUsedPct >= 80 ? 'red' : summary.avgLifeUsedPct >= 60 ? 'amber' : 'zinc'} />
      </div>

      {/* Tires breakdown */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Trazabilidad por neumático</h2>
        <div className="space-y-3">
          {tires.map(({ tire, analysis: a }) => (
            <TireCostRow key={tire.id} tire={tire} a={a} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TireCostRow({ tire, a }) {
  const [open, setOpen] = useState(false)
  const lifeColor = a.lifeUsedPct >= 90 ? 'text-red-400' : a.lifeUsedPct >= 70 ? 'text-amber-400' : 'text-emerald-400'
  const barColor = a.lifeUsedPct >= 90 ? 'bg-red-500' : a.lifeUsedPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/40 transition-colors text-left">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          tire.status === 'CRITICAL' ? 'bg-red-400' : tire.status === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'
        }`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">{tire.position}</p>
          <p className="text-xs text-zinc-500">{tire.brand} · {tire.size}</p>
        </div>

        {/* Key metrics inline */}
        <div className="hidden sm:flex items-center gap-6 text-xs text-zinc-400">
          {a.purchasePrice > 0 && <span>{formatCLP(a.totalCost)} total</span>}
          {a.costPerKm && <span className="font-mono text-zinc-300">${a.costPerKm}/km</span>}
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(a.lifeUsedPct, 100)}%` }} />
            </div>
            <span className={`${lifeColor} font-medium text-[11px]`}>{a.lifeUsedPct}%</span>
          </div>
        </div>

        <span className="text-zinc-600 ml-2">{open ? '∧' : '∨'}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailMetric label="Precio compra" value={formatCLP(a.purchasePrice)} />
          <DetailMetric label="Costo mantención" value={formatCLP(a.maintenanceCost)} />
          <DetailMetric label="Costo total" value={formatCLP(a.totalCost)} bold />
          <DetailMetric label="Km actuales" value={a.currentKm?.toLocaleString()} />
          <DetailMetric label="Km máximos" value={a.maxKm?.toLocaleString()} />
          <DetailMetric label="Km restantes" value={a.remainingKm?.toLocaleString()} />
          <DetailMetric label="Costo/km actual" value={a.costPerKm ? `$${a.costPerKm}` : '—'} mono />
          <DetailMetric label="Costo/km proyectado" value={a.projectedTotalCostPerKm ? `$${a.projectedTotalCostPerKm}` : '—'} mono />

          {a.pressureLossPct > 0 && (
            <div className="col-span-2 md:col-span-4 flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={13} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300">
                Pérdida estimada por presión: <strong>+{a.pressureLossPct}%</strong> en costo operacional
              </p>
            </div>
          )}

          <div className="col-span-2 md:col-span-4 flex items-center gap-2 p-2.5 bg-zinc-800 rounded-lg">
            {a.lifeUsedPct >= 80
              ? <AlertTriangle size={13} className="text-amber-400 shrink-0" />
              : <CheckCircle size={13} className="text-emerald-400 shrink-0" />}
            <p className="text-xs text-zinc-300">{a.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, color }) {
  const colors = {
    brand: 'text-brand-400 bg-brand-500/10',
    red:   'text-red-400 bg-red-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    zinc:  'text-zinc-400 bg-zinc-800',
  }
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-xl font-semibold text-white mt-1">{value ?? '—'}</p>
        </div>
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

function DetailMetric({ label, value, bold, mono }) {
  return (
    <div>
      <p className="text-[11px] text-zinc-500 mb-0.5">{label}</p>
      <p className={`text-sm ${bold ? 'font-semibold text-white' : 'text-zinc-300'} ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function formatCLP(n) {
  if (!n && n !== 0) return '—'
  return `$${Math.round(n).toLocaleString('es-CL')}`
}
