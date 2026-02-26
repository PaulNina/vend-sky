import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye, Download } from "lucide-react";
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
  vendors: { full_name: string; store_name: string | null } | null;
  products: { name: string; model_code: string } | null;
  campaigns: { name: string } | null;
}

interface Attachment {
  tag_url: string;
  poliza_url: string;
  nota_url: string;
}

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

    // Get distinct cities
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

    // Update sale status
    const { error: saleErr } = await supabase.from("sales").update({ status: decision }).eq("id", detailSale.id);
    if (saleErr) { toast({ title: "Error", description: saleErr.message, variant: "destructive" }); setProcessing(false); return; }

    // Insert review record
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Revisiones</h1><p className="text-sm text-muted-foreground">Aprobación/rechazo de ventas registradas</p></div>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
      </div>

      <div className="flex gap-3">
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
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center">{sales.length} registros</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Vendedor</TableHead><TableHead>Ciudad</TableHead>
                <TableHead>Producto</TableHead><TableHead>Serial</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{fmtDate(s.sale_date)}</TableCell>
                    <TableCell><div><p className="font-medium text-sm">{s.vendors?.full_name}</p><p className="text-xs text-muted-foreground">{s.vendors?.store_name}</p></div></TableCell>
                    <TableCell><Badge variant="outline">{s.city}</Badge></TableCell>
                    <TableCell className="text-sm">{s.products?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell><Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>{s.status === "pending" ? "Pendiente" : s.status === "approved" ? "Aprobado" : "Rechazado"}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => viewDetail(s)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin registros</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail / Review Dialog */}
      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Revisión de Venta</DialogTitle></DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Vendedor:</span> {detailSale.vendors?.full_name}</div>
                <div><span className="text-muted-foreground">Ciudad:</span> {detailSale.city}</div>
                <div><span className="text-muted-foreground">Producto:</span> {detailSale.products?.name}</div>
                <div><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{detailSale.serial}</span></div>
                <div><span className="text-muted-foreground">Fecha venta:</span> {fmtDate(detailSale.sale_date)}</div>
                <div><span className="text-muted-foreground">Bono:</span> Bs {detailSale.bonus_bs} | {detailSale.points} pts</div>
              </div>

              {attachments && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Respaldos fotográficos</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: "TAG", url: attachments.tag_url }, { label: "Póliza", url: attachments.poliza_url }, { label: "Nota de Venta", url: attachments.nota_url }].map((att) => (
                      <div key={att.label} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{att.label}</p>
                        <a href={getImageUrl(att.url)} target="_blank" rel="noopener noreferrer">
                          <img src={getImageUrl(att.url)} alt={att.label} className="rounded border border-border w-full aspect-square object-cover hover:opacity-80 transition-opacity cursor-zoom-in" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailSale.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="space-y-2">
                    <Label>Motivo (obligatorio para rechazo)</Label>
                    <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo de rechazo..." />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => handleDecision("approved")} disabled={processing} className="flex-1">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Aprobar
                    </Button>
                    <Button variant="destructive" onClick={() => handleDecision("rejected")} disabled={processing} className="flex-1">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />} Rechazar
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
