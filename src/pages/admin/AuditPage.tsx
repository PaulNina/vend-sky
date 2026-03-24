import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPut, uploadUrl, getToken } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, RotateCcw, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateBolivia, formatDateTimeBolivia } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImageViewer } from "@/components/ImageViewer";
import { ExternalLink, Maximize2 } from "lucide-react";

interface ApprovedSale {
  id: number;
  serial: string;
  saleDate: string;
  createdAt: string;
  ciudad: string;
  bonoBs: number;
  puntos: number;
  estado: string;
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
      const url = `/sales?status=APROBADA&page=${page}&size=${pageSize}&search=${encodeURIComponent(search)}&startDate=${startDate}&endDate=${endDate}&sortBy=createdAt&sortDir=desc`;
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
  }, [page, search, startDate, endDate]);

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
      toast({ title: "Error", description: "El motivo es obligatorio.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      await apiPut(`/sales/${detailSale.id}/reject`, { motivo: revertReason });
      toast({ title: "Venta revertida", description: "La aprobación fue revertida." });
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

  const handleOpenNewTab = (url: string) => {
    window.open(url, "_blank");
  };



  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Auditoría
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Muestreo aleatorio de aprobaciones para validación</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input 
            placeholder="Buscar por serial o vendedor..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} 
            className="w-full sm:w-64 h-9" 
          />
          <div className="flex gap-2 items-center">
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} className="h-9 w-36" />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} className="h-9 w-36" />
          </div>
          <Button onClick={() => { setPage(0); loadData(); }} variant="secondary" size="sm">
            Filtrar
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="py-3 px-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Muestra Actual</p>
          <p className="text-xl font-bold font-display mt-0.5">{sales.length} ventas</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Total</p>
          <p className="text-xl font-bold font-display mt-0.5">Bs {sales.reduce((a, s) => a + Number(s.bonoBs), 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ciudades</p>
          <p className="text-xl font-bold font-display mt-0.5">{new Set(sales.map((s) => s.ciudad)).size}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : isMobile ? (
            <div className="divide-y divide-border">
              {sales.map((s) => (
                <div key={s.id} className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/30" onClick={() => viewDetail(s)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold">{s.vendorName || "—"}</p>
                      <Badge variant="outline" className="text-[10px]">{s.ciudad}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{s.productModel} {s.productSize || ''}</p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{s.serial}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground">{formatDateBolivia(s.saleDate)}</p>
                      <p className="text-sm font-bold text-primary">Bs {s.bonoBs}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 mt-4">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm">Sin aprobaciones para auditar</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Reg.</TableHead>
                  <TableHead>F. Venta</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead className="text-right">Bs</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{formatDateTimeBolivia(s.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateBolivia(s.saleDate)}</TableCell>
                    <TableCell className="font-medium text-sm">{s.vendorName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{s.ciudad}</Badge></TableCell>
                    <TableCell className="text-sm">{s.productModel} {s.productSize || ''}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell className="text-right font-medium">Bs {s.bonoBs}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => viewDetail(s)} className="hover:bg-primary/10">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Sin aprobaciones para auditar</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && totalElements > 0 && (
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-card rounded-b-xl border-x border-b">
          <p className="text-sm text-muted-foreground italic">
            Mostrando {sales.length} de {totalElements} registros encontrados
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              disabled={page === 0}
              onClick={() => setPage(prev => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 mx-2">
              <span className="text-sm text-muted-foreground mr-1">Página</span>
              <Input 
                className="w-12 h-8 text-center text-xs p-1" 
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
              <span className="text-sm text-muted-foreground ml-1">de {totalPages}</span>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              disabled={page >= totalPages - 1}
              onClick={() => setPage(prev => prev + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="w-full sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />Auditoría de Venta
            </DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-5">
               <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 text-sm p-4 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.vendorName}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.ciudad}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.productModel} {detailSale.productSize || ""}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5 text-base sm:text-sm">{detailSale.serial}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Fecha</span><p className="font-medium mt-0.5 text-base sm:text-sm">{formatDateBolivia(detailSale.saleDate)}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Bono</span><p className="font-medium mt-0.5 text-base sm:text-sm">Bs {detailSale.bonoBs}</p></div>
              </div>

              {(detailSale.fotoTag || detailSale.fotoPoliza || detailSale.fotoNota) && (
                <div className="space-y-2">
                  <p className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Respaldos Fotográficos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[{ label: "TAG", url: detailSale.fotoTag }, { label: "Póliza", url: detailSale.fotoPoliza }, { label: "Nota", url: detailSale.fotoNota }].map((att) => att.url ? (
                      <Card key={att.label} className="overflow-hidden bg-background">
                        <CardContent className="p-2 space-y-2">
                          <div className="relative aspect-video bg-muted rounded-md overflow-hidden group">
                            {loadingImages && !imageBlobs[att.url] ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted/50"><Loader2 className="h-5 w-5 animate-spin text-primary/40" /></div>
                            ) : null}
                            <img
                              src={imageBlobs[att.url] || uploadUrl(att.url)}
                              alt={att.label}
                              className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${loadingImages && !imageBlobs[att.url] ? "opacity-30" : "opacity-100 hover:scale-105"}`}
                              onClick={() => setZoomedImage({ url: imageBlobs[att.url!] || uploadUrl(att.url!), label: att.label, originalUrl: uploadUrl(att.url!) })}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <Maximize2 className="text-white h-8 w-8 opacity-75" />
                            </div>
                          </div>
                          <Button variant="secondary" className="w-full h-8 text-xs font-semibold" onClick={() => handleOpenNewTab(uploadUrl(att.url!))}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver Imagen
                          </Button>
                          <p className="text-base sm:text-[10px] text-center font-medium text-muted-foreground uppercase tracking-widest">{att.label}</p>
                        </CardContent>
                      </Card>
                    ) : null)}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-3 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider">Motivo de reversión (obligatorio)</Label>
                  <Textarea value={revertReason} onChange={(e) => setRevertReason(e.target.value)} placeholder="Motivo..." className="min-h-[80px]" />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleOk} disabled={processing} className="flex-1" variant="outline">Auditoría OK</Button>
                  <Button variant="destructive" onClick={handleRevert} disabled={processing} className="flex-1">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                    Revertir
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDetailSale(null)}>Cerrar</Button>
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
