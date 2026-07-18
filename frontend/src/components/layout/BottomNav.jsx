import { NavLink } from 'react-router-dom'
import { Package, Columns3, ShoppingCart, User } from 'lucide-react'

const links = [
  { to: '/inventario', label: 'Despensa', Icon: Package },
  { to: '/kanban',     label: 'Tareas',   Icon: Columns3 },
  { to: '/supermercado', label: 'Súper',  Icon: ShoppingCart },
  { to: '/perfil',     label: 'Perfil',   Icon: User },
]

/**
 * Barra de navegación fija en la parte inferior.
 * Solo visible en móvil (< 768px).
 */
export default function BottomNav() {
  return (
    <nav id="bottom-nav" style={styles.nav} aria-label="Navegación principal">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            ...styles.link,
            color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
          })}
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <span style={isActive ? styles.iconWrapperActive : styles.iconWrapper}>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span style={styles.linkLabel}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 'var(--nav-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    background: 'rgba(22, 27, 34, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid var(--color-border)',
    zIndex: 100,
    // Solo visible en móvil — en desktop se oculta con CSS (md:hidden equivalente)
  },
  link: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    textDecoration: 'none',
    flex: 1,
    paddingTop: '8px',
    transition: 'color 150ms ease',
  },
  iconWrapper: {
    padding: '4px 10px',
    borderRadius: '999px',
    transition: 'background 150ms ease',
  },
  iconWrapperActive: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(88,166,255,.15)',
    transition: 'background 150ms ease',
  },
  linkLabel: {
    fontSize: '0.7rem',
    fontWeight: 500,
  },
}
