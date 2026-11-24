# Guía Práctica Paso a Paso en AWS Console: Despliegue Completo de HomeOps desde Cero

> **Propósito de esta guía:** Replicar **todo el despliegue Serverless de HomeOps** paso a paso usando la **Consola Web de AWS** (clic por clic, con todos los nombres exactos, casillas y JSON listos para copiar y pegar).
>
> **¿Qué se hace en Terminal?** Únicamente:
> 1. Configurar AWS CLI (solo si vas a subir los `.zip` por terminal).
> 2. Ejecutar el seed inicial de DynamoDB (`npm run seed`).
> 3. Generar el `JWT_SECRET` y **empaquetar / subir los `.zip` de las 5 funciones Lambda** (más el build local `npm run build` del frontend antes de subirlo a S3 desde la consola).

---

## Antes de Empezar (Reglas de Oro)

1. **Región única obligatoria:** En la esquina superior derecha de la Consola Web de AWS, selecciona siempre **`US East (N. Virginia) us-east-1`**. *(En IAM, CloudFront y Budgets aparecerá como **Global**; es normal).*
2. **Anota tu `<ACCOUNT_ID>`:** Haz clic en el nombre de tu usuario en la esquina superior derecha de la Consola AWS y copia el **Account ID** de 12 dígitos (sin guiones). Cada vez que veas `<ACCOUNT_ID>` en un JSON de esta guía, reemplázalo por ese número.
3. **Ten a la mano una hoja de notas** para ir apuntando 5 valores que obtendrás conforme avanzas:
   - `ACCOUNT_ID`: `________________`
   - `JWT_SECRET`: `________________`
   - `API_ID` (de API Gateway): `________________`
   - `BUCKET_NAME` (de S3): `________________`
   - `CLOUDFRONT_URL` y `DISTRIBUTION_ID`: `________________`

---

## Paso 1 — Proteger la Cuenta con Alerta de Presupuesto (AWS Budgets)

1. En el buscador superior de AWS Console escribe **`Billing and Cost Management`** y ábrelo.
2. En el menú izquierdo entra a **Budgets** → botón naranja **Create budget**.
3. En **Budget setup**, elige **Use a template (simplified)**.
4. En **Templates - new**, selecciona **Zero spend budget**.
5. Completa:
   - **Budget name:** `HomeOps-ZeroSpend-Alert`
   - **Email recipients:** tu correo electrónico (ej. `tu-correo@gmail.com`).
6. Clic en **Create budget**.
7. En el menú izquierdo entra a **Billing Preferences** → sección **Alert preferences** → **Edit** → marca **Receive AWS Free Tier alerts**, pon tu correo y pulsa **Update**.

---

## Paso 2 — Crear Usuario IAM para Subir los `.zip` y Roles de Privilegio Mínimo (IAM)

Busca **`IAM`** en la barra superior de AWS Console.

