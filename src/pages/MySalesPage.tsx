import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPutForm, uploadUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, 
  Eye, 
  Download, 
  XCircle, 
  ZoomIn, 
  ZoomOut, 
  AlertCircle, 
  Camera, 
  Upload, 
  CheckCircle2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateBolivia, formatDateTimeBolivia } from "@/lib/utils";
import { compressImage, formatBytes } from "@/lib/imageCompressor";
import { ImageUploadBox } from "@/components/common/ImageUploadBox";

interface Sale {
  id: number;
  serial: string;
  saleDate: string;
  ciudad: string;
  estado: string;
  puntos: number;
  bonoBs: number;
  createdAt: string;
  productModel?: string;
  productSize?: string;
  fotoTag?: string;
  fotoPoliza?: string;
  fotoNota?: string;
  vendorName?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorCi?: string;
  motivoRechazo?: string;
  motivoObservacion?: string;
  archivosObservados?: string;
  evidenciasAnteriores?: string;
  fechaObservacion?: string;
  fechaSubsanacion?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  OBSERVADA: "Observada",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  ANULADA: "Anulada",
  CERRADA: "Cerrada",
};

const STATUS_VARIANTS: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  PENDIENTE: "secondary",
  OBSERVADA: "outline",
  APROBADA: "default",
  RECHAZADA: "destructive",
  ANULADA: "destructive",
  CERRADA: "secondary",
};

interface Campaign {
  id: number;
  nombre: string;
  activo: boolean;
  registroHabilitado?: boolean;
}

