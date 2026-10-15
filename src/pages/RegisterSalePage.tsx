import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPostForm, apiPostFormWithProgress } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Loader2, Package, CheckCircle2, AlertCircle, Upload, Store, RefreshCw, UploadCloud } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { useGlobalConfig } from "@/hooks/useGlobalConfig";
import { compressImage, formatBytes } from "@/lib/imageCompressor";
import { ImageUploadBox } from "@/components/common/ImageUploadBox";
import { ProductSearchSelect } from "@/components/common/ProductSearchSelect";

interface MyStore {
  id: number;
  codigo?: string;
  nombre: string;
  canal?: string;
  ciudad?: {
    id: number;
    nombre: string;
    departamento?: string;
  };
}

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
  const [myStores, setMyStores] = useState<MyStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(true);
  const [tagFile, setTagFile] = useState<File | null>(null);
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado del modal interactivo de subida y reintento
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState<"uploading" | "processing" | "success" | "error">("uploading");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadDetailText, setUploadDetailText] = useState("");
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");

  useEffect(() => {
    apiGet<Product[]>("/products/active").then(setProducts).catch(() => {});
    apiGet<MyStore[]>("/tiendas/my-stores")
      .then((stores) => {
        setMyStores(stores);
        if (stores && stores.length > 0) {
          setSelectedStoreId(String(stores[0].id));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStores(false));

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

  const [compressingTag, setCompressingTag] = useState(false);
  const [compressingPolicy, setCompressingPolicy] = useState(false);
  const [compressingInvoice, setCompressingInvoice] = useState(false);

  const handlePhotoSelect = async (
    file: File,
    type: "tag" | "policy" | "invoice"
  ) => {
    if (!file) return;

    if (type === "tag") setCompressingTag(true);
    else if (type === "policy") setCompressingPolicy(true);
    else if (type === "invoice") setCompressingInvoice(true);

    try {
      const compressed = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.65,
      });

      if (type === "tag") setTagFile(compressed);
      else if (type === "policy") setPolicyFile(compressed);
      else if (type === "invoice") setInvoiceFile(compressed);
    } catch (err) {
      console.warn("Fallo al comprimir imagen, usando archivo original:", err);
      if (type === "tag") setTagFile(file);
      else if (type === "policy") setPolicyFile(file);
      else if (type === "invoice") setInvoiceFile(file);
    } finally {
      if (type === "tag") setCompressingTag(false);
      else if (type === "policy") setCompressingPolicy(false);
      else if (type === "invoice") setCompressingInvoice(false);
    }
  };

  const ejecutarEnvioVenta = async () => {
    if (!tagFile || !policyFile || !invoiceFile || !selectedProduct) return;

    setUploadModalOpen(true);
    setUploadState("uploading");
    setUploadPercent(0);
    setUploadDetailText("Preparando fotografías...");
    setUploadErrorMessage("");
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("serial", serial.trim());
      form.append("productoId", selectedProduct);
      form.append("saleDate", saleDate);
      if (selectedStoreId) {
        form.append("tiendaId", selectedStoreId);
      }

      // Las fotos ya se encuentran 100% optimizadas (< 400KB cada una)
      form.append("fotoTag", tagFile, tagFile.name.endsWith(".jpg") ? tagFile.name : "foto_tag.jpg");
      form.append("fotoPoliza", policyFile, policyFile.name.endsWith(".jpg") ? policyFile.name : "foto_poliza.jpg");
      form.append("fotoNota", invoiceFile, invoiceFile.name.endsWith(".jpg") ? invoiceFile.name : "foto_nota.jpg");

      await apiPostFormWithProgress("/sales", form, (prog) => {
        setUploadPercent(prog.percent);
        if (prog.percent < 100) {
          setUploadState("uploading");
          setUploadDetailText(`${formatBytes(prog.loaded)} de ${formatBytes(prog.total)} (${prog.percent}%)`);
        } else {
          setUploadState("processing");
          setUploadDetailText("Procesando venta en el servidor...");
        }
      });

      setUploadState("success");
      setUploadPercent(100);
      setUploadDetailText("¡Venta confirmada exitosamente!");
      toast({ title: "✓ Venta registrada correctamente" });

      setTimeout(() => {
        navigate("/v/mis-ventas");
      }, 1400);
    } catch (error: unknown) {
      setUploadState("error");
      let msg = error instanceof Error ? error.message : "Error desconocido al procesar la solicitud.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Error de red")) {
        msg = "Error de conexión o red inestable mientras se subían las fotografías. Por favor, verifica tu internet e inténtalo de nuevo.";
      } else if (msg.includes("proxy") || msg.includes("Session") || msg.includes("NullPointerException") || msg.includes("Hibernate")) {
        msg = "Inconveniente momentáneo en el servidor. Presiona 'Reintentar Subida' para enviar nuevamente sin perder tus datos.";
      }
      setUploadErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (compressingTag || compressingPolicy || compressingInvoice) {
      toast({
        title: "Optimizando fotografías",
        description: "Por favor espera un momento mientras se termina de optimizar la imagen.",
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        title: "Selecciona un producto",
        description: "Debes seleccionar el modelo de televisor que vendiste.",
        variant: "destructive",
      });
      return;
    }
    if (!tagFile || !policyFile || !invoiceFile) {
      toast({
        title: "Faltan fotografías obligatorias",
        description: "Debes adjuntar las 3 fotos de respaldo: Foto TAG, Póliza de garantía y Nota o factura de venta.",
        variant: "destructive",
      });
      return;
    }

    if (serialStatus !== "valido") {
      toast({
        title: "Número de serie no verificado",
        description: serialMsg || "Escribe el número de serie y presiona 'Verificar' antes de confirmar la venta.",
        variant: "destructive",
      });
      return;
    }

    ejecutarEnvioVenta();
  };

  const FileInput = ({
    label,
    file,
    isCompressing,
    onSelect,
    onRemove,
    accept = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp",
  }: {
    label: string;
    file: File | null;
    isCompressing: boolean;
    onSelect: (f: File) => void;
    onRemove?: () => void;
    accept?: string;
  }) => (
    <ImageUploadBox
      title={label}
      file={file}
      isCompressing={isCompressing}
      onSelect={onSelect}
      onRemove={onRemove}
      accept={accept}
    />
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
        <Card className="glass-card border-white/5 shadow-xl transition-all duration-300 hover:border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">Serial del Producto</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={serial}
                onChange={(e) => { setSerial(e.target.value.toUpperCase()); setSerialStatus("idle"); setSerialInfo(null); }}
                placeholder="Ingresa el número de serie..."
                className="font-mono uppercase glass-card border-white/10"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), validarSerial())}
              />
              <Button type="button" variant="outline" className="glass-card border-white/10 hover:bg-white/5" onClick={validarSerial} disabled={serialStatus === "loading" || !serial.trim()}>
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
        <Card className="glass-card border-white/5 shadow-xl transition-all duration-300 hover:border-primary/20">
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
                           <div key={c.campanaId} className="text-sm font-bold text-primary bg-primary/15 px-3 py-2 rounded-md border border-primary/25 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 align-start">
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
                <ProductSearchSelect
                  value={selectedProduct}
                  onChange={(val) => setSelectedProduct(val && val !== "none" ? val : "")}
                  productos={products}
                  placeholder="Buscar producto por modelo, nombre o pulgadas..."
                  allowEmpty={false}
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Selección de Tienda Asignada */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Store className="h-4 w-4 text-primary" /> Tienda / Punto de Venta *
                </Label>
                {loadingStores ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Cargando tiendas asignadas...
                  </div>
                ) : myStores.length > 0 ? (
                  <div className="space-y-2">
                    <Select value={selectedStoreId} onValueChange={setSelectedStoreId} required>
                      <SelectTrigger className="glass-card border-white/10 text-white">
                        <SelectValue placeholder="Selecciona la tienda..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white max-h-56">
                        {myStores.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="focus:bg-white/5 focus:text-white">
                            {s.nombre} {s.codigo ? `(${s.codigo})` : ""} {s.canal ? `· ${s.canal}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const curStore = myStores.find(s => String(s.id) === selectedStoreId);
                      if (!curStore) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {curStore.codigo && (
                            <Badge variant="outline" className="border-white/15 bg-white/5 font-mono text-[10px]">
                              {curStore.codigo}
                            </Badge>
                          )}
                          {curStore.canal && (
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px]">
                              Canal: {curStore.canal}
                            </Badge>
                          )}
                          {curStore.ciudad && (
                            <Badge variant="outline" className="border-white/10 text-muted-foreground bg-white/5 text-[10px]">
                              {curStore.ciudad.nombre} {curStore.ciudad.departamento ? `(${curStore.ciudad.departamento})` : ""}
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                    Tu cuenta registrará la venta con tu tienda habitual ({user?.tienda || "General"}).
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Fecha de venta</Label>
                <Input 
                  type="date" 
                  value={saleDate} 
                  onChange={(e) => setSaleDate(e.target.value)} 
                  required 
                  min={minDate}
                  max={maxDate}
                  className="glass-card border-white/10"
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
        <Card className="glass-card border-white/5 shadow-xl transition-all duration-300 hover:border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">Fotos de Respaldo</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FileInput
                label="Foto TAG *"
                file={tagFile}
                isCompressing={compressingTag}
                onSelect={(file) => handlePhotoSelect(file, "tag")}
                onRemove={() => setTagFile(null)}
              />
              <FileInput
                label="Foto Póliza *"
                file={policyFile}
                isCompressing={compressingPolicy}
                onSelect={(file) => handlePhotoSelect(file, "policy")}
                onRemove={() => setPolicyFile(null)}
              />
              <FileInput
                label="Nota de entrega *"
                file={invoiceFile}
                isCompressing={compressingInvoice}
                onSelect={(file) => handlePhotoSelect(file, "invoice")}
                onRemove={() => setInvoiceFile(null)}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" variant="premium" size="lg" disabled={submitting || serialStatus !== "valido"}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Confirmar Venta
        </Button>
      </form>

      {/* Modal de estado de subida y reintento */}
      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => {
          if (!open && (uploadState === "error" || uploadState === "success")) {
            setUploadModalOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold flex items-center justify-center gap-2">
              {uploadState === "uploading" && (
                <>
                  <UploadCloud className="h-5 w-5 text-primary animate-bounce" />
                  Subiendo Fotografías
                </>
              )}
              {uploadState === "processing" && (
                <>
                  <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                  Registrando Venta
                </>
              )}
              {uploadState === "success" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ¡Venta Confirmada!
                </>
              )}
              {uploadState === "error" && (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  No se pudo completar el registro
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              {uploadState === "uploading" && "Transfiriendo las fotos de respaldo optimizadas al servidor..."}
              {uploadState === "processing" && "Verificando serial y asignando tus puntos y bonos..."}
              {uploadState === "success" && "Tu venta ha sido registrada con éxito."}
              {uploadState === "error" && "Ocurrió un problema de conexión durante el envío."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Barra de progreso interactiva */}
            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>{uploadState === "processing" ? "Procesando en servidor..." : uploadDetailText}</span>
                  <span className="font-bold text-primary">{uploadPercent}%</span>
                </div>
                <Progress value={uploadPercent} className="h-3 bg-white/10" />
                <p className="text-[11px] text-center text-muted-foreground animate-pulse">
                  {uploadState === "processing"
                    ? "Asignando cupones y puntos a tu cuenta..."
                    : "Por favor no cierres esta ventana..."}
                </p>
              </div>
            )}

            {uploadState === "success" && (
              <div className="flex flex-col items-center justify-center py-3 space-y-2 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-emerald-300">¡Venta registrada con éxito!</p>
                <p className="text-xs text-muted-foreground">Redirigiendo a tu historial de ventas...</p>
              </div>
            )}

            {uploadState === "error" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5 text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Detalle del problema:
                  </p>
                  <p className="text-destructive-foreground/90 pl-5 break-words">{uploadErrorMessage}</p>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  💡 Tus datos y fotografías siguen guardados en el formulario. Puedes presionar <strong>Reintentar Subida</strong> para enviar nuevamente sin tener que volver a tomar las fotos.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            {uploadState === "error" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 text-xs"
                  onClick={() => setUploadModalOpen(false)}
                >
                  Revisar datos / Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary/90 text-xs font-semibold gap-1.5"
                  onClick={ejecutarEnvioVenta}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reintentar Subida
                </Button>
              </>
            )}
            {uploadState === "success" && (
              <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                onClick={() => navigate("/v/mis-ventas")}
              >
                Ir a Mis Ventas
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