### 2.1 Usuario CLI `homeops-deployer` (solo para subir los `.zip` de Lambda y correr el seed)
1. Menú izquierdo → **Users** → **Create user**.
2. **User name:** `homeops-deployer` *(deja desmarcada la casilla de acceso a la consola web)* → **Next**.
3. En **Permissions options**, elige **Attach policies directly**, busca y marca **`PowerUserAccess`** → **Next** → **Create user**.
4. Entra al usuario **`homeops-deployer`** → pestaña **Permissions** → **Add permissions** → **Create inline policy** → pestaña **JSON** y pega:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowPassHomeOpsRoles",
         "Effect": "Allow",
         "Action": [
           "iam:PassRole"
         ],
         "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/homeops-*"
       }
     ]
   }
   ```
   Clic en **Next** → **Policy name:** `homeops-deployer-passrole` → **Create policy**.
5. Pestaña **Security credentials** → **Access keys** → **Create access key** → elige **Command Line Interface (CLI)** → marca la casilla de confirmación → **Next** → **Create access key**.
6. Copia el **Access key** y **Secret access key** (o descarga el `.csv`) y configúralo en tu **Terminal**:
   ```bash
   aws configure --profile homeops
   # AWS Access Key ID: <pega tu Access Key>
   # AWS Secret Access Key: <pega tu Secret Key>
   # Default region name: us-east-1
   # Default output format: json

   # Verifica conexión:
   aws sts get-caller-identity --profile homeops
   ```

### 2.2 Rol A — `homeops-lambda-api-role` (para `auth`, `inventario`, `kanban` y `tareas-cron`)
1. Menú izquierdo → **Roles** → **Create role**.
2. **Trusted entity type:** `AWS service` → **Use case:** `Lambda` → **Next**.
3. En **Permissions policies**, busca y marca **`AWSLambdaBasicExecutionRole`** → **Next**.
4. **Role name:** `homeops-lambda-api-role` → **Create role**.
5. Abre el rol **`homeops-lambda-api-role`** → pestaña **Permissions** → **Add permissions** → **Create inline policy** → pestaña **JSON** y pega *(reemplaza `<ACCOUNT_ID>`)*:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "HomeOpsDynamoDBAccess",
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem",
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:DeleteItem",
           "dynamodb:Query",
           "dynamodb:Scan",
           "dynamodb:BatchGetItem",
           "dynamodb:BatchWriteItem",
           "dynamodb:TransactWriteItems"
         ],
         "Resource": [
           "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/homeops-*",
           "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/homeops-*/index/*"
         ]
       },
       {
         "Sid": "HomeOpsSNSTopicAccess",
         "Effect": "Allow",
         "Action": [
           "sns:Publish",
           "sns:Subscribe",
           "sns:ListSubscriptionsByTopic"
         ],
         "Resource": [
           "arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-avisos-tareas",
           "arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-alertas-despensa"
         ]
       },
       {
         "Sid": "HomeOpsSNSSubscriptionManage",
         "Effect": "Allow",
         "Action": [
           "sns:Unsubscribe",
           "sns:SetSubscriptionAttributes",
           "sns:GetSubscriptionAttributes"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
6. **Next** → **Policy name:** `homeops-dynamodb-sns-policy` → **Create policy**.

### 2.3 Rol B — `homeops-lambda-stream-role` (exclusivo para `homeops-stock-alerts`)
1. **IAM → Roles → Create role** → `AWS service` → `Lambda` → **Next**.
2. Marca **`AWSLambdaBasicExecutionRole`** → **Next**.
3. **Role name:** `homeops-lambda-stream-role` → **Create role**.
4. Abre **`homeops-lambda-stream-role`** → **Add permissions** → **Create inline policy** → **JSON** *(reemplaza `<ACCOUNT_ID>`)*:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "HomeOpsReadProductosStream",
         "Effect": "Allow",
         "Action": [
           "dynamodb:DescribeStream",
           "dynamodb:GetRecords",
           "dynamodb:GetShardIterator",
           "dynamodb:ListStreams"
         ],
         "Resource": "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/homeops-productos/stream/*"
       },
       {
         "Sid": "HomeOpsPublishDespensaAlert",
         "Effect": "Allow",
         "Action": [
           "sns:Publish"
         ],
         "Resource": "arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-alertas-despensa"
       }
     ]
   }
   ```
5. **Next** → **Policy name:** `homeops-stream-sns-policy` → **Create policy**.

---

## Paso 3 — Crear las 5 Tablas NoSQL y Streams (Amazon DynamoDB)

Verifica que estés en región **`us-east-1`**. Busca **`DynamoDB`** → menú izquierdo **Tables** → **Create table**.

> **Regla Free Tier:** En **Table settings** selecciona siempre **Customize settings** → **Capacity mode: Provisioned** → **DESACTIVA Auto scaling** tanto en *Read capacity* como en *Write capacity*. Así el total de las 5 tablas + 1 GSI suma **19 RCU / 19 WCU** (siempre por debajo de los 25/25 gratuitos).