export default function MySalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  // Subsanación modal state
  const [resubmitSale, setResubmitSale] = useState<Sale | null>(null);
  const [resubmitTag, setResubmitTag] = useState<File | null>(null);
  const [resubmitPoliza, setResubmitPoliza] = useState<File | null>(null);
  const [resubmitNota, setResubmitNota] = useState<File | null>(null);
  const [compressingResubmitTag, setCompressingResubmitTag] = useState(false);
  const [compressingResubmitPoliza, setCompressingResubmitPoliza] = useState(false);
  const [compressingResubmitNota, setCompressingResubmitNota] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  // Zoom modal state
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<Campaign[]>("/campaigns")
      .then((data) => {
        const list = data || [];
        setCampaigns(list);
        const active = list.find((c) => c.activo);
        if (active) {
          setSelectedCampaign(String(active.id));
        } else if (list.length > 0) {
          setSelectedCampaign(String(list[0].id));
        } else {
          setSelectedCampaign("all");
        }
      })
      .catch(() => {});
  }, []);

  const loadSales = useCallback(() => {
    if (!user) return;
    setLoading(true);
    const url = selectedCampaign && selectedCampaign !== "all"
      ? `/vendor/sales?campanaId=${selectedCampaign}`
      : "/vendor/sales";
    apiGet<Sale[]>(url)
      .then((data) => setSales(data || []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, [user, selectedCampaign]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const filtered = statusFilter === "all" ? sales : sales.filter((s) => s.estado === statusFilter);

  const handleOpenResubmit = (sale: Sale) => {
    setResubmitSale(sale);
    setResubmitTag(null);
    setResubmitPoliza(null);
    setResubmitNota(null);
  };

  const handleCloseResubmit = () => {
    setResubmitSale(null);
    setResubmitTag(null);
    setResubmitPoliza(null);
    setResubmitNota(null);
    setCompressingResubmitTag(false);
    setCompressingResubmitPoliza(false);
    setCompressingResubmitNota(false);
  };

  const handleResubmitPhotoSelect = async (file: File, type: "tag" | "poliza" | "nota") => {
    if (!file) return;
    if (type === "tag") setCompressingResubmitTag(true);
    else if (type === "poliza") setCompressingResubmitPoliza(true);
    else if (type === "nota") setCompressingResubmitNota(true);

    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.75 });
      if (type === "tag") setResubmitTag(compressed);
      else if (type === "poliza") setResubmitPoliza(compressed);
      else if (type === "nota") setResubmitNota(compressed);
    } catch (e) {
      console.warn("Fallo al comprimir foto de subsanación:", e);
      if (type === "tag") setResubmitTag(file);
      else if (type === "poliza") setResubmitPoliza(file);
      else if (type === "nota") setResubmitNota(file);
    } finally {
      if (type === "tag") setCompressingResubmitTag(false);
      else if (type === "poliza") setCompressingResubmitPoliza(false);
      else if (type === "nota") setCompressingResubmitNota(false);
    }
  };

  const handleSubmitResubmit = async () => {
    if (!resubmitSale) return;

    if (compressingResubmitTag || compressingResubmitPoliza || compressingResubmitNota) {
      toast({
        title: "Optimizando fotografías",
        description: "Por favor espera un instante mientras se completa la optimización.",
      });
      return;
    }

    if (!resubmitTag && !resubmitPoliza && !resubmitNota) {
      toast({
        variant: "destructive",
        title: "Selecciona al menos una foto",
        description: "Debes subir al menos una foto nueva para subsanar la observación.",
      });
      return;
    }

    setResubmitting(true);
    try {
      const formData = new FormData();
      if (resubmitTag) formData.append("fotoTag", resubmitTag);
      if (resubmitPoliza) formData.append("fotoPoliza", resubmitPoliza);
      if (resubmitNota) formData.append("fotoNota", resubmitNota);

      const updated = await apiPutForm<Sale>(`/sales/${resubmitSale.id}/resubmit`, formData);
      toast({
        title: "Venta subsanada",
        description: "Tus documentos han sido reenviados para una nueva revisión.",
      });

      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (detailSale && detailSale.id === updated.id) {
        setDetailSale(updated);
      }
      handleCloseResubmit();
    } catch (err: unknown) {
      const error = err as Error;
      toast({
        variant: "destructive",
        title: "Error al subsanar venta",
        description: error?.message || "No se pudo reenviar la venta. Intenta nuevamente.",
      });
    } finally {
      setResubmitting(false);
    }
  };

  const handleZoomToggle = () => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoomLevel(2);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleDownload = async (url?: string, filename?: string) => {
    if (!url) return;
    try {
      const fullUrl = uploadUrl(url);
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "imagen.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight">Mis Ventas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{sales.length} registros totales</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[220px] text-xs sm:text-sm glass-card border-white/10 truncate">
              <SelectValue placeholder="Campaña" />
            </SelectTrigger>
            <SelectContent className="glass-card bg-slate-900 border-white/10 text-white max-h-72">
              <SelectItem value="all">Todas las campañas (Histórico)</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre} {c.activo ? "🟢 (Activa)" : "⚪ (Antigua)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] text-xs sm:text-sm glass-card border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent className="glass-card bg-slate-900 border-white/10 text-white">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="OBSERVADA">Observadas</SelectItem>
              <SelectItem value="PENDIENTE">Pendientes</SelectItem>
              <SelectItem value="APROBADA">Aprobadas</SelectItem>
              <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {["APROBADA", "OBSERVADA", "PENDIENTE", "RECHAZADA"].map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs bg-muted/30 rounded-full px-3 py-1 border border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              s === "APROBADA" 
                ? "bg-success animate-pulse" 
                : s === "OBSERVADA" 
                ? "bg-amber-400 animate-pulse" 
                : s === "RECHAZADA" 
                ? "bg-destructive" 
                : "bg-warning"
            }`} />
            <span>{STATUS_LABELS[s] || s}: <strong>{sales.filter((x) => x.estado === s).length}</strong></span>
          </div>
        ))}
      </div>

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl">
        <CardContent className="p-0">
          {isMobile ? (
            <div className="divide-y divide-border">
              {filtered.map((s) => (
                <div 
                  key={s.id} 
                  className="p-3 flex flex-col gap-2 cursor-pointer hover:bg-white/5 transition-all duration-150" 
                  onClick={() => setDetailSale(s)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      s.estado === "APROBADA" 
                        ? "bg-success animate-pulse" 
                        : s.estado === "OBSERVADA" 
                        ? "bg-amber-400 animate-pulse" 
                        : s.estado === "RECHAZADA" 
                        ? "bg-destructive" 
                        : "bg-warning"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.productModel || "—"} {s.productSize || ""}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{s.serial}</p>
                      <p className="text-[11px] text-muted-foreground/70">Reg: {formatDateTimeBolivia(s.createdAt)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Venta: {formatDateBolivia(s.saleDate)} · {s.ciudad}</p>
                    </div>
                    <Badge 
                      variant={STATUS_VARIANTS[s.estado] || "secondary"} 
                      className={`text-[10px] shrink-0 ${
                        s.estado === "OBSERVADA" ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : ""
                      }`}
                    >
                      {STATUS_LABELS[s.estado] || s.estado}
                    </Badge>
                  </div>

                  {s.estado === "OBSERVADA" && (
                    <div 
                      className="mt-1 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> Venta Observada
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs border-amber-500/40 text-amber-200 bg-amber-500/20 hover:bg-amber-500/30"
                          onClick={() => handleOpenResubmit(s)}
                        >
                          <Camera className="h-3 w-3 mr-1" /> Subsanar Fotos
                        </Button>
                      </div>
                      {s.motivoObservacion && (
                        <p className="text-[11px] text-amber-200/90 leading-tight">
                          <strong>Motivo:</strong> {s.motivoObservacion}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm">Sin ventas</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead>Fecha Reg.</TableHead>
                  <TableHead>F. Venta</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right">Bono Bs</TableHead>
                  <TableHead className="text-right w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell>
                      <div className="text-sm font-medium">{formatDateTimeBolivia(s.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateBolivia(s.saleDate)}</TableCell>
                    <TableCell className="font-medium text-sm">{s.productModel || "—"} {s.productSize || ""}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell>{s.ciudad}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={STATUS_VARIANTS[s.estado] || "secondary"} 
                        className={`text-[10px] ${
                          s.estado === "OBSERVADA" ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : ""
                        }`}
                      >
                        {STATUS_LABELS[s.estado] || s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{s.puntos}</TableCell>
                    <TableCell className="text-right">Bs {s.bonoBs}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {s.estado === "OBSERVADA" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenResubmit(s)} 
                            className="h-7 px-2 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/25"
                            title="Subsanar Fotos Observadas"
                          >
                            <Camera className="h-3.5 w-3.5 mr-1 text-amber-400" /> Subsanar
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDetailSale(s)} className="hover:bg-primary/10">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">Sin ventas para el filtro seleccionado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="w-full sm:max-w-3xl glass-card border-white/10 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display">Detalle de Venta</DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm p-4 rounded-lg bg-card/40 border border-white/5 shadow-inner">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5">{detailSale.vendorName || "—"}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Teléfono</span><p className="font-medium mt-0.5">{detailSale.vendorPhone || "—"}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">CI</span><p className="font-medium mt-0.5">{detailSale.vendorCi || "—"}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</span><p className="font-medium mt-0.5 truncate" title={detailSale.vendorEmail}>{detailSale.vendorEmail || "—"}</p></div>
                
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5">{detailSale.productModel} {detailSale.productSize || ""}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5">{detailSale.serial}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">F. Venta</span><p className="font-medium mt-0.5">{formatDateBolivia(detailSale.saleDate)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5">{detailSale.ciudad}</p></div>
                
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado</span>
                  <div className="mt-0.5">
                    <Badge 
                      variant={STATUS_VARIANTS[detailSale.estado] || "secondary"}
                      className={detailSale.estado === "OBSERVADA" ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : ""}
                    >
                      {STATUS_LABELS[detailSale.estado] || detailSale.estado}
                    </Badge>
                  </div>
                </div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bono / Pts</span><p className="font-medium mt-0.5 font-display text-primary">Bs {detailSale.bonoBs} · {detailSale.puntos} pts</p></div>
                
                {detailSale.estado === "OBSERVADA" && (
                  <div className="col-span-2 sm:col-span-4 mt-2 p-3.5 bg-amber-500/10 rounded-lg border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        Venta Observada por Revisión
                      </span>
                      <Button 
                        size="sm" 
                        className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                        onClick={() => {
                          const current = detailSale;
                          setDetailSale(null);
                          handleOpenResubmit(current);
                        }}
                      >
                        <Camera className="h-3.5 w-3.5 mr-1.5" /> Subsanar Fotos Ahora
                      </Button>
                    </div>
                    {detailSale.motivoObservacion && (
                      <p className="text-xs text-amber-200">
                        <strong>Motivo:</strong> {detailSale.motivoObservacion}
                      </p>
                    )}
                    {detailSale.archivosObservados && (
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        <span className="text-[11px] text-amber-300/80">Fotos requeridas:</span>
                        {detailSale.archivosObservados.split(",").map((req) => (
                          <Badge key={req} variant="outline" className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-500/15 font-mono">
                            {req.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailSale.motivoRechazo && (
                  <div className="col-span-2 sm:col-span-4 mt-1 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    <span className="text-[10px] text-destructive font-semibold uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Motivo de Rechazo
                    </span>
                    <p className="font-medium mt-1 text-sm text-destructive">{detailSale.motivoRechazo}</p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {(detailSale.fotoTag || detailSale.fotoPoliza || detailSale.fotoNota) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documentos Adjuntos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[{ label: "TAG", url: detailSale.fotoTag }, { label: "Póliza", url: detailSale.fotoPoliza }, { label: "Nota de Venta", url: detailSale.fotoNota }].map((att) =>
                      att.url ? (
                        <Card key={att.label} className="overflow-hidden glass-card border-white/5 hover-glow-muted transition-all duration-300">
                          <CardContent className="p-2 space-y-2">
                            <div className="relative aspect-video bg-muted rounded-md overflow-hidden group">
                              <img src={uploadUrl(att.url)} alt={att.label} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="text-white h-8 w-8 opacity-75" />
                              </div>
                            </div>
                            <Button variant="secondary" className="w-full h-8 text-xs font-semibold" onClick={() => { setZoomedImage(uploadUrl(att.url!)); setZoomLevel(1); }}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Ver Imagen
                            </Button>
                            <p className="text-[10px] text-center font-medium text-muted-foreground uppercase tracking-widest">{att.label}</p>
                          </CardContent>
                        </Card>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resubmit Dialog */}
      <Dialog open={!!resubmitSale} onOpenChange={(open) => !open && handleCloseResubmit()}>
        <DialogContent className="w-full sm:max-w-xl glass-card border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Camera className="h-5 w-5 text-amber-400" />
              Subsanar Venta #{resubmitSale?.serial}
            </DialogTitle>
          </DialogHeader>

          {resubmitSale && (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1.5">
                <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Motivo de la Observación:
                </p>
                <p className="text-xs text-amber-100/90 pl-5">
                  {resubmitSale.motivoObservacion || "Por favor reenvía las fotos solicitadas."}
                </p>
                {resubmitSale.archivosObservados && (
                  <div className="flex items-center gap-1.5 pl-5 pt-1">
                    <span className="text-[11px] text-amber-300/70 font-medium">Requeridos:</span>
                    {resubmitSale.archivosObservados.split(",").map((f) => (
                      <Badge key={f} variant="outline" className="text-[10px] border-amber-400/40 text-amber-200 bg-amber-500/10 font-mono">
                        {f.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Selecciona la(s) nueva(s) fotografía(s) para reemplazar las que fueron observadas:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* TAG */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    {resubmitSale.archivosObservados?.toUpperCase().includes("TAG") && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-300">Requerido</Badge>
                    )}
                  </div>
                  <ImageUploadBox
                    title="Foto TAG"
                    file={resubmitTag}
                    isCompressing={compressingResubmitTag}
                    onSelect={(f) => handleResubmitPhotoSelect(f, "tag")}
                    onRemove={() => setResubmitTag(null)}
                    placeholder="Subir TAG"
                  />
                  {resubmitSale.fotoTag && !resubmitTag && (
                    <p className="text-[10px] text-muted-foreground text-center">Foto previa cargada</p>
                  )}
                </div>

                {/* POLIZA */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    {resubmitSale.archivosObservados?.toUpperCase().includes("POLIZA") && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-300">Requerido</Badge>
                    )}
                  </div>
                  <ImageUploadBox
                    title="Foto Póliza"
                    file={resubmitPoliza}
                    isCompressing={compressingResubmitPoliza}
                    onSelect={(f) => handleResubmitPhotoSelect(f, "poliza")}
                    onRemove={() => setResubmitPoliza(null)}
                    placeholder="Subir Póliza"
                  />
                  {resubmitSale.fotoPoliza && !resubmitPoliza && (
                    <p className="text-[10px] text-muted-foreground text-center">Foto previa cargada</p>
                  )}
                </div>

                {/* NOTA */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    {resubmitSale.archivosObservados?.toUpperCase().includes("NOTA") && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-300">Requerido</Badge>
                    )}
                  </div>
                  <ImageUploadBox
                    title="Foto Nota"
                    file={resubmitNota}
                    isCompressing={compressingResubmitNota}
                    onSelect={(f) => handleResubmitPhotoSelect(f, "nota")}
                    onRemove={() => setResubmitNota(null)}
                    placeholder="Subir Nota"
                  />
                  {resubmitSale.fotoNota && !resubmitNota && (
                    <p className="text-[10px] text-muted-foreground text-center">Foto previa cargada</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseResubmit} 
                  disabled={resubmitting}
                  className="border-white/10"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSubmitResubmit} 
                  disabled={resubmitting || (!resubmitTag && !resubmitPoliza && !resubmitNota)}
                  className="bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  {resubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Subiendo evidencias...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1.5" /> Reenviar para Revisión
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Image Zoom Modal */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => { if (!open) setZoomedImage(null); }}>
        <DialogContent className="w-[98vw] sm:max-w-[90vw] p-0 bg-transparent border-none shadow-none focus:outline-none">
          <div className="flex flex-col items-center gap-3 p-1">
          {zoomedImage && (
            <>
                <div 
                  className="relative overflow-hidden max-h-[70vh] sm:max-h-[85vh] w-full rounded-md bg-black/20 flex flex-col items-center"
                  style={{ cursor: zoomLevel === 1 ? 'zoom-in' : isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img 
                    src={zoomedImage} 
                    alt="Zoom" 
                    className={`transition-transform duration-200 ease-out select-none ${zoomLevel === 1 ? 'max-h-[70vh] sm:max-h-[85vh] w-full object-contain' : ''}`} 
                    style={{ 
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                      transformOrigin: 'center',
                      maxWidth: zoomLevel === 1 ? '100%' : 'none',
                      cursor: zoomLevel === 1 ? 'zoom-in' : 'inherit'
                    }} 
                    onClick={(e) => {
                      if (zoomLevel === 1) handleZoomToggle();
                    }}
                    draggable={false}
                  />
                </div>
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-md px-4 py-2 rounded-full border shadow-lg">
                <Button size="sm" variant="secondary" onClick={handleZoomToggle} className="text-xs h-8 rounded-full">
                  {zoomLevel === 1 ? <><ZoomIn className="h-3.5 w-3.5 mr-1.5" /> Acercar Zoom</> : <><ZoomOut className="h-3.5 w-3.5 mr-1.5" /> Alejar Zoom</>}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleDownload(zoomedImage, "foto.jpg")} className="text-xs h-8 rounded-full">
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setZoomedImage(null)} className="text-xs h-8 rounded-full">
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cerrar
                </Button>
              </div>
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
