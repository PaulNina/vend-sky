import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost, apiDelete, apiPostForm, uploadUrl, apiDownloadFile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { EvidenceViewerModal } from "@/components/EvidenceViewerModal";
import { compressImage } from "@/lib/imageCompressor";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldCheck,
  Tv,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Copy,
  Clock,
  UserCheck,
  MapPin,
  Store,
  ImageIcon,
  Trash2,
  Upload,
  Pencil,
  Loader2,
  Gift,
  Sparkles,
  Camera,
  UploadCloud
} from "lucide-react";
import { EntregaRuleta } from "@/types/clientCampaign";

interface RegistroClienteItem {
  id: number;
  canalRegistro: string;
  nombreCliente: string;
  apellidoCliente: string;
  ci: string;
  celular: string;
  email?: string;
  ciudad: string;
  puntoVenta?: string;
  serial: string;
  productoModelo?: string;
  productoPulgadas?: number;
  fechaCompra: string;
  fotoTag?: string;
  fotoPoliza?: string;
  fotoNota?: string;
  fotoCiAnverso?: string;
  fotoCiReverso?: string;
  estado: "PENDIENTE" | "EN_REVISION" | "OBSERVADO" | "RECHAZADO" | "APROBADO";
  motivoObservacion?: string;
  historialRevisiones?: string;
  supervisorNombre?: string;
  fechaRevision?: string;
  createdAt: string;
  impulsadorNombre?: string;
}

type TipoEvidenciaKey = "fotoNota" | "fotoTag" | "fotoPoliza" | "fotoCiAnverso" | "fotoCiReverso" | "fotoEntrega";

interface EvidenciaConfig {
  key: TipoEvidenciaKey;
  label: string;
  fieldTitle: string;
  hoverBorder: string;
}

const EVIDENCIAS_LIST: EvidenciaConfig[] = [
  { key: "fotoNota", label: "NOTA DE VENTA / FACTURA", fieldTitle: "Nota de Venta / Factura", hoverBorder: "hover:border-emerald-500/40" },
  { key: "fotoTag", label: "FOTO TAG / IMEI", fieldTitle: "Foto TAG / Serial Trasero", hoverBorder: "hover:border-amber-500/40" },
  { key: "fotoPoliza", label: "POLIZA DE GARANTIA", fieldTitle: "Póliza de Garantía Sellada", hoverBorder: "hover:border-emerald-500/40" },
  { key: "fotoCiAnverso", label: "C.I. ANVERSO", fieldTitle: "Carnet de Identidad (Anverso)", hoverBorder: "hover:border-blue-500/40" },
  { key: "fotoCiReverso", label: "C.I. REVERSO", fieldTitle: "Carnet de Identidad (Reverso)", hoverBorder: "hover:border-blue-500/40" },
];

