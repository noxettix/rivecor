import { useEffect, useState } from 'react'
import api from '../services/api'
import { History, ChevronDown, ChevronUp, Wrench } from 'lucide-react'

const TYPE_MAP = {
  INSPECTION: 'Inspección',
  ROTATION: 'Rotación',
  REPLACEMENT: 'Reemplazo',
  PRESSURE_CHECK: 'Revisión de presión',
  EMERGENCY: 'Emergencia'
}

const STATUS_COLOR = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  ASSIGNED: 'bg-blue-500/20 text-blue-400',
  IN_PROGRESS: 'bg-orange-500/20 text-orange-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400'
}

const PRIORITY_COLOR = {
  LOW: 'text-zinc-400',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-500'
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
        <h1 className="text-xl font-semibold text-white">
          Historial de solicitudes
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Seguimiento completo de servicios y mantenciones
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="card text-center py-14">
          <History size={36} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            Sin solicitudes registradas aún
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(m => {
            const isOpen = expanded === m.id

            const status = m.status || 'PENDING'
            const priority = m.priority || 'MEDIUM'

            return (
              <div key={m.id} className="card">
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench size={14} className="text-brand-400" />
                    </div>

                    <div>
                      {/* 🔥 PATENTE */}
                      <p className="text-sm font-semibold text-white">
                        {m.request?.licensePlate || 'Sin patente'}
                      </p>

                      {/* 🔧 TIPO + PRIORIDAD */}
                      <p className="text-xs mt-1">
                        <span className="text-zinc-400">
                          {TYPE_MAP[m.type] || m.type}
                        </span>

                        <span className={`ml-2 font-medium ${PRIORITY_COLOR[priority]}`}>
                          · {priority}
                        </span>
                      </p>

                      {/* 👤 CLIENTE / TÉCNICO */}
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {m.technician && `Técnico: ${m.technician}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* 📅 FECHA */}
                    <p className="text-xs text-zinc-500">
                      {new Date(m.performedAt).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>

                    {/* 🔥 ESTADO */}
                    <span className={`text-[10px] px-2 py-1 rounded-full ${STATUS_COLOR[status]}`}>
                      {status}
                    </span>

                    {isOpen ? (
                      <ChevronUp size={14} className="text-zinc-500" />
                    ) : (
                      <ChevronDown size={14} className="text-zinc-500" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4">

                    {m.observations && (
                      <div>
                        <p className="text-xs font-medium text-zinc-400 mb-1">
                          Observaciones
                        </p>
                        <p className="text-sm text-zinc-300">
                          {m.observations}
                        </p>
                      </div>
                    )}

                    {m.tires?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-400 mb-2">
                          Neumáticos trabajados
                        </p>

                        <div className="space-y-2">
                          {m.tires.map(mt => (
                            <div key={mt.id} className="p-2.5 bg-zinc-800/60 rounded-lg">
                              <p className="text-xs font-medium text-zinc-300">
                                {mt.tire?.position} — {mt.tire?.brand} {mt.tire?.size}
                              </p>

                              {mt.action && (
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                  Acción: {mt.action}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.nextScheduled && (
                      <div className="flex items-center gap-2 p-2.5 bg-brand-600/10 border border-brand-600/20 rounded-lg">
                        <p className="text-xs text-brand-300">
                          Próxima mantención:
                          <strong>
                            {' '}
                            {new Date(m.nextScheduled).toLocaleDateString('es-CL')}
                          </strong>
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