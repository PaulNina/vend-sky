import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPostForm } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Package, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { useGlobalConfig } from "@/hooks/useGlobalConfig";
interface Product {
  id: number;
  nombre: string;
  modelo?: string | null;
  modeloCodigo?: string | null;
  tamanoPulgadas?: number | null;
  pulgadas?: number | null;
  multiplicadorCupones?: number | null;
  puntos?: number | null;
  bonoBs?: number | null;
}

interface Campaign {
  id: number;
  nombre: string;
}

// Backend responde en español: valido, mensaje, modelo, producto, estado, productoId
interface ValidacionSerial {
  valido: boolean;
  mensaje: string;
  productoId?: number | null;  // FK directo al producto
  modelo?: string;             // ej: "Q6600H"
  producto?: string;           // ej: "Skyworth QLED Pro Q6 65\""
  estado?: string;             // "DISPONIBLE" | "USADO" | "BLOQUEADO" | "NO_ENCONTRADO"
  totalPuntos?: number;
  totalBonoBs?: number;
  cantCampanas?: number;
  campanas?: Array<{campanaId: number, campanaNombre: string, puntos: number, bonoBs: number}>;
  fechaRegistroVendedor?: string | null;
}

export default function RegisterSalePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cityNames: CITIES } = useCities();
  const { ventaFechaMaxSemanas } = useGlobalConfig();

  const [serial, setSerial] = useState("");
  const [serialStatus, setSerialStatus] = useState<"idle" | "loading" | "valido" | "invalido">("idle");
  const [serialMsg, setSerialMsg] = useState("");
  const [serialInfo, setSerialInfo] = useState<ValidacionSerial | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [saleDate, setSaleDate] = useState("");
  const [tagFile, setTagFile] = useState<File | null>(null);
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<Product[]>("/products/active").then(setProducts).catch(() => {});
    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
    setSaleDate(today);
  }, []);

  const getWeekRange = () => {
    const now = new Date();
    // Monday of the current week
    const monday = new Date(now);
    const day = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    // Subtract configured weeks
    if (ventaFechaMaxSemanas > 0) {
      monday.setDate(monday.getDate() - (ventaFechaMaxSemanas * 7));
    }
    
    const minDate = monday.toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
    const maxDate = now.toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
    return { minDate, maxDate };
  };

  const { minDate, maxDate } = getWeekRange();

  const validarSerial = async () => {
    if (!serial.trim()) return;
    setSerialStatus("loading");
    setSerialMsg("");
    setSerialInfo(null);
    try {
      const data = await apiGet<ValidacionSerial>(
        `/serials/${encodeURIComponent(serial.trim())}/validate`,
      );

      if (data.valido) {
        setSerialStatus("valido");
        setSerialMsg(data.mensaje || "Serial válido");
      } else {
        setSerialStatus("invalido");
        setSerialMsg(data.mensaje || "Serial no válido");
      }

      setSerialInfo(data);

      if (data.productoId) {
        setSelectedProduct(String(data.productoId));
      } else if (data.modelo) {
        const m = data.modelo.toLowerCase();
        const encontrado = products.find(
          (p) =>
            p.modelo?.toLowerCase() === m ||
            p.modeloCodigo?.toLowerCase() === m,
        );
        if (encontrado) setSelectedProduct(String(encontrado.id));
      }
    } catch (e: unknown) {
      setSerialStatus("invalido");
      setSerialMsg(e instanceof Error ? e.message : "Error al validar");
    }
  };

  const compressImage = async (file: File): Promise<File | Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          // Max dimension 1600px
          const MAX_DIM = 1600;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Return original if blob is somehow larger (rare)
                resolve(blob.size < file.size ? new File([blob], file.name, { type: "image/jpeg" }) : file);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.75 // 75% quality
          );
        };
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { toast({ title: "Selecciona un producto", variant: "destructive" }); return; }
    if (!tagFile || !policyFile || !invoiceFile) {
      toast({ title: "Adjunta las 3 fotos (TAG, Póliza, Nota)", variant: "destructive" }); return;
    }
    
    // Check original size just in case, though we will compress
    const totalSize = (tagFile?.size || 0) + (policyFile?.size || 0) + (invoiceFile?.size || 0);
    const MAX_SIZE = 30 * 1024 * 1024; // 30MB
    if (totalSize > MAX_SIZE) {
      toast({ 
        title: "Archivos demasiado grandes", 
        description: `El tamaño total (${(totalSize / (1024 * 1024)).toFixed(2)}MB) excede el límite de 30MB. Por favor, use imágenes más pequeñas o reduzca su calidad.`, 
        variant: "destructive" 
      }); 
      return; 
    }

    if (serialStatus !== "valido") {
      toast({ title: "Valida el serial primero", variant: "destructive" }); return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("serial", serial.trim());
      form.append("productoId", selectedProduct);
      form.append("saleDate", saleDate);

      // Compress images before sending
      const compressedTag = await compressImage(tagFile);
      const compressedPolicy = await compressImage(policyFile);
      const compressedInvoice = await compressImage(invoiceFile);

      form.append("fotoTag", compressedTag);
      form.append("fotoPoliza", compressedPolicy);
      form.append("fotoNota", compressedInvoice);

      await apiPostForm("/sales", form);
      toast({ title: "✓ Venta registrada correctamente" });
      navigate("/v/mis-ventas");
    } catch (error: unknown) {
      toast({
        title: "Error al registrar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const FileInput = ({
    label,
    file,
    onChange,
    accept = "image/*",
  }: {
    label: string;
    file: File | null;
    onChange: (f: File) => void;
    accept?: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <label className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl cursor-pointer transition-all py-4 ${file ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"}`}>
        <input type="file" className="sr-only" accept={accept} onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
        {file ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-[10px] text-success font-medium truncate max-w-[100px]">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Subir foto</span>
          </>
        )}
      </label>
    </div>
  );

  const selectedProductObj = products.find((p) => String(p.id) === selectedProduct);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
          <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Registrar Venta
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Serial */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Serial del Producto</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={serial}
                onChange={(e) => { setSerial(e.target.value); setSerialStatus("idle"); setSerialInfo(null); }}
                placeholder="Ingresa el número de serie..."
                className="font-mono"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), validarSerial())}
              />
              <Button type="button" variant="outline" onClick={validarSerial} disabled={serialStatus === "loading" || !serial.trim()}>
                {serialStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
              </Button>
            </div>
            {serialMsg && (
              <div className="space-y-1">
                <p className={`text-xs flex items-center gap-1 ${serialStatus === "valido" ? "text-success" : "text-destructive"}`}>
                  {serialStatus === "valido" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {serialMsg}
                  {serialInfo?.producto && <span className="text-muted-foreground ml-1">— {serialInfo.producto}</span>}
                </p>
                {serialStatus === "invalido" && serialInfo?.fechaRegistroVendedor && (
                  <p className="text-[10px] text-muted-foreground ml-4">
                    Registrado el: {new Date(serialInfo.fechaRegistroVendedor).toLocaleString("es-BO", { 
                      day: "2-digit", 
                      month: "2-digit", 
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Producto (auto-detectado del serial) + Fecha + Ciudad */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Datos de la Venta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              {serialInfo ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-sm font-medium flex flex-col gap-2">
                  {serialInfo.producto ? (
                    <span className="text-base">{serialInfo.producto} {serialInfo.modelo ? `— ${serialInfo.modelo}` : ''}</span>
                  ) : selectedProductObj ? (
                    <span className="text-base opacity-90">{selectedProductObj.nombre} — {selectedProductObj.modelo || selectedProductObj.modeloCodigo || serialInfo.modelo}</span>
                  ) : (
                    <span className="text-base opacity-90">Producto de código: {serialInfo.modelo}</span>
                  )}
                  
                  {(serialInfo.campanas && serialInfo.campanas.length > 0) ? (
                    <div className="flex flex-col gap-2 mt-1">
                       <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Participando en las campañas:</span>
                       <div className="flex flex-col gap-2">
                         {serialInfo.campanas.map(c => (
                           <div key={c.campanaId} className="text-sm font-bold text-primary bg-primary/10 px-3 py-2 rounded-md border border-primary/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 align-start">
                             <div className="flex items-start gap-1.5 break-words max-w-full">
                               <span className="shrink-0 leading-tight">⭐</span>
                               <span className="leading-tight">{c.campanaNombre}</span>
                             </div>
                             <div className="flex items-center gap-2 text-foreground bg-background/60 px-2 py-1.5 rounded-md whitespace-nowrap self-start sm:self-auto shrink-0 shadow-sm border border-black/5 dark:border-white/5">
                               <span>{c.puntos} pts</span>
                               <span className="text-muted-foreground/50">|</span>
                               <span>Bs {c.bonoBs}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  ) : (
                    <span className="text-sm text-destructive font-medium bg-destructive/10 px-2 py-1 rounded inline-block w-fit mt-1">
                      Este producto no forma parte de ninguna campaña activa actualmente.
                    </span>
                  )}
                </div>
              ) : (
                <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
                  <SelectTrigger><SelectValue placeholder="Valida el serial para autocompletar..." /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre} {(p.tamanoPulgadas ?? p.pulgadas) ? `${p.tamanoPulgadas ?? p.pulgadas}"` : ""} — {p.modelo ?? p.modeloCodigo ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Fecha de venta</Label>
                <Input 
                  type="date" 
                  value={saleDate} 
                  onChange={(e) => setSaleDate(e.target.value)} 
                  required 
                  min={minDate}
                  max={maxDate} 
                />
                <p className="text-[10px] text-muted-foreground italic">
                  * {ventaFechaMaxSemanas === 0 
                      ? "Solo puedes registrar ventas de la semana actual" 
                      : `Puedes registrar hasta ${ventaFechaMaxSemanas + 1} semanas atrás`} (desde el lunes {minDate.split('-').reverse().join('/')}).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Fotos de Respaldo</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FileInput label="Foto TAG *" file={tagFile} onChange={setTagFile} />
              <FileInput label="Foto Póliza *" file={policyFile} onChange={setPolicyFile} />
              <FileInput label="Nota de entrega *" file={invoiceFile} onChange={setInvoiceFile} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" variant="premium" size="lg" disabled={submitting || serialStatus !== "valido"}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Confirmar Venta
        </Button>
      </form>
    </div>
  );
}
