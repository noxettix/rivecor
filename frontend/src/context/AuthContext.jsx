import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const refreshMe = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        return null;
      }

      const { data } = await api.get("/auth/me");
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
      return data;
    } catch (err) {
      console.error("Error cargando sesión:", err);
      logout();
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (!token) {
          if (mounted) setUser(null);
          return;
        }

        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (mounted) setUser(parsed);
          } catch {
            localStorage.removeItem("user");
          }
        }

        const me = await refreshMe();
        if (!mounted) return;

        if (!me && !savedUser) {
          setUser(null);
        }
      } catch (err) {
        console.error("Error init auth:", err);
        if (mounted) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);

    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshMe,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}