import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Target,
  Plus,
  Tv,
  Gift,
  Calendar,
  Settings,
  Edit2,
  Trash2,
  Sparkles,
  RefreshCw,
  Ticket,
  CheckCircle2,
  Minus,
  Check
} from "lucide-react";

import { CampanaCliente, CampanaDetalleResponse, PremioRuleta, CampanaClienteProducto } from "@/types/clientCampaign";

interface CatalogoProduct {
  id: number;
  nombre: string;
  modelo?: string;
  tamanoPulgadas?: number;
  pulgadas?: number;
  activo: boolean;
}

export default function AdminCampanasClientePage() {
  const [campanas, setCampanas] = useState<CampanaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampana, setSelectedCampana] = useState<CampanaCliente | null>(null);

  // Sub-recursos de la campaña seleccionada
  const [campanaDetalle, setCampanaDetalle] = useState<CampanaDetalleResponse | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Catálogo general de productos para asociar
  const [catalogoProductos, setCatalogoProductos] = useState<CatalogoProduct[]>([]);

  // Modal Campaña (Crear / Editar)
  const [showCampanaModal, setShowCampanaModal] = useState(false);
  const [editingCampana, setEditingCampana] = useState<Partial<CampanaCliente>>({
    nombre: "",
    subtitulo: "",
    fechaInicio: new Date().toISOString().split("T")[0],
    fechaFin: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    activo: true,
    registroHabilitado: true,
    ruletaHabilitada: true,
    webHabilitada: true,
    chatbotHabilitado: true,
    premioFinalMonto: 100000,
    premioFinalDescripcion: "Gran Sorteo Final de Bs. 100.000",
  });

  // Modal Asignar Producto / Tickets
  const [showAsignarProductoModal, setShowAsignarProductoModal] = useState(false);
  const [selectedProductoId, setSelectedProductoId] = useState<number | "">("");
  const [ticketsAsignados, setTicketsAsignados] = useState<number>(1);
  const [savingProducto, setSavingProducto] = useState(false);

  // Modal Premio Ruleta
  const [showPremioModal, setShowPremioModal] = useState(false);
  const [newPremio, setNewPremio] = useState({
    nombre: "",
    descripcion: "",
    colorHex: "#1D4ED8",
    probabilidadPeso: 10,
    activo: true,
  });

  // Cargar catálogo de productos
  const cargarCatalogoProductos = useCallback(async () => {
    try {
      const res = await apiGet<CatalogoProduct[]>("/products");
      setCatalogoProductos(res || []);
    } catch (err: unknown) {
      console.error("Error al cargar productos del catálogo:", err);
    }
  }, []);

  useEffect(() => {
    cargarCatalogoProductos();
  }, [cargarCatalogoProductos]);

  // Cargar detalle de una campaña seleccionada
  const seleccionarCampana = useCallback(async (c: CampanaCliente) => {
    setSelectedCampana(c);
    try {
      setLoadingDetalle(true);
      const det = await apiGet<CampanaDetalleResponse>(`/admin/campanas-cliente/${c.id}`);
      setCampanaDetalle(det);
    } catch (err: unknown) {
      console.error("Error al cargar detalle:", err);
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  // Cargar lista de campañas
  const cargarCampanas = useCallback(async (mantenerSeleccionId?: number) => {
    try {
      setLoading(true);
      const res = await apiGet<CampanaCliente[]>("/admin/campanas-cliente");
      setCampanas(res || []);
      if (res && res.length > 0) {
        const idBuscado = mantenerSeleccionId || selectedCampana?.id;
        const encontrada = res.find((item) => item.id === idBuscado) || res[0];
        seleccionarCampana(encontrada);
      }
    } catch (err: unknown) {
      console.error("Error al cargar campañas cliente:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCampana?.id, seleccionarCampana]);

  useEffect(() => {
    cargarCampanas();
  }, [cargarCampanas]);

  // Abrir modal para NUEVA campaña
  const handleNuevaCampana = () => {
    setEditingCampana({
      id: undefined,
      nombre: "",
      subtitulo: "Gana premios al instante y participa por el sorteo final",
      fechaInicio: new Date().toISOString().split("T")[0],
      fechaFin: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      activo: true,
      registroHabilitado: true,
      ruletaHabilitada: true,
      webHabilitada: true,
      chatbotHabilitado: true,
      premioFinalMonto: 100000,
      premioFinalDescripcion: "Gran Sorteo Final de Bs. 100.000",
    });
    setShowCampanaModal(true);
  };

  // Abrir modal para EDITAR campaña existente
  const handleEditarCampana = (campana: CampanaCliente) => {
    setEditingCampana({
      ...campana,
    });
    setShowCampanaModal(true);
  };

  // Guardar Campaña (Crear o Actualizar)
  const handleSaveCampana = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await apiPost<CampanaCliente>("/admin/campanas-cliente", editingCampana);
      toast({
        title: editingCampana.id ? "Campaña Actualizada" : "Campaña Creada",
        description: `La campaña "${saved.nombre}" se guardó exitosamente.`,
      });
      setShowCampanaModal(false);
      cargarCampanas(saved.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar campaña";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // Switch rápido de canales o activación
  const handleToggleParametro = async (campo: keyof CampanaCliente, valor: boolean) => {
    if (!selectedCampana) return;
    try {
      const payload = {
        ...selectedCampana,
        [campo]: valor,
      };
      const updated = await apiPost<CampanaCliente>("/admin/campanas-cliente", payload);
      setSelectedCampana(updated);
      setCampanas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast({
        title: "Parámetro actualizado",
        description: `Se actualizó la configuración de la campaña.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al actualizar parámetro";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // Guardar / Vincular Producto con Tickets a la Campaña
  const handleAsociarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampana || !selectedProductoId) return;

    try {
      setSavingProducto(true);
      await apiPost(
        `/admin/campanas-cliente/${selectedCampana.id}/productos?productoId=${selectedProductoId}&multiplicadorTickets=${ticketsAsignados}`,
        {}
      );
      toast({
        title: "Producto Vinculado",
        description: `Se configuraron ${ticketsAsignados} ticket(s) para este modelo.`,
      });
      setShowAsignarProductoModal(false);
      setSelectedProductoId("");
      setTicketsAsignados(1);
      seleccionarCampana(selectedCampana);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al asociar producto";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSavingProducto(false);
    }
  };

  // Actualizar tickets de un producto ya vinculado en la tabla
  const handleUpdateTicketsDirect = async (productoId: number, nuevosTickets: number) => {
    if (!selectedCampana || nuevosTickets < 1) return;
    try {
      await apiPost(
        `/admin/campanas-cliente/${selectedCampana.id}/productos?productoId=${productoId}&multiplicadorTickets=${nuevosTickets}`,
        {}
      );
      toast({
        title: "Tickets Actualizados",
        description: `Ahora otorga ${nuevosTickets} ticket(s).`,
      });
      seleccionarCampana(selectedCampana);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al actualizar tickets";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // Desvincular Producto de la Campaña
  const handleDesvincularProducto = async (asociacionId: number, nombreProducto?: string) => {
    if (!selectedCampana) return;
    if (!confirm(`¿Deseas desvincular el modelo "${nombreProducto || 'seleccionado'}" de esta campaña?`)) return;

    try {
      await apiDelete(`/admin/campanas-cliente/productos/${asociacionId}`);
      toast({
        title: "Producto Desvinculado",
        description: "El modelo ya no otorgará tickets en esta campaña.",
      });
      seleccionarCampana(selectedCampana);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al desvincular producto";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // Guardar Premio de Ruleta
  const handleSavePremio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampana) return;
    try {
      await apiPost(`/admin/campanas-cliente/${selectedCampana.id}/premios`, newPremio);
      toast({ title: "Premio Agregado", description: "Premio añadido al catálogo de la ruleta." });
      setShowPremioModal(false);
      seleccionarCampana(selectedCampana);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar premio";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // Eliminar Premio de Ruleta
  const handleEliminarPremio = async (premioId: number, nombre?: string) => {
    if (!selectedCampana) return;
    if (!confirm(`¿Eliminar el premio "${nombre || ''}" de la ruleta?`)) return;

    try {
      await apiDelete(`/admin/campanas-cliente/premios/${premioId}`);
      toast({ title: "Premio Eliminado", description: "El premio fue retirado de la ruleta." });
      seleccionarCampana(selectedCampana);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al eliminar premio";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // Productos del catálogo que aún no han sido asociados a la campaña seleccionada
  const productosDisponiblesParaAsociar = catalogoProductos.filter((p) => {
    const yaAsociado = campanaDetalle?.productos?.some(
      (cp) => cp.producto?.id === p.id
    );
    return !yaAsociado;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Target className="w-3.5 h-3.5" /> Configuración Comercial
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Campañas Cliente Final & Ruleta
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Gestión de temporadas, asignación de tickets por modelo de televisor y catálogo de premios de ruleta
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => cargarCampanas()}
            variant="outline"
            className="border-white/10 text-slate-300 hover:text-white rounded-xl"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            onClick={handleNuevaCampana}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Grid: Lista de Campañas y Panel de Configuración */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Lista de Temporadas / Campañas */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg text-white">Temporadas</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Selecciona para configurar tickets y ruleta
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNuevaCampana}
              className="text-amber-400 hover:text-amber-300 p-1.5 h-auto text-xs"
              title="Crear nueva campaña"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {campanas.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No hay campañas registradas. Haz clic en "Nueva Campaña".
              </div>
            ) : (
              campanas.map((c) => {
                const isSelected = selectedCampana?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => seleccionarCampana(c)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/5"
                        : "bg-slate-950/40 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                        {c.nombre}
                      </h4>
                      <div className="flex items-center gap-2">
                        {c.activo ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px]">
                            Activa
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-400 text-[9px]">
                            Inactiva
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditarCampana(c);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                          title="Editar Campaña"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {c.fechaInicio} al {c.fechaFin}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-amber-400">
                      <span className="text-slate-400">Premio Final:</span>
                      <span className="font-bold font-mono">
                        Bs. {c.premioFinalMonto ? c.premioFinalMonto.toLocaleString() : "0"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Columna Derecha: Configuración Detallada de la Campaña Seleccionada */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCampana ? (
            <>
              {/* Tarjeta de Resumen y Botón de Editar Campaña */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{selectedCampana.nombre}</h3>
                    {selectedCampana.activo ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
                        Campaña Activa
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px]">
                        Campaña Inactiva
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Vigencia: <strong className="text-white">{selectedCampana.fechaInicio}</strong> al <strong className="text-white">{selectedCampana.fechaFin}</strong>
                    {selectedCampana.subtitulo && ` • ${selectedCampana.subtitulo}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => handleEditarCampana(selectedCampana)}
                    variant="outline"
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-xl text-xs font-bold flex-1 sm:flex-initial"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Editar Campaña
                  </Button>
                </div>
              </div>

              {/* SECCIÓN 1: MODELOS / PRODUCTOS PARTICIPANTES Y TICKETS OTORGADOS */}
              <Card className="border-amber-500/30 bg-slate-900/60 backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.05)]">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Tv className="w-5 h-5 text-amber-400" />
                      Modelos de Televisores & Asignación de Tickets
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Configura qué televisores participan y cuántos tickets otorga cada compra para la tómbola.
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedProductoId("");
                      setTicketsAsignados(1);
                      setShowAsignarProductoModal(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Asignar Modelo / Tickets
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-950/80">
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-slate-400 text-xs">Televisor / Modelo</TableHead>
                          <TableHead className="text-slate-400 text-xs">Pulgadas</TableHead>
                          <TableHead className="text-center text-slate-400 text-xs">
                            Tickets Otorgados por Compra
                          </TableHead>
                          <TableHead className="text-right text-slate-400 text-xs">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!campanaDetalle?.productos || campanaDetalle.productos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-slate-500 text-xs">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Ticket className="w-8 h-8 text-slate-600 mb-1" />
                                <span>No se han asignado televisores ni tickets a esta campaña aún.</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowAsignarProductoModal(true)}
                                  className="mt-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs rounded-xl"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Asignar Primer Modelo
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          campanaDetalle.productos.map((cp: CampanaClienteProducto) => {
                            const prod = cp.producto;
                            const currentTickets = cp.tickets || 1;
                            return (
                              <TableRow key={cp.id} className="border-white/5 hover:bg-slate-800/30">
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                      <Tv className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-xs text-white">
                                        {prod?.nombre || prod?.modelo || "Modelo TV"}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-mono">
                                        {prod?.modeloCodigo || prod?.modelo || "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-slate-800 text-slate-300 text-[10px]">
                                    {prod?.tamanoPulgadas || prod?.pulgadas ? `${prod.tamanoPulgadas || prod.pulgadas}"` : "Varios"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {/* Selector rápido interactivo de tickets */}
                                  <div className="inline-flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-amber-500/30">
                                    <button
                                      type="button"
                                      disabled={currentTickets <= 1}
                                      onClick={() => handleUpdateTicketsDirect(prod.id, currentTickets - 1)}
                                      className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                                      title="Reducir 1 ticket"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>

                                    <span className="font-mono font-black text-amber-400 text-xs px-2 min-w-[50px] text-center">
                                      {currentTickets} {currentTickets === 1 ? "Ticket" : "Tickets"}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateTicketsDirect(prod.id, currentTickets + 1)}
                                      className="w-6 h-6 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 flex items-center justify-center cursor-pointer"
                                      title="Aumentar 1 ticket"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDesvincularProducto(cp.id, prod?.nombre || prod?.modelo)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                    title="Desvincular de la campaña"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* SECCIÓN 2: PREMIOS DE LA RULETA */}
              <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-400" />
                      Premios Inmediatos de la Ruleta
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Opciones que giran en la ruleta del impulsador (se excluyen automáticamente al llegar a stock 0)
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewPremio({
                        nombre: "",
                        descripcion: "",
                        colorHex: "#1D4ED8",
                        probabilidadPeso: 10,
                        activo: true,
                      });
                      setShowPremioModal(true);
                    }}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nuevo Premio
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-950/80">
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-slate-400 text-xs">Color</TableHead>
                          <TableHead className="text-slate-400 text-xs">Premio</TableHead>
                          <TableHead className="text-center text-slate-400 text-xs">Peso / Prob.</TableHead>
                          <TableHead className="text-slate-400 text-xs">Estado</TableHead>
                          <TableHead className="text-right text-slate-400 text-xs">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!campanaDetalle?.premiosRuleta || campanaDetalle.premiosRuleta.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-slate-500 text-xs">
                              No se han configurado premios para la ruleta aún.
                            </TableCell>
                          </TableRow>
                        ) : (
                          campanaDetalle.premiosRuleta.map((p: PremioRuleta) => (
                            <TableRow key={p.id} className="border-white/5 hover:bg-slate-800/30">
                              <TableCell>
                                <div
                                  className="w-5 h-5 rounded-full shadow-sm border border-white/20"
                                  style={{ backgroundColor: p.colorHex || "#3b82f6" }}
                                />
                              </TableCell>
                              <TableCell>
                                <p className="font-semibold text-xs text-white">{p.nombre}</p>
                                <p className="text-[10px] text-slate-400">{p.descripcion}</p>
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs text-amber-400 font-bold">
                                {p.probabilidadPeso}
                              </TableCell>
                              <TableCell>
                                {p.activo ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 text-[9px]">Activo</Badge>
                                ) : (
                                  <Badge className="bg-slate-800 text-slate-400 text-[9px]">Inactivo</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEliminarPremio(p.id, p.nombre)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                  title="Eliminar premio"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* SECCIÓN 3: CANALES Y PARÁMETROS INTERACTIVOS */}
              <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-400" />
                    Canales de Registro y Parámetros
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Activa o desactiva directamente las vías de registro de tickets en esta campaña.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Canal 1: Bandeo / Ruleta */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between gap-3">
                    <div>
                      <p className="font-bold text-white text-sm">Bandeo / Ruleta</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Operadores en puntos de venta</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] text-slate-400">
                        {selectedCampana.ruletaHabilitada ? "Habilitado" : "Deshabilitado"}
                      </span>
                      <Switch
                        checked={selectedCampana.ruletaHabilitada}
                        onCheckedChange={(val) => handleToggleParametro("ruletaHabilitada", val)}
                      />
                    </div>
                  </div>

                  {/* Canal 2: Landing Web */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between gap-3">
                    <div>
                      <p className="font-bold text-white text-sm">Landing Web</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Auto-registro de clientes en web</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] text-slate-400">
                        {selectedCampana.webHabilitada ? "Habilitado" : "Deshabilitado"}
                      </span>
                      <Switch
                        checked={selectedCampana.webHabilitada}
                        onCheckedChange={(val) => handleToggleParametro("webHabilitada", val)}
                      />
                    </div>
                  </div>

                  {/* Canal 3: Chatbot WhatsApp */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between gap-3">
                    <div>
                      <p className="font-bold text-white text-sm">Chatbot WhatsApp</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Registro asistido por bot</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] text-slate-400">
                        {selectedCampana.chatbotHabilitado ? "Habilitado" : "Deshabilitado"}
                      </span>
                      <Switch
                        checked={selectedCampana.chatbotHabilitado}
                        onCheckedChange={(val) => handleToggleParametro("chatbotHabilitado", val)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs border border-white/10 rounded-3xl bg-slate-900/40">
              Seleccione una campaña de la lista izquierda para ver y editar su configuración.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREAR O EDITAR CAMPAÑA */}
      <Dialog open={showCampanaModal} onOpenChange={setShowCampanaModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingCampana.id ? "Editar Campaña Comercial" : "Nueva Campaña Comercial"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Configura los datos generales, fechas de vigencia y premio mayor final.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCampana} className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs text-slate-300">Nombre de la Campaña *</Label>
              <Input
                required
                value={editingCampana.nombre || ""}
                onChange={(e) => setEditingCampana({ ...editingCampana, nombre: e.target.value })}
                placeholder="Ej: Campaña Skyworth Fin de Año 2026"
                className="bg-slate-900 border-white/10 mt-1 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Subtítulo / Eslogan</Label>
              <Input
                value={editingCampana.subtitulo || ""}
                onChange={(e) => setEditingCampana({ ...editingCampana, subtitulo: e.target.value })}
                placeholder="Ej: Gana premios al instante y participa por el sorteo final"
                className="bg-slate-900 border-white/10 mt-1 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Fecha Inicio *</Label>
                <Input
                  type="date"
                  required
                  value={editingCampana.fechaInicio || ""}
                  onChange={(e) => setEditingCampana({ ...editingCampana, fechaInicio: e.target.value })}
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Fecha Fin *</Label>
                <Input
                  type="date"
                  required
                  value={editingCampana.fechaFin || ""}
                  onChange={(e) => setEditingCampana({ ...editingCampana, fechaFin: e.target.value })}
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Monto Gran Premio Final (Bs.)</Label>
              <Input
                type="number"
                value={editingCampana.premioFinalMonto || 0}
                onChange={(e) => setEditingCampana({ ...editingCampana, premioFinalMonto: Number(e.target.value) })}
                className="bg-slate-900 border-white/10 mt-1 rounded-xl font-bold text-amber-400"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Descripción del Premio Final</Label>
              <Input
                value={editingCampana.premioFinalDescripcion || ""}
                onChange={(e) => setEditingCampana({ ...editingCampana, premioFinalDescripcion: e.target.value })}
                placeholder="Ej: Gran Sorteo Final de Bs. 100.000 en efectivo"
                className="bg-slate-900 border-white/10 mt-1 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white">Estado de la Campaña</span>
                <p className="text-[10px] text-slate-400">Si está activa, los clientes podrán registrarse</p>
              </div>
              <Switch
                checked={editingCampana.activo ?? true}
                onCheckedChange={(val) => setEditingCampana({ ...editingCampana, activo: val })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl h-11">
                <Check className="w-4 h-4 mr-1.5" />
                {editingCampana.id ? "Guardar Cambios de la Campaña" : "Crear Campaña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ASIGNAR PRODUCTO Y TICKETS A LA CAMPAÑA */}
      <Dialog open={showAsignarProductoModal} onOpenChange={setShowAsignarProductoModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Tv className="w-5 h-5 text-amber-400" />
              Asignar Modelo y Cantidad de Tickets
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Selecciona el televisor Skyworth y cuántos tickets otorgará su compra.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAsociarProducto} className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs text-slate-300">Seleccionar Modelo / Televisor *</Label>
              <select
                required
                value={selectedProductoId}
                onChange={(e) => setSelectedProductoId(e.target.value ? Number(e.target.value) : "")}
                className="w-full mt-1.5 p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:ring-1 focus:ring-amber-400"
              >
                <option value="">-- Elige un televisor del catálogo --</option>
                {productosDisponiblesParaAsociar.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.modelo ? `(${p.modelo})` : ""} {p.tamanoPulgadas || p.pulgadas ? `- ${p.tamanoPulgadas || p.pulgadas}"` : ""}
                  </option>
                ))}
              </select>
              {productosDisponiblesParaAsociar.length === 0 && (
                <p className="text-[10px] text-amber-400/80 mt-1.5">
                  Todos los modelos del catálogo ya están vinculados a esta campaña.
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-300">Cantidad de Tickets que Otorga *</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={ticketsAsignados}
                  onChange={(e) => setTicketsAsignados(Math.max(1, Number(e.target.value)))}
                  className="bg-slate-900 border-white/10 rounded-xl font-mono text-base font-black text-amber-400 w-28 text-center"
                />
                <span className="text-xs text-slate-400">
                  tickets por cada compra validada
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Ejemplo: Modelos de 32" pueden otorgar 1 ticket, modelos de 55" 2 tickets, y modelos superiores 3 o más tickets.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={savingProducto || !selectedProductoId}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl h-11"
              >
                {savingProducto ? "Guardando..." : "Vincular Modelo a la Campaña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: NUEVO PREMIO RULETA */}
      <Dialog open={showPremioModal} onOpenChange={setShowPremioModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Nuevo Premio de Ruleta</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Añade un premio físico inmediato para los bandeos con ruleta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePremio} className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs text-slate-300">Nombre del Premio *</Label>
              <Input
                required
                value={newPremio.nombre}
                onChange={(e) => setNewPremio({ ...newPremio, nombre: e.target.value })}
                placeholder="Ej: Toma Todo Skyworth"
                className="bg-slate-900 border-white/10 mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Descripción</Label>
              <Input
                value={newPremio.descripcion}
                onChange={(e) => setNewPremio({ ...newPremio, descripcion: e.target.value })}
                placeholder="Ej: Vaso térmico con logo oficial"
                className="bg-slate-900 border-white/10 mt-1 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Color del Gajo *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={newPremio.colorHex}
                    onChange={(e) => setNewPremio({ ...newPremio, colorHex: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-xs text-slate-300">{newPremio.colorHex}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-300">Peso Probabilidad *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newPremio.probabilidadPeso}
                  onChange={(e) => setNewPremio({ ...newPremio, probabilidadPeso: Number(e.target.value) })}
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl font-mono"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl h-11">
                Guardar Premio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
