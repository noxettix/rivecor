import { useEffect, useMemo, useState } from 'react'
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
  Search,
  ShieldCheck,
  Phone,
  Mail,
  Activity,
  Wrench,
  Gauge,
  AlignCenter,
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

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

  const filteredMechanics = useMemo(() => {
    const q = search.toLowerCase().trim()

    return mechanics.filter((m) => {
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.speciality?.toLowerCase().includes(q)

      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'WITH_ACCOUNT' && m.user) ||
        (filter === 'WITHOUT_ACCOUNT' && !m.user)

      return matchesSearch && matchesFilter
    })
  }, [mechanics, search, filter])

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
        await api.put(`/mechanics/${editing}`, {
          name: form.name,
          rut: form.rut,
          phone: form.phone,
          email: form.email,
          speciality: form.speciality,
          certifications: form.certifications,
          notes: form.notes,
        })
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

        const { data } = await api.post('/mechanics', {
          name: form.name,
          rut: form.rut,
          phone: form.phone,
          email: form.createUser ? form.userEmail : form.email,
          password: form.createUser ? form.userPassword : '',
          speciality: form.speciality,
          certifications: form.certifications,
          notes: form.notes,
        })

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
        <div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      <div className="rounded-3xl border border-yellow-500/10 bg-zinc-950 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300 mb-3">
              <HardHat size={13} />
              Gestión de técnicos
            </div>

            <h1 className="text-3xl font-black tracking-tight">Mecánicos</h1>

            <p className="mt-2 text-sm text-zinc-400">
              {mechanics.length} registrado{mechanics.length !== 1 ? 's' : ''} en el sistema.
            </p>
          </div>

          <button
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black hover:bg-yellow-300 transition"
          >
            <Plus size={16} />
            Nuevo mecánico
          </button>
        </div>
      </div>

      {created && (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-300 mb-3">
                Mecánico creado con cuenta de acceso
              </p>

              <div className="space-y-2">
                <CredRow label="Nombre" value={created.mechanic?.name} />
                <CredRow label="Email" value={created.user?.email} copy />
                <CredRow label="Contraseña" value={created.passwordPlain} copy secret />
              </div>

              <p className="text-xs text-zinc-500 mt-3">
                El mecánico puede ingresar con estas credenciales a la app mobile.
              </p>
            </div>

            <button onClick={() => setCreated(null)}>
              <X size={16} className="text-zinc-500 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="input pl-11"
              placeholder="Buscar por nombre, email, teléfono o especialidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
              Todos
            </FilterButton>
            <FilterButton active={filter === 'WITH_ACCOUNT'} onClick={() => setFilter('WITH_ACCOUNT')}>
              Con cuenta
            </FilterButton>
            <FilterButton active={filter === 'WITHOUT_ACCOUNT'} onClick={() => setFilter('WITHOUT_ACCOUNT')}>
              Sin cuenta
            </FilterButton>
          </div>
        </div>
      </div>

      {filteredMechanics.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 text-center py-14">
          <HardHat size={36} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No hay mecánicos para mostrar</p>
          <button onClick={openNew} className="mt-4 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black">
            Agregar mecánico
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMechanics.map((m) => {
            const isOpen = expanded === m.id
            const jobs = m.metrics?.completedJobs || 0
            const alignments = m.metrics?.alignments || 0
            const balances = m.metrics?.balances || 0

            return (
              <div
                key={m.id}
                className={`rounded-3xl border bg-zinc-900/80 overflow-hidden transition ${
                  isOpen ? 'border-yellow-400/40' : 'border-zinc-800 hover:border-yellow-400/20'
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                    <button
                      onClick={() => setExpanded(isOpen ? null : m.id)}
                      className="flex items-center gap-4 flex-1 text-left min-w-0"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-lg font-black text-emerald-400 shrink-0">
                        {m.name?.[0]?.toUpperCase() || 'M'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-lg font-bold text-white truncate">{m.name}</p>

                          {m.user ? (
                            <span className="text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                              <User size={10} /> App conectada
                            </span>
                          ) : (
                            <span className="text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-1 rounded-full font-semibold">
                              Sin cuenta
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-zinc-500 mt-1">
                          {m.speciality || 'Sin especialidad'}
                          {m.phone ? ` · ${m.phone}` : ''}
                        </p>
                      </div>
                    </button>

                    <div className="grid grid-cols-3 gap-2 xl:w-[360px]">
                      <MiniKpi label="Servicios" value={jobs} icon={<Activity size={14} />} />
                      <MiniKpi label="Alineaciones" value={alignments} icon={<AlignCenter size={14} />} />
                      <MiniKpi label="Balanceos" value={balances} icon={<Gauge size={14} />} />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-yellow-400/40 hover:text-white"
                      >
                        <Edit2 size={13} />
                      </button>

                      {m.user && (
                        <button
                          onClick={() => resetPwd(m.id)}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-yellow-400/40 hover:text-white"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => deactivate(m.id, m.name)}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                      >
                        Desactivar
                      </button>

                      <button
                        onClick={() => setExpanded(isOpen ? null : m.id)}
                        className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-400 hover:text-white"
                      >
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-800 bg-black/20 p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {m.rut && <InfoCard icon={<ShieldCheck size={15} />} label="RUT" value={m.rut} />}
                      {(m.email || m.user?.email) && <InfoCard icon={<Mail size={15} />} label="Email" value={m.email || m.user?.email} />}
                      {m.phone && <InfoCard icon={<Phone size={15} />} label="Teléfono" value={m.phone} />}
                      {m.certifications && <InfoCard icon={<ShieldCheck size={15} />} label="Certificaciones" value={m.certifications} />}
                    </div>

                    {m.notes && (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Notas</p>
                        <p className="text-sm text-zinc-300">{m.notes}</p>
                      </div>
                    )}

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <User size={15} className="text-yellow-400" />
                            Cuenta de acceso app mobile
                          </p>

                          {m.user ? (
                            <>
                              <p className="text-sm text-zinc-300 mt-2">{m.user.email}</p>
                              <p className="text-xs text-zinc-500">
                                Rol: {m.user.role || 'OPERATOR'} · {m.user.isActive ? 'Activo' : 'Inactivo'}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-zinc-500 mt-2">
                              Este mecánico todavía no tiene cuenta de acceso.
                            </p>
                          )}
                        </div>

                        {m.user && (
                          <button
                            onClick={() => resetPwd(m.id)}
                            className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-black hover:bg-yellow-300"
                          >
                            Restablecer contraseña
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <MechanicModal
          form={form}
          set={set}
          save={save}
          saving={saving}
          editing={editing}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
        active
          ? 'bg-yellow-400 text-black'
          : 'border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function MiniKpi({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
        <span className="text-yellow-400">{icon}</span>
      </div>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500 flex items-center gap-2">
        <span className="text-yellow-400">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-sm text-zinc-200 break-all">{value}</p>
    </div>
  )
}

function MechanicModal({ form, set, save, saving, editing, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-950 rounded-t-3xl z-10">
          <h3 className="text-lg font-bold text-white">
            {editing ? 'Editar mecánico' : 'Nuevo mecánico'}
          </h3>
          <button onClick={onClose}>
            <X size={18} className="text-zinc-500 hover:text-white" />
          </button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field className="col-span-2" label="Nombre completo *">
              <input required className="input" placeholder="Juan Pérez González" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>

            <Field label="RUT">
              <input className="input" placeholder="12.345.678-9" value={form.rut} onChange={(e) => set('rut', e.target.value)} />
            </Field>

            <Field label="Teléfono">
              <input className="input" placeholder="+56 9 1234 5678" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>

            <Field label="Email personal">
              <input className="input" type="email" placeholder="juan@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>

            <Field label="Especialidad">
              <input className="input" placeholder="Neumáticos, hidráulica..." value={form.speciality} onChange={(e) => set('speciality', e.target.value)} />
            </Field>

            <Field className="col-span-2" label="Certificaciones">
              <input className="input" placeholder="Licencia, certificaciones..." value={form.certifications} onChange={(e) => set('certifications', e.target.value)} />
            </Field>

            <Field className="col-span-2" label="Notas">
              <textarea className="input h-20 resize-none" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>

          {!editing && (
            <div className="border border-zinc-800 rounded-2xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.createUser}
                  onChange={(e) => set('createUser', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 accent-yellow-400"
                />
                <div>
                  <p className="text-sm font-bold text-zinc-200">Crear cuenta de acceso</p>
                  <p className="text-xs text-zinc-500">El mecánico podrá ingresar a la app mobile</p>
                </div>
              </label>

              {form.createUser && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
                  <Field label="Email de acceso *">
                    <input className="input" type="email" placeholder="juan@rivecor.cl" value={form.userEmail} onChange={(e) => set('userEmail', e.target.value)} />
                  </Field>

                  <Field label="Contraseña *">
                    <input className="input" type="text" placeholder="Contraseña" value={form.userPassword} onChange={(e) => set('userPassword', e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300">
              Cancelar
            </button>

            <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black hover:bg-yellow-300 flex items-center justify-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={15} /> {editing ? 'Guardar' : 'Crear mecánico'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs text-zinc-400 mb-1.5 block">{label}</label>
      {children}
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
        <button type="button" onClick={() => setShow(!show)} className="text-zinc-500 hover:text-zinc-300">
          {show ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      )}

      {copy && (
        <button type="button" onClick={handleCopy} className="text-zinc-500 hover:text-zinc-300">
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      )}
    </div>
  )
}