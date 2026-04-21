import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function formatDate(date) {
  if (!date) return "Sin fecha";

  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  } catch {
    return "Sin fecha";
  }
}

function statusColor(status) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500/20 text-yellow-400";
    case "ASSIGNED":
      return "bg-blue-500/20 text-blue-400";
    case "IN_PROGRESS":
      return "bg-purple-500/20 text-purple-400";
    case "DONE":
      return "bg-green-500/20 text-green-400";
    case "CANCELLED":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-zinc-700 text-zinc-300";
  }
}

function statusLabel(status) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "ASSIGNED":
      return "Asignado";
    case "IN_PROGRESS":
      return "En progreso";
    case "DONE":
      return "Finalizado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status || "Sin estado";
  }
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    try {
      const { data } = await api.get("/maintenance/requests");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
      setError("No se pudieron cargar las solicitudes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="card">
          <p className="text-lg font-semibold">Cargando solicitudes...</p>
          <p className="text-sm text-zinc-500 mt-2">
            Obteniendo datos desde el servidor
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-white max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes</h1>
          <p className="text-zinc-500 text-sm">
            Historial completo de mantenimiento
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-sm">
          Total: {requests.length}
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-zinc-500">
            No hay solicitudes todavía.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="card flex flex-col md:flex-row justify-between gap-4"
            >
              <div className="space-y-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    {r.clientName || "Sin cliente"}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    #{r.id}
                  </p>
                </div>

                <div className="text-sm text-zinc-400 space-y-1">
                  <p><b>Patente:</b> {r.plate || "-"}</p>
                  <p><b>Fecha:</b> {formatDate(r.createdAt)}</p>
                  <p><b>Descripción:</b> {r.description || "-"}</p>
                  <p><b>Prioridad:</b> {r.priority}</p>
                  <p><b>Tipo:</b> {r.problemType}</p>
                  <p><b>Mecánico:</b> {r.mechanicId || "Sin asignar"}</p>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(
                    r.status
                  )}`}
                >
                  {statusLabel(r.status)}
                </span>

                <Link
                  to={`/tracking/${r.id}`}
                  className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition"
                >
                  Ver tracking
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}