### Tabla 1: `homeops-usuarios` (con GSI `nombre-index`)
1. **Table name:** `homeops-usuarios`
2. **Partition key:** `id` (`String`), **Sort key:** *(vacío)*.
3. **Table settings:** `Customize settings` → **Capacity mode:** `Provisioned` → Auto scaling **OFF** → **Read:** `2`, **Write:** `2`.
4. Baja a **Secondary indexes** → **Create global index**:
   - **Partition key:** `nombre` (`String`), **Sort key:** *(vacío)*.
   - **Index name:** `nombre-index`.
   - **Attribute projections:** `All`.
   - En capacidad del índice: desactiva Auto scaling → **Read:** `2`, **Write:** `2` → **Create index**.
5. Clic en **Create table**.

### Tabla 2: `homeops-productos` (+ Activar DynamoDB Streams)
1. **Create table** → **Table name:** `homeops-productos`
2. **Partition key:** `id` (`String`).
3. **Customize settings** → `Provisioned` → Auto scaling **OFF** → **Read:** `5`, **Write:** `5` → **Create table**.
4. Espera ~10 segundos a que su estado sea **`Active`**, haz clic en **`homeops-productos`**.
5. Pestaña **Exports and streams** → baja a **DynamoDB stream details** → clic en **Turn on**.
6. Selecciona **`New and old images`** → **Turn on stream**.

### Tabla 3: `homeops-kanban-columnas`
1. **Create table** → **Table name:** `homeops-kanban-columnas`, **Partition key:** `id` (`String`).
2. **Customize settings** → `Provisioned` → Auto scaling **OFF** → **Read:** `2`, **Write:** `2` → **Create table**.

### Tabla 4: `homeops-tareas`
1. **Create table** → **Table name:** `homeops-tareas`, **Partition key:** `id` (`String`).
2. **Customize settings** → `Provisioned` → Auto scaling **OFF** → **Read:** `5`, **Write:** `5` → **Create table**.

### Tabla 5: `homeops-tareas-historial` (con Sort Key)
1. **Create table** → **Table name:** `homeops-tareas-historial`.
2. **Partition key:** `tarea_id` (`String`), **Sort key:** `fecha_registro` (`String`).
3. **Customize settings** → `Provisioned` → Auto scaling **OFF** → **Read:** `3`, **Write:** `3` → **Create table**.

### Cargar datos iniciales (Seed en Terminal)
Cuando las 5 tablas estén en **`Active`**, ejecuta en tu terminal:
```bash
cd /home/fer/DomusHub/backend
npm install
AWS_PROFILE=homeops AWS_REGION=us-east-1 SEED_ADMIN_EMAIL="tu-correo@gmail.com" npm run seed
```
*(Verifica en **DynamoDB → Explore items** que aparezcan los 4 usuarios, 8 productos, 3 columnas y 6 tareas).*

---

## Paso 4 — Crear los 2 Tópicos y Suscripciones (Amazon SNS)

En región **`us-east-1`**, busca **`Simple Notification Service`** → menú izquierdo **Topics** → **Create topic**.

### 4.1 Tópico 1: `homeops-alertas-despensa`
1. **Type:** **`Standard`** *(nunca FIFO, porque FIFO no soporta email)*.
2. **Name:** `homeops-alertas-despensa`
3. **Display name:** `HomeOps Despensa`
4. Clic en **Create topic**.
5. Dentro del tópico → **Create subscription**:
   - **Protocol:** `Email`
   - **Endpoint:** tu correo electrónico (ej. `tu-correo@gmail.com`)
   - Clic en **Create subscription**.

### 4.2 Tópico 2: `homeops-avisos-tareas` (con Filter Policy)
1. **Topics → Create topic** → **Type:** `Standard`.
2. **Name:** `homeops-avisos-tareas`
3. **Display name:** `HomeOps Tareas` → **Create topic**.
4. Dentro del tópico → **Create subscription**:
   - **Protocol:** `Email`
   - **Endpoint:** tu correo electrónico.
   - Expande **Subscription filter policy - optional** y actívalo (**ON**).
   - **Filter policy scope:** **`Message attributes`**.
   - Pega en **JSON editor**:
     ```json
     {
       "destinatario": ["usr_admin", "familia"]
     }
     ```
   - Clic en **Create subscription**.

