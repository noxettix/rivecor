import { useEffect, useState } from 'react'
import api from '../services/api'
import { History, ChevronDown, ChevronUp, Wrench } from 'lucide-react'

const TYPE_MAP = {
  INSPECTION: 'Inspección', ROTATION: 'Rotación', REPLACEMENT: 'Reemplazo',
  PRESSURE_CHECK: 'Revisión de presión', EMERGENCY: 'Emergencia'
}

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/maintenance/history')
      .then(r => setHistory(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Historial de mantenciones</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Registro completo del servicio realizado</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="card text-center py-14">
          <History size={36} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Sin mantenciones registradas aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(m => {
            const isOpen = expanded === m.id
            return (
              <div key={m.id} className="card">
                <button onClick={() => setExpanded(isOpen ? null : m.id)} className="w-full flex items-start justify-between gap-3 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench size={14} className="text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {m.request?.equipment?.name || 'Equipo'}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {TYPE_MAP[m.type] || m.type}
                        {m.technician && ` · Técnico: ${m.technician}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-xs text-zinc-500">
                      {new Date(m.performedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {isOpen ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4">
                    {m.observations && (
                      <div>
                        <p className="text-xs font-medium text-zinc-400 mb-1">Observaciones</p>
                        <p className="text-sm text-zinc-300">{m.observations}</p>
                      </div>
                    )}

                    {m.tires?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-400 mb-2">Neumáticos trabajados</p>
                        <div className="space-y-2">
                          {m.tires.map(mt => (
                            <div key={mt.id} className="p-2.5 bg-zinc-800/60 rounded-lg">
                              <p className="text-xs font-medium text-zinc-300">{mt.tire?.position} — {mt.tire?.brand} {mt.tire?.size}</p>
                              {mt.action && <p className="text-[11px] text-zinc-500 mt-0.5">Acción: {mt.action}</p>}
                              <div className="flex gap-4 mt-1.5 text-[11px] text-zinc-500">
                                {mt.depthBefore != null && (
                                  <span>Profundidad: {mt.depthBefore}mm → <span className="text-zinc-300">{mt.depthAfter}mm</span></span>
                                )}
                                {mt.pressureBefore != null && (
                                  <span>Presión: {mt.pressureBefore} → <span className="text-zinc-300">{mt.pressureAfter} PSI</span></span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.nextScheduled && (
                      <div className="flex items-center gap-2 p-2.5 bg-brand-600/10 border border-brand-600/20 rounded-lg">
                        <p className="text-xs text-brand-300">
                          Próxima mantención programada: <strong>{new Date(m.nextScheduled).toLocaleDateString('es-CL')}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
