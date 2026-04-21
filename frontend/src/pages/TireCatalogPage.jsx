import { useEffect, useState } from 'react'
import api from '../services/api'
import { Upload, Trash2, Plus } from 'lucide-react'

export default function TireCatalogPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)

  const [form, setForm] = useState({
    brand: '',
    model: '',
    size: '',
    purchasePrice: '',
    depthNew: '',
    depthMin: '',
  })

  const load = async () => {
    const res = await api.get('/admin/tire-catalog')
    setItems(res.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleUpload = async () => {
    if (!file) return alert('Selecciona archivo')

    const formData = new FormData()
    formData.append('file', file)

    await api.post('/admin/tire-catalog/upload', formData)
    setFile(null)
    load()
  }

  const handleCreate = async () => {
    await api.post('/admin/tire-catalog', {
      ...form,
      purchasePrice: Number(form.purchasePrice),
      depthNew: Number(form.depthNew),
      depthMin: Number(form.depthMin),
    })
    setForm({
      brand: '',
      model: '',
      size: '',
      purchasePrice: '',
      depthNew: '',
      depthMin: '',
    })
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar?')) return
    await api.delete(`/admin/tire-catalog/${id}`)
    load()
  }

  return (
    <div className="p-6 text-white space-y-6">

      <h1 className="text-xl font-bold">Catálogo neumáticos</h1>

      {/* SUBIR EXCEL */}
      <div className="bg-zinc-900 p-4 rounded-xl space-y-3">
        <p className="text-sm text-zinc-400">Subir Excel</p>
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
        />
        <button onClick={handleUpload} className="btn-primary flex gap-2">
          <Upload size={16} /> Subir
        </button>
      </div>

      {/* CREAR MANUAL */}
      <div className="bg-zinc-900 p-4 rounded-xl grid grid-cols-6 gap-2">
        <input className="input" placeholder="Marca"
          value={form.brand}
          onChange={e => setForm({ ...form, brand: e.target.value })}
        />
        <input className="input" placeholder="Modelo"
          value={form.model}
          onChange={e => setForm({ ...form, model: e.target.value })}
        />
        <input className="input" placeholder="Medida"
          value={form.size}
          onChange={e => setForm({ ...form, size: e.target.value })}
        />
        <input className="input" placeholder="Precio"
          value={form.purchasePrice}
          onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
        />
        <input className="input" placeholder="Depth new"
          value={form.depthNew}
          onChange={e => setForm({ ...form, depthNew: e.target.value })}
        />
        <input className="input" placeholder="Depth min"
          value={form.depthMin}
          onChange={e => setForm({ ...form, depthMin: e.target.value })}
        />

        <button onClick={handleCreate} className="col-span-6 btn-primary flex gap-2 justify-center">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* LISTA */}
      {loading ? 'Cargando...' : (
        <div className="space-y-2">
          {items.map(i => (
            <div key={i.id} className="bg-zinc-900 p-3 rounded-lg flex justify-between">
              <div>
                <p>{i.brand} {i.model}</p>
                <p className="text-sm text-zinc-400">{i.size}</p>
              </div>

              <div className="flex items-center gap-4">
                <p>${i.purchasePrice}</p>

                <button onClick={() => handleDelete(i.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}