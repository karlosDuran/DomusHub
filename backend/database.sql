-- DomusHub Database Schema
PRAGMA foreign_keys = ON;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'miembro' CHECK(rol IN ('admin', 'miembro')),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos (inventario)
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cantidad_actual REAL NOT NULL DEFAULT 0,
    unidad_medida TEXT NOT NULL DEFAULT 'unidad',
    porcentaje_visual INTEGER NOT NULL DEFAULT 100 CHECK(porcentaje_visual IN (0, 25, 50, 75, 100)),
    cantidad_minima REAL NOT NULL DEFAULT 1,
    precio_promedio REAL DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Columnas del tablero Kanban
CREATE TABLE IF NOT EXISTS kanban_columnas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    posicion INTEGER NOT NULL UNIQUE
);

-- Tareas del tablero Kanban
CREATE TABLE IF NOT EXISTS tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    columna_id INTEGER NOT NULL,
    asignado_a_user_id INTEGER,
    es_recurrente INTEGER NOT NULL DEFAULT 0 CHECK(es_recurrente IN (0, 1)),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (columna_id) REFERENCES kanban_columnas(id) ON DELETE CASCADE,
    FOREIGN KEY (asignado_a_user_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Historial de cambios en tareas
CREATE TABLE IF NOT EXISTS tareas_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarea_id INTEGER NOT NULL,
    user_id INTEGER,
    accion TEXT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Datos semilla: columnas Kanban por defecto
INSERT OR IGNORE INTO kanban_columnas (id, nombre, posicion) VALUES
    (1, 'Pendiente', 1),
    (2, 'En Progreso', 2),
    (3, 'Completado', 3);
