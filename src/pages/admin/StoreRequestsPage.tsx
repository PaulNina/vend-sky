import { useState, useEffect, useMemo } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, CheckCircle2, XCircle, Store, Building2, 
  Search, Eye, Phone, Mail, UserCheck, ShieldCheck, 
  Wallet, FileText, Check, X, ArrowUpRight, ExternalLink
} from "lucide-react";
import { formatDateTimeBolivia } from "@/lib/utils";

export interface SolicitudTiendaItem {
  id: number;
  tipoSolicitud: "NUEVA_TIENDA" | "RECLAMAR_TIENDA";
  tiendaExistente?: {
    id: number;
    nombre: string;
    codigo?: string;
    direccion?: string;
  };
  nombreTienda?: string;
  codigoTienda?: string;
  canal?: string;
  ciudad?: {
    id: number;
    nombre: string;
    departamento?: string;
  };
  departamento?: string;
  direccion?: string;
  telefonoTienda?: string;
  nit?: string;
  nombreSolicitante: string;
  ciSolicitante?: string;
  telefonoSolicitante: string;
  emailSolicitante: string;
  cargoSolicitante?: string;
  banco?: string;
  nroCuenta?: string;
  titularCobro?: string;
  telefonoTitular?: string;
  qrPagoUrl?: string;
  fotoVerificacionUrl?: string;
  notasAdicionales?: string;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  motivoRechazo?: string;
  revisadoPor?: string;
  fechaRevision?: string;
  tiendaResultado?: {
    id: number;
    nombre: string;
    codigo?: string;
  };
  usuarioCreado?: {
    id: number;
    email: string;
    nombreCompleto?: string;
  };
  createdAt?: string;
}

interface SolicitudStats {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
}

