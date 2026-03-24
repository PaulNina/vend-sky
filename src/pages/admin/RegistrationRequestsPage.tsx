import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPatch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTimeBolivia } from "@/lib/utils";

interface PendingVendor {
  id: number;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  tienda: {
    id: number;
    nombre: string;
    ciudad: {
      id: number;
      nombre: string;
      departamento?: string;
    }
  } | null;
  createdAt?: string;
}

export default function RegistrationRequestsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState<PendingVendor | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  const loadPending = async () => {
    setLoading(true);
    const data = await apiGet<PendingVendor[]>("/vendors?pending=true").catch(() => []);
    setVendors(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPending(); }, []);

  const handleApprove = async (vendor: PendingVendor) => {
    setProcessing(vendor.id);
    try {
      await apiPatch(`/vendors/${vendor.id}/approve`, {});
      toast({ title: "Aprobado", description: `${vendor.nombreCompleto} fue aprobado como vendedor.` });
      loadPending();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
    setProcessing(null);
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setProcessing(rejectDialog.id);
    try {
      await apiPatch(`/vendors/${rejectDialog.id}/reject-registration`, {});
      toast({ title: "Rechazado", description: `${rejectDialog.nombreCompleto} fue rechazado.` });
      loadPending();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
    setRejectDialog(null);
    setRejectReason("");
    setProcessing(null);
  };



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes de Registro</h1>
        <p className="text-sm text-muted-foreground">Vendedores pendientes de aprobación</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : vendors.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No hay solicitudes pendientes.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Teléfono</TableHead>
                  <TableHead>Ciudad</TableHead><TableHead>Depto</TableHead><TableHead>Tienda</TableHead><TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.nombreCompleto}</TableCell>
                    <TableCell className="text-sm">{v.email || "—"}</TableCell>
                    <TableCell className="text-sm">{v.telefono || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{v.tienda?.ciudad?.nombre || "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="bg-muted text-muted-foreground">{v.tienda?.ciudad?.departamento || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{v.tienda?.nombre || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateTimeBolivia(v.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" onClick={() => handleApprove(v)} disabled={processing === v.id}>
                        {processing === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectDialog(v)} disabled={processing === v.id}>
                        <XCircle className="h-3 w-3 mr-1" />Rechazar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar solicitud</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">¿Rechazar a <strong>{rejectDialog?.nombreCompleto}</strong>?</p>
            <div className="space-y-2"><Label>Motivo (opcional)</Label><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo del rechazo..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processing}>Confirmar rechazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
