import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Clock, ChevronDown, RefreshCw } from "lucide-react";

const STATUS_MAP = {
  PENDING: { label: "Pendiente", cls: "text-yellow-400" },
  SCHEDULED: { label: "Tomado", cls: "text-blue-400" },
  IN_PROGRESS: { label: "En camino", cls: "text-purple-400" },
  COMPLETED: { label: "Finalizado", cls: "text-green-400" },
  CANCELLED: { label: "Cancelado", cls: "text-zinc-400" },
};

const TYPE_MAP = {
  INSPECTION: "Inspección",
  ROTATION: "Rotación",
  REPLACEMENT: "Reemplazo",
  PRESSURE_CHECK: "Presión",
  EMERGENCY: "Emergencia",
};

function formatDate(date) {
  if (!date) return "Sin fecha";
  try {
    return new Date(date).toLocaleString("es-CL");
  } catch {
    return "Sin fecha";
  }
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      setLoading(true);

      const { data } = await api.get("/maintenance/requests");

      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando mantenciones:", err?.response?.data || err);
      setError("No se pudieron cargar las solicitudes de mantención.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = {
    active: requests.filter((r) =>
      ["PENDING", "SCHEDULED", "IN_PROGRESS"].includes(r.status)
    ),
    done: requests.filter((r) =>
      ["COMPLETED", "CANCELLED"].includes(r.status)
    ),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mantención</h1>
          <p className="text-sm text-zinc-500">Solicitudes del sistema</p>
        </div>

        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:border-yellow-400/40"
        >
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Section title="Activas" requests={grouped.active} />
          <Section title="Historial" requests={grouped.done} />

          {requests.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
              <p className="text-zinc-400 font-semibold">
                No hay solicitudes registradas.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, requests }) {
  const [open, setOpen] = useState(true);

  if (!requests.length) return null;

  return (
    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex justify-between w-full items-center"
      >
        <h2 className="font-semibold">
          {title}{" "}
          <span className="text-xs text-zinc-500">({requests.length})</span>
        </h2>

        <ChevronDown
          size={16}
          className={`text-zinc-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {requests.map((r) => {
            const s = STATUS_MAP[r.status] || STATUS_MAP.PENDING;

            const plate =
              r.licensePlate ||
              r.equipments?.code ||
              r.equipments?.licensePlate ||
              r.equipments?.name ||
              "-";

            const mechanic = r.mechanic?.name || "Sin asignar";

            return (
              <div
                key={r.id}
                className="p-4 bg-black/30 rounded-xl border border-zinc-800 hover:border-yellow-400/30 transition"
              >
                <div className="flex justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      {TYPE_MAP[r.type] || r.type || "Solicitud"}
                    </p>

                    <p className="text-xs text-zinc-400">
                      <b>Patente:</b> {plate}
                    </p>

                    <p className="text-xs text-zinc-400">
                      <b>Mecánico:</b> {mechanic}
                    </p>

                    <p className="text-xs text-zinc-500">
                      {r.description || "Sin descripción"}
                    </p>

                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(r.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className={`text-xs font-bold ${s.cls}`}>
                      {s.label}
                    </span>

                    <Link
                      to={`/tracking/${r.id}`}
                      className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300"
                    >
                      Ver seguimiento
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}