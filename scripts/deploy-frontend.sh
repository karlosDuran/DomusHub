#!/usr/bin/env bash
# ==============================================================================
# deploy-frontend.sh — Compila el frontend, lo sube a S3 e invalida CloudFront
# ==============================================================================

# Detiene el script inmediatamente si algún comando falla (-e), si hay una
# variable sin definir (-u) o si falla un comando dentro de un pipe (-o pipefail).
set -euo pipefail

# Configuración por defecto (puedes sobrescribirlos pasando BUCKET_NAME=... DISTRIBUTION_ID=...)
export AWS_PROFILE="${AWS_PROFILE:-homeops}"                         # Perfil IAM CLI (homeops-deployer)
export AWS_PAGER=""                                                  # Desactiva el paginador en AWS CLI
BUCKET_NAME="${BUCKET_NAME:-homeops-frontend-338952532655}"          # Nombre del bucket S3 privado del frontend
DISTRIBUTION_ID="${DISTRIBUTION_ID:-EVQ7QPGQ82AIO}"                  # ID de la distribución de CloudFront

# Calcula la ruta absoluta a la raíz del repositorio
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 1. Valida errores de código (ESLint) y genera la carpeta dist/ optimizada para producción
echo "==> Validando lint y compilando frontend React + Vite..."
cd "$ROOT_DIR/frontend"
npm run lint
npm run build

# 2. Sincroniza los assets estáticos (JS, CSS, imágenes) al bucket S3:
#    --delete: elimina en S3 archivos viejos que ya no existen en dist/
#    --exclude "index.html": excluye index.html para subirlo aparte sin caché
#    --cache-control ... 1 año (31536000s) + immutable: Vite genera hashes únicos en cada build,
#      así el navegador puede cachearlos indefinidamente sin riesgo de usar versiones viejas.
echo "==> Sincronizando assets estáticos con Amazon S3 ($BUCKET_NAME)..."
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
  --profile "$AWS_PROFILE" \
  --delete \
  --exclude "index.html" \
  --cache-control "public, max-age=31536000, immutable"

# 3. Sube index.html con caché desactivada (no-cache, no-store, must-revalidate) para que
#    los navegadores siempre descarguen el HTML más reciente y apunten a los nuevos JS/CSS.
echo "==> Subiendo index.html sin caché..."
aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" \
  --profile "$AWS_PROFILE" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8"

# 4. Crea una invalidación en CloudFront para purgar copias viejas en los servidores Edge
#    y que los usuarios vean los cambios inmediatamente.
echo "==> Invalidando caché en Amazon CloudFront ($DISTRIBUTION_ID)..."
aws cloudfront create-invalidation \
  --profile "$AWS_PROFILE" \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/index.html" "/*"

echo "✅ Frontend desplegado e invalidado correctamente en CloudFront."
