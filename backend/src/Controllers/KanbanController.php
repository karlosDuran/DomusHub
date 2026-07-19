<?php
declare(strict_types=1);

namespace DomusHub\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class KanbanController
{
    private function getPDO(): \PDO
    {
        require_once __DIR__ . '/../../config/db.php';
        return \getDBConnection();
    }

    private function jsonResponse(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    // --- COLUMNAS ---

    public function listarColumnas(Request $request, Response $response): Response
    {
        $pdo = $this->getPDO();
        $stmt = $pdo->query('SELECT * FROM kanban_columnas ORDER BY posicion ASC');
        $columnas = $stmt->fetchAll();
        return $this->jsonResponse($response, $columnas);
    }

    public function crearColumna(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        if (empty($data['nombre']) || trim((string)$data['nombre']) === '') {
            return $this->jsonResponse($response, ['error' => 'El nombre de la columna es obligatorio.'], 420);
        }
        if (!isset($data['posicion']) || !is_numeric($data['posicion'])) {
            return $this->jsonResponse($response, ['error' => 'La posición de la columna es obligatoria y debe ser numérica.'], 420);
        }

        $nombre = trim((string)$data['nombre']);
        $posicion = (int)$data['posicion'];

        $pdo = $this->getPDO();

        // Evitar duplicados de posición
        $stmt = $pdo->prepare('SELECT id FROM kanban_columnas WHERE posicion = :posicion');
        $stmt->execute([':posicion' => $posicion]);
        if ($stmt->fetch()) {
            return $this->jsonResponse($response, ['error' => 'Ya existe una columna en esta posición.'], 420);
        }

        $stmt = $pdo->prepare('INSERT INTO kanban_columnas (nombre, posicion) VALUES (:nombre, :posicion)');
        $stmt->execute([
            ':nombre' => $nombre,
            ':posicion' => $posicion
        ]);

        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT * FROM kanban_columnas WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $columna = $stmt->fetch();

        return $this->jsonResponse($response, $columna, 201);
    }

    public function eliminarColumna(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return $this->jsonResponse($response, ['error' => 'ID de columna no proporcionado.'], 400);
        }

        $pdo = $this->getPDO();
        $stmt = $pdo->prepare('SELECT * FROM kanban_columnas WHERE id = :id');
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            return $this->jsonResponse($response, ['error' => 'Columna no encontrada.'], 404);
        }

        $stmt = $pdo->prepare('DELETE FROM kanban_columnas WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $this->jsonResponse($response, ['message' => 'Columna eliminada correctamente.']);
    }

    // --- TAREAS ---

    public function listarTareas(Request $request, Response $response): Response
    {
        $queryParams = $request->getQueryParams();
        $columna_id = $queryParams['columna_id'] ?? null;
        $user_id = $queryParams['user_id'] ?? null;

        $query = 'SELECT t.*, u.nombre as asignado_nombre, c.nombre as columna_nombre FROM tareas t 
                  JOIN kanban_columnas c ON t.columna_id = c.id
                  LEFT JOIN usuarios u ON t.asignado_a_user_id = u.id 
                  WHERE 1=1';
        $params = [];

        if ($columna_id !== null) {
            $query .= ' AND t.columna_id = :columna_id';
            $params[':columna_id'] = (int)$columna_id;
        }

        if ($user_id !== null) {
            $query .= ' AND t.asignado_a_user_id = :user_id';
            $params[':user_id'] = (int)$user_id;
        }

        $query .= ' ORDER BY t.id DESC';

        $pdo = $this->getPDO();
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $tareas = $stmt->fetchAll();

        return $this->jsonResponse($response, $tareas);
    }

