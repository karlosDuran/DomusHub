<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use DomusHub\Middleware\JwtMiddleware;

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
    })->add(new JwtMiddleware());
};
