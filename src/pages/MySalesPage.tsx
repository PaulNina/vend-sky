import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, List, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  approved: { label: "Aprobado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
  closed: { label: "Cerrado", variant: "outline" },
};

interface Sale {
  id: string; serial: string; sale_date: string; status: string;
  points: number; bonus_bs: number; week_start: string; created_at: string;
  products: { name: string; model_code: string } | null;
  campaigns: { name: string } | null;
}

interface SaleAttachment { tag_url: string; poliza_url: string; nota_url: string; }

export default function MySalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [attachments, setAttachments] = useState<SaleAttachment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { loadSales(); }, [user, statusFilter]);

  const loadSales = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("sales").select("*, products(name, model_code), campaigns(name)").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
    const { data } = await query;
    setSales((data as any) || []);
    setLoading(false);
  };

  const viewDetail = async (sale: Sale) => {
    setSelectedSale(sale);
    const { data } = await supabase.from("sale_attachments").select("tag_url, poliza_url, nota_url").eq("sale_id", sale.id).maybeSingle();
    setAttachments(data);
    setDetailOpen(true);
  };

  const getImageUrl = (path: string) => supabase.storage.from("sale-attachments").getPublicUrl(path).data.publicUrl;
  const formatDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const approvedCount = sales.filter(s => s.status === "approved").length;
  const totalBs = sales.filter(s => s.status === "approved").reduce((a, s) => a + Number(s.bonus_bs), 0);

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
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-2.5 sm:py-3 px-3 sm:px-4">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Registros</p>
            <p className="text-lg sm:text-xl font-bold font-display mt-0.5">{sales.length}</p>
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
                      return (
                        <TableRow key={sale.id} className="cursor-pointer" onClick={() => viewDetail(sale)}>
                          <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                          <TableCell className="text-sm font-medium">{sale.products?.name || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{sale.serial}</TableCell>
                          <TableCell><Badge variant={s.variant} className="text-[10px]">{s.label}</Badge></TableCell>
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
                  return (
                    <button
                      key={sale.id}
                      onClick={() => viewDetail(sale)}
                      className="w-full text-left p-3.5 hover:bg-muted/30 transition-colors flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{sale.products?.name || "—"}</span>
                          <Badge variant={s.variant} className="text-[9px] shrink-0">{s.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDate(sale.sale_date)}</span>
                          <span className="font-mono">{sale.serial}</span>
                        </div>
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
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
                  <div className="mt-0.5"><Badge variant={statusLabels[selectedSale.status]?.variant} className="text-[10px]">{statusLabels[selectedSale.status]?.label}</Badge></div>
                </div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Puntos</span><p className="font-medium mt-0.5">{selectedSale.points}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Bono</span><p className="font-medium mt-0.5">Bs {selectedSale.bonus_bs}</p></div>
              </div>
              {attachments && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fotos Adjuntas</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[{ label: "TAG", url: attachments.tag_url }, { label: "Póliza", url: attachments.poliza_url }, { label: "Nota", url: attachments.nota_url }].map((att) => (
                      <div key={att.label} className="space-y-1">
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{att.label}</p>
                        <a href={getImageUrl(att.url)} target="_blank" rel="noopener noreferrer">
                          <img src={getImageUrl(att.url)} alt={att.label} className="rounded-lg border border-border w-full aspect-square object-cover hover:opacity-80 transition-opacity cursor-zoom-in shadow-sm" />
                        </a>
                      </div>
                    ))}
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
