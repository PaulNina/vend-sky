import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Gift, 
  Sparkles, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Ticket, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PackageCheck,
  ShoppingBag
} from "lucide-react";
import { cn, formatDateBolivia } from "@/lib/utils";

interface Premio {
  id: number;
  nombre: string;
  descripcion?: string | null;
  puntosRequeridos: number;
  stock: number;
  foto?: string | null;
  activo: boolean;
  condiciones?: string | null;
  alcanceCiudades?: string | null;
  politicaCanje?: "DESCUENTO_EXACTO" | "REINICIO_SALDO";
}

interface Canje {
  id: number;
  premio: Premio;
  puntosConsumidos: number;
  fechaSolicitud: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "ENTREGADO";
  fechaResolucion?: string | null;
  motivoRechazo?: string | null;
  fotoComprobante?: string | null;
  observaciones?: string | null;
}

interface Movimiento {
  id: number;
  tipo: "ABONO_VENTA" | "RESERVA_CANJE" | "REVERSION_CANJE" | "AJUSTE_MANUAL";
  puntos: number;
  saldoResultante: number;
  descripcion?: string | null;
  fecha: string;
}

interface TicketVendedor {
  id: number;
  numeroTicket: string;
  estado: "HABILITADO" | "PREMIADO" | "ANULADO";
  createdAt: string;
  campana?: { nombre: string };
  venta?: { productModel: string; serial: string; saleDate: string };
}

interface ResumenPuntos {
  puntosGanados: number;
  puntosConsumidos: number;
  saldoDisponible: number;
  movimientos: Movimiento[];
  canjes: Canje[];
}

