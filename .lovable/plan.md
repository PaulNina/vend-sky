

## Analysis

After reviewing the codebase, most of what you're asking for **already exists**:

- **Kardex - Talla de Polera**: Already implemented in `VendorsPage.tsx` (admin can edit) and `VendorProfilePage.tsx` (vendor can view)
- **Kardex - Cambio de tienda con fecha e historial**: Already implemented via `vendor_store_history` table, with date, previous/new store, and observation. Visible in both admin Kardex dialog and vendor profile
- **Dashboard - Ventas por ciudad en Unidades**: Already has a bar chart in `AdminDashboardPage.tsx`
- **Dashboard - Ventas por ciudad en Monto Bs**: Already has a horizontal bar chart
- **Dashboard - Filtros Semana/Mes/Año**: Already implemented

### What's Missing

Only one thing: the **"Día"** (today) period filter option. The current period selector has "Todo", "Esta semana", "Este mes", "Este año" but lacks "Hoy".

## Implementation

### Step 1: Add "Día" period to AdminDashboardPage

In `src/pages/admin/AdminDashboardPage.tsx`:
- Add `"day"` to the `PeriodType` union type
- Add a `case "day"` in the `dateRange` memo that returns today's date as both start and end
- Add `<SelectItem value="day">Hoy</SelectItem>` to the period selector dropdown

This is a ~5-line change in a single file.

