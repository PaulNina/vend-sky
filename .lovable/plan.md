

# Plan: Manual de Usuario Administrador

Crear una nueva pagina `/admin/manual` con un manual detallado e interactivo que documente cada modulo del panel de administracion, con diagramas, descripciones de botones y flujos de trabajo.

## Pagina a crear

**`src/pages/admin/AdminManualPage.tsx`** -- Pagina completa con:

### Estructura del manual (secciones con navegacion interna via tabs/accordion)

1. **Vision General del Sistema** -- Diagrama de arquitectura del flujo: Vendedor registra venta -> Revisor aprueba/rechaza -> Comisiones generadas -> Pago
2. **Dashboard Gerencial** -- KPIs (Ventas, Bono, Tasa Aprobacion, Por Revisar), filtros por campaña y periodo, graficos de barras por ciudad, actividad reciente, tabla ranking, productos top
3. **Campañas** -- Crear/editar campaña (nombre, slug, fechas, registro, IA fecha), ver inscritos, eliminar inscripciones
4. **Vendedores (Kardex)** -- Buscar/filtrar por ciudad, editar talla/tienda con historial, ver QR de cobro, exportar Excel
5. **Productos y Modelos** -- CRUD productos (nombre, modelo, pulgadas, bono Bs, puntos), importar desde Excel con plantilla, exportar
6. **Seriales** -- Importar CSV/Excel, filtrar por estado (disponible/usado/bloqueado), buscar, exportar
7. **Restringidos** -- Importar seriales restringidos, buscar, eliminar, exportar
8. **Revisiones** -- Filtrar por estado/ciudad, ver detalle con fotos (TAG, Poliza, Nota), aprobar/rechazar con motivo, navegacion con teclado (flechas + tecla A), alertas IA
9. **Auditoria** -- Muestreo aleatorio de aprobaciones, revisar fotos, marcar OK o revertir con motivo
10. **Metricas** -- Filtros por campaña/ciudad/rango de fechas, tabs semanal/ciudad/producto, graficos, exportar
11. **Comisiones** -- Seleccionar campaña/periodo, generar liquidacion, marcar pagos, subir comprobantes, ver desglose semanal, QR de cobro
12. **Inscripciones** -- Reporte de inscripciones por campaña, tasa de inscripcion por ciudad, exportar
13. **Comparar Campañas** -- Seleccionar 2+ campañas, comparar metricas lado a lado, graficos comparativos (habilitado via Configuracion)
14. **Correos Ciudad** -- Asignar destinatarios de reportes por ciudad y campaña
15. **Plantillas Email** -- Editar asunto, cuerpo HTML, activar/desactivar, configurar from/reply-to
16. **Usuarios/Roles** -- Buscar por email, asignar roles (vendedor, revisor_ciudad, supervisor, admin), resetear contraseña, bloquear/eliminar usuarios
17. **Configuracion** -- Tabs: General (feature flags como comparador), Ciudades (CRUD, grupos), Landing, Respaldos (exportar tablas a Excel), Procesos del sistema

### Diseno
- Tabs principales para agrupar las secciones (Dashboard, Ventas, Datos, Reportes, Sistema)
- Cada seccion con Cards descriptivas, iconos lucide consistentes con el sidebar
- Tablas de referencia de botones con columnas: Boton/Icono, Ubicacion, Funcion
- Diagramas de flujo ASCII en bloques `text` para los procesos principales
- Estilo visual consistente con el tema oscuro/dorado del sistema

## Cambios adicionales

- **`src/layouts/AdminLayout.tsx`**: Agregar item "Manual" al nav con icono `BookOpen`
- **`src/App.tsx`**: Agregar ruta `/admin/manual`

## Alcance total
- 1 archivo nuevo (AdminManualPage.tsx ~800-1000 lineas)
- 2 archivos editados (AdminLayout.tsx, App.tsx -- solo agregar nav item y ruta)

