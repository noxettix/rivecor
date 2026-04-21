// frontend/src/components/ui/QuoteButton.jsx
import { useState } from 'react'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'

export function QuoteButton({ equipmentId }) {
  const [loading, setLoading] = useState(false)

  const open = async () => {
    setLoading(true)
    try {
      window.open(`/api/quotes/html/${equipmentId}`, '_blank')
    } finally {
      setTimeout(() => setLoading(false), 1000)
    }
  }

  return (
    <button onClick={open} disabled={loading}
      className="btn-ghost flex items-center gap-2 text-sm">
      {loading
        ? <Loader2 size={14} className="animate-spin" />
        : <FileText size={14} />}
      Cotización <ExternalLink size={11} className="text-zinc-600" />
    </button>
  )
}