export default function StoreRequestsPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudTiendaItem[]>([]);
  const [stats, setStats] = useState<SolicitudStats>({ total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0 });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  // Modales
  const [detailModal, setDetailModal] = useState<SolicitudTiendaItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Diálogo Rechazo
  const [rejectDialog, setRejectDialog] = useState<SolicitudTiendaItem | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");

  // Diálogo Aprobación
  const [approveDialog, setApproveDialog] = useState<SolicitudTiendaItem | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        apiGet<SolicitudTiendaItem[]>("/tiendas/solicitudes"),
        apiGet<SolicitudStats>("/tiendas/solicitudes/stats")
      ]);
      setSolicitudes(listRes || []);
      if (statsRes) setStats(statsRes);
    } catch (err: unknown) {
      console.error("Error al cargar solicitudes de tiendas:", err);
      toast({ title: "Error", description: "No se pudieron cargar las solicitudes de tiendas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((s) => {
      const matchEstado = filtroEstado === "TODOS" || s.estado === filtroEstado;
      const matchTipo = filtroTipo === "TODOS" || s.tipoSolicitud === filtroTipo;

      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        (s.nombreTienda && s.nombreTienda.toLowerCase().includes(q)) ||
        (s.nombreSolicitante && s.nombreSolicitante.toLowerCase().includes(q)) ||
        (s.emailSolicitante && s.emailSolicitante.toLowerCase().includes(q)) ||
        (s.telefonoSolicitante && s.telefonoSolicitante.includes(q)) ||
        (s.ciudad && s.ciudad.nombre.toLowerCase().includes(q));

      return matchEstado && matchTipo && matchSearch;
    });
  }, [solicitudes, filtroEstado, filtroTipo, searchTerm]);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setProcessing(true);
    try {
      const res = await apiPatch<{ success: boolean; message: string; usuarioEmail?: string }>(
        `/tiendas/solicitudes/${approveDialog.id}/aprobar`, 
        {}
      );
      toast({ 
        title: "Solicitud Aprobada", 
        description: res.message || `La tienda ha sido activada y el usuario ${res.usuarioEmail || ""} ha sido habilitado.` 
      });
      setApproveDialog(null);
      if (detailModal?.id === approveDialog.id) setDetailModal(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aprobar la solicitud";
      toast({ title: "Error al aprobar", description: msg, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setProcessing(true);
    try {
      await apiPatch(`/tiendas/solicitudes/${rejectDialog.id}/rechazar`, {
        motivo: rejectMotivo.trim() || "No cumple con las políticas de registro de Skyworth."
      });
      toast({ title: "Solicitud Rechazada", description: "La solicitud ha sido marcada como rechazada." });
      setRejectDialog(null);
      setRejectMotivo("");
      if (detailModal?.id === rejectDialog.id) setDetailModal(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al rechazar";
      toast({ title: "Error al rechazar", description: msg, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Solicitudes de Registro de Tiendas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Aprobación de nuevas tiendas comerciales y reclamos de tiendas pre-registradas por sus propietarios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData} 
            disabled={loading}
            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Actualizar
          </Button>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white text-xs">
            <a href="/registro-tienda" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Formulario Público
            </a>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card 
          onClick={() => setFiltroEstado("TODOS")} 
          className={`cursor-pointer transition-all border-white/5 bg-slate-900/60 hover:border-white/20 ${filtroEstado === "TODOS" ? "ring-2 ring-primary/50" : ""}`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Total Solicitudes</p>
              <p className="text-2xl font-bold font-display text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setFiltroEstado("PENDIENTE")} 
          className={`cursor-pointer transition-all border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 ${filtroEstado === "PENDIENTE" ? "ring-2 ring-amber-500" : ""}`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-amber-400 uppercase font-medium">Pendientes</p>
              <p className="text-2xl font-bold font-display text-amber-400 mt-1">{stats.pendientes}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setFiltroEstado("APROBADA")} 
          className={`cursor-pointer transition-all border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 ${filtroEstado === "APROBADA" ? "ring-2 ring-emerald-500" : ""}`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-400 uppercase font-medium">Aprobadas</p>
              <p className="text-2xl font-bold font-display text-emerald-400 mt-1">{stats.aprobadas}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setFiltroEstado("RECHAZADA")} 
          className={`cursor-pointer transition-all border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 ${filtroEstado === "RECHAZADA" ? "ring-2 ring-rose-500" : ""}`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-rose-400 uppercase font-medium">Rechazadas</p>
              <p className="text-2xl font-bold font-display text-rose-400 mt-1">{stats.rechazadas}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por tienda, solicitante, ciudad, celular o correo..."
              className="pl-9 bg-black/20 border-white/10 text-white placeholder-slate-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[140px] bg-black/20 border-white/10 text-white text-xs">
                <SelectValue placeholder="Estado..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                <SelectItem value="APROBADA">Aprobadas</SelectItem>
                <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[150px] bg-black/20 border-white/10 text-white text-xs">
                <SelectValue placeholder="Tipo..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                <SelectItem value="TODOS">Todos los tipos</SelectItem>
                <SelectItem value="NUEVA_TIENDA">Nueva Tienda</SelectItem>
                <SelectItem value="RECLAMAR_TIENDA">Reclamo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Solicitudes */}
      <Card className="glass-card border-white/5 overflow-hidden shadow-xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSolicitudes.length === 0 ? (
            <div className="text-center text-slate-500 py-16 text-xs">
              <Store className="h-10 w-10 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="font-semibold text-slate-400">No hay solicitudes encontradas</p>
              <p className="text-slate-500 mt-1">No hay solicitudes de registro que coincidan con los filtros seleccionados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Fecha</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tienda Propuesta</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Dueño / Encargado</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Contacto</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Respaldo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolicitudes.map((s) => (
                  <TableRow key={s.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      {s.createdAt ? formatDateTimeBolivia(s.createdAt) : "-"}
                    </TableCell>

                    <TableCell>
                      {s.tipoSolicitud === "RECLAMAR_TIENDA" ? (
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium text-[10px]">
                          Reclamo
                        </Badge>
                      ) : (
                        <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-medium text-[10px]">
                          Nueva Tienda
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-white max-w-[200px]">
                      <div className="truncate font-semibold">{s.nombreTienda}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {s.tipoSolicitud === "RECLAMAR_TIENDA" && s.tiendaExistente ? (
                          <span className="text-amber-400">Tienda ID #{s.tiendaExistente.id}</span>
                        ) : (
                          <span>Canal: {s.canal || "Retail"}</span>
                        )}
                        {s.nit ? ` • NIT: ${s.nit}` : ""}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-300">
                      <div>{s.ciudad?.nombre || "-"}</div>
                      <div className="text-[10px] text-slate-500">{s.departamento || s.ciudad?.departamento || ""}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-300">
                      <div className="font-medium text-white">{s.nombreSolicitante}</div>
                      <div className="text-[10px] text-slate-400">{s.cargoSolicitante || "Encargado"}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-300">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="h-3 w-3 text-emerald-400" />
                        <a 
                          href={`https://wa.me/591${s.telefonoSolicitante.replace(/\D/g, "")}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:underline text-emerald-400"
                        >
                          {s.telefonoSolicitante}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span className="truncate max-w-[140px]">{s.emailSolicitante}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {s.fotoVerificacionUrl ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setPreviewImage(`/${s.fotoVerificacionUrl}`)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Doc
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">Sin archivo</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {s.estado === "APROBADA" && (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                          Aprobada
                        </Badge>
                      )}
                      {s.estado === "RECHAZADA" && (
                        <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]">
                          Rechazada
                        </Badge>
                      )}
                      {s.estado === "PENDIENTE" && (
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDetailModal(s)}
                          className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/5"
                        >
                          Detalles
                        </Button>

                        {s.estado === "PENDIENTE" && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => setApproveDialog(s)}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1 shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5" /> Aprobar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => { setRejectDialog(s); setRejectMotivo(""); }}
                              className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            >
                              <X className="h-3.5 w-3.5" /> Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Detalle Completo */}
      <Dialog open={!!detailModal} onOpenChange={(o) => !o && setDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto glass-card border-white/10 text-white shadow-2xl">
          {detailModal && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="font-display text-white text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" /> Solicitud #{detailModal.id} — {detailModal.nombreTienda}
                  </DialogTitle>
                  <Badge className={
                    detailModal.estado === "APROBADA" ? "bg-emerald-500/20 text-emerald-300" :
                    detailModal.estado === "RECHAZADA" ? "bg-rose-500/20 text-rose-300" :
                    "bg-amber-500/20 text-amber-300"
                  }>
                    {detailModal.estado}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Bloque Tienda */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <h4 className="font-bold text-primary uppercase text-[11px] flex items-center gap-1.5 border-b border-white/10 pb-1">
                    <Building2 className="h-3.5 w-3.5" /> Datos de la Tienda
                  </h4>
                  <p><span className="text-slate-400">Tipo:</span> {detailModal.tipoSolicitud === "RECLAMAR_TIENDA" ? "Reclamo de Tienda Existente" : "Nueva Tienda"}</p>
                  <p><span className="text-slate-400">Nombre:</span> {detailModal.nombreTienda}</p>
                  {detailModal.codigoTienda && <p><span className="text-slate-400">Código:</span> {detailModal.codigoTienda}</p>}
                  <p><span className="text-slate-400">Ciudad:</span> {detailModal.ciudad?.nombre || "-"} ({detailModal.departamento || "-"})</p>
                  <p><span className="text-slate-400">Dirección:</span> {detailModal.direccion || "-"}</p>
                  <p><span className="text-slate-400">Teléfono Local:</span> {detailModal.telefonoTienda || "-"}</p>
                  <p><span className="text-slate-400">Canal:</span> {detailModal.canal || "Retail"}</p>
                  <p><span className="text-slate-400">NIT:</span> {detailModal.nit || "No especificado"}</p>
                </div>

                {/* Bloque Solicitante */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <h4 className="font-bold text-amber-400 uppercase text-[11px] flex items-center gap-1.5 border-b border-white/10 pb-1">
                    <UserCheck className="h-3.5 w-3.5" /> Datos del Solicitante
                  </h4>
                  <p><span className="text-slate-400">Nombre:</span> {detailModal.nombreSolicitante}</p>
                  <p><span className="text-slate-400">Cargo:</span> {detailModal.cargoSolicitante || "Encargado"}</p>
                  <p><span className="text-slate-400">CI:</span> {detailModal.ciSolicitante || "-"}</p>
                  <p><span className="text-slate-400">WhatsApp:</span> {detailModal.telefonoSolicitante}</p>
                  <p><span className="text-slate-400">Email:</span> {detailModal.emailSolicitante}</p>
                  <p><span className="text-slate-400">Fecha Envío:</span> {detailModal.createdAt ? formatDateTimeBolivia(detailModal.createdAt) : "-"}</p>
                </div>

                {/* Bloque Cobro */}
                {(detailModal.banco || detailModal.nroCuenta || detailModal.titularCobro) && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 col-span-2">
                    <h4 className="font-bold text-emerald-400 uppercase text-[11px] flex items-center gap-1.5 border-b border-emerald-500/20 pb-1">
                      <Wallet className="h-3.5 w-3.5" /> Información de Cobro / Pago
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <p><span className="text-slate-400">Banco:</span> {detailModal.banco || "-"}</p>
                      <p><span className="text-slate-400">Nro Cuenta:</span> {detailModal.nroCuenta || "-"}</p>
                      <p><span className="text-slate-400">Titular:</span> {detailModal.titularCobro || "-"}</p>
                      <p><span className="text-slate-400">Tel. Titular:</span> {detailModal.telefonoTitular || "-"}</p>
                    </div>
                  </div>
                )}

                {/* Respaldo / Comprobante */}
                {detailModal.fotoVerificacionUrl && (
                  <div className="col-span-2 p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <h4 className="font-bold text-slate-300 uppercase text-[11px] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" /> Documento / Respaldo Adjunto
                    </h4>
                    <div className="flex items-center gap-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setPreviewImage(`/${detailModal.fotoVerificacionUrl}`)}
                        className="text-xs border-white/10 text-white"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Abrir Documento Adjunto
                      </Button>
                      <a 
                        href={`/${detailModal.fotoVerificacionUrl}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-primary text-xs hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir en pestaña nueva
                      </a>
                    </div>
                  </div>
                )}

                {/* Notas adicionales */}
                {detailModal.notasAdicionales && (
                  <div className="col-span-2 p-3 bg-white/5 rounded-xl text-xs text-slate-300 border border-white/10">
                    <span className="font-semibold text-slate-400">Notas del solicitante:</span> {detailModal.notasAdicionales}
                  </div>
                )}

                {/* Motivo rechazo si existe */}
                {detailModal.motivoRechazo && (
                  <div className="col-span-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                    <span className="font-semibold">Motivo del rechazo:</span> {detailModal.motivoRechazo}
                    {detailModal.revisadoPor && <p className="text-[10px] text-rose-400 mt-1">Revisado por: {detailModal.revisadoPor}</p>}
                  </div>
                )}
              </div>

              {detailModal.estado === "PENDIENTE" && (
                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-white/10">
                  <Button 
                    variant="ghost" 
                    onClick={() => { setRejectDialog(detailModal); setRejectMotivo(""); }}
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
                  >
                    Rechazar Solicitud
                  </Button>
                  <Button 
                    onClick={() => setApproveDialog(detailModal)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                  >
                    <Check className="h-4 w-4" /> Aprobar y Habilitar Acceso
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo Confirmación Aprobación */}
      <Dialog open={!!approveDialog} onOpenChange={(o) => !o && setApproveDialog(null)}>
        <DialogContent className="max-w-md glass-card border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Aprobar Solicitud de Tienda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-slate-300">
            <p>
              Estás a punto de aprobar la solicitud para la tienda: <strong className="text-white">{approveDialog?.nombreTienda}</strong>.
            </p>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
              <p className="font-semibold text-emerald-300">Acciones automáticas:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>La tienda será activada en el catálogo general.</li>
                <li>Se creará/vinculará el usuario <strong className="text-white">{approveDialog?.emailSolicitante}</strong> con rol <strong>ENCARGADO_TIENDA</strong>.</li>
                <li>El encargado podrá iniciar sesión y gestionar sus ventas de forma inmediata.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApproveDialog(null)} className="border-white/10 text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Confirmar Aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Rechazo con Motivo */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="max-w-md glass-card border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-base flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-400" /> Rechazar Solicitud de Tienda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-300">
              Indica la razón por la cual se rechaza la solicitud de <strong className="text-white">{rejectDialog?.nombreTienda}</strong>:
            </p>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Motivo del Rechazo *</Label>
              <Textarea 
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                placeholder="Ej: La tienda no pertenece a la red autorizada / Los datos de identidad no corresponden con el NIT adjunto..."
                className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectDialog(null)} className="border-white/10 text-slate-400 text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={processing}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5"
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Previsualización de Imagen */}
      <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl glass-card border-white/10 p-2 text-white">
          <div className="relative flex justify-center items-center max-h-[80vh] overflow-hidden rounded-lg">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Documento de verificación" 
                className="max-h-[78vh] w-auto object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
