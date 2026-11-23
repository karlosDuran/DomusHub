import { useState, useEffect } from 'react'
import {
  Columns3,
  Plus,
  AlertTriangle,
  RefreshCw,
  Clock,
  Pencil,
  Trash2,
  Bell,
} from 'lucide-react'
import { useKanban } from '../hooks/useKanban'
import DialogShell from '../components/ui/DialogShell'
import TareaModal from '../components/ui/TareaModal'
import TareaDetallesModal from '../components/ui/TareaDetallesModal'
import HistorialModal from '../components/ui/HistorialModal'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import api from '../api/axiosInstance'

const PRIORIDAD_META = {
  urgente: { label: 'Urgente', className: 'badge badge-danger' },
  alta:    { label: 'Alta',    className: 'badge badge-warning' },
  media:   { label: 'Media',   className: 'badge badge-neutral' },
  baja:    { label: 'Baja',    className: 'badge badge-neutral' },
}

const COL_DOTS = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-warning)',
  'var(--color-success)',
]

// ── Modal para crear nueva columna Kanban ─────────────────────────────────────
function NuevaColumnaModal({ isOpen, onClose, onSave, totalColumnas }) {
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
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva columna"
      icon={<Columns3 size={18} />}
      maxWidth="max-w-[420px]"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="submit"
            form="nueva-columna-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting && <Spinner size="sm" color="currentColor" />}
            Crear columna
          </button>
        </>
      }
    >
      <form id="nueva-columna-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="col-nombre" className="text-xs font-medium text-[var(--color-muted)]">
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="col-pos" className="text-xs font-medium text-[var(--color-muted)]">
            Posición (orden)
          </label>
          <input
            id="col-pos"
            type="number"
            min="1"
            inputMode="numeric"
            className="input font-mono-num"
            value={posicion}
            onChange={(e) => setPosicion(e.target.value)}
            disabled={submitting}
          />
        </div>
      </form>
    </DialogShell>
  )
}

