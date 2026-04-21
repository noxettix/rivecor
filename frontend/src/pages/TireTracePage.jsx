import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Download, ExternalLink } from 'lucide-react'

const fmt   = (n) => n != null ? `$${Math.round(n).toLocaleString('es-CL')}` : '—'
const fmtKm = (n) => n != null ? `${n.toLocaleString('es-CL')} km` : '—'
const fmtD  = (d) => d ? new Date(d).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' }) : '—'

// Íconos y colores por tipo de evento
const EVENT_CFG = {
  // Desde stock (lifecycle)
  PURCHASE:      { icon:'📥', label:'Ingreso a bodega',       color:'bg-zinc-700 text-zinc-300' },
  INSTALL:       { icon:'🔩', label:'Instalación #1',         color:'bg-brand-500/20 text-brand-300' },
  WITHDRAW:      { icon:'📦', label:'Retirado del equipo',    color:'bg-amber-500/20 text-amber-300' },
  START_REPAIR:  { icon:'🔧', label:'Inicio reparación',      color:'bg-purple-500/20 text-purple-300' },
  FINISH_REPAIR: { icon:'✅', label:'Reparación completada',  color:'bg-teal-500/20 text-teal-300' },
  REINSTALL:     { icon:'🔩', label:'Instalación #2',         color:'bg-brand-500/20 text-brand-300' },
  SCRAP:         { icon:'🗑️', label:'Enviado a desecho',      color:'bg-red-500/20 text-red-300' },
  // Desde inspecciones
  INSPECTION:    { icon:'🔍', label:'Inspección',             color:'bg-blue-500/20 text-blue-300' },
  INSPECTION_OK: { icon:'✓',  label:'Inspección — OK',        color:'bg-emerald-500/20 text-emerald-300' },
  INSPECTION_W:  { icon:'⚠',  label:'Inspección — Revisar',   color:'bg-amber-500/20 text-amber-300' },
  INSPECTION_C:  { icon:'🔴', label:'Inspección — Crítico',   color:'bg-red-500/20 text-red-300' },
}

