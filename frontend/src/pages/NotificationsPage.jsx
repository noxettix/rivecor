import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Mail,
  Phone,
  Check,
  TestTube,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Clock3,
  Settings2,
  Save,
} from 'lucide-react'
import api from '../services/api'

const DEFAULT_SETTINGS = {
  adminEmail: '',
  adminWhatsapp: '',
  criticalAlerts: true,
  upcomingAlerts: true,
  daysBeforeAlert: 3,
}

function normalizeWhatsapp(value) {
  return value.replace(/[^\d+]/g, '')
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidWhatsapp(phone) {
  return /^\+\d{8,15}$/.test(phone)
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-brand-400" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function StatusBanner({ type = 'info', children }) {
  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    error: 'bg-red-500/10 border-red-500/20 text-red-300',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    info: 'bg-zinc-800/80 border-zinc-700 text-zinc-300',
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  )
}

function ToggleCard({ checked, onChange, icon: Icon, title, description }) {
  return (
    <label className="group block cursor-pointer">
      <div
        className={`rounded-2xl border p-4 transition-all ${
          checked
            ? 'border-brand-500/40 bg-brand-500/10'
            : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              checked
                ? 'bg-brand-500/15 border-brand-500/30'
                : 'bg-zinc-800 border-zinc-700'
            }`}
          >
            <Icon size={18} className={checked ? 'text-brand-400' : 'text-zinc-400'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-100">{title}</p>

              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  checked ? 'bg-brand-500' : 'bg-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={onChange}
                  className="sr-only"
                />
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    </label>
  )
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadSettings = async () => {
      setLoading(true)
      setLoadError('')

      try {
        const { data } = await api.get('/notifications/settings')

        if (!mounted) return

        setSettings({
          adminEmail: data?.adminEmail || '',
          adminWhatsapp: data?.adminWhatsapp || '',
          criticalAlerts:
            typeof data?.criticalAlerts === 'boolean' ? data.criticalAlerts : true,
          upcomingAlerts:
            typeof data?.upcomingAlerts === 'boolean' ? data.upcomingAlerts : true,
          daysBeforeAlert: Number(data?.daysBeforeAlert || 3),
        })
      } catch (e) {
        if (!mounted) return
        setLoadError(
          e.response?.data?.error ||
            'No se pudo cargar la configuración. Puedes ingresar los datos manualmente.'
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      mounted = false
    }
  }, [])

  const emailInvalid = useMemo(() => {
    return settings.adminEmail.trim() !== '' && !isValidEmail(settings.adminEmail.trim())
  }, [settings.adminEmail])

  const whatsappInvalid = useMemo(() => {
    return (
      settings.adminWhatsapp.trim() !== '' &&
      !isValidWhatsapp(normalizeWhatsapp(settings.adminWhatsapp.trim()))
    )
  }, [settings.adminWhatsapp])

  const channelsCount = useMemo(() => {
    let count = 0
    if (settings.adminEmail.trim()) count += 1
    if (settings.adminWhatsapp.trim()) count += 1
    return count
  }, [settings.adminEmail, settings.adminWhatsapp])

  const activeRulesCount = useMemo(() => {
    let count = 0
    if (settings.criticalAlerts) count += 1
    if (settings.upcomingAlerts) count += 1
    return count
  }, [settings.criticalAlerts, settings.upcomingAlerts])

  const updateField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const save = async () => {
    setError('')
    setSaved(false)
    setTestResult(null)

    const payload = {
      ...settings,
      adminEmail: settings.adminEmail.trim(),
      adminWhatsapp: normalizeWhatsapp(settings.adminWhatsapp.trim()),
      daysBeforeAlert: Number(settings.daysBeforeAlert || 3),
    }

    if (payload.adminEmail && !isValidEmail(payload.adminEmail)) {
      setError('El email no tiene un formato válido.')
      return
    }

    if (payload.adminWhatsapp && !isValidWhatsapp(payload.adminWhatsapp)) {
      setError('El número de WhatsApp debe incluir código país, por ejemplo: +56912345678')
      return
    }

    if (!payload.adminEmail && !payload.adminWhatsapp) {
      setError('Debes ingresar al menos un canal de notificación: email o WhatsApp.')
      return
    }

    setSaving(true)

    try {
      await api.post('/notifications/settings', payload)
      setSettings(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async (type) => {
    setTesting(type)
    setTestResult(null)
    setError('')

    try {
      if (type === 'email') {
        const email = settings.adminEmail.trim()

        if (!email) {
          setTestResult({
            type,
            success: false,
            message: 'Debes ingresar un email antes de enviar la prueba.',
          })
          return
        }

        if (!isValidEmail(email)) {
          setTestResult({
            type,
            success: false,
            message: 'El email ingresado no es válido.',
          })
          return
        }
      }

      if (type === 'whatsapp') {
        const phone = normalizeWhatsapp(settings.adminWhatsapp.trim())

        if (!phone) {
          setTestResult({
            type,
            success: false,
            message: 'Debes ingresar un número de WhatsApp antes de enviar la prueba.',
          })
          return
        }

        if (!isValidWhatsapp(phone)) {
          setTestResult({
            type,
            success: false,
            message: 'El número de WhatsApp debe incluir código país, por ejemplo: +56912345678',
          })
          return
        }
      }

      const payload = {
        type,
        adminEmail: settings.adminEmail.trim(),
        adminWhatsapp: normalizeWhatsapp(settings.adminWhatsapp.trim()),
      }

      const { data } = await api.post('/notifications/test', payload)

      setTestResult({
        type,
        success: true,
        message: data?.message || 'Prueba enviada correctamente.',
      })
    } catch (e) {
      setTestResult({
        type,
        success: false,
        message: e.response?.data?.error || 'Error al enviar la prueba.',
      })
    } finally {
      setTesting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-10 flex items-center justify-center gap-3">
          <Loader2 size={18} className="animate-spin text-brand-400" />
          <span className="text-sm text-zinc-300">
            Cargando configuración de notificaciones...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 sm:p-7 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%)] pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs text-brand-300 mb-3">
              <Bell size={13} />
              Centro de alertas
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Notificaciones automáticas
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
              Configura alertas por email y WhatsApp para neumáticos críticos y
              próximas mantenciones.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 min-w-[140px]">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Canales</p>
              <p className="text-2xl font-semibold text-white mt-1">{channelsCount}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 min-w-[140px]">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Reglas activas</p>
              <p className="text-2xl font-semibold text-white mt-1">{activeRulesCount}</p>
            </div>
          </div>
        </div>
      </div>

      {loadError && <StatusBanner type="warning">{loadError}</StatusBanner>}
      {error && <StatusBanner type="error">{error}</StatusBanner>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6 space-y-5">
            <SectionHeader
              icon={Settings2}
              title="Canales de contacto"
              subtitle="Define dónde quieres recibir las alertas del sistema."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-brand-400" />
                  <h3 className="text-sm font-semibold text-white">Email</h3>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">
                    Correo que recibirá las alertas
                  </label>
                  <input
                    className={`input ${emailInvalid ? 'border-red-500/40 focus:border-red-500' : ''}`}
                    type="email"
                    placeholder="evelyn@rivecor.cl"
                    value={settings.adminEmail}
                    onChange={(e) => updateField('adminEmail', e.target.value)}
                  />
                  {emailInvalid && (
                    <p className="text-xs text-red-400 mt-1.5">Ingresa un email válido.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-400 leading-relaxed">
                  <p className="font-medium text-zinc-300 mb-1.5">Variables .env</p>
                  <code className="text-brand-400 break-all">
                    SMTP_HOST=smtp.gmail.com
                    <br />
                    SMTP_PORT=587
                    <br />
                    SMTP_USER=evelyn@rivecor.cl
                    <br />
                    SMTP_PASS=tu_contraseña_app_gmail
                    <br />
                    ADMIN_EMAIL=evelyn@rivecor.cl
                  </code>
                </div>

                <button
                  onClick={() => sendTest('email')}
                  disabled={testing === 'email' || saving}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 px-4 py-3 text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {testing === 'email' ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Enviando prueba...
                    </>
                  ) : (
                    <>
                      <TestTube size={15} />
                      Probar email
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-brand-400" />
                  <h3 className="text-sm font-semibold text-white">WhatsApp</h3>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">
                    Número con código país
                  </label>
                  <input
                    className={`input ${whatsappInvalid ? 'border-red-500/40 focus:border-red-500' : ''}`}
                    placeholder="+56912345678"
                    value={settings.adminWhatsapp}
                    onChange={(e) => updateField('adminWhatsapp', e.target.value)}
                  />
                  {whatsappInvalid && (
                    <p className="text-xs text-red-400 mt-1.5">
                      Formato esperado: +56912345678
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-400 leading-relaxed">
                  <p className="font-medium text-zinc-300 mb-1.5">Variables .env</p>
                  <code className="text-brand-400 break-all">
                    TWILIO_ACCOUNT_SID=ACxxxxxxxx
                    <br />
                    TWILIO_AUTH_TOKEN=xxxxxxxx
                    <br />
                    TWILIO_WHATSAPP_FROM=+14155238886
                    <br />
                    ADMIN_WHATSAPP=+56912345678
                  </code>
                </div>

                <button
                  onClick={() => sendTest('whatsapp')}
                  disabled={testing === 'whatsapp' || saving}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 px-4 py-3 text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {testing === 'whatsapp' ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Enviando prueba...
                    </>
                  ) : (
                    <>
                      <TestTube size={15} />
                      Probar WhatsApp
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6 space-y-5">
            <SectionHeader
              icon={Bell}
              title="Reglas de alerta"
              subtitle="Activa qué eventos deben generar una notificación automática."
            />

            <div className="grid grid-cols-1 gap-4">
              <ToggleCard
                checked={settings.criticalAlerts}
                onChange={(e) => updateField('criticalAlerts', e.target.checked)}
                icon={ShieldAlert}
                title="Neumático en estado crítico"
                description="Envía una alerta inmediata cuando una inspección detecta una condición crítica."
              />

              <ToggleCard
                checked={settings.upcomingAlerts}
                onChange={(e) => updateField('upcomingAlerts', e.target.checked)}
                icon={Clock3}
                title="Recordatorio de próxima mantención"
                description="Envía un aviso automático antes de la fecha programada para mantenimiento."
              />
            </div>

            {settings.upcomingAlerts && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <label className="text-xs text-zinc-400 mb-2 block">
                  Anticipación del recordatorio
                </label>
                <select
                  className="input max-w-[220px]"
                  value={settings.daysBeforeAlert}
                  onChange={(e) =>
                    updateField('daysBeforeAlert', parseInt(e.target.value, 10))
                  }
                >
                  <option value={1}>1 día antes</option>
                  <option value={2}>2 días antes</option>
                  <option value={3}>3 días antes</option>
                  <option value={7}>1 semana antes</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
            <SectionHeader
              icon={Bell}
              title="Resumen"
              subtitle="Estado actual de la configuración."
            />

            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-400">Email</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    settings.adminEmail.trim()
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.adminEmail.trim() ? 'Configurado' : 'Vacío'}
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-400">WhatsApp</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    settings.adminWhatsapp.trim()
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.adminWhatsapp.trim() ? 'Configurado' : 'Vacío'}
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-400">Alerta crítica</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    settings.criticalAlerts
                      ? 'border-brand-500/20 bg-brand-500/10 text-brand-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.criticalAlerts ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-400">Próxima mantención</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    settings.upcomingAlerts
                      ? 'border-brand-500/20 bg-brand-500/10 text-brand-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.upcomingAlerts ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>

          {testResult && (
            <StatusBanner type={testResult.success ? 'success' : 'error'}>
              <span className="font-medium mr-1">
                {testResult.success ? '✓' : '✗'}
              </span>
              {testResult.message}
            </StatusBanner>
          )}

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Guardar configuración</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Guarda los canales y reglas para que el sistema pueda enviar alertas
              automáticas.
            </p>

            <button
              onClick={save}
              disabled={saving || emailInvalid || whatsappInvalid}
              className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400 text-black font-semibold px-4 py-3 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : saved ? (
                <>
                  <Check size={16} />
                  Guardado
                </>
              ) : (
                <>
                  <Save size={16} />
                  Guardar configuración
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}