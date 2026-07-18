<?php
declare(strict_types=1);

namespace DomusHub\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ComprasController
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

    public function registrar(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        if (empty($data['items']) || !is_array($data['items'])) {
            return $this->jsonResponse($response, ['error' => 'El campo "items" es obligatorio y debe ser un array.'], 420);
        }

        $pdo = $this->getPDO();

        try {
            $pdo->beginTransaction();

            $stmtSelect = $pdo->prepare('SELECT id, cantidad_actual, porcentaje_visual, precio_promedio FROM productos WHERE id = :id');
            $stmtUpdate = $pdo->prepare('UPDATE productos SET cantidad_actual = :cantidad_actual, porcentaje_visual = 100, precio_promedio = :precio_promedio WHERE id = :id');

            $updatedProducts = [];

            foreach ($data['items'] as $item) {
                if (empty($item['id_producto']) || !isset($item['precio_pagado']) || !isset($item['cantidad_comprada'])) {
                    $pdo->rollBack();
                    return $this->jsonResponse($response, ['error' => 'Cada item debe contener "id_producto", "precio_pagado" y "cantidad_comprada".'], 420);
                }

                $id_producto = (int)$item['id_producto'];
                $precio_pagado = (float)$item['precio_pagado'];
                $cantidad_comprada = (float)$item['cantidad_comprada'];

                if ($precio_pagado < 0 || $cantidad_comprada <= 0) {
                    $pdo->rollBack();
                    return $this->jsonResponse($response, ['error' => 'Valores de precio o cantidad inválidos.'], 420);
                }

                $stmtSelect->execute([':id' => $id_producto]);
                $producto = $stmtSelect->fetch();

                if (!$producto) {
                    $pdo->rollBack();
                    return $this->jsonResponse($response, ['error' => "Producto con ID {$id_producto} no encontrado."], 404);
                }

                $nueva_cantidad = (float)$producto['cantidad_actual'] + $cantidad_comprada;

                $stmtUpdate->execute([
                    ':cantidad_actual' => $nueva_cantidad,
                    ':precio_promedio' => $precio_pagado,
                    ':id' => $id_producto
                ]);

                $updatedProducts[] = [
                    'id' => $id_producto,
                    'cantidad_anterior' => $producto['cantidad_actual'],
                    'nueva_cantidad' => $nueva_cantidad,
                    'nuevo_precio_promedio' => $precio_pagado
                ];
            }

            $pdo->commit();

            return $this->jsonResponse($response, [
                'message' => 'Compra registrada y stock actualizado con éxito.',
                'items_actualizados' => $updatedProducts
            ], 200);

        } catch (\Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return $this->jsonResponse($response, ['error' => 'Error al procesar la transacción: ' . $e->getMessage()], 500);
        }
    }
}
