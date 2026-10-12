## GRUPO EMPRESARIAL QUISBERT S.R.L. | SKYWORTH

## Requerimientos funcionales para la plataforma Skyworth

Campañas, Bono Vendedor, ventas, paneles y administración

Dirigido a Paul y Yassir | Grupo Empresarial Quisbert S.R.L.

## Objetivo de la ampliación

La plataforma Skyworth debe administrar campañas diferentes desde un mismo panel. Cada campaña definirá sus productos, tiendas, vendedores, clientes, beneficios y controles de manera independiente. El módulo de bandeo y ruleta de cliente final ya desarrollado se conservará y se integrará con las mejoras solicitadas para ventas, Bono Vendedor y administración. Las funciones deben quedar disponibles para campañas futuras sin crear pantallas o procesos especiales para cada evento.

Se requiere una operación completa: configurar la campaña; registrar y validar ventas; acreditar bonos, puntos, tickets o cupones según la regla; administrar canjes, pagos y sorteos; consultar paneles y exportar reportes. El sistema deberá compartir catálogos y TAG entre los flujos autorizados, manteniendo separados sus registros, beneficiarios y beneficios. Las funciones de ventas existentes en Incentivos TCL sirven como referencia funcional para la ampliación de Skyworth.

## Funciones que debe incorporar la plataforma

| Prioridad | Resultado esperado | Áreas afectadas |
| --- | --- | --- |
| Base de ventas | Cada venta queda vinculada a una tienda real, vendedor, modelo, serial y campaña; su aprobación acredita beneficios una sola vez. | Registro, revisión, catálogo y tiendas. |
| Gestión del incentivo | Bono y puntos independientes por producto y beneficiario; liquidación y consulta claras, con tickets digitales si la campaña los utiliza. | Campañas, pagos, puntos, perfil. |
| Administración integral | Roles configurables, permisos por acción, visor, filtros y correcciones controladas por administrador total. | Todos los módulos y reportes. |
| Integración de la plataforma | Bono Vendedor, cliente final, bandeo, premios y sorteos comparten catálogos e historial sin confundir beneficios. | Campañas, seriales y auditoría. |

## 1 Configuración de múltiples campañas

Administración debe poder crear, editar, duplicar, pausar, cerrar y archivar campañas. Al duplicar una campaña se copiarán únicamente sus parámetros y catálogo; ventas, participantes, tickets, puntos, pagos, canjes y resultados permanecerán en la campaña original. Una campaña puede atender al vendedor, la tienda, el cliente final o varios de ellos, con reglas distintas para cada beneficiario. El panel mostrará qué funciones están activas en cada campaña y permitirá consultarlas sin mezclar datos de otras.

| Configuración | Qué debe permitir | Efecto en la operación |
| --- | --- | --- |
| Participación | Elegir categorías, productos, modelos, ciudades y tiendas; habilitar vendedores, tiendas y clientes finales. | Mostrar solo productos y participantes elegibles. |
| Beneficios | Activar por separado bono, puntos, tickets digitales, cupones físicos, bandeo, premios y sorteos. | Una venta válida genera exactamente los beneficios configurados. |
| Control | Definir evidencias, aprobación, topes, stock, condiciones y responsables para cada flujo. | Evitar duplicados, beneficios sin validar y entregas sin existencia. |
| Convivencia | Permitir o impedir que una venta participe en campañas simultáneas y definir acumulación de beneficios. | Mantener el cálculo e historial independientes por campaña. |


Cada campaña tendrá una vista previa de las reglas antes de publicarse. Los cambios posteriores guardarán versión, motivo y usuario. Las ventas ya aprobadas conservarán la regla bajo la que fueron acreditadas; un recálculo histórico solo se efectuará mediante una acción autorizada con vista previa de diferencias. Las reglas no aplicables deberán producir una explicación visible para el operador.

## 2 Relación entre vendedor tienda y venta

## 2.1 Tienda como dato identificable

Cada tienda tendrá un registro único con código, nombre comercial, ciudad, departamento, canal o tipo, estado, propietario o responsable cuando aplique, y datos de contacto. La venta debe guardar el identificador de esa tienda, además de una fotografía de sus datos comerciales al momento del registro para preservar el contexto histórico. No se debe depender de que el vendedor escriba libremente el nombre, pues nombres parecidos impiden filtrar y conciliar pagos.

