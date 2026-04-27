import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goByRole = (role) => {
    const normalized = normalizeRole(role);

    if (normalized === "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }

    if (normalized === "OPERATOR" || normalized === "MECHANIC") {
      navigate("/mechanic", { replace: true });
      return;
    }

    if (normalized === "CLIENT") {
      navigate("/client", { replace: true });
      return;
    }

    throw new Error(`Rol no reconocido: ${role}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const user = await login(form.email, form.password);

      if (!user?.role) {
        throw new Error("El usuario no tiene rol asignado.");
      }

      if (user?.isActive === false) {
        throw new Error("Usuario inactivo.");
      }

      goByRole(user.role);
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err?.response?.data?.error ||
          err.message ||
          "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,200,0,0.06),transparent_35%)]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Rivecor"
            className="mx-auto h-32 w-auto object-contain drop-shadow-[0_0_30px_rgba(245,200,0,0.08)]"
          />

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white">
            Rivecor Eco Móvil 360
          </h1>

          <p className="mt-2 text-base text-zinc-400">
            Gestión inteligente de neumáticos
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold tracking-[0.18em] text-yellow-400">
                CORREO ELECTRÓNICO
              </label>

              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10"
                placeholder="correo@empresa.cl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold tracking-[0.18em] text-yellow-400">
                CONTRASEÑA
              </label>

              <div className="relative mt-2">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 pr-14 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-yellow-400"
                >
                  {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-yellow-400 py-4 text-lg font-extrabold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-zinc-500">
                Plataforma inteligente de monitoreo, control y seguimiento
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}