import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, List, ChevronRight, AlertTriangle, Upload, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  approved: { label: "Aprobado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
  closed: { label: "Cerrado", variant: "outline" },
  observed: { label: "Observada", variant: "outline" },
};

interface Sale {
  id: string; serial: string; sale_date: string; status: string;
  points: number; bonus_bs: number; week_start: string; created_at: string;
  observation_reason: string | null;
  products: { name: string; model_code: string } | null;
  campaigns: { name: string } | null;
}

interface SaleAttachment { id: string; tag_url: string; poliza_url: string; nota_url: string; }

export default function MySalesPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [attachments, setAttachments] = useState<SaleAttachment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Correction state
  const [correctionMode, setCorrectionMode] = useState(false);
  const [newTagFile, setNewTagFile] = useState<File | null>(null);
  const [newPolizaFile, setNewPolizaFile] = useState<File | null>(null);
  const [newNotaFile, setNewNotaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [salePage, setSalePage] = useState(0);
  const SALES_PAGE_SIZE = 200;

  // Real totals from DB (independent of pagination)
  const [totalStats, setTotalStats] = useState({ total: 0, approved: 0, observed: 0, totalBs: 0 });

  useEffect(() => { setSalePage(0); }, [statusFilter]);
  useEffect(() => { loadSales(); }, [user, statusFilter, salePage]);
  useEffect(() => { loadTotalStats(); }, [user]);

  const loadTotalStats = async () => {
    if (!user) return;
    const [totalRes, approvedRes, observedRes] = await Promise.all([
      supabase.from("sales").select("*", { head: true, count: "exact" }),
      supabase.from("sales").select("*", { head: true, count: "exact" }).eq("status", "approved" as any),
      supabase.from("sales").select("*", { head: true, count: "exact" }).eq("status", "observed" as any),
    ]);

    // Batch-load all approved bonus_bs to avoid 1000-row truncation
    let bsTotal = 0;
    const batchSize = 1000;
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("sales")
        .select("bonus_bs")
        .eq("status", "approved" as any)
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      bsTotal += data.reduce((a, s) => a + Number(s.bonus_bs), 0);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    setTotalStats({
      total: totalRes.count || 0,
      approved: approvedRes.count || 0,
      observed: observedRes.count || 0,
      totalBs: bsTotal,
    });
  };

  const loadSales = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("sales")
      .select("*, products(name, model_code), campaigns(name)")
      .order("created_at", { ascending: false })
      .range(salePage * SALES_PAGE_SIZE, (salePage + 1) * SALES_PAGE_SIZE - 1);
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
    const { data } = await query;
    setSales((data as any) || []);
    setLoading(false);
  };

  const viewDetail = async (sale: Sale) => {
    setSelectedSale(sale);
    setCorrectionMode(false);
    setNewTagFile(null);
    setNewPolizaFile(null);
    setNewNotaFile(null);
    const { data } = await supabase.from("sale_attachments")
      .select("id, tag_url, poliza_url, nota_url")
      .eq("sale_id", sale.id).maybeSingle();
    setAttachments(data);
    setDetailOpen(true);
  };

  const getImageUrl = (path: string) => supabase.storage.from("sale-attachments").getPublicUrl(path).data.publicUrl;
  const formatDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("sale-attachments").upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleSubmitCorrection = async () => {
    if (!selectedSale || !attachments || !user) return;

    // At least one new file must be provided
    if (!newTagFile && !newPolizaFile && !newNotaFile) {
      toast({ title: "Error", description: "Sube al menos una foto corregida.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const updates: Partial<{ tag_url: string; poliza_url: string; nota_url: string }> = {};

      if (newTagFile) updates.tag_url = await uploadFile(newTagFile, "tag");
      if (newPolizaFile) updates.poliza_url = await uploadFile(newPolizaFile, "poliza");
      if (newNotaFile) updates.nota_url = await uploadFile(newNotaFile, "nota");

      // Update attachments
      const { error: attError } = await supabase.from("sale_attachments")
        .update(updates)
        .eq("sale_id", selectedSale.id);
      if (attError) throw attError;

      // Resubmit sale: set status back to pending for re-review
      const { error: saleError } = await supabase.from("sales")
        .update({
          status: "pending" as any,
          observation_reason: null,
        })
        .eq("id", selectedSale.id);
      if (saleError) throw saleError;

      toast({ title: "Corrección enviada", description: "Tu venta fue reenviada para revisión." });
      setDetailOpen(false);
      loadSales();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const observedCount = totalStats.observed;
  const approvedCount = totalStats.approved;
  const totalBs = totalStats.totalBs;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <List className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Mis Ventas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Historial de ventas registradas</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="rejected">Rechazados</SelectItem>
            <SelectItem value="observed">Observadas</SelectItem>
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Observed alert */}
      {observedCount > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">Tienes {observedCount} venta{observedCount > 1 ? "s" : ""} con observaciones</p>
              <p className="text-xs text-muted-foreground">Revisa las observaciones y corrige las fotos para que sean aprobadas.</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 ml-auto" onClick={() => setStatusFilter("observed")}>
              Ver observadas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-2.5 sm:py-3 px-3 sm:px-4">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Registros</p>
            <p className="text-lg sm:text-xl font-bold font-display mt-0.5">{totalStats.total}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-success/20 transition-colors">
          <CardContent className="py-2.5 sm:py-3 px-3 sm:px-4">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Aprobadas</p>
            <p className="text-lg sm:text-xl font-bold font-display mt-0.5 text-success">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-2.5 sm:py-3 px-3 sm:px-4">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono</p>
            <p className="text-lg sm:text-xl font-bold font-display mt-0.5">Bs {totalBs.toLocaleString()}</p>
          </CardContent>
        </Card>
        {observedCount > 0 && (
          <Card className="hover:border-warning/20 transition-colors border-warning/30 hidden sm:block">
            <CardContent className="py-2.5 sm:py-3 px-3 sm:px-4">
              <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Observadas</p>
              <p className="text-lg sm:text-xl font-bold font-display mt-0.5 text-warning">{observedCount}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : sales.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground text-sm">No tienes ventas registradas aún.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Pts</TableHead>
                      <TableHead className="text-right">Bs</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => {
                      const s = statusLabels[sale.status] || statusLabels.pending;
                      const isObserved = sale.status === "observed";
                      return (
                        <TableRow key={sale.id} className={`cursor-pointer ${isObserved ? "bg-warning/5" : ""}`} onClick={() => viewDetail(sale)}>
                          <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                          <TableCell className="text-sm font-medium">{sale.products?.name || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{sale.serial}</TableCell>
                          <TableCell>
                            <Badge variant={s.variant} className={`text-[10px] ${isObserved ? "border-warning text-warning" : ""}`}>
                              {isObserved && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {s.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{sale.points}</TableCell>
                          <TableCell className="text-right font-medium">Bs {sale.bonus_bs}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-border">
                {sales.map((sale) => {
                  const s = statusLabels[sale.status] || statusLabels.pending;
                  const isObserved = sale.status === "observed";
                  return (
                    <button
                      key={sale.id}
                      onClick={() => viewDetail(sale)}
                      className={`w-full text-left p-3.5 hover:bg-muted/30 transition-colors flex items-center gap-3 ${isObserved ? "bg-warning/5" : ""}`}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{sale.products?.name || "—"}</span>
                          <Badge variant={s.variant} className={`text-[9px] shrink-0 ${isObserved ? "border-warning text-warning" : ""}`}>
                            {isObserved && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                            {s.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDate(sale.sale_date)}</span>
                          <span className="font-mono">{sale.serial}</span>
                        </div>
                        {isObserved && sale.observation_reason && (
                          <p className="text-xs text-warning truncate">⚠ {sale.observation_reason}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-primary font-semibold">{sale.points} pts</span>
                          <span className="font-medium">Bs {sale.bonus_bs}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(sales.length >= SALES_PAGE_SIZE || salePage > 0) && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={salePage === 0} onClick={() => setSalePage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">Página {salePage + 1}</span>
          <Button variant="outline" size="sm" disabled={sales.length < SALES_PAGE_SIZE} onClick={() => setSalePage(p => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) { setDetailOpen(false); setCorrectionMode(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Detalle de Venta
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 text-sm p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5 text-xs sm:text-sm">{selectedSale.products?.name}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5 text-xs sm:text-sm break-all">{selectedSale.serial}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Fecha</span><p className="font-medium mt-0.5">{formatDate(selectedSale.sale_date)}</p></div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Estado</span>
                  <div className="mt-0.5">
                    <Badge
                      variant={statusLabels[selectedSale.status]?.variant}
                      className={`text-[10px] ${selectedSale.status === "observed" ? "border-warning text-warning" : ""}`}
                    >
                      {selectedSale.status === "observed" && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {statusLabels[selectedSale.status]?.label}
                    </Badge>
                  </div>
                </div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Puntos</span><p className="font-medium mt-0.5">{selectedSale.points}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Bono</span><p className="font-medium mt-0.5">Bs {selectedSale.bonus_bs}</p></div>
              </div>

              {/* Observation reason */}
              {selectedSale.status === "observed" && selectedSale.observation_reason && (
                <div className="p-4 rounded-lg border border-warning/40 bg-warning/5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Observación del auditor
                  </div>
                  <p className="text-sm">{selectedSale.observation_reason}</p>
                  <p className="text-xs text-muted-foreground">Corrige las fotos indicadas y reenvía para aprobación.</p>
                </div>
              )}

              {/* Current attachments */}
              {attachments && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {correctionMode ? "Fotos actuales (reemplaza las que necesites)" : "Fotos Adjuntas"}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "TAG", url: attachments.tag_url, newFile: newTagFile, setFile: setNewTagFile, id: "fix-tag" },
                      { label: "Póliza", url: attachments.poliza_url, newFile: newPolizaFile, setFile: setNewPolizaFile, id: "fix-poliza" },
                      { label: "Nota", url: attachments.nota_url, newFile: newNotaFile, setFile: setNewNotaFile, id: "fix-nota" },
                    ].map((att) => (
                      <div key={att.label} className="space-y-1">
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{att.label}</p>
                        {correctionMode ? (
                          <CorrectionFileInput
                            currentUrl={getImageUrl(att.url)}
                            newFile={att.newFile}
                            onFile={att.setFile}
                            id={att.id}
                            isMobile={isMobile}
                          />
                        ) : (
                          <a href={getImageUrl(att.url)} target="_blank" rel="noopener noreferrer">
                            <img src={getImageUrl(att.url)} alt={att.label} className="rounded-lg border border-border w-full aspect-square object-cover hover:opacity-80 transition-opacity cursor-zoom-in shadow-sm" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correction actions */}
              {selectedSale.status === "observed" && !correctionMode && (
                <Button onClick={() => setCorrectionMode(true)} className="w-full" variant="default">
                  <Upload className="h-4 w-4 mr-1.5" />
                  Corregir y Reenviar
                </Button>
              )}

              {correctionMode && (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setCorrectionMode(false); setNewTagFile(null); setNewPolizaFile(null); setNewNotaFile(null); }} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmitCorrection} disabled={submitting} className="flex-1">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
                    Reenviar para Revisión
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for correction file input
function CorrectionFileInput({
  currentUrl,
  newFile,
  onFile,
  id,
  isMobile,
}: {
  currentUrl: string;
  newFile: File | null;
  onFile: (f: File | null) => void;
  id: string;
  isMobile: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!newFile) { setPreview(null); return; }
    const url = URL.createObjectURL(newFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newFile]);

  const displayUrl = preview || currentUrl;
  const isNew = !!preview;

  return (
    <div className="relative group">
      <img
        src={displayUrl}
        alt=""
        className={`rounded-lg border w-full aspect-square object-cover ${isNew ? "border-success ring-2 ring-success/30" : "border-border opacity-60"}`}
      />
      {isNew && (
        <button
          type="button"
          onClick={() => onFile(null)}
          className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1"
        >
          <X className="h-3 w-3 text-destructive" />
        </button>
      )}
      {isNew && (
        <div className="absolute bottom-0 inset-x-0 bg-success/80 text-[9px] text-center py-0.5 rounded-b-lg font-medium text-success-foreground">
          Nueva foto
        </div>
      )}
      <label
        htmlFor={id}
        className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
      >
        <div className="bg-background/90 rounded-full p-2 shadow-sm">
          {isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
        </div>
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={isMobile ? "environment" : undefined}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </div>
  );
}
