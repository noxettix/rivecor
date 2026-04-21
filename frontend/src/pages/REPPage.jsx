import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { Plus, FileText, ExternalLink, Check } from 'lucide-react'

const REASON_MAP = {
  WEAR: 'Desgaste normal',
  DAMAGE: 'Daño / accidente',
  PRESSURE: 'Falla por presión',
  OTHER: 'Otro',
}

const CONDITION_MAP = {
  WORN: 'Desgastado',
  DAMAGED: 'Dañado',
  REPAIRABLE: 'Reparable',
}

const STATUS_MAP = {
  REGISTERED: 'Registrado',
  SENT_TO_DISPOSAL: 'Enviado',
  CERTIFIED: 'Certificado',
}

const STATUS_CLS = {
  REGISTERED: 'badge-warning',
  SENT_TO_DISPOSAL:
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium',
  CERTIFIED: 'badge-ok',
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function getStoredUser() {
  const candidates = [
    localStorage.getItem('user'),
    localStorage.getItem('authUser'),
    localStorage.getItem('rivecor_user'),
    sessionStorage.getItem('user'),
    sessionStorage.getItem('authUser'),
    sessionStorage.getItem('rivecor_user'),
  ]

  for (const raw of candidates) {
    if (!raw) continue
    const parsed = safeJsonParse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  }

  return null
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function initialForm() {
  return {
    tireId: '',
    equipmentId: '',
    reason: 'WEAR',
    condition: 'WORN',
    weightKg: '',
    disposalPoint: '',
    disposalEntity: '',
    invoiceNumber: '',
    notes: '',
  }
}

export default function REPPage() {
  const storedUser = getStoredUser()
  const role = storedUser?.role || storedUser?.user?.role || null
  const isAdmin = role ? role === 'ADMIN' || role === 'OPERATOR' : true

  const [records, setRecords] = useState([])
  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [form, setForm] = useState(initialForm())
  const [tires, setTires] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingTires, setLoadingTires] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [repRes, eqRes] = await Promise.allSettled([
        api.get('/rep'),
        api.get('/equipments'),
      ])

      if (repRes.status === 'fulfilled') {
        setRecords(normalizeArray(repRes.value?.data))
      } else {
        console.error('Error cargando /rep:', repRes.reason)
        setRecords([])
        setError('No se pudo cargar el registro REP.')
      }

      if (eqRes.status === 'fulfilled') {
        setEquipments(normalizeArray(eqRes.value?.data))
      } else {
        console.error('Error cargando /equipments:', eqRes.reason)
        setEquipments([])
      }
    } catch (err) {
      console.error('Error general en REPPage:', err)
      setRecords([])
      setEquipments([])
      setError('Ocurrió un error al cargar la vista REP.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const loadTires = async (equipmentId) => {
    if (!equipmentId) {
      setTires([])
      return
    }

    setLoadingTires(true)

    try {
      const { data } = await api.get(`/tires/equipment/${equipmentId}`)
      setTires(normalizeArray(data))
    } catch (err) {
      console.error('Error cargando neumáticos del equipo:', err)
      setTires([])
      alert('No se pudieron cargar los neumáticos del equipo.')
    } finally {
      setLoadingTires(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()

    if (!form.tireId || !form.equipmentId) {
      alert('Selecciona equipo y neumático')
      return
    }

    setSubmitting(true)

    try {
      await api.post('/rep', {
        ...form,
        weightKg: form.weightKg === '' ? null : Number(form.weightKg),
      })

      setShowForm(false)
      setForm(initialForm())
      setTires([])
      load()
    } catch (err) {
      console.error('Error registrando REP:', err)
      alert(err?.response?.data?.error || 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const openReport = () => {
    window.open(`/api/rep/report?year=${year}`, '_blank')
  }

  const totalWeight = useMemo(() => {
    return records.reduce((sum, r) => sum + Number(r?.weightKg || 0), 0)
  }, [records])

  const totalRegistered = records.filter((r) => r.status === 'REGISTERED').length
  const totalCertified = records.filter((r) => r.status === 'CERTIFIED').length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Registro REP</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Ley 20.920 — Disposición final de neumáticos
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <select
              className="input w-28 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={openReport}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <FileText size={14} />
              Reporte auditoría
              <ExternalLink size={12} className="text-zinc-600" />
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={14} />
              Registrar retiro
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{records.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Total retirados</p>
        </div>

        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{totalWeight.toFixed(0)} kg</p>
          <p className="text-xs text-zinc-500 mt-1">Peso total</p>
        </div>

        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-400">{totalRegistered}</p>
          <p className="text-xs text-zinc-500 mt-1">Pendientes envío</p>
        </div>

        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalCertified}</p>
          <p className="text-xs text-zinc-500 mt-1">Certificados</p>
        </div>
      </div>

      {showForm && isAdmin && (
        <div className="card border-brand-600/30">
          <h3 className="text-sm font-semibold text-white mb-4">
            Registrar retiro de neumático
          </h3>

          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Equipo *</label>
              <select
                required
                className="input"
                value={form.equipmentId}
                onChange={(e) => {
                  const equipmentId = e.target.value
                  setForm((p) => ({ ...p, equipmentId, tireId: '' }))
                  loadTires(equipmentId)
                }}
              >
                <option value="">Seleccionar equipo...</option>
                {equipments.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Neumático *</label>
              <select
                required
                className="input"
                value={form.tireId}
                onChange={(e) => setForm((p) => ({ ...p, tireId: e.target.value }))}
                disabled={!form.equipmentId || loadingTires}
              >
                <option value="">
                  {loadingTires ? 'Cargando neumáticos...' : 'Seleccionar neumático...'}
                </option>
                {tires.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.position} — {t.brand} {t.size}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Motivo de retiro</label>
              <select
                className="input"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              >
                {Object.entries(REASON_MAP).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Condición</label>
              <select
                className="input"
                value={form.condition}
                onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
              >
                {Object.entries(CONDITION_MAP).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="ej: 25.5"
                value={form.weightKg}
                onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">N° Guía / Factura</label>
              <input
                className="input"
                placeholder="ej: GD-00123"
                value={form.invoiceNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, invoiceNumber: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Punto de disposición</label>
              <input
                className="input"
                placeholder="ej: Centro de reciclaje Remac"
                value={form.disposalPoint}
                onChange={(e) =>
                  setForm((p) => ({ ...p, disposalPoint: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Empresa gestora</label>
              <input
                className="input"
                placeholder="ej: Gestitec, Remac"
                value={form.disposalEntity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, disposalEntity: e.target.value }))
                }
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
              <textarea
                className="input h-20 resize-none"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setForm(initialForm())
                  setTires([])
                }}
                className="btn-ghost"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
              >
                <Check size={14} />
                {submitting ? 'Guardando...' : 'Registrar retiro'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">♻️</p>
          <p className="text-sm text-zinc-500">Sin registros de retiro aún</p>
          <p className="text-xs text-zinc-600 mt-1">
            Los neumáticos retirados aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">
            Neumáticos retirados ({records.length})
          </h2>

          <div className="space-y-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 p-3 bg-zinc-800/40 rounded-lg border border-zinc-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-zinc-200">
                      {r.equipment?.name || 'Sin equipo'}
                    </p>
                    <span className="text-xs text-zinc-600">·</span>
                    <p className="text-xs text-zinc-400">
                      {r.tire?.position || 'Sin posición'} — {r.tire?.brand || 'Sin marca'}{' '}
                      {r.tire?.size || ''}
                    </p>
                  </div>

                  <div className="flex gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                    <span>{REASON_MAP[r.reason] || r.reason}</span>
                    {r.weightKg ? <span>· {r.weightKg} kg</span> : null}
                    {r.disposalEntity ? <span>· {r.disposalEntity}</span> : null}
                    <span>
                      ·{' '}
                      {r.retiredAt
                        ? new Date(r.retiredAt).toLocaleDateString('es-CL')
                        : 'Sin fecha'}
                    </span>
                  </div>
                </div>

                <span className={STATUS_CLS[r.status] || 'badge-warning'}>
                  {STATUS_MAP[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}