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
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "bg-yellow-500/20 text-yellow-400";
    case "SCHEDULED":
      return "bg-blue-500/20 text-blue-400";
    case "IN_PROGRESS":
      return "bg-purple-500/20 text-purple-400";
    case "COMPLETED":
      return "bg-green-500/20 text-green-400";
    case "CANCELLED":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-zinc-700 text-zinc-300";
  }
}

function statusLabel(status) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "Pendiente";
    case "SCHEDULED":
      return "Tomado";
    case "IN_PROGRESS":
      return "En camino";
    case "COMPLETED":
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

  const loadRequests = async () => {
    try {
      const { data } = await api.get("/maintenance/requests");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
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
        <p className="text-lg">Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-white max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Solicitudes</h1>
          <p className="text-zinc-500 text-sm">
            Seguimiento en tiempo real de tus mantenimientos
          </p>
        </div>

        <div className="flex gap-3">
          <div className="bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
            {requests.length} total
          </div>

          <Link
            to="/request-maintenance"
            className="bg-yellow-400 text-black px-5 py-2 rounded-xl font-semibold hover:bg-yellow-300 transition"
          >
            + Nueva
          </Link>
        </div>
      </div>

      {/* LISTA */}
      {requests.length === 0 ? (
        <div className="text-center text-zinc-500 py-20">
          No tienes solicitudes aún
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5 hover:border-yellow-400/30 transition"
            >
              {/* INFO */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    {r.licensePlate ||
                      r.equipments?.code ||
                      r.equipments?.name ||
                      "Solicitud"}
                  </h2>
                  <p className="text-xs text-zinc-500">ID: {r.id}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-zinc-400">
                  <p><b>Cliente:</b> {r.users?.name || "Cliente"}</p>
                  <p><b>Fecha:</b> {formatDate(r.createdAt)}</p>
                  <p><b>Tipo:</b> {r.type || "-"}</p>
                  <p><b>Prioridad:</b> {r.priority}</p>
                  <p><b>Mecánico:</b> {r.mechanic?.name || "Sin asignar"}</p>
                </div>

                <p className="text-xs text-zinc-500 line-clamp-2">
                  {r.description}
                </p>
              </div>

              {/* ACCIONES */}
              <div className="flex flex-col justify-between items-end gap-3">
                <span
                  className={`px-4 py-1 rounded-full text-xs font-semibold ${statusColor(
                    r.status
                  )}`}
                >
                  {statusLabel(r.status)}
                </span>

                <Link
                  to={`/tracking/${r.id}`}
                  className="bg-yellow-400 text-black px-5 py-2 rounded-xl font-semibold hover:bg-yellow-300 transition"
                >
                  Ver seguimiento →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}