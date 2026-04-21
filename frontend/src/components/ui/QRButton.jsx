// frontend/src/components/ui/QRButton.jsx
import { QrCode, Printer } from 'lucide-react'

// Abre el QR de un neumático en nueva pestaña (imprimible)
export function TireQRButton({ tireId, variant = 'icon' }) {
  const open = () => {
    const token = localStorage.getItem('token')
    // Abre en nueva ventana directamente
    const w = window.open(`/api/qr/tire/${tireId}`, '_blank', 'width=400,height=600')
    if (w) {
      w.addEventListener('load', () => {
        setTimeout(() => w.print(), 500)
      })
    }
  }

  if (variant === 'icon') return (
    <button onClick={open} title="Imprimir QR"
      className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
      <QrCode size={14} />
    </button>
  )

  return (
    <button onClick={open} className="btn-ghost flex items-center gap-2 text-xs">
      <QrCode size={13} /> QR
    </button>
  )
}

// Abre todos los QR del equipo (hoja completa para imprimir)
export function EquipmentQRButton({ equipmentId }) {
  const open = () => {
    window.open(`/api/qr/equipment/${equipmentId}`, '_blank')
  }

  return (
    <button onClick={open} className="btn-ghost flex items-center gap-2">
      <Printer size={14} /> Imprimir QR neumáticos
    </button>
  )
}
