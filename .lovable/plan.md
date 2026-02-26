

## Plan: Auto-seleccionar campaña y auto-detectar producto por serial

### Problema actual
1. El vendedor debe seleccionar manualmente la campaña y el producto
2. El serial ya tiene un `product_id` asociado en la tabla `serials`, pero no se usa para auto-seleccionar el producto

### Cambios en `src/pages/RegisterSalePage.tsx`

1. **Auto-seleccionar campaña**: Después de cargar las campañas en `loadData`, si solo hay una campaña activa, seleccionarla automáticamente. Si hay varias, seleccionar la primera (o la que tenga registro abierto).

2. **Auto-detectar producto por serial**: En el `useEffect` de validación de serial (líneas 174-209), cuando el serial es válido y tiene `product_id`, auto-seleccionar ese producto con `setSelectedProduct(serialData.product_id)`. Eliminar la validación de "serial no corresponde al producto" ya que ahora el producto se determina por el serial.

3. **Ocultar/deshabilitar selector de producto**: Hacer el campo de producto de solo lectura (mostrar el nombre del producto detectado automáticamente en vez del dropdown manual). Si no hay serial válido, mostrar un mensaje indicando que el producto se detectará al ingresar el serial.

4. **Reordenar formulario**: Mover el campo Serial (paso 3) antes del Producto (paso 2), para que el flujo sea: Campaña (auto) → Serial → Producto (auto) → Fecha → Fotos.

### Flujo resultante
- Vendedor abre "Registrar Venta"
- Campaña ya está seleccionada automáticamente
- Ingresa el serial
- El producto se muestra automáticamente basado en el serial
- Completa fecha y fotos
- Envía

### Detalle técnico

- En `loadData`, después de `setCampaigns(data)`, agregar: si hay exactamente 1 campaña activa con registro abierto, hacer `setSelectedCampaign(id)`
- En el serial validation effect, cuando `serialData` es válido y tiene `product_id`, hacer `setSelectedProduct(serialData.product_id)` 
- Cambiar el card de Producto para mostrar el producto detectado como texto en vez de dropdown
- Si el serial no tiene `product_id` en la BD, mantener el dropdown manual como fallback

