import React, { useEffect, useRef } from "react";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorLight: string;
  colorMain: string;
  colorDark: string;
  badgeText: string;
  angle: number;
  vRot: number;
}

interface RealisticTombolaMachineProps {
  isDrawing: boolean;
  rollingCode: string;
  hasTickets: boolean;
  totalTickets: number;
}

const BALL_COLORS = [
  // Púrpura / Violeta
  { light: "#e9d5ff", main: "#a855f7", dark: "#581c87" },
  // Verde Esmeralda
  { light: "#a7f3d0", main: "#10b981", dark: "#064e3b" },
  // Rojo Rubí
  { light: "#fecdd3", main: "#f43f5e", dark: "#881337" },
  // Azul Cielo
  { light: "#bae6fd", main: "#0ea5e9", dark: "#0c4a6e" },
  // Blanco Plata
  { light: "#ffffff", main: "#cbd5e1", dark: "#475569" },
  // Ámbar Oro
  { light: "#fde68a", main: "#f59e0b", dark: "#78350f" },
  // Turquesa Menta
  { light: "#99f6e4", main: "#14b8a6", dark: "#134e4a" },
  // Naranja Intenso
  { light: "#fed7aa", main: "#f97316", dark: "#7c2d12" },
];

const BADGE_LABELS = ["CL...", "SK...", "TKT", "07", "77", "99", "24", "15", "88", "10", "55", "33"];