    public function crearTarea(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        if (empty($data['titulo']) || trim((string)$data['titulo']) === '') {
            return $this->jsonResponse($response, ['error' => 'El título de la tarea es obligatorio.'], 420);
        }
        if (empty($data['columna_id']) || !is_numeric($data['columna_id'])) {
            return $this->jsonResponse($response, ['error' => 'El ID de columna es obligatorio y debe ser numérico.'], 420);
        }

        $titulo = trim((string)$data['titulo']);
        $descripcion = isset($data['descripcion']) ? trim((string)$data['descripcion']) : null;
        $columna_id = (int)$data['columna_id'];
        $asignado_a_user_id = !empty($data['asignado_a_user_id']) ? (int)$data['asignado_a_user_id'] : null;
        $es_recurrente = isset($data['es_recurrente']) ? ((int)$data['es_recurrente'] === 1 ? 1 : 0) : 0;
        $fecha_vencimiento = !empty($data['fecha_vencimiento']) ? trim((string)$data['fecha_vencimiento']) : null;

        $pdo = $this->getPDO();

        // Verificar que exista la columna
        $stmt = $pdo->prepare('SELECT id FROM kanban_columnas WHERE id = :columna_id');
        $stmt->execute([':columna_id' => $columna_id]);
        if (!$stmt->fetch()) {
            return $this->jsonResponse($response, ['error' => 'La columna especificada no existe.'], 420);
        }

        // Verificar que exista el usuario si se asigna
        if ($asignado_a_user_id !== null) {
            $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE id = :user_id');
            $stmt->execute([':user_id' => $asignado_a_user_id]);
            if (!$stmt->fetch()) {
                return $this->jsonResponse($response, ['error' => 'El usuario asignado no existe.'], 420);
            }
        }

        $stmt = $pdo->prepare('INSERT INTO tareas (titulo, descripcion, columna_id, asignado_a_user_id, es_recurrente, fecha_vencimiento) VALUES (:titulo, :descripcion, :columna_id, :asignado_a_user_id, :es_recurrente, :fecha_vencimiento)');
        $stmt->execute([
            ':titulo' => $titulo,
            ':descripcion' => $descripcion,
            ':columna_id' => $columna_id,
            ':asignado_a_user_id' => $asignado_a_user_id,
            ':es_recurrente' => $es_recurrente,
            ':fecha_vencimiento' => $fecha_vencimiento
        ]);

        $id = $pdo->lastInsertId();

        // Registrar en historial
        $creator_user_id = $request->getAttribute('user_id');
        $stmtHistorial = $pdo->prepare('INSERT INTO tareas_historial (tarea_id, user_id, accion) VALUES (:tarea_id, :user_id, "Tarea creada")');
        $stmtHistorial->execute([
            ':tarea_id' => $id,
            ':user_id' => $creator_user_id
        ]);

        $stmt = $pdo->prepare('SELECT * FROM tareas WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $tarea = $stmt->fetch();

        return $this->jsonResponse($response, $tarea, 201);
    }

    public function actualizarTarea(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return $this->jsonResponse($response, ['error' => 'ID de tarea no proporcionado.'], 400);
        }

        $pdo = $this->getPDO();
        $stmt = $pdo->prepare('SELECT * FROM tareas WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $tarea = $stmt->fetch();
        if (!$tarea) {
            return $this->jsonResponse($response, ['error' => 'Tarea no encontrada.'], 404);
        }

        $data = $request->getParsedBody();
        if (empty($data['titulo']) || trim((string)$data['titulo']) === '') {
            return $this->jsonResponse($response, ['error' => 'El título de la tarea es obligatorio.'], 420);
        }
        if (empty($data['columna_id']) || !is_numeric($data['columna_id'])) {
            return $this->jsonResponse($response, ['error' => 'El ID de columna es obligatorio y debe ser numérico.'], 420);
        }

        $titulo = trim((string)$data['titulo']);
        $descripcion = isset($data['descripcion']) ? trim((string)$data['descripcion']) : null;
        $columna_id = (int)$data['columna_id'];
        $asignado_a_user_id = !empty($data['asignado_a_user_id']) ? (int)$data['asignado_a_user_id'] : null;
        $es_recurrente = isset($data['es_recurrente']) ? ((int)$data['es_recurrente'] === 1 ? 1 : 0) : 0;
        $fecha_vencimiento = !empty($data['fecha_vencimiento']) ? trim((string)$data['fecha_vencimiento']) : null;

        // Verificar que exista la columna
        $stmt = $pdo->prepare('SELECT id FROM kanban_columnas WHERE id = :columna_id');
        $stmt->execute([':columna_id' => $columna_id]);
        if (!$stmt->fetch()) {
            return $this->jsonResponse($response, ['error' => 'La columna especificada no existe.'], 420);
        }

        // Verificar que exista el usuario si se asigna
        if ($asignado_a_user_id !== null) {
            $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE id = :user_id');
            $stmt->execute([':user_id' => $asignado_a_user_id]);
            if (!$stmt->fetch()) {
                return $this->jsonResponse($response, ['error' => 'El usuario asignado no existe.'], 420);
            }
        }

        $stmt = $pdo->prepare('UPDATE tareas SET titulo = :titulo, descripcion = :descripcion, columna_id = :columna_id, asignado_a_user_id = :asignado_a_user_id, es_recurrente = :es_recurrente, fecha_vencimiento = :fecha_vencimiento WHERE id = :id');
        $stmt->execute([
            ':titulo' => $titulo,
            ':descripcion' => $descripcion,
            ':columna_id' => $columna_id,
            ':asignado_a_user_id' => $asignado_a_user_id,
            ':es_recurrente' => $es_recurrente,
            ':fecha_vencimiento' => $fecha_vencimiento,
            ':id' => $id
        ]);

        // Registrar en historial si hay cambios significativos
        $modifier_user_id = $request->getAttribute('user_id');
        $stmtHistorial = $pdo->prepare('INSERT INTO tareas_historial (tarea_id, user_id, accion) VALUES (:tarea_id, :user_id, "Tarea modificada")');
        $stmtHistorial->execute([
            ':tarea_id' => $id,
            ':user_id' => $modifier_user_id
        ]);

        $stmt = $pdo->prepare('SELECT * FROM tareas WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $updated = $stmt->fetch();

        return $this->jsonResponse($response, $updated);
    }

    public function moverTarea(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return $this->jsonResponse($response, ['error' => 'ID de tarea no proporcionado.'], 400);
        }

        $data = $request->getParsedBody();
        if (empty($data['columna_id']) || !is_numeric($data['columna_id'])) {
            return $this->jsonResponse($response, ['error' => 'El columna_id es obligatorio y debe ser numérico.'], 420);
        }

        $nueva_columna_id = (int)$data['columna_id'];

        $pdo = $this->getPDO();

        // Obtener la tarea y el nombre de su columna actual
        $stmt = $pdo->prepare('
            SELECT t.columna_id, c.nombre as columna_nombre 
            FROM tareas t
            JOIN kanban_columnas c ON t.columna_id = c.id
            WHERE t.id = :id
        ');
        $stmt->execute([':id' => $id]);
        $tarea = $stmt->fetch();
        if (!$tarea) {
            return $this->jsonResponse($response, ['error' => 'Tarea no encontrada.'], 404);
        }

        $columna_origen_id = (int)$tarea['columna_id'];
        $columna_origen_nombre = $tarea['columna_nombre'];

        if ($columna_origen_id === $nueva_columna_id) {
            return $this->jsonResponse($response, ['message' => 'La tarea ya se encuentra en esa columna.']);
        }

        // Obtener el nombre de la columna destino
        $stmt = $pdo->prepare('SELECT nombre FROM kanban_columnas WHERE id = :columna_id');
        $stmt->execute([':columna_id' => $nueva_columna_id]);
        $columna_destino = $stmt->fetch();
        if (!$columna_destino) {
            return $this->jsonResponse($response, ['error' => 'La columna de destino no existe.'], 420);
        }
        $columna_destino_nombre = $columna_destino['nombre'];

        // Actualizar la columna de la tarea
        $stmt = $pdo->prepare('UPDATE tareas SET columna_id = :columna_id WHERE id = :id');
        $stmt->execute([
            ':columna_id' => $nueva_columna_id,
            ':id' => $id
        ]);

        // Registrar acción en tareas_historial
        $user_id = $request->getAttribute('user_id');
        $accion = sprintf('Movido de "%s" a "%s"', $columna_origen_nombre, $columna_destino_nombre);

        $stmtHistorial = $pdo->prepare('INSERT INTO tareas_historial (tarea_id, user_id, accion) VALUES (:tarea_id, :user_id, :accion)');
        $stmtHistorial->execute([
            ':tarea_id' => $id,
            ':user_id' => $user_id,
            ':accion' => $accion
        ]);

        return $this->jsonResponse($response, [
            'message' => 'Tarea movida con éxito.',
            'columna_anterior' => $columna_origen_nombre,
            'columna_nueva' => $columna_destino_nombre
        ]);
    }

    public function eliminarTarea(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return $this->jsonResponse($response, ['error' => 'ID de tarea no proporcionado.'], 400);
        }

        $pdo = $this->getPDO();
        $stmt = $pdo->prepare('SELECT * FROM tareas WHERE id = :id');
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            return $this->jsonResponse($response, ['error' => 'Tarea no encontrada.'], 404);
        }

        $stmt = $pdo->prepare('DELETE FROM tareas WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $this->jsonResponse($response, ['message' => 'Tarea eliminada correctamente.']);
    }

    public function listarHistorial(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return $this->jsonResponse($response, ['error' => 'ID de tarea no proporcionado.'], 400);
        }

        $pdo = $this->getPDO();

        // Verificar existencia de la tarea
        $stmt = $pdo->prepare('SELECT id FROM tareas WHERE id = :id');
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            return $this->jsonResponse($response, ['error' => 'Tarea no encontrada.'], 404);
        }

        $stmt = $pdo->prepare('
            SELECT h.id, h.accion, h.fecha_registro, u.nombre as usuario_nombre 
            FROM tareas_historial h
            LEFT JOIN usuarios u ON h.user_id = u.id
            WHERE h.tarea_id = :tarea_id
            ORDER BY h.fecha_registro DESC
        ');
        $stmt->execute([':tarea_id' => $id]);
        $historial = $stmt->fetchAll();

        return $this->jsonResponse($response, $historial);
    }
}
