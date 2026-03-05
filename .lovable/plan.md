

## Plan: Ventana flotante para comprobantes de pago

### Problema actual
Al hacer clic en "Comprobante", se abre una nueva pestaña del navegador. Esto interrumpe el flujo del operador, que pierde contexto de la tabla.

### Solución
Reemplazar `window.open` con un **Popover** flotante que muestre el comprobante directamente sobre la tabla, sin salir de la página. El operador puede ver la imagen/PDF inline y cerrar con un clic.

### Cambios en `src/pages/admin/CommissionsPage.tsx`

1. **Agregar estado para preview flotante**: `proofDialog`, `proofUrl`, `proofLoading`
2. **Reemplazar el botón "Comprobante"** (linea 588-593): En lugar de `window.open`, abrir un Dialog flotante que muestra la imagen del comprobante
3. **Agregar un Dialog de preview** al final del componente con:
   - Imagen del comprobante renderizada inline (`<img>`)
   - Para PDFs: un `<iframe>` embebido
   - Botón para abrir en pestaña nueva (como opción secundaria)
   - Nombre del vendedor y monto en el header para contexto
4. **Mobile**: En las cards mobile (linea 490-536), agregar el mismo botón de comprobante con la misma lógica flotante (actualmente no se muestra en mobile)

### Un solo archivo modificado
- `src/pages/admin/CommissionsPage.tsx`

