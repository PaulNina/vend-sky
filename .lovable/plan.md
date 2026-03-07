

## Plan: Hacer la app instalable como PWA (Progressive Web App)

### Qué logra esto
Los vendedores podrán instalar la app en su celular directamente desde el navegador. Aparecerá como un ícono en la pantalla de inicio, se abrirá sin barra de navegador (como app nativa), y funcionará offline para carga rápida.

### Cambios técnicos

**1. Instalar `vite-plugin-pwa`** — plugin que genera el Service Worker y manifest automáticamente.

**2. `vite.config.ts`** — Configurar VitePWA con:
- Manifest con nombre "Bono Vendedores Skyworth", colores de la marca, iconos
- `navigateFallbackDenylist: [/^\/~oauth/]` para no cachear rutas OAuth
- Estrategia de cache para assets estáticos

**3. `index.html`** — Agregar meta tags PWA:
- `<meta name="theme-color">` con el color primario
- `<link rel="apple-touch-icon">` para iOS
- `<meta name="apple-mobile-web-app-capable">`

**4. Crear iconos PWA** en `public/`:
- `pwa-192x192.png` y `pwa-512x512.png` — iconos con el logo "S" de Skyworth en fondo dorado

**5. `src/pages/InstallAppPage.tsx`** — Nueva página `/instalar` con:
- Instrucciones visuales para instalar en Android (Chrome) e iOS (Safari)
- Botón "Instalar" que usa la API `beforeinstallprompt` del navegador
- Detección automática de plataforma para mostrar instrucciones relevantes

**6. `src/layouts/VendorLayout.tsx`** — Agregar enlace "Instalar App" en el sidebar del vendedor (con icono `Smartphone`) que lleva a `/instalar`. Solo visible si la app NO está instalada (detectado via `display-mode: standalone`).

**7. `src/App.tsx`** — Agregar ruta `/instalar` accesible para vendedores autenticados.

### Archivos modificados/creados
- `vite.config.ts` — config PWA
- `index.html` — meta tags mobile
- `public/pwa-192x192.png`, `public/pwa-512x512.png` — iconos generados con SVG
- `src/pages/InstallAppPage.tsx` — nueva página de instalación
- `src/layouts/VendorLayout.tsx` — link en sidebar
- `src/App.tsx` — nueva ruta

