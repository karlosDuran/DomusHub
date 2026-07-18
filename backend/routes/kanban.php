<?php
declare(strict_types=1);

use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use DomusHub\Middleware\JwtMiddleware;
use DomusHub\Controllers\KanbanController;

return function (App $app) {
    $app->group('/api/protected', function (RouteCollectorProxy $group) {
        // Columnas
        $group->get('/kanban/columnas', [KanbanController::class, 'listarColumnas']);
        $group->post('/kanban/columnas', [KanbanController::class, 'crearColumna']);
        $group->delete('/kanban/columnas/{id}', [KanbanController::class, 'eliminarColumna']);

        // Tareas
        $group->get('/kanban/tareas', [KanbanController::class, 'listarTareas']);
        $group->post('/kanban/tareas', [KanbanController::class, 'crearTarea']);
        $group->put('/kanban/tareas/{id}', [KanbanController::class, 'actualizarTarea']);
        $group->put('/kanban/tareas/{id}/mover', [KanbanController::class, 'moverTarea']);
        $group->delete('/kanban/tareas/{id}', [KanbanController::class, 'eliminarTarea']);
        $group->get('/kanban/tareas/{id}/historial', [KanbanController::class, 'listarHistorial']);
    })->add(new JwtMiddleware());
};
