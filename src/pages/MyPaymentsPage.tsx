import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { uploadUrl } from "@/lib/api";

interface Pago {
  id: number;
  montoTotal: number;
  fecha: string;
  fotoComprobante: string;
  estado: string;
}

export default function MyPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!user) return;
    loadPayments();
  }, [user]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Pago[]>("/payments/my-payments");
      setPayments(data || []);
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" /> Mis Pagos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Historial de comisiones depositadas.</p>
        </div>
      </div>

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl">
        <CardContent className="p-0">
          {isMobile ? (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-all duration-150">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.fecha}</p>
                    <p className="text-base font-bold text-success mt-0.5">Bs {p.montoTotal}</p>
                    <Badge variant="outline" className="border-success/30 text-success bg-success/10 text-[10px] mt-1">{p.estado}</Badge>
                  </div>
                  {p.fotoComprobante && (
                    <Button size="sm" variant="outline" onClick={() => setSelectedReceipt(uploadUrl(p.fotoComprobante))} className="shrink-0 h-9 glass-card border-white/10 hover:bg-white/5">
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                  )}
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm">Sin registros de pago</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto (Bs)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground border-white/5">
                      Aún no tienes registros de pago.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                      <TableCell className="font-medium">{p.fecha}</TableCell>
                      <TableCell className="font-bold text-success">Bs {p.montoTotal}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-success/30 text-success bg-success/10">{p.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.fotoComprobante && (
                          <Button size="sm" variant="outline" className="glass-card border-white/10 hover:bg-white/5" onClick={() => setSelectedReceipt(uploadUrl(p.fotoComprobante))}>
                            <Eye className="w-4 h-4 mr-1" /> Ver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO DE COMPROBANTE */}
      <Dialog open={selectedReceipt !== null} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="w-full sm:max-w-md glass-card border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Depósito</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="py-4">
              <img 
                src={selectedReceipt} 
                alt="Comprobante" 
                className="w-full h-auto border border-white/5 rounded shadow-sm"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
