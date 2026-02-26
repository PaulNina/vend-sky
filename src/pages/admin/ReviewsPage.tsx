import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye, Download, ClipboardCheck, AlertTriangle } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

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
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [cities, setCities] = useState<string[]>([]);
  const [detailSale, setDetailSale] = useState<PendingSale | null>(null);
  const [attachments, setAttachments] = useState<Attachment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("sales")
      .select("*, vendors(full_name, store_name), products(name, model_code), campaigns(name)")
      .order("created_at", { ascending: true });

    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    if (cityFilter !== "all") q = q.eq("city", cityFilter);

    const { data } = await q;
    setSales((data as any) || []);
    const uniqueCities = [...new Set((data || []).map((s: any) => s.city))];
    setCities(uniqueCities);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, cityFilter]);

  const viewDetail = async (sale: PendingSale) => {
    setDetailSale(sale);
    setRejectReason("");
    const { data } = await supabase.from("sale_attachments").select("tag_url, poliza_url, nota_url").eq("sale_id", sale.id).maybeSingle();
    setAttachments(data);
  };

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

    toast({ title: decision === "approved" ? "Venta aprobada" : "Venta rechazada" });
    setDetailSale(null);
    setProcessing(false);
    load();
  };

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const handleExport = () => {
    exportToExcel(sales.map((s) => ({
      Fecha: s.sale_date, Vendedor: s.vendors?.full_name || "", Ciudad: s.city, Producto: s.products?.name || "",
      Serial: s.serial, Estado: s.status, Puntos: s.points, "Bono Bs": s.bonus_bs,
    })), "revisiones");
  };

  const pendingCount = sales.filter((s) => s.status === "pending").length;
  const flaggedCount = sales.filter((s) => s.ai_flag).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Revisiones
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Aprobación y rechazo de ventas registradas</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="self-start sm:self-auto">
          <Download className="h-4 w-4 mr-1.5" />Exportar Excel
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Total</p>
            <p className="text-xl font-bold font-display mt-0.5">{sales.length}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-warning/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Pendientes</p>
            <p className="text-xl font-bold font-display mt-0.5 text-warning">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-success/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Aprobadas</p>
            <p className="text-xl font-bold font-display mt-0.5 text-success">{sales.filter((s) => s.status === "approved").length}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-destructive/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Rechazadas</p>
            <p className="text-xl font-bold font-display mt-0.5 text-destructive">{sales.filter((s) => s.status === "rejected").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="rejected">Rechazados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {flaggedCount > 0 && (
          <Badge variant="outline" className="text-warning border-warning/40 bg-warning/5 gap-1">
            <AlertTriangle className="h-3 w-3" />{flaggedCount} con alerta IA
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
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
                {sales.map((s) => (
                  <TableRow key={s.id} className={s.ai_flag ? "bg-warning/5" : ""}>
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
                        variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {s.status === "pending" ? "Pendiente" : s.status === "approved" ? "Aprobado" : "Rechazado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => viewDetail(s)} className="hover:bg-primary/10">
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

      {/* Detail / Review Dialog */}
      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Revisión de Venta
            </DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-5">
              {/* Sale info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm p-4 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5">{detailSale.vendors?.full_name}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5">{detailSale.city}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5">{detailSale.products?.name}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5">{detailSale.serial}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Fecha Venta</span><p className="font-medium mt-0.5">{fmtDate(detailSale.sale_date)}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Bono</span><p className="font-medium mt-0.5">Bs {detailSale.bonus_bs} · {detailSale.points} pts</p></div>
              </div>

              {detailSale.ai_flag && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Esta venta fue marcada por la validación IA de fechas</span>
                </div>
              )}

              {/* Attachments */}
              {attachments && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Respaldos Fotográficos</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: "TAG", url: attachments.tag_url }, { label: "Póliza", url: attachments.poliza_url }, { label: "Nota de Venta", url: attachments.nota_url }].map((att) => (
                      <div key={att.label} className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground font-medium">{att.label}</p>
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
                <div className="space-y-4 pt-3 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider">Motivo (obligatorio para rechazo)</Label>
                    <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo de rechazo..." className="min-h-[80px]" />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => handleDecision("approved")} disabled={processing} className="flex-1" variant="premium">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                      Aprobar
                    </Button>
                    <Button variant="destructive" onClick={() => handleDecision("rejected")} disabled={processing} className="flex-1">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                      Rechazar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
