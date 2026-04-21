import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { Wrench, Clock, ChevronDown } from "lucide-react";

const STATUS_MAP = {
  PENDING: { label: "Pendiente", cls: "text-yellow-400" },
  SCHEDULED: { label: "Programado", cls: "text-blue-400" },
  IN_PROGRESS: { label: "En curso", cls: "text-purple-400" },
  COMPLETED: { label: "Completado", cls: "text-green-400" },
  CANCELLED: { label: "Cancelado", cls: "text-zinc-400" },
};

const TYPE_MAP = {
  INSPECTION: "Inspección",
  ROTATION: "Rotación",
  REPLACEMENT: "Reemplazo",
  PRESSURE_CHECK: "Presión",
  EMERGENCY: "Emergencia",
};

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 YA NO usamos backend ni useAuth
  const load = async () => {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select("*")
      .order("createdAt", { ascending: false });

    if (!error) setRequests(data || []);
    setLoading(false);
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
    <div className="p-6 max-w-4xl mx-auto space-y-5 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Mantención</h1>
          <p className="text-sm text-zinc-500">
            Solicitudes del sistema
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Section title="Activas" requests={grouped.active} />
          <Section title="Historial" requests={grouped.done} />
        </>
      )}
    </div>
  );
}

function Section({ title, requests }) {
  const [open, setOpen] = useState(true);

  if (!requests.length) return null;

  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex justify-between w-full"
      >
        <h2 className="font-semibold">{title}</h2>
        <ChevronDown
          size={16}
          className={open ? "rotate-180" : ""}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {requests.map((r) => {
            const s = STATUS_MAP[r.status] || STATUS_MAP.PENDING;

            return (
              <div
                key={r.id}
                className="p-3 bg-zinc-800 rounded-lg border border-zinc-700"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm">
                      {TYPE_MAP[r.type]}
                    </p>

                    <p className="text-xs text-zinc-400">
                      {r.description}
                    </p>

                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(r.createdAt).toLocaleDateString("es-CL")}
                    </p>
                  </div>

                  <span className={s.cls}>{s.label}</span>
                </div>

                <div className="mt-2 text-right">
                  <Link
                    to={`/tracking/${r.id}`}
                    className="text-xs text-yellow-400"
                  >
                    Ver →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}