import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Sparkles, 
  Tv, 
  RotateCw, 
  Users, 
  Award, 
  Play, 
  Flame, 
  RefreshCw, 
  CheckCircle2, 
  Calendar, 
  Plus, 
  Printer, 
  MessageCircle, 
  Clock, 
  Gift, 
  AlertTriangle,
  Loader2,
  FileCheck
} from "lucide-react";
import { CampanaActivaResponse, SorteoPeriodo, SorteoGanador, TicketCliente } from "@/types/clientCampaign";
import { RealisticTombolaMachine } from "@/components/tombola/RealisticTombolaMachine";

// Sonido sintético de redoble de tambor para la tómbola
function playDrumroll(audioCtx: AudioContext | null) {
  if (!audioCtx) return;
  try {
    const bufferSize = audioCtx.sampleRate * 2.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 3.8);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
    noise.stop(audioCtx.currentTime + 3.8);
  } catch (e: unknown) {
    console.debug("Audio synthesis not permitted yet:", e);
  }
}

interface TicketVendedorParticipante {
  id: number;
  numeroTicket: string;
  vendedor?: {
    nombreCompleto?: string;
    ci?: string;
    telefono?: string;
  };
  venta?: {
    storeName?: string;
    serial?: string;
    productModel?: string;
  };
  estado: EstadoTicket;
  campana?: {
    id: number;
    nombre: string;
  };
}

