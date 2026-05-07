import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldAlert,
  Wrench,
  Boxes,
  Recycle,
  TestTube,
  ServerCrash,
  Rocket,
  Clock,
} from "lucide-react";
import api from "../services/api";

const TARGETS = [
  { value: "ALL", label: "Todos los usuarios" },
  { value: "CLIENT", label: "Clientes" },
  { value: "OPERATOR", label: "Mecánicos / Operadores" },
  { value: "ADMIN", label: "Administradores" },
];

const QUICK_MESSAGES = [
  {
    id: "system_down",
    title: "Caída del sistema",
    icon: <ServerCrash size={17} />,
    subject: "Incidencia temporal en Rivecor Eco Móvil 360",
    message: `Hola,

Informamos que actualmente la plataforma Rivecor Eco Móvil 360 está presentando dificultades técnicas.

Nuestro equipo ya se encuentra trabajando para resolver la situación lo antes posible.

Agradecemos tu comprensión.`,
  },
  {
    id: "maintenance",
    title: "Mantenimiento programado",
    icon: <Clock size={17} />,
    subject: "Mantenimiento programado de la plataforma",
    message: `Hola,

Informamos que realizaremos una mantención programada en la plataforma Rivecor Eco Móvil 360.

Durante este período, algunos servicios podrían no estar disponibles temporalmente.

Gracias por tu comprensión.`,
  },
  {
    id: "update",
    title: "Actualización de la app",
    icon: <Rocket size={17} />,
    subject: "Nueva actualización disponible en Rivecor Eco Móvil 360",
    message: `Hola,

Informamos que se ha publicado una nueva actualización de la plataforma Rivecor Eco Móvil 360.

Mejoras principales:
- Nuevo módulo de reportes Excel.
- Mejoras en seguimiento de solicitudes.
- Mejoras en gestión de stock y REP.
- Nuevo análisis de costo por kilómetro.

Te recomendamos ingresar nuevamente al sistema para revisar los cambios.`,
  },
];

const emptyForm = {
  target: "ALL",
  subject: "",
  message: "",
};

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/10 p-2 text-yellow-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

