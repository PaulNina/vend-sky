import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiGetBlob, apiDelete, uploadUrl } from "@/lib/api";
import { useCities } from "@/hooks/useCities";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Wrench,
  Plus,
  FileSpreadsheet,
  Search,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Building2,
  Tv,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Camera,
  Trash2
} from "lucide-react";

interface EquipoDanadoItem {
  id: number;
  registroCliente: {
    id: number;
    clienteNombre: string;
    ciudad: string;
    usuario?: {
      id: number;
      email: string;
    };
  };
  serialCaja: string;
  serialTv: string;
  serialesCoinciden: boolean;
  serialIngresoManual: boolean;
  serialValidado: string;
  modelo?: string;
  pulgadas?: number;
  tipoFalla: string;
  comentarios?: string;
  fotoTagCaja?: string;
  fotoTagTv?: string;
  fotoFalla1?: string;
  fotoFalla2?: string;
  fotoFalla3?: string;
  createdAt: string;
}

interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export default function DamagedEquipmentListPage() {
  const navigate = useNavigate();
  const { cityNames: CITIES } = useCities();
  const { user, roles } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN" || roles.includes("admin");

  const [clientesCatalog, setClientesCatalog] = useState<{ id: number; nombre: string; ciudad?: string }[]>([]);
  const [equipos, setEquipos] = useState<EquipoDanadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Normaliza y valida si los seriales coinciden ignorando guiones, espacios y mayúsculas/minúsculas
  const isSerialMatching = (eq?: EquipoDanadoItem | null): boolean => {
    if (!eq) return false;
    if (eq.serialesCoinciden) return true;
    const c = (eq.serialCaja || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const t = (eq.serialTv || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return c !== "" && t !== "" && c === t;
  };

  const handleDeleteEquipment = async (id: number) => {
    if (!confirm(`¿Está seguro de eliminar definitivamente el registro de equipo dañado #${id}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await apiDelete(`/admin/equipos-danados/${id}`);
      toast({ title: "✓ Registro eliminado exitosamente" });
      setEquipos((prev) => prev.filter((item) => item.id !== id));
      setTotalElements((prev) => Math.max(0, prev - 1));
      if (selectedEquipo?.id === id) {
        setSelectedEquipo(null);
      }
    } catch (err: unknown) {
      console.error("Error al eliminar equipo dañado:", err);
      toast({
        title: "Error al eliminar registro",
        description: err instanceof Error ? err.message : "No se pudo eliminar el registro",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [clienteFilter, setClienteFilter] = useState("");
  const [ciudadFilter, setCiudadFilter] = useState("all");
  const [serialFilter, setSerialFilter] = useState("");
  const [modeloFilter, setModeloFilter] = useState("");
  const [tipoFallaFilter, setTipoFallaFilter] = useState("all");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Modal Details
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoDanadoItem | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadClientesCatalog();
  }, []);

  const loadClientesCatalog = async () => {
    try {
      const data = await apiGet<{ id: number; nombre: string; ciudad?: string }[]>("/admin/equipos-danados/clientes");
      setClientesCatalog(data || []);
    } catch (e) {
      console.error("Error cargando catálogo de clientes", e);
    }
  };

  const loadEquipos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("size", "15");
      params.append("sort", "createdAt,desc");

      if (clienteFilter.trim()) params.append("cliente", clienteFilter.trim());
      if (ciudadFilter !== "all") params.append("ciudad", ciudadFilter);
      if (serialFilter.trim()) params.append("serial", serialFilter.trim());
      if (modeloFilter.trim()) params.append("modelo", modeloFilter.trim());
      if (tipoFallaFilter !== "all") params.append("tipoFalla", tipoFallaFilter);
      if (fechaInicio) params.append("fechaInicio", fechaInicio);
      if (fechaFin) params.append("fechaFin", fechaFin);

      const data = await apiGet<PagedResponse<EquipoDanadoItem>>(
        `/admin/equipos-danados?${params.toString()}`
      );
      const items = data?.content || [];
      setEquipos(items);
      setTotalPages(data?.totalPages || 1);
      setTotalElements(data?.totalElements && data.totalElements > 0 ? data.totalElements : items.length);
    } catch (err) {
      console.error("Error cargando equipos dañados", err);
      toast({ title: "Error al cargar equipos dañados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipos();
  }, [page, ciudadFilter, tipoFallaFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadEquipos();
  };

  const handleResetFilters = () => {
    setClienteFilter("");
    setCiudadFilter("all");
    setSerialFilter("");
    setModeloFilter("");
    setTipoFallaFilter("all");
    setFechaInicio("");
    setFechaFin("");
    setPage(0);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (clienteFilter.trim()) params.append("cliente", clienteFilter.trim());
      if (ciudadFilter !== "all") params.append("ciudad", ciudadFilter);
      if (serialFilter.trim()) params.append("serial", serialFilter.trim());
      if (modeloFilter.trim()) params.append("modelo", modeloFilter.trim());
      if (tipoFallaFilter !== "all") params.append("tipoFalla", tipoFallaFilter);
      if (fechaInicio) params.append("fechaInicio", fechaInicio);
      if (fechaFin) params.append("fechaFin", fechaFin);

      const blob = await apiGetBlob(`/admin/equipos-danados/export-excel?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Equipos_Danados_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "✓ Archivo Excel generado y descargado con éxito" });
    } catch (err: unknown) {
      toast({
        title: "Error al exportar Excel",
        description: err instanceof Error ? err.message : "Error de descarga",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const getMediaUrl = (path?: string) => {
    if (!path) return "";
    return uploadUrl(path);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Equipos Dañados
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Control de equipos defectuosos, validación de seriales y exportación de reportes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting || (equipos.length === 0 && totalElements === 0)}
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs h-9"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />}
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/admin/equipos-danados/nuevo")}
            className="bg-primary hover:bg-primary/95 text-white shadow-lg text-xs h-9"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Registrar Equipo Dañado</span>
            <span className="sm:hidden">Nuevo Registro</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="glass-card border-white/5 shadow-xl">
        <CardContent className="p-3 sm:p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Cliente */}
              <div>
                <Input
                  placeholder="Buscar por cliente..."
                  value={clienteFilter}
                  onChange={(e) => setClienteFilter(e.target.value)}
                  list="clientes-filter-list"
                  className="bg-black/20 border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm h-9 sm:h-10"
                />
                <datalist id="clientes-filter-list">
                  {clientesCatalog.slice(0, 100).map((c) => (
                    <option key={c.id || c.nombre} value={c.nombre}>
                      {c.ciudad ? `${c.nombre} (${c.ciudad})` : c.nombre}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Serial */}
              <div>
                <Input
                  placeholder="Buscar por serial..."
                  value={serialFilter}
                  onChange={(e) => setSerialFilter(e.target.value)}
                  className="bg-black/20 border-white/10 text-white placeholder-slate-500 font-mono text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              {/* Ciudad */}
              <div>
                <Select value={ciudadFilter} onValueChange={setCiudadFilter}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Todas las ciudades" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="all">Todas las ciudades</SelectItem>
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Modelo */}
              <div>
                <Input
                  placeholder="Modelo (ej: Q6600H)..."
                  value={modeloFilter}
                  onChange={(e) => setModeloFilter(e.target.value)}
                  className="bg-black/20 border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              {/* Fecha Inicio */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">Desde:</span>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="bg-black/20 border-white/10 text-white text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              {/* Fecha Fin */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">Hasta:</span>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="bg-black/20 border-white/10 text-white text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 sm:pt-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-slate-400 hover:text-white h-9 px-3 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Limpiar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary hover:bg-primary/95 text-white h-9 px-4 text-xs font-bold"
                >
                  <Search className="h-3.5 w-3.5 mr-1" /> Filtrar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Content Container (Mobile Cards + Desktop Table) */}
      <Card className="glass-card border-white/5 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* VISTA MÓVIL: Tarjetas Optimizadas (Pantallas pequeñas < 768px) */}
              <div className="block md:hidden divide-y divide-white/5">
                {equipos.map((eq) => {
                  const damageCount = (eq.fotoFalla1 ? 1 : 0) + (eq.fotoFalla2 ? 1 : 0) + (eq.fotoFalla3 ? 1 : 0);
                  const totalPhotos = (eq.fotoTagCaja ? 1 : 0) + (eq.fotoTagTv ? 1 : 0) + damageCount;

                  return (
                    <div key={eq.id} className="p-3.5 space-y-2.5 hover:bg-white/5 transition-colors">
                      {/* Fila 1: Cliente y Ciudad */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-white uppercase truncate flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{eq.registroCliente?.clienteNombre || "Sin Cliente"}</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {eq.createdAt ? new Date(eq.createdAt).toLocaleString("es-BO", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : "—"}
                          </p>
                        </div>
                        {eq.registroCliente?.ciudad && (
                          <Badge variant="outline" className="border-white/10 bg-black/40 text-[10px] text-slate-300 shrink-0">
                            {eq.registroCliente.ciudad}
                          </Badge>
                        )}
                      </div>

                      {/* Fila 2: Serial y Validación */}
                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Serial Validado:</span>
                          <div className="flex items-center gap-1">
                            {isSerialMatching(eq) ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0">
                                ✓ Coincide
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                                ✗ No coincide
                              </Badge>
                            )}
                            {eq.serialIngresoManual && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[9px] px-1 py-0">
                                Manual
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="font-mono text-sm font-bold text-primary tracking-wide break-all">
                          {eq.serialValidado || eq.serialTv || "—"}
                        </p>
                      </div>

                      {/* Fila 3: Modelo y Falla */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-black/20 p-2 rounded border border-white/5">
                          <span className="text-[10px] text-slate-400 block">Modelo / Pulgadas</span>
                          <span className="font-semibold text-slate-200">
                            {eq.modelo || "—"} {eq.pulgadas ? `(${eq.pulgadas}")` : ""}
                          </span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-white/5">
                          <span className="text-[10px] text-slate-400 block">Tipo de Falla</span>
                          <span className="font-semibold text-amber-300 truncate block" title={eq.tipoFalla}>
                            {eq.tipoFalla}
                          </span>
                        </div>
                      </div>

                      {/* Fila 4: Acciones y Fotos */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Camera className="h-3.5 w-3.5 text-primary" />
                          <span>{totalPhotos} foto(s)</span>
                          {damageCount > 0 && (
                            <span className="text-[9px] text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded font-mono">
                              +{damageCount} daño
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deletingId === eq.id}
                              onClick={() => handleDeleteEquipment(eq.id)}
                              className="h-9 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              title="Eliminar registro"
                            >
                              {deletingId === eq.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEquipo(eq)}
                            className="h-9 min-w-[100px] border-primary/40 text-primary hover:bg-primary hover:text-white text-xs px-3 font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Ver Detalle
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {equipos.length === 0 && (
                  <div className="text-center text-muted-foreground py-12 px-4 text-xs">
                    No se encontraron registros de equipos dañados
                  </div>
                )}
              </div>

              {/* VISTA DESKTOP: Tabla Completa (Pantallas medianas y grandes >= 768px) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                      <TableHead className="text-xs text-muted-foreground">Fecha/Hora</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Cliente / Razón Social</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Serial Validado</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Modelo / Pulgadas</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Falla Reportada</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-center">Fotos</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Registrado Por</TableHead>
                      <TableHead className="w-20 text-xs text-muted-foreground text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipos.map((eq) => {
                      const damageCount = (eq.fotoFalla1 ? 1 : 0) + (eq.fotoFalla2 ? 1 : 0) + (eq.fotoFalla3 ? 1 : 0);
                      const totalPhotos = (eq.fotoTagCaja ? 1 : 0) + (eq.fotoTagTv ? 1 : 0) + damageCount;

                      return (
                        <TableRow key={eq.id} className="transition-all hover:bg-white/5 border-white/5">
                          <TableCell className="text-xs text-slate-400 font-mono whitespace-nowrap">
                            {eq.createdAt ? new Date(eq.createdAt).toLocaleString("es-BO", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : "—"}
                          </TableCell>

                          <TableCell className="text-sm font-bold text-white uppercase">
                            {eq.registroCliente?.clienteNombre || "—"}
                          </TableCell>

                          <TableCell className="text-xs text-slate-300">
                            <Badge variant="outline" className="border-white/10 bg-white/5 text-[11px]">
                              {eq.registroCliente?.ciudad || "—"}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-0.5">
                              <span className="font-mono text-sm font-bold text-primary">{eq.serialValidado}</span>
                              <div className="flex items-center gap-1">
                                {isSerialMatching(eq) ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1 py-0">
                                    Coincide
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                    No coincide
                                  </Badge>
                                )}
                                {eq.serialIngresoManual && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[9px] px-1 py-0">
                                    Manual
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs text-slate-200">
                            <span className="font-semibold">{eq.modelo || "—"}</span>
                            {eq.pulgadas && <span className="text-slate-400 ml-1">({eq.pulgadas}")</span>}
                          </TableCell>

                          <TableCell className="text-xs text-slate-300 max-w-[180px] truncate" title={eq.tipoFalla}>
                            {eq.tipoFalla}
                          </TableCell>

                          {/* Fotos Badge */}
                          <TableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedEquipo(eq)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white/5 hover:bg-primary/20 text-slate-300 hover:text-primary transition-all border border-white/10"
                              title="Clic para ver fotografías en el detalle"
                            >
                              <Camera className="h-3.5 w-3.5 text-primary" />
                              <span>{totalPhotos} foto(s)</span>
                              {damageCount > 0 && (
                                <span className="text-[9px] text-amber-400 bg-amber-500/15 px-1 rounded">
                                  +{damageCount} daño
                                </span>
                              )}
                            </button>
                          </TableCell>

                          <TableCell className="text-xs text-slate-400 truncate max-w-[140px]" title={eq.registroCliente?.usuario?.email}>
                            {eq.registroCliente?.usuario?.email?.split("@")[0] || "—"}
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedEquipo(eq)}
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
                                title="Ver detalle completo y fotografías"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={deletingId === eq.id}
                                  onClick={() => handleDeleteEquipment(eq.id)}
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Eliminar registro"
                                >
                                  {deletingId === eq.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {equipos.length === 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-12 border-white/5">
                          No se encontraron registros de equipos dañados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-3 border-t border-white/5 text-xs text-slate-400">
            <span>Total: <strong>{totalElements}</strong> registro(s)</span>
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="h-8 px-3 border-white/10 hover:bg-white/5 text-white text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
              </Button>
              <span className="font-mono text-slate-300">
                Pág. {page + 1} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="h-8 px-3 border-white/10 hover:bg-white/5 text-white text-xs"
              >
                Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Detalle Completo — Optimizado 100% para Móviles y Escritorio */}
      <Dialog open={!!selectedEquipo} onOpenChange={(open) => !open && setSelectedEquipo(null)}>
        <DialogContent className="w-[95vw] max-w-2xl glass-card border-white/15 text-white max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="pb-2.5 border-b border-white/10 shrink-0">
            <DialogTitle className="text-base sm:text-lg font-display text-white flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate">
                <Wrench className="h-5 w-5 text-primary shrink-0" />
                <span>Detalle de Equipo #{selectedEquipo?.id}</span>
              </span>
              {selectedEquipo?.registroCliente?.ciudad && (
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] shrink-0 font-normal">
                  {selectedEquipo.registroCliente.ciudad}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEquipo && (
            <div className="flex-1 overflow-y-auto space-y-3.5 py-2 pr-1 text-xs sm:text-sm">
              {/* Sección 1: Datos del Cliente y Fecha */}
              <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  1. Datos del Cliente & Visita
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Razón Social / Cliente:</span>
                    <p className="font-bold text-white uppercase text-xs sm:text-sm">
                      {selectedEquipo.registroCliente?.clienteNombre || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Fecha y Hora de Registro:</span>
                    <p className="text-slate-300 font-mono text-xs">
                      {selectedEquipo.createdAt ? new Date(selectedEquipo.createdAt).toLocaleString("es-BO") : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección 2: Seriales y Comparación */}
              <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    2. Validación de Seriales
                  </span>
                  <div className="flex items-center gap-1">
                    {isSerialMatching(selectedEquipo) ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5">
                        ✓ Coinciden
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[9px] px-2 py-0.5">
                        ✗ No coinciden
                      </Badge>
                    )}
                    {selectedEquipo.serialIngresoManual && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[9px] px-1.5 py-0.5">
                        Manual
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase block">Serial Validado</span>
                    <p className="font-mono font-bold text-primary text-xs sm:text-sm break-all leading-tight mt-0.5">
                      {selectedEquipo.serialValidado || "—"}
                    </p>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase block">Tag Caja</span>
                    <p className="font-mono text-white text-xs break-all leading-tight mt-0.5">
                      {selectedEquipo.serialCaja || "—"}
                    </p>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase block">Tag Televisor</span>
                    <p className="font-mono text-white text-xs break-all leading-tight mt-0.5">
                      {selectedEquipo.serialTv || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección 3: Datos de Producto y Falla */}
              <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  3. Información Técnica & Falla
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Modelo</span>
                    <p className="font-bold text-white text-xs sm:text-sm">{selectedEquipo.modelo || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Pulgadas</span>
                    <p className="font-bold text-white text-xs sm:text-sm">
                      {selectedEquipo.pulgadas ? `${selectedEquipo.pulgadas}"` : "—"}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase block">Tipo de Falla</span>
                    <p className="font-bold text-amber-300 text-xs sm:text-sm">{selectedEquipo.tipoFalla}</p>
                  </div>
                </div>

                {selectedEquipo.comentarios && (
                  <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 mt-2">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-0.5">
                      Observaciones / Detalle adicional:
                    </span>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedEquipo.comentarios}
                    </p>
                  </div>
                )}
              </div>

              {/* Sección 4: Fotografías de Respaldo */}
              <div className="space-y-2 pt-1">
                <span className="text-xs text-slate-300 font-bold uppercase flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-primary" /> Fotografías de Respaldo (Toca para ampliar)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {selectedEquipo.fotoTagCaja && (
                    <div
                      onClick={() => setPreviewPhotoUrl(getMediaUrl(selectedEquipo.fotoTagCaja))}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-white/10 bg-black/50 hover:border-primary transition-all"
                    >
                      <div className="aspect-video sm:aspect-square w-full relative overflow-hidden">
                        <img
                          src={getMediaUrl(selectedEquipo.fotoTagCaja)}
                          alt="Tag Caja"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/80 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                          Tag Caja
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEquipo.fotoTagTv && (
                    <div
                      onClick={() => setPreviewPhotoUrl(getMediaUrl(selectedEquipo.fotoTagTv))}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-white/10 bg-black/50 hover:border-primary transition-all"
                    >
                      <div className="aspect-video sm:aspect-square w-full relative overflow-hidden">
                        <img
                          src={getMediaUrl(selectedEquipo.fotoTagTv)}
                          alt="Tag TV"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/80 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                          Tag TV
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEquipo.fotoFalla1 && (
                    <div
                      onClick={() => setPreviewPhotoUrl(getMediaUrl(selectedEquipo.fotoFalla1))}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-amber-500/30 bg-black/50 hover:border-amber-400 transition-all"
                    >
                      <div className="aspect-video sm:aspect-square w-full relative overflow-hidden">
                        <img
                          src={getMediaUrl(selectedEquipo.fotoFalla1)}
                          alt="Foto Daño 1"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 left-1 bg-amber-950/90 text-[9px] text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                          Daño 1
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEquipo.fotoFalla2 && (
                    <div
                      onClick={() => setPreviewPhotoUrl(getMediaUrl(selectedEquipo.fotoFalla2))}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-amber-500/30 bg-black/50 hover:border-amber-400 transition-all"
                    >
                      <div className="aspect-video sm:aspect-square w-full relative overflow-hidden">
                        <img
                          src={getMediaUrl(selectedEquipo.fotoFalla2)}
                          alt="Foto Daño 2"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 left-1 bg-amber-950/90 text-[9px] text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                          Daño 2
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEquipo.fotoFalla3 && (
                    <div
                      onClick={() => setPreviewPhotoUrl(getMediaUrl(selectedEquipo.fotoFalla3))}
                      className="group cursor-pointer rounded-xl overflow-hidden border border-amber-500/30 bg-black/50 hover:border-amber-400 transition-all"
                    >
                      <div className="aspect-video sm:aspect-square w-full relative overflow-hidden">
                        <img
                          src={getMediaUrl(selectedEquipo.fotoFalla3)}
                          alt="Foto Daño 3"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 left-1 bg-amber-950/90 text-[9px] text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                          Daño 3
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer del Modal con botón de eliminar (solo admin) y cerrar */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
            <div>
              {isAdmin && selectedEquipo && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletingId === selectedEquipo.id}
                  onClick={() => handleDeleteEquipment(selectedEquipo.id)}
                  className="w-full sm:w-auto bg-red-600/80 hover:bg-red-600 text-white text-xs h-9 font-semibold gap-1.5"
                >
                  {deletingId === selectedEquipo.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Eliminar Registro
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedEquipo(null)}
              className="w-full sm:w-auto border-white/10 text-white hover:bg-white/10 text-xs h-9"
            >
              Cerrar Detalle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Zoom Foto */}
      <Dialog open={!!previewPhotoUrl} onOpenChange={(open) => !open && setPreviewPhotoUrl(null)}>
        <DialogContent className="w-[95vw] max-w-3xl glass-card border-white/10 p-3 sm:p-4 max-h-[90vh] flex flex-col justify-center items-center rounded-2xl">
          <div className="flex justify-center items-center w-full h-full p-1">
            {previewPhotoUrl && (
              <img
                src={previewPhotoUrl}
                alt="Vista previa ampliada"
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}
          </div>
          <div className="w-full pt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPhotoUrl(null)}
              className="border-white/10 text-white hover:bg-white/5 text-xs h-8"
            >
              Cerrar Foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
