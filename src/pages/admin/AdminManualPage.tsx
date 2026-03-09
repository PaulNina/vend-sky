import { useState, useMemo, useRef } from "react";
import {
  BarChart3, Target, Package, Hash, FileText, Users, ShieldCheck,
  ClipboardCheck, Mail, Settings, BookOpen, DollarSign, FileCode,
  UserCheck, GitCompare, ArrowRight, CheckCircle2, XCircle, Eye,
  Upload, Download, Search, Filter, Keyboard, AlertTriangle, QrCode,
  Globe, Layers, Database, RefreshCw, ChevronRight, Info, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ─── helpers ─── */
function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ButtonRef({ rows }: { rows: { icon: string; location: string; fn: string }[] }) {
  return (
    <div className="rounded-lg border overflow-hidden my-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="text-left px-3 py-2 font-medium">Botón / Icono</th>
            <th className="text-left px-3 py-2 font-medium">Ubicación</th>
            <th className="text-left px-3 py-2 font-medium">Función</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{r.icon}</td>
              <td className="px-3 py-2">{r.location}</td>
              <td className="px-3 py-2">{r.fn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowDiagram({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 my-3 p-4 rounded-lg bg-muted/30 border">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs whitespace-nowrap">{s}</Badge>
          {i < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </span>
      ))}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 my-3 text-sm">
      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

/* ─── PAGE ─── */
export default function AdminManualPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display tracking-wide">Manual del Administrador</h1>
          <p className="text-sm text-muted-foreground">Guía completa de cada módulo, botón y flujo del panel de administración SKYWORTH.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs">🏠 Visión General</TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">🛒 Ventas</TabsTrigger>
          <TabsTrigger value="data" className="text-xs">📦 Datos</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">📈 Reportes</TabsTrigger>
          <TabsTrigger value="system" className="text-xs">⚙️ Sistema</TabsTrigger>
          <TabsTrigger value="shortcuts" className="text-xs">⌨️ Atajos</TabsTrigger>
          <TabsTrigger value="faq" className="text-xs">❓ FAQ</TabsTrigger>
          <TabsTrigger value="glossary" className="text-xs">📖 Glosario</TabsTrigger>
        </TabsList>

        {/* ═══════════ VISIÓN GENERAL ═══════════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Arquitectura del Sistema</CardTitle>
              <CardDescription>Flujo principal del proceso de ventas y comisiones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                El sistema SKYWORTH gestiona campañas de incentivos para vendedores. Los vendedores registran ventas con evidencia fotográfica,
                que son revisadas por supervisores de ciudad, auditadas por supervisores generales, y finalmente se generan comisiones para pago.
              </p>

              <h4 className="font-semibold text-foreground text-sm">Flujo Principal</h4>
              <FlowDiagram steps={[
                "Vendedor registra venta",
                "Sube fotos (TAG + Póliza + Nota)",
                "Revisor de ciudad aprueba/rechaza",
                "Auditoría por muestreo",
                "Cierre semanal automático",
                "Generación de liquidación",
                "Pago de comisiones",
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Roles del Sistema</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { role: "Vendedor", desc: "Registra ventas, sube evidencia, consulta ranking y comisiones." },
                  { role: "Revisor de Ciudad", desc: "Revisa ventas de su ciudad asignada, aprueba o rechaza con motivo." },
                  { role: "Supervisor", desc: "Audita aprobaciones por muestreo, puede revertir decisiones." },
                  { role: "Admin", desc: "Acceso completo: campañas, productos, seriales, comisiones, configuración." },
                ].map((r) => (
                  <div key={r.role} className="p-3 rounded-lg border bg-card">
                    <Badge variant="outline" className="mb-1">{r.role}</Badge>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                ))}
              </div>

              <h4 className="font-semibold text-foreground text-sm">Estructura de Navegación</h4>
              <p className="text-sm text-muted-foreground">
                El panel lateral (sidebar) agrupa los módulos. Se puede colapsar para mostrar solo iconos.
                La barra superior muestra el trigger del sidebar, el logo y el email del usuario logueado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Ciclo de Vida de una Campaña</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FlowDiagram steps={[
                "Crear campaña",
                "Configurar productos",
                "Importar seriales",
                "Abrir registro de vendedores",
                "Vendedores se inscriben",
                "Comienza campaña",
                "Ventas + Revisiones semanales",
                "Cierre de periodos",
                "Liquidación + Pago",
                "Campaña finaliza",
              ]} />
              <Tip>Las campañas pueden tener periodos automáticos (semanal, quincenal, mensual o personalizado) que se cierran automáticamente.</Tip>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ DASHBOARD ═══════════ */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <SectionHeader icon={BarChart3} title="Dashboard Gerencial" description="Vista ejecutiva con KPIs, gráficos y tablas de resumen." />
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">KPIs Principales (tarjetas superiores)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { kpi: "Total Ventas", desc: "Cantidad de ventas registradas en el periodo seleccionado." },
                  { kpi: "Bono Total (Bs)", desc: "Suma del bono en bolivianos de todas las ventas aprobadas." },
                  { kpi: "Tasa de Aprobación", desc: "Porcentaje de ventas aprobadas vs total revisadas." },
                  { kpi: "Por Revisar", desc: "Ventas pendientes de revisión." },
                ].map((k) => (
                  <div key={k.kpi} className="p-3 rounded-lg border bg-card">
                    <p className="text-sm font-medium text-foreground">{k.kpi}</p>
                    <p className="text-xs text-muted-foreground">{k.desc}</p>
                  </div>
                ))}
              </div>

              <h4 className="font-semibold text-foreground text-sm">Filtros</h4>
              <ButtonRef rows={[
                { icon: "Select (Campaña)", location: "Barra superior", fn: "Filtra todos los datos por la campaña seleccionada." },
                { icon: "Select (Periodo)", location: "Barra superior", fn: "Filtra por periodo semanal dentro de la campaña." },
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Secciones del Dashboard</h4>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="chart">
                  <AccordionTrigger className="text-sm">📊 Gráfico de Ventas por Ciudad</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Gráfico de barras que muestra la cantidad de ventas aprobadas agrupadas por ciudad.
                    Se actualiza automáticamente al cambiar campaña o periodo. Utiliza la función <code>get_sales_by_city</code>.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="ranking">
                  <AccordionTrigger className="text-sm">🏆 Tabla de Ranking</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Tabla con los vendedores ordenados por puntos totales. Muestra nombre, tienda, ciudad, unidades, puntos y bono Bs.
                    Se calcula con la función <code>get_campaign_ranking</code>.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="products">
                  <AccordionTrigger className="text-sm">📦 Productos Top</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Lista los productos más vendidos en la campaña, con unidades totales y bono acumulado.
                    Usa la función <code>get_top_products</code>.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="activity">
                  <AccordionTrigger className="text-sm">🕐 Actividad Reciente</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Muestra las últimas ventas registradas con estado, vendedor, producto y fecha.
                    Permite una visión rápida de la actividad en tiempo real.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ VENTAS ═══════════ */}
        <TabsContent value="sales" className="space-y-4 mt-4">
          {/* Campañas */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Target} title="Campañas" description="Gestión completa del ciclo de vida de campañas de incentivos." />
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">Crear / Editar Campaña</h4>
              <p className="text-sm text-muted-foreground">
                Al crear una campaña se configuran: nombre, slug (para URL pública de inscripción), fechas de inicio y fin,
                modo de periodos, y opciones avanzadas como validación IA de fechas.
              </p>
              <ButtonRef rows={[
                { icon: "+ Nueva Campaña", location: "Esquina superior derecha", fn: "Abre formulario de creación de campaña." },
                { icon: "✏️ (lápiz)", location: "Fila de la campaña", fn: "Edita la configuración de la campaña existente." },
                { icon: "👥 Inscritos", location: "Fila de la campaña", fn: "Ver lista de vendedores inscritos y gestionar inscripciones." },
                { icon: "🔗 Slug", location: "Formulario", fn: "URL amigable para la página de inscripción pública (/c/mi-campaña)." },
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Configuración de Periodos</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>Semanal:</strong> Periodos de 7 días que se generan automáticamente.</p>
                <p>• <strong>Quincenal:</strong> Periodos de 15 días.</p>
                <p>• <strong>Mensual:</strong> Periodos de 30 días.</p>
                <p>• <strong>Personalizado:</strong> Se define la cantidad de días manualmente.</p>
              </div>
              <Tip>
                Activar "Cierre automático de periodos" hará que el sistema cierre y genere reportes automáticamente al finalizar cada periodo.
              </Tip>

              <h4 className="font-semibold text-foreground text-sm">Opciones Avanzadas</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>Validación IA de fecha:</strong> Usa inteligencia artificial para verificar que la fecha en la nota de venta coincida con la fecha registrada.</p>
                <p>• <strong>Registro habilitado:</strong> Permite/bloquea la inscripción de vendedores.</p>
                <p>• <strong>Requiere aprobación:</strong> Los vendedores deben ser aprobados por un admin antes de poder registrar ventas.</p>
                <p>• <strong>Ventas dentro de campaña:</strong> Solo permite registrar ventas con fecha dentro del rango de la campaña.</p>
              </div>
            </CardContent>
          </Card>

          {/* Revisiones */}
          <Card>
            <CardHeader>
              <SectionHeader icon={ClipboardCheck} title="Revisiones" description="Módulo de revisión de ventas con evidencia fotográfica." />
            </CardHeader>
            <CardContent className="space-y-4">
              <FlowDiagram steps={[
                "Venta registrada (pendiente)",
                "Revisor abre detalle",
                "Verifica fotos (TAG + Póliza + Nota)",
                "Aprueba o Rechaza con motivo",
                "Venta cambia de estado",
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Filtros Disponibles</h4>
              <ButtonRef rows={[
                { icon: "Select (Estado)", location: "Barra de filtros", fn: "Filtra por: Pendiente, Aprobada, Rechazada, Cerrada." },
                { icon: "Select (Ciudad)", location: "Barra de filtros", fn: "Filtra ventas por la ciudad del vendedor." },
                { icon: "Select (Campaña)", location: "Barra de filtros", fn: "Filtra por campaña activa." },
                { icon: "🔍 Buscar", location: "Campo de texto", fn: "Busca por serial, nombre del vendedor o producto." },
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Acciones en Detalle de Venta</h4>
              <ButtonRef rows={[
                { icon: "✅ Aprobar", location: "Panel de detalle", fn: "Aprueba la venta. Cambia estado a 'approved'." },
                { icon: "❌ Rechazar", location: "Panel de detalle", fn: "Rechaza la venta con motivo obligatorio." },
                { icon: "← → (flechas)", location: "Teclado", fn: "Navega entre ventas sin usar el mouse." },
                { icon: "Tecla A", location: "Teclado", fn: "Atajo rápido para aprobar la venta actual." },
              ]} />

              <Tip>
                Si la campaña tiene validación IA activada, las ventas con discrepancia de fecha mostrarán un ícono de alerta ⚠️ 
                con el nivel de confianza de la IA.
              </Tip>

              <h4 className="font-semibold text-foreground text-sm">Evidencia Fotográfica</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>TAG:</strong> Foto de la etiqueta del producto Skyworth con serial visible.</p>
                <p>• <strong>Póliza:</strong> Foto de la póliza de garantía o factura.</p>
                <p>• <strong>Nota de Venta:</strong> Foto de la nota/recibo de venta con fecha visible.</p>
              </div>
            </CardContent>
          </Card>

          {/* Auditoría */}
          <Card>
            <CardHeader>
              <SectionHeader icon={ShieldCheck} title="Auditoría" description="Control de calidad sobre las aprobaciones realizadas por revisores." />
            </CardHeader>
            <CardContent className="space-y-4">
              <FlowDiagram steps={[
                "Sistema selecciona muestra aleatoria",
                "Supervisor revisa fotos de ventas aprobadas",
                "Marca OK (confirma) o Revierte (con motivo)",
                "Se registra auditoría en supervisor_audits",
              ]} />

              <ButtonRef rows={[
                { icon: "✅ OK", location: "Panel de auditoría", fn: "Confirma que la aprobación fue correcta." },
                { icon: "↩️ Revertir", location: "Panel de auditoría", fn: "Revierte la aprobación. La venta vuelve a 'pendiente' y se registra el motivo." },
              ]} />

              <Tip>
                La auditoría es por muestreo: no se revisan todas las ventas, solo una selección aleatoria de las aprobadas.
                Esto permite detectar patrones de revisión incorrecta.
              </Tip>
            </CardContent>
          </Card>

          {/* Vendedores */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Users} title="Vendedores (Kardex)" description="Gestión del directorio de vendedores activos." />
            </CardHeader>
            <CardContent className="space-y-4">
              <ButtonRef rows={[
                { icon: "🔍 Buscar", location: "Barra superior", fn: "Busca por nombre, email o teléfono del vendedor." },
                { icon: "Select (Ciudad)", location: "Barra de filtros", fn: "Filtra vendedores por ciudad asignada." },
                { icon: "✏️ Editar", location: "Fila del vendedor", fn: "Edita talla de polera, tienda asignada u otros datos." },
                { icon: "🏪 Cambiar tienda", location: "Modal de edición", fn: "Registra cambio de tienda con observación. Se guarda en vendor_store_history." },
                { icon: "📱 Ver QR", location: "Fila del vendedor", fn: "Muestra el QR de cobro subido por el vendedor." },
                { icon: "📥 Exportar Excel", location: "Esquina superior", fn: "Descarga la lista filtrada de vendedores en formato .xlsx." },
              ]} />
              <Tip>
                Los cambios de tienda quedan registrados con fecha, usuario que realizó el cambio y observación, 
                permitiendo trazabilidad completa.
              </Tip>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ DATOS ═══════════ */}
        <TabsContent value="data" className="space-y-4 mt-4">
          {/* Productos */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Package} title="Productos y Modelos" description="Catálogo de productos Skyworth con configuración de bonos y puntos." />
            </CardHeader>
            <CardContent className="space-y-4">
              <ButtonRef rows={[
                { icon: "+ Nuevo Producto", location: "Esquina superior", fn: "Abre formulario para agregar un producto manualmente." },
                { icon: "✏️ Editar", location: "Fila del producto", fn: "Modifica nombre, modelo, pulgadas, bono Bs o puntos." },
                { icon: "🔄 Activar/Desactivar", location: "Fila del producto", fn: "Toggle que activa o desactiva el producto para nuevas ventas." },
                { icon: "📤 Importar Excel", location: "Esquina superior", fn: "Importa productos masivamente desde un archivo Excel con la plantilla definida." },
                { icon: "📥 Exportar", location: "Esquina superior", fn: "Descarga todos los productos en formato .xlsx." },
                { icon: "📋 Descargar Plantilla", location: "Modal de importación", fn: "Descarga la plantilla Excel con las columnas requeridas." },
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Campos del Producto</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>Nombre:</strong> Nombre comercial del producto (ej: "TV LED 32 pulgadas").</p>
                <p>• <strong>Código de Modelo:</strong> Identificador único del modelo (ej: "32STD6500").</p>
                <p>• <strong>Pulgadas:</strong> Tamaño de pantalla (opcional).</p>
                <p>• <strong>Bono Bs:</strong> Comisión en bolivianos que gana el vendedor por cada venta aprobada.</p>
                <p>• <strong>Puntos:</strong> Puntos asignados al vendedor para el ranking de la campaña.</p>
              </div>
            </CardContent>
          </Card>

          {/* Seriales */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Hash} title="Seriales" description="Base de datos de números seriales de productos Skyworth." />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Los seriales son la pieza clave de validación: cuando un vendedor registra una venta, el serial ingresado 
                se valida contra esta base de datos. Si no existe o ya fue usado, la venta no se puede registrar.
              </p>

              <ButtonRef rows={[
                { icon: "📤 Importar", location: "Esquina superior", fn: "Importa seriales desde archivo CSV o Excel. Cada serial se asocia a un producto." },
                { icon: "🔍 Buscar", location: "Barra superior", fn: "Busca un serial específico." },
                { icon: "Select (Estado)", location: "Barra de filtros", fn: "Filtra por: Disponible, Usado, Bloqueado." },
                { icon: "📥 Exportar", location: "Esquina superior", fn: "Descarga seriales filtrados en .xlsx." },
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Estados del Serial</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { status: "Disponible", color: "text-green-500", desc: "Listo para ser usado en una venta." },
                  { status: "Usado", color: "text-yellow-500", desc: "Ya fue asociado a una venta registrada." },
                  { status: "Bloqueado", color: "text-red-500", desc: "Bloqueado por estar en lista de restringidos." },
                ].map((s) => (
                  <div key={s.status} className="p-3 rounded-lg border bg-card">
                    <p className={`text-sm font-medium ${s.color}`}>{s.status}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>

              <Tip>
                La tabla de seriales puede contener más de 100,000 registros. Las búsquedas y filtros funcionan del lado del servidor 
                para mantener el rendimiento.
              </Tip>
            </CardContent>
          </Card>

          {/* Restringidos */}
          <Card>
            <CardHeader>
              <SectionHeader icon={FileText} title="Seriales Restringidos" description="Lista negra de seriales que no pueden ser usados en ventas." />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Los seriales restringidos son aquellos que fueron usados en campañas anteriores, reportados como robados, 
                o que por alguna razón no deben aceptarse. Al intentar registrar una venta con un serial restringido, 
                el sistema lo rechaza automáticamente.
              </p>

              <ButtonRef rows={[
                { icon: "📤 Importar", location: "Esquina superior", fn: "Importa lista de seriales restringidos desde Excel/CSV con razón y campaña de origen." },
                { icon: "🔍 Buscar", location: "Barra superior", fn: "Busca un serial en la lista de restringidos." },
                { icon: "🗑️ Eliminar", location: "Fila del serial", fn: "Remueve un serial de la lista de restringidos." },
                { icon: "📥 Exportar", location: "Esquina superior", fn: "Descarga la lista completa en .xlsx." },
              ]} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ REPORTES ═══════════ */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          {/* Métricas */}
          <Card>
            <CardHeader>
              <SectionHeader icon={BarChart3} title="Métricas" description="Dashboard analítico con filtros avanzados y gráficos interactivos." />
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">Filtros Disponibles</h4>
              <ButtonRef rows={[
                { icon: "Select (Campaña)", location: "Barra superior", fn: "Filtra métricas por campaña." },
                { icon: "Select (Ciudad)", location: "Barra superior", fn: "Filtra por ciudad específica o todas." },
                { icon: "📅 Rango de fechas", location: "Barra superior", fn: "Presets: Hoy, Esta semana, Este mes, o rango personalizado." },
                { icon: "🧹 Limpiar filtros", location: "Barra superior", fn: "Resetea todos los filtros a valores por defecto." },
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Pestañas de Métricas</h4>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="weekly">
                  <AccordionTrigger className="text-sm">📅 Semanal</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Muestra la evolución de ventas semana a semana con gráficos de línea/barra.
                    Permite identificar tendencias y picos de actividad.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="city">
                  <AccordionTrigger className="text-sm">🏙️ Por Ciudad</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Desglose de ventas aprobadas, pendientes y rechazadas por cada ciudad.
                    Incluye gráfico de barras comparativo y totales de bono Bs.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="product">
                  <AccordionTrigger className="text-sm">📦 Por Producto</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Ranking de productos más vendidos con unidades, bono acumulado y participación porcentual.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <ButtonRef rows={[
                { icon: "📥 Exportar", location: "Cada pestaña", fn: "Descarga los datos de la pestaña actual en formato Excel." },
              ]} />
            </CardContent>
          </Card>

          {/* Comisiones */}
          <Card>
            <CardHeader>
              <SectionHeader icon={DollarSign} title="Comisiones" description="Generación de liquidaciones y gestión de pagos a vendedores." />
            </CardHeader>
            <CardContent className="space-y-4">
              <FlowDiagram steps={[
                "Seleccionar campaña y periodo",
                "Generar liquidación",
                "Sistema calcula bono por vendedor",
                "Crear registros de pago (pending)",
                "Admin marca como pagado",
                "Sube comprobante de pago",
              ]} />

              <ButtonRef rows={[
                { icon: "Select (Campaña)", location: "Barra superior", fn: "Selecciona la campaña para ver comisiones." },
                { icon: "Select (Periodo)", location: "Barra superior", fn: "Selecciona el periodo semanal." },
                { icon: "⚡ Generar Liquidación", location: "Botón principal", fn: "Calcula y crea registros de comisión para todos los vendedores con ventas aprobadas en el periodo." },
                { icon: "💰 Marcar Pagado", location: "Fila del vendedor", fn: "Cambia el estado de la comisión a 'paid'." },
                { icon: "📎 Subir Comprobante", location: "Fila del vendedor", fn: "Adjunta imagen del comprobante de transferencia." },
                { icon: "📱 Ver QR", location: "Fila del vendedor", fn: "Muestra el QR de cobro del vendedor para realizar la transferencia." },
                { icon: "📥 Exportar", location: "Esquina superior", fn: "Descarga la liquidación completa en Excel." },
              ]} />

              <Tip>
                El QR de cobro es subido por cada vendedor desde su perfil. Si no tiene QR, aparecerá un indicador para que lo suba.
                El comprobante de pago queda asociado al registro de comisión para auditoría.
              </Tip>
            </CardContent>
          </Card>

          {/* Inscripciones */}
          <Card>
            <CardHeader>
              <SectionHeader icon={UserCheck} title="Reporte de Inscripciones" description="Análisis de inscripciones de vendedores por campaña." />
            </CardHeader>
            <CardContent className="space-y-4">
              <ButtonRef rows={[
                { icon: "Select (Campaña)", location: "Barra superior", fn: "Selecciona la campaña para analizar inscripciones." },
                { icon: "📊 Tasa por Ciudad", location: "Tabla/Gráfico", fn: "Muestra el porcentaje de vendedores inscritos vs totales por ciudad." },
                { icon: "📥 Exportar", location: "Esquina superior", fn: "Descarga el reporte de inscripciones en Excel." },
              ]} />
            </CardContent>
          </Card>

          {/* Comparar Campañas */}
          <Card>
            <CardHeader>
              <SectionHeader icon={GitCompare} title="Comparar Campañas" description="Comparación lado a lado de métricas entre campañas." />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Permite seleccionar 2 o más campañas y comparar sus métricas principales: ventas totales, bono, 
                tasa de aprobación, distribución por ciudad y productos más vendidos.
              </p>
              <ButtonRef rows={[
                { icon: "Select múltiple", location: "Barra superior", fn: "Selecciona las campañas a comparar." },
                { icon: "📊 Gráficos", location: "Panel principal", fn: "Gráficos comparativos de barras agrupadas." },
              ]} />
              <Tip>
                Esta funcionalidad debe estar habilitada en Configuración → General → "Habilitar Comparador de Campañas".
                Si está deshabilitada, el ítem no aparece en el menú lateral.
              </Tip>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ SISTEMA ═══════════ */}
        <TabsContent value="system" className="space-y-4 mt-4">
          {/* Correos Ciudad */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Mail} title="Correos por Ciudad" description="Destinatarios de reportes automáticos por ciudad y campaña." />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configura qué direcciones de email reciben los reportes semanales automáticos para cada ciudad.
                Los reportes se envían al cierre de cada periodo e incluyen el resumen de ventas de la ciudad.
              </p>
              <ButtonRef rows={[
                { icon: "Select (Campaña)", location: "Barra superior", fn: "Selecciona la campaña para configurar destinatarios." },
                { icon: "+ Agregar", location: "Sección de la ciudad", fn: "Agrega un email destinatario para esa ciudad." },
                { icon: "🗑️ Eliminar", location: "Fila del email", fn: "Remueve un destinatario." },
              ]} />
            </CardContent>
          </Card>

          {/* Plantillas Email */}
          <Card>
            <CardHeader>
              <SectionHeader icon={FileCode} title="Plantillas de Email" description="Personalización del contenido de emails automáticos del sistema." />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                El sistema envía emails automáticos en distintos eventos (bienvenida, reporte semanal, notificación de pago, etc.).
                Cada plantilla tiene un asunto, cuerpo HTML editable, y se puede activar/desactivar individualmente.
              </p>
              <ButtonRef rows={[
                { icon: "✏️ Editar", location: "Fila de la plantilla", fn: "Abre editor para modificar asunto y cuerpo HTML." },
                { icon: "🔄 Activar/Desactivar", location: "Toggle en la fila", fn: "Habilita o deshabilita el envío de este tipo de email." },
                { icon: "From Name", location: "Campo en editor", fn: "Nombre que aparece como remitente del email." },
                { icon: "Reply-To", location: "Campo en editor", fn: "Dirección a la que llegan las respuestas." },
              ]} />
              <Tip>
                Las plantillas usan variables con doble llave, por ejemplo: {"{{vendor_name}}"}, {"{{campaign_name}}"}, {"{{period_dates}}"}.
                Estas se reemplazan automáticamente al enviar el email.
              </Tip>
            </CardContent>
          </Card>

          {/* Usuarios/Roles */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Users} title="Usuarios y Roles" description="Gestión de cuentas de usuario y asignación de roles del sistema." />
            </CardHeader>
            <CardContent className="space-y-4">
              <ButtonRef rows={[
                { icon: "🔍 Buscar", location: "Barra superior", fn: "Busca usuarios por email." },
                { icon: "🏷️ Asignar Rol", location: "Fila del usuario", fn: "Asigna uno o más roles: vendedor, revisor_ciudad, supervisor, admin." },
                { icon: "🏙️ Ciudad (Revisor)", location: "Modal de rol", fn: "Para revisores de ciudad, asigna la ciudad que pueden revisar." },
                { icon: "🔑 Resetear Contraseña", location: "Menú de acciones", fn: "Envía email de reseteo de contraseña al usuario." },
                { icon: "🚫 Bloquear", location: "Menú de acciones", fn: "Deshabilita la cuenta del usuario (no puede iniciar sesión)." },
                { icon: "🗑️ Eliminar", location: "Menú de acciones", fn: "Elimina permanentemente la cuenta del usuario." },
              ]} />

              <h4 className="font-semibold text-foreground text-sm">Permisos por Rol</h4>
              <div className="rounded-lg border overflow-hidden my-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium">Función</th>
                      <th className="text-center px-2 py-2 font-medium">Vendedor</th>
                      <th className="text-center px-2 py-2 font-medium">Revisor</th>
                      <th className="text-center px-2 py-2 font-medium">Supervisor</th>
                      <th className="text-center px-2 py-2 font-medium">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["Registrar ventas", "✅", "—", "—", "—"],
                      ["Ver ranking", "✅", "—", "—", "✅"],
                      ["Revisar ventas", "—", "✅", "—", "✅"],
                      ["Auditar aprobaciones", "—", "—", "✅", "✅"],
                      ["Gestionar campañas", "—", "—", "—", "✅"],
                      ["Gestionar usuarios", "—", "—", "—", "✅"],
                      ["Configuración", "—", "—", "—", "✅"],
                    ].map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-foreground">{row[0]}</td>
                        <td className="px-2 py-2 text-center">{row[1]}</td>
                        <td className="px-2 py-2 text-center">{row[2]}</td>
                        <td className="px-2 py-2 text-center">{row[3]}</td>
                        <td className="px-2 py-2 text-center">{row[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Configuración */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Settings} title="Configuración" description="Ajustes globales del sistema organizados en pestañas." />
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">Pestañas de Configuración</h4>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="general">
                  <AccordionTrigger className="text-sm">⚙️ General</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>Contiene los feature flags del sistema:</p>
                    <p>• <strong>Habilitar Comparador de Campañas:</strong> Muestra/oculta el módulo de comparación en el menú lateral.</p>
                    <p>Cada flag se guarda en la tabla <code>app_settings</code> como par clave-valor.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cities">
                  <AccordionTrigger className="text-sm">🏙️ Ciudades</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>Gestión del catálogo de ciudades disponibles en el sistema:</p>
                    <ButtonRef rows={[
                      { icon: "+ Nueva Ciudad", location: "Sección de ciudades", fn: "Agrega una nueva ciudad al catálogo." },
                      { icon: "🔄 Activar/Desactivar", location: "Toggle", fn: "Ciudades inactivas no aparecen en selectores." },
                      { icon: "↕️ Reordenar", location: "Drag handles", fn: "Cambia el orden de visualización." },
                    ]} />
                    <p className="mt-2"><strong>Grupos de Ciudades:</strong> Permite agrupar ciudades para reportes consolidados (ej: "Eje Troncal" = La Paz + Cochabamba + Santa Cruz).</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="landing">
                  <AccordionTrigger className="text-sm">🌐 Landing</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Configuración de la página de inicio pública del sistema. Permite personalizar textos, 
                    imágenes y llamados a la acción.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="backup">
                  <AccordionTrigger className="text-sm">💾 Respaldos</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>Exportación masiva de datos del sistema para respaldo:</p>
                    <ButtonRef rows={[
                      { icon: "📥 Exportar Todo", location: "Botón principal", fn: "Descarga un archivo Excel con una hoja por cada tabla del sistema." },
                      { icon: "📥 Exportar (individual)", location: "Por cada tabla", fn: "Descarga solo los datos de una tabla específica." },
                    ]} />
                    <p>Incluye contadores de registros por tabla y maneja la paginación automática para tablas grandes (más de 1,000 registros).</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="processes">
                  <AccordionTrigger className="text-sm">🔄 Procesos del Sistema</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    <p>Procesos automáticos que se ejecutan periódicamente:</p>
                    <div className="space-y-1 mt-2">
                      <p>• <strong>Cierre semanal:</strong> Cierra periodos vencidos y actualiza estados de ventas.</p>
                      <p>• <strong>Generación de reportes:</strong> Crea y envía reportes por ciudad al cierre de periodo.</p>
                      <p>• <strong>Notificación de pago:</strong> Envía email a vendedores cuando su comisión es marcada como pagada.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ ATAJOS DE TECLADO ═══════════ */}
        <TabsContent value="shortcuts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <SectionHeader icon={Keyboard} title="Atajos de Teclado" description="Accesos rápidos para agilizar las tareas más comunes." />
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">Módulo de Revisiones</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium">Tecla</th>
                      <th className="text-left px-3 py-2 font-medium">Acción</th>
                      <th className="text-left px-3 py-2 font-medium">Contexto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "← (Flecha izquierda)", action: "Ir a la venta anterior", ctx: "Con detalle de venta abierto" },
                      { key: "→ (Flecha derecha)", action: "Ir a la siguiente venta", ctx: "Con detalle de venta abierto" },
                      { key: "A", action: "Aprobar la venta actual", ctx: "Con detalle de venta abierto" },
                      { key: "Esc", action: "Cerrar panel de detalle", ctx: "Con detalle de venta abierto" },
                    ].map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2"><Badge variant="outline" className="font-mono text-xs">{s.key}</Badge></td>
                        <td className="px-3 py-2">{s.action}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.ctx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Tip>Los atajos de teclado solo funcionan cuando el panel de detalle de la venta está abierto y no hay un campo de texto activo (input/textarea).</Tip>

              <h4 className="font-semibold text-foreground text-sm">Navegación General</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium">Tecla</th>
                      <th className="text-left px-3 py-2 font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "Ctrl + B / ⌘ + B", action: "Colapsar/expandir sidebar" },
                      { key: "Tab", action: "Navegar entre elementos interactivos" },
                      { key: "Enter", action: "Activar botón o enlace enfocado" },
                      { key: "Esc", action: "Cerrar modales y diálogos" },
                    ].map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2"><Badge variant="outline" className="font-mono text-xs">{s.key}</Badge></td>
                        <td className="px-3 py-2">{s.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="font-semibold text-foreground text-sm">Flujo Rápido de Revisión</h4>
              <p className="text-sm text-muted-foreground">
                Para revisar ventas de forma eficiente sin usar el mouse:
              </p>
              <FlowDiagram steps={[
                "Abrir primera venta",
                "Verificar fotos",
                "Presionar A para aprobar",
                "→ para siguiente",
                "Repetir",
              ]} />
              <Tip>Este flujo permite revisar decenas de ventas en minutos, ideal para revisores de ciudad con alto volumen.</Tip>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ FAQ ═══════════ */}
        <TabsContent value="faq" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <SectionHeader icon={AlertTriangle} title="Preguntas Frecuentes y Solución de Problemas" description="Respuestas a las dudas más comunes al operar el sistema." />
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {/* Ventas & Revisiones */}
                <AccordionItem value="faq-serial-not-found">
                  <AccordionTrigger className="text-sm font-medium">Un vendedor dice que su serial no es reconocido</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Causa más común:</strong> El serial no fue importado a la tabla de seriales o fue importado con un producto diferente.</p>
                    <p><strong>Solución:</strong></p>
                    <p>1. Ve a <strong>Seriales</strong> y busca el serial exacto (sin espacios).</p>
                    <p>2. Si no aparece, necesitas importarlo. Usa el botón "Importar" con un archivo que contenga el serial y su producto asociado.</p>
                    <p>3. Si aparece como "Bloqueado", revisa en <strong>Restringidos</strong> si está en la lista negra.</p>
                    <p>4. Si aparece como "Usado", significa que ya fue registrado en otra venta.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-serial-restricted">
                  <AccordionTrigger className="text-sm font-medium">El serial aparece como restringido pero no debería</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Solución:</strong></p>
                    <p>1. Ve a <strong>Restringidos</strong> y busca el serial.</p>
                    <p>2. Verifica la razón y campaña de origen.</p>
                    <p>3. Si fue un error, elimínalo con el botón 🗑️.</p>
                    <p>4. El serial volverá a estar disponible inmediatamente.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-duplicate-sale">
                  <AccordionTrigger className="text-sm font-medium">Un vendedor registró la misma venta dos veces</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>El sistema previene duplicados por serial: una vez usado, el serial no puede registrarse de nuevo.</p>
                    <p>Si de alguna forma se duplicó (diferentes seriales, mismo producto), el revisor debe <strong>rechazar</strong> la venta duplicada con el motivo "Duplicada".</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-wrong-approval">
                  <AccordionTrigger className="text-sm font-medium">Un revisor aprobó una venta por error</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Solución:</strong> Un supervisor puede revertir la aprobación desde el módulo de <strong>Auditoría</strong>.</p>
                    <p>1. El supervisor busca la venta en el módulo de Auditoría.</p>
                    <p>2. Presiona "Revertir" e ingresa el motivo.</p>
                    <p>3. La venta vuelve a estado "pendiente" y puede ser revisada nuevamente.</p>
                    <p>4. Se registra la acción en <code>supervisor_audits</code> para trazabilidad.</p>
                  </AccordionContent>
                </AccordionItem>

                {/* Campañas */}
                <AccordionItem value="faq-campaign-periods">
                  <AccordionTrigger className="text-sm font-medium">Los periodos de la campaña no se están cerrando automáticamente</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Verificar:</strong></p>
                    <p>1. Que la campaña tenga activado "Cierre automático de periodos".</p>
                    <p>2. Que la campaña esté en estado "activa".</p>
                    <p>3. El proceso de cierre se ejecuta automáticamente. Si un periodo no se cerró, puede ser que las fechas no coincidan o el proceso aún no se ejecutó.</p>
                    <p>4. En <strong>Configuración → Procesos del Sistema</strong> puedes verificar el estado de los procesos automáticos.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-vendor-not-enrolled">
                  <AccordionTrigger className="text-sm font-medium">Un vendedor no puede inscribirse a una campaña</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Posibles causas:</strong></p>
                    <p>1. <strong>Registro cerrado:</strong> La campaña tiene deshabilitado el registro o la ventana de registro ya pasó.</p>
                    <p>2. <strong>Requiere aprobación:</strong> La campaña tiene activado "Requiere aprobación" y el vendedor está pendiente de aprobación.</p>
                    <p>3. <strong>Vendedor inactivo:</strong> El vendedor está desactivado o bloqueado en el sistema.</p>
                    <p>4. <strong>Ya inscrito:</strong> El vendedor ya está inscrito en la campaña.</p>
                  </AccordionContent>
                </AccordionItem>

                {/* Comisiones */}
                <AccordionItem value="faq-commission-zero">
                  <AccordionTrigger className="text-sm font-medium">La liquidación de un vendedor aparece en Bs 0</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Causa:</strong> El vendedor no tiene ventas <strong>aprobadas</strong> en el periodo seleccionado.</p>
                    <p><strong>Verificar:</strong></p>
                    <p>1. Que las ventas del vendedor estén en estado "approved" (no "pending" o "rejected").</p>
                    <p>2. Que las fechas de venta caigan dentro del periodo seleccionado.</p>
                    <p>3. Que los productos tengan un valor de bono Bs mayor a 0.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-regenerate-settlement">
                  <AccordionTrigger className="text-sm font-medium">¿Puedo regenerar una liquidación después de aprobar ventas adicionales?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>Sí. Si se aprobaron ventas adicionales después de generar la liquidación, puedes volver a presionar <strong>"Generar Liquidación"</strong> para el mismo periodo.</p>
                    <p>El sistema recalculará los montos incluyendo las nuevas ventas aprobadas.</p>
                    <Tip>Asegúrate de no haber marcado pagos ya. Si ya se pagaron comisiones, coordina con el vendedor el diferencial.</Tip>
                  </AccordionContent>
                </AccordionItem>

                {/* Importaciones */}
                <AccordionItem value="faq-import-fails">
                  <AccordionTrigger className="text-sm font-medium">La importación de Excel/CSV falla o no carga todos los registros</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Pasos para diagnosticar:</strong></p>
                    <p>1. <strong>Formato:</strong> Verifica que el archivo tenga las columnas exactas de la plantilla. Descarga la plantilla desde el botón correspondiente.</p>
                    <p>2. <strong>Encoding:</strong> Guarda el archivo como CSV UTF-8 si tiene caracteres especiales (ñ, tildes).</p>
                    <p>3. <strong>Duplicados:</strong> Si un serial o producto ya existe, puede ser ignorado silenciosamente.</p>
                    <p>4. <strong>Tamaño:</strong> Para archivos muy grandes (+50,000 filas), puede tomar varios segundos. Espera a que termine sin cerrar la pestaña.</p>
                  </AccordionContent>
                </AccordionItem>

                {/* QR y Pagos */}
                <AccordionItem value="faq-vendor-no-qr">
                  <AccordionTrigger className="text-sm font-medium">El vendedor no tiene QR de cobro</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>El QR de cobro lo sube cada vendedor desde su perfil personal en <strong>/v/perfil</strong>.</p>
                    <p>Si un vendedor no tiene QR, indícale que:</p>
                    <p>1. Ingrese a su cuenta desde el celular.</p>
                    <p>2. Vaya a "Mi Perfil".</p>
                    <p>3. Suba una foto o captura de pantalla de su QR bancario.</p>
                    <p>El QR tiene una fecha de expiración configurable. Si expiró, el vendedor debe subirlo nuevamente.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-ai-validation">
                  <AccordionTrigger className="text-sm font-medium">¿Cómo funciona la validación de fecha con IA?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>Cuando la campaña tiene activada la <strong>Validación IA de fecha</strong>:</p>
                    <p>1. Al registrar una venta, el sistema analiza la foto de la <strong>Nota de Venta</strong> con inteligencia artificial.</p>
                    <p>2. La IA intenta detectar la fecha impresa en la nota.</p>
                    <p>3. Si la fecha detectada no coincide con la fecha declarada por el vendedor, se genera una alerta ⚠️.</p>
                    <p>4. El revisor ve el nivel de <strong>confianza</strong> de la IA (porcentaje) y la fecha detectada.</p>
                    <p>5. El revisor decide si aprobar o rechazar basándose en toda la evidencia disponible.</p>
                    <Tip>La IA no rechaza ventas automáticamente. Solo alerta al revisor para que preste atención especial.</Tip>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-user-locked">
                  <AccordionTrigger className="text-sm font-medium">Un usuario dice que no puede iniciar sesión</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Pasos para diagnosticar:</strong></p>
                    <p>1. Ve a <strong>Usuarios/Roles</strong> y busca el email del usuario.</p>
                    <p>2. Verifica si la cuenta está <strong>bloqueada</strong> (is_disabled = true).</p>
                    <p>3. Si está bloqueada, desbloquéala.</p>
                    <p>4. Si no está bloqueada, usa <strong>"Resetear Contraseña"</strong> para enviar un email de recuperación.</p>
                    <p>5. Verifica que el usuario tenga al menos un <strong>rol asignado</strong>, de lo contrario no tendrá acceso a ningún módulo.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-backup">
                  <AccordionTrigger className="text-sm font-medium">¿Cómo hago un respaldo completo del sistema?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2">
                    <p>Ve a <strong>Configuración → Respaldos</strong> y presiona <strong>"Exportar Todo"</strong>.</p>
                    <p>Esto descargará un archivo Excel con una hoja por cada tabla del sistema, incluyendo:</p>
                    <p>• Campañas, periodos, productos, seriales, vendedores, ventas, adjuntos</p>
                    <p>• Revisiones, comisiones, auditorías, usuarios, roles, configuraciones</p>
                    <p>El proceso puede tomar hasta un minuto en sistemas con muchos datos (especialmente seriales con +100k registros).</p>
                    <Tip>Se recomienda hacer un respaldo al menos una vez por semana, y siempre antes de realizar importaciones masivas.</Tip>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ GLOSARIO ═══════════ */}
        <TabsContent value="glossary" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <SectionHeader icon={BookOpen} title="Glosario de Términos" description="Definición de todos los términos utilizados en el sistema." />
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {[
                  { term: "Bono Bs", def: "Comisión en bolivianos que recibe el vendedor por cada venta aprobada. Se configura por producto." },
                  { term: "Campaña", def: "Programa de incentivos con fecha de inicio y fin. Contiene periodos, vendedores inscritos y ventas." },
                  { term: "Cierre de Periodo", def: "Proceso que finaliza un periodo semanal/quincenal. Las ventas pendientes se marcan como 'cerradas' y se genera el reporte." },
                  { term: "Ciudad", def: "Ubicación geográfica del vendedor. Se usa para filtrar ventas, asignar revisores y generar reportes." },
                  { term: "Feature Flag", def: "Interruptor que habilita o deshabilita una funcionalidad del sistema sin cambiar código (ej: Comparador de Campañas)." },
                  { term: "Grupo de Ciudades", def: "Agrupación de ciudades para reportes consolidados (ej: 'Eje Troncal')." },
                  { term: "Inscripción", def: "Proceso por el cual un vendedor se registra para participar en una campaña." },
                  { term: "Kardex", def: "Ficha o expediente del vendedor con todos sus datos, historial de tiendas y ventas." },
                  { term: "Landing", def: "Página pública de inicio del sistema, visible antes de iniciar sesión." },
                  { term: "Liquidación", def: "Cálculo del monto total a pagar a cada vendedor por sus ventas aprobadas en un periodo." },
                  { term: "Nota de Venta", def: "Foto del recibo o comprobante de venta con la fecha visible. Evidencia obligatoria para cada venta." },
                  { term: "Periodo", def: "Intervalo de tiempo dentro de una campaña (semanal, quincenal, mensual). Las ventas y comisiones se agrupan por periodo." },
                  { term: "Póliza", def: "Foto de la póliza de garantía o factura del producto. Evidencia obligatoria para cada venta." },
                  { term: "Puntos", def: "Valor asignado al vendedor para el ranking de la campaña. Se configura por producto." },
                  { term: "QR de Cobro", def: "Imagen del código QR bancario del vendedor, usado para realizar transferencias de pago de comisiones." },
                  { term: "Ranking", def: "Tabla de posiciones de vendedores ordenada por puntos acumulados en la campaña." },
                  { term: "Revisor de Ciudad", def: "Rol que permite revisar (aprobar/rechazar) las ventas registradas por vendedores de una ciudad específica." },
                  { term: "RLS (Row Level Security)", def: "Política de seguridad a nivel de base de datos que garantiza que cada usuario solo acceda a los datos que le corresponden." },
                  { term: "Serial", def: "Número de serie único del producto Skyworth. Cada venta requiere un serial válido que se verifica contra la base de datos." },
                  { term: "Serial Restringido", def: "Serial que está en lista negra y no puede usarse para registrar ventas (usado en campaña anterior, robado, etc.)." },
                  { term: "Slug", def: "Identificador corto y amigable para URLs (ej: /c/campania-verano-2025). Se configura al crear la campaña." },
                  { term: "Supervisor", def: "Rol que audita por muestreo las aprobaciones hechas por revisores de ciudad. Puede revertir decisiones." },
                  { term: "TAG", def: "Foto de la etiqueta del producto Skyworth con el número de serie visible. Evidencia obligatoria para cada venta." },
                  { term: "Talla de Polera", def: "Talla de remera/polera del vendedor, registrada para envío de merchandise de la campaña." },
                  { term: "Tienda", def: "Punto de venta o local comercial donde trabaja el vendedor. Los cambios de tienda quedan registrados con historial." },
                  { term: "Validación IA", def: "Proceso automatizado que usa inteligencia artificial para detectar la fecha en la foto de la nota de venta y compararla con la fecha declarada." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 border-b last:border-b-0">
                    <Badge variant="outline" className="shrink-0 mt-0.5 font-mono text-xs min-w-[140px] justify-center">{item.term}</Badge>
                    <p className="text-sm text-muted-foreground">{item.def}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
