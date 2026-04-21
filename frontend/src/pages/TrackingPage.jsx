import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { listenRequests } from "../services/firebaseRequests";
import { listenMechanics } from "../services/firebaseMechanics";
import TrackingMap from "../components/tracking/TrackingMap";

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
      return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
    case "ASSIGNED":
      return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
    case "IN_PROGRESS":
      return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
    case "ARRIVED":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    case "DONE":
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    default:
      return "bg-zinc-800 text-zinc-300 border border-zinc-700";
  }
}

function statusLabel(status) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "ASSIGNED":
      return "Asignado";
    case "IN_PROGRESS":
      return "En camino";
    case "ARRIVED":
      return "Llegó";
    case "DONE":
      return "Finalizado";
    default:
      return status || "Sin estado";
  }
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl bg-black/20 border border-zinc-800 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-100 break-all">{value}</p>
    </div>
  );
}

export default function TrackingPage() {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mechanicsLoading, setMechanicsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = listenRequests(
      (items) => {
        const found = (items || []).find((r) => r.id === id);

        if (!found) {
          setError("La solicitud no existe.");
          setRequest(null);
        } else {
          setError("");
          setRequest(found);
        }

        setLoading(false);
      },
      (err) => {
        console.error("Error cargando tracking:", err);
        setError("Error cargando tracking.");
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    const unsubscribe = listenMechanics(
      (items) => {
        setMechanics(items || []);
        setMechanicsLoading(false);
      },
      (err) => {
        console.error("Error cargando mecánicos:", err);
        setMechanicsLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading || mechanicsLoading) {
    return <div className="p-6 text-white">Cargando tracking...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          No se encontró la solicitud.
        </div>
      </div>
    );
  }

  const clientLocation =
    request?.location &&
    request.location.lat != null &&
    request.location.lng != null
      ? {
          lat: Number(request.location.lat),
          lng: Number(request.location.lng),
        }
      : null;

  const mechanicLocation =
    request?.tracking &&
    request.tracking.mechanicLat != null &&
    request.tracking.mechanicLng != null
      ? {
          lat: Number(request.tracking.mechanicLat),
          lng: Number(request.tracking.mechanicLng),
        }
      : null;

  const assignedMechanic = mechanics.find((m) => m.id === request?.mechanicId);

  const mechanicDisplayName =
    assignedMechanic?.name || request.mechanicId || "Sin asignar";

  const etaMinutes =
    clientLocation && mechanicLocation
      ? Math.max(
          1,
          Math.round((haversineKm(mechanicLocation, clientLocation) / 35) * 60)
        )
      : null;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-black text-white">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Tracking de solicitud</h1>
          <p className="text-zinc-400">Ubicación en tiempo real desde Supabase</p>
        </div>

        <Link
          to="/requests"
          className="rounded-xl border border-yellow-500 bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
        >
          Volver
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {request.clientName || "Sin cliente"}
            </h2>
            <p className="mt-2 text-zinc-400">Solicitud #{request.id}</p>
          </div>

          <div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${statusColor(
                request.status
              )}`}
            >
              {statusLabel(request.status)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoRow label="Patente" value={request.plate || "-"} />
          <InfoRow label="Fecha" value={formatDate(request.createdAt)} />
          <InfoRow label="Mecánico asignado" value={mechanicDisplayName} />
          <InfoRow
            label="Ubicación cliente"
            value={
              clientLocation
                ? `${clientLocation.lat}, ${clientLocation.lng}`
                : "Sin datos"
            }
          />
          <InfoRow
            label="Ubicación del mecánico"
            value={
              mechanicLocation
                ? `${mechanicLocation.lat}, ${mechanicLocation.lng}`
                : "Sin datos"
            }
          />
          <InfoRow
            label="Estado tracking"
            value={statusLabel(request.tracking?.status || "PENDING")}
          />
          <InfoRow
            label="Última actualización"
            value={
              request.tracking?.lastUpdate
                ? new Date(request.tracking.lastUpdate).toLocaleString("es-CL")
                : "-"
            }
          />
          <InfoRow
            label="ETA estimada"
            value={etaMinutes != null ? `${etaMinutes} min` : "Sin datos"}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <TrackingMap
          clientLocation={clientLocation}
          mechanicLocation={mechanicLocation}
        />
      </div>
    </div>
  );
}