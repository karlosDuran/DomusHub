import { Outlet } from 'react-router-dom'
import SideNav  from './SideNav'
import BottomNav from './BottomNav'

/**
 * AppShell — Layout principal de la aplicación autenticada.
 *
 * Estructura:
 *  ┌─────────────────────────────────────────┐
 *  │ SideNav (solo desktop ≥768px)           │
 *  │ ┌───────────────────────────────────┐   │
 *  │ │ main-content (Outlet)             │   │
 *  │ └───────────────────────────────────┘   │
 *  │ BottomNav (solo móvil <768px)           │
 *  └─────────────────────────────────────────┘
 */
export default function AppShell() {
  return (
    <div className="app-layout">
      {/* Desktop: sidebar fija */}
      <SideNav />

      {/* Contenido principal */}
      <main className="main-content" style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Móvil: bottom nav fija */}
      <BottomNav />
    </div>
  )
}

// Inyectamos media queries vía un style tag para no depender de Tailwind para este toggle
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @media (min-width: 768px) {
    #side-nav    { display: flex !important; }
    #bottom-nav  { display: none !important; }
  }
  @media (max-width: 767px) {
    #side-nav    { display: none !important; }
    #bottom-nav  { display: flex !important; }
  }
`
document.head.appendChild(styleSheet)