export const RealisticTombolaMachine: React.FC<RealisticTombolaMachineProps> = ({
  isDrawing,
  rollingCode,
  hasTickets,
  totalTickets,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Inicializar balotas con distribución realista
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = canvas.width;
    const center = size / 2;
    const outerR = size * 0.44; // Límite interior del tambor
    const innerR = size * 0.23; // Límite del buje central

    const ballCount = 34;
    const newBalls: Ball[] = [];

    for (let i = 0; i < ballCount; i++) {
      const colorScheme = BALL_COLORS[i % BALL_COLORS.length];
      const badgeText = BADGE_LABELS[i % BADGE_LABELS.length];
      
      // Ubicación inicial distribuida entre el anillo interior y exterior
      const angle = (i / ballCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = innerR + 18 + Math.random() * (outerR - innerR - 36);

      const x = center + Math.cos(angle) * dist;
      const y = center + Math.sin(angle) * dist;
      const radius = size * 0.038; // ~15px en 400px

      newBalls.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius,
        colorLight: colorScheme.light,
        colorMain: colorScheme.main,
        colorDark: colorScheme.dark,
        badgeText,
        angle: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.05,
      });
    }

    ballsRef.current = newBalls;
  }, []);

  // Bucle de física y renderizado a 60 FPS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const size = canvas.width;
      const center = size / 2;
      const outerR = size * 0.44;
      const innerR = size * 0.22;
      const balls = ballsRef.current;

      // Limpiar lienzo
      ctx.clearRect(0, 0, size, size);

      // 1. Fondo de cámara oscura
      const chamberGrad = ctx.createRadialGradient(center, center, innerR, center, center, outerR);
      chamberGrad.addColorStop(0, "#181a20");
      chamberGrad.addColorStop(0.65, "#101217");
      chamberGrad.addColorStop(1, "#090a0d");
      ctx.fillStyle = chamberGrad;
      ctx.beginPath();
      ctx.arc(center, center, outerR, 0, Math.PI * 2);
      ctx.fill();

      // 2. Líneas orbitales de guía (como en la foto de referencia)
      // Pista exterior punteada dorada
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, outerR * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(234, 179, 8, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.stroke();

      // Pista interior sutil
      ctx.beginPath();
      ctx.arc(center, center, outerR * 0.58, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.restore();

      // 3. Actualizar física de las balotas
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];

        // Vectores de fuerza
        const dx = b.x - center;
        const dy = b.y - center;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (isDrawing) {
          // MODO SORTEO ACTIVO: Turbulencia ciclónica violenta (vórtice tipo tómbola de aire)
          // Fuerza tangencial para hacerlas girar alrededor del centro
          const tangentX = -dy / dist;
          const tangentY = dx / dist;

          const spinSpeed = 9.5;
          b.vx += tangentX * 1.8 + (Math.random() - 0.5) * 4.2;
          b.vy += tangentY * 1.8 + (Math.random() - 0.5) * 4.2;

          // Fuerza radial centrífuga y fluctuaciones de soplador
          const radialPush = Math.sin(Date.now() * 0.015 + i) * 2.5;
          b.vx += (dx / dist) * radialPush;
          b.vy += (dy / dist) * radialPush;

          // Amortiguación de velocidad máxima
          const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (currentSpeed > spinSpeed) {
            b.vx = (b.vx / currentSpeed) * spinSpeed;
            b.vy = (b.vy / currentSpeed) * spinSpeed;
          }
          b.vRot = (Math.random() - 0.5) * 0.35;
        } else {
          // MODO REPOSO / ESPERA: Gravedad leve hacia abajo + suave flotación viva
          b.vy += 0.08; // Gravedad suave hacia abajo
          b.vx += (Math.random() - 0.5) * 0.05;
          b.vx *= 0.985;
          b.vy *= 0.985;
          b.vRot *= 0.95;
        }

        // Mover balota
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.vRot;

        // Colisión con la pared exterior del tambor (anillo exterior)
        const newDx = b.x - center;
        const newDy = b.y - center;
        const newDist = Math.sqrt(newDx * newDx + newDy * newDy);
        const maxDist = outerR - b.radius;

        if (newDist > maxDist) {
          const normalX = newDx / newDist;
          const normalY = newDy / newDist;
          b.x = center + normalX * maxDist;
          b.y = center + normalY * maxDist;

          // Reflejar velocidad con rebote elástico
          const dot = b.vx * normalX + b.vy * normalY;
          b.vx = (b.vx - 2 * dot * normalX) * 0.85;
          b.vy = (b.vy - 2 * dot * normalY) * 0.85;
        }

        // Colisión con el buje central
        const minDist = innerR + b.radius;
        if (newDist < minDist) {
          const normalX = newDx / newDist;
          const normalY = newDy / newDist;
          b.x = center + normalX * minDist;
          b.y = center + normalY * minDist;

          const dot = b.vx * normalX + b.vy * normalY;
          b.vx = (b.vx - 2 * dot * normalX) * 0.85;
          b.vy = (b.vy - 2 * dot * normalY) * 0.85;
        }

        // 4. Dibujar balota 3D realista
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        // Sombra de balota
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;

        // Esfera 3D con degradado radial
        const ballGrad = ctx.createRadialGradient(
          -b.radius * 0.35,
          -b.radius * 0.35,
          b.radius * 0.1,
          0,
          0,
          b.radius
        );
        ballGrad.addColorStop(0, b.colorLight);
        ballGrad.addColorStop(0.35, b.colorMain);
        ballGrad.addColorStop(1, b.colorDark);

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Limpiar sombra para los elementos interiores
        ctx.shadowColor = "transparent";

        // Círculo blanco central para el número/código (estilo bingo/lotería real)
        const badgeR = b.radius * 0.52;
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
        ctx.fill();

        // Borde fino del badge
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Texto del badge
        ctx.fillStyle = "#0f172a";
        ctx.font = `bold ${b.radius * 0.55}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.badgeText, 0, 0.5);

        // Brillo especular superior para dar sensación de esfera de acrílico/plástico brillante
        const specGrad = ctx.createRadialGradient(
          -b.radius * 0.35,
          -b.radius * 0.35,
          0,
          -b.radius * 0.35,
          -b.radius * 0.35,
          b.radius * 0.45
        );
        specGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
        specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = specGrad;
        ctx.beginPath();
        ctx.arc(-b.radius * 0.35, -b.radius * 0.35, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 5. Reflejo esférico de cúpula de vidrio (Gloss Dome Reflection)
      ctx.save();
      const glassGrad = ctx.createLinearGradient(
        center - outerR * 0.7,
        center - outerR * 0.8,
        center + outerR * 0.5,
        center + outerR * 0.5
      );
      glassGrad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
      glassGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.04)");
      glassGrad.addColorStop(0.5, "transparent");
      glassGrad.addColorStop(1, "transparent");

      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.arc(center, center, outerR - 2, Math.PI * 0.85, Math.PI * 1.85);
      ctx.lineTo(center, center);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isDrawing]);

  // Generar 16 pernos metálicos en círculo (con coordenadas exactas en viewBox 420x420)
  const rivets = Array.from({ length: 16 }).map((_, i) => {
    const angleRad = (i / 16) * Math.PI * 2;
    const r = 200; // Radio exacto al centro del bisel exterior
    const cx = 210 + Math.sin(angleRad) * r;
    const cy = 210 - Math.cos(angleRad) * r;
    return { id: i, cx, cy };
  });

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-4">
      {/* Resplandor ambiental rojo/borgoña de estudio fotográfico como en la imagen */}
      <div className="absolute w-[440px] h-[440px] sm:w-[540px] sm:h-[540px] rounded-full bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.25)_0%,rgba(150,15,25,0.12)_45%,transparent_70%)] pointer-events-none -z-10 blur-2xl" />

      {/* CHÁSIS PRINCIPAL: Contenedor con brazos laterales y base */}
      <div className="relative flex items-center justify-center">
        {/* Brazo de montaje lateral IZQUIERDO */}
        <div className="absolute -left-6 sm:-left-12 w-20 sm:w-32 h-36 sm:h-48 bg-gradient-to-r from-[#101217] via-[#1a1e26] to-[#282f3c] rounded-2xl border-l border-y border-slate-700/60 shadow-[0_15px_35px_rgba(0,0,0,0.9)] -z-10" />

        {/* Brazo de montaje lateral DERECHO */}
        <div className="absolute -right-6 sm:-right-12 w-20 sm:w-32 h-36 sm:h-48 bg-gradient-to-l from-[#101217] via-[#1a1e26] to-[#282f3c] rounded-2xl border-r border-y border-slate-700/60 shadow-[0_15px_35px_rgba(0,0,0,0.9)] -z-10" />

        {/* TAMBOR CIRCULAR METÁLICO CON REMACHES */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] rounded-full bg-[#14161b] p-3 shadow-[0_30px_70px_rgba(0,0,0,0.95)] flex items-center justify-center">
          {/* Aro exterior de titanio/grafito oscuro con bisel 3D */}
          <div className="absolute inset-0 rounded-full border-[10px] sm:border-[12px] border-[#22252e] ring-1 ring-white/10 shadow-[inset_0_3px_6px_rgba(255,255,255,0.25),inset_0_-4px_8px_rgba(0,0,0,0.85)] pointer-events-none z-30" />

          {/* SVG OVERLAY: Pernos / Remaches metálicos cromados 100% exactos */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-40"
            viewBox="0 0 420 420"
          >
            <defs>
              <radialGradient id="chromeRivet" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#cbd5e1" />
                <stop offset="70%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#1e293b" />
              </radialGradient>
              <filter id="rivetShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.8" />
              </filter>
            </defs>

            {rivets.map((r) => (
              <g key={r.id}>
                {/* Remache cromado exterior con sombra */}
                <circle
                  cx={r.cx}
                  cy={r.cy}
                  r="6.5"
                  fill="url(#chromeRivet)"
                  stroke="#1e293b"
                  strokeWidth="1"
                  filter="url(#rivetShadow)"
                />
                {/* Ranura/centro del perno */}
                <circle cx={r.cx} cy={r.cy} r="2" fill="#0f172a" />
                {/* Punto de brillo especular */}
                <circle cx={r.cx - 2} cy={r.cy - 2} r="1.5" fill="#ffffff" opacity="0.9" />
              </g>
            ))}
          </svg>

          {/* LIENZO CANVAS DE FÍSICA PARA LAS BALOTAS */}
          <canvas
            ref={canvasRef}
            width={420}
            height={420}
            className="w-full h-full rounded-full z-10 block"
          />

          {/* BUJE CENTRAL METÁLICO (HUB CENTRAL IDÉNTICO A LA FOTO) */}
          <div className="absolute z-30 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-[#242932] via-[#16181f] to-[#0c0d12] border-4 border-[#353c48] shadow-[0_0_35px_rgba(0,0,0,0.95),inset_0_2px_5px_rgba(255,255,255,0.2)] ring-1 ring-amber-400/40 flex flex-col items-center justify-center p-3 text-center">
            {/* Aro de acento dorado fino */}
            <div className="absolute inset-1.5 rounded-full border border-amber-400/30 pointer-events-none" />

            {/* MARCA EN ROJO (SKYWORTH) */}
            <span className="text-[#ef4444] font-black tracking-widest text-[11px] sm:text-xs uppercase drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              SKYWORTH
            </span>

            {/* TEXTO DE ESTADO INTERACTIVO IDÉNTICO A LA FOTO */}
            {isDrawing ? (
              <div className="flex flex-col items-center my-0.5">
                <span className="text-[#fde047] font-black text-xs sm:text-sm tracking-widest uppercase animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">
                  ESPERE
                </span>
                <span className="text-slate-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider leading-tight mt-0.5">
                  POR FAVOR<br />ESPERE
                </span>
              </div>
            ) : hasTickets ? (
              <div className="flex flex-col items-center my-0.5">
                <span className="text-[#fde047] font-extrabold text-[11px] sm:text-xs tracking-wider uppercase">
                  LISTO
                </span>
                <span className="text-slate-400 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider leading-tight mt-0.5">
                  POR FAVOR<br />GIRAR
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center my-0.5">
                <span className="text-slate-400 font-bold text-[10px] tracking-wider uppercase">
                  PADRÓN
                </span>
                <span className="text-slate-500 text-[8px] font-semibold uppercase tracking-wider">
                  VACÍO
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PEDESTAL / BASE INFERIOR CON LÍNEA NEÓN ROJA (COMO EN LA FOTO) */}
      <div className="relative -mt-6 sm:-mt-8 z-20 w-64 sm:w-84 h-14 sm:h-16 bg-gradient-to-b from-[#2c323f] via-[#191b22] to-[#0a0b0e] rounded-3xl border-t border-slate-500/40 shadow-[0_25px_50px_rgba(0,0,0,0.95)] flex flex-col items-center justify-end pb-3 px-6">
        {/* Barra de luz LED Neón Roja */}
        <div className="w-full h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 rounded-full shadow-[0_0_16px_#f43f5e,0_0_6px_#ef4444]" />
      </div>

      {/* DISPLAY DIGITAL DEL CÓDIGO RODANTE DE TICKET EN MESA DE SORTEO */}
      <div className="mt-5 w-full max-w-sm flex flex-col items-center">
        <div className="w-full bg-slate-950/95 border border-amber-500/40 rounded-2xl px-5 py-3 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col items-center">
          <span className="text-[10px] font-mono tracking-widest text-amber-400/90 uppercase font-bold">
            {isDrawing ? "¡SORTEANDO TICKET GANADOR!..." : "TICKET PARTICIPANTE ACTIVO"}
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-widest mt-0.5 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
            {rollingCode}
          </span>
        </div>
      </div>
    </div>
  );
};
