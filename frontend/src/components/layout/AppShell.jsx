import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Home, LogOut, Sun, Moon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import SideNav from './SideNav'
import BottomNav from './BottomNav'
import { useAuthStore } from '../../stores/authStore'
import { useInventarioStore } from '../../stores/inventarioStore'
import { useThemeStore } from '../../stores/themeStore'

/**
 * AppShell — Layout principal de la aplicación autenticada.
 */
export default function AppShell() {
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
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop: sidebar fija */}
      <SideNav />

      {/* Móvil: barra superior translúcida con safe-area */}
      <header
        id="mobile-topbar"
        className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] px-4 backdrop-blur-md md:hidden"
        style={{
          minHeight: 'var(--mobile-topbar-height)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          backgroundColor: 'var(--header-glass)',
        }}
      >
        <Link to="/inventario" className="flex items-center gap-2.5 no-underline">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
            <Home size={16} strokeWidth={2.1} />
          </span>
          <span className="text-[0.98rem] font-bold tracking-[-0.02em] text-[var(--color-text)]">
            HomeOps
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-icon"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link
            to="/perfiles"
            title="Gestionar perfiles familiares"
            className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pr-2.5 pl-1 text-[var(--color-text)] no-underline"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: user?.avatar_color || 'var(--color-accent)' }}
            >
              {user?.nombre?.[0]?.toUpperCase() ?? 'U'}
            </span>
            <span className="max-w-[96px] truncate text-xs font-semibold">
              {user?.nombre ?? 'Usuario'}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-icon btn-icon-danger"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main
        className="w-full flex-1 px-4 py-6 sm:px-6 md:ml-[var(--sidenav-width)] md:px-9 md:py-8"
        style={{
          paddingBottom: 'calc(var(--nav-height) + 28px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Outlet />
      </main>

      {/* Móvil: bottom nav fija */}
      <BottomNav />
    </div>
  )
}
