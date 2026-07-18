<?php
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    die("Este script solo puede ser ejecutado desde la interfaz de línea de comandos (CLI).\n");
}

require_once __DIR__ . '/../config/db.php';

try {
    $pdo = getDBConnection();
    $pdo->beginTransaction();

    // 1. Obtener la columna inicial (la de menor posición)
    $stmtCol = $pdo->query('SELECT id, nombre FROM kanban_columnas ORDER BY posicion ASC LIMIT 1');
    $columnaInicial = $stmtCol->fetch();
    if (!$columnaInicial) {
        throw new Exception('No se encontró ninguna columna en el tablero Kanban.');
    }
    $columnaInicialId = (int)$columnaInicial['id'];
    $columnaInicialNombre = $columnaInicial['nombre'];

    // 2. Obtener las tareas recurrentes que serán afectadas para registrarlas en el historial
    $stmtTareas = $pdo->query('SELECT id, titulo FROM tareas WHERE es_recurrente = 1');
    $tareasRecurrentes = $stmtTareas->fetchAll();

    if (empty($tareasRecurrentes)) {
        echo "No hay tareas recurrentes registradas para reiniciar.\n";
        $pdo->rollBack();
        exit(0);
    }

    // 3. Reiniciar las tareas recurrentes
    $stmtUpdate = $pdo->prepare('
        UPDATE tareas 
        SET columna_id = :columna_id, 
            asignado_a_user_id = NULL 
        WHERE es_recurrente = 1
    ');
    $stmtUpdate->execute([':columna_id' => $columnaInicialId]);

    // 4. Registrar en el historial de cada tarea
    $stmtHistorial = $pdo->prepare('
        INSERT INTO tareas_historial (tarea_id, user_id, accion) 
        VALUES (:tarea_id, NULL, :accion)
    ');

    $accion = "Regeneración semanal automática (Reiniciada a columna \"{$columnaInicialNombre}\")";

    foreach ($tareasRecurrentes as $tarea) {
        $stmtHistorial->execute([
            ':tarea_id' => (int)$tarea['id'],
            ':accion' => $accion
        ]);
        echo "🔄 Tarea #{$tarea['id']} (\"{$tarea['titulo']}\") reiniciada.\n";
    }

    $pdo->commit();
    echo "✅ Se reiniciaron exitosamente " . count($tareasRecurrentes) . " tareas recurrentes.\n";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "❌ Error al ejecutar el cron de reinicio de tareas: " . $e->getMessage() . "\n");
    exit(1);
}
