import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon } from "lucide-react";

export interface ImageSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  onSelect: (file: File) => void;
  accept?: string;
}

export function ImageSourceModal({
  open,
  onOpenChange,
  title = "Cargar Fotografía",
  subtitle = "¿Cómo deseas subir esta fotografía? Elige una opción:",
  onSelect,
  accept = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp",
}: ImageSourceModalProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelect(file);
      onOpenChange(false);
    }
    // Permite volver a seleccionar el mismo archivo si es necesario
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] sm:max-w-md p-5 sm:p-6 bg-slate-950/95 border border-white/10 text-white rounded-3xl backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="text-left space-y-1.5 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 leading-relaxed">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {/* Opción 1: Cámara en vivo */}
          <label className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 border-2 border-amber-500/30 hover:border-amber-400 hover:from-amber-500/25 transition-all cursor-pointer group active:scale-95 text-center shadow-lg shadow-amber-950/20">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
            />
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-2.5 text-amber-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.25)] border border-amber-500/30">
              <Camera className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Tomar Foto
            </span>
            <span className="text-[11px] text-amber-200/80 mt-0.5">
              Abrir cámara en vivo
            </span>
            <span className="text-[9px] text-amber-400/70 font-medium uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              Recomendado
            </span>
          </label>

          {/* Opción 2: Galería / Archivos */}
          <label className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-white/10 hover:border-white/30 hover:bg-slate-900 transition-all cursor-pointer group active:scale-95 text-center shadow-lg">
            <input
              type="file"
              accept={accept}
              className="sr-only"
              onChange={handleFileChange}
            />
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-2.5 text-slate-300 group-hover:scale-110 group-hover:text-white transition-all border border-white/10">
              <ImageIcon className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
              Abrir Galería
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Fotos o archivos guardados
            </span>
            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              Dispositivo
            </span>
          </label>
        </div>

        <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-10 border border-white/5"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
