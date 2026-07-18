<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use DomusHub\Middleware\JwtMiddleware;
use DomusHub\Controllers\InventarioController;

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
    })->add(new JwtMiddleware());
};
