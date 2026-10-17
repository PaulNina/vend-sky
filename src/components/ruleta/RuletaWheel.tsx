import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PremioItem {
  premioId: number;
  nombre: string;
  descripcion?: string;
  colorHex?: string;
  imagenUrl?: string;
  saldoDisponible?: number;
  esSinPremio?: boolean;
}

interface RuletaWheelProps {
  premios: PremioItem[];
  premioGanadorId?: number | null;
  isSpinning: boolean;
  onSpinRequest: () => void;
  onSpinComplete: (premio: PremioItem) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  clienteNombre?: string;
  clienteCi?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  sigaParticipandoHabilitado?: boolean;
}

// Sonidos sintéticos con Web Audio API (cero dependencias de mp3 externos)
function playTickSound(audioCtx: AudioContext | null) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(820, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch (e: unknown) {
    console.debug("Tick error:", e);
  }
}

function playWinFanfare(audioCtx: AudioContext | null) {
  if (!audioCtx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      const start = audioCtx.currentTime + idx * 0.09;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (e: unknown) {
    console.debug("Fanfare error:", e);
  }
}

// Gráficos vectoriales fotorrealistas de alta fidelidad para premios Skyworth
function renderPrizeIcon(nombre: string, imagenUrl?: string) {
  if (imagenUrl) {
    return (
      <image
        href={imagenUrl}
        x="176"
        y="65"
        width="48"
        height="44"
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  const n = (nombre || "").toLowerCase();

  // 0. SIGA PARTICIPANDO (Boleto Oficial de la Gran Rifa Skyworth)
  if (n.includes("siga") || n.includes("participando") || n.includes("suerte") || n.includes("intenta")) {
    return (
      <g transform="translate(176, 68) scale(0.95)">
        {/* Ticket Dorado Sorteo */}
        <rect x="4" y="8" width="42" height="26" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        <path d="M 4 21 A 3 3 0 0 1 4 15 L 4 8 L 46 8 L 46 15 A 3 3 0 0 1 46 21 L 46 34 L 4 34 Z" fill="#1e293b" stroke="#facc15" strokeWidth="1" />
        <circle cx="25" cy="21" r="5" fill="#facc15" opacity="0.25" />
        {/* Estrella de la suerte */}
        <path d="M 25 15 L 26.5 19.5 L 31 21 L 26.5 22.5 L 25 27 L 23.5 22.5 L 19 21 L 23.5 19.5 Z" fill="#facc15" />
        <text x="25" y="13" fill="#38bdf8" fontSize="3.2" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">SORTEO</text>
        <text x="25" y="32" fill="#e2e8f0" fontSize="2.8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">100K BS</text>
      </g>
    );
  }

  // 1. GAMEPAD (Mando / Controlador gamer)
  if (n.includes("gamepad") || n.includes("mando") || n.includes("control") || n.includes("joystick")) {
    return (
      <g transform="translate(176, 68) scale(0.95)">
        {/* Cuerpo del mando */}
        <path
          d="M 6 18 C 6 8, 14 4, 25 4 C 36 4, 44 8, 44 18 C 45 28, 41 36, 37 36 C 33 36, 31 29, 29 27 C 27 25, 23 25, 21 27 C 19 29, 17 36, 13 36 C 9 36, 5 28, 6 18 Z"
          fill="#1e293b"
          stroke="#0f172a"
          strokeWidth="1.2"
        />
        {/* Luz LED central Skyworth */}
        <rect x="22" y="7" width="6" height="3" rx="1.5" fill="#38bdf8" opacity="0.9" />
        {/* D-Pad izquierdo */}
        <path d="M 12 14 h 4 v 4 h -4 z" fill="#475569" />
        <path d="M 10 16 h 8 v 0 h -8 z" stroke="#334155" strokeWidth="2" />
        {/* Botones de acción derecha */}
        <circle cx="36" cy="13" r="1.5" fill="#f43f5e" />
        <circle cx="39" cy="16" r="1.5" fill="#3b82f6" />
        <circle cx="33" cy="16" r="1.5" fill="#10b981" />
        <circle cx="36" cy="19" r="1.5" fill="#f59e0b" />
        {/* Thumbsticks análogos con relieve */}
        <circle cx="18" cy="24" r="4.2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
        <circle cx="18" cy="24" r="2.2" fill="#334155" />
        <circle cx="32" cy="24" r="4.2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
        <circle cx="32" cy="24" r="2.2" fill="#334155" />
      </g>
    );
  }

  // 2. GIFT CARD (Tarjeta de regalo VIP negra y dorada)
  if (n.includes("gift") || n.includes("tarjeta") || n.includes("card")) {
    return (
      <g transform="translate(176, 68) scale(0.95)">
        {/* Tarjeta de fondo inclinada / perspectiva */}
        <rect x="3" y="6" width="44" height="28" rx="3.5" fill="#0f172a" stroke="#d4af37" strokeWidth="1.2" />
        <rect x="6" y="9" width="38" height="22" rx="2" fill="#1e293b" />
        {/* Cinta de regalo azul brillante */}
        <path d="M 32 6 L 36 6 L 36 34 L 32 34 Z" fill="#2563eb" />
        <path d="M 3 20 L 47 20 L 47 23 L 3 23 Z" fill="#2563eb" />
        {/* Moño / Lazo */}
        <circle cx="34" cy="21.5" r="3" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="0.8" />
        {/* Logo / Texto Gift Card */}
        <text x="9" y="16" fill="#facc15" fontSize="3.8" fontWeight="bold" fontFamily="sans-serif">SKYWORTH</text>
        <text x="9" y="27" fill="#94a3b8" fontSize="2.8" fontFamily="sans-serif">GIFT CARD</text>
      </g>
    );
  }

  // 3. TERMO (Botella térmica de acero deportiva)
  if (n.includes("termo") || n.includes("botella") || n.includes("vaso") || n.includes("taza")) {
    return (
      <g transform="translate(182, 65) scale(0.95)">
        {/* Cuerpo del termo */}
        <rect x="12" y="8" width="13" height="30" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
        {/* Reflejo metálico vertical */}
        <path d="M 14 9 L 16 9 L 16 37 L 14 37 Z" fill="#ffffff" opacity="0.25" />
        {/* Cuello y tapa plateada */}
        <rect x="13.5" y="5" width="10" height="4" rx="1" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
        {/* Asa / Tapa deportiva */}
        <path d="M 15 2 C 15 0.5, 22 0.5, 22 2 L 22 5 L 15 5 Z" fill="#0f172a" />
        {/* Detalle Texto Vertical Skyworth */}
        <text x="18" y="24" fill="#cbd5e1" fontSize="2.8" fontWeight="bold" textAnchor="middle" transform="rotate(-90, 18, 24)">SKYWORTH</text>
      </g>
    );
  }

  // 4. VALE HIPERMAXI (Vales de compra naranja oficial)
  if (n.includes("vale") || n.includes("hipermaxi") || n.includes("super") || n.includes("cupon") || n.includes("compra")) {
    return (
      <g transform="translate(176, 67) scale(0.95)">
        {/* Tarjeta trasera naranja oscuro */}
        <rect x="8" y="4" width="34" height="24" rx="3" fill="#c2410c" transform="rotate(-6, 25, 16)" />
        {/* Tarjeta delantera naranja brillante */}
        <rect x="6" y="8" width="36" height="24" rx="3" fill="#ea580c" stroke="#fed7aa" strokeWidth="0.8" />
        {/* Carrito de supermercado vector blanco */}
        <g transform="translate(18, 12) scale(0.65)" stroke="#ffffff" strokeWidth="1.5" fill="none">
          <path d="M 0 1 L 3 1 L 6 12 L 17 12 L 19 4 L 4 4" />
          <circle cx="7" cy="15" r="1.5" fill="#ffffff" />
          <circle cx="16" cy="15" r="1.5" fill="#ffffff" />
        </g>
        <text x="24" y="26" fill="#ffffff" fontSize="3.6" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">VALE</text>
      </g>
    );
  }

  // 5. TROFEO / PREMIO GENÉRICO POR DEFECTO
  return (
    <g transform="translate(181, 66) scale(0.95)">
      <path
        d="M 6 4 L 32 4 L 29 18 C 27 24, 21 27, 19 27 C 17 27, 11 24, 9 18 Z"
        fill="url(#goldFacetBase)"
        stroke="#854d0e"
        strokeWidth="1"
      />
      {/* Asas del trofeo */}
      <path d="M 6 8 C 1 8, 1 18, 10 18" fill="none" stroke="#eab308" strokeWidth="2" />
      <path d="M 32 8 C 37 8, 37 18, 28 18" fill="none" stroke="#eab308" strokeWidth="2" />
      {/* Base */}
      <rect x="14" y="27" width="10" height="5" fill="#ca8a04" />
      <rect x="11" y="32" width="16" height="4" rx="1" fill="#713f12" />
      <circle cx="19" cy="13" r="3.5" fill="#fef08a" />
    </g>
  );
}

export const RuletaWheel: React.FC<RuletaWheelProps> = ({
  premios,
  premioGanadorId,
  isSpinning,
  onSpinRequest,
  onSpinComplete,
  disabled = false,
  isSubmitting = false,
  clienteNombre,
  clienteCi,
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  sigaParticipandoHabilitado = false,
}) => {
  const controls = useAnimation();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rotationRef = useRef<number>(0);
  const [winnerAnnounced, setWinnerAnnounced] = useState<PremioItem | null>(null);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Normalización a gajos equilibrados (6 u 8 gajos) con distribución armónica de Siga Participando
  const displaySlices = useMemo(() => {
    const physical = premios.filter((p) => !p.esSinPremio);
    const virtualSiga: PremioItem = {
      premioId: -1,
      nombre: "¡Sigue participando!",
      descripcion: "Boleto Gran Sorteo Skyworth Bs 100.000",
      colorHex: "#1e293b",
      esSinPremio: true,
    };
    const sigaItem = sigaParticipandoHabilitado ? virtualSiga : premios.find((p) => p.esSinPremio);

    if (physical.length === 0 && !sigaItem) return [];

    // Si NO hay opción de Siga Participando activa en la campaña
    if (!sigaItem) {
      if (physical.length === 4) {
        return [...physical, ...physical].map((p, i) => ({ ...p, originalIndex: i % 4, sliceIndex: i }));
      }
      if (physical.length === 2) {
        return [...physical, ...physical, ...physical, ...physical].map((p, i) => ({ ...p, originalIndex: i % 2, sliceIndex: i }));
      }
      if (physical.length === 3) {
        return [...physical, ...physical].map((p, i) => ({ ...p, originalIndex: i % 3, sliceIndex: i }));
      }
      return physical.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
    }

    // SI HAY "Siga Participando":
    // Añadimos 1 o 2 campos de siga participando según la cantidad de items físicos del operador
    const n = physical.length;

    if (n === 0) {
      return Array.from({ length: 6 }).map((_, i) => ({ ...sigaItem, originalIndex: 0, sliceIndex: i }));
    }

    if (n === 1) {
      // 1 item físico (A): 4 A + 2 Siga Participando opuestos = 6 gajos [A, A, S, A, A, S]
      const [A] = physical;
      const list = [A, A, sigaItem, A, A, sigaItem];
      return list.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
    }

    if (n === 2) {
      // 2 items físicos (A, B): 8 gajos con 2 Siga Participando opuestos (25% visual):
      // [A, B, A, S, B, A, B, S]
      const [A, B] = physical;
      const list = [A, B, A, sigaItem, B, A, B, sigaItem];
      return list.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
    }

    if (n === 3) {
      // 3 items físicos (A, B, C): 8 gajos con 2 Siga Participando opuestos (25% visual):
      // [A, B, C, S, A, B, C, S]
      const [A, B, C] = physical;
      const list = [A, B, C, sigaItem, A, B, C, sigaItem];
      return list.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
    }

    if (n === 4) {
      // 4 items físicos (A, B, C, D): 6 gajos con 2 Siga Participando:
      // [A, B, S, C, D, S]
      const [A, B, C, D] = physical;
      const list = [A, B, sigaItem, C, D, sigaItem];
      return list.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
    }

    if (n === 5) {
      // 5 items físicos: 6 gajos con 1 Siga Participando:
      // [A, B, C, S, D, E]
      const [A, B, C, D, E] = physical;
      const list = [A, B, C, sigaItem, D, E];
      return list.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
    }

    if (n === 6) {
      // 6 items físicos: 8 gajos con 2 Siga Participando:
      // [A, B, C, S, D, E, F, S]
      const [A, B, C, D, E, F] = physical;
      const list = [A, B, C, sigaItem, D, E, F, sigaItem];
      return list.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
    }

    // 7 o más ítems: intercalar 1 o 2 según sea par/impar
    const list = [
      ...physical.slice(0, 3),
      sigaItem,
      ...physical.slice(3, 6),
      ...(physical.length > 6 ? [sigaItem, ...physical.slice(6)] : []),
    ];
    return list.map((p, i) => ({ ...p, originalIndex: i, sliceIndex: i }));
  }, [premios, sigaParticipandoHabilitado]);

  const totalSlices = Math.max(1, displaySlices.length);
  const sliceAngle = 360 / totalSlices;

  // Animación física del giro
  useEffect(() => {
    if (isSpinning && premioGanadorId != null) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }

      // Encontrar los gajos que corresponden al premio ganador
      const matchingSlices = displaySlices.filter((s) => s.premioId === premioGanadorId);
      const chosenSlice =
        matchingSlices.length > 0
          ? matchingSlices[Math.floor(Math.random() * matchingSlices.length)]
          : displaySlices[0];

      const safeWinnerSliceIdx = chosenSlice ? chosenSlice.sliceIndex : 0;
      const originalPremio = premios.find((p) => p.premioId === premioGanadorId) || premios[0];

      // El puntero dorado está en la posición superior fija (12 en punto / 0 grados).
      // El gajo en safeWinnerSliceIdx tiene su centro en: midAngle = safeWinnerSliceIdx * sliceAngle + sliceAngle / 2.
      // Para que termine exactamente en 12 en punto (rotando en sentido horario):
      // rotacionFinal = girosExtra + (360 - midAngle)
      const targetSliceCenter = safeWinnerSliceIdx * sliceAngle + sliceAngle / 2;
      const extraSpins = 360 * 6; // 6 vueltas completas de suspenso
      const finalRotation = extraSpins + (360 - targetSliceCenter);

      // Reproducción rítmica de ticks de ruleta
      let tickCount = 0;
      const totalTicks = 32;
      const tickInterval = setInterval(() => {
        tickCount++;
        playTickSound(audioCtxRef.current);
        if (tickCount >= totalTicks) {
          clearInterval(tickInterval);
        }
      }, 150);

      controls
        .start({
          rotate: finalRotation,
          transition: {
            duration: 5.6,
            ease: [0.12, 0.92, 0.22, 1], // Deceleración gradual ultra suave
          },
        })
        .then(() => {
          clearInterval(tickInterval);
          rotationRef.current = finalRotation % 360;
          playWinFanfare(audioCtxRef.current);
          setWinnerAnnounced(originalPremio);
          onSpinComplete(originalPremio);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, premioGanadorId]);

  if (premios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-3xl border border-white/10 text-center">
        <Trophy className="w-12 h-12 text-slate-500 mb-3" />
        <p className="text-slate-200 font-bold text-base">No hay stock disponible de premios</p>
        <p className="text-slate-400 text-xs mt-1">El operador debe solicitar reposición de inventario al Administrador.</p>
      </div>
    );
  }

  // Dimensiones del arco del gajo (radio exterior 157)
  const arcRadius = 157;
  const sliceAngleRad = (sliceAngle * Math.PI) / 180;
  const arcEndX = 200 + arcRadius * Math.sin(sliceAngleRad);
  const arcEndY = 200 - arcRadius * Math.cos(sliceAngleRad);
  const slicePath = `M 200 200 L 200 ${200 - arcRadius} A ${arcRadius} ${arcRadius} 0 ${sliceAngle > 180 ? 1 : 0} 1 ${arcEndX} ${arcEndY} Z`;

  return (
    <div className="relative w-full h-[100dvh] flex flex-col justify-between items-center select-none overflow-hidden p-3 sm:p-5 bg-[#001038] text-white">
      {/* BARRA SUPERIOR OPERATIVA */}
      <div className="relative z-30 w-full flex items-center justify-between px-2 pt-1 pb-1 shrink-0">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            disabled={isSpinning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all active:scale-95 disabled:opacity-40"
            title="Volver al panel de bandeo"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-300" />
            <span>Volver</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/70 border border-cyan-400/40 text-[11px] font-black text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>RULETA OFICIAL SKYWORTH</span>
        </div>
      </div>

      {/* FONDO RADIAL SKYWORTH (Rayos de luz y destellos en azul cobalto vibrante) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradiente radial profundo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0e56cc_0%,_#052c7d_50%,_#021647_100%)]" />

        {/* Rayos de sol rotatorios sutiles */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-25">
          <svg viewBox="0 0 200 200" className="w-full h-full animate-[spin_80s_linear_infinite]">
            {Array.from({ length: 24 }).map((_, i) => (
              <polygon
                key={i}
                points="100,100 96,0 104,0"
                fill="#38bdf8"
                transform={`rotate(${i * 15}, 100, 100)`}
              />
            ))}
          </svg>
        </div>

        {/* Focos / Destellos de luz en las esquinas superiores */}
        <div className="absolute -top-10 -left-10 w-44 h-44 bg-cyan-400/25 rounded-full blur-3xl" />
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-400/25 rounded-full blur-3xl" />

        {/* Estrellas / Brillos flotantes */}
        <div className="absolute top-12 left-6 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
        <div className="absolute top-28 right-8 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9] animate-pulse" />
        <div className="absolute top-48 left-10 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-pulse" />
        <div className="absolute top-52 right-12 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-ping" />
      </div>

      {/* CABECERA OFICIAL 3D: "SOY 100% SKYWORTH" */}
      <div className="relative z-20 flex flex-col items-center text-center px-2 shrink-0">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-sm sm:text-base font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#fffbeb] via-[#fed867] to-[#9a6414] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            SOY
          </span>
          <span className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-[#fcd34d] to-[#854d0e] drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] -mt-0.5">
            100%
          </span>
          <span className="text-base sm:text-lg font-black tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
            SKYWORTH
          </span>
        </div>

        <div className="mt-0.5 px-3 py-0.5 rounded-full bg-blue-900/60 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
          <span className="text-[10px] sm:text-xs font-black tracking-wider text-white uppercase drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]">
            ¡CON SKYWORTH SIEMPRE GANAS!
          </span>
        </div>

        {clienteNombre && (
          <div className="mt-1 px-3 py-0.5 rounded-full bg-slate-900/70 border border-white/10 text-[11px] text-cyan-200/90 font-medium max-w-[90vw] truncate">
            Cliente: <span className="text-white font-bold">{clienteNombre}</span> {clienteCi ? `(CI: ${clienteCi})` : ""}
          </div>
        )}
      </div>

      {/* CONTENEDOR CENTRAL DE LA RULETA (Centrado automático en móviles) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto w-full min-h-0 shrink">
        {/* RUEDA PRINCIPAL (SVG VIEWBOX 400x400) */}
        <div className="relative w-[min(78vw,42vh,350px)] aspect-square drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)]">
          {/* DISCO GIRATORIO (Framer Motion) */}
          <motion.div
            className="w-full h-full"
            animate={controls}
            initial={{ rotate: 0 }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <defs>
                {/* Gradiente Bisel Oro 3D */}
                <linearGradient id="goldRimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fffbeb" />
                  <stop offset="25%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#ca8a04" />
                  <stop offset="75%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#854d0e" />
                </linearGradient>

                {/* Gradiente Separador de Oro */}
                <linearGradient id="goldDivider" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#713f12" />
                </linearGradient>

                {/* Gradiente Azul Sólido para Gajos Impares */}
                <linearGradient id="sliceBlueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1251bd" />
                  <stop offset="100%" stopColor="#08388d" />
                </linearGradient>

                {/* Gradiente Blanco Perla para Gajos Pares */}
                <linearGradient id="sliceWhiteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#edf2f7" />
                </linearGradient>

                {/* Gradiente Pizarra Metálico para Gajos de Siga Participando */}
                <linearGradient id="sliceSlateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0a1324" />
                </linearGradient>
              </defs>

              {/* GAJOS INTERIORES DE LA RULETA */}
              {displaySlices.map((premio, idx) => {
                const isEven = idx % 2 === 0;
                const isSiga = !!premio.esSinPremio || (premio.nombre || "").toLowerCase().includes("siga");
                const fillStyle = isSiga
                  ? "url(#sliceSlateGradient)"
                  : (isEven ? "url(#sliceBlueGradient)" : "url(#sliceWhiteGradient)");
                const textColor = isSiga ? "#fde047" : (isEven ? "#ffffff" : "#0c3f96");
                const midAngle = idx * sliceAngle + sliceAngle / 2;

                return (
                  <g key={idx}>
                    {/* Superficie del gajo rotada al ángulo inicial */}
                    <path
                      d={slicePath}
                      fill={fillStyle}
                      transform={`rotate(${idx * sliceAngle}, 200, 200)`}
                    />

                    {/* Línea divisoria dorada gruesa */}
                    <line
                      x1="200"
                      y1="200"
                      x2="200"
                      y2={200 - arcRadius}
                      stroke="url(#goldDivider)"
                      strokeWidth="2.2"
                      transform={`rotate(${idx * sliceAngle}, 200, 200)`}
                    />

                    {/* Contenido del Gajo: Ícono y Nombre (Rotado al centro del gajo) */}
                    <g transform={`rotate(${midAngle}, 200, 200)`}>
                      {/* Ícono vectorial o imagen del premio */}
                      {renderPrizeIcon(premio.nombre, premio.imagenUrl)}

                      {/* Texto del nombre del premio */}
                      <text
                        x="200"
                        y="134"
                        fill={textColor}
                        fontSize={totalSlices > 8 ? "6.5" : "7.5"}
                        fontWeight="900"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="tracking-tight"
                        style={{
                          textShadow: isEven ? "0 1px 2px rgba(0,0,0,0.8)" : "none",
                        }}
                      >
                        {premio.nombre.length > 13
                          ? premio.nombre.substring(0, 11).toUpperCase() + ".."
                          : premio.nombre.toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </motion.div>

          {/* MARCO EXTERIOR FIJO CON TACHAS DORADAS (No gira con la rueda) */}
          <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              {/* Gradiente Aro Azul Metálico Exterior */}
              <radialGradient id="outerBlueRing" cx="50%" cy="50%" r="50%">
                <stop offset="78%" stopColor="#08388d" />
                <stop offset="88%" stopColor="#155bd4" />
                <stop offset="94%" stopColor="#0a3c9b" />
                <stop offset="100%" stopColor="#041f5e" />
              </radialGradient>

              {/* Gradiente Fachadas Diamante Dorado */}
              <linearGradient id="goldFacetBase" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
              <linearGradient id="goldFacetTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#fde047" />
              </linearGradient>

              {/* Esfera Central 3D Oro */}
              <radialGradient id="goldSphere3D" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="20%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#eab308" />
                <stop offset="85%" stopColor="#854d0e" />
                <stop offset="100%" stopColor="#451a03" />
              </radialGradient>
            </defs>

            {/* Aro Azul Exterior Grueso con Relieve */}
            <path
              d="M 200 4 A 196 196 0 1 1 199.9 4 Z M 200 42 A 158 158 0 1 0 200.1 42 Z"
              fill="url(#outerBlueRing)"
              stroke="#0a3282"
              strokeWidth="2"
            />

            {/* Borde exterior fino oro */}
            <circle cx="200" cy="200" r="196" fill="none" stroke="#eab308" strokeWidth="1.5" />

            {/* Aro Dorado Metálico Separador */}
            <circle cx="200" cy="200" r="162" fill="none" stroke="url(#goldRimGradient)" strokeWidth="7" />
            <circle cx="200" cy="200" r="158" fill="none" stroke="#713f12" strokeWidth="1.2" />

            {/* 16 TACHAS / REMACHES DORADOS EN FORMA DE DIAMANTE PIRAMIDAL */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360) / 16;
              return (
                <g key={i} transform={`rotate(${angle}, 200, 200)`}>
                  {/* Rombo / Diamante 3D */}
                  <polygon
                    points="200,12 206,20 200,28 194,20"
                    fill="url(#goldFacetBase)"
                    stroke="#78350f"
                    strokeWidth="0.8"
                  />
                  <polygon points="200,12 206,20 200,20 194,20" fill="url(#goldFacetTop)" />
                  {/* Destello de brillo */}
                  <circle cx="200" cy="18" r="1.2" fill="#ffffff" opacity="0.9" />
                </g>
              );
            })}

            {/* FLECHA INDICADORA DORADA (Apuntando hacia ARRIBA desde el centro exacto) */}
            <g id="center-golden-pointer">
              {/* Tallo de la flecha */}
              <path
                d="M 197 190 L 197 122 L 203 122 L 203 190 Z"
                fill="url(#goldFacetBase)"
                stroke="#713f12"
                strokeWidth="0.6"
              />
              {/* Punta de flecha 3D apuntando hacia arriba */}
              <polygon
                points="200,106 213,126 200,121 187,126"
                fill="url(#goldFacetBase)"
                stroke="#713f12"
                strokeWidth="0.8"
              />
              {/* Faceta iluminada izquierda de la flecha */}
              <polygon points="200,106 200,121 187,126" fill="url(#goldFacetTop)" />
              {/* Sombra derecha */}
              <polygon points="200,106 213,126 200,121" fill="#ca8a04" opacity="0.6" />
            </g>

            {/* BUJE / DOMO CENTRAL DORADO ESFÉRICO 3D */}
            {/* Aro exterior del buje */}
            <circle cx="200" cy="200" r="32" fill="none" stroke="url(#goldRimGradient)" strokeWidth="4" />
            <circle cx="200" cy="200" r="28" fill="#713f12" />
            {/* Esfera 3D con reflejo especular */}
            <circle cx="200" cy="200" r="25" fill="url(#goldSphere3D)" stroke="#fef08a" strokeWidth="0.8" />
            <circle cx="193" cy="193" r="6" fill="#ffffff" opacity="0.35" />
          </svg>
        </div>

        {/* PEDESTAL / BASE AZUL METÁLICA */}
        <div className="relative w-24 sm:w-28 h-6 -mt-2 z-0 flex flex-col items-center shrink-0">
          <div className="w-12 h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-700 rounded-sm shadow-md" />
          <div className="w-16 h-5 bg-gradient-to-r from-[#021f59] via-[#1a62d6] to-[#021f59] rounded-b-xl border-x-2 border-b-2 border-blue-400/40 shadow-[0_8px_20px_rgba(0,0,0,0.8)] relative overflow-hidden flex items-center justify-center">
            <div className="w-4 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent blur-[1px]" />
          </div>
        </div>
      </div>

      {/* BOTÓN DE GIRO GIGANTE Y TÁCTIL (Fácil de pulsar en móvil) */}
      <div className="relative z-20 w-full max-w-[340px] flex flex-col items-center pb-2 pt-1 shrink-0">
        <Button
          size="lg"
          onClick={onSpinRequest}
          disabled={disabled || isSpinning}
          className="w-full h-13 sm:h-14 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_35px_rgba(245,158,11,0.6)] active:scale-95 transition-all cursor-pointer border-2 border-yellow-200/80 uppercase whitespace-normal leading-tight text-center"
        >
          {isSpinning ? (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 shrink-0 animate-spin text-slate-950" />
              <span>¡GIRANDO LA RULETA!...</span>
            </span>
          ) : isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 shrink-0 animate-spin text-slate-950" />
              <span>PREPARANDO RULETA...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 shrink-0 animate-bounce text-slate-950" />
              <span>¡TOCA PARA GIRAR!</span>
            </span>
          )}
        </Button>

        <p className="text-[10px] sm:text-xs text-cyan-200/90 font-medium mt-1.5 text-center px-2 leading-tight">
          {premios.length} opciones en juego · ¡Premio físico inmediato!
        </p>
      </div>

      {/* OVERLAY DE CELEBRACIÓN AL DETENERSE LA RULETA */}
      <AnimatePresence>
        {winnerAnnounced && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute inset-4 sm:inset-x-8 top-1/4 z-50 p-6 rounded-3xl bg-slate-950/95 border-2 ${
              winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                ? "border-cyan-400 shadow-[0_0_80px_rgba(34,211,238,0.85)]"
                : "border-amber-400 shadow-[0_0_80px_rgba(245,158,11,0.95)]"
            } text-center flex flex-col items-center justify-center backdrop-blur-2xl`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 animate-bounce ${
                winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                  ? "bg-cyan-400/20 text-cyan-400"
                  : "bg-amber-400/20 text-amber-400"
              }`}
            >
              {winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga") ? (
                <Sparkles className="w-9 h-9" />
              ) : (
                <Trophy className="w-9 h-9" />
              )}
            </div>
            <div
              className={`text-xs uppercase font-black tracking-widest ${
                winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                  ? "text-cyan-300"
                  : "text-amber-300"
              }`}
            >
              {winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                ? "¡SIGUE PARTICIPANDO!"
                : "¡FELICITACIONES!"}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1 leading-tight">
              {winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                ? "Gran Sorteo Skyworth"
                : winnerAnnounced.nombre}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">
              {winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                ? "¡Tu compra fue registrada con éxito! Ya estás participando por los premios mayores y el sorteo por Bs 100.000."
                : winnerAnnounced.descripcion}
            </p>
            <div
              className={`mt-4 flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border ${
                winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                  ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/30"
                  : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />{" "}
              {winnerAnnounced.esSinPremio || (winnerAnnounced.nombre || "").toLowerCase().includes("siga")
                ? "Registro confirmado para los sorteos quincenales"
                : "Preparando registro fotográfico..."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
