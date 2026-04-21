import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  AlertTriangle,
  Truck,
  ChevronRight,
  TrendingDown,
  DollarSign,
  Gauge,
  Wrench,
  BarChart3,
} from 'lucide-react'

const fmt = (n) =>
  n != null && !Number.isNaN(Number(n))
    ? `$${Math.round(n).toLocaleString('es-CL')}`
    : '—'

function getTiresPerEquipment(eq) {
  const raw = String(eq?.type || eq?.name || eq?.code || '').toUpperCase()
  if (raw.includes('8X4')) return 12
  if (raw.includes('6X4')) return 10
  if (raw.includes('4X2')) return 6
  if (raw.includes('TRUCK')) return 10
  if (raw.includes('CAMION')) return 10
  if (raw.includes('TRACTO')) return 10
  return 6
}

function getFallbackBrandCostPerKm(brand) {
  const b = String(brand || '').toUpperCase()

  if (b.includes('MICHELIN')) return 0.79
  if (b.includes('GOODYEAR')) return 0.818
  if (b.includes('BRIDGESTONE')) return 0.81
  if (b.includes('PIRELLI')) return 0.84
  if (b.includes('CHINO')) return 0.909

  return 0.88
}

function calculateWearPct(tire) {
  const current = Number(tire?.currentDepth || tire?.depthAfter || 0)
  const initial = Number(tire?.initialDepth || tire?.depthBefore || 0)
  const min = Number(tire?.minDepth || 3)

  if (initial > min && current >= 0) {
    const usable = initial - min
    const used = initial - current
    const pct = (used / usable) * 100
    return Math.max(0, Math.min(100, pct))
  }

  if (current > 0) {
    const fallbackPct = ((25 - current) / (25 - 3)) * 100
    return Math.max(0, Math.min(100, fallbackPct))
  }

  return null
}

function getHealthPct(eq) {
  const tires = Array.isArray(eq?.tires) ? eq.tires : []
  const total = tires.length || Number(eq?.tiresCount || 0)
  const critical = Number(eq?.criticalTires || 0)
  const warning = Number(eq?.warningTires || 0)
  const ok = Math.max(0, total - critical - warning)

  if (total <= 0) return 0
  return Math.round((ok / total) * 100)
}

function groupAlerts(alerts = []) {
  return {
    critical: alerts.filter((a) => a?.status === 'CRITICAL'),
    warning: alerts.filter((a) => a?.status !== 'CRITICAL'),
  }
}

function equipmentPrimaryBrand(eq) {
  const tires = Array.isArray(eq?.tires) ? eq.tires : []
  const counter = {}

  tires.forEach((t) => {
    const brand = String(t?.brand || 'Sin marca').trim()
    counter[brand] = (counter[brand] || 0) + 1
  })

  const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || 'Sin datos'
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
  const ahorro = Math.max(0, (0.909 - avgCost) * kmYear * tiresCount)

  return ahorro
}

function statusTone(health) {
  if (health >= 80) return 'ok'
  if (health >= 50) return 'warning'
  return 'critical'
}

function toneClasses(tone) {
  if (tone === 'ok') {
    return {
      text: 'text-yellow-300',
      bar: 'bg-yellow-400',
      badge: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
    }
  }

  if (tone === 'warning') {
    return {
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    }
  }

  return {
    text: 'text-red-400',
    bar: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-300 border border-red-500/30',
  }
}

