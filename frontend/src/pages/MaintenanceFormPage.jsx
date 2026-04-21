import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { CheckCircle, Plus, Minus } from 'lucide-react'

const TYPE_MAP = { INSPECTION:'Inspección', ROTATION:'Rotación', REPLACEMENT:'Reemplazo', PRESSURE_CHECK:'Revisión de presión', EMERGENCY:'Emergencia' }

export default function MaintenanceFormPage({ mode }) {
  const navigate = useNavigate()
  const { id: maintenanceId } = useParams()
  const [searchParams] = useSearchParams()
  const requestId = searchParams.get('request')

  const [equipments, setEquipments] = useState([])
  const [mechanics, setMechanics] = useState([])
  const [tires, setTires] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const isComplete = mode === 'complete'

  const [form, setForm] = useState({
    equipmentId: '', requestId: requestId || '', mechanicId: '',
    type: 'INSPECTION', priority: 'NORMAL',
    plannedAt: '', plannedWork: '', estimatedHours: '',
    observations: '', workDone: '', hoursSpent: '', laborCost: '', partsCost: '',
    nextScheduled: '', nextNotes: '',
    tiresData: []
  })

  useEffect(() => {
    Promise.all([api.get('/equipments'), api.get('/mechanics')]).then(([e, m]) => {
      setEquipments(e.data); setMechanics(m.data)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (form.equipmentId) {
      api.get(`/tires/equipment/${form.equipmentId}`).then(r => {
        setTires(r.data)
        setForm(p => ({ ...p, tiresData: r.data.map(t => ({
          tireId: t.id, position: t.position, brand: t.brand, size: t.size,
          include: false, action: '', depthBefore: t.currentDepth || '', depthAfter: '',
          pressureBefore: t.pressure || '', pressureAfter: '', mileageBefore: t.mileage || '', mileageAfter: '', repairCost: ''
        })) }))
      })
    }
  }, [form.equipmentId])

  const updateTire = (tireId, field, value) => {
    setForm(p => ({ ...p, tiresData: p.tiresData.map(t => t.tireId === tireId ? { ...t, [field]: value } : t) }))
  }

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const tiresData = form.tiresData.filter(t => t.include).map(t => ({
        tireId: t.tireId, action: t.action,
        depthBefore: t.depthBefore ? parseFloat(t.depthBefore) : null,
        depthAfter: t.depthAfter ? parseFloat(t.depthAfter) : null,
        pressureBefore: t.pressureBefore ? parseFloat(t.pressureBefore) : null,
        pressureAfter: t.pressureAfter ? parseFloat(t.pressureAfter) : null,
        mileageBefore: t.mileageBefore ? parseInt(t.mileageBefore) : null,
        mileageAfter: t.mileageAfter ? parseInt(t.mileageAfter) : null,
        repairCost: t.repairCost ? parseFloat(t.repairCost) : null
      }))

      if (isComplete) {
        await api.post('/maintenance/complete', {
          maintenanceId, requestId: form.requestId, mechanicId: form.mechanicId || null,
          type: form.type, observations: form.observations, workDone: form.workDone,
          hoursSpent: form.hoursSpent ? parseFloat(form.hoursSpent) : null,
          laborCost: form.laborCost ? parseFloat(form.laborCost) : null,
          partsCost: form.partsCost ? parseFloat(form.partsCost) : null,
          nextScheduled: form.nextScheduled || null, nextNotes: form.nextNotes, tiresData
        })
      } else {
        await api.post('/maintenance/plan', {
          requestId: form.requestId || null, mechanicId: form.mechanicId || null,
          plannedAt: form.plannedAt || null, plannedWork: form.plannedWork,
          estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
          type: form.type
        })
      }
      setDone(true)
      setTimeout(() => navigate('/maintenance'), 1500)
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>

  if (done) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <CheckCircle size={48} className="text-brand-400 mx-auto mb-3"/>
        <p className="text-white font-medium">{isComplete ? 'Mantención registrada' : 'Visita planificada'}</p>
        <p className="text-sm text-zinc-500 mt-1">Redirigiendo...</p>
      </div>
    </div>
  )

  const activeTires = form.tiresData.filter(t => t.include)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {isComplete ? '📋 Formulario post-visita' : '📅 Planificar visita'}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {isComplete ? 'Registra lo que se hizo durante la visita' : 'Programa la próxima visita de mantención'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Datos generales */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3">Datos generales</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">Equipo *</label>
              <select required className="input" value={form.equipmentId} onChange={e => setForm(p=>({...p, equipmentId: e.target.value}))}>
                <option value="">Seleccionar equipo...</option>
                {equipments.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.code}) — {eq.company?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Mecánico</label>
              <select className="input" value={form.mechanicId} onChange={e => setForm(p=>({...p, mechanicId: e.target.value}))}>
                <option value="">Sin asignar</option>
                {mechanics.map(m => <option key={m.id} value={m.id}>{m.name} {m.specialty ? `(${m.specialty})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tipo de servicio</label>
              <select className="input" value={form.type} onChange={e => setForm(p=>({...p, type: e.target.value}))}>
                {Object.entries(TYPE_MAP).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pre-visita */}
        {!isComplete && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3">Planificación</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Fecha programada</label>
                <input type="datetime-local" className="input" value={form.plannedAt} onChange={e => setForm(p=>({...p,plannedAt:e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Horas estimadas</label>
                <input type="number" className="input" placeholder="2.5" value={form.estimatedHours} onChange={e => setForm(p=>({...p,estimatedHours:e.target.value}))}/>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Trabajo a realizar</label>
                <textarea className="input h-20 resize-none" placeholder="Describir lo que se planea hacer..."
                  value={form.plannedWork} onChange={e => setForm(p=>({...p,plannedWork:e.target.value}))}/>
              </div>
            </div>
          </div>
        )}

        {/* Post-visita */}
        {isComplete && (
          <>
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3">Trabajo realizado</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Horas trabajadas</label>
                  <input type="number" step="0.5" className="input" placeholder="3" value={form.hoursSpent} onChange={e => setForm(p=>({...p,hoursSpent:e.target.value}))}/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Costo mano de obra ($)</label>
                  <input type="number" className="input" placeholder="85000" value={form.laborCost} onChange={e => setForm(p=>({...p,laborCost:e.target.value}))}/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Costo repuestos ($)</label>
                  <input type="number" className="input" placeholder="0" value={form.partsCost} onChange={e => setForm(p=>({...p,partsCost:e.target.value}))}/>
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-zinc-400 mb-1 block">Resumen del trabajo</label>
                  <textarea className="input h-20 resize-none" placeholder="¿Qué se hizo exactamente?"
                    value={form.workDone} onChange={e => setForm(p=>({...p,workDone:e.target.value}))}/>
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-zinc-400 mb-1 block">Observaciones adicionales</label>
                  <textarea className="input h-16 resize-none" placeholder="Notas, problemas encontrados, etc."
                    value={form.observations} onChange={e => setForm(p=>({...p,observations:e.target.value}))}/>
                </div>
              </div>
            </div>

            {/* Próxima visita */}
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3">Próxima visita</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Fecha sugerida</label>
                  <input type="date" className="input" value={form.nextScheduled} onChange={e => setForm(p=>({...p,nextScheduled:e.target.value}))}/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">¿Qué hacer en la próxima?</label>
                  <input className="input" placeholder="Ej: Rotar neumáticos traseros" value={form.nextNotes} onChange={e => setForm(p=>({...p,nextNotes:e.target.value}))}/>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Neumáticos trabajados */}
        {form.tiresData.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3">
              Neumáticos intervenidos
              <span className="ml-2 text-xs text-zinc-500 font-normal">— marcá los que se trabajaron</span>
            </h2>
            <div className="space-y-2">
              {form.tiresData.map(t => (
                <div key={t.tireId}>
                  <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                    onClick={() => updateTire(t.tireId, 'include', !t.include)}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${t.include ? 'bg-brand-600 border-brand-600' : 'border-zinc-600'}`}>
                      {t.include && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200">{t.position}</p>
                      <p className="text-[11px] text-zinc-500">{t.brand} · {t.size}</p>
                    </div>
                    <span className="text-[11px] text-zinc-600">{t.depthBefore ? `${t.depthBefore}mm` : ''}</span>
                  </div>
                  {t.include && (
                    <div className="ml-7 mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <label className="text-[11px] text-zinc-500 mb-1 block">Acción realizada</label>
                        <select className="input text-xs py-1.5" value={t.action} onChange={e => updateTire(t.tireId,'action',e.target.value)}>
                          <option value="">Seleccionar...</option>
                          <option>Inspección visual</option><option>Inflado</option><option>Rotación</option>
                          <option>Reemplazo</option><option>Reparación</option><option>Medición surco</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 mb-1 block">Surco antes (mm)</label>
                        <input type="number" step="0.1" className="input text-xs py-1.5" placeholder="—" value={t.depthBefore} onChange={e => updateTire(t.tireId,'depthBefore',e.target.value)}/>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 mb-1 block">Surco después (mm)</label>
                        <input type="number" step="0.1" className="input text-xs py-1.5" placeholder="—" value={t.depthAfter} onChange={e => updateTire(t.tireId,'depthAfter',e.target.value)}/>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 mb-1 block">Costo reparación ($)</label>
                        <input type="number" className="input text-xs py-1.5" placeholder="0" value={t.repairCost} onChange={e => updateTire(t.tireId,'repairCost',e.target.value)}/>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 mb-1 block">Presión antes (PSI)</label>
                        <input type="number" className="input text-xs py-1.5" placeholder="—" value={t.pressureBefore} onChange={e => updateTire(t.tireId,'pressureBefore',e.target.value)}/>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 mb-1 block">Presión después (PSI)</label>
                        <input type="number" className="input text-xs py-1.5" placeholder="—" value={t.pressureAfter} onChange={e => updateTire(t.tireId,'pressureAfter',e.target.value)}/>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 mb-1 block">Km odómetro</label>
                        <input type="number" className="input text-xs py-1.5" placeholder="—" value={t.mileageAfter} onChange={e => updateTire(t.tireId,'mileageAfter',e.target.value)}/>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {activeTires.length > 0 && (
              <p className="text-xs text-brand-400">{activeTires.length} neumático{activeTires.length!==1?'s':''} seleccionado{activeTires.length!==1?'s':''}</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost flex-1">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
            {saving ? 'Guardando...' : isComplete ? 'Registrar mantención' : 'Planificar visita'}
          </button>
        </div>
      </form>
    </div>
  )
}
