import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPatch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTimeBolivia } from "@/lib/utils";

interface PendingVendor {
  id: number;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  ciudad: {
    id: number;
    nombre: string;
    departamento?: string;
  } | null;
  tienda: string | null;
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
      toast({ title: "Vendedor Aprobado", description: `${vendor.nombreCompleto} fue aprobado como vendedor.` });
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
      toast({ title: "Vendedor Rechazado", description: `${rejectDialog.nombreCompleto} fue rechazado.` });
      loadPending();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
    setRejectDialog(null);
    setRejectReason("");
    setProcessing(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-primary" /> Solicitudes de Registro
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Vendedores pendientes de aprobación en el sistema</p>
      </div>

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : vendors.length === 0 ? (
            <div className="text-center text-slate-500 py-16 text-xs">
              <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-450">Sin pendientes</p>
              <p className="text-slate-500 mt-1">No hay solicitudes de registro de vendedores en espera de aprobación.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Depto</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tienda</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Fecha Reg.</TableHead>
                  <TableHead className="w-[200px] text-right text-xs text-muted-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell className="font-semibold text-white text-sm">{v.nombreCompleto}</TableCell>
                    <TableCell className="text-sm text-slate-300">{v.email || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-300 font-mono">{v.telefono || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-[10px] px-1.5 py-0.5 rounded">
                        {v.ciudad?.nombre || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10 text-slate-400 bg-white/5 text-[10px] px-1.5 py-0.5 rounded">
                        {v.ciudad?.departamento || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{v.tienda || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-400 font-mono">{formatDateTimeBolivia(v.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-sm hover:shadow-emerald-500/20 text-xs px-2.5 h-8"
                          onClick={() => handleApprove(v)} 
                          disabled={processing === v.id}
                        >
                          {processing === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                          Aprobar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-650 hover:text-white text-xs px-2.5 h-8"
                          onClick={() => setRejectDialog(v)} 
                          disabled={processing === v.id}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Rechazar Solicitud de Registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-300">
              ¿Está seguro que desea rechazar la solicitud de <strong>{rejectDialog?.nombreCompleto}</strong>?
            </p>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold">Motivo de rechazo (opcional)</Label>
              <Textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="Escribe el motivo del rechazo aquí..." 
                className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 resize-none min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setRejectDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReject} disabled={processing === rejectDialog?.id} className="bg-red-600 hover:bg-red-500 text-white">
              {processing === rejectDialog?.id && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Rechazar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
