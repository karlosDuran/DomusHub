<?php
declare(strict_types=1);

namespace DomusHub\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class InventarioController
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

    private function calcularPorcentajeVisual(float $cantidad_actual, float $cantidad_minima): int
    {
        if ($cantidad_minima <= 0) {
            return 100;
        }
        $ratio = $cantidad_actual / $cantidad_minima;
        if ($ratio >= 1.0) {
            return 100;
        } elseif ($ratio >= 0.75) {
            return 75;
        } elseif ($ratio >= 0.5) {
            return 50;
        } elseif ($ratio >= 0.25) {
            return 25;
        } else {
            return 0;
        }
    }

    private function validar(array $data): array
    {
        $errors = [];
        if (empty($data['nombre']) || trim((string)$data['nombre']) === '') {
            $errors[] = 'El nombre es obligatorio.';
        }
        if (isset($data['cantidad_actual']) && (!is_numeric($data['cantidad_actual']) || (float)$data['cantidad_actual'] < 0)) {
            $errors[] = 'La cantidad actual debe ser un número mayor o igual a 0.';
        }
        if (isset($data['cantidad_minima']) && (!is_numeric($data['cantidad_minima']) || (float)$data['cantidad_minima'] < 0)) {
            $errors[] = 'La cantidad mínima debe ser un número mayor o igual a 0.';
        }
        if (isset($data['precio_promedio']) && (!is_numeric($data['precio_promedio']) || (float)$data['precio_promedio'] < 0)) {
            $errors[] = 'El precio promedio debe ser un número mayor o igual a 0.';
        }
        return $errors;
    }

    public function listar(Request $request, Response $response): Response
    {
        $pdo = $this->getPDO();
        $stmt = $pdo->query('SELECT * FROM productos ORDER BY nombre ASC');
        $productos = $stmt->fetchAll();
        return $this->jsonResponse($response, [
            'data' => $productos,
            'total' => count($productos)
        ]);
    }

    public function listarCritico(Request $request, Response $response): Response
    {
        $pdo = $this->getPDO();
        // Filtrar productos donde porcentaje_visual <= 25 o cantidad_actual <= cantidad_minima
        $stmt = $pdo->query('SELECT * FROM productos WHERE porcentaje_visual <= 25 OR cantidad_actual <= cantidad_minima ORDER BY nombre ASC');
        $productos = $stmt->fetchAll();
        return $this->jsonResponse($response, [
            'data' => $productos,
            'total' => count($productos)
        ]);
    }

    public function crear(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        $errors = $this->validar($data ?? []);
        if (!empty($errors)) {
            return $this->jsonResponse($response, ['errors' => $errors], 420);
        }

        $nombre = trim((string)$data['nombre']);
        $cantidad_actual = isset($data['cantidad_actual']) ? (float)$data['cantidad_actual'] : 0.0;
        $unidad_medida = isset($data['unidad_medida']) ? trim((string)$data['unidad_medida']) : 'unidad';
        $cantidad_minima = isset($data['cantidad_minima']) ? (float)$data['cantidad_minima'] : 1.0;
        $precio_promedio = isset($data['precio_promedio']) ? (float)$data['precio_promedio'] : 0.0;
        $porcentaje_visual = $this->calcularPorcentajeVisual($cantidad_actual, $cantidad_minima);

        $pdo = $this->getPDO();
        $stmt = $pdo->prepare('INSERT INTO productos (nombre, cantidad_actual, unidad_medida, porcentaje_visual, cantidad_minima, precio_promedio) VALUES (:nombre, :cantidad_actual, :unidad_medida, :porcentaje_visual, :cantidad_minima, :precio_promedio)');
        $stmt->execute([
            ':nombre' => $nombre,
            ':cantidad_actual' => $cantidad_actual,
            ':unidad_medida' => $unidad_medida,
            ':porcentaje_visual' => $porcentaje_visual,
            ':cantidad_minima' => $cantidad_minima,
            ':precio_promedio' => $precio_promedio
        ]);

        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT * FROM productos WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $producto = $stmt->fetch();

        return $this->jsonResponse($response, $producto, 201);
    }

    public function actualizar(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return $this->jsonResponse($response, ['error' => 'ID no proporcionado'], 400);
        }

        $pdo = $this->getPDO();
        $stmt = $pdo->prepare('SELECT * FROM productos WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $producto = $stmt->fetch();
        if (!$producto) {
            return $this->jsonResponse($response, ['error' => 'Producto no encontrado'], 404);
        }

        $data = $request->getParsedBody();
        $errors = $this->validar($data ?? []);
        if (!empty($errors)) {
            return $this->jsonResponse($response, ['errors' => $errors], 420);
        }

        $nombre = trim((string)$data['nombre']);
        $cantidad_actual = isset($data['cantidad_actual']) ? (float)$data['cantidad_actual'] : (float)$producto['cantidad_actual'];
        $unidad_medida = isset($data['unidad_medida']) ? trim((string)$data['unidad_medida']) : (string)$producto['unidad_medida'];
        $cantidad_minima = isset($data['cantidad_minima']) ? (float)$data['cantidad_minima'] : (float)$producto['cantidad_minima'];
        $precio_promedio = isset($data['precio_promedio']) ? (float)$data['precio_promedio'] : (float)$producto['precio_promedio'];
        $porcentaje_visual = $this->calcularPorcentajeVisual($cantidad_actual, $cantidad_minima);

        $stmt = $pdo->prepare('UPDATE productos SET nombre = :nombre, cantidad_actual = :cantidad_actual, unidad_medida = :unidad_medida, porcentaje_visual = :porcentaje_visual, cantidad_minima = :cantidad_minima, precio_promedio = :precio_promedio WHERE id = :id');
        $stmt->execute([
            ':nombre' => $nombre,
            ':cantidad_actual' => $cantidad_actual,
            ':unidad_medida' => $unidad_medida,
            ':porcentaje_visual' => $porcentaje_visual,
            ':cantidad_minima' => $cantidad_minima,
            ':precio_promedio' => $precio_promedio,
            ':id' => $id
        ]);

        $stmt = $pdo->prepare('SELECT * FROM productos WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $updated = $stmt->fetch();

        return $this->jsonResponse($response, $updated, 200);
    }

    public function eliminar(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return $this->jsonResponse($response, ['error' => 'ID no proporcionado'], 400);
        }

        $pdo = $this->getPDO();
        $stmt = $pdo->prepare('SELECT * FROM productos WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $producto = $stmt->fetch();
        if (!$producto) {
            return $this->jsonResponse($response, ['error' => 'Producto no encontrado'], 404);
        }

        $stmt = $pdo->prepare('DELETE FROM productos WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $this->jsonResponse($response, ['message' => 'Producto eliminado correctamente']);
    }
}
