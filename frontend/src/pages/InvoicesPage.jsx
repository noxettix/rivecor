import { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Send, Eye, FileText, Check, ChevronDown, ChevronUp, X, Zap, ExternalLink } from 'lucide-react'

const STATUS_MAP = {
  DRAFT:     { label:'Borrador',  cls:'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 text-xs font-medium' },
  SENT:      { label:'Enviada',   cls:'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium' },
  PAID:      { label:'Pagada',    cls:'badge-ok' },
  OVERDUE:   { label:'Vencida',   cls:'badge-critical' },
  CANCELLED: { label:'Anulada',   cls:'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs font-medium' },
}

const TYPE_OPTIONS = [
  { value:'MONTHLY_FEE', label:'Cuota mensual' },
  { value:'MAINTENANCE', label:'Mantención' },
  { value:'TIRE_SALE',   label:'Venta neumático' },
  { value:'REPAIR',      label:'Reparación' },
  { value:'OTHER',       label:'Otro' },
]

const fmt = (n) => `$${Math.round(n||0).toLocaleString('es-CL')}`

const openPreview = async (id) => {
  try {
    const res = await api.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf',
      },
    })

    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `factura-${id}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()

    setTimeout(() => window.URL.revokeObjectURL(url), 10000)
  } catch (err) {
    console.error('Error al descargar PDF:', err)
    alert('No se pudo descargar el PDF')
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices]   = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [modal, setModal]         = useState(null)
  const [expanded, setExpanded]   = useState(null)
  const [sendModal, setSendModal] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus)  params.append('status', filterStatus)
      if (filterCompany) params.append('companyId', filterCompany)

      const [inv, comp] = await Promise.all([
        api.get(`/invoices?${params.toString()}`),
        api.get('/companies')
      ])

      setInvoices(inv.data)
      setCompanies(comp.data)
    } catch (e) {
      console.error(e)
      alert(e.response?.data?.error || 'Error cargando facturas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterStatus, filterCompany])

  const markPaid = async (id) => {
    try {
      await api.put(`/invoices/${id}/status`, { status:'PAID' })
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'No se pudo marcar como pagada')
    }
  }

  const cancel = async (id) => {
    if (!confirm('¿Anular esta factura?')) return
    try {
      await api.put(`/invoices/${id}/status`, { status:'CANCELLED' })
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'No se pudo anular la factura')
    }
  }

  const totalPending = invoices.filter(i=>i.status==='SENT').reduce((s,i)=>s+i.total,0)
  const totalPaid    = invoices.filter(i=>i.status==='PAID').reduce((s,i)=>s+i.total,0)
  const totalOverdue = invoices.filter(i=>i.status==='OVERDUE').length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Facturación</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Facturas por empresa</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('auto')} className="btn-ghost flex items-center gap-2">
            <Zap size={14} /> Auto-generar
          </button>
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Nueva factura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-zinc-500 mb-1">Por cobrar</p>
          <p className="text-xl font-bold text-blue-400">{fmt(totalPending)}</p>
          <p className="text-xs text-zinc-600 mt-1">{invoices.filter(i=>i.status==='SENT').length} factura(s)</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-zinc-500 mb-1">Cobrado este año</p>
          <p className="text-xl font-bold text-emerald-400">{fmt(totalPaid)}</p>
          <p className="text-xs text-zinc-600 mt-1">{invoices.filter(i=>i.status==='PAID').length} pagada(s)</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-zinc-500 mb-1">Vencidas</p>
          <p className={`text-xl font-bold ${totalOverdue>0?'text-red-400':'text-zinc-400'}`}>{totalOverdue}</p>
          <p className="text-xs text-zinc-600 mt-1">requieren atención</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select className="input w-48" value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}>
          <option value="">Todas las empresas</option>
          {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-40" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : invoices.length === 0 ? (
        <div className="card text-center py-12">
          <FileText size={32} className="mx-auto text-zinc-700 mb-3"/>
          <p className="text-sm text-zinc-500">Sin facturas registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const isOpen = expanded === inv.id
            const s = STATUS_MAP[inv.status] || STATUS_MAP.DRAFT
            return (
              <div key={inv.id} className="card p-0 overflow-hidden">
                <button
                  onClick={()=>setExpanded(isOpen?null:inv.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-white font-mono">{inv.number}</span>
                      <span className="text-xs text-zinc-500">·</span>
                      <span className="text-sm text-zinc-300">{inv.company?.name}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {inv.periodStart ? new Date(inv.periodStart).toLocaleDateString('es-CL',{month:'short',year:'numeric'}) : '—'}
                      {' — '}Vence: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-CL') : '—'}
                      {inv.sentAt && ` · Enviada ${new Date(inv.sentAt).toLocaleDateString('es-CL')}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-white">{fmt(inv.total)}</p>
                    <p className="text-xs text-zinc-500">{inv._count?.items||0} ítem(s)</p>
                  </div>

                  <span className={s.cls}>{s.label}</span>
                  {isOpen
                    ? <ChevronUp size={14} className="text-zinc-500 shrink-0"/>
                    : <ChevronDown size={14} className="text-zinc-500 shrink-0"/>
                  }
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 space-y-4">
                    <div className="space-y-1.5">
                      {inv.items?.map((item,i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 truncate flex-1">{item.description}</span>
                          <span className="text-zinc-300 font-medium ml-4 shrink-0">{fmt(item.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs pt-1 border-t border-zinc-800">
                        <span className="text-zinc-500">IVA ({Math.round((inv.taxRate||0.19)*100)}%)</span>
                        <span className="text-zinc-400">{fmt(inv.taxAmount)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>openPreview(inv.id)} className="btn-ghost flex items-center gap-1.5 text-xs">
                        <Eye size={12}/> Descargar PDF <ExternalLink size={10} className="text-zinc-600"/>
                      </button>

                      {inv.status === 'DRAFT' && (
                        <button onClick={()=>setSendModal(inv)} className="btn-primary flex items-center gap-1.5 text-xs">
                          <Send size={12}/> Enviar por email
                        </button>
                      )}

                      {inv.status === 'SENT' && (
                        <>
                          <button onClick={()=>setSendModal(inv)} className="btn-ghost flex items-center gap-1.5 text-xs">
                            <Send size={12}/> Reenviar
                          </button>
                          <button onClick={()=>markPaid(inv.id)} className="btn-primary flex items-center gap-1.5 text-xs">
                            <Check size={12}/> Marcar pagada
                          </button>
                        </>
                      )}

                      {['DRAFT','SENT'].includes(inv.status) && (
                        <button onClick={()=>cancel(inv.id)} className="btn-ghost text-xs text-red-400 hover:text-red-300">
                          Anular
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal === 'create' && <CreateModal companies={companies} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>}
      {modal === 'auto'   && <AutoModal   companies={companies} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>}
      {sendModal          && <SendModal invoice={sendModal} onClose={()=>setSendModal(null)} onSent={()=>{setSendModal(null);load()}}/>}
    </div>
  )
}

function AutoModal({ companies, onClose, onSaved }) {
  const now = new Date()
  const [form, setForm] = useState({ companyId:'', month:now.getMonth()+1, year:now.getFullYear() })
  const [loading, setLoad] = useState(false)
  const [result, setResult] = useState(null)

  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const generate = async () => {
    if (!form.companyId) return alert('Selecciona una empresa')
    setLoad(true)
    try {
      const { data } = await api.post(`/invoices/auto/${form.companyId}`, { month:form.month, year:form.year })
      setResult(data)
    } catch(e) {
      alert(e.response?.data?.error || 'Error')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap size={14} className="text-brand-400"/> Auto-generar factura
          </h3>
          <button onClick={onClose}><X size={16} className="text-zinc-500"/></button>
        </div>

        {!result ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Empresa *</label>
              <select className="input" value={form.companyId} onChange={e=>set('companyId',e.target.value)}>
                <option value="">Seleccionar...</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Mes</label>
                <select className="input" value={form.month} onChange={e=>set('month',e.target.value)}>
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i)=>(
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Año</label>
                <select className="input" value={form.year} onChange={e=>set('year',e.target.value)}>
                  {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={generate} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Zap size={13}/> {loading?'Generando...':'Generar factura'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
              <p className="text-emerald-400 font-semibold">✓ Factura generada</p>
              <p className="text-2xl font-bold text-white mt-1">{result.number}</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(result.total)}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={onSaved} className="btn-ghost flex-1">Cerrar</button>
              <button onClick={async ()=>{ await openPreview(result.id); onSaved(); }} className="btn-primary flex-1 flex items-center gap-2">
                <Eye size={13}/> Ver PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CreateModal({ companies, onClose, onSaved }) {
  const now = new Date()
  const [form, setForm] = useState({
    companyId:'', periodStart:'', periodEnd:'',
    dueDate: new Date(now.getFullYear(),now.getMonth()+1,now.getDate()).toISOString().split('T')[0],
    notes:'',
    items:[{ description:'', quantity:1, unitPrice:'', type:'MONTHLY_FEE' }]
  })
  const [loading, setLoad] = useState(false)

  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const addItem = () => setForm(p=>({...p,items:[...p.items,{description:'',quantity:1,unitPrice:'',type:'SERVICE'}]}))
  const removeItem = (i) => setForm(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}))
  const updateItem = (i,k,v) => setForm(p=>({...p,items:p.items.map((item,idx)=>idx===i?{...item,[k]:v}:item)}))

  const subtotal = form.items.reduce((s,i)=>s+((parseFloat(i.unitPrice)||0)*(parseFloat(i.quantity)||1)),0)
  const total = subtotal * 1.19

  const submit = async (e) => {
    e.preventDefault()
    setLoad(true)
    try {
      await api.post('/invoices', form)
      onSaved()
    } catch(err) {
      alert(err.response?.data?.error || 'Error')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 rounded-t-2xl">
          <h3 className="text-sm font-semibold text-white">Nueva factura</h3>
          <button onClick={onClose}><X size={16} className="text-zinc-500"/></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">Empresa *</label>
              <select required className="input" value={form.companyId} onChange={e=>set('companyId',e.target.value)}>
                <option value="">Seleccionar empresa...</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name} — {c.rut}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Período desde</label>
              <input type="date" className="input" value={form.periodStart} onChange={e=>set('periodStart',e.target.value)}/>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Período hasta</label>
              <input type="date" className="input" value={form.periodEnd} onChange={e=>set('periodEnd',e.target.value)}/>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vencimiento</label>
              <input type="date" className="input" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)}/>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-400 font-medium">Ítems</label>
              <button type="button" onClick={addItem} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus size={12}/> Agregar ítem
              </button>
            </div>

            <div className="space-y-2">
              {form.items.map((item,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input className="input text-xs" placeholder="Descripción" value={item.description} onChange={e=>updateItem(i,'description',e.target.value)}/>
                  </div>
                  <div className="col-span-2">
                    <select className="input text-xs" value={item.type} onChange={e=>updateItem(i,'type',e.target.value)}>
                      {TYPE_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <input type="number" className="input text-xs" placeholder="Cant" value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)}/>
                  </div>
                  <div className="col-span-3">
                    <input type="number" className="input text-xs" placeholder="Precio unit." value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)}/>
                  </div>
                  <div className="col-span-1 text-right">
                    {form.items.length>1&&<button type="button" onClick={()=>removeItem(i)} className="text-zinc-600 hover:text-red-400"><X size={14}/></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-zinc-500"><span>IVA 19%</span><span>{fmt(subtotal*0.19)}</span></div>
            <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-zinc-700"><span>Total</span><span>{fmt(total)}</span></div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
            <textarea className="input h-16 resize-none" value={form.notes} onChange={e=>set('notes',e.target.value)}/>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Check size={14}/> {loading?'Guardando...':'Crear factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SendModal({ invoice, onClose, onSent }) {
  const [email, setEmail] = useState(invoice.company?.contactEmail||invoice.sentTo||'')
  const [sending, setSend] = useState(false)

  const send = async () => {
    if (!email) return alert('Ingresa el email del cliente')
    setSend(true)
    try {
      await api.post(`/invoices/${invoice.id}/send`, { email })
      onSent()
    } catch(e) {
      alert(e.response?.data?.error || 'Error al enviar')
    } finally {
      setSend(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Send size={14} className="text-brand-400"/> Enviar factura
          </h3>
          <button onClick={onClose}><X size={16} className="text-zinc-500"/></button>
        </div>

        <div className="mb-3">
          <p className="text-xs text-zinc-400 mb-1">Factura</p>
          <p className="text-sm font-bold text-white">{invoice.number} — {fmt(invoice.total)}</p>
          <p className="text-xs text-zinc-500">{invoice.company?.name}</p>
        </div>

        <div className="mb-4">
          <label className="text-xs text-zinc-400 mb-1 block">Email del cliente *</label>
          <input type="email" className="input" placeholder="contacto@empresa.cl" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={send} disabled={sending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Send size={13}/> {sending?'Enviando...':'Enviar factura'}
          </button>
        </div>
      </div>
    </div>
  )
}