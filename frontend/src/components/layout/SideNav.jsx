import { NavLink, useNavigate } from 'react-router-dom'
import {
  Package,
  Columns3,
  ShoppingCart,
  LogOut,
  Home,
  BookOpen,
  Users,
  Sun,
  Moon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useInventarioStore } from '../../stores/inventarioStore'
import { useThemeStore } from '../../stores/themeStore'

const links = [
  { to: '/inventario',   label: 'Despensa',       Icon: Package },
  { to: '/productos',    label: 'Catálogo',       Icon: BookOpen },
  { to: '/kanban',       label: 'Tareas Kanban',  Icon: Columns3 },
  { to: '/lista-compra', label: 'Modo Súper',     Icon: ShoppingCart },
  { to: '/perfiles',     label: 'Familia y PIN',  Icon: Users },
]

/**
 * Barra lateral fija (desktop >= 768px) sobre superficie cálida secundaria.
 */
export default function SideNav() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const resetInventario = useInventarioStore((s) => s.reset)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const navigate = useNavigate()

  const handleLogout = () => {
    resetInventario()
    logout()
    toast.success('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  return (
    <aside
      id="side-nav"
      aria-label="Navegación lateral"
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidenav-width)] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-subtle)] md:flex"
    >
      {/* Marca */}
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
            <Home size={18} strokeWidth={2.1} />
          </div>
          <div>
            <span className="block text-[1.05rem] font-bold leading-tight tracking-[-0.02em] text-[var(--color-text)]">
              HomeOps
            </span>
            <span className="block text-[11px] font-medium text-[var(--color-muted)]">
              Gestión del hogar
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="btn-icon border border-[var(--color-border)] bg-[var(--color-surface)]"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Navegación principal */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-[background-color,color,border-color] duration-150',
                isActive
                  ? 'border border-[var(--color-border)] bg-[var(--color-surface)] font-semibold text-[var(--color-accent)]'
                  : 'border border-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={isActive ? 2.1 : 1.75} className="shrink-0" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + Logout */}
      <div className="flex items-center gap-2.5 border-t border-[var(--color-border)] px-4 py-3.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: user?.avatar_color || 'var(--color-accent)' }}
        >
          {user?.nombre?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text)]">
            {user?.nombre ?? 'Usuario'}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {user?.rol === 'admin' ? 'Administrador' : 'Integrante'}
          </p>
        </div>
        <button
          id="sidenav-logout"
          type="button"
          onClick={handleLogout}
          className="btn-icon btn-icon-danger shrink-0"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  )
}
