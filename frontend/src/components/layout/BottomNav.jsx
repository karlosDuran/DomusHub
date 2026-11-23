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
 * Barra de navegación inferior fija para móvil (< 768px) con safe-area.
 */
export default function BottomNav() {
  return (
    <nav
      id="bottom-nav"
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)] px-1 md:hidden"
      style={{
        minHeight: 'var(--nav-height)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            [
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors duration-150 active:scale-[0.96]',
              isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'flex items-center justify-center rounded-full px-3 py-1 transition-colors duration-150',
                  isActive ? 'bg-[var(--color-accent-soft)]' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
