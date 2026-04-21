import { useEffect, useState } from 'react'
import api from '../services/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const TYPE_COLORS = {
  scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  done:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  upcoming:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

const TYPE_LABELS = { scheduled:'Programada', done:'Completada', upcoming:'Próxima' }

export default function CalendarPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/calendar?month=${month}&year=${year}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [month, year])

  const prev = () => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  const next = () => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  const { daysInMonth = 30, firstDayOfWeek = 0, byDay = {}, summary = {} } = data || {}

  // Build calendar grid
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const today = now.getDate()
  const isCurrentMonth = month === now.getMonth()+1 && year === now.getFullYear()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Calendario de mantenciones</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vista mensual del servicio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" />Programada</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Completada</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Próxima</span>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total',       value: summary.total     || 0, color:'text-zinc-200' },
          { label:'Programadas', value: summary.scheduled || 0, color:'text-blue-400'    },
          { label:'Completadas', value: summary.done      || 0, color:'text-emerald-400' },
          { label:'Próximas',    value: summary.upcoming  || 0, color:'text-amber-400'   },
        ].map(k => (
          <div key={k.label} className="card text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prev} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-white">
            {MONTHS[month-1]} {year}
          </h2>
          <button onClick={next} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-zinc-500 font-medium py-2">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const events = byDay[day] || []
            const isToday = isCurrentMonth && day === today
            const isSelected = selected === day

            return (
              <button key={day}
                onClick={() => setSelected(isSelected ? null : day)}
                className={`min-h-[70px] p-1.5 rounded-lg border text-left transition-all ${
                  isToday
                    ? 'border-brand-500 bg-brand-500/10'
                    : isSelected
                    ? 'border-zinc-600 bg-zinc-800'
                    : events.length > 0
                    ? 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                    : 'border-transparent hover:border-zinc-800'
                }`}>
                <span className={`text-xs font-medium block mb-1 ${isToday ? 'text-brand-400' : 'text-zinc-400'}`}>
                  {day}
                </span>
                <div className="space-y-0.5">
                  {events.slice(0,2).map((e,ei) => (
                    <div key={ei} className={`text-[9px] px-1 py-0.5 rounded border truncate ${TYPE_COLORS[e.type]}`}>
                      {e.label}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <div className="text-[9px] text-zinc-500 px-1">+{events.length-2} más</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && byDay[selected]?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3">
            {selected} de {MONTHS[month-1]} — {byDay[selected].length} evento{byDay[selected].length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {byDay[selected].map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  e.type==='done' ? 'bg-emerald-400' : e.type==='scheduled' ? 'bg-blue-400' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{e.label}</p>
                  <p className="text-xs text-zinc-500">{e.sublabel}</p>
                  {e.location && <p className="text-xs text-zinc-600">📍 {e.location}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[e.type]}`}>
                  {TYPE_LABELS[e.type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
