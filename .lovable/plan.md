

# Bono Vendedor – El Sueño del Hincha – SKYWORTH

## Visión General
Aplicación web full-stack para gestionar campañas de bonos para vendedores SKYWORTH Bolivia. Los vendedores registran ventas semanales con respaldos fotográficos, que son revisadas por encargados de ciudad, auditadas por supervisores, y administradas centralmente. El sistema calcula unidades, montos en Bs y puntos para rankings.

---

## Fase 1: Fundación – Base de datos, autenticación y tema visual

### Diseño visual (tema SKYWORTH)
- Tema oscuro con fondo `#0a1628`, contenedores/tarjetas verde oscuro `#0d2818`, bordes verdes `#1a4d2e`
- Botones primarios naranja `#f59e0b`, badges de estado con colores semáforo
- Sidebar lateral con íconos y navegación por rol
- Tipografía clara, tablas con bordes sutiles y paginación

### Base de datos (Supabase)
- **campaigns**: nombre, subtítulo, fechas inicio/fin, activa, registro habilitado, validación IA ON/OFF, modo de puntos
- **vendors**: datos del vendedor, ciudad, tienda, activo/inactivo (vinculado a auth.users)
- **vendor_blocks**: bloqueos temporales con fecha inicio/fin y motivo
- **products**: modelo, nombre, pulgadas, puntos por venta, bono Bs por venta, activo
- **serials**: serial, producto, estado (disponible/usado/bloqueado), referencia a venta
- **restricted_serials**: seriales bloqueados con motivo y campaña origen
- **sales**: campaña, vendedor, producto, serial, fecha venta, semana, estado, puntos, bono Bs, ciudad
- **sale_attachments**: URLs de fotos (TAG, Póliza, Nota de Venta)
- **reviews**: decisión del revisor con motivo obligatorio
- **supervisor_audits**: auditorías aleatorias con acción y motivo
- **user_roles**: roles separados (vendedor, revisor_ciudad, supervisor, admin)
- **report_recipients**: destinatarios de email por ciudad

### Autenticación y roles (RLS)
- Login con email/contraseña y recuperación de contraseña
- 4 roles: VENDEDOR, REVISOR_CIUDAD, SUPERVISOR, ADMIN
- RLS estricto: vendedor ve solo sus datos, revisor solo su ciudad, supervisor/admin todo
- Redirección automática al portal correspondiente según rol

---

## Fase 2: Portal del Vendedor

### Mi Panel (Dashboard personal)
- Tarjetas resumen: Unidades aprobadas, Bs aprobados, Puntos acumulados, Pendientes, Rechazados
- Contador regresivo al cierre semanal (Domingo 23:59 hora Bolivia)
- Selector de campaña activa

### Registrar Venta (formulario guiado)
- Paso 1: Seleccionar producto (dropdown con modelo y pulgadas)
- Paso 2: Ingresar serial → **validación en tiempo real**: existe, no usado, no restringido, modelo coincide. Feedback visual inmediato (✅ OK / ❌ Bloqueado + motivo)
- Paso 3: Fecha de venta (por defecto hoy, validar que cae en semana en curso Lun-Dom)
- Paso 4: Cargar 3 fotos obligatorias (TAG, Póliza, Nota de Venta) con preview
- Bloqueo si el vendedor está inactivo o tiene bloqueo vigente
- Bloqueo si el registro de la campaña está deshabilitado

### Mis Ventas (historial)
- Tabla con filtros: fecha, semana, estado (Pendiente/Aprobado/Rechazado/Cerrado)
- Detalle de cada venta con imágenes y estado de revisión
- Paginación

### Ranking
- Tabs: General / Top 3 / Por Ciudad
- Top 3 en tarjetas destacadas con posición, nombre, tienda, ciudad y puntos
- Lista completa con posición, incluyendo vendedores con 0 puntos
- Filtro por campaña

---

## Fase 3: Portal del Revisor de Ciudad

