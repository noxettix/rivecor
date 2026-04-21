import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Wrench,
  Users,
  ClipboardList,
  LogOut,
  Eye,
  UserPlus,
  ListChecks,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isAdmin = user?.role === 'ADMIN'
  const isOperator = user?.role === 'OPERATOR' || user?.role === 'MECHANIC'
  const isClient = user?.role === 'CLIENT'

  const nav = isClient
    ? [
        { to: '/client', icon: LayoutDashboard, label: 'Mi panel', end: true },
        { to: '/fleet', icon: Truck, label: 'Mi flota' },
        { to: '/requests', icon: ListChecks, label: 'Solicitudes' },
      ]
    : isOperator
    ? [
        { to: '/mechanic', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/equipments', icon: Truck, label: 'Equipos' },
        { to: '/maintenance/form', icon: ClipboardList, label: 'Formulario' },
      ]
    : [
        { to: '/admin', icon: LayoutDashboard, label: 'Panel Rivecor', end: true },
        { to: '/equipments', icon: Truck, label: 'Equipos' },
        { to: '/maintenance', icon: Wrench, label: 'Mantención' },
        { to: '/maintenance/form', icon: ClipboardList, label: 'Formulario' },
        { to: '/mechanics', icon: Users, label: 'Mecánicos' },
        { to: '/clients', icon: UserPlus, label: 'Clientes' },
      ]

  const roleLabel = isAdmin
    ? 'Administrador'
    : isOperator
    ? 'Mecánico'
    : 'Cliente'

  const roleColor = isAdmin
    ? 'text-yellow-400'
    : isOperator
    ? 'text-yellow-300'
    : 'text-amber-300'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <aside className="w-60 shrink-0 border-r border-yellow-500/15 bg-zinc-950 flex flex-col">
        <div className="px-4 py-5 border-b border-yellow-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(250,204,21,0.18)]">
              <span className="text-black font-black text-sm">R</span>
            </div>

            <div>
              <p className="text-sm font-semibold text-white leading-none">Rivecor</p>
              <p className="text-[10px] text-zinc-500 mt-1">Eco Móvil 360</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-yellow-500/10">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${roleColor}`}>
            {roleLabel}
          </span>

          {isClient && (
            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              <Eye size={10} />
              Solo lectura
            </p>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                  isActive
                    ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20 font-medium'
                    : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900'
                }`
              }
            >
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-yellow-500/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-black/30 border border-zinc-900">
            <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center text-xs font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-200 truncate">
                {user?.name || 'Usuario'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">
                {user?.companyId ? 'Empresa asignada' : 'Rivecor'}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="text-zinc-500 hover:text-yellow-400 transition-colors p-1"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-black p-6">
        <div className="min-h-[calc(100vh-48px)] rounded-3xl border border-yellow-500/10 bg-zinc-950 shadow-[0_0_30px_rgba(250,204,21,0.03)]">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}