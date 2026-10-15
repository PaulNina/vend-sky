import React, { useState, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiPostForm } from "@/lib/api";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  RefreshCw,
  Eye,
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import heic2any from "heic2any";
import { ImageSourceModal } from "@/components/common/ImageSourceModal";

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

interface WindowWithBarcodeDetector extends Window {
  BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorInstance;
}

interface BarcodeTagScannerProps {
  label: string;
  description?: string;
  file: File | null;
  serialValue: string;
  isManual: boolean;
  onFileChange: (file: File) => void;
  onSerialChange: (serial: string, isManual: boolean) => void;
}

export default function BarcodeTagScanner({
  label,
  description,
  file,
  serialValue,
  isManual,
  onFileChange,
  onSerialChange,
}: BarcodeTagScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editManual, setEditManual] = useState(isManual);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  const processImageFile = async (rawFile: File) => {
    setScanning(true);
    let selectedFile = rawFile;

    // Detectar si es HEIC / HEIF de iPhone y convertir a JPEG
    const isHeic = rawFile.type === "image/heic" || rawFile.type === "image/heif" || /\.(heic|heif)$/i.test(rawFile.name);
    if (isHeic) {
      try {
        const converted = await heic2any({ blob: rawFile, toType: "image/jpeg", quality: 0.85 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        selectedFile = new File([blob], rawFile.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
      } catch (err) {
        console.warn("No se pudo convertir HEIC, intentando procesar archivo original", err);
      }
    }

    onFileChange(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    try {
      // Helper function to try decode an HTMLImageElement or Canvas with BarcodeDetector or ZXing
      const tryClientDecode = async (source: HTMLImageElement | HTMLCanvasElement): Promise<string | null> => {
        const win = window as WindowWithBarcodeDetector;
        if (typeof win.BarcodeDetector === "function") {
          try {
            const barcodeDetector = new win.BarcodeDetector({
              formats: ["code_128", "code_39", "code_93", "ean_13", "ean_8", "qr_code", "data_matrix"]
            });
            const barcodes = await barcodeDetector.detect(source);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              return barcodes[0].rawValue.trim();
            }
          } catch (e) {
            // Ignore and fall through
          }
        }
        try {
          const codeReader = new BrowserMultiFormatReader();
          let srcUrl = "";
          if (source instanceof HTMLCanvasElement) {
            srcUrl = source.toDataURL("image/jpeg", 0.95);
          } else {
            srcUrl = source.src;
          }
          const result = await codeReader.decodeFromImageUrl(srcUrl);
          if (result && result.getText()) {
            return result.getText().trim();
          }
        } catch (e) {
          // Ignore
        }
        return null;
      };

      // 1. Load original image
      const img = new Image();
      img.src = objectUrl;
      await img.decode();

      // Pass 1: Try on full image directly
      let detectedSerial = await tryClientDecode(img);

      // Pass 2: Canvas scaled + rotations (0°, 90°, 180°, 270°)
      if (!detectedSerial) {
        const angles = [0, 90, 180, 270];
        const MAX_W = 1600;
        let origW = img.naturalWidth || img.width;
        let origH = img.naturalHeight || img.height;
        if (origW > MAX_W) {
          origH = Math.round((origH * MAX_W) / origW);
          origW = MAX_W;
        }

        for (const angle of angles) {
          const canvas = document.createElement("canvas");
          const isSideways = angle === 90 || angle === 270;
          canvas.width = isSideways ? origH : origW;
          canvas.height = isSideways ? origW : origH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
            detectedSerial = await tryClientDecode(canvas);
            if (detectedSerial) break;
          }
        }
      }

      // Pass 3: Center crop (phone photos usually have tag in center)
      if (!detectedSerial) {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const cropW = Math.round(w * 0.85);
        const cropH = Math.round(h * 0.70);
        const cropX = Math.round((w - cropW) / 2);
        const cropY = Math.round((h - cropH) / 2);
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          detectedSerial = await tryClientDecode(canvas);
        }
      }

      // Pass 4: Fallback to Backend Decoder
      if (!detectedSerial) {
        try {
          const form = new FormData();
          form.append("foto", selectedFile);
          const backendRes = await apiPostForm<{ success: boolean; serial?: string }>(
            "/admin/equipos-danados/decode-barcode",
            form
          );
          if (backendRes && backendRes.success && backendRes.serial) {
            detectedSerial = backendRes.serial.trim();
          }
        } catch (e) {
          console.debug("Backend barcode decode fallback error", e);
        }
      }

      if (detectedSerial) {
        onSerialChange(detectedSerial.toUpperCase(), false);
        setEditManual(false);
        toast({ title: `✓ Código detectado: ${detectedSerial.toUpperCase()}` });
      } else {
        setEditManual(true);
        toast({
          title: "Código no detectado automáticamente",
          description: "Por favor, escribe el número de serie manualmente. La foto quedará guardada como respaldo.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.warn("Error procesando código de barras", err);
      setEditManual(true);
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3 transition-all hover:border-white/20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-primary" />
            {label} <span className="text-destructive">*</span>
          </Label>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {file && (
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Foto cargada
          </Badge>
        )}
      </div>

      {/* Upload Box / Preview Area */}
      {!file ? (
        <div
          onClick={() => setSourceModalOpen(true)}
          className="border-2 border-dashed border-white/15 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-white/5 transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-white">Tomar foto o subir imagen del Tag</p>
            <p className="text-[10px] text-muted-foreground">El sistema extraerá el serial automáticamente</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 p-2.5 rounded-lg bg-black/40 border border-white/5">
          <div
            onClick={() => setShowPreviewModal(true)}
            className="relative w-20 h-20 rounded-md overflow-hidden bg-black/60 shrink-0 cursor-pointer group border border-white/10"
          >
            {previewUrl && (
              <img src={previewUrl} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Eye className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="flex-1 w-full space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-primary hover:text-primary hover:bg-primary/10 px-2"
                onClick={() => setSourceModalOpen(true)}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Cambiar foto
              </Button>
            </div>

            {scanning ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Escaneando código de barras...
              </div>
            ) : serialValue ? (
              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  {editManual ? (
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                      Ingreso Manual
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Detectado por OCR/Barras
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-400">Sin serial detectado. Ingrésalo abajo.</p>
            )}
          </div>
        </div>
      )}

      <ImageSourceModal
        open={sourceModalOpen}
        onOpenChange={setSourceModalOpen}
        title={`Cargar: ${label}`}
        subtitle="Captura una foto de la etiqueta con tu cámara o elígela de tu galería."
        onSelect={processImageFile}
      />

      {/* Serial Value Input */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-300">
            Número de Serie {label.includes("Caja") ? "de la Caja" : "del Televisor"}
          </Label>
          {file && !editManual && serialValue && (
            <button
              type="button"
              onClick={() => setEditManual(true)}
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 underline transition-colors"
            >
              <Pencil className="h-2.5 w-2.5" /> Corregir manualmente
            </button>
          )}
        </div>

        <Input
          value={serialValue}
          onChange={(e) => onSerialChange(e.target.value, true)}
          placeholder={file ? "Ej: 65Q6600H-240101928" : "Sube la foto para leer el serial..."}
          className={`font-mono text-sm uppercase tracking-wider ${
            serialValue
              ? "bg-black/40 border-primary/40 text-primary font-bold"
              : "bg-black/20 border-white/10 text-white"
          }`}
        />

        {editManual && file && (
          <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Serial ingresado/editado manualmente. La foto del tag respaldará el registro.
          </p>
        )}
      </div>

      {/* Modal Preview */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl glass-card border-white/10 p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-display text-white">{label}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-2">
            {previewUrl && (
              <img src={previewUrl} alt={label} className="max-h-[70vh] rounded-lg object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
