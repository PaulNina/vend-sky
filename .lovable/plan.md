

## Plan: Pestaña de Backup en Configuración

### Enfoque
Agregar un sistema de Tabs a la página de Configuración. La pestaña "General" contendrá todo el contenido actual. La nueva pestaña "Backup" permitirá exportar todos los datos del sistema.

### Cambios en `src/pages/admin/ConfigurationPage.tsx`

1. **Envolver el contenido en Tabs** (de Radix/shadcn): Tab "General" con todo lo actual, Tab "Backup" nueva.

2. **Tab Backup** incluirá:
   - Botón "Exportar Todo" que descarga un archivo Excel (.xlsx) con una hoja por cada tabla del sistema
   - Botones individuales por tabla para exportar solo esa entidad
   - Contadores de registros por tabla
   - Tablas a exportar: campaigns, campaign_periods, products, serials, vendors, sales, sale_attachments, reviews, commission_payments, cities, city_groups, city_group_members, report_recipients, restricted_serials, user_profiles, user_roles, app_settings, email_templates, notifications, admin_audit_logs, supervisor_audits, vendor_blocks, vendor_store_history

3. **Lógica de exportación**: Usar la librería `xlsx` (ya instalada) para generar un archivo multi-hoja. Cada tabla se consulta via Supabase con paginación para superar el límite de 1000 filas (importante para serials con 107k registros).

4. **Función de paginación**: Helper `fetchAllRows(table)` que hace queries en lotes de 1000 hasta traer todos los registros.

### Archivos modificados
- `src/pages/admin/ConfigurationPage.tsx` — agregar Tabs + lógica de backup

