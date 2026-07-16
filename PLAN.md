Aquí tienes el contenido completo para tu archivo PLAN.md. Puedes copiarlo y pegarlo directamente en tu repositorio para tener tu hoja de ruta completamente estructurada y documentada.

Markdown

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   # Plan de Desarrollo: DomusHub (ERP Doméstico Seguro)  Este documento detalla el cronograma de desarrollo por fases para la construcción del gestor de inventario, compras y tablero Kanban familiar. El proyecto está estructurado como un monorepositorio utilizando **Slim PHP** (Backend) y **React + Vite** (Frontend).  ---  ## ├── Estructura del Proyecto  ```text  domushub/  ├── backend/          # Slim PHP API & SQLite Database  ├── frontend/         # React + Vite + Tailwind CSS  └── PLAN.md           # Este archivo   `

FASE 1: Arquitectura Base, Base de Datos y Seguridad (Backend)
--------------------------------------------------------------

### Tarea 1.1: Inicialización del Monorepositorio y Entornos

*   **Descripción:** Configurar la estructura de carpetas global, inicializar Git y preparar los entornos aislados de desarrollo para backend y frontend.
    
*   **Entregable:** Repositorio en GitHub con estructura /backend y /frontend, archivos .gitignore configurados y commits iniciales.
    
*   **Paso a paso:**
    
    1.  Crear la carpeta raíz domushub e inicializar Git: git init.
        
    2.  Crear el archivo .gitignore en la raíz para ignorar node\_modules/, vendor/, carpetas .env y el archivo de base de datos .db.
        
    3.  Dentro de /backend, ejecutar composer init para preparar el gestor de dependencias de PHP.
        
    4.  Dentro de /frontend, ejecutar npm create vite@latest . -- --template react para inicializar React con Vite.
        

### Tarea 1.2: Diseño del Esquema de Base de Datos Relacional (SQLite)

*   **Descripción:** Diseñar y crear el archivo de base de datos local incorporando integridad referencial para soportar el inventario por porcentajes, el histórico de cambios en las tareas y las columnas dinámicas.
    
*   **Entregable:** Archivo database.sql con el DDL completo del sistema.
    
*   **Paso a paso:**
    
    1.  Crear el archivo backend/database.sql.
        
    2.  Definir la tabla usuarios (id, nombre, password\_hash, rol).
        
    3.  Definir la tabla productos (id, nombre, cantidad\_actual, unidad\_medida, porcentaje\_visual, cantidad\_minima, precio\_promedio). _Nota: porcentaje\_visual almacenará valores como 100, 75, 50, 25, 0._
        
    4.  Definir la tabla kanban\_columnas (id, nombre, posicion).
        
    5.  Definir la tabla tareas (id, titulo, descripcion, columna\_id, asignado\_a\_user\_id, es\_recurrente, fecha\_creacion).
        
    6.  Definir la tabla tareas\_historial (id, tarea\_id, user\_id, accion, fecha\_registro).
        
    7.  Ejecutar el script para generar el archivo físico: sqlite3 gestion.db < database.sql.
        

### Tarea 1.3: Configuración de la Capa de Datos Segura con PDO

*   **Descripción:** Establecer la conexión a SQLite en PHP garantizando la protección absoluta contra inyecciones SQL mediante el uso mandatorio de _Prepared Statements_.
    
*   **Entregable:** Clase de servicio o archivo de conexión db.php que retorne una instancia configurada de PDO.
    
*   **Paso a paso:**
    
    1.  Instalar la extensión PDO de SQLite si no está activa en tu entorno PHP.
        
    2.  Crear backend/config/db.php.
        
    3.  Instanciar new PDO("sqlite:" . \_\_DIR\_\_ . "/../gestion.db").
        
    4.  Configurar los atributos de error: $pdo->setAttribute(PDO::ATTR\_ERRMODE, PDO::ERRMODE\_EXCEPTION).
        
    5.  Configurar el modo de obtención por defecto: $pdo->setAttribute(PDO::ATTR\_DEFAULT\_FETCH\_MODE, PDO::FETCH\_ASSOC).
        

### Tarea 1.4: Implementación de Autenticación con JWT (JSON Web Tokens)

*   **Descripción:** Proteger los endpoints de la API para evitar accesos no autorizados desde internet, implementando un flujo de Login que genere tokens firmados.
    
*   **Entregable:** Endpoints de /api/auth/login y un Middleware de Slim que valide el token en cada petición.
    
