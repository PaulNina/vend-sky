import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, XCircle, RotateCcw, ExternalLink } from "lucide-react";
import { motion, useMotionValue } from "framer-motion";

interface ImageViewerProps {
  url: string | null;
  onClose: () => void;
  title?: string;
  originalUrl?: string | null;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ url, onClose, title, originalUrl }) => {
  const [scale, setScale] = useState(1);
  const [dragConstraints, setDragConstraints] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Direct motion values — no springs so there's no lag/offset when dialog reopens
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Calculate how far the user can pan based on scale vs container size
  const updateConstraints = useCallback((currentScale: number) => {
    const img = imageRef.current;
    const con = containerRef.current;
    if (!img || !con) return;
    const scaledW = img.offsetWidth * currentScale;
    const scaledH = img.offsetHeight * currentScale;
    const maxX = Math.max(0, (scaledW - con.offsetWidth) / 2);
    const maxY = Math.max(0, (scaledH - con.offsetHeight) / 2);
    setDragConstraints({ top: -maxY, left: -maxX, right: maxX, bottom: maxY });
  }, []);

  const snapToCenter = useCallback(() => {
    // Instant snap — no spring animation carry-over
    x.set(0);
    y.set(0);
  }, [x, y]);

  const handleReset = useCallback(() => {
    setScale(1);
    snapToCenter();
    setDragConstraints({ top: 0, left: 0, right: 0, bottom: 0 });
  }, [snapToCenter]);

  // Reset everything when a new image URL is set
  useEffect(() => {
    handleReset();
  }, [url, handleReset]);

  // Recompute pan constraints whenever scale changes
  useEffect(() => {
    if (scale === 1) {
      snapToCenter();
      setDragConstraints({ top: 0, left: 0, right: 0, bottom: 0 });
    } else {
      updateConstraints(scale);
    }
  }, [scale, snapToCenter, updateConstraints]);

  const handleZoomIn  = () => setScale((p) => Math.min(p + 0.5, 4));
  const handleZoomOut = () => setScale((p) => Math.max(p - 0.5, 1));

  const handleOpenNewTab = () => {
    const target = originalUrl || url;
    if (target) window.open(target, "_blank");
  };

  const handleDownload = async () => {
    if (!url) return;
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `imagen_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Error downloading image", e);
    }
  };

  return (
    <Dialog open={!!url} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] h-[90vh] p-0 overflow-hidden bg-black/95 border-none shadow-2xl focus:outline-none flex flex-col items-center justify-center">

        {/* Top-left: title */}
        <div className="absolute top-4 left-4 z-50 pointer-events-none">
          {title && (
            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-white text-xs font-semibold uppercase tracking-wider">{title}</span>
            </div>
          )}
        </div>

        {/* Top-right: open & close buttons */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            size="sm" variant="ghost"
            onClick={handleOpenNewTab}
            className="h-9 w-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/10 border"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={onClose}
            className="h-9 w-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/10 border"
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Image container */}
        <div
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center touch-none"
          style={{ cursor: scale > 1 ? "grab" : "default" }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setScale((p) => Math.min(Math.max(p + (e.deltaY > 0 ? -0.2 : 0.2), 1), 4));
            }
          }}
        >
          {url && (
            <motion.img
              ref={imageRef}
              src={url}
              alt="Preview"
              drag={scale > 1}
              dragConstraints={dragConstraints}
              dragElastic={0}
              dragMomentum={false}
              onLoad={() => updateConstraints(scale)}
              style={{
                x,
                y,
                scale,
                maxHeight: "85vh",
                maxWidth: "100%",
                objectFit: "contain",
              }}
              draggable={false}
              className="select-none"
              whileDrag={{ cursor: "grabbing" }}
            />
          )}
        </div>

        {/* Bottom toolbar */}
        <div className="absolute bottom-6 flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 shadow-2xl z-50">
          <Button size="sm" variant="ghost" onClick={handleZoomOut} disabled={scale <= 1}
            className="text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full">
            <ZoomOut className="h-4 w-4" />
          </Button>

          <div className="w-[1px] h-6 bg-white/20 mx-1" />
          <span className="text-white text-xs font-mono font-bold px-2 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <div className="w-[1px] h-6 bg-white/20 mx-1" />

          <Button size="sm" variant="ghost" onClick={handleZoomIn} disabled={scale >= 4}
            className="text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="ghost" onClick={handleReset}
            className="text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full ml-1"
            title="Restablecer">
            <RotateCcw className="h-4 w-4" />
          </Button>

          <div className="w-[1px] h-6 bg-white/20 mx-1" />

          <Button size="sm" variant="ghost" onClick={handleDownload}
            className="text-white hover:bg-white/10 px-3 h-9 rounded-full gap-2 text-xs font-semibold">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Guardar</span>
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};
