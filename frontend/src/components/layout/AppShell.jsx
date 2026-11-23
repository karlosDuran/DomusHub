import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Home, LogOut } from 'lucide-react'
import { toast } from 'react-hot-toast'
import SideNav from './SideNav'
import BottomNav from './BottomNav'
import { useAuthStore } from '../../stores/authStore'
import { useInventarioStore } from '../../stores/inventarioStore'

/**
 * AppShell — Layout principal de la aplicación autenticada.
 * Incluye SideNav fijo en desktop (≥768px) y barra superior + BottomNav en móvil (<768px).
 */
export default function AppShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const resetInventario = useInventarioStore((s) => s.reset)
  const navigate = useNavigate()

  const handleLogout = () => {
    resetInventario()
    logout()
    toast.success('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      {/* Desktop: sidebar fija */}
      <SideNav />

      {/* Móvil: barra superior con perfil activo y botón de cerrar sesión */}
      <header id="mobile-topbar" style={styles.mobileHeader}>
        <Link to="/inventario" style={styles.brandLink}>
          <span style={styles.logoIcon}>
            <Home size={18} color="var(--color-accent)" />
          </span>
          <span style={styles.brandName}>HomeOps</span>
        </Link>

        <div style={styles.userArea}>
          <Link
            to="/perfiles"
            style={styles.profilePill}
            title="Gestionar perfiles familiares"
          >
            <span
              style={{
                ...styles.avatar,
                background: user?.avatar_color || 'var(--color-accent)',
              }}
            >
              {user?.nombre?.[0]?.toUpperCase() ?? 'U'}
            </span>
            <span style={styles.userName}>{user?.nombre ?? 'Usuario'}</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutBtn}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Móvil: bottom nav fija */}
      <BottomNav />
    </div>
  )
}

const styles = {
  mobileHeader: {
    height: 'var(--mobile-topbar-height)',
    padding: '0 16px',
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 95,
  },
  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(247, 148, 29, 0.14)',
    border: '1px solid rgba(247, 148, 29, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  profilePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 10px 4px 4px',
    borderRadius: '999px',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
    textDecoration: 'none',
    color: 'var(--color-text)',
  },
  avatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    maxWidth: '110px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
}
