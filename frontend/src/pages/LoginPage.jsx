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
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <img
            src={logo}
            alt="Rivecor"
            className="mx-auto h-40 w-auto object-contain"
          />
          <h1 className="text-3xl font-bold text-white mt-6">
            Rivecor Eco Móvil 360
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">
            Gestión inteligente de neumáticos
          </p>
        </div>

        <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-8 shadow-xl">
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="text-yellow-400 text-sm font-semibold">
                CORREO ELECTRÓNICO
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full mt-2 px-4 py-4 rounded-2xl bg-black border border-zinc-800 text-white focus:border-yellow-400 outline-none text-lg"
                placeholder="correo@empresa.cl"
              />
            </div>

            <div className="mb-5">
              <label className="text-yellow-400 text-sm font-semibold">
                CONTRASEÑA
              </label>

              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full mt-2 px-4 py-4 rounded-2xl bg-black border border-zinc-800 text-white focus:border-yellow-400 outline-none text-lg"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-yellow-400"
                >
                  {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-yellow-400 text-black font-bold text-lg hover:bg-yellow-300 transition disabled:opacity-70"
            >
              {loading ? (
                <span className="flex justify-center items-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}