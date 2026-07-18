import { NavLink, useNavigate } from 'react-router-dom'
import { Package, Columns3, ShoppingCart, LogOut, Home } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'

const links = [
  { to: '/inventario', label: 'Despensa',  Icon: Package },
  { to: '/kanban',     label: 'Tareas',    Icon: Columns3 },
  { to: '/supermercado', label: 'Modo Super', Icon: ShoppingCart },
]

/**
 * Barra lateral de navegación fija.
 * Solo visible en desktop (>= 768px).
 */
export default function SideNav() {
  const user     = useAuthStore((s) => s.user)
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
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
        <span style={styles.logoText}>DomusHub</span>
      </div>

      {/* Links */}
      <nav style={styles.links}>
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              ...styles.link,
              background: isActive ? 'rgba(88,166,255,.12)' : 'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
              borderLeft: isActive
                ? '3px solid var(--color-accent)'
                : '3px solid transparent',
            })}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Usuario + Logout */}
      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user?.nombre?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p style={styles.userName}>{user?.nombre ?? 'Usuario'}</p>
            <p style={styles.userRole}>Miembro del hogar</p>
          </div>
        </div>
        <button
          id="sidenav-logout"
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
    // Solo visible en desktop — index.css añade display:none en móvil vía media query
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 20px 16px',
    borderBottom: '1px solid var(--color-border)',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(88,166,255,.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontWeight: 700,
    fontSize: '1.05rem',
    color: 'var(--color-text)',
    letterSpacing: '-0.01em',
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
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 150ms ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
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
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '0.72rem',
    color: 'var(--color-muted)',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 150ms ease, background 150ms ease',
    flexShrink: 0,
  },
}