### Cola de Pendientes
- Lista filtrable por semana y estado
- Contador de pendientes y alerta de cierre (lunes 23:59)

### Vista de detalle de venta
- Visor de imágenes (TAG / Póliza / Nota de Venta) ampliable
- Panel de validaciones: estado del serial, restricciones, resultado IA (si aplica)
- Datos del vendedor, producto, serial, fecha

### Acciones de revisión
- Botón **Aprobar** → confirmar
- Botón **Rechazar** → motivo obligatorio (textarea)
- Al aprobar: actualizar puntos y bono del vendedor, marcar serial como "usado"

### Cierre semanal
- Alerta visual de registros que se cerrarán el lunes 23:59
- Después del cierre: registros pendientes pasan a "CERRADO" automáticamente

---

## Fase 4: Portal del Supervisor

### Auditoría aleatoria
- Sistema de muestreo configurable (% o N registros/día) de aprobaciones recientes
- Lista de registros muestreados con detalle completo
- Acciones: **OK** (confirmar aprobación) / **Revertir** (rechazar con motivo obligatorio)

### Métricas por revisor
- Tabla: revisor, aprobados, rechazados, reversados, tasa de reversión
- Filtro por periodo y ciudad

---

## Fase 5: Panel de Administración

### Gestión de Campañas
- CRUD de campañas: nombre, subtítulo, fecha inicio/fin, activa, registro habilitado
- Toggle de validación IA por campaña
- Configuración de regla de puntos y correos por ciudad

### Gestión de Productos
- CRUD: modelo, nombre, pulgadas, puntos por venta, bono Bs por venta, activo/inactivo
- Tabla con filtros por estado y pulgadas (replicando diseño existente)

### Gestión de Seriales
- Importar CSV masivo de seriales
- Tabla con búsqueda, filtro por estado (Disponible/Usado/Bloqueado)
- Contadores: Total, Disponibles, Usados
- Botón "Descargar datos" y "Descargar Plantilla"

### Seriales Restringidos
- Importar CSV de seriales bloqueados con motivo y campaña origen
- Tabla con búsqueda y filtros

### Gestión de Usuarios y Roles
- Asignar roles: revisor por ciudad, supervisores
- Activar/desactivar vendedores (switch en tiempo real)
- Gestionar bloqueos temporales por vendedor

### Reportes y Exportación
- Export Excel por campaña, por ciudad, por rango de fechas
- Dashboard gerencial: unidades y Bs aprobados por ciudad, top 5 productos por ciudad
- Estados globales: pendientes, aprobados, rechazados

---

## Fase 6: Automatizaciones y Validación IA

### Reporte semanal automático (email)
- Edge function + cron: cada martes 09:00 hora Bolivia (13:00 UTC)
- Genera tabla por ciudad: #Semana, Unidades, Monto Bs, Acumulado
- Envía email a destinatarios configurados por ciudad con resumen y adjunto Excel/CSV

### Cierre semanal automático
- Cron lunes 23:59 hora Bolivia: cerrar registros pendientes de semana anterior
- Cambiar estado a "CERRADO" (solo editable por admin/supervisor)

### Validación IA de fecha (opcional por campaña)
- Edge function que usa Lovable AI con modelo de visión para OCR de Nota de Venta/Póliza
- Extraer fecha del documento, comparar con semana en curso
- Si no coincide → bloquear registro con error claro
- Si baja confianza → permitir enviar a revisión con bandera "requiere verificación manual"

---

## Datos Demo
- 3-5 vendedores por ciudad (La Paz, Cochabamba, Santa Cruz)
- ~10 productos SKYWORTH reales (E5500H, E6600H, G6600H, Q6600H, Q7500G, etc.)
- ~50 seriales de ejemplo
- 2 campañas: "El Sueño del Hincha" y "Bono Vendedor El Sueño del Hincha"
- Ventas de ejemplo en distintos estados