### 4.3 Confirmar ambos correos (Obligatorio)
1. Abre tu bandeja de entrada (revisa también **Spam**).
2. Abre los **2 correos** de **`AWS Notification - Subscription Confirmation`** y haz clic en **`Confirm subscription`** en ambos.
3. Vuelve a **SNS → Subscriptions** y verifica que los dos aparezcan en verde como **`Confirmed`**.
4. *(Opcional)* Entra a `homeops-alertas-despensa` → **Publish message** para mandar un mensaje de prueba.

---

## Paso 5 — Crear las 5 Funciones Lambda y Trigger en Consola + Subir los `.zip` en Terminal

### 5.1 Generar tu secreto JWT (en Terminal)
Ejecuta una sola vez y guarda el texto hexadecimal de 64 caracteres que imprime:
```bash
openssl rand -hex 32
```

### 5.2 Crear las 5 funciones en AWS Console (`us-east-1`)
Busca **`Lambda`** → **Functions** → **Create function** y repite estos ajustes base para las 5 funciones:
- **Opción:** `Author from scratch`
- **Runtime:** **`Node.js 22.x`**
- **Architecture:** **`arm64`**
- **Permissions → Change default execution role → Use an existing role:**
  - Para **`homeops-stock-alerts`**: elige **`homeops-lambda-stream-role`**.
  - Para **`homeops-auth`**, **`homeops-inventario`**, **`homeops-kanban`** y **`homeops-tareas-cron`**: elige **`homeops-lambda-api-role`**.
- Clic en **Create function**.

### 5.3 Configurar Memoria, Timeout y Variables de Entorno en cada una (en Consola)
En **cada una** de las 5 funciones:
1. Ve a **Configuration → General configuration → Edit**:
   - **Memory:** `256` MB
   - **Timeout:** `0` min `10` sec → **Save**.
2. Ve a **Configuration → Environment variables → Edit → Add environment variable** y agrega exactamente estas variables *(reemplaza `<ACCOUNT_ID>` y `<TU_JWT_SECRET>`)*:

| Función Lambda | Variables de Entorno (`Key` = `Value`) |
| :--- | :--- |
| **`homeops-auth`** | `TABLE_USUARIOS` = `homeops-usuarios`<br>`SNS_TAREAS_TOPIC_ARN` = `arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-avisos-tareas`<br>`SNS_DESPENSA_TOPIC_ARN` = `arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-alertas-despensa`<br>`JWT_SECRET` = `<TU_JWT_SECRET>`<br>`JWT_EXPIRATION` = `86400`<br>`CORS_ORIGIN` = `*` *(se cambiará a CloudFront en el Paso 7.6)* |
| **`homeops-inventario`** | `TABLE_PRODUCTOS` = `homeops-productos`<br>`JWT_SECRET` = `<TU_JWT_SECRET>`<br>`CORS_ORIGIN` = `*` |
| **`homeops-kanban`** | `TABLE_COLUMNAS` = `homeops-kanban-columnas`<br>`TABLE_TAREAS` = `homeops-tareas`<br>`TABLE_HISTORIAL` = `homeops-tareas-historial`<br>`TABLE_USUARIOS` = `homeops-usuarios`<br>`SNS_TAREAS_TOPIC_ARN` = `arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-avisos-tareas`<br>`JWT_SECRET` = `<TU_JWT_SECRET>`<br>`TZ` = `America/Mexico_City`<br>`CORS_ORIGIN` = `*` |
| **`homeops-stock-alerts`** | `SNS_DESPENSA_TOPIC_ARN` = `arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-alertas-despensa` |
| **`homeops-tareas-cron`** | `TABLE_COLUMNAS` = `homeops-kanban-columnas`<br>`TABLE_TAREAS` = `homeops-tareas`<br>`TABLE_HISTORIAL` = `homeops-tareas-historial`<br>`SNS_TAREAS_TOPIC_ARN` = `arn:aws:sns:us-east-1:<ACCOUNT_ID>:homeops-avisos-tareas`<br>`TZ` = `America/Mexico_City` |