*   **Paso a paso:**
    
    1.  Instalar la librería JWT en backend: composer require firebase/php-jwt.
        
    2.  Instalar Slim Framework: composer require slim/slim:^4.0 y PSR-7.
        
    3.  Crear la ruta POST /api/auth/login. Programar la verificación usando password\_verify() contra la base de datos.
        
    4.  Si las credenciales son válidas, empaquetar el id y nombre del usuario en un JWT firmado con una clave secreta definida en un archivo .env.
        
    5.  Escribir un Middleware en Slim que intercepte todas las rutas del grupo /api/protected/, extraiga el token del _Header_ Authorization: Bearer y deniegue el acceso con un código HTTP 401 si es inválido o expiró.
        

FASE 2: Desarrollo de la API REST (Lógica de Negocio)
-----------------------------------------------------

### Tarea 2.1: Endpoints del Inventario Inteligente y Métricas

*   **Descripción:** Desarrollar las operaciones CRUD para el inventario, incluyendo filtros específicos para identificar stock crítico.
    
*   **Entregable:** Rutas HTTP de la API probadas (/api/inventario).
    
*   **Paso a paso:**
    
    1.  Crear rutas GET, POST, PUT, DELETE bajo el grupo protegido de la API.
        
    2.  Implementar GET /api/inventario/critico: Desarrollar la consulta SQL que filtre productos donde porcentaje\_visual <= 25 o cantidad\_actual <= cantidad\_minima.
        
    3.  Asegurar que las entradas de texto pasen por sanitización y se inserten a través de marcadores de posición PDO (:nombre, :cantidad).
        

### Tarea 2.2: Lógica de Negocio para el "Modo Supermercado"

*   **Descripción:** Crear el endpoint que procese las compras físicas en tiempo real, actualizando los niveles del inventario e integrando costos de manera atómica.
    
*   **Entregable:** Endpoint POST /api/compras/registrar.
    
*   **Paso a paso:**
    
    1.  Diseñar el JSON que recibirá el backend (id\_producto, precio\_pagado, cantidad\_comprada, flag\_promocion).
        
    2.  Iniciar una transacción de PDO ($pdo->beginTransaction()) para asegurar consistencia.
        
    3.  Ejecutar un UPDATE en la tabla productos para sumar el stock y actualizar el precio\_promedio.
        
    4.  Cambiar el estado del porcentaje\_visual automáticamente a 100 al registrar el reabastecimiento.
        
    5.  Confirmar la transacción ($pdo->commit()).
        

### Tarea 2.3: API del Kanban Dinámico e Historial de Modificaciones

*   **Descripción:** Desarrollar la API que permita la gestión de columnas y la persistencia de tareas, disparando logs automáticos en el historial cada vez que ocurra un cambio de estado.
    
*   **Entregable:** Endpoints /api/kanban/columnas y /api/kanban/tareas con logs automáticos.
    
*   **Paso a paso:**
    
    1.  Crear endpoints para añadir o eliminar registros de kanban\_columnas.
        
    2.  En el endpoint PUT /api/kanban/tareas/{id}/mover, recibir el nuevo columna\_id y el user\_id del autor del cambio.
        
    3.  Ejecutar la actualización de la tarea.
        
    4.  Inmediatamente después, realizar un INSERT INTO tareas\_historial registrando la acción (ej: "Movido de Pendiente a En Progreso") junto con el _timestamp_ actual del servidor.
        

### Tarea 2.4: Script de Automatización de Tareas Recurrentes (Cron Job)

*   **Descripción:** Programar un script ejecutable mediante consola que reinicie el estado del tablero Kanban para las tareas familiares cíclicas.
    
*   **Entregable:** Script backend/cron/reiniciar\_tareas.php.
    
*   **Paso a paso:**
    
    1.  Escribir el script en PHP que se conecte a la base de datos de manera independiente.
        
    2.  Realizar un UPDATE tareas SET columna\_id = (SELECT id FROM kanban\_columnas ORDER BY posicion ASC LIMIT 1), asignado\_a\_user\_id = NULL WHERE es\_recurrente = 1.
        
    3.  Insertar un registro en el historial global que deje constancia de la regeneración semanal automática.
        

FASE 3: Frontend Core, UI/UX Adaptable y Autenticación
------------------------------------------------------

### Tarea 3.1: Configuración de Tailwind CSS y Diseño Mobile-First

*   **Descripción:** Instalar y configurar el entorno de diseño responsivo enfocado en el uso prioritario desde pantallas móviles.
    
*   **Entregable:** Estilos base funcionando y configuración de tailwind.config.js.
    
*   **Paso a paso:**
    
    1.  Instalar Tailwind en /frontend: npm install -D tailwindcss postcss autoprefixer y ejecutar npx tailwindcss init -p.
        
    2.  Configurar las rutas de los componentes en el archivo de configuración de Tailwind.
        
    3.  Crear la estructura de carpetas en React: /components, /context, /views, /hooks.
        
    4.  Diseñar la barra de navegación persistente inferior (Bottom Navigation) usando flexbox de Tailwind para pantallas pequeñas (block md:hidden), y barra lateral para computadoras (hidden md:flex).
        

