import { useEffect, useState } from 'react'
import api from '../services/api'
import {
  HardHat,
  Plus,
  X,
  Edit2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  User,
} from 'lucide-react'

const EMPTY = {
  name: '',
  rut: '',
  phone: '',
  email: '',
  speciality: '',
  certifications: '',
  notes: '',
  createUser: false,
  userEmail: '',
  userPassword: '',
}

export default function MechanicsPage() {
  const [mechanics, setMechanics] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [created, setCreated] = useState(null)

  const load = async () => {
    try {
      const r = await api.get('/mechanics')
      setMechanics(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      console.error('Error cargando mecánicos:', e)
      setMechanics([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setForm(EMPTY)
    setEditing(null)
    setModal(true)
  }

  const openEdit = (m) => {
    setForm({
      name: m.name || '',
      rut: m.rut || '',
      phone: m.phone || '',
      email: m.email || '',
      speciality: m.speciality || '',
      certifications: m.certifications || '',
      notes: m.notes || '',
      createUser: false,
      userEmail: '',
      userPassword: '',
    })
    setEditing(m.id)
    setModal(true)
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editing) {
        const payload = {
          name: form.name,
          rut: form.rut,
          phone: form.phone,
          email: form.email,
          speciality: form.speciality,
          certifications: form.certifications,
          notes: form.notes,
        }

        await api.put(`/mechanics/${editing}`, payload)
        setModal(false)
      } else {
        if (form.createUser && !form.userEmail) {
          alert('Debes ingresar email de acceso')
          setSaving(false)
          return
        }

        if (form.createUser && !form.userPassword) {
          alert('Debes ingresar contraseña')
          setSaving(false)
          return
        }

        const payload = {
          name: form.name,
          rut: form.rut,
          phone: form.phone,
          email: form.createUser ? form.userEmail : form.email,
          password: form.createUser ? form.userPassword : '',
          speciality: form.speciality,
          certifications: form.certifications,
          notes: form.notes,
        }

        const { data } = await api.post('/mechanics', payload)

        if (data?.user) {
          setCreated({
            mechanic: data.mechanic,
            user: data.user,
            passwordPlain: data.passwordPlain || form.userPassword,
          })
        }

        setModal(false)
      }

      await load()
    } catch (err) {
      console.error('Error guardando mecánico:', err)
      alert(err.response?.data?.error || 'Error')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (id, name) => {
    if (!confirm(`¿Desactivar a ${name}?`)) return
    try {
      await api.delete(`/mechanics/${id}`)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo desactivar')
    }
  }

  const resetPwd = async (id) => {
    const newPassword = prompt('Nueva contraseña para el mecánico:')
    if (!newPassword) return

    try {
      const { data } = await api.post(`/mechanics/${id}/reset-password`, {
        password: newPassword,
      })

      alert(
        `Credenciales actualizadas:\n\nEmail: ${data.email}\nContraseña: ${data.newPassword}`
      )
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo resetear contraseña')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Mecánicos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {mechanics.length} registrado{mechanics.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Nuevo mecánico
        </button>
      </div>

      {created && (
        <div className="card border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400 mb-3">
                ✓ Mecánico creado con cuenta de acceso
              </p>
              <div className="space-y-2">
                <CredRow label="Nombre" value={created.mechanic?.name} />
                <CredRow label="Email" value={created.user?.email} copy />
                <CredRow label="Contraseña" value={created.passwordPlain} copy secret />
                <p className="text-xs text-zinc-500 mt-2">
                  El mecánico puede ingresar con estas credenciales a la app mobile.
                </p>
              </div>
            </div>
            <button onClick={() => setCreated(null)}>
              <X size={15} className="text-zinc-500" />
            </button>
          </div>
        </div>
      )}

      {mechanics.length === 0 ? (
        <div className="card text-center py-12">
          <HardHat size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Sin mecánicos registrados</p>
          <button onClick={openNew} className="btn-primary mt-4 text-sm">
            Agregar primero
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {mechanics.map((m) => {
            const isOpen = expanded === m.id
            return (
              <div key={m.id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
                    {m.name?.[0]?.toUpperCase() || 'M'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{m.name}</p>
                      {m.user && (
                        <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <User size={9} /> Tiene cuenta
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 mt-0.5">
                      {m.speciality || 'Sin especialidad'}
                      {m.phone ? ` · ${m.phone}` : ''}
                      {m.metrics?.completedJobs > 0
                        ? ` · ${m.metrics.completedJobs} trabajo${m.metrics.completedJobs !== 1 ? 's' : ''}`
                        : ''}
                    </p>
                  </div>

                  {isOpen ? (
                    <ChevronUp size={14} className="text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-zinc-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 p-4 space-y-4 bg-zinc-900/40">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      {m.rut && <InfoRow label="RUT" value={m.rut} />}
                      {(m.email || m.user?.email) && (
                        <InfoRow label="Email" value={m.email || m.user?.email} />
                      )}
                      {m.phone && <InfoRow label="Teléfono" value={m.phone} />}
                      {m.certifications && (
                        <InfoRow label="Certificaciones" value={m.certifications} />
                      )}
                      {m.notes && <InfoRow label="Notas" value={m.notes} span />}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <StatBox label="Trabajos" value={m.metrics?.completedJobs || 0} />
                      <StatBox label="Cambios" value={m.metrics?.changes || 0} />
                      <StatBox label="Balanceos" value={m.metrics?.balances || 0} />
                      <StatBox label="Alineaciones" value={m.metrics?.alignments || 0} />
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                        <User size={11} /> Cuenta de acceso (app mobile)
                      </p>

                      {m.user ? (
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-200">{m.user.email}</p>
                          <p className="text-[11px] text-zinc-500">
                            Rol: {m.user.role || 'OPERATOR'} · {m.user.isActive ? 'Activo' : 'Inactivo'}
                          </p>
                          <button
                            onClick={() => resetPwd(m.id)}
                            className="btn-ghost flex items-center gap-1.5 text-xs mt-2"
                          >
                            <RefreshCw size={11} /> Restablecer contraseña
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600">
                          Sin cuenta — edita el mecánico si quieres gestionar sus datos.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="btn-ghost flex items-center gap-1.5 text-xs"
                      >
                        <Edit2 size={12} /> Editar
                      </button>

                      <button
                        onClick={() => deactivate(m.id, m.name)}
                        className="btn-ghost text-xs text-red-400 hover:text-red-300"
                      >
                        Desactivar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 rounded-t-2xl z-10">
              <h3 className="text-sm font-semibold text-white">
                {editing ? 'Editar mecánico' : 'Nuevo mecánico'}
              </h3>
              <button onClick={() => setModal(false)}>
                <X size={16} className="text-zinc-500" />
              </button>
            </div>

            <form onSubmit={save} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Nombre completo *</label>
                  <input
                    required
                    className="input"
                    placeholder="Juan Pérez González"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">RUT</label>
                  <input
                    className="input"
                    placeholder="12.345.678-9"
                    value={form.rut}
                    onChange={(e) => set('rut', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Teléfono</label>
                  <input
                    className="input"
                    placeholder="+56 9 1234 5678"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Email personal</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="juan@email.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Especialidad</label>
                  <input
                    className="input"
                    placeholder="Neumáticos, hidráulica..."
                    value={form.speciality}
                    onChange={(e) => set('speciality', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Certificaciones</label>
                  <input
                    className="input"
                    placeholder="Licencia clase C, certificado neumáticos..."
                    value={form.certifications}
                    onChange={(e) => set('certifications', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
                  <textarea
                    className="input h-16 resize-none"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </div>
              </div>

              {!editing && (
                <div className="border border-zinc-800 rounded-xl p-4 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.createUser}
                      onChange={(e) => set('createUser', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 accent-yellow-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Crear cuenta de acceso</p>
                      <p className="text-xs text-zinc-500">
                        El mecánico podrá ingresar a la app mobile
                      </p>
                    </div>
                  </label>

                  {form.createUser && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-zinc-800">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Email de acceso *</label>
                        <input
                          className="input"
                          type="email"
                          placeholder="juan@rivecor.cl"
                          value={form.userEmail}
                          onChange={(e) => set('userEmail', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">
                          Contraseña *
                        </label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Contraseña de acceso"
                          value={form.userPassword}
                          onChange={(e) => set('userPassword', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={14} /> {editing ? 'Guardar' : 'Crear mecánico'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <span className="text-zinc-600">{label}: </span>
      <span className="text-zinc-300">{value}</span>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  )
}

function CredRow({ label, value, copy, secret }) {
  const [show, setShow] = useState(!secret)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-500 w-24 shrink-0 text-xs">{label}</span>
      <span className="text-zinc-200 font-mono text-sm flex-1">
        {secret && !show ? '••••••••' : value}
      </span>

      {secret && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="text-zinc-500 hover:text-zinc-300"
        >
          {show ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      )}

      {copy && (
        <button
          type="button"
          onClick={handleCopy}
          className="text-zinc-500 hover:text-zinc-300"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      )}
    </div>
  )
}