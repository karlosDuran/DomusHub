import { useState, useEffect, useRef } from 'react'
import {
  Columns3,
  Plus,
  AlertTriangle,
  RefreshCw,
  Clock,
  Pencil,
  Trash2,
  Bell,
  X,
} from 'lucide-react'
import { useKanban } from '../hooks/useKanban'
import TareaModal from '../components/ui/TareaModal'
import TareaDetallesModal from '../components/ui/TareaDetallesModal'
import HistorialModal from '../components/ui/HistorialModal'
import Modal from '../components/ui/Modal'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import api from '../api/axiosInstance'

const PRIORIDAD_META = {
  urgente: { label: 'Urgente', className: 'badge badge-danger' },
  alta:    { label: 'Alta',    className: 'badge badge-warning' },
  media:   { label: 'Media',   className: 'badge badge-neutral' },
  baja:    { label: 'Baja',    className: 'badge badge-neutral' },
}

// ── Modal para crear nueva columna Kanban ─────────────────────────────────────
function NuevaColumnaModal({ isOpen, onClose, onSave, totalColumnas }) {
  const dialogRef = useRef(null)
  const [nombre, setNombre] = useState('')
  const [posicion, setPosicion] = useState(totalColumnas + 1)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const sync = async () => {
      if (isOpen) {
        setNombre('')
        setPosicion(totalColumnas + 1)
      }
    }
    sync()
  }, [isOpen, totalColumnas])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre de la columna es obligatorio.')
      return
    }
    setSubmitting(true)
    try {
      await onSave({ nombre: nombre.trim(), posicion: Number(posicion) || totalColumnas + 1 })
      toast.success('Columna creada')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al crear la columna.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      onClose={onClose}
      style={styles.colDialog}
    >
      <div style={styles.colModalContent} className="animate-scale-in">
        <div style={styles.colModalHeader}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Nueva Columna Kanban</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label htmlFor="col-nombre" style={styles.fieldLabel}>
              Nombre de la columna *
            </label>
            <input
              id="col-nombre"
              type="text"
              className="input"
              placeholder="Ej. En revisión, Compras pendientes"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="col-pos" style={styles.fieldLabel}>
              Posición (orden)
            </label>
            <input
              id="col-pos"
              type="number"
              min="1"
              className="input font-mono-num"
              value={posicion}
              onChange={(e) => setPosicion(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              Crear Columna
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

// ── Skeleton de columna ───────────────────────────────────────────────────────
function SkeletonColumn() {
  return (
    <div style={styles.skeletonCol} className="kanban-column">
      <div
        className="skeleton"
        style={{ height: '20px', width: '60%', borderRadius: '4px', marginBottom: '16px' }}
      />
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: '76px', borderRadius: 'var(--radius-md)', marginBottom: '10px' }}
        />
      ))}
    </div>
  )
}

