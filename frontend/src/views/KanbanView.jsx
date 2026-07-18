import { useState } from 'react'
import { LayoutColumns, Plus, AlertTriangle, RefreshCw, Clock } from 'lucide-react'
import { useKanban } from '../hooks/useKanban'

// ── Skeleton de columna ───────────────────────────────────────────────────────
function SkeletonColumn() {
  return (
    <div style={styles.skeletonCol} className="kanban-column">
      <div className="skeleton" style={{ height: '20px', width: '60%', borderRadius: '4px', marginBottom: '16px' }} />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-md)', marginBottom: '10px' }} />
      ))}
    </div>
  )
}

// ── Tarjeta de tarea ──────────────────────────────────────────────────────────
function TareaCard({ tarea, columnas, onMover }) {
  return (
    <article className="card animate-fade-in-up" style={styles.tareaCard}>
      <p style={styles.tareaTitle}>{tarea.titulo}</p>
      {tarea.descripcion && (
        <p style={styles.tareaDesc}>{tarea.descripcion}</p>
      )}
      <div style={styles.tareaFooter}>
        {tarea.asignado_nombre && (
          <span style={styles.asignadoChip}>{tarea.asignado_nombre[0].toUpperCase()}</span>
        )}
        {tarea.es_recurrente == 1 && (
          <span className="badge" style={styles.recurrenteBadge}>
            <Clock size={10} /> Recurrente
          </span>
        )}
        {/* Selector rápido de columna */}
        {columnas.length > 1 && (
          <select
            value={tarea.columna_id}
            onChange={(e) => onMover(tarea.id, e.target.value)}
            style={styles.colSelect}
            aria-label="Mover tarea a columna"
          >
            {columnas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        )}
      </div>
    </article>
  )
}

// ── Columna Kanban ────────────────────────────────────────────────────────────
function KanbanColumnComp({ columna, tareas, columnas, onMover }) {
  const colorBorder = [
    'var(--color-accent)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-danger)',
  ][columna.posicion % 4] ?? 'var(--color-accent)'

  return (
    <section
      className="kanban-column card"
      style={{ ...styles.column, borderTop: `3px solid ${colorBorder}` }}
      aria-label={`Columna: ${columna.nombre}`}
    >
      <div style={styles.colHeader}>
        <h2 style={styles.colTitle}>{columna.nombre}</h2>
        <span style={styles.colCount}>{tareas.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tareas.length === 0 && (
          <p style={styles.colEmpty}>Sin tareas</p>
        )}
        {tareas.map((t) => (
          <TareaCard key={t.id} tarea={t} columnas={columnas} onMover={onMover} />
        ))}
      </div>

      <button className="btn btn-ghost" style={styles.addTaskBtn} id={`kanban-add-${columna.id}`}>
        <Plus size={15} /> Agregar tarea
      </button>
    </section>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────
export default function KanbanView() {
  const { columnas, tareas, loading, error, refetch } = useKanban()
  const [filtroUser, setFiltroUser] = useState('todos')

  // Placeholder de mover tarea — se implementará en Fase 5
  const handleMover = (tareaId, nuevaColumnaId) => {
    console.log('Mover tarea', tareaId, '→ columna', nuevaColumnaId)
  }

  const tareasFiltradas = filtroUser === 'todos'
    ? tareas
    : tareas.filter((t) => String(t.asignado_a_user_id) === filtroUser)

  return (
    <div id="kanban-page" style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Tareas del Hogar</h1>
          <p style={styles.pageSubtitle}>
            {loading ? '…' : `${tareas.length} tarea${tareas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" id="kanban-new-tarea-btn">
          <Plus size={18} /> Nueva tarea
        </button>
      </header>

      {/* Filtros de usuario */}
      <div style={styles.tabs} role="tablist">
        {[
          { key: 'todos',   label: 'Ver todo' },
          { key: 'mis',     label: 'Mis tareas' },
        ].map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filtroUser === key}
            onClick={() => setFiltroUser(key)}
            style={{
              ...styles.tab,
              ...(filtroUser === key ? styles.tabActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cargando */}
      {loading && (
        <div className="kanban-scroll">
          <SkeletonColumn /><SkeletonColumn /><SkeletonColumn />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={styles.centerState} className="animate-fade-in">
          <AlertTriangle size={32} color="var(--color-danger)" />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar el tablero</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button className="btn btn-ghost" onClick={refetch} style={{ marginTop: '8px' }}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Vacío */}
      {!loading && !error && columnas.length === 0 && (
        <div style={styles.centerState} className="animate-fade-in">
          <div style={styles.emptyIcon}><LayoutColumns size={36} color="var(--color-muted)" /></div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>No hay columnas todavía</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Crea la primera columna para comenzar.</p>
        </div>
      )}

      {/* Tablero */}
      {!loading && !error && columnas.length > 0 && (
        <div className="kanban-scroll">
          {columnas.map((col) => (
            <KanbanColumnComp
              key={col.id}
              columna={col}
              columnas={columnas}
              tareas={tareasFiltradas.filter((t) => t.columna_id === col.id)}
              onMover={handleMover}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Estilos ─── */
const styles = {
  page: { height: '100%' },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '20px',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: { color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '2px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    borderRadius: '999px',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-muted)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  tabActive: {
    background: 'rgba(88,166,255,.12)',
    borderColor: 'rgba(88,166,255,.4)',
    color: 'var(--color-accent)',
  },
  skeletonCol: {
    minWidth: '280px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
  },
  column: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    alignSelf: 'flex-start',
  },
  colHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  colTitle: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' },
  colCount: {
    background: 'var(--color-surface2, var(--color-border))',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
    fontWeight: 600,
  },
  colEmpty: {
    textAlign: 'center',
    color: 'var(--color-muted)',
    fontSize: '0.8rem',
    padding: '20px 0',
  },
  tareaCard: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
  },
  tareaTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: '4px',
    lineHeight: 1.4,
  },
  tareaDesc: {
    fontSize: '0.78rem',
    color: 'var(--color-muted)',
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  tareaFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  asignadoChip: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  recurrenteBadge: {
    background: 'rgba(88,166,255,.1)',
    color: 'var(--color-accent)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.68rem',
    padding: '2px 7px',
    borderRadius: '999px',
  },
  colSelect: {
    marginLeft: 'auto',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-muted)',
    fontSize: '0.75rem',
    padding: '2px 6px',
    cursor: 'pointer',
  },
  addTaskBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '12px',
    fontSize: '0.8rem',
    padding: '8px',
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '60px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '72px',
    height: '72px',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
}
