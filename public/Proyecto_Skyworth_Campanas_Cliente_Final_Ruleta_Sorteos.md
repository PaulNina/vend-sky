## GRUPO EMPRESARIAL QUISBERT S.R.L.

## PROYECTO SKYWORTH

Campañas Cliente Final, Ruleta de Premios, Tickets y Sorteos

Documento funcional para presentación y desarrollo

Santa Cruz de la Sierra, Bolivia

Septiembre 2026


## 1. Resumen ejecutivo

Se propone ampliar la plataforma actual de campañas de Skyworth para incorporar una experiencia completa dirigida al cliente final, integrando en un mismo ecosistema el registro del producto, bandeo, ruleta de premios, control de inventario, tickets, validación por supervisores, sorteos quincenales y un sorteo final. El sistema deberá reutilizar y mantener las funciones ya existentes del Bono Vendedor, evitando desarrollar soluciones aisladas para cada campaña.

## Objetivo principal

Contar con una plataforma configurable por campaña, con una única base de datos y reglas de control que permitan administrar de forma trazable clientes, seriales/TAG, premios, tickets, inventarios, evidencias, aprobaciones y ganadores.

## 2. Alcance general

- Registro de clientes finales mediante impulsador/bandeo, página web y chatbot.

- Validación de serial/TAG contra la base de productos Skyworth.

- Ruleta de premios vinculada al inventario disponible de cada impulsador.

- Registro fotográfico de la entrega del premio inmediato.

- Generación de tickets según producto o modelo participante.

- Perfil de Supervisor para revisión y aprobación de registros y tickets.

- Sorteos quincenales mediante tómbola digital.

- Sorteo final independiente, con participación de todos los tickets válidos de la campaña.

- Conservación e integración del módulo Bono Vendedor actualmente existente.

- Panel administrativo, reportes, trazabilidad y exportación a Excel.

## 3. Principios funcionales

- Una sola base de datos para todos los canales de registro.

- Un serial/TAG no podrá duplicarse dentro de la misma campaña.

- La ruleta solo podrá asignar premios con stock disponible.

- Los tickets podrán generarse al registrar la compra, pero solo participarán en sorteos después de la aprobación del Supervisor.

- Toda aprobación, observación, rechazo, entrega de premio o reversión deberá quedar registrada con usuario, fecha y motivo cuando corresponda.


## 4. Registro del cliente final

El cliente podrá ingresar a la campaña por tres vías. Independientemente del canal de origen, todos los registros deberán converger en la misma base para evitar duplicidades y mantener un único historial.

## 4.1 Registro mediante impulsador / bandeo

- Nombre y apellido del cliente.

- C.I.

- Número de celular.

- Ciudad y punto de venta.

- Producto/modelo.

- Serial o TAG.

- Fecha de compra.

- Adjuntos y respaldos definidos por la campaña.

- Carnet de identidad: anverso y reverso.

El sistema validará el serial/TAG. Si el registro cumple las condiciones mínimas de la campaña, se habilitará la ruleta de premios. El registro quedará posteriormente sujeto a revisión del Supervisor para habilitar sus tickets en los sorteos.

## 4.2 Registro mediante página web

Se dispondrá de una landing de Skyworth para que el cliente registre directamente sus datos, producto y documentación. El flujo deberá ejecutar las mismas validaciones de serial/TAG, campaña, duplicidad y documentos requeridos.

## 4.3 Registro mediante chatbot

El chatbot/WhatsApp deberá guiar al cliente en el registro de sus datos, producto, serial/TAG y respaldos, confirmando al final la recepción del registro. Los datos deberán almacenarse en la misma base utilizada por la web y el bandeo.

## 5. Bandeo y ruleta de premios

A diferencia de campañas anteriores en las que el premio estaba predeterminado por el tamaño o modelo del televisor, en Skyworth el premio inmediato se definirá por azar mediante una ruleta. La participación en la ruleta no reemplaza la participación en los sorteos posteriores.

| Registro | Validación | Girar | Premio | Foto | Descuento |   |
| --- | --- | --- | --- | --- | --- | --- |
|   | serial/TAG | ruleta |   | entrega | stock | Pendiente |
| → | → | → | → | → | → | Supervisor |

## 5.1 Reglas de la ruleta

- Cada impulsador tendrá un inventario individual de premios.

- La ruleta deberá excluir automáticamente cualquier premio con stock igual a cero.

- Marketing/Administración podrá definir los premios, imágenes, cantidades y, si se requiere, probabilidades.

- El resultado ganador deberá quedar registrado y no podrá modificarse manualmente sin una reversión autorizada.

- La entrega deberá respaldarse mediante una fotografía.

- Al confirmar la entrega, el stock del impulsador disminuirá automáticamente.


## 6. Inventario de premios por impulsador