- Administración asignará al vendedor una o más tiendas autorizadas; una tienda tendrá varios vendedores cuando corresponda. La asignación incluirá estado y alcance por campaña.

- El vendedor seleccionará una tienda de su lista al registrar la venta. Si vende temporalmente en otra tienda, una persona autorizada gestionará la asignación o una excepción motivada.

- La campaña podrá permitir todas las tiendas, incluir algunas o excluir otras; también podrá filtrar por ciudad, departamento, canal o grupo. Una tienda desactivada no recibirá nuevas ventas, pero conservará su historial.

- Si el vendedor cambia de tienda, las ventas previas conservarán tienda, ciudad y beneficio originales. El cambio se reflejará solo en operaciones posteriores.

- Cuando exista un incentivo para la tienda, identificar titular y medio de cobro sin alterar ni compartir el bono o los puntos del vendedor.

## 2.2 Control del registro en tienda

La pantalla de venta mostrará la tienda elegida, ciudad, campaña(s) elegibles y beneficios estimados antes de confirmar. El revisor verá esos mismos datos y podrá detectar una tienda incorrecta. Si se permite corregirla antes de aprobación, la corrección guardará valor anterior, motivo y responsable. Después de aprobación, la corrección seguirá un flujo controlado con recálculo y registros de ajuste cuando corresponda.

## 3 Registro y revisión de ventas

## 3.1 Datos y documentos

Cada registro deberá identificar vendedor, tienda, ciudad, producto y modelo del catálogo, serial o TAG, referencia del comprobante, monto si aplica, campaña elegible y respaldos fotográficos. Aprovechar las tres evidencias existentes y permitir que cada campaña o categoría determine nombres y obligatoriedad de sus documentos; los documentos de identidad de cliente final permanecen en su flujo correspondiente.

El serial o TAG se comprobará contra el catálogo de equipos autorizados, con normalización de formato y verificación del modelo. La pantalla informará si está autorizado, restringido, no encontrado o ya registrado en el mismo flujo y campaña. La existencia de un registro válido de cliente final no impedirá, por sí sola, el registro correspondiente de Bono Vendedor del mismo equipo. Una excepción comercial deberá tramitarse con evidencias y motivo antes de conceder beneficios. La carga de TAG permitirá conciliación de faltantes y duplicados.

## 3.2 Estados y revisión

- 1. Registrada: el vendedor ingresa datos; el sistema muestra beneficios estimados, sin otorgarlos todavía.

- 2. Pendiente de revisión: el supervisor o revisor asignado ve fotografías, modelo, serial, tienda y campañas aplicables.

- 3. Observada: se documenta el problema y se permite corregir y reenviar dentro del proceso autorizado, conservando versiones de evidencias.

- 4. Aprobada: se confirman los beneficios mediante una operación única que no se repite si un operador presiona dos veces o una solicitud se reintenta.


- 5. Rechazada o anulada: registrar motivo. Los beneficios pendientes no se acreditan; los ya acreditados se revierten con movimientos visibles y comprobación de pagos o premios consumidos.

El panel de revisión permitirá asignar expedientes por zona, tienda, equipo o campaña; priorizar pendientes; ver respaldos en una sola pantalla; y mostrar historial de decisiones. Si un revisor pierde permisos o cambia de ciudad, sus decisiones anteriores permanecerán firmadas.

## 3.3 Venta vinculada a varias campañas

La configuración definirá si una venta puede participar en varias campañas y qué beneficios se acumulan. El detalle de la venta mostrará bono, puntos, tickets y cupones de cada campaña por separado. Una misma venta no volverá a acreditar el mismo beneficio en la misma campaña al reenviarse o revisarse. Los cambios de reglas se aplicarán a nuevas ventas y requerirán un recálculo autorizado para modificar beneficios históricos.

## 4 Motor de beneficios del Bono Vendedor

## 4.1 Configuración por campaña y modelo

