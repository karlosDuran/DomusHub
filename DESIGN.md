# HomeOps — Sistema de Diseño ("Piedra y Salvia")

Sistema de diseño minimalista, cálido y orientado a operación diaria (**Operate mode**) para gestión doméstica familiar (despensa, catálogo, tablero Kanban, modo supermercado y perfiles PIN).

## 1. Paleta de Color

### Modo Claro — *Piedra y Salvia* (Predeterminado, daylight-first)
- **Lienzo (`--color-bg`)**: `#F8F7F4`
- **Superficie / Tarjeta (`--color-surface`)**: `#FFFFFF`
- **Superficie secundaria / Sidebar / Columnas (`--color-surface-subtle`)**: `#F0EEE9`
- **Bordes hairline**: `rgba(26, 30, 27, 0.09)` / fuerte `rgba(26, 30, 27, 0.16)`
- **Tintas**: Principal `#1A1E1B` · Secundaria `#5C635E`
- **Acento primario (Salvia / Eucalipto)**: `#2D6A4F` · Hover `#23533E` · Soft `rgba(45, 106, 79, 0.10)`
- **Semántica**: Éxito `#2D6A4F` · Aviso `#B86E14` · Crítico `#C43E3B` · Info `#3A6A85`

### Modo Oscuro — *Carbón y Salvia* (Opcional vía toggle)
- **Lienzo (`--color-bg`)**: `#131614`
- **Superficie (`--color-surface`)**: `#1B1F1C` · Secundaria `#171A18` · Elevada `#222724`
- **Tintas**: Principal `#F2F0EB` · Secundaria `#9BA39D`
- **Acento primario**: `#52B788` · Hover `#40A275` · Ink `#0D1712`

## 2. Tipografía
- **UI y Títulos (`--font-sans`)**: `Figtree`, `system-ui`, `sans-serif` · tracking `-0.02em` en encabezados.
- **Datos y cifras (`--font-mono` / `.font-mono-num`)**: `JetBrains Mono` con `font-variant-numeric: tabular-nums` para stock, porcentajes, precios y fechas.

## 3. Movimiento y Micro-interacciones
- **Curvas**:
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (entradas, salidas, feedback de presión)
  - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` (indicadores deslizantes)
  - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` (sheets móviles y barra inferior de compra)
- **Principios**:
  - Propiedades GPU-only (`transform`, `opacity`). La barra de stock usa `transform: scaleX()` en lugar de `width`.
  - Feedback táctil inmediato (`scale(0.97)` en `120ms`) en botones y controles `-1 / +1`.
  - Sin stagger ni animaciones en acciones de alta frecuencia (cambio de ruta, filtros, búsqueda).
  - Modales sobre `<dialog>` nativo (`DialogShell`) con `@starting-style` y `transition-behavior: allow-discrete`: modal centrado en desktop, bottom sheet con `safe-area` en móvil.
  - Respeto total a `@media (prefers-reduced-motion: reduce)` y `@media (hover: hover) and (pointer: fine)`.

## 4. Mobile-Native Floor
- `viewport-fit=cover, interactive-widget=resizes-content` + `<meta name="theme-color">` sincronizado dinámicamente por `themeStore`.
- `-webkit-tap-highlight-color: transparent`, `overscroll-behavior: none` en raíz y `contain` en modales/scrolls internos.
- Inputs con `font-size: 16px` mínimo en `@media (pointer: coarse)` para evitar auto-zoom en iOS Safari.
- `touch-action: manipulation` y `user-select: none` únicamente en controles interactivos.
