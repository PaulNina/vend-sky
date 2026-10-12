import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPut, uploadUrl, getToken } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye, Download, ClipboardCheck, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, Trash2, Maximize2, ExternalLink, Clock3, Layers3, RotateCcw, History, Store, AlertCircle, HelpCircle, FileCheck2, Camera, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { exportToExcel } from "@/lib/exportExcel";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateBolivia, formatDateTimeBolivia } from "@/lib/utils";
import { ImageViewer } from "@/components/ImageViewer";
import { AdminEmptyState, AdminPageHeader, AdminStat, AdminToolbar } from "@/components/admin/AdminInterface";

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
  activo?: boolean;
  registroHabilitado?: boolean;
}

interface TiendaOption {
  id: number;
  nombre: string;
  codigo?: string;
  canal?: string;
  ciudad?: { nombre: string; departamento?: string };
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
  motivoRechazo?: string;
  historialRechazos?: string;
  vendorName?: string;
  tiendaId?: number;
  storeName?: string;
  storeCode?: string;
  storeCity?: string;
  storeDepartment?: string;
  storeChannel?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorCi?: string;
  productModel?: string;
  productSize?: string;
  fotoTag?: string;
  fotoPoliza?: string;
  fotoNota?: string;
  motivoObservacion?: string;
  archivosObservados?: string;
  evidenciasAnteriores?: string;
  fechaObservacion?: string;
  fechaSubsanacion?: string;
  aiFlag?: boolean;
}

interface DeletionImpact {
  saleId: number;
  serial: string;
  estado: string;
  vendorName: string;
  ciudad: string;
  bonoBs: number;
  puntos: number;
  isPaid: boolean;
  pagoId?: number;
  canDelete: boolean;
  blockingReason?: string;
  warnings: string[];
}

const STATUS_MAP: Record<string, string> = { PENDIENTE: "pending", OBSERVADA: "observed", APROBADA: "approved", RECHAZADA: "rejected" };
const STATUS_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", OBSERVADA: "Observada", APROBADA: "Aprobado", RECHAZADA: "Rechazado" };

