import React, { useState, useRef, useEffect, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ZoomIn, ZoomOut, RotateCw, Download, X, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvidenceViewerModalProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
  subtitle?: string;
  filename?: string;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  open,
  onClose,
  url,
  title = "Visualizador de Evidencia",
  subtitle,
  filename,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Reset al abrir o cambiar imagen
  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (open) {
      handleReset();
    }
  }, [open, url, handleReset]);

  // Teclas de acceso rápido
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.3, 6));
      else if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(z - 0.3, 0.5));
      else if (e.key === "r" || e.key === "R") setRotation((r) => (r + 90) % 360);
      else if (e.key === "0") handleReset();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, handleReset]);

  if (!url) return null;

  // Manejo de Mouse Drag (Pan libre sin trabas)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Manejo Táctil para móviles/tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rueda de ratón para zoom fluido
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.2, 6));
    } else {
      setZoom((z) => Math.max(z - 0.2, 0.5));
    }
  };

  // Descarga de archivo
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const downloadName = filename || `evidencia_${Date.now()}.jpg`;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay a nivel superior z-[100] */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Contenido en pantalla completa a nivel z-[110] */}
        <DialogPrimitive.Content
          className="fixed inset-0 z-[110] flex flex-col w-screen h-screen overflow-hidden bg-[#18181b]/95 outline-none select-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Barra Superior estilo Toolbar */}
          <header className="h-14 bg-[#2b2b2b] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shadow-xl z-30 shrink-0">
            {/* Título y descripción */}
            <div className="flex flex-col min-w-0 pr-4">
              <DialogPrimitive.Title className="text-white text-sm sm:text-base font-semibold truncate tracking-wide">
                {title}
              </DialogPrimitive.Title>
              {subtitle && (
                <DialogPrimitive.Description className="text-slate-400 text-[11px] sm:text-xs truncate">
                  {subtitle}
                </DialogPrimitive.Description>
              )}
            </div>

            {/* Botones de acción a la derecha */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Acercar */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZoom((z) => Math.min(z + 0.3, 6))}
                className="h-9 w-9 p-0 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Acercar (+)"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>

              {/* Alejar */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZoom((z) => Math.max(z - 0.3, 0.5))}
                disabled={zoom <= 0.5}
                className="h-9 w-9 p-0 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                title="Alejar (-)"
              >
                <ZoomOut className="w-5 h-5" />
              </Button>

              {/* Girar 90° */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="h-9 w-9 p-0 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Girar 90°"
              >
                <RotateCw className="w-5 h-5" />
              </Button>

              {/* Descargar */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-9 w-9 p-0 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Descargar archivo"
              >
                <Download className="w-5 h-5" />
              </Button>

              <div className="w-[1px] h-6 bg-white/15 mx-1" />

              {/* Cerrar */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0 text-slate-300 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </header>

          {/* Área Central de Visualización y Pan */}
          <main
            className="relative flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onDoubleClick={handleReset}
          >
            <img
              src={url}
              alt={title}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.12s ease-out",
                maxHeight: "85vh",
                maxWidth: "90vw",
                objectFit: "contain",
                userSelect: "none",
                pointerEvents: "none",
              }}
              className="drop-shadow-2xl select-none"
            />

            {/* Controles Flotantes Inferiores */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 text-xs text-slate-300 pointer-events-auto shadow-2xl">
              <span className="flex items-center gap-1 font-mono text-[11px] text-amber-400">
                <Move className="w-3.5 h-3.5" />
                Arrastra para mover
              </span>
              <span className="text-white/20">|</span>
              <span className="font-mono text-xs text-slate-200">
                {Math.round(zoom * 100)}%
              </span>
              {rotation > 0 && (
                <>
                  <span className="text-white/20">|</span>
                  <span className="font-mono text-xs text-slate-400">{rotation}°</span>
                </>
              )}
              {(zoom !== 1 || rotation !== 0 || pan.x !== 0 || pan.y !== 0) && (
                <>
                  <span className="text-white/20">|</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restablecer
                  </button>
                </>
              )}
            </div>
          </main>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