Administración configurará para cada modelo el monto de bono, los puntos, los tickets digitales y los cupones físicos cuando corresponda. Cada beneficio tendrá valor y activación propios, y podrá ser cero sin deshabilitar los otros. Se podrán definir valores distintos para vendedor y tienda, restricciones por ubicación y límites comerciales. La pantalla debe explicar cuál regla se aplicó y cuál no, y por qué.

Ejemplo: una venta aprobada puede generar Bs 30 y dos puntos para el vendedor. Otra campaña podría añadir tres tickets digitales al vendedor y un incentivo monetario distinto para la tienda. El motor guardará por separado cada movimiento con referencia a venta, campaña, producto, beneficiario y versión de regla. La existencia de puntos no debe impedir el pago de un bono, ni viceversa.

## 4.2 Cálculo y ajustes

- Procesar aprobación, beneficios y estado del serial con consistencia: si una parte falla, evitar ventas aprobadas con asignaciones incompletas.

- Evitar duplicados mediante identificadores únicos de venta y beneficio; las revalidaciones y recuperaciones de beneficios faltantes deberán ser seguras.

- Mostrar estimado, acreditado, cerrado, pagado y revertido como estados diferentes. El vendedor no confundirá un importe calculado con dinero ya pagado.

- Permitir ajustes de reglas futuras desde administración. Para corregir una venta histórica, crear un movimiento compensatorio con autorización y evidencia, sin sobreescribir el monto original.

## 5 Pagos y liquidaciones

El módulo de pagos gestionará cierres configurables por campaña, vendedor y, si aplica, tienda. Administración revisará ventas aprobadas sin pagar, generará un lote, consultará beneficiarios y montos, registrará el pago con comprobante y exportará un detalle conciliable. Una venta no podrá incluirse dos veces en un cierre pagado.

- Estados mínimos del pago: pendiente, en cierre, autorizado, pagado, observado y anulado con resolución. Registrar responsable, referencia y respaldo.

- La tienda y el vendedor, cuando ambos sean beneficiarios, tendrán montos y comprobantes independientes. La tienda del historial de una venta no cambiará por una reasignación posterior.

- Permitir observación de un beneficiario sin detener todo un lote y registrar diferencias o retenciones mediante ajustes identificables.

- Si se anula una venta ya pagada, abrir incidencia de regularización. No borrar el pago ni liberar el serial automáticamente sin revisar sus dependencias.

- El perfil del vendedor distinguirá bonos ganados, aprobados para pago y pagados, con detalle de las ventas que forman cada total.


## 6 Puntos y premios para vendedores

Cada vendedor tendrá una cartera de puntos por campaña, reconstruible a partir de movimientos acreditados, reservados, consumidos, revertidos y ajustados. Su perfil mostrará saldo disponible e historial enlazado a las ventas. Los puntos de campañas distintas no se mezclarán; si una campaña otorga puntos a la tienda, esta contará con una cartera independiente.

## 6.1 Catálogo y canje

Administración configurará premios con nombre, descripción, costo en puntos, imagen, existencia, condiciones y ámbito. El vendedor consultará los premios a los que puede acceder y solicitará un canje. El sistema reservará puntos y una unidad del premio de manera consistente; un operador revisará, aprobará, observará, rechazará o registrará entrega con comprobante. Cancelaciones y rechazos liberarán reservas según la etapa.

El tratamiento de sobrantes se elegirá en cada campaña: descontar solo el costo del premio o reiniciar a cero el saldo correspondiente después del canje, según la regla comercial aprobada. La interfaz mostrará el efecto antes de confirmar. Se debe definir el momento de consumo, puntos obtenidos mientras la solicitud está pendiente y devolución del saldo ante rechazo. El stock de premios directos permanecerá separado del inventario de premios de ruleta para cliente final, aunque administración vea ambos en un panel.

## 7 Tickets digitales cupones físicos y sorteos

Los tickets digitales de vendedor, tienda y cliente final tendrán identificadores únicos, fuentes y perfiles separados. Cuando una campaña de Bono Vendedor active tickets, cada venta aprobada generará la cantidad definida para su modelo; el vendedor o la tienda podrá verlos en su perfil con campaña, venta, TAG, estado y sorteo al que corresponde. Una campaña de solo bono y puntos no emitirá tickets. Administración podrá consultar y exportar cada participación y su motivo de invalidación.