### 5.4 Conectar el Trigger de DynamoDB Streams a `homeops-stock-alerts` (en Consola)
1. Abre la función **`homeops-stock-alerts`**.
2. En el diagrama superior **Function overview**, pulsa **+ Add trigger**.
3. **Select a source:** `DynamoDB`.
4. **DynamoDB table:** `homeops-productos`.
5. **Batch size:** `10`, **Starting position:** `Latest`, marca **Activate trigger**.
6. Expande **Additional settings** → **Filter criteria** → **Add** y pega:
   ```json
   {
     "eventName": ["INSERT", "MODIFY"]
   }
   ```
7. Clic en **Add**. Espera ~20 segundos y verifica en **Configuration → Triggers** que el estado diga **`Enabled`**.

### 5.5 Empaquetar y Subir los `.zip` de las 5 Lambdas (en Terminal)
Ejecuta el script del repositorio que arma los 5 `.zip` (`index.mjs` + `shared/` + `package.json`) y los sube automáticamente a AWS Lambda:
```bash
chmod +x /home/fer/DomusHub/scripts/deploy-lambdas.sh
/home/fer/DomusHub/scripts/deploy-lambdas.sh
```

*(Si prefieres hacerlo comando por comando para una sola Lambda, por ejemplo `auth`, el equivalente exacto es:)*
```bash
mkdir -p /tmp/pkg-auth/shared
cp /home/fer/DomusHub/backend/lambdas/auth/index.mjs /tmp/pkg-auth/index.mjs
cp -r /home/fer/DomusHub/backend/shared/. /tmp/pkg-auth/shared/
cp /home/fer/DomusHub/backend/package.json /tmp/pkg-auth/package.json
(cd /tmp/pkg-auth && zip -qr /tmp/homeops-auth.zip .)
aws lambda update-function-code --profile homeops --region us-east-1 \
  --function-name homeops-auth --zip-file fileb:///tmp/homeops-auth.zip
```

> **Prueba rápida en Consola:** Entra a `homeops-auth` → pestaña **Test** → crea un evento de prueba con `{"httpMethod": "GET", "path": "/api/auth/perfiles", "headers": {}, "body": null}` → pulsa **Test** y verifica `statusCode: 200` con la lista de perfiles.

---

## Paso 6 — Exponer la API con Amazon API Gateway (Consola)

En región **`us-east-1`**, busca **`API Gateway`** → **Create API**.

### 6.1 Crear la REST API
1. En la tarjeta **REST API** *(no la Private ni HTTP API)*, pulsa **Build**.
2. **New API**, **API name:** `homeops-api`, **API endpoint type:** `Regional` → **Create API**.

### 6.2 Crear el árbol de recursos y métodos Lambda Proxy
En **Resources**, selecciona la ruta padre indicada antes de pulsar **Create resource** (para `{proxy+}`, activa la casilla **Proxy resource** o escribe `{proxy+}` manualmente).
Al pulsar **Create method**, activa **SIEMPRE** **`Lambda proxy integration = ON`** y elige la función indicada:

| Paso | Ruta padre donde das clic | Create resource (`Resource name`) | Create method (`Method type`) | Lambda function (`AWS_PROXY` ON) |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `/` | `api` | *(ninguno)* | — |
| 2 | `/api` | `auth` | *(ninguno)* | — |
| 3 | `/api/auth` | `{proxy+}` | **`ANY`** | `homeops-auth` |
| 4 | `/api` | `protected` | *(ninguno)* | — |
| 5 | `/api/protected` | `health` | **`GET`** y **`OPTIONS`** | `homeops-auth` |
| 6 | `/api/protected` | `usuarios` | **`ANY`** | `homeops-auth` |
| 7 | `/api/protected/usuarios` | `{proxy+}` | **`ANY`** | `homeops-auth` |
| 8 | `/api/protected` | `inventario` | **`ANY`** | `homeops-inventario` |
| 9 | `/api/protected/inventario` | `{proxy+}` | **`ANY`** | `homeops-inventario` |
| 10 | `/api/protected` | `compras` | *(ninguno)* | — |
| 11 | `/api/protected/compras` | `{proxy+}` | **`ANY`** | `homeops-inventario` |
| 12 | `/api/protected` | `kanban` | *(ninguno)* | — |
| 13 | `/api/protected/kanban` | `{proxy+}` | **`ANY`** | `homeops-kanban` |

