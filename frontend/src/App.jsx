import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import Layout from "./components/layout/Layout";

// dashboards principales
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import MechanicTrackingPage from "./pages/MechanicTrackingPage";

// páginas reales
import TrackingPage from "./pages/TrackingPage";
import RequestMaintenancePage from "./pages/RequestMaintenancePage";
import EquipmentsPage from "./pages/EquipmentsPage";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceFormPage from "./pages/MaintenanceFormPage";
import CalendarPage from "./pages/CalendarPage";
import StockPage from "./pages/StockPage";
import TireCatalogPage from "./pages/TireCatalogPage";
import HistoryPage from "./pages/HistoryPage";
import MechanicsPage from "./pages/MechanicsPage";
import ClientsPage from "./pages/ClientsPage";
import REPPage from "./pages/REPPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";
import FleetPage from "./pages/FleetPage";

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

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (user) {
    return <Navigate to={homeByRole(user.role)} replace />;
  }

  return children;
}

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

function RoleRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(user.role);

  if (!allowedRoles.map(normalizeRole).includes(role)) {
    return <Navigate to={homeByRole(user.role)} replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* root */}
      <Route path="/" element={<RootRedirect />} />

      {/* login */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* privadas */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          {/* dashboards por rol */}
          <Route
            element={<RoleRoute allowedRoles={["ADMIN"]} />}
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>

          <Route
            element={<RoleRoute allowedRoles={["CLIENT"]} />}
          >
            <Route path="/client" element={<DashboardPage />} />
          </Route>

          <Route
            element={<RoleRoute allowedRoles={["OPERATOR", "MECHANIC"]} />}
          >
            <Route path="/mechanic" element={<MechanicTrackingPage />} />
          </Route>

          {/* módulos compartidos o ajustables según tu lógica */}
          <Route path="/equipments" element={<EquipmentsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/maintenance/form" element={<MaintenanceFormPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/tire-catalog" element={<TireCatalogPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/mechanics" element={<MechanicsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/rep" element={<REPPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/requests" element={<RequestMaintenancePage />} />
          <Route path="/tracking/:id" element={<TrackingPage />} />
          <Route path="/request-maintenance" element={<RequestMaintenancePage />} />
        </Route>
      </Route>

      {/* fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homeByRole(user.role)} replace />;
}