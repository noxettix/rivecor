import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import Layout from "./components/layout/Layout";

// dashboards
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import MechanicTrackingPage from "./pages/MechanicTrackingPage";

// páginas principales
import TrackingPage from "./pages/TrackingPage";
import RequestMaintenancePage from "./pages/RequestMaintenancePage";
import EquipmentsPage from "./pages/EquipmentsPage";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceFormPage from "./pages/MaintenanceFormPage";
import CalendarPage from "./pages/CalendarPage";

// 🔥 ADMIN (recuperados)
import StockPage from "./pages/StockPage";
import TireCatalogPage from "./pages/TireCatalogPage";
import REPPage from "./pages/REPPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";

// otros
import HistoryPage from "./pages/HistoryPage";
import MechanicsPage from "./pages/MechanicsPage";
import ClientsPage from "./pages/ClientsPage";
import FleetPage from "./pages/FleetPage";
import ClientRequestsPage from "./pages/ClientRequestsPage";

// helpers
function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function homeByRole(role) {
  const normalized = normalizeRole(role);

  if (normalized === "ADMIN") return "/admin";
  if (normalized === "OPERATOR" || normalized === "MECHANIC") return "/mechanic";
  if (normalized === "CLIENT") return "/client";

  return "/login";
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      Cargando...
    </div>
  );
}

// 🔒 solo login si no estás logueado
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (user) {
    return <Navigate to={homeByRole(user.role)} replace />;
  }

  return children;
}

// 🔒 requiere login
function PrivateRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.isActive === false) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// 🔒 control por rol
function RoleRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) return <Navigate to="/login" replace />;

  const role = normalizeRole(user.role);

  if (!allowedRoles.map(normalizeRole).includes(role)) {
    return <Navigate to={homeByRole(user.role)} replace />;
  }

  return <Outlet />;
}

// 🚀 APP
export default function App() {
  return (
    <Routes>

      {/* ROOT */}
      <Route path="/" element={<RootRedirect />} />

      {/* LOGIN */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* PRIVADO */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>

          {/* DASHBOARD POR ROL */}
          <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={["CLIENT"]} />}>
            <Route path="/client" element={<DashboardPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={["OPERATOR", "MECHANIC"]} />}>
            <Route path="/mechanic" element={<MechanicTrackingPage />} />
          </Route>

          {/* ===== MÓDULOS ===== */}

          {/* base */}
          <Route path="/equipments" element={<EquipmentsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/maintenance/form" element={<MaintenanceFormPage />} />
          <Route path="/calendar" element={<CalendarPage />} />

          {/* cliente */}
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/requests" element={<ClientRequestsPage />} />
          <Route path="/request-maintenance" element={<RequestMaintenancePage />} />
          <Route path="/tracking/:id" element={<TrackingPage />} />

          {/* admin recuperado */}
          <Route path="/stock" element={<StockPage />} />
          <Route path="/tire-catalog" element={<TireCatalogPage />} />
          <Route path="/rep" element={<REPPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          {/* gestión */}
          <Route path="/mechanics" element={<MechanicsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/history" element={<HistoryPage />} />

        </Route>
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<RootRedirect />} />

    </Routes>
  );
}

// 🔁 redirección automática
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={homeByRole(user.role)} replace />;
}