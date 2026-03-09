

## Plan: Nuevos informes en Métricas (Tabs adicionales)

### Informes faltantes para el dueño

Actualmente la página tiene 4 tabs: Vista General, Semanal, Por Ciudad, Productos. Faltan reportes clave que un dueño necesita:

1. **Top Vendedores** — Ranking de vendedores por unidades aprobadas, con bono acumulado, tasa de aprobación y ciudad. Exportable a Excel.
2. **Tendencia Diaria** — Gráfico de línea con ventas por día + tabla con desglose diario (total, aprobadas, rechazadas). Exportable.
3. **Seriales** — Resumen de uso de seriales: total importados, usados, disponibles, % utilización por producto. Exportable.

### Cambios en `src/pages/admin/MetricsPage.tsx`

**Datos adicionales a cargar:**
- Ampliar el `select` de sales para incluir `sale_date` (ya disponible en filtros pero no en el select)
- Cargar vendors con `id, full_name, city, store_name` filtrados por campaña (via enrollments) para mapear vendor_id → nombre
- Cargar conteos de seriales (total y usados) agrupados por producto

**Nuevas agregaciones (desde los mismos sales ya cargados):**

- **vendorData**: Map por vendor_id → { name, city, store, total_units, approved_units, rejected_units, observed_units, bonus_bs, points, approval_rate }
- **dailyData**: Map por sale_date → { date, total, approved, pending, rejected, observed, bonus_bs }
- **serialsData**: Query aparte a `serials` con conteo por status

**3 nuevos TabsTrigger + TabsContent:**

- `vendors` — Tabla ranking con columnas: #, Vendedor, Tienda, Ciudad, Total, Aprobadas, % Aprob., Bono Bs, Puntos. Footer con totales. Botón exportar.
- `daily` — LineChart de unidades aprobadas por día + tabla con desglose. Botón exportar.
- `serials` — Tabla de productos con Total Seriales, Usados, Disponibles, % Uso. Barra de progreso visual por producto.

**Exportaciones Excel:**
- `exportVendors()` — usa `exportToExcel` 
- `exportDaily()` — usa `exportToExcel`
- `exportSerials()` — usa `exportToExcel`
- Actualizar `exportFullReport()` para incluir las 3 hojas nuevas en el reporte gerencial multi-hoja

### Archivo modificado
- `src/pages/admin/MetricsPage.tsx`