function SkeletonColumn() {
  return (
    <div className="kanban-column rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5">
      <div className="skeleton mb-4 h-5 w-1/2 rounded" />
      <div className="flex flex-col gap-2.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
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
  const esUrgente = tarea.prioridad === 'urgente'
  const asignadoUser = usuariosMap.get(String(tarea.asignado_a_user_id))

  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(tarea.id))}
      onClick={() => onVerDetalles(tarea)}
      className={[
        'surface-card surface-card-interactive group cursor-grab p-3.5 active:cursor-grabbing',
        esUrgente || esBasura ? 'border-[rgba(196,62,59,0.3)]' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-[var(--color-text)]">
          {tarea.titulo}
        </p>
        <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onVerHistorial(tarea)
            }}
            className="btn-icon h-7 w-7"
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
            className="btn-icon h-7 w-7"
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
            className="btn-icon btn-icon-danger h-7 w-7"
            title="Eliminar tarea"
            aria-label="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {tarea.descripcion && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">
          {tarea.descripcion}
        </p>
      )}

      {/* Badges */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`${prio.className} text-[11px]`}>{prio.label}</span>

        {esBasura && (
          <span className="badge badge-warning text-[11px]">
            <Trash2 size={10} /> Basura
          </span>
        )}

        {Number(tarea.es_recurrente) === 1 && (
          <span className="badge badge-info text-[11px]">
            <RefreshCw size={10} /> Recurrente
          </span>
        )}

        {dVenc && (
          <span
            className="badge badge-neutral font-mono-num text-[11px]"
            title={`Vence el: ${tarea.fecha_vencimiento}`}
          >
            {dVenc}
          </span>
        )}
      </div>

      {/* Pie: Responsable + Selector de columna */}
      <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-2.5">
        {tarea.asignado_nombre ? (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: asignadoUser?.avatar_color || 'var(--color-accent)' }}
            title={`Asignado a: ${tarea.asignado_nombre}`}
          >
            {tarea.asignado_nombre[0].toUpperCase()}
          </span>
        ) : (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-muted)]"
            title="Toda la familia"
          >
            F
          </span>
        )}

        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-muted)]">
          {tarea.asignado_nombre || 'Familia'}
        </span>

        {columnas.length > 1 && (
          <select
            value={tarea.columna_id}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onMover(tarea.id, e.target.value)}
            aria-label="Mover tarea a columna"
            className="max-w-[112px] cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--color-text)] outline-none"
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
  const [dragOver, setDragOver] = useState(false)
  const dotColor = COL_DOTS[(Number(columna.posicion) - 1) % COL_DOTS.length] ?? COL_DOTS[0]

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!dragOver) setDragOver(true)
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const tareaId = e.dataTransfer.getData('text/plain')
    if (tareaId) {
      onMover(tareaId, columna.id)
    }
  }

  return (
    <section
      aria-label={`Columna: ${columna.nombre}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'kanban-column flex flex-col rounded-2xl border p-3.5 transition-[border-color,background-color] duration-150',
        dragOver
          ? 'border-dashed border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)]',
      ].join(' ')}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <h2 className="truncate text-sm font-semibold text-[var(--color-text)]">
            {columna.nombre}
          </h2>
          <span className="font-mono-num rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)]">
            {tareas.length}
          </span>
        </div>

        {columnas.length > 1 && (
          <button
            type="button"
            onClick={() => onEliminarColumna(columna)}
            className="btn-icon btn-icon-danger h-7 w-7"
            title={`Eliminar columna ${columna.nombre}`}
            aria-label={`Eliminar columna ${columna.nombre}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {tareas.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-muted)]">
            Sin tareas aquí
          </p>
        )}
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
        onClick={() => onAgregarTarea(columna.id)}
        className="btn btn-subtle mt-3 min-h-[36px] w-full justify-center border border-dashed border-[var(--color-border-strong)] text-xs"
      >
        <Plus size={14} /> Agregar tarea
      </button>
    </section>
  )
}

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

  const [filtro, setFiltro] = useState('todos')
  const [usuarios, setUsuarios] = useState([])
  const [enviandoAvisos, setEnviandoAvisos] = useState(false)

  const [modalTarea, setModalTarea] = useState({ open: false, tarea: null, columnaId: null })
  const [modalDetalles, setModalDetalles] = useState({ open: false, tarea: null })
  const [modalHistorial, setModalHistorial] = useState({ open: false, tarea: null })
  const [modalEliminar, setModalEliminar] = useState({ open: false, tarea: null })
  const [modalColumna, setModalColumna] = useState(false)
  const [modalEliminarCol, setModalEliminarCol] = useState({ open: false, columna: null })
  const [loadingDelete, setLoadingDelete] = useState(false)

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
      .catch(() => {})
  }, [evaluarAvisos])

  const handleEvaluarAvisosManual = async () => {
    setEnviandoAvisos(true)
    try {
      const res = await evaluarAvisos()
      if (res?.avisos_enviados > 0) {
        toast.success(res.message)
      } else {
        toast(res?.message || 'No hay avisos pendientes por enviar hoy.')
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
      toast.success('Tarea eliminada')
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

  const diasMapeo = { lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 0 }

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
    if (filtro === 'mis') return String(t.asignado_a_user_id) === String(userId)
    if (filtro.startsWith('user:')) {
      return String(t.asignado_a_user_id) === String(filtro.slice(5))
    }
    const targetDay = diasMapeo[filtro]
    if (targetDay !== undefined) {
      return getDiaSemana(t.fecha_vencimiento) === targetDay
    }
    return true
  })

  const filterItems = [
    { key: 'todos', label: 'Ver todo' },
    { key: 'mis', label: 'Mis tareas' },
    { key: 'basura', label: 'Turnos basura', icon: Trash2 },
    ...usuarios.map((u) => ({ key: `user:${u.id}`, label: u.nombre })),
    { key: 'lun', label: 'Lun' },
    { key: 'mar', label: 'Mar' },
    { key: 'mie', label: 'Mié' },
    { key: 'jue', label: 'Jue' },
    { key: 'vie', label: 'Vie' },
    { key: 'sab', label: 'Sáb' },
    { key: 'dom', label: 'Dom' },
  ]

  return (
    <div id="kanban-page" className="mx-auto max-w-[1200px]">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Tareas del hogar</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {loading
              ? 'Cargando tablero…'
              : `${tareas.length} tarea${tareas.length !== 1 ? 's' : ''} en ${columnas.length} columna${columnas.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleEvaluarAvisosManual}
            disabled={enviandoAvisos}
            title="Evaluar tareas que vencen hoy o turnos de basura y enviar recordatorio por Amazon SNS"
          >
            <Bell size={15} />
            {enviandoAvisos ? 'Evaluando…' : 'Avisos del día'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setModalColumna(true)}
          >
            <Columns3 size={15} /> Columna
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
            <Plus size={17} /> Nueva tarea
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div
        className="pill-bar mb-5 pb-1 md:flex-wrap md:overflow-visible"
        role="tablist"
        aria-label="Filtros de tareas"
      >
        {filterItems.map(({ key, label, icon: Icon }) => {
          const active = filtro === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFiltro(key)}
              className={[
                'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,color] duration-150 active:scale-[0.97]',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-[var(--color-accent-ink)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {Icon && <Icon size={12} />}
              {label}
            </button>
          )
        })}
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
        <div className="animate-fade-in flex flex-col items-center gap-2 py-14 text-center">
          <AlertTriangle size={28} className="text-[var(--color-danger)]" />
          <p className="font-semibold text-[var(--color-danger-text)]">
            Error al cargar el tablero
          </p>
          <p className="text-sm text-[var(--color-muted)]">{error}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={refetch}>
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      )}

      {/* Vacío */}
      {!loading && !error && columnas.length === 0 && (
        <div className="animate-fade-in flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-muted)]">
            <Columns3 size={24} />
          </div>
          <p className="font-semibold text-[var(--color-text)]">No hay columnas todavía</p>
          <p className="max-w-sm text-sm text-[var(--color-muted)]">
            Crea la primera columna para comenzar a organizar las tareas del hogar.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-3"
            onClick={() => setModalColumna(true)}
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

      <NuevaColumnaModal
        isOpen={modalColumna}
        onClose={() => setModalColumna(false)}
        onSave={crearColumna}
        totalColumnas={columnas.length}
      />

      <HistorialModal
        isOpen={modalHistorial.open}
        onClose={() => setModalHistorial({ open: false, tarea: null })}
        tarea={modalHistorial.tarea}
        fetchHistorial={fetchHistorial}
      />

      <Modal
        isOpen={modalEliminar.open}
        onClose={() => setModalEliminar({ open: false, tarea: null })}
        onConfirm={handleConfirmEliminar}
        title="Eliminar tarea"
        message={`¿Seguro que deseas eliminar la tarea "${modalEliminar.tarea?.titulo}"? Esta acción es definitiva.`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />

      <Modal
        isOpen={modalEliminarCol.open}
        onClose={() => setModalEliminarCol({ open: false, columna: null })}
        onConfirm={handleConfirmEliminarColumna}
        title="Eliminar columna"
        message={`¿Deseas eliminar la columna "${modalEliminarCol.columna?.nombre}" y todas las tareas que contiene?`}
        confirmText="Eliminar columna"
        variant="danger"
        loading={loadingDelete}
      />

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
