<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Firebase\JWT\JWT;

return function (App $app) {
    $app->post('/api/auth/login', function (Request $request, Response $response) {
        $data = $request->getParsedBody();
        $nombre = $data['nombre'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($nombre) || empty($password)) {
            $response->getBody()->write(json_encode([
                'error' => 'Nombre y contraseña son requeridos'
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        require_once __DIR__ . '/../config/db.php';
        $pdo = getDBConnection();

        $stmt = $pdo->prepare('SELECT id, nombre, password_hash, rol FROM usuarios WHERE nombre = :nombre');
        $stmt->execute([':nombre' => $nombre]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $response->getBody()->write(json_encode([
                'error' => 'Credenciales inválidas'
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        $secret = $_ENV['JWT_SECRET'] ?? 'change-this-to-a-secure-random-string';
        $expiration = (int)($_ENV['JWT_EXPIRATION'] ?? 3600);

        $payload = [
            'iss' => 'domushub',
            'sub' => $user['id'],
            'nombre' => $user['nombre'],
            'rol' => $user['rol'],
            'iat' => time(),
            'exp' => time() + $expiration,
        ];

        $token = JWT::encode($payload, $secret, 'HS256');

        $response->getBody()->write(json_encode([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'nombre' => $user['nombre'],
                'rol' => $user['rol'],
            ]
        ]));

        return $response->withHeader('Content-Type', 'application/json');
    });
};