El módulo deberá permitir asignar insumos/promocionales a cada impulsador antes o durante la campaña y controlar el saldo en tiempo real.

| Premio | Asignado | Entregado | Saldo |
| --- | --- | --- | --- |
| Toma Todo | 10 | 7 | 3 |
| Gorra | 10 | 6 | 4 |
| Vaso | 10 | 8 | 2 |
| Caja promocional | 5 | 4 | 1 |

Al cierre de campaña: cantidad asignada - cantidad entregada = cantidad física a devolver o conciliar por el impulsador.

## 7. Tickets para sorteos

Cada producto o modelo podrá tener configurada una cantidad de tickets. Los valores serán definidos por Marketing para cada campaña.

| Producto / modelo | Tickets (ejemplo) |
| --- | --- |
| TV 32" | 1 |
| TV 43" | 2 |
| TV 55" | 3 |
| TV 65" | 5 |

Los tickets quedarán asociados, como mínimo, a Cliente + C.I. + celular + serial/TAG + modelo + campaña + periodo de sorteo.

## 8. Perfil de Supervisor y validación

Se mantendrá un perfil de Supervisor independiente del impulsador/vendedor y del Administrador. El Supervisor revisará los registros asignados a su zona, tienda, personal o campaña y será el segundo nivel de control antes de habilitar tickets para sorteo.

## 8.1 Documentación obligatoria

Para habilitar los tickets, el registro deberá contar con cinco respaldos:

- Tres (3) adjuntos obligatorios actualmente definidos por la campaña / flujo vigente.

- Carnet de identidad - anverso.

- Carnet de identidad - reverso.

## Dato pendiente de definición

Se conserva la referencia a “3 adjuntos obligatorios” hasta que Skyworth/GEQ confirme el nombre y contenido exacto de cada respaldo.

## 8.2 Estados de validación

| Estado | Significado | Tickets | Acción |
| --- | --- | --- | --- |
| PENDIENTE | Registro recibido, aún no revisado. | No habilitados | Esperar revisión. |


GRUPO EMPRESARIAL QUISBERT S.R.L. | SKYWORTH

| EN REVISIÓN | Supervisor verificando datos y adjuntos. | No habilitados | Revisión. |
| --- | --- | --- | --- |
| OBSERVADO | Falta o existe información incorrecta. | No habilitados | Corregir y reenviar. |
| RECHAZADO | Registro inválido. | No participan | Cerrar con motivo. |
| APROBADO | Cumple requisitos. | Habilitados | Participa en sorteos. |

## 9. Panel del Supervisor

El Supervisor deberá disponer de un panel simple y orientado a revisión rápida, con indicadores, filtros y vista completa de los respaldos.

- Contadores: pendientes, en revisión, observados, aprobados y rechazados.

- Filtros por campaña, fecha, regional, ciudad, tienda, impulsador, cliente, C.I., celular, serial/TAG y estado.

- Visualización en una sola pantalla de datos del cliente, producto, serial/TAG y cinco respaldos.

- Acciones: APROBAR, OBSERVAR y RECHAZAR.

- Campo de motivo obligatorio para observaciones y rechazos.

- Registro de quién revisó, fecha/hora y decisión tomada.

## 10. Sorteos quincenales

Durante la campaña se realizarán sorteos cada 15 días mediante una tómbola digital. La tómbola utilizará únicamente tickets HABILITADOS y correspondientes al periodo configurado.

- Cada sorteo tendrá fecha, periodo y premio(s) configurables.

- Un cliente que gane un sorteo quincenal no podrá volver a ganar otro sorteo quincenal de la misma campaña.

- Los tickets de un ganador quincenal se excluirán automáticamente de las siguientes tómbolas quincenales.

- El resultado deberá quedar guardado con fecha, ticket, cliente, premio y evidencia del sorteo.

## 11. Sorteo final - Bs 100.000

Al finalizar la campaña se realizará una tómbola final independiente por un premio monetario total de Bs 100.000, sujeto a la mecánica final que defina Skyworth.

## Regla clave

Los clientes que hayan ganado en un sorteo quincenal SÍ podrán participar en el sorteo final. El filtro de exclusión aplica únicamente entre sorteos quincenales.

La distribución del premio final (un ganador, varios ganadores o montos parciales) deberá quedar configurable y confirmarse antes de la puesta en producción.

## 12. Dos tómbolas diferenciadas

| Característica | Tómbola quincenal | Tómbola final |
| --- | --- | --- |
| Participantes | Tickets habilitados del periodo | Todos los tickets habilitados de la campaña |
| Ganadores anteriores | Excluidos de siguientes quincenas Incluidos nuevamente |   |
| Premio | Televisores / productos | Bs 100.000 (mecánica por definir) |


Historial

Obligatorio

Obligatorio