### Tarea 3.2: Contexto de Sesión, Login e Interceptores HTTP

*   **Descripción:** Implementar el formulario de acceso y la persistencia del estado de autenticación en la interfaz.
    
*   **Entregable:** Vista de Login y configuración global de peticiones con tokens.
    
*   **Paso a paso:**
    
    1.  Crear AuthContext.jsx en React utilizando la API de Context para almacenar el estado del usuario y el JWT recibido.
        
    2.  Almacenar el token de forma segura en el estado de la aplicación (y opcionalmente en localStorage si se prefiere persistencia rápida).
        
    3.  Crear una función utilitaria de peticiones (o configurar una instancia de axios) que adjunte automáticamente el encabezado Authorization: Bearer en cada llamado al backend.
        

### Tarea 3.3: Módulo Global de Alertas y Modales de Confirmación

*   **Descripción:** Integrar componentes visuales interactivos para prevenir errores del usuario en operaciones delicadas (borrados, vaciados).
    
*   **Entregable:** Sistema centralizado de modales (Pop-ups).
    
*   **Paso a paso:**
    
    1.  Crear un componente personalizado de Modal reutilizable o configurar modales accesibles con Tailwind CSS.
        
    2.  Implementar mensajes flash flotantes (Toasts) para confirmaciones sutiles (ej: "Producto añadido con éxito").
        
    3.  Vincular los botones de eliminación del inventario y del Kanban al desencadenamiento previo de un modal confirmatorio.
        

FASE 4: Interfaces de Inventario Avanzado y Modo Supermercado (UI)
------------------------------------------------------------------

### Tarea 4.1: Panel de Control de Despensa por Porcentaje Visual

*   **Descripción:** Diseñar y conectar la interfaz gráfica que refleje visualmente la cantidad de insumos disponibles en el hogar.
    
*   **Entregable:** Vista completa del inventario conectada a la API.
    
*   **Paso a paso:**
    
    1.  Consumir el endpoint /api/protected/inventario al cargar el componente.
        
    2.  Dibujar las tarjetas de productos. Utilizar clases dinámicas de Tailwind basadas en el porcentaje del producto:
        
        *   100% y 75%: Barra de progreso verde (bg-green-500).
            
        *   50%: Barra de progreso amarilla (bg-yellow-500).
            
        *   25% o menos: Barra de progreso roja (bg-red-500) acompañada de una etiqueta intermitente de "Alerta".
            
    3.  Crear la pestaña "Alertas de Stock" que filtre instantáneamente los insumos críticos.
        

### Tarea 4.2: Interfaz Interactiva "Modo Supermercado"

*   **Descripción:** Crear una interfaz ultra-simplificada optimizada para su uso mientras se camina por los pasillos del súper, permitiendo registrar precios al instante.
    
*   **Entregable:** Componente de React ModoSuper.jsx.
    
*   **Paso a paso:**
    
    1.  Diseñar una vista de lista interactiva donde los elementos críticos aparezcan en forma de checklist.
        
    2.  Al marcar un elemento como "En Carrito", desplegar dos campos numéricos pequeños integrados en la misma fila: _Precio_ y _Cantidad_.
        
    3.  Calcular dinámicamente un contador en la parte inferior de la pantalla con la sumatoria del costo total acumulado en tiempo real.
        
    4.  Colocar un botón prominente de "Finalizar Compra" que envíe los datos estructurados al endpoint de la Fase 2.2 y limpie el carrito.
        

FASE 5: Interfaz del Kanban Familiar Dinámico (UI)
--------------------------------------------------

### Tarea 5.1: Tablero de Tareas con Columnas Dinámicas y Filtros Asignados

*   **Descripción:** Construir la interfaz del tablero Kanban que reaccione a la configuración de columnas de la base de datos y permita la visualización personalizada por miembro del hogar.
    
*   **Entregable:** Vista interactiva KanbanBoard.jsx.
    
*   **Paso a paso:**
    
    1.  Renderizar horizontalmente las columnas obtenidas desde /api/kanban/columnas. En móviles, configurar un scroll horizontal fluido (overflow-x-auto snap-x).
        
    2.  Diseñar los controles superiores con pestañas de filtrado: "Mis Tareas", "Papá", "Hermana", "Ver Todo". Filtrar el array de tareas en memoria según la selección.
        
    3.  Añadir selectores rápidos en cada tarjeta para transferir la tarea de una columna a otra de forma sencilla sin requerir interfaces de arrastre complejas.
        

