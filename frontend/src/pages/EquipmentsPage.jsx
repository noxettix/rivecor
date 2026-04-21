import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { StatusBadge, TrafficLight, HealthBar } from '../components/ui/StatusBadge'
import { Search, ChevronRight, Truck } from 'lucide-react'

const TYPE_LABELS = {
  TRUCK: 'Camión', LOADER: 'Cargador', EXCAVATOR: 'Excavadora',
  CRANE: 'Grúa', FORKLIFT: 'Horquilla', PICKUP: 'Pickup', OTHER: 'Otro'
}

export default function EquipmentsPage() {
  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    api.get('/equipments')
      .then(r => setEquipments(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = equipments.filter(eq => {
    const matchSearch = !search || eq.name.toLowerCase().includes(search.toLowerCase()) || eq.code.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || eq.overallStatus === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Equipos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{equipments.length} equipos registrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input className="input pl-8" placeholder="Buscar equipo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {['ALL', 'OK', 'WARNING', 'CRITICAL'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}>
              {f === 'ALL' ? 'Todos' : f === 'OK' ? 'OK' : f === 'WARNING' ? 'Revisar' : 'Crítico'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Truck size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No hay equipos con ese filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(eq => {
            const total = eq.tires?.length ?? 0
            const critical = eq.criticalTires ?? 0
            const warning = eq.warningTires ?? 0
            const ok = total - critical - warning
            const health = total > 0 ? Math.round((ok / total) * 100) : 100

            return (
              <Link key={eq.id} to={`/equipments/${eq.id}`}
                className="card flex items-center gap-4 hover:border-zinc-700 transition-colors group">
                <TrafficLight status={eq.overallStatus} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">{eq.name}</p>
                    <span className="text-xs text-zinc-600 font-mono">{eq.code}</span>
                    <span className="text-xs text-zinc-600">{TYPE_LABELS[eq.type] || eq.type}</span>
                    {eq.location && <span className="text-xs text-zinc-600">📍 {eq.location}</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 max-w-xs">
                      <HealthBar value={health} />
                    </div>
                    <div className="flex gap-3 text-[11px]">
                      {critical > 0 && <span className="text-red-400">⚠ {critical} crítico</span>}
                      {warning > 0  && <span className="text-amber-400">● {warning} revisar</span>}
                      <span className="text-zinc-500">{ok}/{total} OK</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={eq.overallStatus} />
                  <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