> **Nota sobre CORS:** Como todos los endpoints usan `ANY` + **Lambda Proxy**, nuestras Lambdas ya responden `OPTIONS` con `204` y sus headers CORS. Además, agrega CORS a las respuestas de error del Gateway:
> 1. Menú izquierdo → **Gateway responses** → abre **`Default 4XX`** → **Edit** → agrega 3 Response headers:
>    - `Access-Control-Allow-Origin` = `'*'`
>    - `Access-Control-Allow-Headers` = `'Content-Type,Authorization'`
>    - `Access-Control-Allow-Methods` = `'GET,POST,PUT,PATCH,DELETE,OPTIONS'`
> 2. Repite lo mismo en **`Default 5XX`** → **Save**.

### 6.3 Desplegar al Stage `prod`
1. Vuelve a **Resources** → botón naranja **Deploy API** (arriba a la derecha).
2. **Stage:** `*New stage*` → **Stage name:** `prod` → **Deploy**.
3. Copia la **Invoke URL** que aparece arriba, por ejemplo:
   `https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod`
4. Anota tu `<API_ID>` y prueba abrir en tu navegador:
   `https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod/api/auth/perfiles` (debe devolver el JSON de perfiles).

---

## Paso 7 — Alojar Frontend en S3 Privado + CloudFront (OAC + Dual Origin + SPA)

### 7.1 Compilar el Frontend localmente (Terminal — 1 comando)
```bash
cd /home/fer/DomusHub/frontend
npm install && npm run build
```
Esto genera la carpeta `/home/fer/DomusHub/frontend/dist/` lista para subir.

### 7.2 Crear el Bucket S3 Privado y Subir `frontend/dist/` (Consola S3)
1. Busca **`S3`** → **Buckets** → **Create bucket**.
2. **AWS Region:** `US East (N. Virginia) us-east-1`.
3. **Bucket name:** nombre único global en minúsculas, ej. `homeops-frontend-<ACCOUNT_ID>`.
4. **Object Ownership:** `ACLs disabled (recommended)`.
5. **Block Public Access settings:** deja **ACTIVADO** **`Block all public access`** (los 4 checks marcados).
6. Clic en **Create bucket** *(NO actives Static website hosting)*.
7. Abre tu bucket → pestaña **Objects** → **Upload**:
   - **Subida 1 (assets):** pulsa **Add folder** y sube `frontend/dist/assets/` + **Add files** `frontend/dist/favicon.svg`. Antes de subir, expande **Properties → Metadata → Add metadata**:
     - Type: `System defined` · Key: `Cache-Control` · Value: `public, max-age=31536000, immutable` → **Upload**.
   - **Subida 2 (`index.html`):** vuelve a **Objects → Upload → Add files** → selecciona `frontend/dist/index.html`. Expande **Properties → Metadata → Add metadata**:
     - Type: `System defined` · Key: `Cache-Control` · Value: `no-cache, no-store, must-revalidate` → **Upload**.

### 7.3 Crear y Publicar la CloudFront Function `homeops-spa-rewrite` (Consola CloudFront)
1. Busca **`CloudFront`** (Global) → menú izquierdo **Functions** → **Create function**.
2. **Name:** `homeops-spa-rewrite`, **Runtime:** `cloudfront-js-2.0` → **Create function**.
3. En la pestaña **Build → Function code**, reemplaza el código por:
   ```javascript
   function handler(event) {
     var request = event.request;
     var uri = request.uri;

     // Dejar pasar archivos estáticos (.js, .css, .svg, .ico, .png)
     if (uri.indexOf('.') !== -1) {
       return request;
     }

     // Reescribir rutas SPA (/login, /inventario, /productos, /kanban, /lista-compra, /perfiles)
     request.uri = '/index.html';
     return request;
   }
   ```
