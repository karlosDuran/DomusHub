<?php
declare(strict_types=1);

use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

// Cargar variables de entorno
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$app = AppFactory::create();

// Middleware global
$app->addBodyParsingMiddleware();
$app->addErrorMiddleware(
    ($_ENV['APP_ENV'] ?? 'production') === 'development',
    true,
    true
);

// Registrar rutas
(require __DIR__ . '/../routes/auth.php')($app);
(require __DIR__ . '/../routes/api.php')($app);
(require __DIR__ . '/../routes/kanban.php')($app);

$app->run();
