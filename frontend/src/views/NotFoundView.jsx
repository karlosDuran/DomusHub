import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundView() {
  return (
    <div style={styles.page}>
      <p style={styles.code}>404</p>
      <h1 style={styles.title}>Página no encontrada</h1>
      <p style={styles.msg}>La ruta que buscas no existe en DomusHub.</p>
      <Link to="/inventario" className="btn btn-primary" style={{ marginTop: '24px' }}>
        <Home size={18} /> Volver al inicio
      </Link>
    </div>
  )
}

const styles = {
  page:  { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' },
  code:  { fontSize: '5rem', fontWeight: 700, color: 'var(--color-border)', lineHeight: 1 },
  title: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '8px' },
  msg:   { color: 'var(--color-muted)', marginTop: '8px' },
}
