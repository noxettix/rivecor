import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { Plus, Search, ChevronDown, ChevronUp, Check, X, ArrowRight } from 'lucide-react'

// ─── Configuración del ciclo de vida ─────────────────────────
const LIFECYCLE = {
  NEW_AVAILABLE: {
    label: 'Nuevo en bodega',
    color: 'emerald',
    dot: 'bg-emerald-400',
    badge: 'badge-ok',
    icon: '🆕',
  },
  INSTALLED: {
    label: 'Instalado',
    color: 'blue',
    dot: 'bg-blue-400',
    badge:
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium',
    icon: '🔩',
  },
  WITHDRAWN: {
    label: 'Retirado (en bodega)',
    color: 'amber',
    dot: 'bg-amber-400',
    badge: 'badge-warning',
    icon: '📦',
  },
  IN_REPAIR: {
    label: 'En reparación',
    color: 'purple',
    dot: 'bg-purple-400',
    badge:
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-xs font-medium',
    icon: '🔧',
  },
  REPAIRED_AVAILABLE: {
    label: 'Reparado en bodega',
    color: 'teal',
    dot: 'bg-teal-400',
    badge:
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 text-xs font-medium',
    icon: '♻️',
  },
  SCRAPPED: {
    label: 'Desecho (REP)',
    color: 'zinc',
    dot: 'bg-zinc-500',
    badge:
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 text-xs font-medium',
    icon: '🗑️',
  },
}

const EVENT_LABELS = {
  PURCHASE: '📥 Ingreso a bodega',
  INSTALL: '🔩 Instalación #1',
  WITHDRAW: '📦 Retirado del equipo',
  START_REPAIR: '🔧 Inicio reparación',
  FINISH_REPAIR: '✅ Reparación completada',
  REINSTALL: '🔩 Instalación #2',
  SCRAP: '🗑️ Enviado a desecho',
}