Los cupones físicos serán un proceso independiente para controlar talonarios o lotes entregados a vendedores o tiendas: rango, cantidad, responsable, entrega, recepción y saldo. Un cupón registrado como entregado no equivale automáticamente a un ticket digital. La campaña decidirá si usa cupones, tickets o ambos y, si existe conversión entre ellos, registrará explícitamente su regla y la relación entre unidades para impedir duplicidad.

La tómbola reutilizable elegirá la fuente de tickets de su campaña y el tipo de participante: cliente final, vendedor o tienda. Aceptará premios configurables, segmentos de ciudades o tiendas, cantidad de ganadores y suplentes, reglas de repetición, simulación, acta y resultados conservados. El sorteo de cliente final mantiene sus reglas particulares; ganar un sorteo de cliente final no altera por defecto un sorteo de vendedor. No se intercambiarán participantes ni tickets de ambos flujos sin una regla comercial explícita.

## 8 Perfil del vendedor y experiencia de uso

El vendedor debe ver un panel útil para trabajar: campañas disponibles en sus tiendas, requisitos de venta, botón de registro, ventas pendientes u observadas, bonos estimados y pagados, puntos disponibles y tickets cuando correspondan. Cada venta abrirá modelo, serial, tienda, respaldos, estado, motivo de observación, beneficios por campaña y pago asociado. El historial tendrá búsqueda por serial y filtros de categoría, modelo, ciudad, tienda, campaña y estado.

Cuando una observación solicite corregir documentos, el vendedor recibirá una indicación concreta y podrá reenviar desde la misma venta si su estado lo permite. El sistema conservará el historial de los adjuntos sustituidos. Si el usuario trabaja desde teléfono, carga de fotos, lectura del serial y consulta de estados deberán seguir siendo utilizables.

## 9 Panel administrativo más completo

## 9.1 Campañas y catálogos

- Crear, editar, duplicar, pausar y archivar campañas; duplicar reglas sin copiar participantes, ventas o resultados. Vista previa de productos, tiendas, beneficios y restricciones antes de activarla.


- Gestionar categorías, modelos y variantes con códigos exactos, importación masiva, validación de filas y reporte de equivalencias o códigos desconocidos.

- Gestionar tiendas, vendedores, ciudades y asignaciones con búsqueda y cambios trazables; elegir tiendas participantes dentro de cada campaña.

- Gestionar seriales/TAG y sus estados con cargas supervisadas, conciliación de duplicados y restricciones, sin perder el historial de ventas asociadas.

- Configurar bonos, puntos, tickets, premios de canje y alcance de beneficiarios mediante formularios claros, importaciones y vista de prueba de cálculo.

- Administrar cola de revisión, cierres de pagos, bandeo de cliente final, ruleta, sorteos, exportaciones e incidencias desde paneles relacionados sin alterar el flujo que ya funciona.

## 9.2 Reglas por acción y alcance

La administración de credenciales y perfiles debe permitir crear usuarios, activar o suspender accesos, asignar campañas, tiendas y ciudades, restablecer acceso y revisar el historial de permisos. Además de los perfiles operativos existentes, se crearán al menos dos roles adicionales configurables y un rol Visor. El Administrador Total podrá nombrar roles y seleccionar por módulo las acciones ver, crear, editar, importar, revisar, aprobar, pagar, canjear, exportar, sortear, anular y administrar usuarios. La autorización se limitará al ámbito asignado a cada cuenta.

| Perfil propuesto | Uso | Límites esenciales |
| --- | --- | --- |
| Administrador Total | Gobierno de campañas, roles y bajas excepcionales. | Acceso global con motivo y auditoría para acciones sensibles. |
| Administrador Operativo | Configuración y operación cotidiana delegada. | Permisos elegidos; sin baja sensible por defecto. |
|   | Supervisor o Revisor Revisar ventas o registros asignados. | Solo su ámbito y acciones de revisión autorizadas. |
| Encargado de tienda | Consultar ventas e incentivos de su tienda, si se habilita. | Sin acceso a otras tiendas ni a pagos ajenos. |
| Visor | Consultar paneles y reportes asignados. | Sin cambios; exportación como permiso separado. |
| Vendedor o Impulsador | Registrar y consultar sus propias operaciones. | No aprobar ni borrar registros de terceros. |

