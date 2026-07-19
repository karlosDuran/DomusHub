import { useState, useEffect } from 'react'
import { Columns3, Plus, AlertTriangle, RefreshCw, Clock, Pencil, Trash2 } from 'lucide-react'
import { useKanban } from '../hooks/useKanban'
import TareaModal from '../components/ui/TareaModal'
import TareaDetallesModal from '../components/ui/TareaDetallesModal'
import HistorialModal from '../components/ui/HistorialModal'
import Modal from '../components/ui/Modal'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import api from '../api/axiosInstance'

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
function TareaCard({ tarea, columnas, onMover, onEdit, onDelete, onVerHistorial, onVerDetalles }) {
  const formatFechaVencimiento = (str) => {
    if (!str) return null
    const [y, m, d] = str.split('-')
    return `${d}/${m}`
  }

  const dVenc = formatFechaVencimiento(tarea.fecha_vencimiento)

  return (
    <article 
      className="card animate-fade-in-up" 
      style={{ ...styles.tareaCard, cursor: 'grab' }}
      onClick={() => onVerDetalles(tarea)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', tarea.id)}
    >
      <div style={styles.tareaHeader}>
        <p style={styles.tareaTitle}>{tarea.titulo}</p>
        <div style={styles.actions} className="task-actions">
          <button
            onClick={(e) => { e.stopPropagation(); onVerHistorial(tarea); }}
            style={styles.actionBtn}
            title="Ver historial de auditoría"
            aria-label="Ver historial"
          >
            <Clock size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(tarea); }}
            style={styles.actionBtn}
            title="Editar tarea"
            aria-label="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(tarea); }}
            style={styles.actionBtnDanger}
            title="Eliminar tarea"
            aria-label="Eliminar"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {tarea.descripcion && (
        <p style={styles.tareaDesc}>{tarea.descripcion}</p>
      )}

      <div style={styles.tareaFooter}>
        {tarea.asignado_nombre ? (
          <span style={styles.asignadoChip} title={`Asignado a: ${tarea.asignado_nombre}`}>
            {tarea.asignado_nombre[0].toUpperCase()}
          </span>
        ) : (
          <span style={styles.noAsignadoChip} title="Sin asignar">-</span>
        )}
        {tarea.es_recurrente == 1 && (
          <span className="badge" style={styles.recurrenteBadge}>
            <RefreshCw size={10} /> Recurrente
          </span>
        )}
        {dVenc && (
          <span className="badge" style={styles.vencimientoBadge} title={`Vence el: ${tarea.fecha_vencimiento}`}>
            Vence: {dVenc}
          </span>
        )}
        {/* Selector rápido de columna */}
        {columnas.length > 1 && (
          <select
            value={tarea.columna_id}
            onClick={(e) => e.stopPropagation()}
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
function KanbanColumnComp({ columna, tareas, columnas, onMover, onAgregarTarea, onEdit, onDelete, onVerHistorial, onVerDetalles }) {
  const colorBorder = [
    'var(--color-accent)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-danger)',
  ][columna.posicion % 4] ?? 'var(--color-accent)'

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const tareaId = e.dataTransfer.getData('text/plain')
    if (tareaId) {
      onMover(Number(tareaId), columna.id)
    }
  }

  return (
    <section
      className="kanban-column card"
      style={{ ...styles.column, borderTop: `3px solid ${colorBorder}` }}
      aria-label={`Columna: ${columna.nombre}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
          <TareaCard
            key={t.id}
            tarea={t}
            columnas={columnas}
            onMover={onMover}
            onEdit={onEdit}
            onDelete={onDelete}
            onVerHistorial={onVerHistorial}
            onVerDetalles={onVerDetalles}
          />
        ))}
      </div>

      <button
        className="btn btn-ghost"
        style={styles.addTaskBtn}
        onClick={() => onAgregarTarea(columna.id)}
      >
        <Plus size={15} /> Agregar tarea
      </button>
    </section>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────
export default function KanbanView() {
  const userId = useAuthStore((s) => s.user?.id)

  const {
    columnas,
    tareas,
    loading,
    error,
    refetch,
    moverTarea,
    crearTarea,
    actualizarTarea,
    eliminarTarea,
    fetchHistorial
  } = useKanban()

  const [filtroUser, setFiltroUser] = useState('todos') // 'todos' | 'mis'
  const [usuarios, setUsuarios] = useState([])

  // Estados de Modales
  const [modalTarea, setModalTarea] = useState({ open: false, tarea: null, columnaId: null })
  const [modalDetalles, setModalDetalles] = useState({ open: false, tarea: null })
  const [modalHistorial, setModalHistorial] = useState({ open: false, tarea: null })
  const [modalEliminar, setModalEliminar] = useState({ open: false, tarea: null })
  const [loadingDelete, setLoadingDelete] = useState(false)

  // Cargar lista de usuarios para asignación
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const { data } = await api.get('/protected/usuarios')
        setUsuarios(data)
      } catch (err) {
        console.error('Error al cargar usuarios:', err)
      }
    }
    loadUsuarios()
  }, [])

  // Mover tarea llamando al API
  const handleMover = async (tareaId, nuevaColumnaId) => {
    const tarea = tareas.find(t => t.id === tareaId)
    if (!tarea || String(tarea.columna_id) === String(nuevaColumnaId)) return

    try {
      await moverTarea(tareaId, nuevaColumnaId)
      toast.success('Tarea movida')
    } catch {
      toast.error('Error al mover la tarea')
    }
  }

  // Guardar tarea (crear o editar)
  const handleSaveTarea = async (formData) => {
    if (modalTarea.tarea) {
      await actualizarTarea(modalTarea.tarea.id, formData)
      toast.success('Tarea actualizada')
    } else {
      await crearTarea(formData)
      toast.success('Tarea creada')
    }
  }

  // Modificar un campo específico desde la vista de detalles
  const handleUpdateTaskField = async (taskId, updatedFields) => {
    const currentTask = tareas.find((t) => t.id === taskId)
    if (!currentTask) return
    const payload = {
      titulo: currentTask.titulo,
      descripcion: currentTask.descripcion,
      columna_id: currentTask.columna_id,
      es_recurrente: currentTask.es_recurrente,
      fecha_vencimiento: currentTask.fecha_vencimiento,
      asignado_a_user_id: currentTask.asignado_a_user_id,
      ...updatedFields,
    }
    try {
      await actualizarTarea(taskId, payload)
    } catch {
      toast.error('Error al actualizar la tarea')
    }
  }

  // Eliminar tarea definitivamente
  const handleConfirmEliminar = async () => {
    if (!modalEliminar.tarea) return
    setLoadingDelete(true)
    try {
      await eliminarTarea(modalEliminar.tarea.id)
      toast.success('Tarea eliminada correctamente')
      setModalEliminar({ open: false, tarea: null })
    } catch {
      toast.error('Error al intentar eliminar la tarea.')
    } finally {
      setLoadingDelete(false)
    }
  }

  const diasMapeo = {
    'lun': 1,
    'mar': 2,
    'mie': 3,
    'jue': 4,
    'vie': 5,
    'sab': 6,
    'dom': 0
  }

  const getDiaSemana = (fechaStr) => {
    if (!fechaStr) return -1
    const [year, month, day] = fechaStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.getDay()
  }

  const tareasFiltradas = tareas.filter((t) => {
    if (filtroUser === 'todos') return true
    
    const esMia = Number(t.asignado_a_user_id) === Number(userId)
    if (filtroUser === 'mis') return esMia

    const targetDay = diasMapeo[filtroUser]
    if (targetDay !== undefined) {
      return esMia && getDiaSemana(t.fecha_vencimiento) === targetDay
    }
    
    return true
  })

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
        <button
          className="btn btn-primary"
          id="kanban-new-tarea-btn"
          onClick={() => setModalTarea({ open: true, tarea: null, columnaId: columnas[0]?.id ?? null })}
        >
          <Plus size={18} /> Nueva tarea
        </button>
      </header>

      {/* Filtros de usuario */}
      <div style={{ ...styles.tabs, overflowX: 'auto', paddingBottom: '8px' }} role="tablist">
        {[
          { key: 'todos',   label: 'Ver todo' },
          { key: 'mis',     label: 'Mis tareas' },
          { key: 'lun',     label: 'Lun' },
          { key: 'mar',     label: 'Mar' },
          { key: 'mie',     label: 'Mié' },
          { key: 'jue',     label: 'Jue' },
          { key: 'vie',     label: 'Vie' },
          { key: 'sab',     label: 'Sáb' },
          { key: 'dom',     label: 'Dom' },
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
          <div style={styles.emptyIcon}><Columns3 size={36} color="var(--color-muted)" /></div>
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
              onAgregarTarea={(colId) => setModalTarea({ open: true, tarea: null, columnaId: colId })}
              onEdit={(t) => setModalTarea({ open: true, tarea: t, columnaId: t.columna_id })}
              onDelete={(t) => setModalEliminar({ open: true, tarea: t })}
              onVerHistorial={(t) => setModalHistorial({ open: true, tarea: t })}
              onVerDetalles={(t) => setModalDetalles({ open: true, tarea: t })}
            />
          ))}
        </div>
      )}

      {/* Modal para Crear/Editar Tarea */}
      <TareaModal
        isOpen={modalTarea.open}
        onClose={() => setModalTarea({ open: false, tarea: null, columnaId: null })}
        onSave={handleSaveTarea}
        tarea={modalTarea.tarea}
        columnas={columnas}
        columnaInicial={modalTarea.columnaId}
        usuarios={usuarios}
        currentUserId={userId}
      />

      {/* Modal de Historial de Auditoría */}
      <HistorialModal
        isOpen={modalHistorial.open}
        onClose={() => setModalHistorial({ open: false, tarea: null })}
        tarea={modalHistorial.tarea}
        fetchHistorial={fetchHistorial}
      />

      {/* Modal de confirmación para eliminar */}
      <Modal
        isOpen={modalEliminar.open}
        onClose={() => setModalEliminar({ open: false, tarea: null })}
        onConfirm={handleConfirmEliminar}
        title="Eliminar Tarea"
        message={`¿Estás seguro de que deseas eliminar la tarea "${modalEliminar.tarea?.titulo}"? Esta acción es definitiva.`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />

      {/* Modal de Detalles de Tarea */}
      <TareaDetallesModal
        isOpen={modalDetalles.open}
        onClose={() => setModalDetalles({ open: false, tarea: null })}
        tarea={tareas.find(t => t.id === modalDetalles.tarea?.id)}
        fetchHistorial={fetchHistorial}
        usuarios={usuarios}
        onUpdate={handleUpdateTaskField}
      />
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
  tareaHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  tareaTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: '4px',
    lineHeight: 1.4,
    flex: 1,
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
    marginTop: '4px',
  },
  asignadoChip: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  noAsignadoChip: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.68rem',
    color: 'var(--color-muted)',
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
  vencimientoBadge: {
    background: 'rgba(255, 120, 117, 0.1)',
    color: '#ff7875',
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
  actions: {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 150ms ease, background 150ms ease',
  },
  actionBtnDanger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 150ms ease, background 150ms ease',
  },
}

// Inyectamos CSS hover para las acciones de cada tarjeta de tarea
const taskHoverStyleSheet = document.createElement('style')
taskHoverStyleSheet.textContent = `
  .tarea-card-actions-parent {
    position: relative;
  }
  .card .task-actions {
    opacity: 0.15;
    transition: opacity 150ms ease;
  }
  .card:hover .task-actions {
    opacity: 1;
  }
  .card .task-actions button:hover {
    background: var(--color-surface2);
  }
  .card .task-actions button:nth-child(1):hover,
  .card .task-actions button:nth-child(2):hover {
    color: var(--color-accent);
  }
  .card .task-actions button:nth-child(3):hover {
    color: var(--color-danger);
  }
  @media (max-width: 767px) {
    .card .task-actions {
      opacity: 1;
    }
  }
`
document.head.appendChild(taskHoverStyleSheet)