export default function TireTracePage() {
  const { id } = useParams()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    // Buscar en stock primero, luego en tires activos
    Promise.all([
      api.get(`/stock/${id}`).catch(() => null),
      api.get(`/tires/${id}`).catch(() => null),
    ]).then(([stockTire, activeTire]) => {
      if (stockTire?.data) {
        buildFromStock(stockTire.data)
      } else if (activeTire?.data) {
        buildFromActiveTire(activeTire.data)
      } else {
        setError('Neumático no encontrado')
      }
    }).finally(() => setLoading(false))
  }, [id])

  const buildFromStock = (tire) => {
    const events = (tire.events || []).map(ev => ({
      id:       ev.id,
      date:     ev.performedAt,
      type:     ev.event,
      label:    EVENT_CFG[ev.event]?.label || ev.event,
      icon:     EVENT_CFG[ev.event]?.icon  || '•',
      color:    EVENT_CFG[ev.event]?.color || 'bg-zinc-700 text-zinc-300',
      detail:   buildEventDetail(ev),
      cost:     ev.repairCost || null,
      revenue:  ev.salePrice  || null,
    }))

    const totalCost    = (tire.purchasePrice || 0) + events.reduce((s,e) => s + (e.cost||0), 0)
    const totalRevenue = events.reduce((s,e) => s + (e.revenue||0), 0)
    const lastKm       = getLastKm(events)

    setData({
      code:        tire.code,
      brand:       tire.brand,
      model:       tire.model,
      size:        tire.size,
      dot:         tire.dot,
      lifecycle:   tire.lifecycle,
      installCount:tire.installCount,
      purchasePrice: tire.purchasePrice,
      events,
      summary: {
        totalCost,
        totalRevenue,
        profit: totalRevenue - totalCost,
        currentKm: lastKm,
        costPerKm: lastKm > 0 ? parseFloat((totalCost / lastKm).toFixed(2)) : null,
        revenuePerKm: lastKm > 0 ? parseFloat((totalRevenue / lastKm).toFixed(2)) : null,
      }
    })
  }

  const buildFromActiveTire = async (tire) => {
    const inspections = tire.inspections || []

    const events = [
      // Entrada
      {
        id: 'install',
        date: tire.installDate || tire.createdAt,
        type: 'INSTALL',
        label: 'Instalado en equipo',
        icon: '🔩',
        color: EVENT_CFG.INSTALL.color,
        detail: `${tire.equipment?.name} — posición: ${tire.position}`,
        cost: tire.purchasePrice || null,
      },
      // Inspecciones
      ...inspections.map(ins => {
        const type = ins.status === 'OK' ? 'INSPECTION_OK' : ins.status === 'WARNING' ? 'INSPECTION_W' : 'INSPECTION_C'
        return {
          id:     ins.id,
          date:   ins.inspectedAt,
          type,
          label:  EVENT_CFG[type].label,
          icon:   EVENT_CFG[type].icon,
          color:  EVENT_CFG[type].color,
          detail: buildInspectionDetail(ins),
          depth:  ins.depth,
          pressure: ins.pressure,
          mileage: ins.mileage,
        }
      })
    ].sort((a,b) => new Date(a.date) - new Date(b.date))

    const lastKm = tire.mileage || 0
    const totalCost = tire.purchasePrice || 0

    setData({
      code:         tire.notes?.match(/Stock: (\S+)/)?.[1] || `Posición ${tire.position}`,
      brand:        tire.brand,
      model:        tire.model,
      size:         tire.size,
      dot:          tire.dot,
      lifecycle:    tire.status === 'OK' ? 'INSTALLED' : tire.status,
      installCount: 1,
      purchasePrice: tire.purchasePrice,
      equipmentName: tire.equipment?.name,
      position:      tire.position,
      events,
      summary: {
        totalCost,
        totalRevenue: 0,
        profit: 0,
        currentKm: lastKm,
        costPerKm: lastKm > 0 ? parseFloat((totalCost / lastKm).toFixed(2)) : null,
        revenuePerKm: null,
      }
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="p-6">
      <Link to="/stock" className="btn-ghost flex items-center gap-2 w-fit mb-4">
        <ArrowLeft size={14} /> Volver
      </Link>
      <p className="text-zinc-500">{error}</p>
    </div>
  )

  const { events = [], summary = {} } = data

  const LIFECYCLE_LABELS = {
    NEW_AVAILABLE:      '🆕 Nuevo en bodega',
    INSTALLED:          '🔩 Instalado',
    WITHDRAWN:          '📦 Retirado',
    IN_REPAIR:          '🔧 En reparación',
    REPAIRED_AVAILABLE: '♻️ Reparado en bodega',
    SCRAPPED:           '🗑️ Desecho',
    OK:                 '✓ En uso',
    WARNING:            '⚠ Revisar',
    CRITICAL:           '🔴 Crítico',
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <Link to="/stock" className="btn-ghost flex items-center gap-2 w-fit text-sm">
        <ArrowLeft size={14} /> Volver al inventario
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-white font-mono">{data.code}</p>
            <p className="text-sm text-zinc-400 mt-1">{data.brand} {data.model} · {data.size}</p>
            {data.dot && <p className="text-xs text-zinc-600 mt-0.5">DOT: {data.dot}</p>}
            {data.equipmentName && <p className="text-xs text-brand-400 mt-1">📍 {data.equipmentName} — {data.position}</p>}
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-zinc-300">
              {LIFECYCLE_LABELS[data.lifecycle] || data.lifecycle}
            </span>
            <p className="text-xs text-zinc-500 mt-1">
              {data.installCount} instalación{data.installCount !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Summary económico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Costo total"     value={fmt(summary.totalCost)}     sub="compra + reparaciones" color="text-zinc-200" />
        <SummaryCard label="Ingresos"        value={fmt(summary.totalRevenue)}   sub="ventas"                color="text-emerald-400" show={summary.totalRevenue > 0} />
        <SummaryCard label="Km acumulados"   value={fmtKm(summary.currentKm)}   sub="recorridos"            color="text-blue-400" />
        <SummaryCard label="Costo / km"      value={summary.costPerKm ? `$${summary.costPerKm}` : '—'} sub="costo por km" color="text-amber-400" />
      </div>

      {/* Indicador de vida útil */}
      {data.purchasePrice && summary.currentKm > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-400">Eficiencia económica</p>
            <p className="text-xs text-zinc-500">
              {summary.revenuePerKm ? `Ingreso/km: $${summary.revenuePerKm}` : ''}
            </p>
          </div>
          <div className="space-y-2 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Precio de compra</span>
              <span className="text-zinc-200">{fmt(data.purchasePrice)}</span>
            </div>
            {summary.totalCost > data.purchasePrice && (
              <div className="flex justify-between">
                <span>Costos reparación</span>
                <span className="text-zinc-200">{fmt(summary.totalCost - data.purchasePrice)}</span>
              </div>
            )}
            {summary.totalRevenue > 0 && (
              <div className="flex justify-between border-t border-zinc-800 pt-2">
                <span>Ingresos generados</span>
                <span className="text-emerald-400 font-medium">{fmt(summary.totalRevenue)}</span>
              </div>
            )}
            {summary.profit !== 0 && summary.totalRevenue > 0 && (
              <div className="flex justify-between">
                <span>Margen</span>
                <span className={summary.profit >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                  {fmt(summary.profit)} ({summary.profit >= 0 ? '+' : ''}{summary.totalCost > 0 ? Math.round(summary.profit/summary.totalCost*100) : 0}%)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-5">
          Historial completo — {events.length} evento{events.length !== 1 ? 's' : ''}
        </h2>

        {events.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-6">Sin eventos registrados</p>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-5 top-4 bottom-4 w-px bg-zinc-800" />

            <div className="space-y-4">
              {events.map((ev, i) => (
                <div key={ev.id || i} className="flex items-start gap-4">
                  {/* Ícono */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 z-10 border-2 border-zinc-950 ${ev.color}`}>
                    {ev.icon}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{ev.label}</p>
                        {ev.detail && <p className="text-xs text-zinc-500 mt-0.5">{ev.detail}</p>}

                        {/* Métricas de inspección */}
                        {(ev.depth != null || ev.pressure != null || ev.mileage != null) && (
                          <div className="flex gap-3 mt-1.5 text-xs">
                            {ev.depth    != null && <MetricPill label="Surco"   value={`${ev.depth} mm`}   status={ev.depth < 3 ? 'critical' : ev.depth < 5 ? 'warning' : 'ok'} />}
                            {ev.pressure != null && <MetricPill label="Presión" value={`${ev.pressure} PSI`} status="ok" />}
                            {ev.mileage  != null && <MetricPill label="Km"      value={fmtKm(ev.mileage)}  status="ok" />}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-zinc-500">{fmtD(ev.date)}</p>
                        {ev.cost    != null && <p className="text-xs text-amber-400 mt-0.5">Costo: {fmt(ev.cost)}</p>}
                        {ev.revenue != null && <p className="text-xs text-emerald-400 mt-0.5">Venta: {fmt(ev.revenue)}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, color, show = true }) {
  if (!show) return null
  return (
    <div className="card text-center py-3">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  )
}

function MetricPill({ label, value, status }) {
  const colors = { ok:'bg-emerald-500/15 text-emerald-400', warning:'bg-amber-500/15 text-amber-400', critical:'bg-red-500/15 text-red-400' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status]||colors.ok}`}>
      {label}: {value}
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────
function buildEventDetail(ev) {
  const parts = []
  if (ev.equipmentName) parts.push(ev.equipmentName)
  if (ev.position)      parts.push(`posición: ${ev.position}`)
  if (ev.notes)         parts.push(ev.notes)
  return parts.join(' — ') || null
}

function buildInspectionDetail(ins) {
  const parts = []
  if (ins.depth    != null) parts.push(`Surco: ${ins.depth}mm`)
  if (ins.pressure != null) parts.push(`Presión: ${ins.pressure} PSI`)
  if (ins.mileage  != null) parts.push(`Km: ${ins.mileage.toLocaleString('es-CL')}`)
  if (ins.observations)     parts.push(ins.observations)
  return parts.join(' · ') || null
}

function getLastKm(events) {
  const inspEvents = events.filter(e => e.mileage != null)
  if (!inspEvents.length) return 0
  return Math.max(...inspEvents.map(e => e.mileage))
}