La autorización deberá verificarse en la API y la base de datos además de ocultar botones. Los cambios de roles, permisos y alcance quedan en auditoría. Ningún usuario podrá aprobar su propio canje o manipular resultados de sorteos sin la autorización definida.

## 10 Edición corrección y botones de baja por Administrador Total

Cada módulo administrativo tendrá acciones visibles de Editar y, cuando corresponda, Eliminar o Dar de baja. La disponibilidad de Eliminar quedará reservada al Administrador Total en la interfaz y en el servidor. Antes de ejecutar la acción se mostrará qué datos dependen del registro y se exigirá motivo, confirmación y registro de auditoría. Para operaciones comerciales, la acción ordinaria será baja lógica o anulación: el dato deja de estar activo sin desaparecer del historial.

| Tipo de registro | Edición ordinaria | Baja del Administrador Total |
| --- | --- | --- |
| Campaña o regla | Editar borrador o crear nueva versión para ventas futuras. | Archivar; bloquear destrucción si tiene ventas o sorteos. |
| Modelo serial tienda usuario | Corregir atributos autorizados y conservar cambios. | Desactivar y bloquear nuevos usos; preservar vínculos históricos. |
| Venta y evidencias | Corregir mientras esté observada; luego ajuste supervisado. | Anular y revertir beneficios pendientes; resolver pagos y premios consumidos. |
| Pago puntos ticket canje | Registrar movimientos y observaciones documentados. | Invalidar o compensar; impedir borrado directo de movimientos cerrados. |
| Premio bandeo sorteo | Editar reglas no consumidas y manejar stock. | Desactivar premio; resultado oficial queda inmutable y se registra incidencia. |


Las operaciones existentes que permitan borrar ventas, liberar TAG o eliminar evidencias deberán quedar restringidas al Administrador Total también en el servidor. La incorporación de un botón exclusivo no protege las operaciones previas. La baja de una venta con pago, canje, bandeo entregado o ticket ganador bloqueará el borrado directo y abrirá una resolución administrativa con trazabilidad. La ficha deberá mostrar qué beneficios se revierten y cuáles requieren intervención manual antes de confirmar.

## 11 Filtros coherentes en todos los módulos

Las pantallas operativas usarán filtros compartidos de campaña, categoría, producto, modelo o SKU, departamento, ciudad y tienda, siempre que esos datos apliquen. Se añadirán filtros particulares de vendedor, estado, beneficiario, pago, tipo de premio o TAG. Elegir categoría limitará productos; elegir departamento limitará ciudades y tiendas. Se mostrarán filtros activos, cantidad total y botón Limpiar. La exportación comprenderá todo el resultado filtrado y autorizado, no únicamente las filas visibles.

| Módulo | Filtros mínimos además de búsqueda | Necesidad empresarial |
| --- | --- | --- |
| Campañas y reglas | Campaña, categoría, producto/modelo, ciudad y tienda. | Revisar qué está habilitado y dónde. |
| Vendedores tiendas usuarios | Ciudad, tienda, rol, estado y campaña asignada. | Administrar equipos y permisos. |
| Ventas y revisión | Campaña, categoría, modelo, ciudad, tienda, vendedor y estado. | Encontrar ventas y distribuir revisión. |
| Seriales y productos | Categoría, modelo, estado, serial y ubicación cuando exista. | Detectar faltantes y usos repetidos. |
| Bonos pagos puntos canjes | Campaña, categoría, modelo, ciudad, tienda, beneficiario y estado. | Conciliar dinero, saldo y premios. |
| Bandeo e inventario | Campaña, categoría, producto, modelo, ciudad, tienda, impulsador, premio y estado. | Conservar el módulo existente y completar búsqueda, control y exportación. |
| Cliente final y sorteos | Campaña, producto, ciudad, tienda, canal, premio y estado. | Mantener una consulta transversal sin mezclar públicos. |
| Paneles reportes auditoría | Mismos filtros pertinentes más acción y responsable. | Comparar cifras y reconstruir decisiones. |

