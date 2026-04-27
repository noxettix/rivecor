import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import {
  Truck,
  Users,
  HardHat,
  Boxes,
  AlertTriangle,
  ChevronRight,
  DollarSign,
  Activity,
  Wrench,
} from 'lucide-react'

const fmt = (n) =>
  n != null && !Number.isNaN(Number(n))
    ? `$${Math.round(n).toLocaleString('es-CL')}`
    : '—'

function getFallbackBrandCostPerKm(brand) {
  const b = String(brand || '').toUpperCase()

  if (b.includes('MICHELIN')) return 0.79
  if (b.includes('GOODYEAR')) return 0.818
  if (b.includes('BRIDGESTONE')) return 0.81
  if (b.includes('PIRELLI')) return 0.84
  if (b.includes('CHINO')) return 0.909

  return 0.88
}

function getTiresPerEquipment(eq) {
  const raw = String(eq?.type || eq?.name || eq?.code || '').toUpperCase()
  if (raw.includes('8X4')) return 12
  if (raw.includes('6X4')) return 10
  if (raw.includes('4X2')) return 6
  if (raw.includes('TRUCK')) return 10
  if (raw.includes('CAMION')) return 10
  return 6
}

function equipmentAvgCostPerKm(eq) {
  const tires = Array.isArray(eq?.tires) ? eq.tires : []

  if (!tires.length) return 0.88

  const total = tires.reduce((sum, t) => {
    return sum + getFallbackBrandCostPerKm(t?.brand)
  }, 0)

  return total / tires.length
}

function getEquipmentSavings(eq) {
  const tiresCount =
    Array.isArray(eq?.tires) && eq.tires.length > 0
      ? eq.tires.length
      : getTiresPerEquipment(eq)

  const kmYear = Number(eq?.annualKm || eq?.yearlyKm || 100000)
  const avgCost = equipmentAvgCostPerKm(eq)

  return Math.max(0, (0.909 - avgCost) * kmYear * tiresCount)
}

