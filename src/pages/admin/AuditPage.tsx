import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPut, uploadUrl, getToken, apiDownloadFile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, RotateCcw, ShieldCheck, ChevronLeft, ChevronRight, History } from "lucide-react";
import { formatDateBolivia, formatDateTimeBolivia } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImageViewer } from "@/components/ImageViewer";
import { ExternalLink, Maximize2 } from "lucide-react";

export interface RechazoHistorialEntry {
  fecha: string;
  motivo: string;
  revisor?: string;
}

interface ApprovedSale {
  id: number;
  serial: string;
  saleDate: string;
  createdAt: string;
  ciudad: string;
  bonoBs: number;
  puntos: number;
  estado: string;
  motivoRechazo?: string;
  historialRechazos?: string;
  vendorName?: string;
  productModel?: string;
  productSize?: string;
  fotoTag?: string;
  fotoPoliza?: string;
  fotoNota?: string;
}

export default function AuditPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<ApprovedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailSale, setDetailSale] = useState<ApprovedSale | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; label: string; originalUrl: string } | null>(null);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageJump, setPageJump] = useState("");
  const pageSize = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : "";
      const url = `/sales?page=${page}&size=${pageSize}&search=${encodeURIComponent(search)}&startDate=${startDate}&endDate=${endDate}${statusParam}&sortBy=createdAt&sortDir=desc`;
      const data = await apiGet<{ 
        content: ApprovedSale[], 
        page?: { totalPages: number, totalElements: number }, 
        totalPages?: number, 
        totalElements?: number 
      }>(url);
      setSales(data.content || []);
      setTotalPages(data.page?.totalPages ?? data.totalPages ?? 0);
      setTotalElements(data.page?.totalElements ?? data.totalElements ?? 0);
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudieron cargar las ventas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, search, startDate, endDate, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const viewDetail = async (sale: ApprovedSale) => {
    Object.values(imageBlobs).forEach(URL.revokeObjectURL);
    setImageBlobs({});
    setDetailSale(sale);
    setRevertReason("");

    const photos = [sale.fotoTag, sale.fotoPoliza, sale.fotoNota].filter(Boolean) as string[];
    if (photos.length > 0) {
      setLoadingImages(true);
      const newBlobs: Record<string, string> = {};
      await Promise.all(photos.map(async (path) => {
        try {
          const url = uploadUrl(path);
          const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
          const blob = await res.blob();
          newBlobs[path] = URL.createObjectURL(blob);
        } catch (e) {
          console.error("Error loading image:", path, e);
        }
      }));
      setImageBlobs(newBlobs);
      setLoadingImages(false);
    }
  };

  const handleRevert = async () => {
    if (!detailSale || !revertReason.trim()) {
      toast({ title: "Error", description: "El motivo es obligatorio para rechazar.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      await apiPut(`/sales/${detailSale.id}/reject`, { motivo: revertReason });
      toast({ title: "Venta rechazada", description: "La venta ha sido rechazada." });
      setDetailSale(null);
      loadData();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleRevertToPending = async () => {
    if (!detailSale) return;
    setProcessing(true);
    try {
      await apiPut(`/sales/${detailSale.id}/revert-to-pending`, {});
      toast({ title: "Venta restablecida", description: "La venta volvió a estado PENDIENTE." });
      setDetailSale(null);
      loadData();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleOk = () => {
    toast({ title: "Auditoría OK" });
    setDetailSale(null);
  };

  const [exporting, setExporting] = useState(false);

  const handleOpenNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      await apiDownloadFile(`/sales/export-excel?${params.toString()}`, "Reporte_Auditoria_Ventas.xlsx");
      toast({ title: "Éxito", description: "Reporte de auditoría descargado correctamente" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const parseHistorialRechazos = (raw?: string): RechazoHistorialEntry[] => {
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const currentRejectionHistory = parseHistorialRechazos(detailSale?.historialRechazos);
  const ultimoMotivo = detailSale?.motivoRechazo || 
    (currentRejectionHistory.length > 0 ? currentRejectionHistory[currentRejectionHistory.length - 1].motivo : "");

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Auditoría de Ventas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Control y validación de respaldos de todas las ventas registradas</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input 
            placeholder="Buscar por serial o vendedor..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} 
            className="w-full sm:w-64 h-10 bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0" 
          />
          <Select value={statusFilter || "ALL"} onValueChange={(val) => { setStatusFilter(val === "ALL" ? "" : val); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="APROBADA">Aprobadas</SelectItem>
              <SelectItem value="PENDIENTE">Pendientes</SelectItem>
              <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
              <SelectItem value="CERRADA">Cerradas</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center">
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} className="h-10 w-36 bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} className="h-10 w-36 bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
          </div>
          <Button onClick={() => { setPage(0); loadData(); }} className="bg-slate-850 hover:bg-slate-800 text-white border border-white/10 h-10">
            Filtrar
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={exporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 shadow-lg"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : null}
            {exporting ? "Descargando..." : "Descargar Excel"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Ventas Registradas</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-white">{totalElements} ventas</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Bono Total (Página)</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-emerald-400">Bs {sales.reduce((a, s) => a + Number(s.bonoBs), 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Ciudades</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-primary">{new Set(sales.map((s) => s.ciudad)).size}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : isMobile ? (
            <div className="divide-y divide-white/5">
              {sales.map((s) => (
                <div key={s.id} className="p-4 flex items-start gap-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => viewDetail(s)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-white truncate">{s.vendorName || "—"}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">{s.ciudad}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${
                          s.estado === "APROBADA" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" :
                          s.estado === "PENDIENTE" ? "border-amber-500/40 text-amber-400 bg-amber-500/10" :
                          s.estado === "RECHAZADA" ? "border-red-500/40 text-red-400 bg-red-500/10" :
                          "border-slate-500/40 text-slate-300 bg-slate-500/10"
                        }`}>{s.estado}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{s.productModel} {s.productSize || ''}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.serial}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-slate-500">{formatDateBolivia(s.saleDate)}</p>
                      <p className="text-sm font-bold text-emerald-400">Bs {s.bonoBs}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 mt-4 text-slate-400 hover:text-white hover:bg-white/5">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm font-medium">Sin ventas registradas</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Fecha Reg.</TableHead>
                  <TableHead className="text-xs text-muted-foreground">F. Venta</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Producto</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Serial</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">Bs</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell>
                      <div className="text-sm text-slate-400 font-mono">{formatDateTimeBolivia(s.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300 font-mono">{formatDateBolivia(s.saleDate)}</TableCell>
                    <TableCell className="font-semibold text-sm text-white">{s.vendorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/5">{s.ciudad}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{s.productModel} {s.productSize || ''}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{s.serial}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${
                        s.estado === "APROBADA" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" :
                        s.estado === "PENDIENTE" ? "border-amber-500/40 text-amber-400 bg-amber-500/10" :
                        s.estado === "RECHAZADA" ? "border-red-500/40 text-red-400 bg-red-500/10" :
                        "border-slate-500/40 text-slate-300 bg-slate-500/10"
                      }`}>
                        {s.estado || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-400 text-sm">Bs {s.bonoBs}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => viewDetail(s)} className="text-slate-400 hover:text-white hover:bg-white/5">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12 border-white/5">Sin ventas registradas</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && totalElements > 0 && (
        <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/20 rounded-b-xl border-x border-b border-white/5">
          <p className="text-xs text-slate-400 italic">
            Mostrando {sales.length} de {totalElements} registros encontrados
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-white/10 hover:bg-white/5 text-white" 
              disabled={page === 0}
              onClick={() => setPage(prev => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 mx-2">
              <span className="text-xs text-slate-400 mr-1">Página</span>
              <Input 
                className="w-12 h-8 text-center text-xs p-1 bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" 
                value={pageJump !== "" ? pageJump : page + 1}
                onChange={(e) => setPageJump(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const p = parseInt(pageJump) - 1;
                    if (!isNaN(p) && p >= 0 && p < totalPages) {
                      setPage(p);
                      setPageJump("");
                    }
                  }
                }}
                onBlur={() => setPageJump("")}
              />
              <span className="text-xs text-slate-400 ml-1">de {totalPages}</span>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-white/10 hover:bg-white/5 text-white" 
              disabled={page >= totalPages - 1}
              onClick={() => setPage(prev => prev + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="w-full sm:max-w-4xl glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-white text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />Auditoría de Venta
            </DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-5 py-2">
               <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 text-sm p-4 rounded-lg bg-black/20 border border-white/5">
                <div><span className="text-xs text-slate-400 uppercase tracking-wider">Vendedor</span><p className="font-semibold mt-0.5 text-white">{detailSale.vendorName}</p></div>
                <div><span className="text-xs text-slate-400 uppercase tracking-wider">Ciudad</span><p className="font-semibold mt-0.5 text-white">{detailSale.ciudad}</p></div>
                <div><span className="text-xs text-slate-400 uppercase tracking-wider">Producto</span><p className="font-semibold mt-0.5 text-white">{detailSale.productModel} {detailSale.productSize || ""}</p></div>
                <div><span className="text-xs text-slate-400 uppercase tracking-wider">Serial</span><p className="font-mono font-semibold mt-0.5 text-white">{detailSale.serial}</p></div>
                <div><span className="text-xs text-slate-400 uppercase tracking-wider">Fecha</span><p className="font-semibold mt-0.5 text-white font-mono">{formatDateBolivia(detailSale.saleDate)}</p></div>
                <div><span className="text-xs text-slate-400 uppercase tracking-wider">Bono</span><p className="font-semibold mt-0.5 text-emerald-400">Bs {detailSale.bonoBs}</p></div>
              </div>

              {(detailSale.fotoTag || detailSale.fotoPoliza || detailSale.fotoNota) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Respaldos Fotográficos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[{ label: "TAG", url: detailSale.fotoTag }, { label: "Póliza", url: detailSale.fotoPoliza }, { label: "Nota", url: detailSale.fotoNota }].map((att) => att.url ? (
                      <Card key={att.label} className="overflow-hidden bg-black/20 border-white/5">
                        <CardContent className="p-2 space-y-2">
                          <div className="relative aspect-video bg-black/40 rounded-md overflow-hidden group">
                            {loadingImages && !imageBlobs[att.url] ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-primary/40" /></div>
                            ) : null}
                            <img
                              src={imageBlobs[att.url] || uploadUrl(att.url)}
                              alt={att.label}
                              className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${loadingImages && !imageBlobs[att.url] ? "opacity-30" : "opacity-100 hover:scale-105"}`}
                              onClick={() => setZoomedImage({ url: imageBlobs[att.url!] || uploadUrl(att.url!), label: att.label, originalUrl: uploadUrl(att.url!) })}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none animate-fade-in">
                              <Maximize2 className="text-white h-8 w-8 opacity-75" />
                            </div>
                          </div>
                          <Button variant="secondary" className="w-full h-8 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border-none" onClick={() => handleOpenNewTab(uploadUrl(att.url!))}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver original
                          </Button>
                          <p className="text-[10px] text-center font-medium text-slate-400 uppercase tracking-widest pt-1">{att.label}</p>
                        </CardContent>
                      </Card>
                    ) : null)}
                  </div>
                </div>
              )}

              {detailSale.estado === "RECHAZADA" ? (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Motivo del Rechazo</p>
                    <p className="text-xs text-slate-300">
                      <span className="font-semibold text-white">Motivo: </span>
                      {ultimoMotivo || "Sin motivo registrado"}
                    </p>
                  </div>

                  {currentRejectionHistory.length > 1 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-slate-400" />
                        Historial de Rechazos ({currentRejectionHistory.length})
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {currentRejectionHistory.map((h, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-white/5 bg-black/30 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-red-400">Rechazo #{idx + 1}</span>
                              <span className="text-slate-400 font-mono">{formatDateTimeBolivia(h.fecha)}</span>
                            </div>
                            <p className="text-slate-200"><span className="text-slate-400 font-medium">Motivo: </span>{h.motivo}</p>
                            {h.revisor && <p className="text-[10px] text-slate-500">Revisado por: {h.revisor}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={handleRevertToPending} disabled={processing} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                    Revertir a Pendiente (Reabrir Revisión)
                  </Button>
                </div>
              ) : detailSale.estado === "APROBADA" ? (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  {currentRejectionHistory.length > 0 && (
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-amber-400" />
                        Historial de Rechazos Anteriores ({currentRejectionHistory.length})
                      </p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {currentRejectionHistory.map((h, idx) => (
                          <div key={idx} className="p-2 rounded border border-white/5 bg-black/20 text-xs space-y-0.5">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-amber-300">Rechazo #{idx + 1}</span>
                              <span className="font-mono">{formatDateTimeBolivia(h.fecha)}</span>
                            </div>
                            <p className="text-slate-300"><span className="text-slate-400">Motivo: </span>{h.motivo}</p>
                            {h.revisor && <p className="text-[10px] text-slate-500">Revisor: {h.revisor}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Motivo de rechazo / reversión (opcional para volver a pendiente, obligatorio para rechazar)</Label>
                    <Textarea value={revertReason} onChange={(e) => setRevertReason(e.target.value)} placeholder="Especifica el motivo de la reversión o rechazo aquí..." className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 min-h-[70px] resize-none text-xs" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Button onClick={handleOk} disabled={processing} className="border-white/10 hover:bg-white/5 text-white" variant="outline">
                      Auditoría OK
                    </Button>
                    <Button onClick={handleRevertToPending} disabled={processing} className="bg-amber-600 hover:bg-amber-500 text-white">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                      Volver a Pendiente
                    </Button>
                    <Button variant="destructive" onClick={handleRevert} disabled={processing || !revertReason.trim()} className="bg-red-650 hover:bg-red-600 text-white">
                      Rechazar Venta
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  {currentRejectionHistory.length > 0 && (
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-amber-400" />
                        Historial de Rechazos Anteriores ({currentRejectionHistory.length})
                      </p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {currentRejectionHistory.map((h, idx) => (
                          <div key={idx} className="p-2 rounded border border-white/5 bg-black/20 text-xs space-y-0.5">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-amber-300">Rechazo #{idx + 1}</span>
                              <span className="font-mono">{formatDateTimeBolivia(h.fecha)}</span>
                            </div>
                            <p className="text-slate-300"><span className="text-slate-400">Motivo: </span>{h.motivo}</p>
                            {h.revisor && <p className="text-[10px] text-slate-500">Revisor: {h.revisor}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300">
                    Esta venta está actualmente en estado <strong className="text-white">PENDIENTE</strong> de revisión.
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setDetailSale(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      <ImageViewer 
        url={zoomedImage?.url || null} 
        onClose={() => setZoomedImage(null)} 
        title={zoomedImage?.label}
        originalUrl={zoomedImage?.originalUrl || null}
      />
    </div>
  );
}