El usuario con alcance limitado no debe recuperar otras tiendas o ciudades cambiando manualmente los parámetros de consulta. Todos los totales, gráficos, listados y exportaciones deben respetar los mismos filtros y reglas de acceso.

## 12 Dashboards reportes y conciliación

El dashboard principal presentará campañas activas y permitirá elegir una campaña o una vista consolidada. Las tarjetas deben distinguir ventas registradas, pendientes, observadas, aprobadas y rechazadas; bonos acreditados, pendientes y pagados; puntos ganados, disponibles y canjeados; tickets activos; cupones físicos entregados; solicitudes de premios; y stock de bandeo. Cada tarjeta abrirá su lista de origen con filtros equivalentes. Un total de pantalla debe coincidir con la suma del reporte exportado del mismo ámbito.

El panel del Administrador Total mostrará la operación global. Los paneles de Supervisor, encargado de tienda, operador y Visor usarán su alcance de campañas, ciudades y tiendas. Un vendedor verá únicamente sus ventas y beneficios. El dashboard distinguirá siempre vendedor y cliente final para que una cifra de bandeo no se interprete como bono ni un ticket de cliente como ticket de vendedor.

- Ventas por campaña, categoría, modelo, ciudad, tienda, vendedor y estado, con serial, revisión y evidencia enlazadas.

- Bonos estimados, aprobados, incluidos en cierre, pagados y ajustados; detalle por vendedor y tienda beneficiaria, si se configura.

- Puntos acreditados, reservados y utilizados; movimientos y saldo reconstruible por campaña. Canjes por premio, operador, estado, stock y comprobante.

- Tickets digitales emitidos y anulados, elegibilidad por segmento, acta de sorteo, ganadores y suplentes; separados de cliente final.


- Bandeo y ruleta existentes: existencias asignadas, entregas, devoluciones e incidencias por impulsador y ubicación, con datos comparables al Bono Vendedor sin fusionar resultados.

- Tablero ejecutivo con indicadores que abran el listado de origen. Exportar identificadores de registros, campaña, vendedor, tienda, regla aplicada y estado, además de los totales.

## 13 TAG compartido entre flujos sin duplicados

El mismo TAG autorizado de un equipo podrá relacionarse con el registro de Bono Vendedor y con el registro de cliente final o bandeo de la campaña cuando ambas participaciones estén habilitadas. Registrar el equipo una vez en el catálogo de TAG y mantener participaciones independientes por campaña y flujo. La existencia de una venta del vendedor no bloqueará al cliente final, y la participación del cliente final no bloqueará al vendedor. Cada flujo validará sus propios requisitos y generará únicamente sus beneficios.

| Caso | Comportamiento obligatorio |
| --- | --- |
| TAG registrado por vendedor y luego por cliente final | Permitir la segunda participación en el flujo distinto de la campaña; enlazar ambas al mismo equipo y mostrar beneficiarios separados. |
| TAG registrado por cliente final y luego por vendedor | Permitir el registro de vendedor con la misma regla, sin borrar o modificar la participación del cliente. |
| Reintento del mismo TAG en Bono Vendedor | Impedir otra acreditación en esa campaña y flujo; mostrar la venta original y su estado. |
| Reintento del mismo TAG en cliente final o bandeo | Impedir doble participación o doble premio en esa campaña y flujo; conservar la primera operación. |
| TAG en otra campaña | Aplicar la política de reutilización configurada para esa campaña sin asumir una prohibición global. |
| Anulación de un flujo | Revertir solo sus beneficios y conservar intacto el otro; mantener la relación histórica con el equipo. |

La clave de unicidad deberá contemplar al menos campaña, TAG y tipo de participación, además de controles adicionales por beneficiario o comprobante cuando sean necesarios. Los estados “usado en Bono Vendedor” y “usado en cliente final” se mantendrán por flujo; un indicador global de TAG usado no podrá bloquear automáticamente el otro. La ficha del TAG mostrará sus participaciones y revisiones sin duplicar el registro maestro. La importación de TAG debe detectar coincidencias de formato y modelo antes de crear nuevos equipos.

