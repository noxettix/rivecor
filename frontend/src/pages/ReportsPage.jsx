import { useState } from 'react'
import { Download, FileSpreadsheet, CheckCircle2, Loader2 } from 'lucide-react'
import api from '../services/api'

const REPORTS = [
  {
    id: 'tires',
    title: 'Neumáticos por equipo',
    desc: 'Estado actual de todos los neumáticos: profundidad, presión, kilometraje y semáforo de riesgo.',
    icon: '🔵',
    endpoint: '/reports/tires',
    filename: 'Rivecor_Neumaticos.xlsx',
  },
  {
    id: 'history',
    title: 'Historial de mantenciones',
    desc: 'Registro completo de visitas: qué se hizo, neumáticos trabajados y próximas fechas.',
    icon: '📋',
    endpoint: '/reports/history',
    filename: 'Rivecor_Historial.xlsx',
  },
  {
    id: 'costs',
    title: 'Costo x kilómetro',
    desc: 'Trazabilidad económica por neumático: precio, mantención, costo por km y vida útil.',
    icon: '💰',
    endpoint: '/reports/costs',
    filename: 'Rivecor_Costos_x_Km.xlsx',
  },
  {
    id: 'mechanics',
    title: 'Ficha de mecánicos',
    desc: 'Resumen por mecánico: total de mantenciones, neumáticos cambiados, rotaciones e inspecciones.',
    icon: '👷',
    endpoint: '/reports/mechanics',
    filename: 'Rivecor_Mecanicos.xlsx',
  },
  {
    id: 'full',
    title: 'Reporte completo',
    desc: 'Las 4 hojas anteriores en un solo archivo Excel con todas las métricas de la cuenta.',
    icon: '📊',
    endpoint: '/reports/full',
    filename: 'Rivecor_Reporte_Completo.xlsx',
    featured: true,
  },
]

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(null)
  const [done, setDone] = useState([])

  const download = async (report) => {
    setDownloading(report.id)
    try {
      const resp = await api.get(report.endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = report.filename
      a.click()
      window.URL.revokeObjectURL(url)
      setDone(prev => [...new Set([...prev, report.id])])
    } catch (err) {
      alert('Error al generar el reporte. Intenta nuevamente.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Reportes Excel</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Descarga reportes actualizados en tiempo real</p>
      </div>

      {/* Featured full report */}
      {REPORTS.filter(r => r.featured).map(report => (
        <div key={report.id} className="card border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center text-2xl shrink-0">
              {report.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{report.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{report.desc}</p>
            </div>
            <DownloadButton report={report} downloading={downloading} done={done} onDownload={download} size="lg" />
          </div>
        </div>
      ))}

      {/* Individual reports grid */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Reportes individuales</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORTS.filter(r => !r.featured).map(report => (
          <div key={report.id} className="card hover:border-zinc-700 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xl shrink-0">
                {report.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{report.title}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{report.desc}</p>
              </div>
            </div>
            <div className="mt-4">
              <DownloadButton report={report} downloading={downloading} done={done} onDownload={download} />
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <FileSpreadsheet size={16} className="text-zinc-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Los reportes se generan con los datos actuales de tu cuenta. Incluyen formato profesional, semáforos de color por estado y fórmulas dinámicas de Excel.
          </p>
        </div>
      </div>
    </div>
  )
}

function DownloadButton({ report, downloading, done, onDownload, size = 'sm' }) {
  const isDownloading = downloading === report.id
  const isDone = done.includes(report.id)

  return (
    <button
      onClick={() => onDownload(report)}
      disabled={isDownloading}
      className={`flex items-center gap-2 transition-all ${
        size === 'lg'
          ? 'btn-primary px-5 py-2.5'
          : 'btn-primary w-full justify-center py-2'
      } ${isDone ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}>
      {isDownloading
        ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
        : isDone
          ? <><CheckCircle2 size={14} /> Descargado</>
          : <><Download size={14} /> Descargar Excel</>
      }
    </button>
  )
}
