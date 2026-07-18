<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use DomusHub\Middleware\JwtMiddleware;
use DomusHub\Controllers\InventarioController;
use DomusHub\Controllers\ComprasController;
use DomusHub\Controllers\KanbanController;

return function (App $app) {
    $app->group('/api/protected', function (RouteCollectorProxy $group) {
        // Health check endpoint
        $group->get('/health', function (Request $request, Response $response) {
            $response->getBody()->write(json_encode([
                'status' => 'ok',
                'user_id' => $request->getAttribute('user_id'),
                'timestamp' => date('c')
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Inventario endpoints
        $group->get('/inventario/critico', [InventarioController::class, 'listarCritico']);
        $group->get('/inventario', [InventarioController::class, 'listar']);
        $group->post('/inventario', [InventarioController::class, 'crear']);
        $group->put('/inventario/{id}', [InventarioController::class, 'actualizar']);
        $group->delete('/inventario/{id}', [InventarioController::class, 'eliminar']);

        // Compras endpoints
        $group->post('/compras/registrar', [ComprasController::class, 'registrar']);

        // Kanban — Columnas
        $group->get('/kanban/columnas', [KanbanController::class, 'listarColumnas']);
        $group->post('/kanban/columnas', [KanbanController::class, 'crearColumna']);
        $group->delete('/kanban/columnas/{id}', [KanbanController::class, 'eliminarColumna']);

        // Kanban — Tareas
        $group->get('/kanban/tareas', [KanbanController::class, 'listarTareas']);
        $group->post('/kanban/tareas', [KanbanController::class, 'crearTarea']);
        $group->put('/kanban/tareas/{id}', [KanbanController::class, 'actualizarTarea']);
        $group->patch('/kanban/tareas/{id}/mover', [KanbanController::class, 'moverTarea']);
        $group->delete('/kanban/tareas/{id}', [KanbanController::class, 'eliminarTarea']);

        // Kanban — Historial
        $group->get('/kanban/tareas/{id}/historial', [KanbanController::class, 'listarHistorial']);
    })->add(new JwtMiddleware());
};