El módulo de bandeo y la ruleta conservan su mecánica, premios e inventario por impulsador. Se añadirá la búsqueda y los filtros de campaña, categoría, producto, modelo, ciudad, tienda, impulsador, TAG, premio y estado a sus pantallas y exportaciones. Su resultado seguirá separado del bono y los puntos del vendedor, aunque pueda consultarse conjuntamente en el dashboard.

## 14 Pruebas de aceptación

Las siguientes verificaciones forman parte de la entrega funcional. Cada prueba tendrá datos de entrada, resultado esperado y evidencia visible en pantalla y en los reportes.

- 1. Asignar un vendedor a dos tiendas y registrar ventas en ambas; comprobar identificación de tienda, ciudad y filtro histórico al cambiar su asignación.

- 2. Excluir una tienda de una campaña y comprobar rechazo explicado sin impedir ventas de otras campañas válidas.

- 3. Registrar una venta con tres respaldos y serial válido; observarla, sustituir un archivo y aprobarla conservando historial.

- 4. Aprobar una venta con bono y puntos por modelo; reintentar la aprobación y verificar que no duplique beneficios.

- 5. Aplicar dos campañas al mismo modelo según reglas autorizadas y comparar detalle, total y versión de regla en cada una.

- 6. Registrar una venta con serial repetido, restringido y no encontrado; comprobar bloqueos y resolución autorizada.


- 7. Crear un cierre y registrar un pago con comprobante; impedir que la misma venta pagada vuelva a liquidarse.

- 8. Aprobar y rechazar canjes; comprobar reserva, liberación, saldo y stock incluso ante dos solicitudes simultáneas.

- 9. Activar tickets para una campaña de vendedores, mostrar sus participaciones en el perfil y demostrar que no se mezclan con tickets de clientes finales.

- 10. Aplicar filtros de producto, categoría y ciudad a ventas, pagos, puntos y reportes; comparar exportación completa con los totales visibles.

- 11. Asignar rol operativo configurable y rol Visor con límites de tienda; verificar bloqueo de escritura y acceso fuera de ámbito también mediante API.

- 12. Intentar baja de venta con Revisor, Administrador Operativo y Administrador Total; comprobar que solo este último dispone de la acción autorizada.

- 13. Anular una venta aprobada con beneficios no consumidos y revisar reversión; intentar borrar una venta pagada y confirmar bloqueo e incidencia.

- 14. Registrar un TAG primero en Bono Vendedor y luego en cliente final; repetir en orden inverso con otro TAG y comprobar ambas participaciones separadas.

- 15. Reintentar el mismo TAG dos veces en vendedor y dos veces en bandeo de la misma campaña; comprobar que cada flujo admita solo su primera participación válida.

- 16. Anular únicamente la participación del vendedor y comprobar que el cliente final, su premio y sus tickets permanezcan intactos.

- 17. Filtrar el bandeo existente por categoría, modelo, ciudad, tienda, impulsador, TAG y premio; comparar los resultados con su exportación.

- 18. Abrir tarjetas del dashboard de ventas, bonos, puntos, tickets, cupones y bandeo; comprobar que conduzcan al detalle y que los totales coincidan.

## 15 Resultado funcional requerido

La plataforma Skyworth deberá permitir que GEQ configure y opere diversas campañas desde el panel: productos y tiendas participantes, venta validada, bono, puntos, cupones físicos, tickets digitales, premios, canjes, pagos y sorteos según la combinación definida. Administración Total gestionará usuarios, credenciales, roles, permisos, bajas e incidencias; los demás perfiles verán y ejecutarán únicamente lo asignado. Dashboards, filtros y exportaciones deberán ofrecer información completa y conciliable por campaña, categoría, producto, ciudad y tienda.

El TAG se utilizará una vez en cada flujo habilitado de una misma campaña y podrá ser compartido entre Bono Vendedor y cliente final o bandeo sin bloquearse mutuamente. La mecánica de bandeo ya desarrollada se mantendrá y completará sus filtros. Estas condiciones, junto con las pruebas anteriores, definen el comportamiento que debe entregar la ampliación para que Skyworth pueda operar campañas posteriores con parámetros del sistema.
