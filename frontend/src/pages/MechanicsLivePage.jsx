import { useEffect, useMemo, useState } from "react";
import {
  listenMechanics,
  updateMechanicAvailability,
} from "../services/firebaseMechanics";
import { listenRequests } from "../services/firebaseRequests";

function formatDate(date) {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function badgeClass(available) {
  return available
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

function requestStatusClass(status) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "ASSIGNED":
      return "bg-blue-100 text-blue-800";
    case "IN_PROGRESS":
      return "bg-purple-100 text-purple-800";
    case "ARRIVED":
      return "bg-orange-100 text-orange-800";
    case "DONE":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function MechanicsLivePage() {
  const [mechanics, setMechanics] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingMechanics, setLoadingMechanics] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    const unsubMechanics = listenMechanics(
      (items) => {
        setMechanics(items);
        setLoadingMechanics(false);
      },
      () => setLoadingMechanics(false)
    );

    const unsubRequests = listenRequests(
      (items) => {
        setRequests(items);
        setLoadingRequests(false);
      },
      () => setLoadingRequests(false)
    );

    return () => {
      unsubMechanics();
      unsubRequests();
    };
  }, []);

  const activeRequestByMechanic = useMemo(() => {
    const map = new Map();

    for (const req of requests) {
      if (!req.mechanicId) continue;
      if (req.status === "DONE") continue;

      const current = map.get(req.mechanicId);

      if (!current) {
        map.set(req.mechanicId, req);
        continue;
      }

      const currentTime = current.createdAt ? current.createdAt.getTime() : 0;
      const reqTime = req.createdAt ? req.createdAt.getTime() : 0;

      if (reqTime > currentTime) {
        map.set(req.mechanicId, req);
      }
    }

    return map;
  }, [requests]);

  const toggleAvailability = async (mechanic) => {
    try {
      await updateMechanicAvailability(mechanic.id, !mechanic.available);
    } catch (e) {
      console.error(e);
      alert("No se pudo cambiar disponibilidad");
    }
  };

  if (loadingMechanics || loadingRequests) {
    return <div className="p-6">Cargando panel de mecánicos...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Mecánicos en vivo</h1>
        <p className="text-gray-500">
          Disponibilidad, ubicación y solicitud activa en tiempo real.
        </p>
      </div>

      {mechanics.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          No hay mecánicos registrados.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mechanics.map((mechanic) => {
            const activeRequest = activeRequestByMechanic.get(mechanic.id);

            return (
              <div
                key={mechanic.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-black">
                      {mechanic.name || "Sin nombre"}
                    </h2>
                    <p className="break-all text-sm text-gray-500">
                      UID: {mechanic.id}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                      mechanic.available
                    )}`}
                  >
                    {mechanic.available ? "Disponible" : "Ocupado"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">Ubicación:</span>{" "}
                    {mechanic.location
                      ? `${mechanic.location.lat}, ${mechanic.location.lng}`
                      : "Sin ubicación"}
                  </p>

                  <p>
                    <span className="font-semibold">Última actualización:</span>{" "}
                    {formatDate(mechanic.updatedAt)}
                  </p>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    Solicitud activa
                  </p>

                  {activeRequest ? (
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        <span className="font-semibold">Cliente:</span>{" "}
                        {activeRequest.clientName || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Patente:</span>{" "}
                        {activeRequest.plate || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Problema:</span>{" "}
                        {activeRequest.problemType || "-"}
                      </p>
                      <div>
                        <span className="font-semibold">Estado:</span>{" "}
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${requestStatusClass(
                            activeRequest.status
                          )}`}
                        >
                          {activeRequest.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Sin solicitud activa
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => toggleAvailability(mechanic)}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
                  >
                    {mechanic.available ? "Marcar ocupado" : "Marcar disponible"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}