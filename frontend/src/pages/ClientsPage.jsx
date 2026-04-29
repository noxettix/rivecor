import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import {
  Plus, Building2, ChevronDown, ChevronUp,
  Check, X, RefreshCw, Eye, EyeOff, Copy, Wrench
} from 'lucide-react'

const fmt = n => n != null ? `$${Math.round(n).toLocaleString('es-CL')}` : '—'

export default function ClientsPage() {
  const [companies, setCompanies] = useState([])
  const [allEquipments, setAllEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [created, setCreated] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError('')

      const [clientsRes, equipmentsRes] = await Promise.all([
        api.get('/clients'),
        api.get('/equipments').catch(() => ({ data: [] })),
      ])

      setCompanies(Array.isArray(clientsRes.data) ? clientsRes.data : [])
      setAllEquipments(Array.isArray(equipmentsRes.data) ? equipmentsRes.data : [])
    } catch (err) {
      console.error('Error cargando clientes:', err)

      if (err?.response?.status === 401) {
        setError('No autorizado para ver clientes. El backend respondió 401.')
      } else {
        setError(err?.response?.data?.error || 'No se pudieron cargar los clientes.')
      }

      setCompanies([])
      setAllEquipments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalActiveContracts = companies.filter(c => c.contracts?.length > 0).length

  const totalEquipments = companies.reduce((sum, c) => {
    const fromClient = c.equipments?.length || c._count?.equipments || 0
    return sum + fromClient
  }, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Gestión de clientes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Empresas, usuarios, equipos y mecánicos asignados
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{companies.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Empresas activas</p>
        </div>

        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{totalActiveContracts}</p>
          <p className="text-xs text-zinc-500 mt-1">Con contrato activo</p>
        </div>

        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{totalEquipments}</p>
          <p className="text-xs text-zinc-500 mt-1">Equipos totales</p>
        </div>
      </div>

      {created && (
        <div className="card border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400 mb-3">
                ✓ Cliente creado — credenciales enviadas por email
              </p>

              <div className="space-y-2 text-sm">
                <CredRow label="Empresa" value={created.company?.name} />
                <CredRow label="Usuario" value={created.user?.name} />
                <CredRow label="Email" value={created.user?.email} copy />
                <CredRow label="Contraseña" value={created.passwordPlain} copy secret />
                {created.contract && (
                  <CredRow label="Contrato" value={created.contract?.number} />
                )}
              </div>
            </div>

            <button
              onClick={() => setCreated(null)}
              className="text-zinc-500 hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            {error ? 'No fue posible cargar clientes' : 'Sin clientes aún'}
          </p>

          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary mt-4 text-sm"
          >
            Crear primer cliente
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {companies.map(c => (
            <CompanyCard
              key={c.id}
              company={c}
              allEquipments={allEquipments}
              isExpanded={expanded === c.id}
              onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
              onUpdate={load}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={(data) => {
            setCreated(data)
            setShowCreate(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function CompanyCard({ company, allEquipments, isExpanded, onToggle, onUpdate }) {
  const [mechanics, setMechanics] = useState(null)
  const [loadingM, setLoadingM] = useState(false)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const contract = company.contracts?.[0]

  const companyEquipments = useMemo(() => {
    if (Array.isArray(company.equipments) && company.equipments.length > 0) {
      return company.equipments
    }

    return (allEquipments || []).filter(eq => {
      return (
        eq.companyId === company.id ||
        eq.company_id === company.id ||
        eq.companies?.id === company.id ||
        eq.company?.id === company.id
      )
    })
  }, [company, allEquipments])

  const filteredEquipments = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase()

    if (!q) return companyEquipments

    return companyEquipments.filter(eq => {
      const text = [
        eq.code,
        eq.name,
        eq.licensePlate,
        eq.plate,
        eq.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return text.includes(q)
    })
  }, [companyEquipments, equipmentSearch])

  const loadMechanics = async () => {
    if (mechanics) return

    try {
      setLoadingM(true)
      const { data } = await api.get(`/clients/${company.id}/mechanics`)
      setMechanics(data || { assigned: [], available: [] })
    } catch (err) {
      console.error('Error cargando mecánicos asignados:', err)
      setMechanics({ assigned: [], available: [] })
    } finally {
      setLoadingM(false)
    }
  }

  const handleExpand = () => {
    onToggle()
    if (!isExpanded) loadMechanics()
  }

  const assign = async (mechanicId) => {
    try {
      await api.post(`/clients/${company.id}/mechanics`, { mechanicId })
      const { data } = await api.get(`/clients/${company.id}/mechanics`)
      setMechanics(data || { assigned: [], available: [] })
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || 'No se pudo asignar mecánico')
    }
  }

  const remove = async (mechanicId) => {
    try {
      await api.delete(`/clients/${company.id}/mechanics/${mechanicId}`)
      const { data } = await api.get(`/clients/${company.id}/mechanics`)
      setMechanics(data || { assigned: [], available: [] })
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || 'No se pudo quitar mecánico')
    }
  }

  const resetPwd = async () => {
    if (!confirm(`¿Restablecer contraseña de ${company.name}?`)) return

    try {
      const { data } = await api.post(`/clients/${company.id}/reset-password`)
      alert(`Nueva contraseña enviada por email: ${data.newPassword}`)
      onUpdate?.()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || 'No se pudo restablecer contraseña')
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-brand-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{company.name}</p>

            {contract ? (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                Contrato activo
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                Sin contrato
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-500 mt-0.5">
            RUT: {company.rut}
            {company._count?.equipments > 0 &&
              ` · ${company._count.equipments} equipo${company._count.equipments !== 1 ? 's' : ''}`}
            {contract?.monthlyValue && ` · ${fmt(contract.monthlyValue)}/mes`}
            {company.mechanics?.length > 0 &&
              ` · ${company.mechanics.length} mecánico${company.mechanics.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {isExpanded ? (
          <ChevronUp size={14} className="text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-zinc-500 shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800 p-4 space-y-5 bg-zinc-900/40">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {company.contactName && <InfoRow label="Contacto" value={company.contactName} />}
            {company.contactEmail && <InfoRow label="Email" value={company.contactEmail} />}
            {company.phone && <InfoRow label="Teléfono" value={company.phone} />}
            {company.industry && <InfoRow label="Industria" value={company.industry} />}
            {company.address && <InfoRow label="Dirección" value={company.address} />}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Equipos del cliente
              </p>

              <span className="text-[11px] text-zinc-500">
                {companyEquipments.length} equipo{companyEquipments.length !== 1 ? 's' : ''}
              </span>
            </div>

            <input
              placeholder="Buscar por patente, código o nombre..."
              className="input mb-3"
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
            />

            {companyEquipments.length === 0 ? (
              <p className="text-xs text-zinc-600">
                No hay equipos registrados para este cliente o el backend no los está enviando.
              </p>
            ) : filteredEquipments.length === 0 ? (
              <p className="text-xs text-zinc-600">
                No se encontraron equipos con esa patente.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredEquipments.map(eq => (
                  <div
                    key={eq.id}
                    className="flex items-center justify-between gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate">
                        {eq.code || eq.licensePlate || eq.plate || 'SIN PATENTE'}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {eq.name || 'Equipo'} {eq.type ? `· ${eq.type}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Usuarios
            </p>

            {company.users?.length === 0 ? (
              <p className="text-xs text-zinc-600">Sin usuarios</p>
            ) : (
              company.users?.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {u.name?.[0]?.toUpperCase() || 'U'}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs font-medium text-zinc-200">{u.name}</p>
                    <p className="text-[11px] text-zinc-500">{u.email}</p>
                  </div>

                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      u.isActive
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-zinc-700 text-zinc-500'
                    }`}
                  >
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))
            )}

            <button
              onClick={resetPwd}
              className="btn-ghost flex items-center gap-1.5 text-xs mt-2"
            >
              <RefreshCw size={11} /> Restablecer contraseña
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Mecánicos asignados
            </p>

            {loadingM ? (
              <div className="w-4 h-4 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mechanics?.assigned?.length === 0 ? (
                  <p className="text-xs text-zinc-600 mb-3">Sin mecánicos asignados</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {mechanics?.assigned?.map(m => (
                      <div
                        key={m.id}
                        className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1"
                      >
                        <Wrench size={10} className="text-brand-400" />
                        <span className="text-xs text-zinc-200">{m.name}</span>
                        <button
                          onClick={() => remove(m.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors ml-1"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {mechanics?.available?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-zinc-600 mb-2">Agregar mecánico:</p>
                    <div className="flex flex-wrap gap-2">
                      {mechanics.available.map(m => (
                        <button
                          key={m.id}
                          onClick={() => assign(m.id)}
                          className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-brand-500/40 hover:bg-brand-500/5 rounded-full px-3 py-1 transition-colors"
                        >
                          <Plus size={10} className="text-zinc-500" />
                          <span className="text-xs text-zinc-400">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    companyName: '',
    rut: '',
    industry: '',
    address: '',
    phone: '',
    contactName: '',
    contactEmail: '',
    userName: '',
    userEmail: '',
    userPassword: '',
    contractMonthlyValue: '',
    contractStartDate: '',
    contractEndDate: '',
    contractNotes: '',
  })

  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()

    if (!form.companyName || !form.rut || !form.userName || !form.userEmail) {
      return setError('Completa los campos obligatorios *')
    }

    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/clients', form)
      onCreated(data)
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.error || 'Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 rounded-t-2xl z-10">
          <div>
            <h3 className="text-sm font-semibold text-white">Nuevo cliente</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Crea empresa, usuario y contrato en un paso
            </p>
          </div>

          <button onClick={onClose}>
            <X size={16} className="text-zinc-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-6">
          <Section title="🏢 Datos de la empresa">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre empresa *" span={2}>
                <input
                  className="input"
                  required
                  value={form.companyName}
                  onChange={e => set('companyName', e.target.value)}
                  placeholder="Ej: Minera Los Andes S.A."
                />
              </Field>

              <Field label="RUT *">
                <input
                  className="input"
                  required
                  value={form.rut}
                  onChange={e => set('rut', e.target.value)}
                  placeholder="76.123.456-7"
                />
              </Field>

              <Field label="Industria">
                <input
                  className="input"
                  value={form.industry}
                  onChange={e => set('industry', e.target.value)}
                  placeholder="Minería, construcción..."
                />
              </Field>

              <Field label="Teléfono">
                <input
                  className="input"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </Field>

              <Field label="Email contacto">
                <input
                  className="input"
                  type="email"
                  value={form.contactEmail}
                  onChange={e => set('contactEmail', e.target.value)}
                  placeholder="gerencia@empresa.cl"
                />
              </Field>

              <Field label="Nombre contacto" span={2}>
                <input
                  className="input"
                  value={form.contactName}
                  onChange={e => set('contactName', e.target.value)}
                  placeholder="Nombre del jefe de flota o contacto"
                />
              </Field>

              <Field label="Dirección" span={2}>
                <input
                  className="input"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Av. Principal 123, Santiago"
                />
              </Field>
            </div>
          </Section>

          <Section title="👤 Usuario de acceso">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre completo *">
                <input
                  className="input"
                  required
                  value={form.userName}
                  onChange={e => set('userName', e.target.value)}
                  placeholder="Nombre Apellido"
                />
              </Field>

              <Field label="Email de acceso *">
                <input
                  className="input"
                  required
                  type="email"
                  value={form.userEmail}
                  onChange={e => set('userEmail', e.target.value)}
                  placeholder="usuario@empresa.cl"
                />
              </Field>

              <Field label="Contraseña (dejar vacío = generar automática)" span={2}>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    value={form.userPassword}
                    onChange={e => set('userPassword', e.target.value)}
                    placeholder="Dejar vacío para generar automáticamente"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Si dejas vacío, se genera una contraseña aleatoria y se envía al email del cliente.
                </p>
              </Field>
            </div>
          </Section>

          <Section title="📄 Contrato (opcional)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor mensual ($)">
                <input
                  className="input"
                  type="number"
                  value={form.contractMonthlyValue}
                  onChange={e => set('contractMonthlyValue', e.target.value)}
                  placeholder="Ej: 350000"
                />
              </Field>

              <Field label="Inicio contrato">
                <input
                  className="input"
                  type="date"
                  value={form.contractStartDate}
                  onChange={e => set('contractStartDate', e.target.value)}
                />
              </Field>

              <Field label="Fin contrato">
                <input
                  className="input"
                  type="date"
                  value={form.contractEndDate}
                  onChange={e => set('contractEndDate', e.target.value)}
                />
              </Field>

              <Field label="Notas contrato">
                <input
                  className="input"
                  value={form.contractNotes}
                  onChange={e => set('contractNotes', e.target.value)}
                  placeholder="Condiciones especiales..."
                />
              </Field>
            </div>
          </Section>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={14} /> Crear cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        {title}
      </p>
      {children}
    </div>
  )
}

function Field({ label, children, span }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-600 shrink-0">{label}:</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  )
}

function CredRow({ label, value, copy, secret }) {
  const [show, setShow] = useState(!secret)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-500 w-24 shrink-0 text-xs">{label}</span>

      <span className="text-zinc-200 font-mono text-sm flex-1">
        {secret && !show ? '••••••••' : (value || '—')}
      </span>

      {secret && (
        <button onClick={() => setShow(!show)} className="text-zinc-500 hover:text-zinc-300">
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      )}

      {copy && (
        <button onClick={handleCopy} className="text-zinc-500 hover:text-zinc-300">
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      )}
    </div>
  )
}