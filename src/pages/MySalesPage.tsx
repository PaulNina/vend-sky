import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  approved: { label: "Aprobado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
  closed: { label: "Cerrado", variant: "outline" },
};

interface Sale {
  id: string;
  serial: string;
  sale_date: string;
  status: string;
  points: number;
  bonus_bs: number;
  week_start: string;
  created_at: string;
  products: { name: string; model_code: string } | null;
  campaigns: { name: string } | null;
}

interface SaleAttachment {
  tag_url: string;
  poliza_url: string;
  nota_url: string;
}

export default function MySalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [attachments, setAttachments] = useState<SaleAttachment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadSales();
  }, [user, statusFilter]);

  const loadSales = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("sales")
      .select("*, products(name, model_code), campaigns(name)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as "pending" | "approved" | "rejected" | "closed");
    }

    const { data } = await query;
    setSales((data as any) || []);
    setLoading(false);
  };

  const viewDetail = async (sale: Sale) => {
    setSelectedSale(sale);
    const { data } = await supabase
      .from("sale_attachments")
      .select("tag_url, poliza_url, nota_url")
      .eq("sale_id", sale.id)
      .maybeSingle();
    setAttachments(data);
    setDetailOpen(true);
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("sale-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis Ventas</h1>
          <p className="text-sm text-muted-foreground">Historial de ventas registradas</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="rejected">Rechazados</SelectItem>
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No tienes ventas registradas aún.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right">Bs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const s = statusLabels[sale.status] || statusLabels.pending;
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                      <TableCell className="text-sm">{sale.products?.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{sale.serial}</TableCell>
                      <TableCell className="text-xs">{sale.campaigns?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{sale.points}</TableCell>
                      <TableCell className="text-right">Bs {sale.bonus_bs}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => viewDetail(sale)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Producto:</span> {selectedSale.products?.name}</div>
                <div><span className="text-muted-foreground">Serial:</span> {selectedSale.serial}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {formatDate(selectedSale.sale_date)}</div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={statusLabels[selectedSale.status]?.variant}>{statusLabels[selectedSale.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Puntos:</span> {selectedSale.points}</div>
                <div><span className="text-muted-foreground">Bono:</span> Bs {selectedSale.bonus_bs}</div>
              </div>
              {attachments && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Fotos adjuntas</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "TAG", url: attachments.tag_url },
                      { label: "Póliza", url: attachments.poliza_url },
                      { label: "Nota", url: attachments.nota_url },
                    ].map((att) => (
                      <div key={att.label} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{att.label}</p>
                        <img
                          src={getImageUrl(att.url)}
                          alt={att.label}
                          className="rounded border border-border w-full aspect-square object-cover"
                        />
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