export default function TombolaSorteoPage() {
  const { user } = useAuth();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [campana, setCampana] = useState<{ id: number; nombre: string; premioFinalMonto: number } | null>(null);
  const [periodos, setPeriodos] = useState<SorteoPeriodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null);
  const [tipoModo, setTipoModo] = useState<"QUINCENAL" | "FINAL">("QUINCENAL");
  const [tipoPublico, setTipoPublico] = useState<"CLIENTES" | "VENDEDORES" | "TIENDAS">("CLIENTES");


  const [participantes, setParticipantes] = useState<TicketCliente[]>([]);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rollingCode, setRollingCode] = useState("SKY-TKT-??????");

  // Modal para crear nuevo sorteo quincenal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingSorteo, setCreatingSorteo] = useState(false);
  const [newSorteoForm, setNewSorteoForm] = useState({
    nombre: "",
    tipoSorteo: "QUINCENAL" as "QUINCENAL" | "FINAL",
    fechaSorteo: new Date().toISOString().split("T")[0],
    fechaCorteRegistro: new Date().toISOString().split("T")[0],
    descripcionPremios: "Smart TV Skyworth 55\" 4K Google TV",
  });

  // Ganador actual
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerData, setWinnerData] = useState<SorteoGanador | null>(null);
  const [ganadoresHistorial, setGanadoresHistorial] = useState<SorteoGanador[]>([]);

  // Configuración de premio al girar
  const [premioNombre, setPremioNombre] = useState("Televisor Skyworth 55\" Smart 4K");

  // Periodo seleccionado activo
  const selectedPeriodo = periodos.find((p) => p.id === selectedPeriodoId) || null;

  // Cargar campaña y periodos
  const cargarConfiguracion = useCallback(async () => {
    try {
      if (tipoPublico === "VENDEDORES" || tipoPublico === "TIENDAS") {
        const tipoEnum = tipoPublico === "VENDEDORES" ? "VENDEDOR" : "TIENDA";
        let periodosRes = await apiGet<SorteoPeriodo[]>(`/sorteos/periodos?tipoParticipante=${tipoEnum}`);
        if (!periodosRes || periodosRes.length === 0) {
          const nuevo = await apiPost<SorteoPeriodo>("/sorteos/periodos", {
            nombre: `Gran Sorteo Oficial ${tipoPublico === "VENDEDORES" ? "Vendedores" : "Tiendas"} Skyworth`,
            tipoParticipante: tipoEnum,
            tipoSorteo: "FINAL",
            descripcionPremios: "Premio Especial Skyworth",
            fechaSorteo: new Date().toISOString().split("T")[0],
            fechaCorteRegistro: new Date().toISOString().split("T")[0],
          });
          periodosRes = [nuevo];
        }
        setPeriodos(periodosRes || []);
        if (periodosRes && periodosRes.length > 0) {
          setSelectedPeriodoId(periodosRes[0].id);
          if (periodosRes[0].descripcionPremios) {
            setPremioNombre(periodosRes[0].descripcionPremios);
          }
        }
      } else {
        const campanaRes = await apiGet<CampanaActivaResponse>("/cliente/campana-activa");
        if (campanaRes.activa && campanaRes.campana) {
          setCampana(campanaRes.campana);
          const periodosRes = await apiGet<SorteoPeriodo[]>(`/sorteos/periodos?campanaId=${campanaRes.campana.id}`);
          setPeriodos(periodosRes || []);

          if (periodosRes && periodosRes.length > 0) {
            const match = periodosRes.find((p) => p.tipoSorteo === tipoModo && !p.ejecutado) 
              || periodosRes.find((p) => p.tipoSorteo === tipoModo) 
              || periodosRes[0];
            setSelectedPeriodoId(match.id);
            if (match.descripcionPremios) {
              setPremioNombre(match.descripcionPremios);
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error("Error al cargar configuración:", err);
    }
  }, [tipoModo, tipoPublico]);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  // Cargar universo de tickets participantes según el modo
  const cargarParticipantes = useCallback(async () => {
    try {
      setLoadingParticipantes(true);
      if (tipoPublico === "VENDEDORES" || tipoPublico === "TIENDAS") {
        const vendorTickets = await apiGet<TicketVendedorParticipante[]>("/sorteos/participantes-vendedor");
        const mapped = (vendorTickets || []).map((vt: TicketVendedorParticipante) => ({
          id: vt.id,
          codigoTicket: vt.numeroTicket,
          clienteNombre: vt.vendedor?.nombreCompleto || (tipoPublico === "TIENDAS" ? vt.venta?.storeName : "Vendedor"),
          clienteCi: vt.vendedor?.ci || "S/CI",
          clienteCelular: vt.vendedor?.telefono || "",
          serial: vt.venta?.serial || "",
          productoModelo: vt.venta?.productModel || "",
          estado: vt.estado,
          campanaCliente: { id: vt.campana?.id || 1, nombre: vt.campana?.nombre || "Campaña Vendedor" },
        } as unknown as TicketCliente));
        setParticipantes(mapped);
      } else {
        if (!campana?.id) return;
        const endpoint = tipoModo === "QUINCENAL"
          ? `/sorteos/participantes-quincenal?campanaId=${campana.id}`
          : `/sorteos/participantes-final?campanaId=${campana.id}`;

        const res = await apiGet<TicketCliente[]>(endpoint);
        setParticipantes(res || []);
      }

      // Cargar historial de ganadores
      const urlGanadores = campana?.id ? `/sorteos/ganadores?campanaId=${campana.id}` : "/sorteos/ganadores";
      const ganadoresRes = await apiGet<SorteoGanador[]>(urlGanadores);
      setGanadoresHistorial(ganadoresRes || []);
    } catch (err: unknown) {
      console.error("Error al cargar participantes:", err);
    } finally {
      setLoadingParticipantes(false);
    }
  }, [campana?.id, tipoModo, tipoPublico]);


  useEffect(() => {
    cargarParticipantes();
  }, [cargarParticipantes]);

  // Al cambiar el periodo seleccionado en el dropdown
  const handleSelectPeriodo = (id: number) => {
    setSelectedPeriodoId(id);
    const p = periodos.find((item) => item.id === id);
    if (p) {
      if (p.descripcionPremios) {
        setPremioNombre(p.descripcionPremios);
      }
      setTipoModo(p.tipoSorteo);
    }
  };

  // Crear nuevo sorteo quincenal
  const handleCreateSorteo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campana?.id) return;
    if (!newSorteoForm.nombre.trim()) {
      toast({ title: "Nombre requerido", description: "Ingrese el nombre del sorteo (ej: 2do Sorteo Quincenal).", variant: "destructive" });
      return;
    }

    setCreatingSorteo(true);
    try {
      const res = await apiPost<SorteoPeriodo>(`/sorteos/periodos?campanaId=${campana.id}`, newSorteoForm);
      toast({ title: "Sorteo Creado", description: `Se programó "${res.nombre}" exitosamente.` });
      setShowCreateModal(false);
      await cargarConfiguracion();
      setSelectedPeriodoId(res.id);
      if (res.descripcionPremios) {
        setPremioNombre(res.descripcionPremios);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear sorteo";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setCreatingSorteo(false);
    }
  };

  // Ejecutar el sorteo cinematográfico
  const handleEjecutarSorteo = async () => {
    if (participantes.length === 0) {
      toast({ 
        title: "Sin participantes habilitados", 
        description: "No existen tickets aprobados disponibles para este sorteo.", 
        variant: "destructive" 
      });
      return;
    }

    if (!selectedPeriodoId) {
      toast({ 
        title: "Seleccione un Sorteo", 
        description: "Debe escoger el sorteo quincenal a ejecutar o crear uno nuevo.", 
        variant: "destructive" 
      });
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    setIsDrawing(true);
    playDrumroll(audioCtxRef.current);

    // Efecto de slot machine / ruleta de tickets a alta velocidad
    const rollInterval = setInterval(() => {
      const randTicket = participantes[Math.floor(Math.random() * participantes.length)];
      if (randTicket) {
        setRollingCode(randTicket.codigoTicket);
      }
    }, 60);

    try {
      const premioFinal = tipoModo === "FINAL" ? `Gran Premio Bs. ${campana?.premioFinalMonto || 100000}` : premioNombre;

      const res = await apiPost<{
        success: boolean;
        ganador: SorteoGanador;
      }>(`/sorteos/ejecutar?sorteoPeriodoId=${selectedPeriodoId}&premioNombre=${encodeURIComponent(premioFinal)}&ordenGanador=${ganadoresHistorial.length + 1}`, {});

      setTimeout(() => {
        clearInterval(rollInterval);
        setIsDrawing(false);
        if (res.success && res.ganador) {
          setWinnerData(res.ganador);
          const winnerCode = res.ganador.ticketCliente?.codigoTicket || res.ganador.ticketVendedor?.numeroTicket || "TKT-PREMIADO";
          setRollingCode(winnerCode);

          setShowWinnerModal(true);
          cargarParticipantes();
          cargarConfiguracion();
        }
      }, 3800);

    } catch (err: unknown) {
      clearInterval(rollInterval);
      setIsDrawing(false);
      const message = err instanceof Error ? err.message : "Error al ejecutar el sorteo";
      toast({ title: "Error en el sorteo", description: message, variant: "destructive" });
    }
  };

  // Filtrar periodos por el modo activo
  const periodosDelModo = periodos.filter((p) => p.tipoSorteo === tipoModo);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none">
      {/* Header Cinematográfico */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-slate-900 to-indigo-950 border border-amber-500/30 p-6 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)]">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest mb-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Tómbola Digital Oficial Skyworth
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Sorteos Quincenales & Gran Sorteo Final
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Selección inmutable con tómbola criptográfica sobre tickets habilitados por supervisión.
            </p>
          </div>

          {/* Selector de Modo (Quincenal vs Final) */}
          {/* Selectores de Audiencia y Modalidad */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Público Participante */}
            <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shrink-0">
              <button
                onClick={() => setTipoPublico("CLIENTES")}
                className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 ${
                  tipoPublico === "CLIENTES"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Clientes
              </button>
              <button
                onClick={() => setTipoPublico("VENDEDORES")}
                className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 ${
                  tipoPublico === "VENDEDORES"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Award className="w-3.5 h-3.5" /> Vendedores
              </button>
              <button
                onClick={() => setTipoPublico("TIENDAS")}
                className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 ${
                  tipoPublico === "TIENDAS"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" /> Tiendas
              </button>
            </div>

            {/* Selector de Modo (Quincenal vs Final) si es Clientes */}
            {tipoPublico === "CLIENTES" && (
              <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shrink-0">
                <button
                  onClick={() => {
                    setTipoModo("QUINCENAL");
                    const firstQuincenal = periodos.find((p) => p.tipoSorteo === "QUINCENAL");
                    if (firstQuincenal) setSelectedPeriodoId(firstQuincenal.id);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all ${
                    tipoModo === "QUINCENAL"
                      ? "bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Quincenal
                </button>
                <button
                  onClick={() => {
                    setTipoModo("FINAL");
                    const firstFinal = periodos.find((p) => p.tipoSorteo === "FINAL");
                    if (firstFinal) setSelectedPeriodoId(firstFinal.id);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 ${
                    tipoModo === "FINAL"
                      ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  Final 100K
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* BARRA DE GESTIÓN Y SELECCIÓN DEL SORTEO QUINCENAL */}
      <Card className="border-amber-500/20 bg-slate-900/80 backdrop-blur-xl">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Sorteo a Ejecutar:
              </span>
            </div>

            {/* Dropdown de Sorteos Disponibles */}
            <select
              value={selectedPeriodoId || ""}
              onChange={(e) => handleSelectPeriodo(Number(e.target.value))}
              className="bg-slate-950 border border-amber-500/30 rounded-xl px-4 h-11 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-w-[260px]"
            >
              {periodosDelModo.length === 0 ? (
                <option value="">No hay sorteos programados</option>
              ) : (
                periodosDelModo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.fechaSorteo}) {p.ejecutado ? "✓ [EJECUTADO]" : "⏳ [PENDIENTE]"}
                  </option>
                ))
              )}
            </select>

            {selectedPeriodo && (
              <Badge 
                className={`text-[10px] px-2.5 py-1 ${
                  selectedPeriodo.ejecutado 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}
              >
                {selectedPeriodo.ejecutado ? "✓ Sorteo Ya Ejecutado" : "⏳ Pendiente de Ejecución"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNewSorteoForm({
                  nombre: `${periodosDelModo.length + 1}° Sorteo Quincenal`,
                  tipoSorteo: tipoModo,
                  fechaSorteo: new Date().toISOString().split("T")[0],
                  fechaCorteRegistro: new Date().toISOString().split("T")[0],
                  descripcionPremios: tipoModo === "FINAL" ? "Premio Mayor Bs. 100.000" : "Smart TV Skyworth 55\" 4K Google TV",
                });
                setShowCreateModal(true);
              }}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-xl h-11 text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5 text-amber-400" />
              Programar Nuevo Sorteo
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cargarParticipantes}
              className="text-slate-400 hover:text-white rounded-xl h-11"
              title="Refrescar participantes"
            >
              <RefreshCw className={`w-4 h-4 ${loadingParticipantes ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regla Quincenal Informativa */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex items-start gap-3 text-xs text-slate-300">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          {tipoModo === "QUINCENAL" ? (
            <p>
              <strong className="text-white">Regla Quincenal Oficial:</strong> Participan únicamente los tickets habilitados. Los clientes que resulten ganadores quedarán automáticamente <strong className="text-amber-400">excluidos de las siguientes quincenas</strong> para dar oportunidad a otros clientes, pero mantendrán su derecho a participar en el <strong className="text-white">Sorteo Final de Bs. 100.000</strong>.
            </p>
          ) : (
            <p>
              <strong className="text-white">Gran Sorteo Final de Bs. 100.000:</strong> Participan absolutamente <strong className="text-emerald-400">TODOS los tickets habilitados</strong> de toda la vigencia de la campaña, incluyendo a los ganadores de quincenas previas.
            </p>
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL: TÓMBOLA ESPECTACULAR Y ACTA DE GANADORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TÓMBOLA DE SORTEOS ULTRA PREMIUM */}
        <div className="lg:col-span-2 relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-950 via-[#0d121f] to-black border-2 border-amber-500/30 overflow-hidden shadow-[0_0_70px_rgba(245,158,11,0.12)] backdrop-blur-2xl text-center">
          {/* Fondo de resplandor radial y estrellas */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0,transparent_65%)] pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

          {/* TÓMBOLA REALISTA CON MOTOR DE FÍSICA Y BALOTAS 3D */}
          <div className="relative z-10 w-full flex flex-col items-center justify-center mb-6">
            <RealisticTombolaMachine
              isDrawing={isDrawing}
              rollingCode={rollingCode}
              hasTickets={participantes.length > 0}
              totalTickets={participantes.length}
            />
          </div>

          {/* PANEL DE CONTROL DE DISPARO DEL SORTEO */}
          <div className="relative z-10 w-full max-w-md space-y-4">
            {/* Campo para editar el nombre del premio en juego */}
            <div className="text-left space-y-1.5 bg-slate-900/80 p-3.5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  Premio a Sortear:
                </Label>
                <span className="text-[10px] text-amber-400/80 font-mono">Editable</span>
              </div>
              <Input
                value={premioNombre}
                onChange={(e) => setPremioNombre(e.target.value)}
                placeholder="Ej: Smart TV Skyworth 55 pulgadas 4K"
                disabled={isDrawing}
                className="bg-slate-950 border-amber-500/30 rounded-xl h-10 text-xs font-bold text-amber-300 focus:border-amber-400"
              />
            </div>

            {/* BOTÓN GIGANTE DE ACCIÓN */}
            <Button
              size="lg"
              disabled={isDrawing || participantes.length === 0 || !selectedPeriodoId}
              onClick={handleEjecutarSorteo}
              className={`w-full py-8 rounded-2xl font-black text-base sm:text-lg tracking-widest shadow-2xl transition-all cursor-pointer ${
                tipoModo === "FINAL"
                  ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-[0_0_50px_rgba(245,158,11,0.6)]"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.4)]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isDrawing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  ¡EXTRAYENDO GANADOR DE LA TÓMBOLA!...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-6 h-6 fill-current" />
                  {tipoModo === "FINAL" 
                    ? "¡GIRAR GRAN TÓMBOLA FINAL BS 100.000!" 
                    : `¡GIRAR TÓMBOLA: ${selectedPeriodo?.nombre || "QUINCENAL"}!`}
                </span>
              )}
            </Button>

            {/* Pie de estado y universo de tickets */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 pt-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Universo: <strong className="text-white font-mono">{participantes.length}</strong> tickets habilitados
              </span>
              <button 
                onClick={cargarParticipantes} 
                className="hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refrescar padrón
              </button>
            </div>
          </div>
        </div>

        {/* ACTA HISTÓRICA DE GANADORES EMITIDOS */}
        <Card className="border-white/10 bg-slate-950/80 backdrop-blur-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Acta de Ganadores Oficiales
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Registro inmutable de ganadores emitidos en la campaña.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto max-h-[580px] space-y-3">
            {ganadoresHistorial.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center gap-2">
                <Trophy className="w-10 h-10 opacity-30" />
                <span>Aún no se han ejecutado sorteos para esta campaña.</span>
              </div>
            ) : (
              ganadoresHistorial.map((g, idx) => (
                <div
                  key={g.id || idx}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/5 space-y-2 hover:border-amber-500/30 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {g.ticketCliente?.codigoTicket || "TKT-PREMIADO"}
                    </span>
                    <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[9px] px-2 py-0.5">
                      Ganador #{g.orden || idx + 1}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="font-bold text-sm text-white">{g.clienteNombre}</p>
                    <p className="text-[11px] text-slate-400 font-mono">CI: {g.clienteCi} · Cel: {g.clienteCelular}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Premio:</span>
                      <span className="font-semibold text-emerald-400">{g.premio}</span>
                    </div>
                    {g.productoModelo && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>TV Comprado:</span>
                        <span>{g.productoModelo} ({g.serial})</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL 1: PROGRAMAR / CREAR NUEVO SORTEO QUINCENAL */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Programar Nuevo Sorteo
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Define la fecha, modalidad y premio para este sorteo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSorteo} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nombre del Sorteo *</Label>
              <Input
                required
                value={newSorteoForm.nombre}
                onChange={(e) => setNewSorteoForm({ ...newSorteoForm, nombre: e.target.value })}
                placeholder="Ej: 2do Sorteo Quincenal - Octubre"
                className="bg-slate-900 border-white/10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Tipo de Sorteo</Label>
                <select
                  value={newSorteoForm.tipoSorteo}
                  onChange={(e) => setNewSorteoForm({ ...newSorteoForm, tipoSorteo: e.target.value as "QUINCENAL" | "FINAL" })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-200"
                >
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="FINAL">Sorteo Final</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">Fecha del Sorteo</Label>
                <Input
                  type="date"
                  required
                  value={newSorteoForm.fechaSorteo}
                  onChange={(e) => setNewSorteoForm({ ...newSorteoForm, fechaSorteo: e.target.value, fechaCorteRegistro: e.target.value })}
                  className="bg-slate-900 border-white/10 text-xs rounded-xl h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Descripción del Premio *</Label>
              <Input
                required
                value={newSorteoForm.descripcionPremios}
                onChange={(e) => setNewSorteoForm({ ...newSorteoForm, descripcionPremios: e.target.value })}
                placeholder="Ej: Smart TV Skyworth 55 pulgadas 4K Google TV"
                className="bg-slate-900 border-white/10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-white/10 text-slate-300 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creatingSorteo}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
              >
                {creatingSorteo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar y Habilitar Sorteo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ANUNCIO OFICIAL DEL GANADOR CON CELEBRACIÓN DE GALA */}
      <Dialog open={showWinnerModal} onOpenChange={setShowWinnerModal}>
        <DialogContent className="max-w-md sm:max-w-lg bg-gradient-to-b from-slate-950 via-slate-900 to-black border-2 border-amber-400/80 text-white rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.5)]">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto mb-2 animate-bounce shadow-[0_0_30px_rgba(245,158,11,0.5)]">
              <Trophy className="w-9 h-9" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
              ¡TENEMOS UN GANADOR OFICIAL!
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs sm:text-sm">
              Sorteo Quincenal Oficial Skyworth · GRUPO EMPRESARIAL QUISBERT
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 text-center">
            {/* TICKET GANADOR GIGANTE */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-inner">
              <p className="text-xs text-amber-300 font-semibold uppercase tracking-widest">TICKET PREMIADO</p>
              <h2 className="text-3xl sm:text-4xl font-black font-mono text-white mt-1 tracking-wider drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
                {winnerData?.ticketCliente?.codigoTicket || winnerData?.ticketVendedor?.numeroTicket || "TKT-PREMIADO"}
              </h2>
            </div>

            {/* DATOS DEL CLIENTE / VENDEDOR GANADOR */}
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                {winnerData?.tipoParticipante === "VENDEDOR" ? "Vendedor Ganador:" : (winnerData?.tipoParticipante === "TIENDA" ? "Tienda Ganadora:" : "Cliente Ganador:")}
              </p>

              <h3 className="text-2xl font-black text-white">{winnerData?.clienteNombre}</h3>
              <p className="text-sm font-mono text-slate-300">C.I.: {winnerData?.clienteCi} · Cel: {winnerData?.clienteCelular}</p>
            </div>

            {/* FICHA TÉCNICA DEL PREMIO Y COMPRA */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1 border-b border-white/5">
                <span className="text-slate-400">Premio Adjudicado:</span>
                <span className="font-bold text-emerald-400 text-sm">{winnerData?.premio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Televisor Registrado:</span>
                <span className="text-white font-medium">{winnerData?.productoModelo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Número de Serie / TAG:</span>
                <span className="font-mono text-amber-300">{winnerData?.serial}</span>
              </div>
            </div>

            {/* BOTÓN WHATSAPP DIRECTO AL GANADOR */}
            {winnerData?.clienteCelular && (
              <a
                href={`https://wa.me/591${winnerData.clienteCelular.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `🎉 ¡Felicidades ${winnerData.clienteNombre}! Tu ticket ${winnerData.ticketCliente?.codigoTicket} ha sido premiado en el Sorteo Oficial Skyworth con: ${winnerData.premio}. ¡Nos pondremos en contacto contigo para coordinar la entrega!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                Notificar al Ganador por WhatsApp
              </a>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="flex-1 border-white/10 text-slate-300 hover:text-white rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Acta
            </Button>

            <Button
              onClick={() => setShowWinnerModal(false)}
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs tracking-wider"
            >
              <FileCheck className="w-4 h-4 mr-1.5" />
              Finalizar Sorteo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
