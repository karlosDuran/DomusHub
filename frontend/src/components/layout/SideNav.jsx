import { NavLink, useNavigate } from 'react-router-dom'
import { Package, Columns3, ShoppingCart, LogOut, Home, BookOpen, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useInventarioStore } from '../../stores/inventarioStore'

const links = [
  { to: '/inventario',   label: 'Despensa',        Icon: Package },
  { to: '/productos',    label: 'Catálogo',        Icon: BookOpen },
  { to: '/kanban',       label: 'Tareas Kanban',   Icon: Columns3 },
  { to: '/lista-compra', label: 'Modo Súper',      Icon: ShoppingCart },
  { to: '/perfiles',     label: 'Familia y PIN',   Icon: Users },
]

/**
 * Barra lateral de navegación fija.
 * Solo visible en desktop (>= 768px).
 */
export default function SideNav() {
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
    <aside id="side-nav" style={styles.nav} aria-label="Navegación lateral">
      {/* Logo */}
      <div style={styles.logoArea}>
        <div style={styles.logoIcon}>
          <Home size={20} color="var(--color-accent)" />
        </div>
        <div>
          <span style={styles.logoText}>HomeOps</span>
          <span style={styles.logoTag}>CRM Familiar · AWS</span>
        </div>
      </div>

      {/* Links */}
      <nav style={styles.links}>
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              ...styles.link,
              background: isActive ? 'rgba(247, 148, 29, 0.12)' : 'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
              borderLeft: isActive
                ? '3px solid var(--color-accent)'
                : '3px solid transparent',
            })}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Usuario + Logout */}
      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <div
            style={{
              ...styles.avatar,
              background: user?.avatar_color || 'var(--color-accent)',
            }}
          >
            {user?.nombre?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={styles.userName}>{user?.nombre ?? 'Usuario'}</p>
            <p style={styles.userRole}>
              {user?.rol === 'admin' ? 'Administrador' : 'Integrante familiar'}
            </p>
          </div>
        </div>
        <button
          id="sidenav-logout"
          type="button"
          onClick={handleLogout}
          style={styles.logoutBtn}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 'var(--sidenav-width)',
    height: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    zIndex: 100,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 20px 18px',
    borderBottom: '1px solid var(--color-border)',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(247, 148, 29, 0.14)',
    border: '1px solid rgba(247, 148, 29, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    display: 'block',
    fontWeight: 700,
    fontSize: '1.08rem',
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  logoTag: {
    display: 'block',
    fontSize: '0.73rem',
    color: 'var(--color-muted)',
    fontWeight: 500,
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '16px 12px',
    flex: 1,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '44px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.92rem',
    fontWeight: 500,
    transition: 'all 150ms var(--ease)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 14px',
    borderTop: '1px solid var(--color-border)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
  },
  logoutBtn: {
    width: '38px',
    height: '38px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 150ms ease, background 150ms ease',
    flexShrink: 0,
  },
}