export default function ReviewsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("estado") || "PENDIENTE");
  const [cityFilter, setCityFilter] = useState(() => searchParams.get("ciudad") || "all");
  const [tiendaFilter, setTiendaFilter] = useState(() => searchParams.get("tiendaId") || "all");
  const [vendedorFilter, setVendedorFilter] = useState(() => searchParams.get("vendedorId") || "");
  const [tiendas, setTiendas] = useState<TiendaOption[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [campanaFilter, setCampanaFilter] = useState(() => searchParams.get("campanaId") || "all");
  const [dateTypeFilter, setDateTypeFilter] = useState("saleDate"); // "saleDate" or "createdAt"

  useEffect(() => {
    const estadoParam = searchParams.get("estado");
    if (estadoParam) setStatusFilter(estadoParam);
    const ciudadParam = searchParams.get("ciudad");
    if (ciudadParam) setCityFilter(ciudadParam);
    const campanaParam = searchParams.get("campanaId");
    if (campanaParam) setCampanaFilter(campanaParam);
    const tiendaParam = searchParams.get("tiendaId");
    if (tiendaParam) setTiendaFilter(tiendaParam);
    const vendedorParam = searchParams.get("vendedorId");
    if (vendedorParam) setVendedorFilter(vendedorParam);
  }, [searchParams]);
  
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
  const [stats, setStats] = useState({ total: 0, pending: 0, observed: 0, approved: 0, rejected: 0 });
  const [exporting, setExporting] = useState(false);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);

  // Observation state
  const [observeDialogOpen, setObserveDialogOpen] = useState(false);
  const [observeReason, setObserveReason] = useState("");
  const [observeTag, setObserveTag] = useState(false);
  const [observePoliza, setObservePoliza] = useState(false);
  const [observeNota, setObserveNota] = useState(false);

  // Controlled deletion state
  const [deleteImpactModal, setDeleteImpactModal] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<DeletionImpact | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deletingSale, setDeletingSale] = useState(false);

  const handleObserve = async () => {
    if (!detailSale) return;
    if (!observeReason.trim()) {
      toast({ title: "Ingresa el motivo de observación", variant: "destructive" });
      return;
    }
    const files: string[] = [];
    if (observeTag) files.push("TAG");
    if (observePoliza) files.push("POLIZA");
    if (observeNota) files.push("NOTA");
    if (files.length === 0) {
      toast({ title: "Selecciona al menos un documento para subsanar", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const updated = await apiPut<Sale>(`/sales/${detailSale.id}/observe`, {
        motivo: observeReason.trim(),
        archivosObservados: files.join(",")
      });
      setDetailSale(prev => prev ? { 
        ...prev, 
        ...updated, 
        estado: "OBSERVADA", 
        motivoObservacion: observeReason.trim(), 
        archivosObservados: files.join(",") 
      } : updated);
      toast({ title: "Venta Observada", description: "El vendedor ha sido notificado para subsanar los archivos." });
      setObserveDialogOpen(false);
      setObserveReason("");
      setObserveTag(false);
      setObservePoliza(false);
      setObserveNota(false);
      load();
    } catch (err: unknown) {
      toast({ title: "Error al observar venta", description: (err as Error).message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Store correction state
  const [correctStoreDialogOpen, setCorrectStoreDialogOpen] = useState(false);
  const [availableStores, setAvailableStores] = useState<TiendaOption[]>([]);
  const [selectedCorrectionStoreId, setSelectedCorrectionStoreId] = useState<string>("");
  const [correctionMotive, setCorrectionMotive] = useState("");
  const [savingStoreCorrection, setSavingStoreCorrection] = useState(false);
  const [loadingCorrectionStores, setLoadingCorrectionStores] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");

  const openCorrectStore = async () => {
    if (!detailSale) return;
    setCorrectStoreDialogOpen(true);
    setSelectedCorrectionStoreId(detailSale.tiendaId ? String(detailSale.tiendaId) : "");
    setCorrectionMotive("");
    setStoreSearchQuery("");
    setLoadingCorrectionStores(true);
    try {
      const stores = await apiGet<TiendaOption[]>("/tiendas").catch(() => []);
      setAvailableStores(stores);
    } finally {
      setLoadingCorrectionStores(false);
    }
  };

  const handleSaveStoreCorrection = async () => {
    if (!detailSale || !selectedCorrectionStoreId) return;
    setSavingStoreCorrection(true);
    try {
      const query = new URLSearchParams({
        tiendaId: selectedCorrectionStoreId,
        ...(correctionMotive ? { motivo: correctionMotive } : {})
      });
      const updated = await apiPut<Sale>(`/sales/${detailSale.id}/update-store?${query}`, {});
      setDetailSale(prev => prev ? { ...prev, ...updated } : updated);
      toast({ title: "Tienda corregida correctamente" });
      setCorrectStoreDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "Error al corregir tienda", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingStoreCorrection(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (cityFilter !== "all") params.set("city", cityFilter);
      if (tiendaFilter !== "all" && tiendaFilter !== "") params.set("tiendaId", tiendaFilter);
      if (vendedorFilter && vendedorFilter !== "all" && vendedorFilter !== "") params.set("vendedorId", vendedorFilter);
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
      if (tiendaFilter !== "all" && tiendaFilter !== "") statsParams.set("tiendaId", tiendaFilter);
      if (vendedorFilter && vendedorFilter !== "all" && vendedorFilter !== "") statsParams.set("vendedorId", vendedorFilter);
      if (search.trim()) statsParams.set("search", search.trim());
      if (startDate) statsParams.set("startDate", startDate);
      if (endDate) statsParams.set("endDate", endDate);
      if (campanaFilter !== "all") statsParams.set("campanaId", campanaFilter);
      statsParams.set("dateType", dateTypeFilter);
      
      apiGet<Record<string, number>>(`/sales/stats?${statsParams}`).then(s => {
        setStats({
          total: s.total || 0,
          pending: s.pending || 0,
          observed: s.observed || 0,
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
      if (tiendas.length === 0) {
        apiGet<TiendaOption[]>("/tiendas").then((t) => setTiendas(t || [])).catch(() => []);
      }
      if (campaigns.length === 0) {
        apiGet<Campaign[]>("/campaigns").then((data) => {
          const list = (data || []).filter((c) => c.activo || c.registroHabilitado);
          setCampaigns(list);
          const active = list.find(c => c.activo);
          if (active) {
            setCampanaFilter(String(active.id));
          }
        }).catch(() => []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [statusFilter, cityFilter, tiendaFilter, vendedorFilter, search, startDate, endDate, campanaFilter, dateTypeFilter, currentPage, pageSize, cities.length, tiendas.length, campaigns.length]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(0);
  }, [statusFilter, cityFilter, tiendaFilter, vendedorFilter, search, startDate, endDate, campanaFilter, dateTypeFilter]);

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

  const handleRevertToPending = useCallback(async () => {
    if (!detailSale) return;
    setProcessing(true);
    try {
      await apiPut(`/sales/${detailSale.id}/revert-to-pending`, {});
      toast({ title: "✓ Venta restablecida", description: "La venta ha vuelto a estado Pendiente para reevaluación." });
      setDetailSale(null);
      load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  }, [detailSale, load]);

  const openDeleteDialog = useCallback(async () => {
    if (!detailSale) return;
    setLoadingImpact(true);
    setDeleteMotivo("");
    setDeleteImpactModal(true);
    try {
      const data = await apiGet<DeletionImpact>(`/sales/${detailSale.id}/deletion-impact`);
      setDeleteImpact(data);
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeleteImpactModal(false);
    } finally {
      setLoadingImpact(false);
    }
  }, [detailSale]);

  const confirmFullDelete = useCallback(async () => {
    if (!detailSale || !deleteImpact) return;
    if (!deleteMotivo.trim()) {
      toast({ title: "Atención", description: "Debes ingresar un motivo obligatorio para la baja.", variant: "destructive" });
      return;
    }
    setDeletingSale(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/${detailSale.id}/full-delete?motivo=${encodeURIComponent(deleteMotivo.trim())}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudo eliminar la venta");
      }
      toast({ title: "✓ Venta dada de baja", description: "El registro ha sido eliminado y el serial liberado." });
      setDeleteImpactModal(false);
      setDetailSale(null);
      load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error al dar de baja", description: error.message, variant: "destructive" });
    } finally {
      setDeletingSale(false);
    }
  }, [detailSale, deleteImpact, deleteMotivo, load]);

  // Deprecated handleDelete replaced by openDeleteDialog
  const _ignoreOld = useCallback(async () => {
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
      if (tiendaFilter !== "all" && tiendaFilter !== "") params.set("tiendaId", tiendaFilter);
      if (vendedorFilter && vendedorFilter !== "all" && vendedorFilter !== "") params.set("vendedorId", vendedorFilter);
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
    <div className="admin-page space-y-6">
      <AdminPageHeader
        eyebrow="Operaciones / Validación"
        title="Centro de revisiones"
        description="Valida ventas con evidencia, navega con ← → y mantén una trazabilidad clara de cada decisión."
        icon={ClipboardCheck}
        meta={pendingCount > 0 ? <span className="rounded-full border border-amber-500/15 bg-amber-500/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-amber-400">{pendingCount} pendientes</span> : undefined}
        actions={<Button variant="outline" onClick={handleExport} disabled={exporting} className="admin-control min-w-[110px] rounded-xl text-white">
          {exporting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Exportando...</> : <><Download className="h-4 w-4 mr-1.5" />Excel</>}
        </Button>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat index="01 / LOTE" label="Total" value={stats.total} icon={Layers3} tone="slate" />
        <AdminStat index="02 / COLA" label="Pendientes" value={stats.pending} icon={Clock3} />
        <AdminStat index="03 / OBS" label="Observadas" value={stats.observed} icon={AlertCircle} tone="gold" />
        <AdminStat index="04 / OK" label="Aprobadas" value={stats.approved} icon={CheckCircle2} tone="green" />
        <AdminStat index="05 / NO OK" label="Rechazadas" value={stats.rejected} icon={XCircle} tone="red" />
      </div>

      <AdminToolbar label="Búsqueda avanzada">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por vendedor o serial..." 
            className="admin-control h-10 rounded-lg pl-9 text-xs sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="admin-control w-[150px] h-10 rounded-lg text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendientes ({stats.pending})</SelectItem>
            <SelectItem value="OBSERVADA">Observadas ({stats.observed})</SelectItem>
            <SelectItem value="APROBADA">Aprobados</SelectItem>
            <SelectItem value="RECHAZADA">Rechazados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="admin-control w-[170px] h-10 rounded-lg text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={tiendaFilter} onValueChange={setTiendaFilter}>
          <SelectTrigger className="admin-control w-[180px] h-10 rounded-lg text-xs sm:text-sm">
            <SelectValue placeholder="Todas las tiendas" />
          </SelectTrigger>
          <SelectContent className="glass-card max-h-[300px]">
            <SelectItem value="all">Todas las tiendas</SelectItem>
            {tiendas
              .filter((t) => cityFilter === "all" || t.ciudad?.nombre === cityFilter)
              .map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.nombre}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {vendedorFilter && (
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary gap-1.5 py-1 px-2.5 h-10 rounded-lg flex items-center text-xs"
          >
            <span>Vendedor #{vendedorFilter}</span>
            <button
              onClick={() => setVendedorFilter("")}
              className="hover:text-white transition-colors ml-1"
              title="Quitar filtro de vendedor"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </Badge>
        )}

        <Select value={campanaFilter} onValueChange={setCampanaFilter}>
          <SelectTrigger className="admin-control w-[180px] h-10 rounded-lg text-xs sm:text-sm"><SelectValue placeholder="Todas las campañas" /></SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value="all">Todas las campañas</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={dateTypeFilter} onValueChange={setDateTypeFilter}>
          <SelectTrigger className="admin-control w-[170px] h-10 rounded-lg text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value="saleDate">Fecha de Venta</SelectItem>
            <SelectItem value="createdAt">Fecha de Registro</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            className="admin-control w-[135px] text-xs h-10 rounded-lg"
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
          <span className="text-muted-foreground text-xs">a</span>
          <Input 
            type="date" 
            className="admin-control w-[135px] text-xs h-10 rounded-lg"
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>

        {pendingCount > 0 && !isMobile && (
          <Button size="sm" variant="premium" onClick={() => viewDetail(sales[0], 0)} className="ml-auto">
            <Eye className="h-4 w-4 mr-1.5" />Revisar ({pendingCount})
          </Button>
        )}
      </AdminToolbar>

      <Card className="admin-data-card glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5">
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
                  <TableRow key={s.id} className="cursor-pointer transition-all duration-150 hover:bg-white/5 border-white/5" onClick={() => viewDetail(s, i)}>
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
                    <TableCell><Badge variant="outline" className="text-[11px] border-white/10 bg-background/50">{s.ciudad}</Badge></TableCell>
                    <TableCell className="text-sm">{s.productModel} {s.productSize || ''}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell>
                      <Badge variant={s.estado === "APROBADA" ? "outline" : s.estado === "RECHAZADA" ? "destructive" : "secondary"} className={`text-[10px] ${s.estado === "APROBADA" ? "border-success/30 text-success bg-success/10 animate-pulse" : ""}`}>
                        {STATUS_LABEL[s.estado] || s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="p-0"><AdminEmptyState title="Sin ventas para revisar" /></TableCell></TableRow>
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
        <DialogContent className="w-full sm:max-w-5xl glass-card border-white/10 shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <DialogTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Revisión de Venta
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 border border-white/5 p-1.5 rounded-lg self-end sm:self-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" disabled={currentIndex === 0} onClick={() => navigateReview("prev")}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="font-mono tabular-nums font-bold px-2">{currentIndex + 1}/{(sales || []).length}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" disabled={currentIndex >= (sales || []).length - 1} onClick={() => navigateReview("next")}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm p-4 rounded-lg glass-card border border-white/5 shadow-inner">
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

                {/* Tienda Comercial Snapshot */}
                <div className="col-span-2 sm:col-span-4 p-3 rounded-lg bg-black/30 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-primary" /> Tienda:
                    </span>
                    <span className="text-sm font-bold text-white">{detailSale.storeName || "Sin tienda registrada"}</span>
                    {detailSale.storeCode && (
                      <Badge variant="outline" className="font-mono text-[10px] border-white/15 bg-white/5 text-slate-300">
                        {detailSale.storeCode}
                      </Badge>
                    )}
                    {detailSale.storeChannel && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
                        {detailSale.storeChannel}
                      </Badge>
                    )}
                    {(detailSale.storeCity || detailSale.storeDepartment) && (
                      <span className="text-xs text-slate-400">
                        · {detailSale.storeCity} {detailSale.storeDepartment ? `(${detailSale.storeDepartment})` : ""}
                      </span>
                    )}
                  </div>
                  {(user?.role === 'ADMIN' || user?.role === 'REVIEWER' || user?.role === 'SUPERVISOR') && (
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={openCorrectStore} 
                      className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-white shrink-0"
                    >
                      <Store className="h-3.5 w-3.5 mr-1" /> Corregir Tienda
                    </Button>
                  )}
                </div>
              </div>

              {(detailSale.fotoTag || detailSale.fotoPoliza || detailSale.fotoNota) && (
                <div className="space-y-2">
                  <p className="text-sm sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Documentos Adjuntos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[{ label: "TAG", url: detailSale.fotoTag }, { label: "Póliza de Garantía", url: detailSale.fotoPoliza }, { label: "Nota de Venta", url: detailSale.fotoNota }].map((att) => att.url ? (
                      <Card key={att.label} className="overflow-hidden glass-card border-white/5 hover:border-primary/20 transition-all">
                        <CardContent className="p-2 space-y-2">
                          <div className="relative aspect-video bg-muted/20 rounded-md overflow-hidden group">
                            {loadingImages && !imageBlobs[att.url] ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted/30"><Loader2 className="h-5 w-5 animate-spin text-primary/40" /></div>
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
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button onClick={() => handleDecision("APROBADA")} disabled={processing} className="flex-1" variant="premium" size={isMobile ? "default" : "lg"}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Aprobar
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => {
                        setObserveDialogOpen(true);
                        setObserveReason(rejectReason || "");
                        setObservePoliza(true);
                      }} 
                      disabled={processing} 
                      className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40" 
                      size={isMobile ? "default" : "lg"}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />Observar Venta
                    </Button>
                    <Button variant="destructive" onClick={() => handleDecision("RECHAZADA")} disabled={processing} className="flex-1" size={isMobile ? "default" : "lg"}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Rechazar
                    </Button>
                  </div>
                  
                  {(user?.role === 'ADMIN_TOTAL' || user?.role === 'ADMIN') && (
                    <div className="pt-2">
                      <Button variant="outline" onClick={openDeleteDialog} disabled={processing} className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" size="sm">
                        {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                        Eliminar Registro (Baja Definitiva)
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {detailSale.estado !== "PENDIENTE" && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium ${
                    detailSale.estado === "APROBADA" 
                      ? "bg-success/10 border-success/30 text-success" 
                      : detailSale.estado === "OBSERVADA"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}>
                    {detailSale.estado === "APROBADA" && <CheckCircle2 className="h-4 w-4" />}
                    {detailSale.estado === "OBSERVADA" && <AlertCircle className="h-4 w-4 text-amber-400" />}
                    {detailSale.estado === "RECHAZADA" && <XCircle className="h-4 w-4" />}
                    {detailSale.estado === "APROBADA" ? "Venta aprobada" : detailSale.estado === "OBSERVADA" ? "Venta observada (en subsanación)" : "Venta rechazada"}
                  </div>

                  {detailSale.estado === "OBSERVADA" && (
                    <div className="space-y-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Motivo de observación</p>
                        <p className="text-sm text-white font-medium mt-0.5">{detailSale.motivoObservacion || "Sin motivo registrado"}</p>
                      </div>
                      {detailSale.archivosObservados && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Documentos solicitados</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {detailSale.archivosObservados.split(",").map(f => (
                              <Badge key={f} variant="outline" className="border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs">
                                {f.trim()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button onClick={() => handleDecision("APROBADA")} disabled={processing} className="flex-1" variant="premium" size="sm">
                          {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Aprobar
                        </Button>
                        <Button variant="destructive" onClick={() => handleDecision("RECHAZADA")} disabled={processing} className="flex-1" size="sm">
                          {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Rechazar
                        </Button>
                      </div>
                    </div>
                  )}

                  {detailSale.estado === "RECHAZADA" && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo de rechazo</p>
                        <p className="text-sm text-destructive font-medium">{detailSale.motivoRechazo || "Sin motivo registrado"}</p>
                      </div>

                      {(() => {
                        if (!detailSale.historialRechazos) return null;
                        try {
                          const history = JSON.parse(detailSale.historialRechazos);
                          if (!Array.isArray(history) || history.length <= 1) return null;
                          return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <History className="h-3.5 w-3.5" />
                                Historial de Rechazos ({history.length})
                              </p>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {history.map((h: { fecha?: string; motivo?: string; revisor?: string }, idx: number) => (
                                  <div key={idx} className="p-2 rounded border border-border/50 bg-background/50 space-y-1 text-xs">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-semibold text-destructive">Rechazo #{idx + 1}</span>
                                      <span className="text-muted-foreground font-mono">{formatDateTimeBolivia(h.fecha || "")}</span>
                                    </div>
                                    <p className="text-foreground"><span className="text-muted-foreground">Motivo: </span>{h.motivo}</p>
                                    {h.revisor && <p className="text-[10px] text-muted-foreground">Revisor: {h.revisor}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    onClick={handleRevertToPending} 
                    disabled={processing} 
                    className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300" 
                    size={isMobile ? "default" : "lg"}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                    Revertir a Pendiente (Reabrir Revisión)
                  </Button>

                  {(user?.role === 'ADMIN' || user?.role === 'ADMIN_TOTAL') && (
                    <Button 
                      variant="outline" 
                      onClick={openDeleteDialog} 
                      disabled={processing} 
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" 
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Dar de Baja Venta Definitiva (Admin)
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Corrección de Tienda */}
      <Dialog open={correctStoreDialogOpen} onOpenChange={(o) => !o && setCorrectStoreDialogOpen(false)}>
        <DialogContent className="max-w-md glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" /> Corregir Tienda de la Venta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground">
              Venta ID: <span className="font-mono text-white">{detailSale?.id}</span> · Serial: <span className="font-mono text-white">{detailSale?.serial}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Buscar Tienda</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  placeholder="Filtrar por nombre, código o ciudad..."
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  className="bg-black/20 border-white/10 text-white text-xs pl-8 h-8 rounded-lg placeholder-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Seleccionar Nueva Tienda *</Label>
              {loadingCorrectionStores ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 p-1 bg-black/30 rounded-lg border border-white/5">
                  {availableStores
                    .filter(s => 
                      s.nombre.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
                      (s.codigo && s.codigo.toLowerCase().includes(storeSearchQuery.toLowerCase())) ||
                      (s.ciudad && s.ciudad.nombre && s.ciudad.nombre.toLowerCase().includes(storeSearchQuery.toLowerCase()))
                    )
                    .map(s => {
                      const isSelected = selectedCorrectionStoreId === String(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedCorrectionStoreId(String(s.id))}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all text-xs ${
                            isSelected
                              ? "bg-primary/25 border border-primary/50 text-white"
                              : "bg-white/5 border border-transparent text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{s.nombre}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              {s.codigo && <span className="font-mono text-slate-400">{s.codigo}</span>}
                              {s.canal && <span>· {s.canal}</span>}
                              {s.ciudad && <span>· {s.ciudad.nombre}</span>}
                            </div>
                          </div>
                          {isSelected && <Badge className="bg-primary text-white text-[10px]">Seleccionada</Badge>}
                        </div>
                      );
                    })}
                  {availableStores.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-3">No hay tiendas disponibles</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Motivo del Cambio (Opcional)</Label>
              <Input
                placeholder="Ej: Corrección por asignación errónea..."
                value={correctionMotive}
                onChange={(e) => setCorrectionMotive(e.target.value)}
                className="bg-black/20 border-white/10 text-white text-xs h-9 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCorrectStoreDialogOpen(false)} className="border-white/10 text-white hover:bg-white/5">
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveStoreCorrection} 
              disabled={savingStoreCorrection || !selectedCorrectionStoreId}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {savingStoreCorrection && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Guardar Corrección
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Observar Venta */}
      <Dialog open={observeDialogOpen} onOpenChange={(o) => !o && setObserveDialogOpen(false)}>
        <DialogContent className="max-w-md glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg flex items-center gap-2 text-amber-400">
              <AlertCircle className="h-5 w-5" /> Observar Venta para Subsanación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-300">
              Indica qué documentos presentan observaciones y detalla la corrección que debe realizar el vendedor. La venta pasará a estado <strong>OBSERVADA</strong> y el vendedor podrá reemplazar únicamente los archivos señalados.
            </p>

            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                Documentos que requieren corrección *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div 
                  onClick={() => setObserveTag(!observeTag)}
                  className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all text-xs font-semibold flex flex-col items-center gap-1 ${
                    observeTag ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-black/20 border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>Foto TAG</span>
                </div>
                <div 
                  onClick={() => setObservePoliza(!observePoliza)}
                  className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all text-xs font-semibold flex flex-col items-center gap-1 ${
                    observePoliza ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-black/20 border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>Póliza</span>
                </div>
                <div 
                  onClick={() => setObserveNota(!observeNota)}
                  className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all text-xs font-semibold flex flex-col items-center gap-1 ${
                    observeNota ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-black/20 border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>Nota Venta</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                  Motivo de Observación *
                </Label>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-1">
                <Badge variant="outline" className="cursor-pointer text-[10px] hover:bg-white/5 border-amber-500/30 text-amber-400" onClick={() => { setObserveReason("TAG borroso o número de serie ilegible."); setObserveTag(true); }}>TAG ilegible</Badge>
                <Badge variant="outline" className="cursor-pointer text-[10px] hover:bg-white/5 border-amber-500/30 text-amber-400" onClick={() => { setObserveReason("Póliza sin sello de tienda ni fecha de venta."); setObservePoliza(true); }}>Póliza sin sello</Badge>
                <Badge variant="outline" className="cursor-pointer text-[10px] hover:bg-white/5 border-amber-500/30 text-amber-400" onClick={() => { setObserveReason("Nota de entrega incompleta o sin firma del cliente."); setObserveNota(true); }}>Nota incompleta</Badge>
              </div>
              <Textarea
                value={observeReason}
                onChange={(e) => setObserveReason(e.target.value)}
                placeholder="Describe con precisión qué debe corregir el vendedor..."
                className="min-h-[80px] bg-black/20 border-white/10 text-white text-xs"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setObserveDialogOpen(false)} className="border-white/10 text-white hover:bg-white/5">
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleObserve} 
              disabled={processing || !observeReason.trim() || (!observeTag && !observePoliza && !observeNota)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {processing && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Enviar Observación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Impacto y Blindaje de Baja */}
      <Dialog open={deleteImpactModal} onOpenChange={(o) => !o && setDeleteImpactModal(false)}>
        <DialogContent className="max-w-lg glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Blindaje de Baja: Venta #{deleteImpact?.serial}
            </DialogTitle>
          </DialogHeader>

          {loadingImpact ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : deleteImpact && (
            <div className="space-y-4 py-1">
              {!deleteImpact.canDelete ? (
                <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/30 space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                    <XCircle className="h-5 w-5" />
                    ACCIÓN BLOQUEADA POR INTEGRIDAD FINANCIERA
                  </div>
                  <p className="text-xs text-slate-200">
                    {deleteImpact.blockingReason}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Las ventas con liquidación pagada no pueden borrarse directamente para evitar inconsistencias contables con los comprobantes emitidos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-card/60 border border-white/10 rounded-lg text-xs space-y-1">
                    <p className="text-slate-400">Vendedor: <span className="text-white font-medium">{deleteImpact.vendorName}</span></p>
                    <p className="text-slate-400">Estado actual: <span className="text-white font-medium">{deleteImpact.estado}</span></p>
                    <p className="text-slate-400">Monto bono: <span className="text-primary font-bold">Bs {deleteImpact.bonoBs}</span> · Puntos: <span className="text-primary font-bold">{deleteImpact.puntos}</span></p>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                    <p className="text-xs font-semibold text-amber-300">Impacto de la eliminación:</p>
                    <ul className="text-[11px] text-amber-200/90 list-disc list-inside space-y-0.5">
                      {deleteImpact.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-semibold">
                      Motivo obligatorio de la baja *
                    </Label>
                    <Textarea 
                      value={deleteMotivo}
                      onChange={(e) => setDeleteMotivo(e.target.value)}
                      placeholder="Ej: Devolución de mercadería con nota de crédito autorizada por gerencia..."
                      className="bg-black/30 border-white/15 text-white text-xs h-20"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Esta justificación y tu usuario quedarán registrados en el log inmutable de auditoría del sistema.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4 gap-2">
                <Button variant="outline" className="border-white/10 text-white" onClick={() => setDeleteImpactModal(false)}>
                  Cerrar
                </Button>
                {deleteImpact.canDelete && (
                  <Button 
                    variant="destructive" 
                    onClick={confirmFullDelete} 
                    disabled={deletingSale || !deleteMotivo.trim()}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deletingSale ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                    Confirmar Baja Definitiva
                  </Button>
                )}
              </DialogFooter>
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
