import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Search, ChevronRight, Truck, Gauge, DollarSign } from 'lucide-react'
import { StatusBadge, TrafficLight, HealthBar } from '../components/ui/StatusBadge'

const TYPE_LABELS = {
  TRUCK: 'Camión',
  LOADER: 'Cargador',
  EXCAVATOR: 'Excavadora',
  CRANE: 'Grúa',
  FORKLIFT: 'Horquilla',
  PICKUP: 'Pickup',
  OTHER: 'Otro',
}

const fmt = (n) =>
  n != null && !Number.isNaN(Number(n))
    ? `$${Math.round(n).toLocaleString('es-CL')}`
    : '—'

function normalizeText(v) {
  return String(v || '').toLowerCase().trim()
}

function getTiresPerEquipment(eq) {
  const raw = String(eq?.type || eq?.name || '').toUpperCase()
  if (raw.includes('8X4')) return 12
  if (raw.includes('6X4')) return 10
  if (raw.includes('4X2')) return 6
  if (raw.includes('TRUCK')) return 10
  return 6
}

function getFallbackBrandCostPerKm(brand) {
  const b = String(brand || '').toUpperCase()
  if (b.includes('GOODYEAR')) return 0.818
  if (b.includes('MICHELIN')) return 0.79
  if (b.includes('BRIDGESTONE')) return 0.81
  if (b.includes('CHINO')) return 0.909
  return 0.88
}

export default function FleetPage() {
  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/equipments')

        if (!Array.isArray(res.data)) {
          console.error('Equipments inválido:', res.data)
          setEquipments([])
        } else {
          setEquipments(res.data)
        }
      } catch (err) {
        console.error('FleetPage load error:', err)
        setEquipments([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const enrichedEquipments = useMemo(() => {
    return equipments.map((eq) => {
      const tires = Array.isArray(eq?.tires) ? eq.tires : []

      const tiresCount = tires.length || getTiresPerEquipment(eq)

      let totalCostPerKm = 0
      let matched = 0

      for (const tire of tires) {
        const brand = tire?.brand || ''
        const cost = getFallbackBrandCostPerKm(brand)
        totalCostPerKm += cost
        matched++
      }

      const avgCostPerKm = matched > 0 ? totalCostPerKm / matched : 0.88
      const kmYear = 100000

      const ahorroVsChino = Math.max(
        0,
        (0.909 - avgCostPerKm) * kmYear * tiresCount
      )

      return {
        ...eq,
        tiresCount,
        avgCostPerKm,
        avgCostPer1000Km: avgCostPerKm * 1000,
        ahorroVsChino,
      }
    })
  }, [equipments])

  const filtered = useMemo(() => {
    return enrichedEquipments.filter((eq) => {
      const haystack = [
        eq?.name,
        eq?.code,
        eq?.location,
        eq?.type,
      ]
        .map(normalizeText)
        .join(' ')

      const matchSearch = !search || haystack.includes(normalizeText(search))
      const matchFilter = filter === 'ALL' || eq?.overallStatus === filter

      return matchSearch && matchFilter
    })
  }, [enrichedEquipments, search, filter])

  const fleetSavings = useMemo(() => {
    return filtered.reduce((sum, eq) => sum + Number(eq.ahorroVsChino || 0), 0)
  }, [filtered])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-white">

      <div>
        <h1 className="text-xl font-semibold">Flota</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gestión y análisis de equipos
        </p>
      </div>

      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <div className="flex gap-3">
          <DollarSign className="text-emerald-400" />
          <div>
            <p className="text-sm text-zinc-400">Ahorro anual estimado</p>
            <p className="text-2xl font-bold mt-1">{fmt(fleetSavings)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="input pl-8"
            placeholder="Buscar equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {['ALL', 'OK', 'WARNING', 'CRITICAL'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs ${
                filter === f
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400'
              }`}
            >
              {f === 'ALL' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Truck size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No hay equipos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((eq) => {
            const total = eq.tires?.length || eq.tiresCount || 0
            const critical = eq.criticalTires ?? 0
            const warning = eq.warningTires ?? 0
            const ok = total - critical - warning

            const health = total > 0 ? Math.round((ok / total) * 100) : 0

            return (
              <Link
                key={eq.id}
                to={`/equipments/${eq.id}`}
                className="card flex items-center gap-4 hover:border-zinc-700 transition"
              >
                <TrafficLight status={eq.overallStatus} />

                <div className="flex-1">
                  <div className="flex gap-3 items-center">
                    <p className="font-medium">{eq.name}</p>
                    <span className="text-xs text-zinc-500">{eq.code}</span>
                    <span className="text-xs text-zinc-500">
                      {TYPE_LABELS[eq.type] || eq.type}
                    </span>
                  </div>

                  <div className="mt-2 max-w-xs">
                    <HealthBar value={health} />
                  </div>

                  <div className="text-xs mt-1 text-zinc-500">
                    {total === 0
                      ? 'Sin datos de neumáticos'
                      : `${ok}/${total} OK`}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-zinc-500">Costo/km</p>
                      <p>{eq.avgCostPerKm.toFixed(3)}</p>
                    </div>

                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-zinc-500">Costo/1000km</p>
                      <p>{fmt(eq.avgCostPer1000Km)}</p>
                    </div>

                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-zinc-500">Ahorro</p>
                      <p className="text-emerald-400">{fmt(eq.ahorroVsChino)}</p>
                    </div>
                  </div>
                </div>

                <StatusBadge status={eq.overallStatus} />
                <ChevronRight size={14} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}