## 13. Integración con Bono Vendedor

El proyecto deberá conservar el Bono Vendedor actualmente existente y presentarlo como un módulo de la misma plataforma, manteniendo su lógica de registro, serial/TAG, validación, tickets, aprobación y pago/incentivo según corresponda.

La plataforma consolidada podrá contener los siguientes módulos:

- Bono Vendedor

- Cliente Final

- Bandeo

- Ruleta de Premios

- Inventario de Premios

- Tickets

- Validación de Supervisor

- Sorteos Quincenales

- Sorteo Final

- Reportes y Auditoría

## 14. Roles y permisos

| Rol | Funciones principales | Puede aprobar | Alcance |
| --- | --- | --- | --- |
| Administrador | Configura campañas, premios, tickets, periodos, usuarios, inventarios y reportes. | Sí / según permisos | Global |
| Supervisor | Revisa registros, documentos y habilita tickets. | Sí | Zona / equipo / campaña asignada |
| Impulsador / Vendedor | Registra cliente, serial, participa en ruleta y carga evidencia. | No | Sus registros e inventario |
| Cliente Final | Registra compra por web/chatbot y consulta confirmación cuando aplique. | No | Sus propios datos |

## 15. Panel administrativo

- Crear y editar campañas: nombre, marca, vigencia, ciudades, tiendas y productos.

- Configurar premios de ruleta, imágenes, probabilidades y stock.

- Asignar inventario por impulsador.

- Definir tickets por producto/modelo.

- Configurar periodos y premios de sorteos quincenales.

- Configurar el sorteo final.

- Gestionar perfiles, permisos y asignaciones de supervisores.

- Consultar participantes, evidencias, premios, inventarios, tickets, estados y ganadores.


## 16. Reportes y exportación

- Clientes registrados por canal (bandeo, web, chatbot).

- Registros por ciudad, tienda, campaña e impulsador.

- Productos, modelos y seriales/TAG registrados.

- Premios asignados, entregados y saldo por impulsador.

- Evidencias de entrega.

- Tickets generados, pendientes, observados, rechazados y habilitados.

- Ganadores por periodo y ganador(es) final(es).

- Historial de aprobaciones, observaciones, rechazos y reversiones.

- Exportación a Excel.


## 17. Flujo general propuesto

| 1 | Cliente compra producto Skyworth |
| --- | --- |
| 2 | Registro por impulsador/bandeo, web o chatbot |
| 3 | Validación automática de serial/TAG y reglas de campaña |
| 4 | Si corresponde bandeo: ruleta → premio → foto → descuento de inventario |
| 5 | Carga/verificación de 3 adjuntos + C.I. anverso + C.I. reverso |
| 6 | Supervisor revisa el registro |
| 7 | Aprobado → tickets habilitados | Observado/Rechazado → no participa |
| 8 | Tómbola quincenal: solo tickets habilitados del periodo |
| 9 | Ganador quincenal: excluido de siguientes quincenas |
| 10 | Tómbola final: todos los tickets habilitados, incluidos ganadores quincenales |

## 18. Reglas críticas de negocio

- No permitir serial/TAG duplicado en una misma campaña.

- No permitir que la ruleta entregue un premio sin stock disponible.

- No habilitar tickets para sorteo mientras el registro no esté APROBADO.

- No permitir que un ganador quincenal vuelva a ganar otro sorteo quincenal.

- Sí permitir que un ganador quincenal participe en la tómbola final.

- Toda modificación excepcional deberá quedar trazada.

- Los tres canales de registro deben compartir la misma base y las mismas reglas de validación.

## 19. Definiciones pendientes antes de desarrollo final

- Nombre y contenido exacto de los tres adjuntos obligatorios actuales.

- Lista final de premios inmediatos de la ruleta.

- Stock inicial y reglas/probabilidades por premio.

- Cantidad definitiva de tickets por producto/modelo.

- Calendario exacto de sorteos quincenales y premios de cada periodo.

- Mecánica del premio final de Bs 100.000 (uno o varios ganadores).

- Reglas de corrección/reenvío para registros observados.

- Alcance exacto de cada Supervisor por regional, tienda, equipo o campaña.

- Política de tratamiento, retención y acceso a documentos de identidad y demás datos personales.

## Resultado esperado

Una plataforma única y reutilizable para campañas Skyworth, con control integral de registros, premios, inventarios, tickets, validaciones y sorteos.


## 20. Aprobaciones / observaciones

Este documento constituye una propuesta funcional inicial y deberá ser validado por las áreas involucradas antes del desarrollo definitivo.

| Área / Responsable | Observaciones | Visto bueno |
| --- | --- | --- |
| Skyworth / Marketing |   |   |
| Sistemas / Desarrollo |   |   |
| Dirección / Administración |   |   |