function SectionCard({ title, icon, right, children }) {
  return (
    <div className="rounded-3xl border border-yellow-500/10 bg-zinc-950/95 p-5 shadow-[0_0_20px_rgba(234,179,8,0.04)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon, tone = 'yellow' }) {
  const tones = {
    yellow: 'text-yellow-300 border-yellow-500/10 bg-zinc-950/95',
    blue: 'text-sky-300 border-sky-500/10 bg-zinc-950/95',
    red: 'text-red-300 border-red-500/10 bg-zinc-950/95',
    emerald: 'text-emerald-300 border-emerald-500/10 bg-zinc-950/95',
    zinc: 'text-zinc-200 border-zinc-800 bg-zinc-950/95',
  }

  return (
    <div className={`rounded-3xl border p-5 shadow-[0_0_20px_rgba(234,179,8,0.03)] ${tones[tone] || tones.yellow}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-3 text-4xl font-black text-white">{value}</p>
          {subtitle && <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>}
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/30 p-3">
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  )
}

function TrafficLights({ critical = 0, warning = 0, ok = 0 }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-4 w-4 rounded-full ${
          critical > 0
            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
            : 'border border-zinc-700 bg-zinc-800'
        }`}
        title={`Críticos: ${critical}`}
      />
      <div
        className={`h-4 w-4 rounded-full ${
          warning > 0
            ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
            : 'border border-zinc-700 bg-zinc-800'
        }`}
        title={`Revisión: ${warning}`}
      />
      <div
        className={`h-4 w-4 rounded-full ${
          ok > 0
            ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]'
            : 'border border-zinc-700 bg-zinc-800'
        }`}
        title={`OK: ${ok}`}
      />
    </div>
  )
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [mechanics, setMechanics] = useState([])
  const [equipments, setEquipments] = useState([])
  const [stock, setStock] = useState({ tires: [], summary: {} })

  useEffect(() => {
    const load = async () => {
  try {
    const { data } = await api.get('/dashboard')

    setClients(Array.isArray(data?.clients) ? data.clients : [])
    setMechanics(Array.isArray(data?.mechanics) ? data.mechanics : [])
    setEquipments(Array.isArray(data?.equipments) ? data.equipments : [])
    setStock(
      data?.stock && typeof data.stock === 'object'
        ? data.stock
        : { tires: [], summary: {} }
    )
  } catch (err) {
    console.error('AdminDashboard load error:', err)
    setClients([])
    setMechanics([])
    setEquipments([])
    setStock({ tires: [], summary: {} })
  } finally {
    setLoading(false)
  }
}

    load()
  }, [])

  const summary = stock?.summary || {}

  const fleetStats = useMemo(() => {
    const totalEquipments = equipments.length

    const totalCritical = equipments.reduce(
      (sum, eq) => sum + Number(eq?.criticalTires || 0),
      0
    )
    const totalWarning = equipments.reduce(
      (sum, eq) => sum + Number(eq?.warningTires || 0),
      0
    )

    const totalTires = equipments.reduce((sum, eq) => {
      const tires = Array.isArray(eq?.tires) ? eq.tires.length : 0
      const fallback = tires > 0 ? 0 : getTiresPerEquipment(eq)
      return sum + (tires || fallback)
    }, 0)

    const totalOk = Math.max(0, totalTires - totalCritical - totalWarning)

    const healthScore =
      totalTires > 0 ? Math.round((totalOk / totalTires) * 100) : 0

    const totalSavings = equipments.reduce(
      (sum, eq) => sum + Number(getEquipmentSavings(eq) || 0),
      0
    )

    return {
      totalEquipments,
      totalCritical,
      totalWarning,
      totalOk,
      totalTires,
      healthScore,
      totalSavings,
    }
  }, [equipments])

  const topClients = useMemo(() => {
    return [...clients]
      .map((c) => ({
        ...c,
        equipmentsCount: Number(c?._count?.equipments || 0),
        usersCount: Array.isArray(c?.users) ? c.users.length : 0,
      }))
      .sort((a, b) => b.equipmentsCount - a.equipmentsCount)
      .slice(0, 5)
  }, [clients])

  const topMechanics = useMemo(() => {
    return [...mechanics]
      .map((m) => ({
        ...m,
        maintenancesCount: Number(m?._count?.maintenances || 0),
      }))
      .sort((a, b) => b.maintenancesCount - a.maintenancesCount)
      .slice(0, 5)
  }, [mechanics])

  const recentEquipments = useMemo(() => {
    return [...equipments].slice(0, 5)
  }, [equipments])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="h-10 w-10 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="rounded-3xl border border-yellow-500/10 bg-zinc-950/95 p-6 shadow-[0_0_30px_rgba(234,179,8,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-yellow-400">Panel administrativo · Rivecor</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Visión general de la operación
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Estado de flota, clientes, mecánicos e inventario en un solo lugar.
              </p>
            </div>

            <Link
              to="/fleet"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              <Truck size={16} />
              Ver flota
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <KpiCard
            title="Equipos"
            value={equipments.length}
            subtitle="Flota registrada"
            icon={<Truck className="text-yellow-400" size={24} />}
            tone="yellow"
          />

          <KpiCard
            title="Mecánicos"
            value={mechanics.length}
            subtitle="Personal activo"
            icon={<HardHat className="text-sky-300" size={24} />}
            tone="blue"
          />

          <KpiCard
            title="Clientes"
            value={clients.length}
            subtitle="Empresas activas"
            icon={<Users className="text-emerald-300" size={24} />}
            tone="emerald"
          />

          <KpiCard
            title="Stock disponible"
            value={summary.availableTotal ?? 0}
            subtitle="Neumáticos en bodega"
            icon={<Boxes className="text-zinc-200" size={24} />}
            tone="zinc"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-yellow-500/10 bg-zinc-950/95 p-6 shadow-[0_0_25px_rgba(234,179,8,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-400">Estado general de la flota</p>
                <p className="mt-3 text-5xl font-black text-white">{fleetStats.healthScore}%</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Salud global calculada según neumáticos críticos, revisión y OK.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 p-3">
                <Activity className="text-yellow-400" size={28} />
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-900">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  fleetStats.healthScore >= 80
                    ? 'bg-yellow-400'
                    : fleetStats.healthScore >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.max(0, Math.min(fleetStats.healthScore, 100))}%`,
                }}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Semáforo</p>
                <div className="mt-2">
                  <TrafficLights
                    critical={fleetStats.totalCritical}
                    warning={fleetStats.totalWarning}
                    ok={fleetStats.totalOk}
                  />
                </div>
              </div>

              <MiniMetric label="Críticos" value={fleetStats.totalCritical} />
              <MiniMetric label="Revisión" value={fleetStats.totalWarning} />
              <MiniMetric label="OK" value={fleetStats.totalOk} />
              <MiniMetric label="Total neumáticos" value={fleetStats.totalTires} />
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-500/10 bg-zinc-950/95 p-6 shadow-[0_0_25px_rgba(234,179,8,0.04)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 p-3">
                <DollarSign className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Ahorro anual estimado</p>
                <p className="mt-3 text-4xl font-black text-yellow-300">
                  {fmt(fleetStats.totalSavings)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Comparado contra una alternativa económica base.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniMetric label="Nuevo en bodega" value={summary.newAvailable ?? 0} />
              <MiniMetric label="Instalados" value={summary.installed ?? 0} />
              <MiniMetric label="Retirados" value={summary.withdrawn ?? 0} />
              <MiniMetric label="En reparación" value={summary.inRepair ?? 0} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            title="Clientes destacados"
            icon={<Users className="text-yellow-400" size={18} />}
            right={
              <Link
                to="/clients"
                className="inline-flex items-center gap-1 text-sm font-medium text-yellow-400 hover:text-yellow-300"
              >
                Ver clientes <ChevronRight size={14} />
              </Link>
            }
          >
            {topClients.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay clientes registrados.</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((client) => (
                  <div
                    key={client.id}
                    className="rounded-2xl border border-zinc-800 bg-black/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{client.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">RUT: {client.rut}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{client.equipmentsCount}</p>
                        <p className="text-xs text-zinc-500">equipos</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Mecánicos"
            icon={<HardHat className="text-yellow-400" size={18} />}
            right={
              <Link
                to="/mechanics"
                className="inline-flex items-center gap-1 text-sm font-medium text-yellow-400 hover:text-yellow-300"
              >
                Ver mecánicos <ChevronRight size={14} />
              </Link>
            }
          >
            {topMechanics.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay mecánicos registrados.</p>
            ) : (
              <div className="space-y-3">
                {topMechanics.map((mechanic) => (
                  <div
                    key={mechanic.id}
                    className="rounded-2xl border border-zinc-800 bg-black/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{mechanic.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {mechanic.speciality || 'Sin especialidad'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {mechanic.maintenancesCount || 0}
                        </p>
                        <p className="text-xs text-zinc-500">mantenciones</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Equipos recientes"
          icon={<Truck className="text-yellow-400" size={18} />}
          right={
            <Link
              to="/fleet"
              className="inline-flex items-center gap-1 text-sm font-medium text-yellow-400 hover:text-yellow-300"
            >
              Ver flota <ChevronRight size={14} />
            </Link>
          }
        >
          {recentEquipments.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay equipos registrados.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentEquipments.map((eq) => {
                const critical = Number(eq?.criticalTires || 0)
                const warning = Number(eq?.warningTires || 0)
                const tires = Array.isArray(eq?.tires) ? eq.tires : []
                const total = tires.length || getTiresPerEquipment(eq)
                const ok = Math.max(0, total - critical - warning)

                return (
                  <Link
                    key={eq.id}
                    to={`/equipments/${eq.id}`}
                    className="block rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">{eq.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{eq.code}</p>
                      </div>

                      <TrafficLights critical={critical} warning={warning} ok={ok} />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniMetric label="Tipo" value={eq.type || '—'} />
                      <MiniMetric label="Marca" value={eq.primaryBrand || 'Sin datos'} />
                      <MiniMetric label="Ahorro" value={fmt(getEquipmentSavings(eq))} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Acciones rápidas"
          icon={<Wrench className="text-yellow-400" size={18} />}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link
              to="/clients"
              className="rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20"
            >
              <p className="text-sm font-semibold text-zinc-100">Gestionar clientes</p>
              <p className="mt-1 text-xs text-zinc-500">Empresas, usuarios y contratos</p>
            </Link>

            <Link
              to="/mechanics"
              className="rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20"
            >
              <p className="text-sm font-semibold text-zinc-100">Gestionar mecánicos</p>
              <p className="mt-1 text-xs text-zinc-500">Personal técnico y accesos</p>
            </Link>

            <Link
              to="/fleet"
              className="rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20"
            >
              <p className="text-sm font-semibold text-zinc-100">Ver flota</p>
              <p className="mt-1 text-xs text-zinc-500">Salud de equipos y costos</p>
            </Link>

            <Link
              to="/stock"
              className="rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20"
            >
              <p className="text-sm font-semibold text-zinc-100">Inventario</p>
              <p className="mt-1 text-xs text-zinc-500">Neumáticos en bodega</p>
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}