import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  Plus,
  FileText,
  ExternalLink,
  Check,
  X,
  Recycle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function initialForm() {
  return {
    equipmentId: "",
    tireId: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    quantity: 1,
    weight: "",
    disposalMethod: "",
    disposalCompany: "",
    certificate: "",
    notes: "",
  };
}

function formatDate(date) {
  if (!date) return "Sin fecha";
  try {
    return new Date(date).toLocaleDateString("es-CL");
  } catch {
    return "Sin fecha";
  }
}

export default function REPPage() {
  const { user } = useAuth();

  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "OPERATOR" ||
    user?.role === "MECHANIC";

  const [records, setRecords] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [tires, setTires] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingTires, setLoadingTires] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState(initialForm());

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [repRes, eqRes] = await Promise.allSettled([
        api.get("/rep"),
        api.get("/equipments"),
      ]);

      if (repRes.status === "fulfilled") {
        setRecords(normalizeArray(repRes.value?.data));
      } else {
        console.error("Error cargando /rep:", repRes.reason);
        setRecords([]);
        setError("No se pudo conectar con el módulo REP.");
      }

      if (eqRes.status === "fulfilled") {
        setEquipments(normalizeArray(eqRes.value?.data));
      } else {
        console.error("Error cargando /equipments:", eqRes.reason);
        setEquipments([]);
      }
    } catch (err) {
      console.error("Error general REP:", err);
      setRecords([]);
      setEquipments([]);
      setError("Ocurrió un error cargando REP.");
    } finally {
      setLoading(false);
    }
  };

  const loadTires = async (equipmentId) => {
    if (!equipmentId) {
      setTires([]);
      return;
    }

    setLoadingTires(true);

    try {
      const { data } = await api.get(`/tires/equipment/${equipmentId}`);
      setTires(normalizeArray(data));
    } catch (err) {
      console.error("Error cargando neumáticos:", err?.response?.data || err);
      setTires([]);
      alert("No se pudieron cargar los neumáticos del equipo.");
    } finally {
      setLoadingTires(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => Number(r.year) === Number(year));
  }, [records, year]);

  const totalWeight = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + Number(r?.weight || 0), 0);
  }, [filteredRecords]);

  const totalQuantity = useMemo(() => {
    return filteredRecords.reduce(
      (sum, r) => sum + Number(r?.quantity || 0),
      0
    );
  }, [filteredRecords]);

  const submit = async (e) => {
    e.preventDefault();

    if (!form.tireId) {
      alert("Selecciona un neumático.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/rep", {
        tireId: form.tireId,
        year: Number(form.year),
        month: Number(form.month),
        quantity: Number(form.quantity || 1),
        weight: form.weight === "" ? null : Number(form.weight),
        disposalMethod: form.disposalMethod || null,
        disposalCompany: form.disposalCompany || null,
        certificate: form.certificate || null,
        notes: form.notes || null,
      });

      setShowForm(false);
      setForm(initialForm());
      setTires([]);
      await load();
    } catch (err) {
      console.error("Error registrando REP:", err?.response?.data || err);
      alert(err?.response?.data?.error || "No se pudo registrar el retiro REP.");
    } finally {
      setSubmitting(false);
    }
  };

  const openReport = async () => {
    try {
      const res = await api.get(`/rep/report?year=${year}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error abriendo reporte:", err?.response?.data || err);
      alert("No se pudo abrir el reporte REP.");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Registro REP</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Ley 20.920 — Disposición final de neumáticos
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white outline-none"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={openReport}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            <FileText size={16} />
            Reporte auditoría
            <ExternalLink size={13} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-300"
            >
              <Plus size={16} />
              Registrar retiro
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi title="Registros" value={filteredRecords.length} />
        <Kpi title="Neumáticos" value={totalQuantity} />
        <Kpi title="Peso total" value={`${totalWeight.toFixed(1)} kg`} />
        <Kpi title="Año" value={year} />
      </div>

      {showForm && isAdmin && (
        <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Registrar retiro REP</h2>
              <p className="text-sm text-zinc-500">
                Selecciona un equipo, el neumático retirado y los datos de
                disposición final.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(initialForm());
                setTires([]);
              }}
              className="rounded-xl border border-zinc-700 p-2 text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Equipo">
              <select
                required
                className="input-dark"
                value={form.equipmentId}
                onChange={(e) => {
                  const equipmentId = e.target.value;
                  setForm((p) => ({ ...p, equipmentId, tireId: "" }));
                  loadTires(equipmentId);
                }}
              >
                <option value="">Seleccionar equipo...</option>
                {equipments.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.code || eq.name} — {eq.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Neumático">
              <select
                required
                className="input-dark"
                value={form.tireId}
                disabled={!form.equipmentId || loadingTires}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tireId: e.target.value }))
                }
              >
                <option value="">
                  {loadingTires
                    ? "Cargando neumáticos..."
                    : "Seleccionar neumático..."}
                </option>
                {tires.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.position || "Sin posición"} — {t.brand || "Sin marca"}{" "}
                    {t.size || ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Año">
              <input
                className="input-dark"
                type="number"
                value={form.year}
                onChange={(e) =>
                  setForm((p) => ({ ...p, year: e.target.value }))
                }
              />
            </Field>

            <Field label="Mes">
              <select
                className="input-dark"
                value={form.month}
                onChange={(e) =>
                  setForm((p) => ({ ...p, month: e.target.value }))
                }
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cantidad">
              <input
                className="input-dark"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quantity: e.target.value }))
                }
              />
            </Field>

            <Field label="Peso total (kg)">
              <input
                className="input-dark"
                type="number"
                step="0.1"
                placeholder="Ej: 25.5"
                value={form.weight}
                onChange={(e) =>
                  setForm((p) => ({ ...p, weight: e.target.value }))
                }
              />
            </Field>

            <Field label="Método / punto de disposición">
              <input
                className="input-dark"
                placeholder="Ej: Reciclaje / disposición autorizada"
                value={form.disposalMethod}
                onChange={(e) =>
                  setForm((p) => ({ ...p, disposalMethod: e.target.value }))
                }
              />
            </Field>

            <Field label="Empresa gestora">
              <input
                className="input-dark"
                placeholder="Ej: Gestor autorizado"
                value={form.disposalCompany}
                onChange={(e) =>
                  setForm((p) => ({ ...p, disposalCompany: e.target.value }))
                }
              />
            </Field>

            <Field label="Certificado / guía / factura">
              <input
                className="input-dark"
                placeholder="Ej: CERT-001"
                value={form.certificate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, certificate: e.target.value }))
                }
              />
            </Field>

            <Field label="Notas">
              <textarea
                className="input-dark min-h-[90px] resize-none"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </Field>

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(initialForm());
                  setTires([]);
                }}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60"
              >
                <Check size={16} />
                {submitting ? "Guardando..." : "Registrar retiro"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <Recycle size={42} className="mx-auto text-green-500 mb-4" />
          <p className="font-semibold text-zinc-300">
            Sin registros de retiro aún
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Los neumáticos retirados aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-lg font-bold">
            Neumáticos retirados ({filteredRecords.length})
          </h2>

          <div className="space-y-3">
            {filteredRecords.map((r) => {
              const tire = r.tires || r.stock_tires || {};
              const equipment = r.tires?.equipments || {};

              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-zinc-800 bg-black/30 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {tire.brand || "Sin marca"} {tire.model || ""}{" "}
                        {tire.size || ""}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Equipo: {equipment.code || equipment.name || "-"} ·
                        Posición: {tire.position || "-"}
                      </p>
                    </div>

                    <div className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-400">
                      Registrado REP
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-zinc-400">
                    <p>
                      <b>Año/Mes:</b> {r.year}/{r.month || "-"}
                    </p>
                    <p>
                      <b>Cantidad:</b> {r.quantity || 1}
                    </p>
                    <p>
                      <b>Peso:</b>{" "}
                      {r.weight != null ? `${r.weight} kg` : "-"}
                    </p>
                    <p>
                      <b>Gestor:</b> {r.disposalCompany || "-"}
                    </p>
                    <p>
                      <b>Fecha:</b> {formatDate(r.createdAt)}
                    </p>
                  </div>

                  {(r.disposalMethod || r.certificate || r.notes) && (
                    <div className="mt-3 rounded-xl bg-zinc-950 p-3 text-xs text-zinc-500">
                      {r.disposalMethod && (
                        <p>
                          <b>Método:</b> {r.disposalMethod}
                        </p>
                      )}
                      {r.certificate && (
                        <p>
                          <b>Certificado:</b> {r.certificate}
                        </p>
                      )}
                      {r.notes && (
                        <p>
                          <b>Notas:</b> {r.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .input-dark {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid rgb(63 63 70);
          background: rgb(9 9 11);
          padding: 0.75rem 0.9rem;
          color: white;
          outline: none;
        }
        .input-dark:focus {
          border-color: rgb(250 204 21);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{title}</p>
    </div>
  );
}