// ── Tarjeta de tarea ──────────────────────────────────────────────────────────
function TareaCard({
  tarea,
  columnas,
  usuariosMap,
  onMover,
  onEdit,
  onDelete,
  onVerHistorial,
  onVerDetalles,
}) {
  const formatFechaVencimiento = (str) => {
    if (!str) return null
    const parts = String(str).split('-')
    if (parts.length < 3) return str
    return `${parts[2]}/${parts[1]}`
  }

  const dVenc = formatFechaVencimiento(tarea.fecha_vencimiento)
  const prio = PRIORIDAD_META[tarea.prioridad] || PRIORIDAD_META.media
  const esBasura = Number(tarea.es_turno_basura) === 1
  const asignadoUser = usuariosMap.get(String(tarea.asignado_a_user_id))

  return (
    <article
      className="card animate-fade-in-up"
      style={{
        ...styles.tareaCard,
        cursor: 'grab',
        borderLeft:
          tarea.prioridad === 'urgente' || esBasura
            ? '3px solid var(--color-danger)'
            : '1px solid var(--color-border)',
      }}
      onClick={() => onVerDetalles(tarea)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(tarea.id))}
    >
      <div style={styles.tareaHeader}>
        <p style={styles.tareaTitle}>{tarea.titulo}</p>
        <div style={styles.actions} className="task-actions">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onVerHistorial(tarea)
            }}
            style={styles.actionBtn}
            title="Ver historial de auditoría"
            aria-label="Ver historial"
          >
            <Clock size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(tarea)
            }}
            style={styles.actionBtn}
            title="Editar tarea"
            aria-label="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(tarea)
            }}
            className="action-btn-danger"
            style={styles.actionBtn}
            title="Eliminar tarea"
            aria-label="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {tarea.descripcion && <p style={styles.tareaDesc}>{tarea.descripcion}</p>}

      {/* Badges de Prioridad, Turno de Basura, Recurrencia y Vencimiento */}
      <div style={styles.badgesWrap}>
        <span className={prio.className} style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
          {prio.label}
        </span>

        {esBasura && (
          <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
            🗑️ Basura
          </span>
        )}

        {Number(tarea.es_recurrente) === 1 && (
          <span className="badge" style={styles.recurrenteBadge}>
            <RefreshCw size={10} /> Recurrente
          </span>
        )}

        {dVenc && (
          <span
            className="badge font-mono-num"
            style={styles.vencimientoBadge}
            title={`Vence el: ${tarea.fecha_vencimiento}`}
          >
            Vence: {dVenc}
          </span>
        )}
      </div>

      <div style={styles.tareaFooter}>
        {tarea.asignado_nombre ? (
          <span
            style={{
              ...styles.asignadoChip,
              background: asignadoUser?.avatar_color || 'var(--color-accent)',
            }}
            title={`Asignado a: ${tarea.asignado_nombre}`}
          >
            {tarea.asignado_nombre[0].toUpperCase()}
          </span>
        ) : (
          <span style={styles.noAsignadoChip} title="Toda la familia">
            F
          </span>
        )}
        <span style={styles.asignadoNombreText}>
          {tarea.asignado_nombre || 'Familia'}
        </span>

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
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
      </div>
    </article>
  )
}

