import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye, Download, ClipboardCheck, AlertTriangle, ChevronLeft, ChevronRight, Keyboard, Search, CheckCheck } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { useIsMobile } from "@/hooks/use-mobile";

interface PendingSale {
  id: string;
  serial: string;
  sale_date: string;
  city: string;
  status: string;
  points: number;
  bonus_bs: number;
  created_at: string;
  vendor_id: string;
  ai_flag: boolean | null;
  vendors: { full_name: string; store_name: string | null } | null;
  products: { name: string; model_code: string } | null;
  campaigns: { name: string } | null;
}

interface Attachment { tag_url: string; poliza_url: string; nota_url: string; }

export default function ReviewsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [detailSale, setDetailSale] = useState<PendingSale | null>(null);
  const [attachments, setAttachments] = useState<Attachment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Batch approve
  const [batchApproveDialog, setBatchApproveDialog] = useState(false);
  const [batchApproving, setBatchApproving] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const [page, setPage] = useState(0);
  const REVIEW_PAGE_SIZE = 200;

  const load = async () => {
    setLoading(true);
    let q = supabase.from("sales")
      .select("*, vendors(full_name, store_name), products(name, model_code), campaigns(name)")
      .order("created_at", { ascending: true })
      .range(page * REVIEW_PAGE_SIZE, (page + 1) * REVIEW_PAGE_SIZE - 1);

    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    if (cityFilter !== "all") q = q.eq("city", cityFilter);

    const { data } = await q;
    setSales((data as any) || []);
    const uniqueCities = [...new Set((data || []).map((s: any) => s.city))];
    setCities(uniqueCities);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, cityFilter, page]);

  const viewDetail = async (sale: PendingSale, index?: number) => {
    setDetailSale(sale);
    setRejectReason("");
    if (index !== undefined) setCurrentIndex(index);
    const { data } = await supabase.from("sale_attachments").select("tag_url, poliza_url, nota_url").eq("sale_id", sale.id).maybeSingle();
    setAttachments(data);
  };

  const navigateReview = useCallback(async (direction: "prev" | "next") => {
    if (!detailSale) return;
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= sales.length) return;
    await viewDetail(sales[newIndex], newIndex);
  }, [detailSale, currentIndex, sales]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!detailSale) return;
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in textarea
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); navigateReview("prev"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); navigateReview("next"); }
      else if (e.key === "a" && !e.metaKey && !e.ctrlKey && detailSale.status === "pending") {
        e.preventDefault();
        handleDecision("approved");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [detailSale, navigateReview, currentIndex]);

  const getImageUrl = (path: string) => supabase.storage.from("sale-attachments").getPublicUrl(path).data.publicUrl;

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!detailSale || !user) return;
    if (decision === "rejected" && !rejectReason.trim()) {
      toast({ title: "Error", description: "El motivo de rechazo es obligatorio.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    const { error: saleErr } = await supabase.from("sales").update({ status: decision }).eq("id", detailSale.id);
    if (saleErr) { toast({ title: "Error", description: saleErr.message, variant: "destructive" }); setProcessing(false); return; }

    await supabase.from("reviews").insert({
      sale_id: detailSale.id,
      reviewer_user_id: user.id,
      decision,
      reason: decision === "rejected" ? rejectReason : "Aprobado",
    });

    toast({ title: decision === "approved" ? "✓ Venta aprobada" : "✗ Venta rechazada" });

    // Auto-advance to next pending sale
    const remainingSales = sales.filter((s, i) => i !== currentIndex);
    setSales(remainingSales);

    if (remainingSales.length > 0 && statusFilter === "pending") {
      const nextIdx = Math.min(currentIndex, remainingSales.length - 1);
      setCurrentIndex(nextIdx);
      await viewDetail(remainingSales[nextIdx], nextIdx);
    } else {
      setDetailSale(null);
      load();
    }
    setProcessing(false);
  };

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const handleExport = () => {
    exportToExcel(filteredSales.map((s) => ({
      Fecha: s.sale_date, Vendedor: s.vendors?.full_name || "", Ciudad: s.city, Producto: s.products?.name || "",
      Serial: s.serial, Estado: s.status, Puntos: s.points, "Bono Bs": s.bonus_bs,
    })), "revisiones");
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const q = searchQuery.toLowerCase();
    return sales.filter(s =>
      (s.vendors?.full_name || "").toLowerCase().includes(q) ||
      s.serial.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      (s.products?.name || "").toLowerCase().includes(q)
    );
  }, [sales, searchQuery]);

  const pendingCount = filteredSales.filter((s) => s.status === "pending").length;
  const flaggedCount = filteredSales.filter((s) => s.ai_flag).length;
  const nonFlaggedPending = filteredSales.filter(s => s.status === "pending" && !s.ai_flag);

  // City counts for filter labels
  const cityCounts = useMemo(() => {
    const map: Record<string, number> = {};
    sales.filter(s => s.status === "pending").forEach(s => {
      map[s.city] = (map[s.city] || 0) + 1;
    });
    return map;
  }, [sales]);

  // Batch approve non-flagged
  const handleBatchApprove = async () => {
    if (!user) return;
    setBatchApproving(true);
    setBatchProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < nonFlaggedPending.length; i++) {
      const sale = nonFlaggedPending[i];
      const { error } = await supabase.from("sales").update({ status: "approved" as any }).eq("id", sale.id);
      if (error) {
        failed++;
      } else {
        await supabase.from("reviews").insert({
          sale_id: sale.id,
          reviewer_user_id: user.id,
          decision: "approved" as any,
          reason: "Aprobación masiva",
        });
        success++;
      }
      setBatchProgress(Math.round(((i + 1) / nonFlaggedPending.length) * 100));
    }

    toast({
      title: "Aprobación masiva completada",
      description: `${success} ventas aprobadas${failed > 0 ? `, ${failed} fallidas` : ""}.`,
      variant: failed > 0 ? "destructive" : "default",
    });
    setBatchApproving(false);
    setBatchApproveDialog(false);
    load();
  };

  // Mobile card view for sales list
  const SaleCard = ({ sale, index }: { sale: PendingSale; index: number }) => (
    <div
      onClick={() => viewDetail(sale, index)}
      className={`p-3 border-b border-border last:border-0 active:bg-muted/50 cursor-pointer ${sale.ai_flag ? "bg-warning/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{sale.vendors?.full_name}</p>
          <p className="text-[11px] text-muted-foreground">{sale.vendors?.store_name} · {sale.city}</p>
        </div>
        <Badge
          variant={sale.status === "approved" ? "default" : sale.status === "rejected" ? "destructive" : sale.status === "observed" ? "outline" : "secondary"}
          className={`text-[10px] shrink-0 ${sale.status === "observed" ? "border-warning text-warning" : ""}`}
        >
          {sale.status === "pending" ? "Pendiente" : sale.status === "approved" ? "Aprobado" : sale.status === "rejected" ? "Rechazado" : sale.status === "observed" ? "Observada" : sale.status}
        </Badge>
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
        <span>{fmtDate(sale.sale_date)}</span>
        <span className="font-mono">{sale.serial}</span>
        <span>{sale.products?.name}</span>
        {sale.ai_flag && <AlertTriangle className="h-3 w-3 text-warning" />}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Revisiones
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Aprueba o rechaza ventas · Usa ← → para navegar</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="self-start sm:self-auto">
          <Download className="h-4 w-4 mr-1.5" />Excel
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Card><CardContent className="py-2 sm:py-3 px-3 sm:px-4">
          <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Total</p>
          <p className="text-lg sm:text-xl font-bold font-display mt-0.5">{filteredSales.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-2 sm:py-3 px-3 sm:px-4">
          <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Pendientes</p>
          <p className="text-lg sm:text-xl font-bold font-display mt-0.5 text-warning">{pendingCount}</p>
        </CardContent></Card>
        <Card><CardContent className="py-2 sm:py-3 px-3 sm:px-4">
          <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Aprobadas</p>
          <p className="text-lg sm:text-xl font-bold font-display mt-0.5 text-success">{filteredSales.filter((s) => s.status === "approved").length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-2 sm:py-3 px-3 sm:px-4">
          <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Rechazadas</p>
          <p className="text-lg sm:text-xl font-bold font-display mt-0.5 text-destructive">{filteredSales.filter((s) => s.status === "rejected").length}</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por vendedor, serial, ciudad o producto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] sm:w-[160px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="rejected">Rechazados</SelectItem>
            <SelectItem value="observed">Observadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[140px] sm:w-[180px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}{cityCounts[c] ? ` (${cityCounts[c]})` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        {flaggedCount > 0 && (
          <Badge variant="outline" className="text-warning border-warning/40 bg-warning/5 gap-1 text-[10px] sm:text-xs">
            <AlertTriangle className="h-3 w-3" />{flaggedCount} alerta IA
          </Badge>
        )}
        {nonFlaggedPending.length > 1 && (
          <Button size="sm" variant="outline" onClick={() => setBatchApproveDialog(true)} className="text-xs">
            <CheckCheck className="h-4 w-4 mr-1" />Aprobar todas sin alerta ({nonFlaggedPending.length})
          </Button>
        )}
        {pendingCount > 0 && !isMobile && (
          <Button size="sm" variant="premium" onClick={() => viewDetail(filteredSales[0], 0)} className="ml-auto">
            <Eye className="h-4 w-4 mr-1.5" />Revisar ({pendingCount})
          </Button>
        )}
      </div>

      {/* Sales List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : isMobile ? (
            // Mobile: card list
            <div>
              {filteredSales.map((s, i) => <SaleCard key={s.id} sale={s} index={i} />)}
              {filteredSales.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm">Sin registros</p>
              )}
            </div>
          ) : (
            // Desktop: table
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((s, i) => (
                  <TableRow key={s.id} className={`cursor-pointer hover:bg-muted/50 ${s.ai_flag ? "bg-warning/5" : ""}`} onClick={() => viewDetail(s, i)}>
                    <TableCell className="text-sm">{fmtDate(s.sale_date)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{s.vendors?.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.vendors?.store_name}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{s.city}</Badge></TableCell>
                    <TableCell className="text-sm">{s.products?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell>
                      <Badge
                        variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : s.status === "observed" ? "outline" : "secondary"}
                        className={`text-[10px] ${s.status === "observed" ? "border-warning text-warning" : ""}`}
                      >
                        {s.status === "pending" ? "Pendiente" : s.status === "approved" ? "Aprobado" : s.status === "rejected" ? "Rechazado" : s.status === "observed" ? "Observada" : s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      Sin registros para los filtros seleccionados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(sales.length >= REVIEW_PAGE_SIZE || page > 0) && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">Página {page + 1}</span>
          <Button variant="outline" size="sm" disabled={sales.length < REVIEW_PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      {/* Detail / Review Dialog */}
      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
                <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Revisión de Venta
              </DialogTitle>
              {/* Navigation counter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentIndex === 0} onClick={() => navigateReview("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono tabular-nums">{currentIndex + 1}/{sales.length}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentIndex >= sales.length - 1} onClick={() => navigateReview("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              {/* Sale info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-sm p-3 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5 text-xs sm:text-sm">{detailSale.vendors?.full_name}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tienda</span><p className="font-medium mt-0.5 text-xs sm:text-sm">{detailSale.vendors?.store_name || "—"}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5 text-xs sm:text-sm">{detailSale.city}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5 text-xs sm:text-sm">{detailSale.products?.name}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5 text-xs sm:text-sm">{detailSale.serial}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fecha</span><p className="font-medium mt-0.5 text-xs sm:text-sm">{fmtDate(detailSale.sale_date)}</p></div>
                <div className="col-span-2 sm:col-span-1"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bono / Puntos</span><p className="font-medium mt-0.5 text-xs sm:text-sm">Bs {detailSale.bonus_bs} · {detailSale.points} pts</p></div>
              </div>

              {detailSale.ai_flag && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs sm:text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Marcada por validación IA de fechas</span>
                </div>
              )}

              {/* Attachments */}
              {attachments && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fotos</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[{ label: "TAG", url: attachments.tag_url }, { label: "Póliza", url: attachments.poliza_url }, { label: "Nota", url: attachments.nota_url }].map((att) => (
                      <div key={att.label} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">{att.label}</p>
                        <a href={getImageUrl(att.url)} target="_blank" rel="noopener noreferrer">
                          <img src={getImageUrl(att.url)} alt={att.label} className="rounded-lg border border-border w-full aspect-square object-cover hover:opacity-80 transition-opacity cursor-zoom-in shadow-sm" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision area */}
              {detailSale.status === "pending" && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider">Motivo (obligatorio para rechazo)</Label>
                    <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo de rechazo..." className="min-h-[70px] text-sm" />
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <Button onClick={() => handleDecision("approved")} disabled={processing} className="flex-1" variant="premium" size={isMobile ? "default" : "lg"}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Aprobar
                    </Button>
                    <Button variant="destructive" onClick={() => handleDecision("rejected")} disabled={processing} className="flex-1" size={isMobile ? "default" : "lg"}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                      Rechazar
                    </Button>
                  </div>
                  {!isMobile && (
                    <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
                      <Keyboard className="h-3 w-3" />
                      <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono">A</kbd> aprobar ·
                      <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono">←</kbd>
                      <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono">→</kbd> navegar
                    </p>
                  )}
                </div>
              )}

              {/* Already reviewed badge */}
              {detailSale.status !== "pending" && (
                <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium ${
                  detailSale.status === "approved" ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}>
                  {detailSale.status === "approved" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {detailSale.status === "approved" ? "Venta aprobada" : "Venta rechazada"}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Approve Dialog */}
      <AlertDialog open={batchApproveDialog} onOpenChange={setBatchApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-success" />
              Aprobación Masiva
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Se aprobarán <strong>{nonFlaggedPending.length}</strong> ventas pendientes que <strong>no tienen alerta IA</strong>.</p>
              <p className="text-xs text-muted-foreground">Las ventas con alerta IA se omitirán y deberán revisarse manualmente.</p>
              {batchApproving && (
                <div className="space-y-1">
                  <Progress value={batchProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{batchProgress}%</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchApproving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchApprove} disabled={batchApproving}>
              {batchApproving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Aprobar {nonFlaggedPending.length} ventas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