4. Pulsa **Save changes** → pestaña **Publish** → **Publish function**.

### 7.4 Crear la Distribución CloudFront con Origin 1 (S3 + OAC)
1. Menú izquierdo → **Distributions** → **Create distribution**.
2. **Origin:**
   - **Origin domain:** selecciona tu bucket `<BUCKET_NAME>.s3.us-east-1.amazonaws.com`.
   - **Origin access:** marca **`Origin access control settings (recommended)`** → clic en **Create new OAC** → **Name:** `homeops-s3-oac`, **Signing behavior:** `Sign requests (recommended)`, **Origin type:** `S3` → **Create**.
3. **Default cache behavior:**
   - **Viewer protocol policy:** `Redirect HTTP to HTTPS`.
   - **Allowed HTTP methods:** `GET, HEAD`.
   - **Cache policy:** `CachingOptimized`.
   - **Function associations → Viewer request:** `CloudFront Functions` → selecciona **`homeops-spa-rewrite`**.
4. **Web Application Firewall (WAF):** marca **`Do not enable security protections`** *(evita cargos mensuales de WAF)*.
5. **Settings:**
   - **Price class:** `Use only North America and Europe`.
   - **Default root object:** **`index.html`**.
6. Clic en **Create distribution**.
7. **CRÍTICO — Aplicar la Bucket Policy en S3:**
   - En el aviso amarillo superior pulsa **Copy policy**.
   - Abre **S3 → tu bucket → pestaña Permissions → Bucket policy → Edit** → pega el JSON copiado y pulsa **Save changes**.

### 7.5 Agregar Origin 2 (API Gateway) y Behavior `/api/*` en CloudFront
1. Regresa a **CloudFront → Distributions → tu distribución**.
2. Pestaña **Origins** → **Create origin**:
   - **Origin domain:** `<API_ID>.execute-api.us-east-1.amazonaws.com` *(escríbelo SIN `https://` y SIN `/prod`)*.
   - **Protocol:** `HTTPS only`.
   - **Origin path:** **`/prod`**.
   - **Name:** `homeops-apigateway-origin` → **Create origin**.
3. Pestaña **Behaviors** → **Create behavior**:
   - **Path pattern:** **`/api/*`**.
   - **Origin and origin groups:** `homeops-apigateway-origin`.
   - **Viewer protocol policy:** `Redirect HTTP to HTTPS`.
   - **Allowed HTTP methods:** **`GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`**.
   - **Cache policy:** **`CachingDisabled`**.
   - **Origin request policy:** **`AllViewerExceptHostHeader`** *(indispensable para reenviar el JWT `Authorization`)*.
   - **Function associations:** deja todas en **`No association`** *(NO adjuntar `homeops-spa-rewrite`)*.
   - Clic en **Create behavior**.
4. Espera ~3 minutos a que **Last modified** cambie de `Deploying` a una fecha y el estado diga **`Enabled`**.
5. Copia tu **Distribution domain name** (ej. `https://d1234abcd.cloudfront.net`).

### 7.6 Restringir `CORS_ORIGIN` en las 3 Lambdas API (Consola Lambda)
Ve a **Lambda → Functions** y en **`homeops-auth`**, **`homeops-inventario`** y **`homeops-kanban`**:
- **Configuration → Environment variables → Edit** → cambia `CORS_ORIGIN` de `*` a **`https://<tu-dominio>.cloudfront.net`** (sin barra `/` al final) → **Save**.

---

## Paso 8 — Programar Tareas Automáticas (Amazon EventBridge Scheduler en Consola)

En región **`us-east-1`**, busca **`Amazon EventBridge`** → menú izquierdo **Scheduler → Schedules** → **Create schedule**.