const ACTIONS = {
  NEW_AVAILABLE: ['install'],
  INSTALLED: ['withdraw'],
  WITHDRAWN: ['startRepair', 'scrap'],
  IN_REPAIR: ['finishRepair'],
  REPAIRED_AVAILABLE: ['install'],
  SCRAPPED: [],
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

export default function StockPage() {
  const storedUser = getStoredUser()
  const role = storedUser?.role || storedUser?.user?.role || null

  // Para no bloquear el módulo si todavía no está bien armado el AuthProvider
  const isAdmin = role ? role === 'ADMIN' || role === 'OPERATOR' : true

  const [data, setData] = useState({ tires: [], summary: {} })
  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [actionModal, setActionModal] = useState(null)
  const [showEntry, setShowEntry] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const params = tab !== 'all' ? `?lifecycle=${tab}` : ''

      const [stockRes, eqRes] = await Promise.allSettled([
        api.get(`/stock${params}`),
        api.get('/equipments'),
      ])

      if (stockRes.status === 'fulfilled') {
        setData({
          tires: normalizeArray(stockRes.value?.data?.tires),
          summary:
            stockRes.value?.data?.summary && typeof stockRes.value.data.summary === 'object'
              ? stockRes.value.data.summary
              : {},
        })
      } else {
        console.error('Error cargando /stock:', stockRes.reason)
        setData({ tires: [], summary: {} })
        setError('No se pudo cargar el inventario de neumáticos.')
      }

      if (eqRes.status === 'fulfilled') {
        setEquipments(normalizeArray(eqRes.value?.data))
      } else {
        console.error('Error cargando /equipments:', eqRes.reason)
        setEquipments([])
      }
    } catch (err) {
      console.error('Error general en StockPage:', err)
      setData({ tires: [], summary: {} })
      setEquipments([])
      setError('Ocurrió un error al cargar el módulo de stock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tab])

  const filtered = useMemo(() => {
    const tires = normalizeArray(data?.tires)
    const q = search.trim().toLowerCase()

    if (!q) return tires

    return tires.filter((t) => {
      const code = String(t?.code || '').toLowerCase()
      const brand = String(t?.brand || '').toLowerCase()
      const size = String(t?.size || '').toLowerCase()
      const model = String(t?.model || '').toLowerCase()

      return (
        code.includes(q) ||
        brand.includes(q) ||
        size.includes(q) ||
        model.includes(q)
      )
    })
  }, [data?.tires, search])

  const s = data?.summary || {}

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventario de neumáticos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Ciclo de vida completo — nuevo → reparado → desecho
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowEntry(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} /> Nuevo neumático
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card overflow-x-auto">
        <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">
          Ciclo de vida
        </p>

        <div className="flex items-center gap-1 min-w-max">
          {[
            { key: 'NEW_AVAILABLE', count: s.newAvailable || 0 },
            { arrow: true },
            { key: 'INSTALLED', count: s.installed || 0 },
            { arrow: true },
            { key: 'WITHDRAWN', count: s.withdrawn || 0 },
            { arrow: true },
            { key: 'IN_REPAIR', count: s.inRepair || 0 },
            { arrow: true },
            { key: 'REPAIRED_AVAILABLE', count: s.repairedAvailable || 0 },
            { arrow: true },
            { key: 'SCRAPPED', count: s.scrapped || 0 },
          ].map((item, i) => {
            if (item.arrow) {
              return (
                <ArrowRight
                  key={i}
                  size={14}
                  className="text-zinc-600 shrink-0"
                />
              )
            }

            const lc = LIFECYCLE[item.key]

            return (
              <button
                key={item.key}
                onClick={() => setTab(tab === item.key ? 'all' : item.key)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-all ${
                  tab === item.key
                    ? 'border-zinc-500 bg-zinc-800'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span className="text-xl mb-1">{lc.icon}</span>
                <span className="text-lg font-bold text-white">{item.count}</span>
                <span className="text-[10px] text-zinc-500 text-center max-w-[80px] leading-tight">
                  {lc.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          className="input pl-8"
          placeholder="Buscar código, marca, modelo o medida..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">⭕</p>
          <p className="text-sm text-zinc-500">Sin neumáticos en este estado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tire) => (
            <TireCard
              key={tire.id}
              tire={tire}
              isAdmin={isAdmin}
              isSelected={selected === tire.id}
              onToggle={() => setSelected(selected === tire.id ? null : tire.id)}
              onAction={(action) => setActionModal({ tire, action })}
            />
          ))}
        </div>
      )}

      {actionModal && (
        <ActionModal
          tire={actionModal.tire}
          action={actionModal.action}
          equipments={equipments}
          onClose={() => setActionModal(null)}
          onDone={() => {
            setActionModal(null)
            load()
          }}
        />
      )}

      {showEntry && (
        <EntryModal
          onClose={() => setShowEntry(false)}
          onSaved={() => {
            setShowEntry(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function TireCard({ tire, isAdmin, isSelected, onToggle, onAction }) {
  const lc = LIFECYCLE[tire.lifecycle] || LIFECYCLE.NEW_AVAILABLE
  const actions = ACTIONS[tire.lifecycle] || []
  const lastEvent = Array.isArray(tire.events) && tire.events.length > 0 ? tire.events[0] : null

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        isSelected ? 'border-zinc-700' : 'border-zinc-800'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <span className="text-2xl shrink-0">{lc.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white font-mono">
              {tire.code || 'SIN-CODIGO'}
            </span>
            <span className="text-xs text-zinc-500">·</span>
            <span className="text-xs text-zinc-400">
              {tire.brand || 'Sin marca'} {tire.size || ''}
            </span>

            {(tire.installCount || 0) > 0 && (
              <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                {tire.installCount}ª instalación
              </span>
            )}
          </div>

          {lastEvent && (
            <p className="text-xs text-zinc-600 mt-0.5">
              {EVENT_LABELS[lastEvent.event] || lastEvent.event} ·{' '}
              {lastEvent.performedAt
                ? new Date(lastEvent.performedAt).toLocaleDateString('es-CL')
                : 'Sin fecha'}
            </p>
          )}
        </div>

        <span className={lc.badge}>{lc.label}</span>
        {isSelected ? (
          <ChevronUp size={14} className="text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-zinc-500 shrink-0" />
        )}
      </button>

      {isSelected && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            {tire.purchasePrice ? (
              <Detail
                label="Precio compra"
                value={`$${Number(tire.purchasePrice).toLocaleString('es-CL')}`}
              />
            ) : null}

            {tire.dot ? <Detail label="DOT" value={tire.dot} /> : null}

            <Detail label="Instalaciones" value={`${tire.installCount || 0} / 2`} />
          </div>

          {Array.isArray(tire.events) && tire.events.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Historial</p>

              <div className="space-y-1.5">
                {tire.events
                  .slice()
                  .reverse()
                  .map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2 text-xs">
                      <span className="text-zinc-600 shrink-0 mt-0.5">
                        {ev.performedAt
                          ? new Date(ev.performedAt).toLocaleDateString('es-CL', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Sin fecha'}
                      </span>

                      <span className="text-zinc-300">
                        {EVENT_LABELS[ev.event] || ev.event}
                      </span>

                      {ev.equipmentName && (
                        <span className="text-zinc-500">
                          — {ev.equipmentName}
                          {ev.position ? ` (${ev.position})` : ''}
                        </span>
                      )}

                      {ev.repairCost ? (
                        <span className="text-zinc-500">
                          — Costo: ${Number(ev.repairCost).toLocaleString('es-CL')}
                        </span>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isAdmin && actions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {actions.includes('install') && (
                <ActionBtn
                  label="🔩 Instalar en equipo"
                  onClick={() => onAction('install')}
                />
              )}
              {actions.includes('withdraw') && (
                <ActionBtn
                  label="📦 Registrar retiro"
                  onClick={() => onAction('withdraw')}
                />
              )}
              {actions.includes('startRepair') && (
                <ActionBtn
                  label="🔧 Iniciar reparación"
                  onClick={() => onAction('startRepair')}
                />
              )}
              {actions.includes('finishRepair') && (
                <ActionBtn
                  label="✅ Reparación lista"
                  onClick={() => onAction('finishRepair')}
                  primary
                />
              )}
              {actions.includes('scrap') && (
                <ActionBtn
                  label="🗑️ Enviar a desecho (REP)"
                  onClick={() => onAction('scrap')}
                  danger
                />
              )}
            </div>
          )}

          {(tire.installCount || 0) >= 2 && tire.lifecycle === 'WITHDRAWN' && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
              ⚠ Este neumático ya fue instalado 2 veces — solo puede ir a desecho
              (REP)
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-zinc-600 text-[10px] mb-0.5">{label}</p>
      <p className="text-zinc-300 font-medium">{value}</p>
    </div>
  )
}

function ActionBtn({ label, onClick, primary, danger }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
        primary
          ? 'bg-brand-600 hover:bg-brand-500 text-white'
          : danger
          ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30'
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
      }`}
    >
      {label}
    </button>
  )
}

function ActionModal({ tire, action, equipments, onClose, onDone }) {
  const [form, setForm] = useState({})
  const [submitting, setSub] = useState(false)

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const configs = {
    install: {
      title: 'Instalar en equipo',
      btn: 'Confirmar instalación',
      primary: true,
    },
    withdraw: {
      title: 'Registrar retiro',
      btn: 'Confirmar retiro',
      primary: false,
    },
    startRepair: {
      title: 'Iniciar reparación',
      btn: 'Iniciar reparación',
      primary: true,
    },
    finishRepair: {
      title: 'Reparación completada',
      btn: 'Marcar como reparado ✅',
      primary: true,
    },
    scrap: {
      title: 'Enviar a desecho (REP)',
      btn: 'Confirmar desecho',
      danger: true,
    },
  }

  const cfg = configs[action]

  const submit = async () => {
    setSub(true)

    try {
      const endpoints = {
        install: `/stock/${tire.id}/install`,
        withdraw: `/stock/${tire.id}/withdraw`,
        startRepair: `/stock/${tire.id}/start-repair`,
        finishRepair: `/stock/${tire.id}/finish-repair`,
        scrap: `/stock/${tire.id}/scrap`,
      }

      await api.post(endpoints[action], form)
      onDone()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Error')
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{cfg.title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">
              {tire.code} — {tire.brand} {tire.size}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {action === 'install' && (
            <>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Equipo *</label>
                <select
                  required
                  className="input"
                  value={form.equipmentId || ''}
                  onChange={(e) => set('equipmentId', e.target.value)}
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
                <label className="text-xs text-zinc-400 mb-1 block">Posición *</label>
                <input
                  className="input"
                  placeholder="ej: Delantera Izquierda, FL..."
                  value={form.position || ''}
                  onChange={(e) => set('position', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Precio de venta ($)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="ej: 480000"
                  value={form.salePrice || ''}
                  onChange={(e) => set('salePrice', e.target.value)}
                />
              </div>
            </>
          )}

          {action === 'withdraw' && (
            <>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Equipo del que se retira
                </label>
                <select
                  className="input"
                  value={form.equipmentId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value
                    const eq = equipments.find((item) => item.id === selectedId)
                    set('equipmentId', selectedId)
                    set('equipmentName', eq?.name || '')
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Posición</label>
                <input
                  className="input"
                  placeholder="ej: Delantera Izquierda"
                  value={form.position || ''}
                  onChange={(e) => set('position', e.target.value)}
                />
              </div>
            </>
          )}

          {action === 'finishRepair' && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">
                Costo de la reparación ($)
              </label>
              <input
                type="number"
                className="input"
                placeholder="ej: 85000"
                value={form.repairCost || ''}
                onChange={(e) => set('repairCost', e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
            <textarea
              className="input h-16 resize-none"
              placeholder="Observaciones..."
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancelar
          </button>

          <button
            onClick={submit}
            disabled={submitting}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              cfg.danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : cfg.primary
                ? 'btn-primary'
                : 'bg-zinc-700 hover:bg-zinc-600 text-white'
            }`}
          >
            {submitting ? 'Procesando...' : cfg.btn}
          </button>
        </div>
      </div>
    </div>
  )
}

function EntryModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    code: '',
    brand: '',
    model: '',
    size: '',
    dot: '',
    purchasePrice: '',
    supplier: '',
    notes: '',
    quantity: 1,
  })

  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    api
      .get('/stock/next-code')
      .then((r) => set('code', r?.data?.code || ''))
      .catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/stock', form)
      onSaved()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 rounded-t-2xl">
          <h3 className="text-sm font-semibold text-white">
            Registrar neumático nuevo
          </h3>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Código *</label>
            <input
              required
              className="input font-mono"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Cantidad</label>
            <input
              type="number"
              min="1"
              max="50"
              className="input"
              value={form.quantity}
              onChange={(e) => set('quantity', parseInt(e.target.value || '1', 10))}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Marca *</label>
            <input
              required
              className="input"
              placeholder="Michelin..."
              value={form.brand}
              onChange={(e) => set('brand', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Modelo</label>
            <input
              className="input"
              placeholder="XDA2+"
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Medida *</label>
            <input
              required
              className="input"
              placeholder="315/80R22.5"
              value={form.size}
              onChange={(e) => set('size', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">DOT</label>
            <input
              className="input"
              placeholder="3423"
              value={form.dot}
              onChange={(e) => set('dot', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              Precio compra ($)
            </label>
            <input
              type="number"
              className="input"
              placeholder="450000"
              value={form.purchasePrice}
              onChange={(e) => set('purchasePrice', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Proveedor</label>
            <input
              className="input"
              placeholder="Michelin Chile"
              value={form.supplier}
              onChange={(e) => set('supplier', e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
            <textarea
              className="input h-14 resize-none"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Check size={14} />
              {loading
                ? 'Guardando...'
                : `Registrar ${
                    form.quantity > 1 ? `${form.quantity} neumáticos` : 'neumático'
                  }`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}