import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPut, uploadUrl, getToken } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye, Download, ClipboardCheck, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, Trash2, Maximize2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { exportToExcel } from "@/lib/exportExcel";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateBolivia, formatDateTimeBolivia } from "@/lib/utils";
import { ImageViewer } from "@/components/ImageViewer";

interface PageResponse<T> {
  content: T[];
  totalPages?: number;
  totalElements?: number;
  size?: number;
  number?: number;
  page?: {
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
  };
}

interface Campaign {
  id: number;
  nombre: string;
}

interface Sale {
  id: number;
  serial: string;
  saleDate: string;
  ciudad: string;
  estado: string;
  puntos: number;
  bonoBs: number;
  createdAt: string;
  vendorName?: string;
  storeName?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorCi?: string;
  productModel?: string;
  productSize?: string;
  fotoTag?: string;
  fotoPoliza?: string;
  fotoNota?: string;
  aiFlag?: boolean;
}

const STATUS_MAP: Record<string, string> = { PENDIENTE: "pending", APROBADA: "approved", RECHAZADA: "rejected" };
const STATUS_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", APROBADA: "Aprobado", RECHAZADA: "Rechazado" };

export default function ReviewsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDIENTE");
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [campanaFilter, setCampanaFilter] = useState("all");
  const [dateTypeFilter, setDateTypeFilter] = useState("saleDate"); // "saleDate" or "createdAt"
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(10);
  const [pageJump, setPageJump] = useState("");

  const [cities, setCities] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; label: string; originalUrl: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [exporting, setExporting] = useState(false);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (cityFilter !== "all") params.set("city", cityFilter);
      if (search.trim()) params.set("search", search.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (campanaFilter !== "all") params.set("campanaId", campanaFilter);
      params.set("dateType", dateTypeFilter);
      
      params.set("page", String(currentPage));
      params.set("size", String(pageSize));
      params.set("sortBy", "createdAt");
      params.set("sortDir", "desc");

      const res = await apiGet<PageResponse<Sale> | Sale[]>(`/sales?${params}`);
      
      // Fetch global stats with current filters
      const statsParams = new URLSearchParams();
      if (cityFilter !== "all") statsParams.set("city", cityFilter);
      if (search.trim()) statsParams.set("search", search.trim());
      if (startDate) statsParams.set("startDate", startDate);
      if (endDate) statsParams.set("endDate", endDate);
      if (campanaFilter !== "all") statsParams.set("campanaId", campanaFilter);
      statsParams.set("dateType", dateTypeFilter);
      
      apiGet<Record<string, number>>(`/sales/stats?${statsParams}`).then(s => {
        setStats({
          total: s.total || 0,
          pending: s.pending || 0,
          approved: s.approved || 0,
          rejected: s.rejected || 0
        });
      }).catch(console.error);

      if (Array.isArray(res)) {
        setSales(res);
        setTotalPages(1);
        setTotalElements(res.length);
      } else if (res && res.content) {
        setSales(res.content);
        setTotalPages(res.page?.totalPages ?? res.totalPages ?? 0);
        setTotalElements(res.page?.totalElements ?? res.totalElements ?? 0);
      } else {
        setSales([]);
        setTotalPages(0);
        setTotalElements(0);
      }
      
      if (cities.length === 0) {
        const cityData = await apiGet<{nombre: string}[]>("/cities/active").catch(() => []);
        setCities(cityData.map(c => c.nombre));
      }
      if (campaigns.length === 0) {
        apiGet<Campaign[]>("/campaigns").then(setCampaigns).catch(() => []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [statusFilter, cityFilter, search, startDate, endDate, campanaFilter, dateTypeFilter, currentPage, pageSize, cities.length, campaigns.length]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(0);
  }, [statusFilter, cityFilter, search, startDate, endDate, campanaFilter, dateTypeFilter]);

  const handleDecision = useCallback(async (decision: "APROBADA" | "RECHAZADA") => {
    if (!detailSale) return;
    if (decision === "RECHAZADA" && !rejectReason.trim()) {
      toast({ title: "Error", description: "El motivo de rechazo es obligatorio.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      if (decision === "APROBADA") {
        await apiPut(`/sales/${detailSale.id}/approve`, {});
      } else {
        await apiPut(`/sales/${detailSale.id}/reject`, { motivo: rejectReason });
      }
      toast({ title: decision === "APROBADA" ? "✓ Venta aprobada" : "✗ Venta rechazada" });
      
      setDetailSale(null);
      load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  }, [detailSale, rejectReason, load]);

  const handleDelete = useCallback(async () => {
    if (!detailSale) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar COMPLETAMENTE este registro? Esta acción reseteará el serial, borrará las fotos y eliminará la venta de forma irreversible.")) {
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/${detailSale.id}/full-delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      if (!res.ok) {
        throw new Error("No se pudo eliminar la venta");
      }
      
      toast({ title: "✓ Venta eliminada", description: "El registro ha sido borrado y el serial liberado." });
      setDetailSale(null);
      load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  }, [detailSale, load]);

  const viewDetail = useCallback(async (sale: Sale, index?: number) => {
    Object.values(imageBlobs).forEach(URL.revokeObjectURL);
    setImageBlobs({});
    
    setDetailSale(sale);
    setRejectReason("");
    if (index !== undefined) setCurrentIndex(index);

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
  }, [imageBlobs]);

  const closeDetail = () => {
    Object.values(imageBlobs).forEach(URL.revokeObjectURL);
    setImageBlobs({});
    setDetailSale(null);
  };

  const navigateReview = useCallback((direction: "prev" | "next") => {
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= (sales || []).length) return;
    viewDetail(sales[newIndex], newIndex);
  }, [currentIndex, sales, viewDetail]);

  useEffect(() => {
    if (!detailSale) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); navigateReview("prev"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); navigateReview("next"); }
      else if (e.key === "a" && !e.metaKey && !e.ctrlKey && detailSale.estado === "PENDIENTE") {
        e.preventDefault(); handleDecision("APROBADA");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [detailSale, navigateReview, handleDecision]);


  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (cityFilter !== "all") params.set("city", cityFilter);
      if (search.trim()) params.set("search", search.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (campanaFilter !== "all") params.set("campanaId", campanaFilter);
      params.set("dateType", dateTypeFilter);
      
      params.set("page", "0");
      params.set("size", "10000");
      params.set("sortBy", "createdAt");
      params.set("sortDir", "desc");

      const res = await apiGet<PageResponse<Sale> | Sale[]>(`/sales?${params}`);
      const exportSales = Array.isArray(res) ? res : (res?.content || []);

      exportToExcel(exportSales.map((s) => ({
        "Fecha Reg": formatDateTimeBolivia(s.createdAt), 
        "Fecha Venta": formatDateBolivia(s.saleDate), 
        Vendedor: s.vendorName || "", 
        Teléfono: s.vendorPhone || "", 
        Tienda: s.storeName || "", 
        Ciudad: s.ciudad, 
        Producto: `${s.productModel || ''} ${s.productSize || ''}`.trim(),
        Serial: s.serial, 
        Estado: s.estado, 
        Puntos: s.puntos, 
        "Bono Bs": s.bonoBs,
      })), "revisiones");
      toast({ title: "Excel generado", description: `${exportSales.length} registros exportados.` });
    } catch (e) {
      toast({ title: "Error al exportar", variant: "destructive" });
    } finally {
      setExporting(false);
    }
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
    } catch (e) {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
  };

  const handleOpenNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  const pendingCount = statusFilter === "PENDIENTE" || statusFilter === "all" ? stats.pending : 0;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Revisiones
          </h1>
          <p className="text-sm sm:text-sm text-muted-foreground mt-0.5">Aprueba o rechaza ventas · Usa ← → para navegar</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="self-start sm:self-auto min-w-[100px]">
          {exporting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Exportando...</> : <><Download className="h-4 w-4 mr-1.5" />Excel</>}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total", val: stats.total },
          { label: "Pendientes", val: stats.pending },
          { label: "Aprobadas", val: stats.approved },
          { label: "Rechazadas", val: stats.rejected }
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
              <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{item.label}</p>
              <p className="text-lg sm:text-xl font-bold font-display mt-0.5">{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por vendedor o serial..." 
            className="pl-9 text-xs sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendientes</SelectItem>
            <SelectItem value="APROBADA">Aprobados</SelectItem>
            <SelectItem value="RECHAZADA">Rechazados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={campanaFilter} onValueChange={setCampanaFilter}>
          <SelectTrigger className="w-[160px] text-xs sm:text-sm"><SelectValue placeholder="Todas las campañas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las campañas</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={dateTypeFilter} onValueChange={setDateTypeFilter}>
          <SelectTrigger className="w-[160px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="saleDate">Fecha de Venta</SelectItem>
            <SelectItem value="createdAt">Fecha de Registro</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            className="w-[130px] text-xs h-9" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
          <span className="text-muted-foreground text-xs">a</span>
          <Input 
            type="date" 
            className="w-[130px] text-xs h-9" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>

        {pendingCount > 0 && !isMobile && (
          <Button size="sm" variant="premium" onClick={() => viewDetail(sales[0], 0)} className="ml-auto">
            <Eye className="h-4 w-4 mr-1.5" />Revisar ({pendingCount})
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
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
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s, i) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewDetail(s, i)}>
                    <TableCell>
                      <div className="text-sm font-medium">{formatDateTimeBolivia(s.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDateBolivia(s.saleDate)}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{s.vendorName}</p>
                        <p className="text-[11px] text-muted-foreground">{s.storeName}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{s.ciudad}</Badge></TableCell>
                    <TableCell className="text-sm">{s.productModel} {s.productSize || ''}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell>
                      <Badge variant={s.estado === "APROBADA" ? "default" : s.estado === "RECHAZADA" ? "destructive" : "secondary"} className="text-[10px]">
                        {STATUS_LABEL[s.estado] || s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Sin registros</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        
        {!loading && totalElements > 0 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground italic">
              Mostrando {(sales || []).length} de {totalElements} registros encontrados
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 mx-2">
                <span className="text-sm text-muted-foreground mr-1">Página</span>
                <Input 
                  className="w-12 h-8 text-center text-xs p-1" 
                  value={pageJump !== "" ? pageJump : currentPage + 1}
                  onChange={(e) => setPageJump(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const p = parseInt(pageJump) - 1;
                      if (!isNaN(p) && p >= 0 && p < totalPages) {
                        setCurrentPage(p);
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
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="w-full sm:max-w-5xl">
          <DialogHeader className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <DialogTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Revisión de Venta
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded-lg self-end sm:self-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentIndex === 0} onClick={() => navigateReview("prev")}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="font-mono tabular-nums font-bold px-2">{currentIndex + 1}/{(sales || []).length}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentIndex >= (sales || []).length - 1} onClick={() => navigateReview("next")}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm p-4 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.vendorName || "—"}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Teléfono</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.vendorPhone || "—"}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">CI</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.vendorCi || "—"}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Email</span><p className="font-medium mt-0.5 text-base sm:text-sm truncate" title={detailSale.vendorEmail}>{detailSale.vendorEmail || "—"}</p></div>
                
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.productModel} {detailSale.productSize || ""}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5 text-base sm:text-sm">{detailSale.serial}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">F. Venta</span><p className="font-medium mt-0.5 text-base sm:text-sm">{formatDateBolivia(detailSale.saleDate)}</p></div>
                <div><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Ciudad/Dpto</span><p className="font-medium mt-0.5 text-base sm:text-sm">{detailSale.ciudad}</p></div>
                
                <div className="sm:col-span-2"><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">F. Registro Sistema</span><p className="font-medium mt-0.5 text-base sm:text-sm">{formatDateTimeBolivia(detailSale.createdAt)}</p></div>
                <div className="sm:col-span-2"><span className="text-sm sm:text-[10px] text-muted-foreground uppercase tracking-wider">Bono / Pts</span><p className="font-medium mt-0.5 text-base sm:text-sm">Bs {detailSale.bonoBs} · {detailSale.puntos} pts</p></div>
              </div>

              {(detailSale.fotoTag || detailSale.fotoPoliza || detailSale.fotoNota) && (
                <div className="space-y-2">
                  <p className="text-sm sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Documentos Adjuntos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[{ label: "TAG", url: detailSale.fotoTag }, { label: "Póliza de Garantía", url: detailSale.fotoPoliza }, { label: "Nota de Venta", url: detailSale.fotoNota }].map((att) => att.url ? (
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

              {detailSale.estado === "PENDIENTE" && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm sm:text-[10px] font-semibold uppercase tracking-wider">Motivo (obligatorio para rechazo)</Label>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs text-muted-foreground flex items-center">Motivos rápidos:</span>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted text-sm sm:text-[10px] text-primary" onClick={() => setRejectReason("Falta Nota de Venta")}>NOTA DE VENTA</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted text-sm sm:text-[10px] text-primary" onClick={() => setRejectReason("Falta Póliza")}>PÓLIZA DE GARANTÍA</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted text-sm sm:text-[10px] text-primary" onClick={() => setRejectReason("Foto TAG ilegible")}>TAG</Badge>
                    </div>
                    <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Escribir motivo de rechazo..." className="min-h-[70px] text-sm" />
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <Button onClick={() => handleDecision("APROBADA")} disabled={processing} className="flex-1" variant="premium" size={isMobile ? "default" : "lg"}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Aprobar
                    </Button>
                    <Button variant="destructive" onClick={() => handleDecision("RECHAZADA")} disabled={processing} className="flex-1" size={isMobile ? "default" : "lg"}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Rechazar
                    </Button>
                  </div>
                  
                  {user?.role === 'ADMIN' && (
                    <div className="pt-2">
                       <Button variant="outline" onClick={handleDelete} disabled={processing} className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" size="sm">
                        {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                        Eliminar Completamente (Admin)
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {detailSale.estado !== "PENDIENTE" && (
                <div className="space-y-3">
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium ${detailSale.estado === "APROBADA" ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                    {detailSale.estado === "APROBADA" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {detailSale.estado === "APROBADA" ? "Venta aprobada" : "Venta rechazada"}
                  </div>
                  
                  {user?.role === 'ADMIN' && (
                    <Button variant="outline" onClick={handleDelete} disabled={processing} className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" size="sm">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Eliminar Completamente (Admin)
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
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
