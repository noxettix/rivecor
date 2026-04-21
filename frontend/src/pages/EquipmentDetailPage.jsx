import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { StatusBadge, TrafficLight } from '../components/ui/StatusBadge'
import { ArrowLeft, Wrench, AlertTriangle, CheckCircle, Info, TrendingDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function EquipmentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const isClient = user?.role === 'CLIENT'
  const [equipment, setEquipment] = useState(null)
  const [tires, setTires] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [requestModal, setRequestModal] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/equipments/${id}`),
      api.get(`/tires/equipment/${id}`)
    ]).then(([eqR, tiresR]) => {
      setEquipment(eqR.data)
      setTires(tiresR.data)
      if (tiresR.data.length > 0) setSelected(tiresR.data[0])
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!equipment) return <div className="p-6"><p className="text-zinc-500">Equipo no encontrado</p></div>

  const critical = tires.filter(t => t.status === 'CRITICAL').length
  const warning = tires.filter(t => t.status === 'WARNING').length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/equipments" className="btn-ghost p-2 mt-0.5">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-white">{equipment.name}</h1>
            <span className="text-xs text-zinc-600 font-mono">{equipment.code}</span>
            <StatusBadge status={tires.some(t=>t.status==='CRITICAL') ? 'CRITICAL' : tires.some(t=>t.status==='WARNING') ? 'WARNING' : 'OK'} />
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {equipment.brand} {equipment.model} {equipment.year && `· ${equipment.year}`}
            {equipment.location && ` · 📍 ${equipment.location}`}
          </p>
        </div>
        {!isClient && <button onClick={() => setRequestModal(true)} className="btn-primary flex items-center gap-2"><Wrench size={14} /> Solicitar mantención</button>}
      </div>

      {/* Alert banner */}
      {critical > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{critical} neumático{critical !== 1 ? 's' : ''} en estado crítico</strong> — requiere atención inmediata para evitar accidentes y pérdidas económicas.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Tire grid */}
        <div className="lg:col-span-3 card">
          <h2 className="text-sm font-semibold text-white mb-4">Neumáticos ({tires.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {tires.map(tire => (
              <button key={tire.id} onClick={() => setSelected(tire)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selected?.id === tire.id ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/50'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-zinc-300 truncate">{tire.position}</p>
                  <StatusBadge status={tire.status} />
                </div>
                {tire.brand && <p className="text-[11px] text-zinc-500">{tire.brand} · {tire.size}</p>}
                <div className="flex gap-3 mt-2 text-[11px]">
                  {tire.currentDepth && <span className="text-zinc-400">🔵 {tire.currentDepth}mm</span>}
                  {tire.pressure && <span className="text-zinc-400">💨 {tire.pressure} PSI</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {selected && <TireDetailPanel tire={selected} />}
        </div>
      </div>

      {/* Maintenance requests history */}
      {equipment.maintenanceRequests?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3">Solicitudes recientes</h2>
          <div className="space-y-2">
            {equipment.maintenanceRequests.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                <StatusDot status={r.status} />
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">{TYPE_MAP[r.type] || r.type}</p>
                  <p className="text-[11px] text-zinc-500">{r.description}</p>
                </div>
                <p className="text-[11px] text-zinc-500">{new Date(r.createdAt).toLocaleDateString('es-CL')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {requestModal && (
        <RequestModal equipmentId={id} equipmentName={equipment.name} onClose={() => setRequestModal(false)} />
      )}
    </div>
  )
}

function TireDetailPanel({ tire }) {
  const analysis = tire.analysis || {}
  const depthPct = tire.initialDepth ? Math.round(((tire.initialDepth - (tire.currentDepth || 0)) / tire.initialDepth) * 100) : null
  const mileagePct = tire.maxMileage ? Math.round(((tire.mileage || 0) / tire.maxMileage) * 100) : null

  return (
    <>
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <TrafficLight status={tire.status} />
          <div>
            <p className="text-sm font-semibold text-white">{tire.position}</p>
            <p className="text-xs text-zinc-500">{tire.brand} {tire.model} · {tire.size}</p>
          </div>
        </div>

        <div className="space-y-3">
          {tire.currentDepth !== null && tire.currentDepth !== undefined && (
            <Metric label="Profundidad surco" value={`${tire.currentDepth} mm`}
              sub="Mín. recomendado: 4mm" pct={depthPct ? 100 - depthPct : null}
              warning={tire.currentDepth < 5} critical={tire.currentDepth < 3} />
          )}
          {tire.pressure && (
            <Metric label="Presión actual" value={`${tire.pressure} PSI`}
              sub={`Recomendado: ${tire.recommendedPressure || '—'} PSI`}
              warning={tire.recommendedPressure && Math.abs(tire.pressure - tire.recommendedPressure) / tire.recommendedPressure > 0.10}
              critical={tire.recommendedPressure && Math.abs(tire.pressure - tire.recommendedPressure) / tire.recommendedPressure > 0.20} />
          )}
          {mileagePct !== null && (
            <Metric label="Kilometraje" value={`${(tire.mileage || 0).toLocaleString()} km`}
              sub={`Máx. ${tire.maxMileage?.toLocaleString()} km · ${mileagePct}% usado`}
              pct={mileagePct} warning={mileagePct > 80} critical={mileagePct > 95} />
          )}
        </div>
      </div>

      {/* Risk analysis */}
      {analysis.messages?.length > 0 && (
        <div className="card border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">Análisis de riesgo</p>
          </div>
          <div className="space-y-2">
            {analysis.messages.map((msg, i) => (
              <p key={i} className="text-xs text-zinc-300 leading-relaxed">{msg}</p>
            ))}
          </div>
          {analysis.estimatedLoss > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">Impacto estimado en costo operacional</p>
              <p className="text-sm font-semibold text-amber-400">+{analysis.estimatedLoss}% sobre consumo base</p>
            </div>
          )}
        </div>
      )}

      {tire.status === 'OK' && (
        <div className="card border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <p className="text-xs text-emerald-300">Neumático en buen estado</p>
          </div>
          {tire.lastInspection && (
            <p className="text-[11px] text-zinc-500 mt-1">
              Última inspección: {new Date(tire.lastInspection).toLocaleDateString('es-CL')}
            </p>
          )}
        </div>
      )}
    </>
  )
}

function Metric({ label, value, sub, pct, warning, critical }) {
  const barColor = critical ? 'bg-red-500' : warning ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-zinc-500">{label}</span>
        <span className={`text-xs font-medium ${critical ? 'text-red-400' : warning ? 'text-amber-400' : 'text-zinc-300'}`}>{value}</span>
      </div>
      {pct !== null && pct !== undefined && (
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
      <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  )
}

function StatusDot({ status }) {
  const colors = { PENDING: 'bg-zinc-500', SCHEDULED: 'bg-blue-400', IN_PROGRESS: 'bg-amber-400', COMPLETED: 'bg-emerald-400', CANCELLED: 'bg-zinc-600' }
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || 'bg-zinc-500'}`} />
}

const TYPE_MAP = {
  INSPECTION: 'Inspección', ROTATION: 'Rotación', REPLACEMENT: 'Reemplazo',
  PRESSURE_CHECK: 'Revisión de presión', EMERGENCY: 'Emergencia'
}

function RequestModal({ equipmentId, equipmentName, onClose }) {
  const [form, setForm] = useState({ type: 'INSPECTION', priority: 'NORMAL', description: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await api.post('/maintenance/requests', { equipmentId, ...form })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      alert(e.response?.data?.error || 'Error al enviar solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-medium">Solicitud enviada</p>
            <p className="text-sm text-zinc-500 mt-1">Rivecor coordinará la visita pronto</p>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-white mb-4">Solicitar mantención — {equipmentName}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Tipo</label>
                <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Prioridad</label>
                <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="LOW">Baja</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Descripción (opcional)</label>
                <textarea className="input h-20 resize-none" placeholder="Describe el problema o requerimiento..."
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={submit} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
