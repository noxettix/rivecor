import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  MapPin,
  AlertTriangle,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";
import api from "../services/api";

const PRIORITY_MAP = {
  LOW: "LOW",
  MEDIUM: "NORMAL",
  HIGH: "HIGH",
  CRITICAL: "URGENT",
};

export default function RequestMaintenancePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    clientName: "",
    plate: "",
    unitType: "TRUCK",
    description: "",
    priority: "MEDIUM",
    problemType: "GENERAL",
    lat: "",
    lng: "",
  });

  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function getCurrentLocation() {
    setError("");
    setLocating(true);

    if (!navigator.geolocation) {
      setLocating(false);
      setError("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("No se pudo obtener la ubicación. Revisa permisos del navegador.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const clientName = form.clientName.trim();
    const licensePlate = form.plate.trim().toUpperCase();
    const unitType = form.unitType;
    const description = form.description.trim();
    const latitude = Number(form.lat);
    const longitude = Number(form.lng);

    if (!clientName) {
      setError("Debes ingresar el nombre del cliente.");
      return;
    }

    if (!licensePlate) {
      setError("Debes ingresar la patente.");
      return;
    }

    if (!unitType) {
      setError("Debes seleccionar el tipo de unidad.");
      return;
    }

    if (!description) {
      setError("Debes ingresar una descripción del problema.");
      return;
    }

    if (!form.lat || !form.lng || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError("Debes usar la ubicación actual o ingresar latitud y longitud válidas.");
      return;
    }

    const payload = {
      clientName,
      licensePlate,
      unitType,
      description,
      priority: PRIORITY_MAP[form.priority],
      problemType: form.problemType,
      latitude,
      longitude,
    };

    setSaving(true);

    try {
      console.log("PAYLOAD SOLICITUD:", payload);

      const response = await api.post("/maintenance/requests", payload);

      console.log("SOLICITUD CREADA:", response.data);

      setSuccess("Solicitud creada correctamente.");

      setForm({
        clientName: "",
        plate: "",
        unitType: "TRUCK",
        description: "",
        priority: "MEDIUM",
        problemType: "GENERAL",
        lat: "",
        lng: "",
      });

      setTimeout(() => {
        navigate("/requests");
      }, 800);
    } catch (err) {
      console.error("Error creando solicitud:", err?.response?.data || err);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "No se pudo crear la solicitud."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Solicitar mantenimiento
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Registra una solicitud y envíala al sistema principal.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/requests")}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            <ArrowLeft size={16} />
            Ver solicitudes
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-2xl">
          <div className="border-b border-zinc-800 bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-500/15 text-yellow-400">
                <Wrench size={20} />
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  Nueva solicitud
                </p>
                <p className="text-sm text-zinc-400">
                  Completa los datos del problema y la ubicación.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Cliente" icon={<ClipboardList size={15} />} required>
                <input
                  name="clientName"
                  value={form.clientName}
                  onChange={handleChange}
                  placeholder="Empresa X"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400"
                />
              </Field>

              <Field label="Patente" icon={<ClipboardList size={15} />} required>
                <input
                  name="plate"
                  value={form.plate}
                  onChange={handleChange}
                  placeholder="ABCD12"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 uppercase text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400"
                />
              </Field>

              <Field label="Tipo de unidad" icon={<Wrench size={15} />} required>
                <select
                  name="unitType"
                  value={form.unitType}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                >
                  <option value="TRUCK">CAMIÓN</option>
                  <option value="VEHICLE">VEHÍCULO</option>
                  <option value="PICKUP">PICKUP</option>
                  <option value="VAN">VAN</option>
                  <option value="MACHINE">MAQUINARIA</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tipo de problema" icon={<Wrench size={15} />}>
                <select
                  name="problemType"
                  value={form.problemType}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="NEUMATICO">NEUMÁTICO</option>
                  <option value="MANTENCION">MANTENCIÓN</option>
                  <option value="FRENO">FRENO</option>
                  <option value="BATERIA">BATERÍA</option>
                </select>
              </Field>

              <Field label="Prioridad" icon={<AlertTriangle size={15} />}>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                >
                  <option value="LOW">BAJA</option>
                  <option value="MEDIUM">MEDIA</option>
                  <option value="HIGH">ALTA</option>
                  <option value="CRITICAL">CRÍTICA</option>
                </select>
              </Field>
            </div>

            <Field label="Descripción del problema" icon={<ClipboardList size={15} />} required>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                placeholder="Describe el problema..."
                className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400"
              />
            </Field>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-yellow-400" />
                <p className="text-sm font-medium text-zinc-200">
                  Ubicación de la solicitud
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Latitud">
                  <input
                    name="lat"
                    value={form.lat}
                    onChange={handleChange}
                    placeholder="-33.45"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400"
                  />
                </Field>

                <Field label="Longitud">
                  <input
                    name="lng"
                    value={form.lng}
                    onChange={handleChange}
                    placeholder="-70.66"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400"
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={locating}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MapPin size={16} />
                {locating ? "Obteniendo ubicación..." : "Usar ubicación actual"}
              </button>

              <p className="mt-3 text-xs text-zinc-500">
                Usa la ubicación actual del navegador o ingresa coordenadas manualmente.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Crear solicitud"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/requests")}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Ir al historial / solicitudes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, required = false, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
        {icon ? <span className="text-zinc-500">{icon}</span> : null}
        <span>
          {label} {required ? <span className="text-red-400">*</span> : null}
        </span>
      </label>
      {children}
    </div>
  );
}