function AlertRule({ icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/10 p-2 text-yellow-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function openGmailCompose({ to = "", bcc = "", subject = "", body = "" }) {
  const params = new URLSearchParams();

  params.set("view", "cm");
  params.set("fs", "1");

  if (to) params.set("to", to);
  if (bcc) params.set("bcc", bcc);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);

  window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank");
}

export default function NotificationsPage() {
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const targetCount = useMemo(() => {
    if (!summary?.users) return 0;
    if (form.target === "CLIENT") return summary.users.clients || 0;
    if (form.target === "OPERATOR") return summary.users.operators || 0;
    if (form.target === "ADMIN") return summary.users.admins || 0;
    return summary.users.all || 0;
  }, [summary, form.target]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/notifications/summary");
      setSummary(data);
    } catch (err) {
      console.error("Error summary notifications:", err);
      setSummary({
        users: { all: 0, clients: 0, operators: 0, admins: 0 },
        emailConfigured: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const applyQuickMessage = (template) => {
    setForm((prev) => ({
      ...prev,
      subject: template.subject,
      message: template.message,
    }));
    setError("");
    setResult(null);
  };

  const sendTest = () => {
    try {
      setTesting(true);
      setError("");
      setResult(null);

      openGmailCompose({
        to: "rivecorspa@gmail.com",
        subject: "✅ Test Rivecor — Email funcionando",
        body: `Hola,

Este es un mensaje de prueba de Rivecor Eco Móvil 360.

Si este correo se envía correctamente, el centro de comunicaciones está funcionando mediante Gmail.`,
      });

      setResult({
        type: "success",
        message: "Se abrió Gmail con el email de prueba listo para enviar.",
      });
    } catch (err) {
      setError("No se pudo abrir Gmail.");
    } finally {
      setTesting(false);
    }
  };

  const sendBroadcast = () => {
  try {
    setSending(true);
    setError("");
    setResult(null);

    if (!form.subject.trim()) {
      setError("El asunto es obligatorio.");
      return;
    }

    if (!form.message.trim()) {
      setError("El mensaje es obligatorio.");
      return;
    }

    // 👉 LISTA FIJA TEMPORAL
    const emails = [
      "rivecorspa@gmail.com",
    ];

    const body = `${form.message}

---
Rivecor Eco Móvil 360`;

    const url = `mailto:?bcc=${emails.join(",")}&subject=${encodeURIComponent(
      form.subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = url;

    setResult({
      type: "success",
      message: `Correo preparado con ${emails.length} destinatarios.`,
    });

    setForm(emptyForm);
  } catch (err) {
    setError("Error inesperado.");
  } finally {
    setSending(false);
  }
};

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-10 flex items-center justify-center gap-3">
          <Loader2 size={18} className="animate-spin text-yellow-400" />
          <span className="text-sm text-zinc-300">
            Cargando centro de comunicaciones...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      <div className="rounded-3xl border border-yellow-500/10 bg-zinc-950 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300 mb-3">
              <Bell size={13} />
              Centro de comunicaciones
            </div>

            <h1 className="text-3xl font-black tracking-tight">
              Notificaciones por email
            </h1>

            <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
              Envía comunicados a usuarios y administra las alertas principales
              de la plataforma Rivecor.
            </p>
          </div>

          <button
            onClick={sendTest}
            disabled={testing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-yellow-400/40 hover:text-white disabled:opacity-60"
          >
            {testing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <TestTube size={16} />
                Probar email
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Usuarios" value={summary?.users?.all || 0} icon={<Users size={18} />} />
        <StatCard label="Clientes" value={summary?.users?.clients || 0} icon={<Users size={18} />} />
        <StatCard label="Mecánicos" value={summary?.users?.operators || 0} icon={<Wrench size={18} />} />
        <StatCard label="Admins" value={summary?.users?.admins || 0} icon={<ShieldAlert size={18} />} />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 p-3 text-yellow-400">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Enviar comunicado</h2>
              <p className="text-sm text-zinc-500">
                Usa una plantilla rápida o escribe tu propio mensaje.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-zinc-400">
              Plantillas rápidas
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {QUICK_MESSAGES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyQuickMessage(template)}
                  className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-left hover:border-yellow-400/40 hover:bg-yellow-500/5 transition"
                >
                  <div className="flex items-center gap-3 text-yellow-400">
                    <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/10 p-2">
                      {template.icon}
                    </div>
                    <span className="text-sm font-bold text-white">
                      {template.title}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Cargar asunto y mensaje.
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-zinc-400">
              Destinatarios
            </label>
            <select
              className="input"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-500">
              Se preparará el comunicado para{" "}
              <span className="font-bold text-yellow-300">{targetCount}</span>{" "}
              usuario(s). Gmail se abrirá con los correos cargados.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-zinc-400">
              Asunto
            </label>
            <input
              className="input"
              placeholder="Nueva actualización Rivecor Eco Móvil 360"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-zinc-400">
              Mensaje
            </label>
            <textarea
              className="input min-h-[220px] resize-none"
              placeholder="Escribe el comunicado..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4">
          <h2 className="text-lg font-bold">Alertas automáticas</h2>
          <p className="text-sm text-zinc-500">
            Eventos importantes que pueden transformarse en correos automáticos.
          </p>

          <div className="space-y-3">
            <AlertRule
              icon={<AlertTriangle size={17} />}
              title="Neumático crítico"
              desc="Aviso cuando un neumático pasa a estado CRITICAL."
            />
            <AlertRule
              icon={<Wrench size={17} />}
              title="Mantención pendiente"
              desc="Recordatorio de solicitudes o mantenciones próximas."
            />
            <AlertRule
              icon={<Boxes size={17} />}
              title="Stock bajo"
              desc="Aviso cuando quedan pocos neumáticos disponibles."
            />
            <AlertRule
              icon={<Recycle size={17} />}
              title="REP pendiente"
              desc="Aviso para neumáticos retirados que deben registrarse."
            />
          </div>
        </div>
      </div>
    </div>
  );
}