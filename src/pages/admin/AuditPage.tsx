import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, RotateCcw, Shuffle, ShieldCheck } from "lucide-react";

interface ApprovedSale {
  id: string; serial: string; sale_date: string; city: string;
  bonus_bs: number; points: number; status: string;
  vendors: { full_name: string } | null;
  products: { name: string } | null;
}

interface Attachment { tag_url: string; poliza_url: string; nota_url: string; }

export default function AuditPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<ApprovedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sampleSize, setSampleSize] = useState(10);
  const [detailSale, setDetailSale] = useState<ApprovedSale | null>(null);
  const [attachments, setAttachments] = useState<Attachment | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadSample = async () => {
    setLoading(true);
    const { data } = await supabase.from("sales")
      .select("id, serial, sale_date, city, bonus_bs, points, status, vendors(full_name), products(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setSales(shuffled.slice(0, sampleSize) as any);
    }
    setLoading(false);
  };

  useEffect(() => { loadSample(); }, []);

  const viewDetail = async (sale: ApprovedSale) => {
    setDetailSale(sale);
    setRevertReason("");
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
  };

  const handleOk = async () => {
    if (!detailSale || !user) return;
    setProcessing(true);
    await supabase.from("supervisor_audits").insert({ sale_id: detailSale.id, supervisor_user_id: user.id, action: "ok" as any, reason: "Auditoría OK" });
    toast({ title: "Auditoría OK" });
    setDetailSale(null);
    setProcessing(false);
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
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
            <Label className="text-xs whitespace-nowrap text-muted-foreground">Muestra:</Label>
            <Input type="number" value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value))} className="w-20 h-8" min={1} max={100} />
          </div>
          <Button onClick={loadSample} variant="premium">
            <Shuffle className="h-4 w-4 mr-1.5" />Nueva muestra
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Muestra Actual</p>
            <p className="text-xl font-bold font-display mt-0.5">{sales.length} ventas</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Total</p>
            <p className="text-xl font-bold font-display mt-0.5">Bs {sales.reduce((a, s) => a + Number(s.bonus_bs), 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ciudades</p>
            <p className="text-xl font-bold font-display mt-0.5">{new Set(sales.map((s) => s.city)).size}</p>
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
              {/* Sale info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm p-4 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Vendedor</span><p className="font-medium mt-0.5">{detailSale.vendors?.full_name}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5">{detailSale.city}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Producto</span><p className="font-medium mt-0.5">{detailSale.products?.name}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Serial</span><p className="font-mono font-medium mt-0.5">{detailSale.serial}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Fecha</span><p className="font-medium mt-0.5">{fmtDate(detailSale.sale_date)}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Bono</span><p className="font-medium mt-0.5">Bs {detailSale.bonus_bs}</p></div>
              </div>

              {/* Attachments */}
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
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Motivo de reversión (obligatorio)</Label>
                  <Textarea value={revertReason} onChange={(e) => setRevertReason(e.target.value)} placeholder="Motivo..." className="min-h-[80px]" />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleOk} disabled={processing} className="flex-1" variant="outline">
                    Auditoría OK
                  </Button>
                  <Button variant="destructive" onClick={handleRevert} disabled={processing} className="flex-1">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                    Revertir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
