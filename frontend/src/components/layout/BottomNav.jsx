import { NavLink } from 'react-router-dom'
import { Package, Columns3, ShoppingCart, BookOpen, Users } from 'lucide-react'

const links = [
  { to: '/inventario',   label: 'Despensa',  Icon: Package },
  { to: '/productos',    label: 'Catálogo',  Icon: BookOpen },
  { to: '/kanban',       label: 'Tareas',    Icon: Columns3 },
  { to: '/lista-compra', label: 'Súper',     Icon: ShoppingCart },
  { to: '/perfiles',     label: 'Familia',   Icon: Users },
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
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
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
    background: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    zIndex: 100,
  },
  link: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    textDecoration: 'none',
    flex: 1,
    minHeight: '48px',
    transition: 'color 150ms var(--ease)',
  },
  iconWrapper: {
    padding: '3px 10px',
    borderRadius: '999px',
    transition: 'background 150ms var(--ease)',
  },
  iconWrapperActive: {
    padding: '3px 10px',
    borderRadius: '999px',
    background: 'rgba(247, 148, 29, 0.16)',
    transition: 'background 150ms var(--ease)',
  },
  linkLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
  },
}
