
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiDownloadFile } from "@/lib/api";
import { exportToExcel } from "@/lib/exportExcel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Trophy, Medal, Star, FileSpreadsheet, RefreshCw, User, Hash, Gift, CalendarDays, Tv, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CampanaCliente, SorteoPeriodo, SorteoGanador } from "@/types/clientCampaign";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function badgeTipo(tipo: string): React.ReactNode {
  const isFinal = tipo === "FINAL";
  return (
    <Badge className={`text-[10px] font-semibold uppercase ${isFinal ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-sky-500/20 text-sky-300 border border-sky-500/30"}`}>
      {isFinal ? "Gran Final" : "Quincenal"}
    </Badge>
  );
}

function medalIcon(orden: number): React.ReactNode {
  if (orden === 1) return <Trophy className="h-4 w-4 text-amber-400" />;
  if (orden === 2) return <Medal className="h-4 w-4 text-slate-300" />;
  if (orden === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return <Star className="h-4 w-4 text-slate-500" />;
}

interface SorteoGanadorExtended extends SorteoGanador {
  sorteoPeriodoId?: number;
}

export default function AdminGanadoresPage(): React.ReactElement {
  const [campanas, setCampanas] = useState<CampanaCliente[]>([]);
  const [periodos, setPeriodos] = useState<SorteoPeriodo[]>([]);
  const [ganadores, setGanadores] = useState<SorteoGanadorExtended[]>([]);
  const [selectedCampana, setSelectedCampana] = useState<CampanaCliente | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<SorteoPeriodo | null>(null);
  const [selectedGanador, setSelectedGanador] = useState<SorteoGanadorExtended | null>(null);
  const [loadingGanadores, setLoadingGanadores] = useState(false);

  const cargarCampanas = useCallback(async () => {
    try {
      const data = await apiGet<CampanaCliente[]>("/admin/campanas-cliente");
      setCampanas(data);
      if (data.length > 0) setSelectedCampana(data[0]);
    } catch (err: unknown) {
      toast({ title: "Error al cargar campañas", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  }, []);

  const cargarPeriodos = useCallback(async (campana: CampanaCliente) => {
    try {
      const data = await apiGet<SorteoPeriodo[]>(`/sorteos/periodos?campanaId=${campana.id}`);
      setPeriodos(data);
      setSelectedPeriodo(null);
      setGanadores([]);
    } catch (err: unknown) {
      toast({ title: "Error al cargar periodos", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  }, []);

  const cargarGanadores = useCallback(async (campanaId?: number, periodoId?: number) => {
    setLoadingGanadores(true);
    try {
      const url = periodoId
        ? `/sorteos/ganadores?sorteoPeriodoId=${periodoId}`
        : `/sorteos/ganadores?campanaId=${campanaId}`;
      const data = await apiGet<SorteoGanadorExtended[]>(url);
      setGanadores(data);
    } catch (err: unknown) {
      toast({ title: "Error al cargar ganadores", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setLoadingGanadores(false);
    }
  }, []);

  useEffect(() => { cargarCampanas(); }, [cargarCampanas]);

  useEffect(() => {
    if (selectedCampana) cargarPeriodos(selectedCampana);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampana]);

  useEffect(() => {
    if (!selectedCampana) return;
    if (selectedPeriodo) cargarGanadores(undefined, selectedPeriodo.id);
    else cargarGanadores(selectedCampana.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampana, selectedPeriodo]);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = useCallback(async () => {
    if (!selectedCampana) return;
    setExporting(true);
    try {
      await apiDownloadFile(
        `/admin/reportes-cliente/ganadores-excel?campanaId=${selectedCampana.id}`,
        `Ganadores_${selectedCampana.nombre.replace(/\s+/g, "_")}.xlsx`
      );
      toast({ title: "Éxito", description: "Reporte de ganadores descargado correctamente" });
    } catch {
      // Fallback a generación directa en cliente con SheetJS
      if (ganadores.length === 0) {
        toast({ title: "Aviso", description: "No hay ganadores registrados para exportar", variant: "destructive" });
        return;
      }
      exportToExcel(
        ganadores.map(g => {
          const per = periodos.find(p => p.id === g.sorteoPeriodoId);
          return {
            "Campaña": selectedCampana.nombre,
            "Sorteo / Periodo": per?.nombre ?? "—",
            "Tipo Sorteo": per?.tipoSorteo ?? "—",
            "Fecha Sorteo": per?.fechaSorteo ? formatDate(per.fechaSorteo) : "—",
            "Lugar / Premio": g.premio,
            "Orden": g.orden,
            "Nombre Ganador": g.clienteNombre,
            "CI": g.clienteCi,
            "Celular": g.clienteCelular,
            "Código Ticket": g.ticketCliente?.codigoTicket ?? g.ticketVendedor?.numeroTicket ?? "—",
            "Serial": g.serial,
            "Modelo": g.productoModelo,
            "Fecha Registro": formatDate(g.createdAt),
          };
        }),
        `Ganadores_${selectedCampana.nombre.replace(/\s+/g, "_")}`,
        "Ganadores"
      );
      toast({ title: "Excel generado", description: "Se exportaron los ganadores visibles" });
    } finally {
      setExporting(false);
    }
  }, [selectedCampana, ganadores, periodos]);

  const totalGranFinal = ganadores.filter(g => periodos.find(p => p.id === g.sorteoPeriodoId)?.tipoSorteo === "FINAL").length;
  const totalQuincenales = ganadores.filter(g => periodos.find(p => p.id === g.sorteoPeriodoId)?.tipoSorteo === "QUINCENAL").length;

  const statCards = [
    { label: "Total ganadores", value: ganadores.length, Icon: Trophy, tw: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Gran Sorteo Final", value: totalGranFinal, Icon: Star, tw: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Sorteos Quincenales", value: totalQuincenales, Icon: Medal, tw: "text-sky-400", bg: "bg-sky-500/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Trophy className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Ganadores de Sorteos</h1>
            <p className="text-xs text-slate-400">Historial y actas de sorteos quincenales y gran sorteo final</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!selectedCampana) return;
              if (selectedPeriodo) cargarGanadores(undefined, selectedPeriodo.id);
              else cargarGanadores(selectedCampana.id);
            }}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={!selectedCampana || exporting}
            className="bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            )}
            {exporting ? "Descargando..." : "Exportar Excel"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-slate-900/60 border border-white/10 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Campaña</CardTitle>
          </CardHeader>
          <CardContent>
            <select value={selectedCampana?.id ?? ""} onChange={(e) => {
              const c = campanas.find(x => x.id === Number(e.target.value));
              if (c) setSelectedCampana(c);
            }} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 h-9 text-xs text-slate-200">
              {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-white/10 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Periodo de Sorteo</CardTitle>
          </CardHeader>
          <CardContent>
            <select value={selectedPeriodo?.id ?? ""} onChange={(e) => {
              if (!e.target.value) { setSelectedPeriodo(null); return; }
              const p = periodos.find(x => x.id === Number(e.target.value));
              if (p) setSelectedPeriodo(p);
            }} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 h-9 text-xs text-slate-200">
              <option value="">— Todos los sorteos de la campaña —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipoSorteo})</option>)}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map(({ label, value, Icon, tw, bg }) => (
          <Card key={label} className="bg-slate-900/60 border border-white/10 rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`p-2 rounded-xl ${bg}`}><Icon className={`h-4 w-4 ${tw}`} /></div>
              <div>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[10px] text-slate-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Winners Table */}
      <Card className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm text-white font-semibold">Acta de Ganadores</CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            {selectedPeriodo ? `Sorteo: ${selectedPeriodo.nombre}` : "Todos los sorteos de la campaña seleccionada"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingGanadores ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-amber-400 border-t-transparent rounded-full" />
            </div>
          ) : ganadores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Trophy className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No hay ganadores registrados aún</p>
              <p className="text-slate-600 text-xs mt-1">Los ganadores aparecerán aquí después de ejecutar los sorteos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    {["Pos.", "Ticket", "Ganador", "C.I.", "Serial", "Premio", "Fecha", "Tipo", ""].map(h => (
                      <TableHead key={h} className="text-slate-400 text-[10px] uppercase">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {ganadores.map((g, idx) => {
                      const periodo = periodos.find(p => p.id === g.sorteoPeriodoId);
                      return (
                        <motion.tr key={g.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-white/5 hover:bg-white/5 cursor-pointer"
                          onClick={() => setSelectedGanador(g)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {medalIcon(g.orden)}
                              <span className="text-xs text-slate-300 font-bold">#{g.orden}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                              {g.ticketCliente?.codigoTicket ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-white font-medium">{g.clienteNombre}</p>
                            <p className="text-[10px] text-slate-500">{g.clienteCelular}</p>
                          </TableCell>
                          <TableCell><span className="text-xs text-slate-300">{g.clienteCi}</span></TableCell>
                          <TableCell><span className="font-mono text-[10px] text-slate-400">{g.serial}</span></TableCell>
                          <TableCell><span className="text-xs text-emerald-300 font-semibold">{g.premio}</span></TableCell>
                          <TableCell><span className="text-xs text-slate-400">{formatDate(periodo?.fechaEjecucion ?? g.createdAt)}</span></TableCell>
                          <TableCell>{periodo ? badgeTipo(periodo.tipoSorteo) : <span className="text-slate-600 text-xs">—</span>}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setSelectedGanador(g); }}
                              className="text-xs text-slate-400 hover:text-white h-7 px-2">
                              Ver acta
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Winner Certificate Dialog */}
      <Dialog open={!!selectedGanador} onOpenChange={() => setSelectedGanador(null)}>
        <DialogContent className="max-w-sm bg-slate-950 border border-amber-500/20 text-white rounded-3xl p-0 overflow-hidden">
          {selectedGanador && (() => {
            const periodo = periodos.find(p => p.id === selectedGanador.sorteoPeriodoId);
            return (
              <>
                <div className="relative bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400 p-6 text-center">
                  <Trophy className="h-10 w-10 text-white mx-auto mb-2 drop-shadow-lg" />
                  <h2 className="text-lg font-black text-white tracking-wide">¡GANADOR OFICIAL!</h2>
                  <p className="text-amber-100 text-xs mt-1">Certificado de Sorteo Skyworth</p>
                  {periodo && <div className="absolute top-3 right-3">{badgeTipo(periodo.tipoSorteo)}</div>}
                </div>
                <DialogHeader className="sr-only">
                  <DialogTitle>Acta de Ganador</DialogTitle>
                  <DialogDescription>Detalle completo del ganador del sorteo Skyworth</DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Código de Ticket</p>
                    <span className="font-mono text-base text-amber-300 font-bold bg-amber-500/10 px-4 py-1.5 rounded-xl border border-amber-500/30">
                      {selectedGanador.ticketCliente?.codigoTicket ?? "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { icon: User, label: "Ganador", value: selectedGanador.clienteNombre },
                      { icon: Hash, label: "C.I.", value: selectedGanador.clienteCi },
                      { icon: Tv, label: "Serial TV", value: selectedGanador.serial, mono: true },
                      { icon: CalendarDays, label: "Fecha Sorteo", value: formatDate(selectedGanador.createdAt) },
                    ].map(({ icon: Icon, label, value, mono }) => (
                      <div key={label} className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <Icon className="h-3 w-3" /> {label}
                        </div>
                        <p className={`text-white font-semibold ${mono ? "font-mono text-[10px]" : ""}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Gift className="h-4 w-4 text-amber-400" />
                      <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Premio</p>
                    </div>
                    <p className="text-lg font-black text-amber-300">{selectedGanador.premio}</p>
                    {selectedGanador.productoModelo && <p className="text-xs text-slate-400 mt-1">TV {selectedGanador.productoModelo}</p>}
                  </div>
                  {selectedGanador.evidenciaActaUrl && (
                    <a href={selectedGanador.evidenciaActaUrl} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl py-2.5 transition-colors">
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Ver acta digital adjunta
                    </a>
                  )}
                  <Button className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs rounded-xl"
                    onClick={() => setSelectedGanador(null)}>
                    Cerrar
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