export default function SupervisorClientePage() {
  const { user, roles } = useAuth();

  const [registros, setRegistros] = useState<RegistroClienteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<{ [key: string]: number }>({});
  
  // Filtros
  const [estadoFilter, setEstadoFilter] = useState<string>("PENDIENTE");
  const [ciudadFilter, setCiudadFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal de Inspección del Registro
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroClienteItem | null>(null);

  // Estados para Subir / Reemplazar / Quitar evidencias
  const [uploadingTipo, setUploadingTipo] = useState<TipoEvidenciaKey | null>(null);
  const [deletingTipo, setDeletingTipo] = useState<TipoEvidenciaKey | null>(null);
  const [targetEvidenciaTipo, setTargetEvidenciaTipo] = useState<TipoEvidenciaKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permisos: Quien tiene acceso a la Mesa de Supervisión puede gestionar evidencias
  const userRoleStr = (user?.role || "").toUpperCase();
  const canEditEvidence =
    userRoleStr === "ADMIN" ||
    userRoleStr === "SUPERVISOR" ||
    userRoleStr === "REVIEWER" ||
    roles.includes("admin") ||
    roles.includes("supervisor") ||
    roles.includes("revisor_ciudad") ||
    true; // Habilitado permanentemente en el panel de supervisión

  // Modal de Pantalla Completa para Visor de Evidencias (Lightbox)
  const [viewerConfig, setViewerConfig] = useState<{
    open: boolean;
    url: string | null;
    title: string;
    subtitle?: string;
    filename?: string;
  }>({
    open: false,
    url: null,
    title: "",
  });

  // Modal de Motivo (Observar / Rechazar)
  const [actionType, setActionType] = useState<"OBSERVAR" | "RECHAZAR" | null>(null);
  const [motivoTexto, setMotivoTexto] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Registro de Entrega de Ruleta (Bandeo)
  const [entregaRuleta, setEntregaRuleta] = useState<EntregaRuleta | null>(null);
  const [loadingEntrega, setLoadingEntrega] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportarExcel = async () => {
    try {
      setExporting(true);
      const campanaParam = campanaActiva?.id ? `?campanaId=${campanaActiva.id}` : "";
      await apiDownloadFile(
        `/admin/reportes-cliente/exportar-registros${campanaParam}`,
        `registros_clientes_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast({ title: "Excel descargado exitosamente" });
    } catch (err: unknown) {
      toast({ title: "Error al exportar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Cargar entrega de ruleta si el registro seleccionado corresponde a BANDEO
  useEffect(() => {
    if (selectedRegistro) {
      setLoadingEntrega(true);
      apiGet<EntregaRuleta>(`/supervisor/cliente/registros/${selectedRegistro.id}/entrega-ruleta`)
        .then((res) => {
          setEntregaRuleta(res || null);
        })
        .catch(() => {
          setEntregaRuleta(null);
        })
        .finally(() => {
          setLoadingEntrega(false);
        });
    } else {
      setEntregaRuleta(null);
    }
  }, [selectedRegistro?.id]);

  // Cargar datos
  const cargarRegistros = useCallback(async () => {
    try {
      setLoading(true);
      const estadoParam = estadoFilter !== "all" ? `&estado=${estadoFilter}` : "";
      const ciudadParam = ciudadFilter !== "all" ? `&ciudad=${ciudadFilter}` : "";
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";

      const res = await apiGet<{
        content: RegistroClienteItem[];
        totalPages?: number;
        page?: { totalPages: number; totalElements: number };
      }>(`/supervisor/cliente/registros?page=${page}&size=15${estadoParam}${ciudadParam}${searchParam}`);

      setRegistros(res.content || []);
      setTotalPages(res.page?.totalPages ?? res.totalPages ?? 1);

      // Cargar KPIs
      const kpisRes = await apiGet<{ [key: string]: number }>("/supervisor/cliente/kpis");
      setKpis(kpisRes || {});
    } catch (err) {
      console.error("Error al cargar registros de supervisión:", err);
    } finally {
      setLoading(false);
    }
  }, [page, estadoFilter, ciudadFilter, search]);

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros]);

  // Acciones de Aprobación / Observación / Rechazo
  const handleAprobar = async (id: number) => {
    try {
      await apiPost(`/supervisor/cliente/registros/${id}/aprobar`, {});
      toast({ title: "Registro Aprobado", description: "El registro fue validado y los tickets han sido habilitados para sorteos." });
      setSelectedRegistro(null);
      cargarRegistros();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al aprobar registro";
      toast({ title: "Error al aprobar", description: message, variant: "destructive" });
    }
  };

  const handleConfirmActionWithReason = async () => {
    if (!selectedRegistro || !actionType) return;
    if (!motivoTexto.trim()) {
      toast({ title: "Motivo obligatorio", description: "Debe ingresar el motivo de la decisión.", variant: "destructive" });
      return;
    }

    setSubmittingAction(true);
    try {
      const endpoint = actionType === "OBSERVAR" 
        ? `/supervisor/cliente/registros/${selectedRegistro.id}/observar` 
        : `/supervisor/cliente/registros/${selectedRegistro.id}/rechazar`;

      await apiPost(endpoint, { motivo: motivoTexto.trim() });
      toast({ 
        title: actionType === "OBSERVAR" ? "Registro Observado" : "Registro Rechazado", 
        description: `El registro cambió a estado ${actionType} y se notificó al cliente.` 
      });

      setActionType(null);
      setMotivoTexto("");
      setSelectedRegistro(null);
      cargarRegistros();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al procesar acción";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmittingAction(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: `${label} copiado al portapapeles.` });
  };

  const openFullscreenViewer = (fotoPath: string | undefined, title: string) => {
    if (!fotoPath) {
      toast({ title: "Sin imagen", description: "Este respaldo no fue adjuntado.", variant: "destructive" });
      return;
    }
    const cleanFilename = fotoPath.split("/").pop() || `${title.toLowerCase().replace(/\s+/g, "_")}.jpg`;
    setViewerConfig({
      open: true,
      url: uploadUrl(fotoPath),
      title: title,
      subtitle: selectedRegistro 
        ? `Serial: ${selectedRegistro.serial} · Cliente: ${selectedRegistro.nombreCliente} ${selectedRegistro.apellidoCliente}`
        : undefined,
      filename: cleanFilename,
    });
  };

  const cleanFilenameOnly = (path?: string) => {
    if (!path) return "No adjunto";
    const name = path.split("/").pop() || path;
    return name.length > 25 ? name.substring(0, 22) + "..." : name;
  };

  // Disparar selector de archivo para Reemplazar o Subir
  const handleTriggerFileSelect = (tipo: TipoEvidenciaKey) => {
    setTargetEvidenciaTipo(tipo);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Procesar archivo seleccionado con compresión y soporte HEIC
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRegistro || !targetEvidenciaTipo) return;

    try {
      setUploadingTipo(targetEvidenciaTipo);
      
      // Comprimir y convertir si es HEIC de iPhone
      const compressedFile = await compressImage(file);

      const formData = new FormData();
      formData.append("tipo", targetEvidenciaTipo);
      formData.append("archivo", compressedFile);

      const res = await apiPostForm<{ success: boolean; mensaje?: string; registro: RegistroClienteItem }>(
        `/supervisor/cliente/registros/${selectedRegistro.id}/evidencia`,
        formData
      );

      if (targetEvidenciaTipo === "fotoEntrega") {
        const updatedEntrega = await apiGet<EntregaRuleta>(`/supervisor/cliente/registros/${selectedRegistro.id}/entrega-ruleta`);
        setEntregaRuleta(updatedEntrega || null);
        toast({ title: "Foto de Entrega guardada", description: "La fotografía de entrega de bandeo fue guardada exitosamente." });
      } else if (res.registro) {
        setSelectedRegistro(res.registro);
        setRegistros((prev) => prev.map((r) => (r.id === res.registro.id ? res.registro : r)));
        toast({ title: "Evidencia guardada", description: "La fotografía fue optimizada y guardada exitosamente." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir la imagen";
      toast({ title: "Error al guardar evidencia", description: msg, variant: "destructive" });
    } finally {
      setUploadingTipo(null);
      setTargetEvidenciaTipo(null);
      if (e.target) e.target.value = "";
    }
  };

  // Quitar evidencia
  const handleQuitarEvidencia = async (tipo: TipoEvidenciaKey, label: string) => {
    if (!selectedRegistro) return;
    if (!window.confirm(`¿Está seguro de quitar la evidencia "${label}"? Esta acción borrará la imagen vinculada a este registro.`)) {
      return;
    }

    try {
      setDeletingTipo(tipo);
      await apiDelete(`/supervisor/cliente/registros/${selectedRegistro.id}/evidencia/${tipo}`);
      
      if (tipo === "fotoEntrega") {
        setEntregaRuleta((prev) => (prev ? { ...prev, fotoEntrega: undefined } : null));
        toast({ title: "Foto de Entrega quitada", description: "Se quitó la fotografía de entrega del premio." });
      } else {
        const updated: RegistroClienteItem = { ...selectedRegistro, [tipo]: undefined };
        setSelectedRegistro(updated);
        setRegistros((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast({ title: "Evidencia quitada", description: `Se eliminó la imagen de ${label}.` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al quitar evidencia";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeletingTipo(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Input oculto para subir/reemplazar archivos con soporte HEIC */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Mesa de Supervisión
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Validación de Registros Cliente Final
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Revisión de los 5 respaldos fotográficos · Habilitación condicional de tickets para sorteos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cargarRegistros}
            className="border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarExcel}
            disabled={exporting}
            className="border-white/10 hover:bg-white/5 text-emerald-400 rounded-xl"
          >
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
        </div>
      </div>

      {/* Contadores KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card 
          onClick={() => { setEstadoFilter("PENDIENTE"); setPage(0); }}
          className={`cursor-pointer transition-all border-white/10 bg-slate-900/60 backdrop-blur-xl hover:border-amber-500/40 ${estadoFilter === "PENDIENTE" ? "ring-2 ring-amber-500/50 bg-amber-500/5" : ""}`}
        >
          <CardContent className="p-4">
            <p className="text-xs text-amber-400 font-semibold uppercase">Pendientes</p>
            <h3 className="text-2xl font-black text-white mt-1">{kpis["PENDIENTE"] || 0}</h3>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setEstadoFilter("OBSERVADO"); setPage(0); }}
          className={`cursor-pointer transition-all border-white/10 bg-slate-900/60 backdrop-blur-xl hover:border-orange-500/40 ${estadoFilter === "OBSERVADO" ? "ring-2 ring-orange-500/50 bg-orange-500/5" : ""}`}
        >
          <CardContent className="p-4">
            <p className="text-xs text-orange-400 font-semibold uppercase">Observados</p>
            <h3 className="text-2xl font-black text-white mt-1">{kpis["OBSERVADO"] || 0}</h3>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setEstadoFilter("APROBADO"); setPage(0); }}
          className={`cursor-pointer transition-all border-white/10 bg-slate-900/60 backdrop-blur-xl hover:border-emerald-500/40 ${estadoFilter === "APROBADO" ? "ring-2 ring-emerald-500/50 bg-emerald-500/5" : ""}`}
        >
          <CardContent className="p-4">
            <p className="text-xs text-emerald-400 font-semibold uppercase">Aprobados</p>
            <h3 className="text-2xl font-black text-white mt-1">{kpis["APROBADO"] || 0}</h3>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setEstadoFilter("RECHAZADO"); setPage(0); }}
          className={`cursor-pointer transition-all border-white/10 bg-slate-900/60 backdrop-blur-xl hover:border-red-500/40 ${estadoFilter === "RECHAZADO" ? "ring-2 ring-red-500/50 bg-red-500/5" : ""}`}
        >
          <CardContent className="p-4">
            <p className="text-xs text-red-400 font-semibold uppercase">Rechazados</p>
            <h3 className="text-2xl font-black text-white mt-1">{kpis["RECHAZADO"] || 0}</h3>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setEstadoFilter("all"); setPage(0); }}
          className={`cursor-pointer transition-all border-white/10 bg-slate-900/60 backdrop-blur-xl hover:border-blue-500/40 ${estadoFilter === "all" ? "ring-2 ring-blue-500/50 bg-blue-500/5" : ""}`}
        >
          <CardContent className="p-4">
            <p className="text-xs text-blue-400 font-semibold uppercase">Total</p>
            <h3 className="text-2xl font-black text-white mt-1">{kpis["TOTAL"] || 0}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar por CI, Serial o Cliente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="bg-slate-950/60 border-white/10 pl-9 rounded-xl h-10 text-xs text-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={ciudadFilter}
              onChange={(e) => { setCiudadFilter(e.target.value); setPage(0); }}
              className="bg-slate-950/60 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-300"
            >
              <option value="all">Todas las ciudades</option>
              <option value="Santa Cruz">Santa Cruz</option>
              <option value="La Paz">La Paz</option>
              <option value="Cochabamba">Cochabamba</option>
              <option value="El Alto">El Alto</option>
              <option value="Sucre">Sucre</option>
              <option value="Oruro">Oruro</option>
              <option value="Tarija">Tarija</option>
              <option value="Potosí">Potosí</option>
              <option value="Beni">Beni</option>
              <option value="Pando">Pando</option>
            </select>

            <select
              value={estadoFilter}
              onChange={(e) => { setEstadoFilter(e.target.value); setPage(0); }}
              className="bg-slate-950/60 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-300"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="OBSERVADO">Observados</option>
              <option value="APROBADO">Aprobados</option>
              <option value="RECHAZADO">Rechazados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Registros */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950/80">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">ID / Canal</TableHead>
                  <TableHead className="text-slate-400 text-xs">Cliente / C.I.</TableHead>
                  <TableHead className="text-slate-400 text-xs">Ciudad / Tienda</TableHead>
                  <TableHead className="text-slate-400 text-xs">Serial / TAG</TableHead>
                  <TableHead className="text-slate-400 text-xs">Modelo TV</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Estado</TableHead>
                  <TableHead className="text-right text-slate-400 text-xs">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      No se encontraron registros con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  registros.map((r) => (
                    <TableRow key={r.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-slate-300">#{r.id}</span>
                        <div className="mt-0.5">
                          {r.canalRegistro === "BANDEO" ? (
                            <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-semibold">
                              🎁 BANDEO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] border-white/10 text-slate-400">
                              {r.canalRegistro}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-xs text-white">{r.nombreCliente} {r.apellidoCliente}</p>
                        <p className="text-[11px] font-mono text-slate-400">CI: {r.ci}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-300">{r.ciudad}</p>
                        <p className="text-[10px] text-slate-500">{r.puntoVenta || "Punto de Venta"}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-amber-400 font-semibold">{r.serial}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-300">{r.productoModelo || "TV Skyworth"}</p>
                        <p className="text-[10px] text-slate-500">{r.productoPulgadas ? `${r.productoPulgadas}"` : ""}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.estado === "APROBADO" && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Aprobado</Badge>}
                        {r.estado === "PENDIENTE" && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Pendiente</Badge>}
                        {r.estado === "OBSERVADO" && <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]">Observado</Badge>}
                        {r.estado === "RECHAZADO" && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Rechazado</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setSelectedRegistro(r)}
                          className="h-8 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Revisar Ficha y Evidencias
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="p-4 flex items-center justify-between border-t border-white/5">
            <p className="text-xs text-slate-500">Página {page + 1} de {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage(page - 1)}
                className="h-8 w-8 p-0 rounded-lg border-white/10 text-slate-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="h-8 w-8 p-0 rounded-lg border-white/10 text-slate-400"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Inspección Detallada: Todos los Datos + Grid de 5 Evidencias */}
      <Dialog open={!!selectedRegistro} onOpenChange={(open) => !open && setSelectedRegistro(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-white/10 text-white rounded-3xl p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  Inspección Integral de Registro #{selectedRegistro?.id}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-1">
                  Revisa los datos registrados del cliente, el equipo y gestiona las evidencias fotográficas.
                </DialogDescription>
              </div>

              <div>
                {selectedRegistro?.estado === "APROBADO" && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1">
                    ✓ Tickets Habilitados (Aprobado)
                  </Badge>
                )}
                {selectedRegistro?.estado === "PENDIENTE" && (
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-3 py-1">
                    ⏳ Pendiente de Aprobación
                  </Badge>
                )}
                {selectedRegistro?.estado === "OBSERVADO" && (
                  <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs px-3 py-1">
                    ⚠ Registro Observado
                  </Badge>
                )}
                {selectedRegistro?.estado === "RECHAZADO" && (
                  <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs px-3 py-1">
                    ✕ Rechazado
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* SECCIÓN 1: TODOS LOS DATOS REGISTRADOS */}
          <div className="space-y-4 my-2">
            {/* Tarjeta Datos del Cliente */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Datos del Cliente
                </span>
                {selectedRegistro?.celular && (
                  <a
                    href={`https://wa.me/591${selectedRegistro.celular.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chatear por WhatsApp
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Nombre Completo:</span>
                  <span className="font-semibold text-white text-sm">
                    {selectedRegistro?.nombreCliente} {selectedRegistro?.apellidoCliente}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Cédula de Identidad (CI):</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {selectedRegistro?.ci}
                    </span>
                  </div>
                  {selectedRegistro?.ci && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedRegistro.ci, "CI")}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                      title="Copiar CI"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Celular / Teléfono:</span>
                  <span className="font-mono font-semibold text-white text-sm flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {selectedRegistro?.celular}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Ciudad:</span>
                  <span className="font-semibold text-white flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {selectedRegistro?.ciudad}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Tienda / Punto de Venta:</span>
                  <span className="font-semibold text-white flex items-center gap-1 truncate">
                    <Store className="w-3 h-3 text-blue-400" />
                    {selectedRegistro?.puntoVenta || "No especificado"}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Correo Electrónico:</span>
                  <span className="font-medium text-slate-300 truncate block">
                    {selectedRegistro?.email || "Sin correo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Datos del Equipo y Compra */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Tv className="w-4 h-4 text-amber-400" />
                Datos del Equipo y Compra
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between sm:col-span-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Número de Serie / TAG:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                      {selectedRegistro?.serial}
                    </span>
                  </div>
                  {selectedRegistro?.serial && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedRegistro.serial, "Serial")}
                      className="h-7 w-7 p-0 text-amber-400 hover:text-white"
                      title="Copiar Serial"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Modelo TV:</span>
                  <span className="font-semibold text-white">
                    {selectedRegistro?.productoModelo || "TV Skyworth"}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Pulgadas:</span>
                  <span className="font-bold text-emerald-400">
                    {selectedRegistro?.productoPulgadas ? `${selectedRegistro.productoPulgadas}"` : "N/A"}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Fecha de Compra:</span>
                  <span className="font-medium text-white flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {selectedRegistro?.fechaCompra}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Canal de Registro:</span>
                  <Badge variant="outline" className="border-white/10 text-slate-300 font-mono text-[10px] mt-0.5">
                    {selectedRegistro?.canalRegistro}
                  </Badge>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Registrado Por:</span>
                  <span className="font-medium text-slate-300 truncate block">
                    {selectedRegistro?.impulsadorNombre || "Operador / Vendedor"}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[11px] block">Fecha y Hora de Registro:</span>
                  <span className="font-medium text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {selectedRegistro?.createdAt ? new Date(selectedRegistro.createdAt).toLocaleString("es-BO") : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* TARJETA ESPECIAL: REGISTRO DE BANDEO Y FOTO DE ENTREGA DE PREMIO */}
            {(selectedRegistro?.canalRegistro === "BANDEO" || Boolean(entregaRuleta)) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    Obsequio Ruleta & Entrega de Bandeo
                  </span>
                  {entregaRuleta?.premioRuleta && (
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs px-2.5 py-0.5">
                      Premio: {entregaRuleta.premioRuleta.nombre}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 text-[11px] block">Premio Adjudicado:</span>
                    <span className="font-bold text-white text-sm flex items-center gap-1.5 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {entregaRuleta?.premioRuleta?.nombre || "Obsequio de Ruleta"}
                    </span>
                    {entregaRuleta?.premioRuleta?.descripcion && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{entregaRuleta.premioRuleta.descripcion}</span>
                    )}
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 text-[11px] block">Entregado Por (Operador):</span>
                    <span className="font-medium text-white flex items-center gap-1.5 mt-0.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {entregaRuleta?.impulsadorNombre || selectedRegistro?.impulsadorNombre || "Operador de Bandeo"}
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 text-[11px] block">Fecha y Hora de Entrega:</span>
                    <span className="font-medium text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {entregaRuleta?.fechaGiro ? new Date(entregaRuleta.fechaGiro).toLocaleString("es-BO") : "Registrado en el acto"}
                    </span>
                  </div>
                </div>

                {/* FOTOGRAFÍA DE ENTREGA DEL PREMIO CON EL CLIENTE */}
                <div className="mt-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      Fotografía de Entrega del Premio con el Cliente
                    </span>
                    {entregaRuleta?.fotoEntrega ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        ✓ Respaldo Adjunto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                        ⚠ Sin Foto de Entrega
                      </Badge>
                    )}
                  </div>

                  {/* Tarjeta de foto de entrega */}
                  <div className="bg-slate-950 border border-white/10 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-4">
                    {entregaRuleta?.fotoEntrega ? (
                      <div
                        onClick={() => openFullscreenViewer(entregaRuleta.fotoEntrega, "FOTO DE ENTREGA DE BANDEO")}
                        className="relative w-full sm:w-44 h-36 bg-slate-900 rounded-xl overflow-hidden cursor-pointer group shrink-0 border border-white/10 shadow-md"
                      >
                        <img
                          src={uploadUrl(entregaRuleta.fotoEntrega)}
                          alt="Foto de Entrega de Bandeo"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg">
                            <Eye className="w-3.5 h-3.5" /> Ampliar
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full sm:w-44 h-36 bg-slate-900/60 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-1.5 text-slate-500 text-xs shrink-0">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                        <span>Sin foto de entrega</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2 text-xs">
                      <p className="text-slate-300 leading-relaxed">
                        {entregaRuleta?.fotoEntrega
                          ? "Fotografía capturada por el operador de bandeo al entregar el obsequio físico al cliente ganador en el punto de venta."
                          : "No se adjuntó la fotografía de entrega física con el cliente. Puedes subirla ahora si cuentas con el respaldo."}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {entregaRuleta?.fotoEntrega && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFullscreenViewer(entregaRuleta.fotoEntrega, "FOTO DE ENTREGA DE BANDEO")}
                            className="border-white/10 text-slate-200 hover:text-white rounded-xl text-xs h-8"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            Ver Foto Completa
                          </Button>
                        )}

                        {canEditEvidence && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerFileSelect("fotoEntrega")}
                              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 rounded-xl text-xs h-8"
                            >
                              <UploadCloud className="w-3.5 h-3.5 mr-1 text-amber-400" />
                              {entregaRuleta?.fotoEntrega ? "Reemplazar Foto" : "Subir Foto de Entrega"}
                            </Button>

                            {entregaRuleta?.fotoEntrega && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleQuitarEvidencia("fotoEntrega", "Foto de Entrega de Bandeo")}
                                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs h-8"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Quitar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Historial o Motivo de Observación (si existe) */}
            {selectedRegistro?.motivoObservacion && (
              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  Observación Actual:
                </span>
                <p className="pl-5 text-slate-200 leading-relaxed">{selectedRegistro.motivoObservacion}</p>
                {selectedRegistro.supervisorNombre && (
                  <p className="pl-5 text-[11px] text-slate-400 pt-1">
                    Registrado por: {selectedRegistro.supervisorNombre} {selectedRegistro.fechaRevision ? `el ${new Date(selectedRegistro.fechaRevision).toLocaleString("es-BO")}` : ""}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: GRID DE LAS 5 EVIDENCIAS EN MINIATURA CON ACCIONES (Ver, Reemplazar, Quitar, Subir) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Evidencias Fotográficas Adjuntas
              </h3>
              <span className="text-[11px] text-slate-400">
                {canEditEvidence 
                  ? "Puedes visualizar en pantalla completa, subir nueva foto, reemplazar o quitar cualquiera de los respaldos."
                  : "Haz clic en cualquier miniatura o en Ver para abrir en pantalla completa."}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {EVIDENCIAS_LIST.map((ev) => {
                const fotoPath = selectedRegistro?.[ev.key];
                const hasPhoto = Boolean(fotoPath);
                const isUploading = uploadingTipo === ev.key;
                const isDeleting = deletingTipo === ev.key;

                return (
                  <div
                    key={ev.key}
                    className={`bg-slate-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col ${ev.hoverBorder} transition-all group shadow-lg`}
                  >
                    {/* Miniatura visual */}
                    <div 
                      className="relative h-44 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden"
                      onClick={() => {
                        if (hasPhoto) {
                          openFullscreenViewer(fotoPath, ev.label);
                        } else if (canEditEvidence) {
                          handleTriggerFileSelect(ev.key);
                        }
                      }}
                    >
                      {hasPhoto ? (
                        <>
                          <img
                            src={uploadUrl(fotoPath!)}
                            alt={ev.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2">
                            <p className="text-[10px] font-mono text-white/90 truncate">
                              {cleanFilenameOnly(fotoPath)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-3 text-slate-500 text-xs flex flex-col items-center gap-1.5 hover:text-slate-300 transition-colors">
                          <ImageIcon className="w-8 h-8 opacity-40" />
                          <span>Sin foto adjunta</span>
                          {canEditEvidence && (
                            <span className="text-[10px] text-emerald-400 underline font-medium">
                              Clic para subir
                            </span>
                          )}
                        </div>
                      )}

                      {/* Overlay si está subiendo o borrando */}
                      {(isUploading || isDeleting) && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
                          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                          <span className="text-xs text-white font-medium">
                            {isUploading ? "Subiendo..." : "Eliminando..."}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cuerpo de la Tarjeta */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5 border-t border-white/5">
                      <div className="text-center">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-tight">
                          {ev.label}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        {hasPhoto ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5">
                            ACTIVA
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px] px-2 py-0.5">
                            NO ADJUNTA
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                          {cleanFilenameOnly(fotoPath)}
                        </span>
                      </div>

                      {/* BOTONES DE ACCIÓN: Ver, Reemplazar, Quitar, Subir */}
                      {hasPhoto ? (
                        <div className="space-y-1.5">
                          {/* Botón Ver Pantalla Completa */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openFullscreenViewer(fotoPath, ev.label)}
                            className="w-full h-8 text-xs border-white/10 hover:bg-white/10 text-slate-200 rounded-xl"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-300" />
                            Ver
                          </Button>

                          {/* Acciones para Admin / Supervisor: Reemplazar y Quitar */}
                          {canEditEvidence && (
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploading || isDeleting}
                                onClick={() => handleTriggerFileSelect(ev.key)}
                                className="h-7 text-[11px] px-1.5 border-white/10 hover:bg-white/10 text-amber-300 rounded-lg"
                                title="Reemplazar esta fotografía"
                              >
                                {isUploading ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <Pencil className="w-3 h-3 mr-1 text-amber-400" />
                                )}
                                Reemplazar
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploading || isDeleting}
                                onClick={() => handleQuitarEvidencia(ev.key, ev.label)}
                                className="h-7 text-[11px] px-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg"
                                title="Quitar fotografía"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <Trash2 className="w-3 h-3 mr-1 text-red-400" />
                                )}
                                Quitar
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {canEditEvidence ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isUploading}
                              onClick={() => handleTriggerFileSelect(ev.key)}
                              className="w-full h-8 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold flex items-center justify-center gap-1.5"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                                  Subir Imagen
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="w-full h-8 text-xs border-white/5 text-slate-500 rounded-xl"
                            >
                              Sin Foto
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10 mt-2">
            <div className="text-[11px] text-slate-500">
              {selectedRegistro?.supervisorNombre && (
                <span>Supervisado por: {selectedRegistro.supervisorNombre}</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActionType("OBSERVAR"); setMotivoTexto(""); }}
                className="flex-1 sm:flex-none border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-xl h-10"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Observar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActionType("RECHAZAR"); setMotivoTexto(""); }}
                className="flex-1 sm:flex-none border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl h-10"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Rechazar
              </Button>

              <Button
                size="sm"
                onClick={() => selectedRegistro && handleAprobar(selectedRegistro.id)}
                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl h-10 px-5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Aprobar y Habilitar Tickets
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizador a Pantalla Completa (Lightbox) con Pan Libre y Herramientas */}
      <EvidenceViewerModal
        open={viewerConfig.open}
        url={viewerConfig.url}
        title={viewerConfig.title}
        subtitle={viewerConfig.subtitle}
        filename={viewerConfig.filename}
        onClose={() => setViewerConfig((prev) => ({ ...prev, open: false }))}
      />

      {/* Modal para ingresar Motivo Obligatorio (Observar o Rechazar) */}
      <Dialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {actionType === "OBSERVAR" ? "Motivo de Observación" : "Motivo de Rechazo"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Especifique con claridad la razón por la cual se {actionType?.toLowerCase()} este registro. Se notificará automáticamente al cliente vía WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <Label className="text-xs text-slate-300">Motivo Obligatorio *</Label>
            <Textarea
              required
              rows={4}
              placeholder="Ej: La foto de la póliza de garantía no tiene el sello visible de la tienda comercial o la factura está borrosa..."
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              className="bg-slate-900 border-white/10 text-xs rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionType(null)}
              className="border-white/10 text-slate-300 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              disabled={submittingAction || !motivoTexto.trim()}
              onClick={handleConfirmActionWithReason}
              className={`rounded-xl font-bold ${actionType === "OBSERVAR" ? "bg-orange-500 hover:bg-orange-400 text-slate-950" : "bg-red-500 hover:bg-red-400 text-white"}`}
            >
              {actionType === "OBSERVAR" ? "Registrar Observación" : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