function TrafficLights({ critical = 0, warning = 0, ok = 0, size = 'md' }) {
  const base = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${base} rounded-full ${
          critical > 0
            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
            : 'bg-zinc-800 border border-zinc-700'
        }`}
        title={`Críticos: ${critical}`}
      />
      <div
        className={`${base} rounded-full ${
          warning > 0
            ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
            : 'bg-zinc-800 border border-zinc-700'
        }`}
        title={`Revisión: ${warning}`}
      />
      <div
        className={`${base} rounded-full ${
          ok > 0
            ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]'
            : 'bg-zinc-800 border border-zinc-700'
        }`}
        title={`OK: ${ok}`}
      />
    </div>
  )
}

function SectionCard({ title, icon, children, right }) {
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

function MetricChip({ label, value, tone = 'default' }) {
  const cls =
    tone === 'critical'
      ? 'border-red-500/20 bg-red-500/10 text-red-300'
      : tone === 'warning'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
      : tone === 'highlight'
      ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
      : 'border-zinc-800 bg-black/30 text-zinc-300'

  return (
    <div className={`rounded-2xl border px-3 py-2 ${cls}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState({})
  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingEquipments, setLoadingEquipments] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        const dashboardRes = await api
          .get('/dashboard/client')
          .catch(() => ({ data: {} }))

        if (!mounted) return
        setData(dashboardRes?.data || {})
      } catch (err) {
        console.error('Dashboard summary error:', err)
        if (mounted) setData({})
      } finally {
        if (mounted) setLoading(false)
      }
    }

    async function loadEquipments() {
      try {
        const equipmentsRes = await api
          .get('/equipments')
          .catch(() => ({ data: [] }))

        if (!mounted) return
        setEquipments(Array.isArray(equipmentsRes?.data) ? equipmentsRes.data : [])
      } catch (err) {
        console.error('Dashboard equipments error:', err)
        if (mounted) setEquipments([])
      } finally {
        if (mounted) setLoadingEquipments(false)
      }
    }

    loadDashboard()
    loadEquipments()

    return () => {
      mounted = false
    }
  }, [])

  const summary = data?.summary || {}
  const alerts = Array.isArray(data?.alerts) ? data.alerts : []
  const recentMaintenances = Array.isArray(data?.recentMaintenances)
    ? data.recentMaintenances
    : []

  const groupedAlerts = useMemo(() => groupAlerts(alerts), [alerts])

  const enrichedEquipments = useMemo(() => {
    return equipments.map((eq) => {
      const tires = Array.isArray(eq?.tires) ? eq.tires : []
      const wearValues = tires
        .map((t) => calculateWearPct(t))
        .filter((v) => v != null)

      const avgWear =
        wearValues.length > 0
          ? wearValues.reduce((a, b) => a + b, 0) / wearValues.length
          : null

      const avgCostPerKm = equipmentAvgCostPerKm(eq)
      const ahorro = getEquipmentSavings(eq)
      const primaryBrand = equipmentPrimaryBrand(eq)
      const health = getHealthPct(eq)

      return {
        ...eq,
        avgWear,
        avgCostPerKm,
        avgCostPer1000Km: avgCostPerKm * 1000,
        ahorro,
        primaryBrand,
        health,
      }
    })
  }, [equipments])

  const fleetSavings = useMemo(() => {
    return enrichedEquipments.reduce((sum, eq) => sum + Number(eq.ahorro || 0), 0)
  }, [enrichedEquipments])

  const brandRanking = useMemo(() => {
    const map = {}

    enrichedEquipments.forEach((eq) => {
      const tires = Array.isArray(eq?.tires) ? eq.tires : []

      tires.forEach((t) => {
        const brand = String(t?.brand || 'Sin marca').trim().toUpperCase()
        const wear = calculateWearPct(t)
        const costPerKm = getFallbackBrandCostPerKm(brand)

        if (!map[brand]) {
          map[brand] = {
            brand,
            count: 0,
            totalWear: 0,
            wearCount: 0,
            totalCost: 0,
          }
        }

        map[brand].count += 1
        map[brand].totalCost += costPerKm

        if (wear != null) {
          map[brand].totalWear += wear
          map[brand].wearCount += 1
        }
      })
    })

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgCostPerKm: item.count > 0 ? item.totalCost / item.count : 0,
        avgWear: item.wearCount > 0 ? item.totalWear / item.wearCount : null,
      }))
      .sort((a, b) => a.avgCostPerKm - b.avgCostPerKm)
      .slice(0, 5)
  }, [enrichedEquipments])

  const topSavings = useMemo(() => {
    return [...enrichedEquipments]
      .sort((a, b) => Number(b.ahorro || 0) - Number(a.ahorro || 0))
      .slice(0, 5)
  }, [enrichedEquipments])

  const wearChart = useMemo(() => {
    return [...enrichedEquipments]
      .filter((eq) => eq.avgWear != null)
      .sort((a, b) => Number(b.avgWear || 0) - Number(a.avgWear || 0))
      .slice(0, 6)
  }, [enrichedEquipments])

  const totalEquipments = enrichedEquipments.length
  const totalCritical = enrichedEquipments.reduce(
    (sum, eq) => sum + Number(eq?.criticalTires || 0),
    0
  )
  const totalWarning = enrichedEquipments.reduce(
    (sum, eq) => sum + Number(eq?.warningTires || 0),
    0
  )

  const computedHealth =
    totalEquipments > 0
      ? Math.round(
          enrichedEquipments.reduce((sum, eq) => sum + Number(eq.health || 0), 0) /
            totalEquipments
        )
      : 0

  const healthScore = Number(summary.healthScore ?? computedHealth)

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
              <p className="text-sm font-medium text-yellow-400">Sistema Rivecor · Control de flota</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Bienvenido {user?.name ? user.name.split(' ')[0] : 'Usuario'}
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Vista general de tu operación, alertas críticas y rendimiento económico.
              </p>
            </div>

            <Link
              to="/request-maintenance"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              <Wrench size={16} />
              Solicitar mantención
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="xl:col-span-2 rounded-3xl border border-yellow-500/10 bg-zinc-950/95 p-6 shadow-[0_0_25px_rgba(234,179,8,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-400">Estado general de la flota</p>
                <p className="mt-3 text-5xl font-black text-white">{healthScore}%</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Salud global basada en equipos y neumáticos disponibles.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 p-3">
                <Gauge className="text-yellow-400" size={28} />
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-900">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  healthScore >= 80
                    ? 'bg-yellow-400'
                    : healthScore >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(healthScore, 100))}%` }}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Semáforo general</p>
                <div className="mt-2">
                  <TrafficLights
                    critical={groupedAlerts.critical.length || totalCritical}
                    warning={groupedAlerts.warning.length || totalWarning}
                    ok={healthScore > 0 ? totalEquipments : 0}
                  />
                </div>
              </div>

              <MetricChip
                label="Equipos"
                value={loadingEquipments ? '...' : totalEquipments}
                tone="default"
              />

              <MetricChip
                label="Alertas críticas"
                value={groupedAlerts.critical.length}
                tone={groupedAlerts.critical.length > 0 ? 'critical' : 'default'}
              />

              <MetricChip
                label="Alertas revisión"
                value={groupedAlerts.warning.length}
                tone={groupedAlerts.warning.length > 0 ? 'warning' : 'default'}
              />
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
                  {loadingEquipments ? '...' : fmt(fleetSavings)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Comparado contra una alternativa económica base.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-500/10 bg-zinc-950/95 p-6 shadow-[0_0_25px_rgba(234,179,8,0.04)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 p-3">
                <TrendingDown className="text-yellow-400" size={24} />
              </div>
              <div className="w-full">
                <p className="text-sm text-zinc-400">Comparativa rápida</p>
                <div className="mt-3 space-y-2">
                  <p className="text-base">
                    <span className="text-zinc-400">Chino:</span>{' '}
                    <span className="font-bold text-white">0.909/km</span>
                  </p>
                  <p className="text-base">
                    <span className="text-zinc-400">Goodyear:</span>{' '}
                    <span className="font-bold text-white">0.818/km</span>
                  </p>
                  <p className="text-sm font-medium text-yellow-400">
                    Diferencia: 0.091 por km
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            title="Alertas críticas"
            icon={<AlertTriangle className="text-red-400" size={18} />}
            right={
              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                {groupedAlerts.critical.length}
              </span>
            }
          >
            {groupedAlerts.critical.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-5 text-center">
                <p className="text-2xl">✅</p>
                <p className="mt-2 text-sm text-zinc-400">No hay alertas críticas ahora.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedAlerts.critical.slice(0, 4).map((a, i) => (
                  <Link
                    key={i}
                    to="/fleet"
                    className="block rounded-2xl border border-red-500/15 bg-red-500/5 p-4 transition hover:border-red-500/35"
                  >
                    <div className="flex items-start gap-3">
                      <TrafficLights critical={1} warning={0} ok={0} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-red-300">{a.message}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Alertas de revisión"
            icon={<AlertTriangle className="text-amber-400" size={18} />}
            right={
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                {groupedAlerts.warning.length}
              </span>
            }
          >
            {groupedAlerts.warning.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-5 text-center">
                <p className="text-2xl">🟡</p>
                <p className="mt-2 text-sm text-zinc-400">No hay alertas de revisión ahora.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedAlerts.warning.slice(0, 4).map((a, i) => (
                  <Link
                    key={i}
                    to="/fleet"
                    className="block rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 transition hover:border-amber-500/35"
                  >
                    <div className="flex items-start gap-3">
                      <TrafficLights critical={0} warning={1} ok={0} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-amber-300">{a.message}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            title="Gráfico real de desgaste"
            icon={<BarChart3 size={18} className="text-yellow-400" />}
          >
            {loadingEquipments ? (
              <p className="text-sm text-zinc-500">Cargando desgaste...</p>
            ) : wearChart.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aún no hay suficiente información de profundidad para construir el gráfico.
              </p>
            ) : (
              <div className="space-y-4">
                {wearChart.map((eq) => {
                  const pct = Math.round(eq.avgWear || 0)
                  const tone = pct >= 80 ? 'critical' : pct >= 60 ? 'warning' : 'ok'
                  const colors = toneClasses(tone)

                  return (
                    <div
                      key={eq.id}
                      className="rounded-2xl border border-zinc-800 bg-black/30 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-100">{eq.name}</p>
                          <p className="text-xs text-zinc-500">{eq.code}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <TrafficLights
                            critical={tone === 'critical' ? 1 : 0}
                            warning={tone === 'warning' ? 1 : 0}
                            ok={tone === 'ok' ? 1 : 0}
                            size="sm"
                          />
                          <span className={`text-sm font-bold ${colors.text}`}>{pct}%</span>
                        </div>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Ranking de marcas"
            icon={<TrendingDown size={18} className="text-yellow-400" />}
          >
            {loadingEquipments ? (
              <p className="text-sm text-zinc-500">Cargando ranking...</p>
            ) : brandRanking.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay marcas suficientes para comparar.</p>
            ) : (
              <div className="space-y-3">
                {brandRanking.map((brand, index) => (
                  <div
                    key={brand.brand}
                    className="rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">
                          {index === 0 ? '🏆 ' : ''}{brand.brand}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {brand.count} neumático{brand.count !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {fmt(brand.avgCostPerKm * 1000)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {brand.avgCostPerKm.toFixed(3)}/km
                        </p>
                      </div>
                    </div>

                    {brand.avgWear != null && (
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-zinc-500">
                          <span>Desgaste promedio</span>
                          <span>{Math.round(brand.avgWear)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                          <div
                            className="h-full rounded-full bg-yellow-400 transition-all duration-700"
                            style={{ width: `${Math.round(brand.avgWear)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            title="Top ahorro por camión"
            icon={<DollarSign size={18} className="text-yellow-400" />}
          >
            {loadingEquipments ? (
              <p className="text-sm text-zinc-500">Cargando ahorro...</p>
            ) : topSavings.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay datos suficientes para calcular ahorro.</p>
            ) : (
              <div className="space-y-3">
                {topSavings.map((eq, index) => (
                  <Link
                    key={eq.id}
                    to={`/equipments/${eq.id}`}
                    className="block rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">
                          #{index + 1} {eq.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {eq.code} · {eq.primaryBrand}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-300">
                          {fmt(eq.ahorro)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {fmt(eq.avgCostPer1000Km)} / 1.000 km
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Equipos"
            icon={<Truck size={18} className="text-yellow-400" />}
            right={
              <Link
                to="/fleet"
                className="inline-flex items-center gap-1 text-sm font-medium text-yellow-400 hover:text-yellow-300"
              >
                Ver todos <ChevronRight size={14} />
              </Link>
            }
          >
            {loadingEquipments ? (
              <p className="text-sm text-zinc-500">Cargando equipos...</p>
            ) : (
              <div className="space-y-3">
                {enrichedEquipments.slice(0, 4).map((eq) => {
                  const tires = Array.isArray(eq?.tires) ? eq.tires : []
                  const total = tires.length || getTiresPerEquipment(eq)
                  const critical = Number(eq?.criticalTires || 0)
                  const warning = Number(eq?.warningTires || 0)
                  const ok = Math.max(0, total - critical - warning)
                  const tone = statusTone(eq.health)
                  const colors = toneClasses(tone)

                  return (
                    <Link
                      key={eq.id}
                      to={`/equipments/${eq.id}`}
                      className="block rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-yellow-500/20 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-white">{eq.name}</p>
                          <p className="mt-1 text-sm text-zinc-500">{eq.code}</p>
                        </div>

                        <div className="text-right">
                          <p className={`text-sm font-bold ${colors.text}`}>{eq.health}%</p>
                          <p className="text-xs text-zinc-500">salud</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <TrafficLights critical={critical} warning={warning} ok={ok} />
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${colors.badge}`}>
                            {tone === 'ok' ? 'Operativo' : tone === 'warning' ? 'Revisión' : 'Crítico'}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                            style={{ width: `${Math.max(0, Math.min(eq.health, 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <MetricChip label="Marca" value={eq.primaryBrand} tone="default" />
                        <MetricChip label="Costo/km" value={eq.avgCostPerKm.toFixed(3)} tone="default" />
                        <MetricChip label="Ahorro" value={fmt(eq.ahorro)} tone="highlight" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {recentMaintenances.length > 0 && (
          <SectionCard
            title="Mantenciones recientes"
            icon={<Wrench size={18} className="text-yellow-400" />}
            right={
              <Link
                to="/request-maintenance"
                className="inline-flex items-center gap-1 text-sm font-medium text-yellow-400 hover:text-yellow-300"
              >
                Ver mantención <ChevronRight size={14} />
              </Link>
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              {recentMaintenances.slice(0, 4).map((m, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/10 p-2">
                      <Truck size={18} className="text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {m.equipmentName || 'Equipo'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {m.mechanicName || 'Sin mecánico'} ·{' '}
                        {m.date ? new Date(m.date).toLocaleDateString('es-CL') : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  )
}