// ── Columna Kanban ────────────────────────────────────────────────────────────
function KanbanColumnComp({
  columna,
  tareas,
  columnas,
  usuariosMap,
  onMover,
  onAgregarTarea,
  onEliminarColumna,
  onEdit,
  onDelete,
  onVerHistorial,
  onVerDetalles,
}) {
  const colorBorder =
    [
      'var(--color-accent)',
      'var(--color-info)',
      'var(--color-success)',
      'var(--color-warning)',
    ][(Number(columna.posicion) - 1) % 4] ?? 'var(--color-accent)'

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const tareaId = e.dataTransfer.getData('text/plain')
    if (tareaId) {
      // Compatibilidad IDs string de DynamoDB (sin Number(tareaId))
      onMover(tareaId, columna.id)
    }
  }

  return (
    <section
      className="kanban-column card m-nolift"
      style={{ ...styles.column, borderTop: `3px solid ${colorBorder}` }}
      aria-label={`Columna: ${columna.nombre}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div style={styles.colHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={styles.colTitle}>{columna.nombre}</h2>
          <span style={styles.colCount} className="font-mono-num">
            {tareas.length}
          </span>
        </div>
        {columnas.length > 1 && (
          <button
            type="button"
            onClick={() => onEliminarColumna(columna)}
            style={styles.deleteColBtn}
            title={`Eliminar columna ${columna.nombre}`}
            aria-label={`Eliminar columna ${columna.nombre}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tareas.length === 0 && <p style={styles.colEmpty}>Sin tareas en esta columna</p>}
        {tareas.map((t) => (
          <TareaCard
            key={t.id}
            tarea={t}
            columnas={columnas}
            usuariosMap={usuariosMap}
            onMover={onMover}
            onEdit={onEdit}
            onDelete={onDelete}
            onVerHistorial={onVerHistorial}
            onVerDetalles={onVerDetalles}
          />
        ))}
      </div>

      <button
        type="button"
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
    crearColumna,
    eliminarColumna,
    fetchHistorial,
    evaluarAvisos,
  } = useKanban()

  const [filtro, setFiltro] = useState('todos') // 'todos' | 'mis' | 'basura' | 'user:<id>' | 'lun'..'dom'
  const [usuarios, setUsuarios] = useState([])
  const [enviandoAvisos, setEnviandoAvisos] = useState(false)

  // Estados de Modales
  const [modalTarea, setModalTarea] = useState({ open: false, tarea: null, columnaId: null })
  const [modalDetalles, setModalDetalles] = useState({ open: false, tarea: null })
  const [modalHistorial, setModalHistorial] = useState({ open: false, tarea: null })
  const [modalEliminar, setModalEliminar] = useState({ open: false, tarea: null })
  const [modalColumna, setModalColumna] = useState(false)
  const [modalEliminarCol, setModalEliminarCol] = useState({ open: false, columna: null })
  const [loadingDelete, setLoadingDelete] = useState(false)

  // Cargar lista de integrantes familiares para asignación y filtros
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const { data } = await api.get('/protected/usuarios')
        setUsuarios(Array.isArray(data) ? data : [])
      } catch {
        // ignore if offline
      }
    }
    loadUsuarios()
  }, [])

  // Evaluar avisos SNS automáticamente 1 vez por sesión al abrir el tablero
  useEffect(() => {
    const KEY = 'homeops-avisos-evaluados'
    if (sessionStorage.getItem(KEY)) return
    sessionStorage.setItem(KEY, '1')
    evaluarAvisos()
      .then((res) => {
        if (res?.avisos_enviados > 0) {
          toast.success(res.message || `Se enviaron ${res.avisos_enviados} recordatorio(s) SNS.`)
        }
      })
      .catch(() => {
        // Silencioso en evaluación automática inicial
      })
  }, [evaluarAvisos])

  const handleEvaluarAvisosManual = async () => {
    setEnviandoAvisos(true)
    try {
      const res = await evaluarAvisos()
      if (res?.avisos_enviados > 0) {
        toast.success(res.message)
      } else {
        toast(res?.message || 'No hay avisos pendientes por enviar hoy.', { icon: '📬' })
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'No se pudieron evaluar los avisos SNS.')
    } finally {
      setEnviandoAvisos(false)
    }
  }

  const handleMover = async (tareaId, nuevaColumnaId) => {
    const tarea = tareas.find((t) => String(t.id) === String(tareaId))
    if (!tarea || String(tarea.columna_id) === String(nuevaColumnaId)) return

    try {
      await moverTarea(tareaId, nuevaColumnaId)
      toast.success('Tarea movida')
    } catch {
      toast.error('Error al mover la tarea')
    }
  }

  const handleSaveTarea = async (formData) => {
    if (modalTarea.tarea) {
      await actualizarTarea(modalTarea.tarea.id, formData)
      toast.success('Tarea actualizada')
    } else {
      await crearTarea(formData)
      toast.success('Tarea creada')
    }
  }

  const handleUpdateTaskField = async (taskId, updatedFields) => {
    const currentTask = tareas.find((t) => String(t.id) === String(taskId))
    if (!currentTask) return
    const payload = {
      titulo: currentTask.titulo,
      descripcion: currentTask.descripcion,
      columna_id: String(currentTask.columna_id),
      prioridad: currentTask.prioridad || 'media',
      es_recurrente: currentTask.es_recurrente,
      es_turno_basura: currentTask.es_turno_basura || 0,
      fecha_vencimiento: currentTask.fecha_vencimiento,
      asignado_a_user_id: currentTask.asignado_a_user_id
        ? String(currentTask.asignado_a_user_id)
        : null,
      ...updatedFields,
    }
    try {
      await actualizarTarea(taskId, payload)
      toast.success('Tarea actualizada')
    } catch {
      toast.error('Error al actualizar la tarea')
    }
  }

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

  const handleConfirmEliminarColumna = async () => {
    if (!modalEliminarCol.columna) return
    setLoadingDelete(true)
    try {
      await eliminarColumna(modalEliminarCol.columna.id)
      toast.success('Columna eliminada')
      setModalEliminarCol({ open: false, columna: null })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al eliminar la columna.')
    } finally {
      setLoadingDelete(false)
    }
  }

  const diasMapeo = {
    lun: 1,
    mar: 2,
    mie: 3,
    jue: 4,
    vie: 5,
    sab: 6,
    dom: 0,
  }

  const getDiaSemana = (fechaStr) => {
    if (!fechaStr) return -1
    const [year, month, day] = String(fechaStr).split('-').map(Number)
    if (!year || !month || !day) return -1
    return new Date(year, month - 1, day).getDay()
  }

  const usuariosMap = new Map(usuarios.map((u) => [String(u.id), u]))

  const tareasFiltradas = tareas.filter((t) => {
    if (filtro === 'todos') return true
    if (filtro === 'basura') return Number(t.es_turno_basura) === 1

    const esMia = String(t.asignado_a_user_id) === String(userId)
    if (filtro === 'mis') return esMia

    if (filtro.startsWith('user:')) {
      const targetUserId = filtro.slice(5)
      return String(t.asignado_a_user_id) === String(targetUserId)
    }

    const targetDay = diasMapeo[filtro]
    if (targetDay !== undefined) {
      return getDiaSemana(t.fecha_vencimiento) === targetDay
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
            {loading
              ? '…'
              : `${tareas.length} tarea${tareas.length !== 1 ? 's' : ''} en ${columnas.length} columna${columnas.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleEvaluarAvisosManual}
            disabled={enviandoAvisos}
            title="Evaluar tareas que vencen hoy o turnos de basura y enviar recordatorio por Amazon SNS"
          >
            <Bell size={16} />
            {enviandoAvisos ? 'Evaluando…' : 'Avisos del día'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setModalColumna(true)}
          >
            <Columns3 size={16} /> + Columna
          </button>

          <button
            type="button"
            className="btn btn-primary"
            id="kanban-new-tarea-btn"
            onClick={() =>
              setModalTarea({
                open: true,
                tarea: null,
                columnaId: columnas[0]?.id ?? null,
              })
            }
          >
            <Plus size={18} /> Nueva tarea
          </button>
        </div>
      </header>

      {/* Filtros principales y por integrante familiar */}
      <div style={styles.filtersBar} role="tablist" aria-label="Filtros de tareas">
        {[
          { key: 'todos',  label: 'Ver todo' },
          { key: 'mis',    label: 'Mis tareas' },
          { key: 'basura', label: '🗑️ Turnos basura' },
          ...usuarios.map((u) => ({
            key: `user:${u.id}`,
            label: u.nombre,
          })),
          { key: 'lun', label: 'Lun' },
          { key: 'mar', label: 'Mar' },
          { key: 'mie', label: 'Mié' },
          { key: 'jue', label: 'Jue' },
          { key: 'vie', label: 'Vie' },
          { key: 'sab', label: 'Sáb' },
          { key: 'dom', label: 'Dom' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filtro === key}
            onClick={() => setFiltro(key)}
            style={{
              ...styles.tab,
              ...(filtro === key ? styles.tabActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cargando */}
      {loading && (
        <div className="kanban-scroll">
          <SkeletonColumn />
          <SkeletonColumn />
          <SkeletonColumn />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={styles.centerState} className="animate-fade-in">
          <AlertTriangle size={32} color="var(--color-danger)" />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar el tablero</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={refetch}
            style={{ marginTop: '8px' }}
          >
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Vacío */}
      {!loading && !error && columnas.length === 0 && (
        <div style={styles.centerState} className="animate-fade-in">
          <div style={styles.emptyIcon}>
            <Columns3 size={36} color="var(--color-muted)" />
          </div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>No hay columnas todavía</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            Crea la primera columna para comenzar a organizar las tareas del hogar.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalColumna(true)}
            style={{ marginTop: '8px' }}
          >
            <Plus size={16} /> Crear primera columna
          </button>
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
              usuariosMap={usuariosMap}
              tareas={tareasFiltradas.filter((t) => String(t.columna_id) === String(col.id))}
              onMover={handleMover}
              onAgregarTarea={(colId) =>
                setModalTarea({ open: true, tarea: null, columnaId: colId })
              }
              onEliminarColumna={(c) => setModalEliminarCol({ open: true, columna: c })}
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

      {/* Modal para Crear Columna */}
      <NuevaColumnaModal
        isOpen={modalColumna}
        onClose={() => setModalColumna(false)}
        onSave={crearColumna}
        totalColumnas={columnas.length}
      />

      {/* Modal de Historial de Auditoría */}
      <HistorialModal
        isOpen={modalHistorial.open}
        onClose={() => setModalHistorial({ open: false, tarea: null })}
        tarea={modalHistorial.tarea}
        fetchHistorial={fetchHistorial}
      />

      {/* Modal de confirmación para eliminar tarea */}
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

      {/* Modal de confirmación para eliminar columna */}
      <Modal
        isOpen={modalEliminarCol.open}
        onClose={() => setModalEliminarCol({ open: false, columna: null })}
        onConfirm={handleConfirmEliminarColumna}
        title="Eliminar Columna"
        message={`¿Deseas eliminar la columna "${modalEliminarCol.columna?.nombre}" y todas las tareas que contiene?`}
        confirmText="Eliminar Columna"
        variant="danger"
        loading={loadingDelete}
      />

      {/* Modal de Detalles de Tarea */}
      <TareaDetallesModal
        isOpen={modalDetalles.open}
        onClose={() => setModalDetalles({ open: false, tarea: null })}
        tarea={tareas.find((t) => String(t.id) === String(modalDetalles.tarea?.id))}
        fetchHistorial={fetchHistorial}
        usuarios={usuarios}
        onUpdate={handleUpdateTaskField}
      />
    </div>
  )
}

const styles = {
  page: { height: '100%' },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  pageSubtitle: { color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '2px' },
  filtersBar: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '12px',
    marginBottom: '14px',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '999px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-muted)',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 150ms var(--ease)',
  },
  tabActive: {
    background: 'rgba(247, 148, 29, 0.14)',
    borderColor: 'rgba(247, 148, 29, 0.45)',
    color: 'var(--color-accent)',
    fontWeight: 600,
  },
  skeletonCol: {
    minWidth: '296px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
  },
  column: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'flex-start',
  },
  colHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  colTitle: { fontSize: '0.94rem', fontWeight: 600, color: 'var(--color-text)' },
  colCount: {
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
    borderRadius: '999px',
    padding: '1px 8px',
    fontSize: '0.74rem',
    color: 'var(--color-muted)',
    fontWeight: 600,
  },
  deleteColBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
  },
  colEmpty: {
    textAlign: 'center',
    color: 'var(--color-muted)',
    fontSize: '0.82rem',
    padding: '22px 0',
  },
  tareaCard: {
    padding: '13px 14px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface2)',
  },
  tareaHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  tareaTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: '4px',
    lineHeight: 1.38,
    flex: 1,
  },
  tareaDesc: {
    fontSize: '0.8rem',
    color: 'var(--color-muted)',
    marginBottom: '8px',
    lineHeight: 1.45,
  },
  badgesWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
    marginBottom: '10px',
  },
  tareaFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    paddingTop: '8px',
    borderTop: '1px solid var(--color-border)',
  },
  asignadoChip: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  noAsignadoChip: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.68rem',
    color: 'var(--color-muted)',
    flexShrink: 0,
  },
  asignadoNombreText: {
    fontSize: '0.76rem',
    color: 'var(--color-muted)',
    fontWeight: 500,
    maxWidth: '90px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  recurrenteBadge: {
    background: 'rgba(56, 189, 248, 0.14)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.68rem',
    padding: '1px 7px',
    borderRadius: '999px',
  },
  vencimientoBadge: {
    background: 'rgba(239, 68, 68, 0.14)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.68rem',
    padding: '1px 7px',
    borderRadius: '999px',
  },
  colSelect: {
    marginLeft: 'auto',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.74rem',
    padding: '2px 6px',
    cursor: 'pointer',
  },
  addTaskBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '12px',
    fontSize: '0.82rem',
    minHeight: '38px',
    padding: '6px 12px',
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
  },
  colDialog: {
    width: '90vw',
    maxWidth: '400px',
    margin: 'auto',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  colModalContent: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55)',
  },
  colModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.82rem',
    color: 'var(--color-muted)',
    marginBottom: '6px',
  },
}