### Schedule 1: `homeops-reinicio-semanal`
1. **Schedule name:** `homeops-reinicio-semanal`
2. **Occurrence:** `Recurring schedule` → **Schedule type:** `Cron-based schedule`.
3. **Cron expression:** `1` (Min) · `0` (Hour) · `?` (Day of month) · `*` (Month) · `MON` (Day of week) · `*` (Year) → *(equivale a lunes 00:01 AM)*.
4. **Time zone:** `(UTC-06:00) America/Mexico_City`.
5. **Flexible time window:** **`Off`** → **Next**.
6. **Target detail:** elige **`AWS Lambda`** (`Invoke`) → **Lambda function:** `homeops-tareas-cron`.
7. **Payload:**
   ```json
   { "action": "reiniciar_recurrentes" }
   ```
   Clic en **Next**.
8. En **Permissions**, elige **Create new role for this schedule** (nombre sugerido: `homeops-eventbridge-scheduler-role`) → **Next** → **Create schedule**.

### Schedule 2: `homeops-recordatorio-diario`
1. **Schedules → Create schedule** → **Name:** `homeops-recordatorio-diario`.
2. **Recurring schedule → Cron-based schedule:** `0` · `8` · `*` · `*` · `?` · `*` *(diario 08:00 AM)*.
3. **Time zone:** `America/Mexico_City` · **Flexible time window:** `Off` → **Next**.
4. **Target:** `AWS Lambda → Invoke` → **`homeops-tareas-cron`**.
5. **Payload:**
   ```json
   { "action": "recordatorio_diario" }
   ```
   **Next** → en **Permissions** selecciona **Use existing role** → `homeops-eventbridge-scheduler-role` → **Next** → **Create schedule**.

---

## Paso 9 — Verificación Final End-to-End (Navegador + Consola CloudWatch)

Abre **`https://<tu-dominio>.cloudfront.net`** y valida:

- [ ] **Seguridad OAC:** abrir directo `https://<BUCKET_NAME>.s3.us-east-1.amazonaws.com/index.html` devuelve **`403 AccessDenied`**.
- [ ] **SPA sin 404:** entra a `/inventario`, `/kanban` y `/perfiles` y presiona **F5** → carga normal (`200`), nunca 404.
- [ ] **Acceso PIN y Perfiles SNS:** entra con **`Fernando`** (PIN `1234` o contraseña `admin123`), abre **`/perfiles`** y comprueba que tu correo muestre la insignia verde **`Avisos SNS activos`**. Prueba agregar/editar el correo de otro perfil y verifica que le llegue el correo de confirmación de AWS SNS.
- [ ] **Alerta automática de Despensa (Streams → Lambda → SNS):** en `/inventario`, deja un producto en `2` (con mínimo `1`) y pulsa **`-1`** → pasa a `25%` rojo y en ~10 segundos llega el correo `"Atención: Queda solo 1 ..."` a tu bandeja. Edita solo el precio y confirma que **NO** llega correo repetido.
- [ ] **Kanban → SNS filtrado:** crea una tarea marcada como **Urgente** o **Turno de basura** asignada a ti → llega el correo solo a tu cuenta y aparece el historial limpio al moverla entre columnas.
- [ ] **Logs en CloudWatch:** abre **CloudWatch → Logs → Log groups → `/aws/lambda/homeops-stock-alerts`** y verifica el mensaje `INFO Alerta SNS enviada para ...` sin errores.

---

## Cómo Actualizar Código Después (Día a Día)

- **Cambios en Backend (Terminal):**
  ```bash
  /home/fer/DomusHub/scripts/deploy-lambdas.sh
  ```
- **Cambios en Frontend (Consola S3 + CloudFront, o Terminal):**
  - *En Consola:* corre `npm run build` en `frontend/`, vuelve a subir `dist/` a tu bucket S3 (con los mismos headers `Cache-Control` del Paso 7.2) y en **CloudFront → tu distribución → pestaña Invalidations → Create invalidation** escribe `/*` → **Create invalidation**.
  - *O en 1 comando de Terminal:*
    ```bash
    BUCKET_NAME=<TU_BUCKET> DISTRIBUTION_ID=<TU_DIST_ID> /home/fer/DomusHub/scripts/deploy-frontend.sh
    ```
