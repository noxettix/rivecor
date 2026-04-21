import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  updateMechanicLocation,
  updateRequest,
} from "../services/firebaseRequests";

export default function MechanicTrackingPage() {
  const { id } = useParams();
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const [coords, setCoords] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [error, setError] = useState("");

  const lastSentRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!id) {
      setError("No se encontró el ID de la solicitud.");
      return;
    }

    if (!navigator.geolocation) {
      setGpsEnabled(false);
      setError("Tu dispositivo o navegador no soporta geolocalización.");
      return;
    }

    const startTracking = async () => {
      try {
        await updateRequest(id, {
          status: "IN_PROGRESS",
          tracking: {
            mechanicLat: null,
            mechanicLng: null,
            status: "ON_THE_WAY",
            lastUpdate: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error("Error marcando tracking como ON_THE_WAY:", err);
      }
    };

    startTracking();

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (!isMountedRef.current) return;

        setCoords({ lat, lng });
        setError("");

        const now = Date.now();
        const MIN_INTERVAL_MS = 2500;

        if (now - lastSentRef.current < MIN_INTERVAL_MS) {
          return;
        }

        lastSentRef.current = now;
        setSending(true);

        try {
          await updateMechanicLocation(id, lat, lng);
          if (!isMountedRef.current) return;

          setLastSentAt(new Date());
          console.log("📍 GPS enviado:", lat, lng);
        } catch (err) {
          console.error("❌ Error enviando GPS:", err);
          if (isMountedRef.current) {
            setError("No se pudo enviar la ubicación en tiempo real.");
          }
        } finally {
          if (isMountedRef.current) {
            setSending(false);
          }
        }
      },
      (geoError) => {
        console.error("❌ Error GPS:", geoError);

        switch (geoError.code) {
          case 1:
            setError("Permiso de ubicación denegado.");
            break;
          case 2:
            setError("No se pudo obtener la ubicación.");
            break;
          case 3:
            setError("La obtención de ubicación tardó demasiado.");
            break;
          default:
            setError("Error desconocido al obtener ubicación.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000,
      }
    );

    return () => {
      isMountedRef.current = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [id]);

  return (
    <div className="p-6 min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Tracking mecánico</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Esta pantalla envía la ubicación del mecánico en tiempo real a la
            solicitud.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm space-y-4">
          <div>
            <p className="text-sm text-zinc-500">Solicitud</p>
            <p className="text-base font-semibold break-all">{id || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-zinc-500">Estado GPS</p>
            <p
              className={`text-sm font-medium ${
                gpsEnabled ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {gpsEnabled ? "Activo" : "No disponible"}
            </p>
          </div>

          <div>
            <p className="text-sm text-zinc-500">Última ubicación</p>
            <p className="text-sm text-zinc-200">
              {coords
                ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                : "Esperando señal GPS..."}
            </p>
          </div>

          <div>
            <p className="text-sm text-zinc-500">Envío</p>
            <p
              className={`text-sm font-medium ${
                sending ? "text-yellow-400" : "text-blue-400"
              }`}
            >
              {sending ? "Enviando ubicación..." : "Sincronizado / en espera"}
            </p>
          </div>

          <div>
            <p className="text-sm text-zinc-500">Última sincronización</p>
            <p className="text-sm text-zinc-200">
              {lastSentAt ? lastSentAt.toLocaleString() : "Aún no enviada"}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}