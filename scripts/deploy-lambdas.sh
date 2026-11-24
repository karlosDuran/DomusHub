#!/usr/bin/env bash
# ==============================================================================
# deploy-lambdas.sh — Empaqueta y sube el código de las 5 funciones Lambda
# ==============================================================================

# Detiene el script inmediatamente si algún comando falla (-e), si se usa una
# variable no definida (-u) o si falla algún comando dentro de un pipe (-o pipefail).
set -euo pipefail

# Configuración por defecto de AWS CLI (se pueden sobrescribir al ejecutar el script)
export AWS_PROFILE="${AWS_PROFILE:-homeops}"   # Perfil IAM CLI (homeops-deployer)
export AWS_REGION="${AWS_REGION:-us-east-1}"   # Región única del proyecto
export AWS_PAGER=""                            # Desactiva el paginador (less) en salidas de AWS CLI

# Calcula la ruta absoluta a la raíz del repositorio y define la carpeta de salida para los .zip
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/backend/dist"
mkdir -p "$DIST_DIR"

# Lista de las 5 funciones Lambda que existen en backend/lambdas/<nombre>
LAMBDAS=("auth" "inventario" "kanban" "stock-alerts" "tareas-cron")

for name in "${LAMBDAS[@]}"; do
  echo "==> Empaquetando homeops-$name..."

  # Prepara una carpeta temporal limpia para esta función y elimina el .zip anterior
  STAGE_DIR="$DIST_DIR/$name"
  rm -rf "$STAGE_DIR" "$DIST_DIR/homeops-$name.zip"
  mkdir -p "$STAGE_DIR/shared"

  # Copia únicamente lo necesario para que la Lambda funcione:
  # 1. index.mjs: punto de entrada de esta Lambda específica
  # 2. shared/: utilidades compartidas (DynamoDB, JWT, CORS, SNS)
  # 3. package.json: declara "type": "module" para habilitar ES Modules (.mjs)
  # Nota: No se incluye node_modules porque AWS Lambda Node.js 22 ya trae el AWS SDK v3.
  cp "$ROOT_DIR/backend/lambdas/$name/index.mjs" "$STAGE_DIR/index.mjs"
  cp -r "$ROOT_DIR/backend/shared/." "$STAGE_DIR/shared/"
  cp "$ROOT_DIR/backend/package.json" "$STAGE_DIR/package.json"

  # Comprime el contenido de la carpeta temporal en un .zip silencioso (-q) y recursivo (-r)
  (cd "$STAGE_DIR" && zip -qr "$DIST_DIR/homeops-$name.zip" .)

  # Sube el .zip a AWS Lambda reemplazando solo el código (mantiene variables, rol y triggers)
  echo "==> Subiendo código a AWS Lambda: homeops-$name..."
  aws lambda update-function-code \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --function-name "homeops-$name" \
    --zip-file "fileb://$DIST_DIR/homeops-$name.zip" > /dev/null

  echo "    OK: homeops-$name actualizada."
done

echo "✅ Todas las Lambdas se desplegaron correctamente."
