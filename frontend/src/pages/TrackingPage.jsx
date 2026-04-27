import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import TrackingMap from "../components/tracking/TrackingMap";

function statusLabel(status) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "Pendiente";
    case "SCHEDULED":
      return "Tomado";
    case "EN_ROUTE":
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

function statusColor(status) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return "bg-yellow-500/20 text-yellow-400";
    case "SCHEDULED":
      return "bg-blue-500/20 text-blue-400";
    case "EN_ROUTE":
    case "IN_PROGRESS":
      return "bg-orange-500/20 text-orange-400";
    case "COMPLETED":
      return "bg-green-500/20 text-green-400";
    case "CANCELLED":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-zinc-700 text-zinc-300";
  }
}

export default function TrackingPage() {
  const { id } = useParams();

  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadTracking() {
    try {
      const { data } = await api.get(`/maintenance/requests/${id}/tracking`);
      setTracking(data);
    } catch (err) {
      console.error("Error tracking:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTracking();
    const interval = setInterval(loadTracking, 4000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-white">Cargando tracking...</div>
    );
  }

  if (!tracking) {
    return (
      <div className="p-6 text-white">Sin datos</div>
    );
  }

  const mechanicLocation =
    tracking.mechanicLat && tracking.mechanicLng
      ? {
          lat: Number(tracking.mechanicLat),
          lng: Number(tracking.mechanicLng),
        }
      : null;

  const clientLocation =
    tracking.clientLat && tracking.clientLng
      ? {
          lat: Number(tracking.clientLat),
          lng: Number(tracking.clientLng),
        }
      : null;

  return (
    <div className="p-6 text-white max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Seguimiento</h1>
          <p className="text-zinc-500">
            Visualiza el mecánico en tiempo real
          </p>
        </div>

        <Link
          to="/requests"
          className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-semibold hover:bg-yellow-300"
        >
          ← Volver
        </Link>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              {tracking.licensePlate || "Solicitud"}
            </h2>
            <p className="text-xs text-zinc-500">#{tracking.id}</p>
          </div>

          <span
            className={`px-4 py-1 rounded-full text-sm font-semibold ${statusColor(
              tracking.status
            )}`}
          >
            {statusLabel(tracking.status)}
          </span>
        </div>

        {/* GRID INFO */}
        <div className="grid md:grid-cols-3 gap-3 text-sm text-zinc-300">
          <div className="bg-black/30 p-3 rounded-xl">
            <p className="text-xs text-zinc-500">Mecánico</p>
            <p>{tracking.mechanic?.name || "Sin asignar"}</p>
          </div>

          <div className="bg-black/30 p-3 rounded-xl">
            <p className="text-xs text-zinc-500">Teléfono</p>
            <p>{tracking.mechanic?.phone || "-"}</p>
          </div>

          <div className="bg-black/30 p-3 rounded-xl">
            <p className="text-xs text-zinc-500">Unidad</p>
            <p>{tracking.unitType}</p>
          </div>

          <div className="bg-black/30 p-3 rounded-xl">
            <p className="text-xs text-zinc-500">Ubicación mecánico</p>
            <p>
              {mechanicLocation
                ? `${mechanicLocation.lat}, ${mechanicLocation.lng}`
                : "Sin GPS"}
            </p>
          </div>

          <div className="bg-black/30 p-3 rounded-xl">
            <p className="text-xs text-zinc-500">Ubicación cliente</p>
            <p>
              {clientLocation
                ? `${clientLocation.lat}, ${clientLocation.lng}`
                : "No disponible"}
            </p>
          </div>

          <div className="bg-black/30 p-3 rounded-xl">
            <p className="text-xs text-zinc-500">Actualización</p>
            <p>
              {tracking.lastUpdate
                ? new Date(tracking.lastUpdate).toLocaleString("es-CL")
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* MAPA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
        {mechanicLocation ? (
          <TrackingMap
            mechanicLocation={mechanicLocation}
            clientLocation={clientLocation}
          />
        ) : (
          <div className="h-[420px] flex items-center justify-center text-zinc-400">
            Esperando ubicación del mecánico...
          </div>
        )}
      </div>

      {/* ALERTA */}
      {!clientLocation && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl text-yellow-300 text-sm">
          ⚠ Esta solicitud no tiene ubicación cliente, la ruta no se puede calcular.
        </div>
      )}
    </div>
  );
}