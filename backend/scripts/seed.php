<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();

// Crear tablas desde schema
$sql = file_get_contents(__DIR__ . '/../database.sql');
$pdo->exec($sql);

// Crear usuario admin por defecto
$nombre = 'admin';
$password = password_hash('admin123', PASSWORD_DEFAULT);
$rol = 'admin';

$stmt = $pdo->prepare('INSERT OR IGNORE INTO usuarios (nombre, password_hash, rol) VALUES (:nombre, :password_hash, :rol)');
$stmt->execute([
    ':nombre' => $nombre,
    ':password_hash' => $password,
    ':rol' => $rol,
]);

echo "✅ Base de datos inicializada y usuario admin creado.\n";
echo "   Usuario: admin\n";
echo "   Contraseña: admin123\n";
echo "   ⚠️  Cambia la contraseña en producción.\n";