### Tarea 5.2: Panel de Historial de Tareas y Gestión de Recurrencia

*   **Descripción:** Habilitar la visibilidad de las trazas de auditoría de las tareas dentro de la interfaz de usuario.
    
*   **Entregable:** Modal informativo de traza y formulario extendido de creación de tareas.
    
*   **Paso a paso:**
    
    1.  En cada tarjeta del Kanban, añadir un botón de información ("Icono de Reloj").
        
    2.  Al hacer clic, abrir un modal que consuma /api/kanban/tareas/{id}/historial y despliegue una lista cronológica (Ej: _"Fer movió esto a 'En Progreso' a las 14:32"_).
        
    3.  En la interfaz de creación de tareas, incorporar campos de control para activar el flag de es\_recurrente.
        

FASE 6: Despliegue en Hardware Propio e Infraestructura Segura (DevOps)
-----------------------------------------------------------------------

### Tarea 6.1: Aislamiento del Servidor Casero (Linux CLI) y Tareas Programadas

*   **Descripción:** Preparar el sistema operativo de la laptop antigua eliminando capas gráficas innecesarias para garantizar la ligereza absoluta y configurar los disparadores del sistema.
    
*   **Entregable:** Servidor operativo consumiendo mínimos recursos en reposo y configuración activa en crontab.
    
*   **Paso a paso:**
    
    1.  Instalar la distribución Linux elegida en la laptop en su variante puramente CLI (sin entornos de escritorio como GNOME o KDE Plasma).
        
    2.  Asignar una IP estática local al equipo a través de la configuración de red del sistema operativo.
        
    3.  Configurar el planificador del sistema ejecutando crontab -e bajo el usuario que gestiona la aplicación.
        
    4.  Escribir la instrucción de ejecución cron: 1 0 \* \* 1 /usr/bin/php /ruta/a/tu/backend/cron/reiniciar\_tareas.php (Ejecuta el script cada lunes a las 12:01 AM).
        

### Tarea 6.2: Configuración de Nginx como Servidor Web y Proxy Inverso

*   **Descripción:** Instalar y estructurar el servidor HTTP Nginx para centralizar el tráfico del proyecto en la máquina de producción.
    
*   **Entregable:** Archivo de configuración nginx.conf activo y en ejecución.
    
*   **Paso a paso:**
    
    1.  Instalar Nginx en el servidor: sudo pacman -S nginx (o el gestor de paquetes correspondiente).
        
    2.  Configurar el bloque de servidor para apuntar la raíz (root) a la carpeta del build compilado de React (frontend/dist).
        
    3.  Crear una directiva location /api interna para actuar como _Reverse Proxy_, redirigiendo las peticiones entrantes hacia el socket o puerto donde corre Slim PHP a través de PHP-FPM (fastcgi\_pass o proxy\_pass).
        
    4.  Levantar y habilitar el servicio del sistema: sudo systemctl enable --now nginx.
        

### Tarea 6.3: Implementación de Red Privada Virtual en Malla con Tailscale

*   **Descripción:** Enlazar tus dispositivos móviles y la laptop que actúa como servidor dentro de una red privada virtual segura para permitir el acceso remoto global sin abrir puertos en el módem doméstico.
    
*   **Entregable:** Interconexión exitosa bajo entorno cifrado de extremo a extremo.
    
*   **Paso a paso:**
    
    1.  Crear una cuenta gratuita en la plataforma de Tailscale.
        
    2.  Instalar el cliente de Tailscale en el servidor casero mediante consola y ejecutar sudo tailscale up. Copiar el enlace de autenticación generado para validar el nodo.
        
    3.  Instalar la aplicación móvil de Tailscale en tu teléfono celular y en los dispositivos de tu familia e iniciar sesión con la misma cuenta.
        
    4.  Identificar la IP privada interna asignada por Tailscale a tu servidor (rango 100.x.x.x).
        
    5.  Utilizar dicha dirección IP en los navegadores de tus dispositivos móviles para entrar al sistema de forma completamente segura desde redes externas o el supermercado.
        

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML``   ### Recomendaciones para tu Portafolio en GitHub  *   **README Principal:** Utiliza este plan como la base conceptual para construir el `README.md` final del proyecto, enfocándote en las decisiones de diseño (como la elección de SQLite por optimización de hardware y la seguridad con PDO/JWT).  *   **Commits organizados:** Intenta realizar los commits haciendo referencia a las tareas de este plan (ej. `feat(backend): implementado middleware JWT - Tarea 1.4`). Esto reflejará una excelente disciplina de ingeniería ante cualquier revisor técnico.   ``