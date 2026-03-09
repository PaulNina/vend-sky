import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, RotateCcw, Shuffle, ShieldCheck, Download, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

interface ApprovedSale {
  id: string; serial: string; sale_date: string; city: string;
  bonus_bs: number; points: number; status: string;
  vendors: { full_name: string } | null;
  products: { name: string } | null;
  campaign_id: string;
}

interface Attachment { tag_url: string; poliza_url: string; nota_url: string; }

interface Campaign { id: string; name: string; }

export default function AuditPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<ApprovedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sampleSize, setSampleSize] = useState(10);
  const [detailSale, setDetailSale] = useState<ApprovedSale | null>(null);
  const [attachments, setAttachments] = useState<Attachment | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [observeReason, setObserveReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [auditStats, setAuditStats] = useState({ ok: 0, reverted: 0, observed: 0, total: 0 });
  const [actionMode, setActionMode] = useState<"idle" | "observe" | "revert">("idle");

  useEffect(() => {
    supabase.from("campaigns").select("id, name").eq("is_active", true).then(({ data }) => {
      setCampaigns(data || []);
    });
    loadAuditStats();
  }, []);

  const loadAuditStats = async () => {
    const { data } = await supabase.from("supervisor_audits").select("action");
    if (data) {
      setAuditStats({
        ok: data.filter(a => a.action === "ok").length,
        reverted: data.filter(a => a.action === "revert").length,
        observed: data.filter(a => a.action === "observe").length,
        total: data.length,
      });
    }
  };

  const loadSample = async () => {
    setLoading(true);
    let q = supabase.from("sales")
      .select("id, serial, sale_date, city, bonus_bs, points, status, campaign_id, vendors(full_name), products(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);

    if (selectedCampaign !== "all") q = q.eq("campaign_id", selectedCampaign);

    const { data } = await q;
    if (data) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setSales(shuffled.slice(0, sampleSize) as any);
    }
    setLoading(false);
  };

  useEffect(() => { loadSample(); }, [selectedCampaign]);

  const viewDetail = async (sale: ApprovedSale) => {
    setDetailSale(sale);
    setRevertReason("");
    setObserveReason("");
    setActionMode("idle");
    const { data } = await supabase.from("sale_attachments").select("tag_url, poliza_url, nota_url").eq("sale_id", sale.id).maybeSingle();
    setAttachments(data);
  };

  const getImageUrl = (path: string) => supabase.storage.from("sale-attachments").getPublicUrl(path).data.publicUrl;

  const handleRevert = async () => {
    if (!detailSale || !user || !revertReason.trim()) {
      toast({ title: "Error", description: "El motivo es obligatorio.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    await supabase.from("sales").update({ status: "rejected" as any }).eq("id", detailSale.id);
    await supabase.from("supervisor_audits").insert({ sale_id: detailSale.id, supervisor_user_id: user.id, action: "revert" as any, reason: revertReason });
    toast({ title: "Venta revertida", description: "La aprobación fue revertida." });
    setDetailSale(null);
    setProcessing(false);
    loadSample();
    loadAuditStats();
  };

  const handleObserve = async () => {
    if (!detailSale || !user || !observeReason.trim()) {
      toast({ title: "Error", description: "La observación es obligatoria.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    await supabase.from("sales").update({
      status: "observed" as any,
      observation_reason: observeReason,
    }).eq("id", detailSale.id);
    await supabase.from("supervisor_audits").insert({
      sale_id: detailSale.id,
      supervisor_user_id: user.id,
      action: "observe" as any,
      reason: observeReason,
    });
    toast({ title: "Observación enviada", description: "El vendedor recibirá la observación para subsanar." });
    setDetailSale(null);
    setProcessing(false);
    loadSample();
    loadAuditStats();
  };

  const handleOk = async () => {
    if (!detailSale || !user) return;
    setProcessing(true);
    await supabase.from("supervisor_audits").insert({ sale_id: detailSale.id, supervisor_user_id: user.id, action: "ok" as any, reason: "Auditoría OK" });
    toast({ title: "Auditoría OK" });
    setDetailSale(null);
    setProcessing(false);
    loadAuditStats();
  };

  const handleExport = () => {
    exportToExcel(sales.map(s => ({
      Fecha: fmtDate(s.sale_date), Vendedor: s.vendors?.full_name || "",
      Ciudad: s.city, Producto: s.products?.name || "", Serial: s.serial,
      "Bono Bs": s.bonus_bs,
    })), "auditoria-muestra");
  };

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Auditoría
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Muestreo aleatorio de aprobaciones para validación</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[180px] text-xs"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las campañas</SelectItem>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
            <Label className="text-xs whitespace-nowrap text-muted-foreground">Muestra:</Label>
            <Input type="number" value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value))} className="w-20 h-8" min={1} max={100} />
          </div>
          <Button onClick={loadSample} variant="premium">
            <Shuffle className="h-4 w-4 mr-1.5" />Nueva muestra
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm">
            <Download className="h-4 w-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Muestra</p>
            <p className="text-xl font-bold font-display mt-0.5">{sales.length}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Total</p>
            <p className="text-xl font-bold font-display mt-0.5">Bs {sales.reduce((a, s) => a + Number(s.bonus_bs), 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-success/20 transition-colors">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-xl font-bold font-display">{auditStats.ok}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">OK</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-warning/20 transition-colors">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-xl font-bold font-display text-warning">{auditStats.observed}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Observadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-destructive/20 transition-colors">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-xl font-bold font-display">{auditStats.reverted}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Revertidas</p>
            </div>
          </CardContent>
        </Card>
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
                  <TableHead className="text-right">Bs</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{fmtDate(s.sale_date)}</TableCell>
                    <TableCell className="font-medium text-sm">{s.vendors?.full_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{s.city}</Badge></TableCell>
                    <TableCell className="text-sm">{s.products?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.serial}</TableCell>
                    <TableCell className="text-right font-medium">Bs {s.bonus_bs}</TableCell>
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
                      Sin aprobaciones para auditar
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Auditoría de Venta
            </DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm p-4 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5">{detailSale.vendors?.full_name}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5">{detailSale.city}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5">{detailSale.products?.name}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5">{detailSale.serial}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Fecha</span><p className="font-medium mt-0.5">{fmtDate(detailSale.sale_date)}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Bono</span><p className="font-medium mt-0.5">Bs {detailSale.bonus_bs}</p></div>
              </div>

              {attachments && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Respaldos Fotográficos</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: "TAG", url: attachments.tag_url }, { label: "Póliza", url: attachments.poliza_url }, { label: "Nota", url: attachments.nota_url }].map((att) => (
                      <div key={att.label} className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground font-medium">{att.label}</p>
                        <a href={getImageUrl(att.url)} target="_blank" rel="noopener noreferrer">
                          <img src={getImageUrl(att.url)} alt={att.label} className="rounded-lg border border-border w-full aspect-square object-cover cursor-zoom-in hover:opacity-80 transition-opacity shadow-sm" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-4 pt-3 border-t border-border">
                {/* Action buttons row */}
                <div className="flex gap-2">
                  <Button onClick={handleOk} disabled={processing} className="flex-1" variant="outline">
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-success" />
                    Auditoría OK
                  </Button>
                  <Button
                    variant={actionMode === "observe" ? "default" : "outline"}
                    onClick={() => setActionMode(actionMode === "observe" ? "idle" : "observe")}
                    disabled={processing}
                    className="flex-1"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1.5 text-warning" />
                    Observar
                  </Button>
                  <Button
                    variant={actionMode === "revert" ? "destructive" : "outline"}
                    onClick={() => setActionMode(actionMode === "revert" ? "idle" : "revert")}
                    disabled={processing}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Revertir
                  </Button>
                </div>

                {/* Observe form */}
                {actionMode === "observe" && (
                  <div className="space-y-3 p-4 rounded-lg border border-warning/30 bg-warning/5">
                    <div className="flex items-center gap-2 text-sm font-medium text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      Enviar observación al vendedor
                    </div>
                    <p className="text-xs text-muted-foreground">
                      La venta quedará en estado "Observada" y el vendedor podrá corregir las fotos o datos desde su panel.
                    </p>
                    <Textarea
                      value={observeReason}
                      onChange={(e) => setObserveReason(e.target.value)}
                      placeholder="Ej: La foto del TAG está borrosa, por favor subir una foto más clara..."
                      className="min-h-[80px]"
                    />
                    <Button onClick={handleObserve} disabled={processing || !observeReason.trim()} className="w-full" variant="default">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <AlertTriangle className="h-4 w-4 mr-1.5" />}
                      Enviar Observación
                    </Button>
                  </div>
                )}

                {/* Revert form */}
                {actionMode === "revert" && (
                  <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <RotateCcw className="h-4 w-4" />
                      Revertir aprobación
                    </div>
                    <p className="text-xs text-muted-foreground">
                      La venta será rechazada definitivamente y el serial liberado.
                    </p>
                    <Textarea
                      value={revertReason}
                      onChange={(e) => setRevertReason(e.target.value)}
                      placeholder="Motivo de la reversión..."
                      className="min-h-[80px]"
                    />
                    <Button variant="destructive" onClick={handleRevert} disabled={processing || !revertReason.trim()} className="w-full">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                      Revertir Definitivamente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
