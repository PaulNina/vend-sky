import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2, RefreshCw, X, Image as ImageIcon } from "lucide-react";
import { ImageSourceModal } from "./ImageSourceModal";
import { formatBytes } from "@/lib/imageCompressor";

export interface ImageUploadBoxProps {
  title?: string;
  subtitle?: string;
  file: File | null;
  isCompressing?: boolean;
  onSelect: (f: File) => void;
  onRemove?: () => void;
  accept?: string;
  placeholder?: string;
  subPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function ImageUploadBox({
  title,
  subtitle,
  file,
  isCompressing = false,
  onSelect,
  onRemove,
  accept = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp",
  placeholder = "Tocar para tomar o subir foto",
  subPlaceholder = "Múltiples formatos: JPG, PNG, WebP o iPhone HEIC",
  className = "",
  disabled = false,
  compact = false,
}: ImageUploadBoxProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleCardClick = () => {
    if (disabled || isCompressing) return;
    setModalOpen(true);
  };

  return (
    <div
      className={`p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col justify-between space-y-2 transition-all ${
        file ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)]" : ""
      } ${className}`}
    >
      {title && (
        <div>
          <Label className="text-xs font-semibold text-slate-200">{title}</Label>
          {subtitle && (
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      )}

      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className={`mt-2 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl cursor-pointer transition-all py-3.5 px-2 min-h-[96px] text-center select-none ${
          isCompressing
            ? "border-amber-400/60 bg-amber-500/10 animate-pulse cursor-wait"
            : file
            ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:bg-emerald-500/15"
            : "border-white/15 bg-slate-900/40 hover:border-amber-400/40 hover:bg-white/5 active:scale-[0.99]"
        }`}
      >
        {isCompressing ? (
          <>
            <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
            <span className="text-[11px] text-amber-300 font-medium">Optimizando foto...</span>
            <span className="text-[9px] text-amber-400/70">Comprimiendo y convirtiendo formato</span>
          </>
        ) : file ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <span className="text-[11px] text-emerald-300 font-semibold truncate max-w-[220px] px-2">
              {file.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/40">
                ✓ {formatBytes(file.size)} (Optimizada)
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-2 pt-1 border-t border-emerald-500/20 w-full justify-center">
              <span className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-medium bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-white/10 transition-colors">
                <RefreshCw className="w-3 h-3 text-amber-400" />
                Cambiar foto
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="text-[10px] text-rose-300 hover:text-rose-200 flex items-center gap-1 font-medium bg-rose-950/60 hover:bg-rose-900/80 px-2 py-1 rounded-lg border border-rose-500/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Quitar
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Camera className="h-6 w-6 text-slate-400" />
              <div className="absolute -bottom-1 -right-2 bg-amber-500/20 text-amber-400 rounded-full p-0.5">
                <ImageIcon className="w-2.5 h-2.5" />
              </div>
            </div>
            <span className="text-[11px] text-slate-200 font-medium">
              {placeholder}
            </span>
            <span className="text-[9px] text-slate-400">
              {subPlaceholder}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[9px] font-semibold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                📸 Cámara
              </span>
              <span className="text-[9px] text-slate-500">o</span>
              <span className="text-[9px] font-semibold text-cyan-400/90 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                🖼️ Galería
              </span>
            </div>
          </>
        )}
      </div>

      <ImageSourceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={title ? `Cargar: ${title.replace(/\s*\*$/, "")}` : "Cargar Fotografía"}
        subtitle={subtitle || "Elige si deseas capturar una foto con tu cámara o subirla desde la galería."}
        onSelect={onSelect}
        accept={accept}
      />
    </div>
  );
}