export default function VendorCanjesPage() {
  const [tab, setTab] = useState<"catalogo" | "mis-canjes" | "tickets" | "historial">("catalogo");

  const [resumen, setResumen] = useState<ResumenPuntos>({
    puntosGanados: 0,
    puntosConsumidos: 0,
    saldoDisponible: 0,
    movimientos: [],
    canjes: [],
  });
  const [premios, setPremios] = useState<Premio[]>([]);
  const [tickets, setTickets] = useState<TicketVendedor[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para solicitar canje
  const [selectedPremio, setSelectedPremio] = useState<Premio | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [solicitando, setSolicitando] = useState(false);

  // Visor de fotos
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resumenData, premiosData, ticketsData] = await Promise.all([
        apiGet<ResumenPuntos>("/vendor/puntos-balance"),
        apiGet<Premio[]>("/premios-vendedores"),
        apiGet<TicketVendedor[]>("/vendor/tickets"),
      ]);
      setResumen(resumenData || { puntosGanados: 0, puntosConsumidos: 0, saldoDisponible: 0, movimientos: [], canjes: [] });
      setPremios(premiosData || []);
      setTickets(ticketsData || []);
    } catch (e: unknown) {
      toast({ title: "Error al cargar datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSolicitar = (p: Premio) => {
    setSelectedPremio(p);
    setObservaciones("");
  };

  const handleConfirmCanje = async () => {
    if (!selectedPremio) return;
    setSolicitando(true);
    try {
      await apiPost("/canjes", {
        premioId: selectedPremio.id,
        observaciones: observaciones.trim() || undefined,
      });
      toast({
        title: "¡Canje solicitado con éxito!",
        description: `Has reservado ${selectedPremio.nombre}. Un administrador revisará la entrega física.`,
      });
      setSelectedPremio(null);
      loadAllData();
      setTab("mis-canjes");
    } catch (e: unknown) {
      const error = e as Error;
      toast({
        title: "No se pudo realizar el canje",
        description: error.message || "Verifica tu saldo de puntos disponible.",
        variant: "destructive",
      });
    } finally {
      setSolicitando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-primary/10 to-background border border-amber-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs uppercase font-bold tracking-widest">Club de Premios Skyworth</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Canje de Puntos y Sorteos
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Tus ventas aprobadas generan puntos acumulables para canjear por fabulosos premios y emiten tickets digitales para las tómbolas oficiales.
            </p>
          </div>

          {/* Balance Cards */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Card className="glass-card border-amber-500/30 bg-amber-500/10 p-4 text-center min-w-[130px] flex-1 md:flex-initial">
              <span className="text-[11px] font-semibold uppercase text-amber-300 tracking-wider">Saldo Disponible</span>
              <p className="text-3xl font-black text-amber-400 font-display mt-0.5">
                {resumen.saldoDisponible}
              </p>
              <span className="text-[10px] text-amber-300/80">puntos para canjear</span>
            </Card>

            <div className="flex flex-col gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                <span className="text-muted-foreground mr-2">Puntos Ganados:</span>
                <strong className="text-emerald-400">{resumen.puntosGanados} pts</strong>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                <span className="text-muted-foreground mr-2">Puntos Canjeados:</span>
                <strong className="text-rose-400">{resumen.puntosConsumidos} pts</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="catalogo" className="gap-2 text-xs sm:text-sm">
            <Gift className="h-4 w-4" />
            Catálogo de Premios
          </TabsTrigger>
          <TabsTrigger value="mis-canjes" className="gap-2 text-xs sm:text-sm">
            <PackageCheck className="h-4 w-4" />
            Mis Canjes ({resumen.canjes.length})
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2 text-xs sm:text-sm">
            <Ticket className="h-4 w-4" />
            Mis Tickets de Sorteo ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2 text-xs sm:text-sm">
            <Clock className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CATALOGO */}
        <TabsContent value="catalogo" className="space-y-4">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : premios.length === 0 ? (
            <Card className="glass-card border-white/5 text-center p-12">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-bold text-white">Próximamente más premios</h3>
              <p className="text-sm text-muted-foreground mt-1">El catálogo está siendo actualizado por administración.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {premios.map((p) => {
                const canAfford = resumen.saldoDisponible >= p.puntosRequeridos;
                const hasStock = p.stock > 0;
                const isEligible = canAfford && hasStock;

                return (
                  <Card key={p.id} className="glass-card border-white/10 overflow-hidden flex flex-col group transition-all duration-300 hover:border-amber-500/40 hover:-translate-y-1">
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                      {p.foto ? (
                        <img
                          src={`/${p.foto}`}
                          alt={p.nombre}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Gift className="h-14 w-14 text-amber-500/40" />
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "backdrop-blur-md font-bold px-2 py-0.5",
                            hasStock ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          )}
                        >
                          {hasStock ? `${p.stock} disponibles` : "Agotado"}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-bold text-base text-white line-clamp-1">{p.nombre}</h3>
                        {p.descripcion && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.descripcion}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Puntos requeridos:</span>
                          <span className="text-lg font-black text-amber-400 font-display">
                            {p.puntosRequeridos} <span className="text-xs font-normal text-amber-300">pts</span>
                          </span>
                        </div>

                        <Button
                          onClick={() => handleOpenSolicitar(p)}
                          disabled={!isEligible}
                          className={cn(
                            "w-full rounded-xl text-xs font-bold transition-all",
                            isEligible
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20"
                              : "bg-white/5 text-muted-foreground cursor-not-allowed"
                          )}
                        >
                          {!hasStock ? (
                            "Sin Stock"
                          ) : !canAfford ? (
                            `Faltan ${p.puntosRequeridos - resumen.saldoDisponible} pts`
                          ) : (
                            <>
                              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Canjear Premio
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: MIS CANJES */}
        <TabsContent value="mis-canjes" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-base font-semibold">Historial de Premios Canjeados</CardTitle>
              <CardDescription className="text-xs">
                Supervisa el estado de entrega de los premios solicitados con tus puntos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {resumen.canjes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Aún no has solicitado ningún canje de premio.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead>Fecha Solicitud</TableHead>
                      <TableHead>Premio</TableHead>
                      <TableHead className="text-center">Puntos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Detalle / Acta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.canjes.map((c) => (
                      <TableRow key={c.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-xs text-muted-foreground">
                          {c.fechaSolicitud ? formatDateBolivia(c.fechaSolicitud) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {c.premio?.foto ? (
                              <img
                                src={`/${c.premio.foto}`}
                                alt={c.premio.nombre}
                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                <Gift className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm text-white">{c.premio?.nombre}</p>
                              {c.observaciones && (
                                <p className="text-xs text-muted-foreground italic">Nota: "{c.observaciones}"</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-amber-400">
                          {c.puntosConsumidos} pts
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                c.estado === "PENDIENTE" && "border-amber-500/30 text-amber-400 bg-amber-500/10",
                                c.estado === "APROBADO" && "border-blue-500/30 text-blue-400 bg-blue-500/10",
                                c.estado === "ENTREGADO" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                                c.estado === "RECHAZADO" && "border-rose-500/30 text-rose-400 bg-rose-500/10"
                              )}
                            >
                              {c.estado}
                            </Badge>
                            {c.motivoRechazo && (
                              <p className="text-xs text-rose-300">Motivo: {c.motivoRechazo}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {c.fotoComprobante ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewPhotoUrl(`/${c.fotoComprobante}`)}
                              className="h-8 text-xs text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Ver Comprobante
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MIS TICKETS DE SORTEO */}
        <TabsContent value="tickets" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Mis Tickets Digitales de Sorteo
              </CardTitle>
              <CardDescription className="text-xs">
                Cada venta aprobada genera automáticamente un cupón digital que participa en las tómbolas oficiales de la campaña.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {tickets.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Aún no tienes tickets registrados. Se emitirán automáticamente al aprobarse tus registros de venta.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] flex flex-col justify-between space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t.campana?.nombre || "Campaña Oficial"}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            t.estado === "HABILITADO" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                            t.estado === "PREMIADO" && "border-amber-500/30 text-amber-400 bg-amber-500/10 font-bold",
                            t.estado === "ANULADO" && "border-rose-500/30 text-rose-400 bg-rose-500/10"
                          )}
                        >
                          {t.estado}
                        </Badge>
                      </div>

                      <div className="text-center py-2">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">NÚMERO DE TICKET</span>
                        <p className="text-xl font-black text-white font-mono tracking-wider mt-0.5">
                          {t.numeroTicket}
                        </p>
                      </div>

                      <div className="text-[11px] text-muted-foreground pt-2 border-t border-white/5 flex justify-between">
                        <span>{t.venta?.productModel || "Producto Skyworth"}</span>
                        <span>{t.createdAt ? formatDateBolivia(t.createdAt) : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: HISTORIAL DE MOVIMIENTOS */}
        <TabsContent value="historial" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-base font-semibold">Libro de Movimientos de Puntos</CardTitle>
              <CardDescription className="text-xs">
                Auditoría completa de abonos por ventas y deducciones por canjes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {resumen.movimientos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Sin movimientos registrados aún.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto / Detalle</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                      <TableHead className="text-right">Saldo Resultante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.movimientos.map((m) => {
                      const isPositive = m.puntos > 0;
                      return (
                        <TableRow key={m.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-xs text-muted-foreground">
                            {m.fecha ? formatDateBolivia(m.fecha) : "—"}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-white">
                            {m.descripcion || "Movimiento de puntos"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {m.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={cn(
                              "inline-flex items-center gap-1",
                              isPositive ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {isPositive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                              {isPositive ? `+${m.puntos}` : m.puntos}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-amber-300">
                            {m.saldoResultante} pts
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Confirmar Solicitud de Canje */}
      <Dialog open={!!selectedPremio} onOpenChange={() => setSelectedPremio(null)}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Gift className="h-5 w-5" />
              Confirmar Solicitud de Canje
            </DialogTitle>
            <DialogDescription className="text-xs">
              Se descontarán los puntos de tu saldo y el stock quedará reservado inmediatamente.
            </DialogDescription>
          </DialogHeader>

          {selectedPremio && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedPremio.nombre}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Costo de redención</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-amber-400 font-display">
                    {selectedPremio.puntosRequeridos} pts
                  </span>
                  <p className="text-[11px] text-muted-foreground">Tu saldo: {resumen.saldoDisponible} pts</p>
                </div>
              </div>

              {selectedPremio.politicaCanje === "REINICIO_SALDO" ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-400">Política de Reinicio de Saldo: </span>
                    Esta campaña reinicia el saldo tras el canje. Cualquier punto sobrante de la campaña se ajustará a 0.
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Se descontarán exactamente {selectedPremio.puntosRequeridos} pts. Tu saldo restante se mantendrá intacto.
                  </span>
                </div>
              )}

              {selectedPremio.condiciones && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                  <span className="font-semibold text-white">Condiciones del Premio: </span>
                  {selectedPremio.condiciones}
                </div>
              )}

              <div className="space-y-2">
                <Label>Observaciones de Entrega (opcional)</Label>
                <Textarea
                  placeholder="Ej. Entregar en la sucursal Central de Cochabamba..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedPremio(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCanje}
              disabled={solicitando}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {solicitando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar Canje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor de Fotos */}
      <Dialog open={!!viewPhotoUrl} onOpenChange={() => setViewPhotoUrl(null)}>
        <DialogContent className="max-w-xl p-2 bg-black/90 border-white/10">
          {viewPhotoUrl && (
            <img src={viewPhotoUrl} alt="Comprobante" className="w-full h-auto rounded-lg max-h-[80vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
