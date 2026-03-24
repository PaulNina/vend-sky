import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, uploadUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Eye, Download, XCircle, ZoomIn, ZoomOut, Loader } from "lucide-react";
import { useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateBolivia, formatDateTimeBolivia } from "@/lib/utils";

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
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

const STATUS_VARIANTS: Record<string, "secondary" | "default" | "destructive"> = {
  PENDIENTE: "secondary",
  APROBADA: "default",
  RECHAZADA: "destructive",
};

export default function MySalesPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiGet<Sale[]>("/vendor/sales")
      .then((data) => setSales(data || []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = statusFilter === "all" ? sales : sales.filter((s) => s.estado === statusFilter);

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

  const downloadImage = async (urlStr: string, label: string) => {
    try {
      const response = await fetch(urlStr);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${label}_${detailSale?.serial || 'imagen'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="PENDIENTE">Pendientes</SelectItem>
            <SelectItem value="APROBADA">Aprobadas</SelectItem>
            <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {["APROBADA", "PENDIENTE", "RECHAZADA"].map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded-full px-3 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${s === "APROBADA" ? "bg-success" : s === "RECHAZADA" ? "bg-destructive" : "bg-warning"}`} />
            <span>{STATUS_LABELS[s]}: <strong>{sales.filter((x) => x.estado === s).length}</strong></span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isMobile ? (
            <div className="divide-y divide-border">
              {filtered.map((s) => (
                <div key={s.id} className="p-3 flex items-start gap-2.5 cursor-pointer hover:bg-muted/30" onClick={() => setDetailSale(s)}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.estado === "APROBADA" ? "bg-success" : s.estado === "RECHAZADA" ? "bg-destructive" : "bg-warning"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.productModel || "—"} {s.productSize || ""}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{s.serial}</p>
                    <p className="text-[11px] text-muted-foreground/70">Reg: {formatDateTimeBolivia(s.createdAt)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Venta: {formatDateBolivia(s.saleDate)} · {s.ciudad}</p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[s.estado] || "secondary"} className="text-[10px] shrink-0">
                    {STATUS_LABELS[s.estado] || s.estado}
                  </Badge>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm">Sin ventas</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Reg.</TableHead>
                  <TableHead>F. Venta</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right">Bono Bs</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{formatDateTimeBolivia(s.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateBolivia(s.saleDate)}</TableCell>
                    <TableCell className="font-medium text-sm">{s.productModel || "—"} {s.productSize || ""}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell>{s.ciudad}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[s.estado] || "secondary"} className="text-[10px]">
                        {STATUS_LABELS[s.estado] || s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{s.puntos}</TableCell>
                    <TableCell className="text-right">Bs {s.bonoBs}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDetailSale(s)} className="hover:bg-primary/10">
                        <Eye className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="w-full sm:max-w-3xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display">Detalle de Venta</DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm p-4 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5">{detailSale.vendorName || "—"}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Teléfono</span><p className="font-medium mt-0.5">{detailSale.vendorPhone || "—"}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">CI</span><p className="font-medium mt-0.5">{detailSale.vendorCi || "—"}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</span><p className="font-medium mt-0.5 truncate" title={detailSale.vendorEmail}>{detailSale.vendorEmail || "—"}</p></div>
                
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5">{detailSale.productModel} {detailSale.productSize || ""}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5">{detailSale.serial}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">F. Venta</span><p className="font-medium mt-0.5">{formatDateBolivia(detailSale.saleDate)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5">{detailSale.ciudad}</p></div>
                
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado</span><Badge className="mt-0.5" variant={STATUS_VARIANTS[detailSale.estado] || "secondary"}>{STATUS_LABELS[detailSale.estado] || detailSale.estado}</Badge></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bono / Pts</span><p className="font-medium mt-0.5">Bs {detailSale.bonoBs} · {detailSale.puntos} pts</p></div>
              </div>
              {/* Attachments */}
              {(detailSale.fotoTag || detailSale.fotoPoliza || detailSale.fotoNota) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documentos Adjuntos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[{ label: "TAG", url: detailSale.fotoTag }, { label: "Póliza", url: detailSale.fotoPoliza }, { label: "Nota de Venta", url: detailSale.fotoNota }].map((att) =>
                      att.url ? (
                        <Card key={att.label} className="overflow-hidden bg-background">
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
                <Button size="sm" variant="secondary" onClick={() => downloadImage(zoomedImage, "foto")} className="text-xs h-8 rounded-full">
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

