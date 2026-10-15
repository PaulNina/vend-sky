import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPostForm } from "@/lib/api";
import { useCities } from "@/hooks/useCities";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Upload,
  ArrowRight,
  RefreshCw,
  Building2,
  Tv,
  Image as ImageIcon,
  Loader2,
  Trash2,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import BarcodeTagScanner from "@/components/damaged/BarcodeTagScanner";
import AddFailureDialog from "@/components/damaged/AddFailureDialog";
import AddClientDialog, { CatalogoClienteItem } from "@/components/damaged/AddClientDialog";
import ClientSearchCombobox from "@/components/damaged/ClientSearchCombobox";
import ManageClientsDialog from "@/components/damaged/ManageClientsDialog";
import ManageFailuresDialog from "@/components/damaged/ManageFailuresDialog";
import { Settings, Users } from "lucide-react";
import heic2any from "heic2any";
import { ImageSourceModal } from "@/components/common/ImageSourceModal";

interface SerialLookupResult {
  encontrado: boolean;
  serial?: string;
  modelo?: string;
  pulgadas?: number;
  productoNombre?: string;
  productoId?: number;
  mensaje?: string;
  yaRegistradoDanado?: boolean;
}

interface CatalogoFallaItem {
  id: number;
  nombre: string;
  descripcion?: string;
}

export default function DamagedEquipmentRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cityNames: CITIES } = useCities();

  // Modales de administración
  const [showManageClientsModal, setShowManageClientsModal] = useState(false);
  const [showManageFailuresModal, setShowManageFailuresModal] = useState(false);

  // Cliente data (Header / Lote)
  const [clientes, setClientes] = useState<CatalogoClienteItem[]>([]);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [initialClientForModal, setInitialClientForModal] = useState("");
  const [clienteLoteId, setClienteLoteId] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [clienteConfirmado, setClienteConfirmado] = useState(false);

  // Equipos registrados en esta sesión/visita
  const [equiposRegistradosCount, setEquiposRegistradosCount] = useState(0);

  // Tags & Serials
  const [fotoTagCaja, setFotoTagCaja] = useState<File | null>(null);
  const [fotoTagTv, setFotoTagTv] = useState<File | null>(null);
  const [serialCaja, setSerialCaja] = useState("");
  const [serialTv, setSerialTv] = useState("");
  const [isManualCaja, setIsManualCaja] = useState(false);
  const [isManualTv, setIsManualTv] = useState(false);

  // Auto Product Info
  const [loadingProductInfo, setLoadingProductInfo] = useState(false);
  const [productInfo, setProductInfo] = useState<SerialLookupResult | null>(null);

  // Falla y Observaciones
  const [fallas, setFallas] = useState<CatalogoFallaItem[]>([]);
  const [selectedFalla, setSelectedFalla] = useState("");
  const [showAddFallaModal, setShowAddFallaModal] = useState(false);
  const [comentarios, setComentarios] = useState("");

  // Fotos de Daño (hasta 3)
  const [fotosFalla, setFotosFalla] = useState<File[]>([]);
  const [showFallaSourceModal, setShowFallaSourceModal] = useState(false);

  // Submitting and multi-equipment modal
  const [submitting, setSubmitting] = useState(false);
  const [showMultiDialog, setShowMultiDialog] = useState(false);

  // Load active failures and clients on mount
  useEffect(() => {
    loadFallas();
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      const data = await apiGet<CatalogoClienteItem[]>("/admin/equipos-danados/clientes");
      setClientes(data || []);
    } catch (e) {
      console.error("Error cargando catálogo de clientes", e);
    }
  };

  const loadFallas = async () => {
    try {
      const data = await apiGet<CatalogoFallaItem[]>("/admin/equipos-danados/fallas");
      setFallas(data || []);
    } catch (e) {
      console.error("Error cargando fallas", e);
    }
  };

  // Check matching serials (normalized without hyphens/spaces)
  const normCaja = serialCaja.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const normTv = serialTv.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  const serialsMatch =
    normCaja !== "" &&
    normTv !== "" &&
    normCaja === normTv;

  const serialsMismatch =
    normCaja !== "" &&
    normTv !== "" &&
    normCaja !== normTv;

  useEffect(() => {
    if (serialsMatch) {
      fetchSerialProductInfo(serialTv.trim());
    } else {
      setProductInfo(null);
    }
  }, [serialCaja, serialTv]);

  const fetchSerialProductInfo = async (serial: string) => {
    setLoadingProductInfo(true);
    try {
      const data = await apiGet<SerialLookupResult>(
        `/admin/equipos-danados/serial-info/${encodeURIComponent(serial)}`
      );
      setProductInfo(data);
    } catch (err) {
      console.error("Error consultando producto por serial", err);
    } finally {
      setLoadingProductInfo(false);
    }
  };

  // Image compressor helper — convierte HEIC/HEIF (iPhone) a JPEG y comprime
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const processBlob = (blob: Blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const MAX_DIM = 1200;
            if (width > height) {
              if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
            } else {
              if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (compressedBlob) => {
                if (compressedBlob && compressedBlob.size < blob.size) {
                  resolve(new File([compressedBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" }));
                } else {
                  resolve(new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" }));
                }
              },
              "image/jpeg",
              0.70
            );
          };
        };
      };

      // Detectar HEIC/HEIF (iPhone)
      const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
        /\.(heic|heif)$/i.test(file.name);

      if (isHeic) {
        heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })
          .then((converted) => {
            const blob = Array.isArray(converted) ? converted[0] : converted;
            processBlob(blob);
          })
          .catch(() => {
            // Si falla la conversión, intentar procesar el archivo original
            processBlob(file);
          });
      } else {
        processBlob(file);
      }
    });
  };

  // Add damage photo (up to 3)
  const handleAddFotoFalla = (file: File) => {
    if (fotosFalla.length >= 3) {
      toast({ title: "Máximo 3 fotografías de la falla permitidas", variant: "destructive" });
      return;
    }
    setFotosFalla((prev) => [...prev, file]);
  };

  const handleRemoveFotoFalla = (index: number) => {
    setFotosFalla((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim()) {
      toast({ title: "Ingresa el nombre o razón social del cliente", variant: "destructive" });
      return;
    }
    if (!ciudad) {
      toast({ title: "Selecciona una ciudad", variant: "destructive" });
      return;
    }
    // Convert client name to uppercase automatically
    setClienteNombre(clienteNombre.trim().toUpperCase());
    setClienteConfirmado(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fotoTagCaja || !fotoTagTv) {
      toast({
        title: "Fotografías obligatorias",
        description: "Debes subir la foto del tag de la caja y del televisor.",
        variant: "destructive",
      });
      return;
    }

    if (serialsMismatch) {
      toast({
        title: "Los seriales no coinciden",
        description: "El número de serie de la caja debe coincidir con el televisor para evitar posibles errores o fraudes.",
        variant: "destructive",
      });
      return;
    }

    if (!serialTv.trim()) {
      toast({ title: "Serial inválido o vacío", variant: "destructive" });
      return;
    }

    if (!selectedFalla) {
      toast({ title: "Selecciona el tipo de falla presentada", variant: "destructive" });
      return;
    }

    // Si la falla es OTROS, los comentarios son obligatorios
    if (selectedFalla.trim().toUpperCase() === "OTROS" && !comentarios.trim()) {
      toast({
        title: "Descripción obligatoria para falla \"OTROS\"",
        description: "Cuando seleccionas \"OTROS\" debes describir la falla en el campo de comentarios.",
        variant: "destructive",
      });
      return;
    }

    if (fotosFalla.length === 0) {
      toast({
        title: "Fotografía de falla obligatoria",
        description: "Debes adjuntar al menos 1 fotografía que demuestre la falla o daño del equipo.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      if (clienteLoteId) {
        form.append("registroClienteId", String(clienteLoteId));
      }
      form.append("clienteNombre", clienteNombre.trim().toUpperCase());
      form.append("ciudad", ciudad);
      form.append("serialCaja", serialCaja.trim().toUpperCase());
      form.append("serialTv", serialTv.trim().toUpperCase());
      form.append("serialIngresoManual", String(isManualCaja || isManualTv));
      form.append("serialValidado", serialTv.trim().toUpperCase());

      if (productInfo?.modelo) {
        form.append("modelo", productInfo.modelo);
      }
      if (productInfo?.pulgadas) {
        form.append("pulgadas", String(productInfo.pulgadas));
      }

      form.append("tipoFalla", selectedFalla);
      if (comentarios.trim()) {
        form.append("comentarios", comentarios.trim());
      }

      // Compress photos
      const compTagCaja = await compressImage(fotoTagCaja);
      const compTagTv = await compressImage(fotoTagTv);
      form.append("fotoTagCaja", compTagCaja);
      form.append("fotoTagTv", compTagTv);

      if (fotosFalla[0]) form.append("fotoFalla1", await compressImage(fotosFalla[0]));
      if (fotosFalla[1]) form.append("fotoFalla2", await compressImage(fotosFalla[1]));
      if (fotosFalla[2]) form.append("fotoFalla3", await compressImage(fotosFalla[2]));

      const res = await apiPostForm<{ id: number; registroCliente: { id: number } }>(
        "/admin/equipos-danados",
        form
      );

      toast({
        title: "✓ Equipo dañado registrado con éxito",
        description: `Serial: ${serialTv.trim().toUpperCase()}`,
      });

      if (res?.registroCliente?.id) {
        setClienteLoteId(res.registroCliente.id);
      }

      setEquiposRegistradosCount((prev) => prev + 1);
      setShowMultiDialog(true);
    } catch (err: unknown) {
      toast({
        title: "Error al registrar equipo",
        description: err instanceof Error ? err.message : "Error inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    // Reset equipment fields, keep client and city intact
    setFotoTagCaja(null);
    setFotoTagTv(null);
    setSerialCaja("");
    setSerialTv("");
    setIsManualCaja(false);
    setIsManualTv(false);
    setProductInfo(null);
    setSelectedFalla("");
    setComentarios("");
    setFotosFalla([]);
    setShowMultiDialog(false);
  };

  const handleFinishSession = () => {
    setShowMultiDialog(false);
    navigate("/admin/equipos-danados");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/equipos-danados")}
            className="mb-1 text-slate-400 hover:text-white px-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al listado
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white flex items-center gap-2.5">
            <Wrench className="h-7 w-7 text-primary" />
            Registro de Equipos Dañados
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Validación de tags, autocompletado de producto y reporte de fallas de Skyworth
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowManageClientsModal(true)}
            className="border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/5"
          >
            <Users className="h-3.5 w-3.5 mr-1.5 text-primary" /> Administrar Clientes
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowManageFailuresModal(true)}
            className="border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/5"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5 text-primary" /> Administrar Fallas
          </Button>

          {clienteConfirmado && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs px-3 py-1">
              {equiposRegistradosCount} equipo(s) en esta visita
            </Badge>
          )}
        </div>
      </div>

      {/* Step 1: Datos del Cliente */}
      <Card className={`glass-card border-white/10 shadow-xl transition-all duration-300 ${!clienteConfirmado ? "border-primary/40 shadow-primary/5" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                1
              </div>
              <CardTitle className="text-base text-white font-display">Datos del Cliente o Visita</CardTitle>
            </div>
            {clienteConfirmado && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setClienteConfirmado(false)}
              >
                Modificar cliente
              </Button>
            )}
          </div>
          <CardDescription className="text-xs text-slate-400">
            Los datos del cliente se guardan automáticamente en MAYÚSCULAS para mantener consistencia.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleClientSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Nombre Completo o Razón Social *</Label>
                  {!clienteConfirmado && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2 flex items-center gap-1 font-semibold"
                      onClick={() => {
                        setInitialClientForModal(clienteNombre);
                        setShowAddClientModal(true);
                      }}
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> + Nuevo cliente
                    </Button>
                  )}
                </div>
                <ClientSearchCombobox
                  value={clienteNombre}
                  onChange={(val) => setClienteNombre(val)}
                  onSelectClient={(client) => {
                    setClienteNombre(client.nombre);
                    if (client.ciudad && !ciudad) {
                      setCiudad(client.ciudad);
                    }
                  }}
                  onOpenAddModal={(typedName) => {
                    setInitialClientForModal(typedName || clienteNombre);
                    setShowAddClientModal(true);
                  }}
                  clients={clientes}
                  disabled={clienteConfirmado}
                  placeholder="Escribe para buscar entre clientes..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Ciudad *</Label>
                <Select value={ciudad} onValueChange={setCiudad} disabled={clienteConfirmado} required>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar ciudad..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c} className="focus:bg-white/5 focus:text-white">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!clienteConfirmado && (
              <div className="flex justify-end pt-2">
                <Button type="submit" className="bg-primary hover:bg-primary/95 text-white shadow-lg">
                  Continuar a Registro de Equipos <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Step 2: Formulario del Equipo Dañado (Se activa al confirmar cliente) */}
      {clienteConfirmado && (
        <form onSubmit={handleSaveEquipment} className="space-y-6 animate-in fade-in duration-300">
          {/* Tags y Validación de Seriales */}
          <Card className="glass-card border-white/10 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  2
                </div>
                <CardTitle className="text-base text-white font-display">
                  Validación de Tags (Caja y Televisor)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Sube las fotografías obligatorias. El sistema leerá el código de barras y comparará ambos seriales.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarcodeTagScanner
                  label="Fotografía Tag de la Caja"
                  description="Etiqueta externa de la caja del equipo"
                  file={fotoTagCaja}
                  serialValue={serialCaja}
                  isManual={isManualCaja}
                  onFileChange={setFotoTagCaja}
                  onSerialChange={(s, m) => {
                    setSerialCaja(s.toUpperCase());
                    setIsManualCaja(m);
                  }}
                />

                <BarcodeTagScanner
                  label="Fotografía Tag del Televisor"
                  description="Etiqueta posterior del televisor"
                  file={fotoTagTv}
                  serialValue={serialTv}
                  isManual={isManualTv}
                  onFileChange={setFotoTagTv}
                  onSerialChange={(s, m) => {
                    setSerialTv(s.toUpperCase());
                    setIsManualTv(m);
                  }}
                />
              </div>

              {/* Comparador de Seriales y Estado de Validación */}
              {(serialCaja || serialTv) && (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    serialsMatch
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : serialsMismatch
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-white/10 bg-black/20 text-slate-400"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {serialsMatch ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        ) : serialsMismatch ? (
                          <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                        )}
                        <span className="font-bold text-sm">
                          {serialsMatch
                            ? "RESULTADO: SERIALES COINCIDEN"
                            : serialsMismatch
                            ? "RESULTADO: SERIALES NO COINCIDEN (BLOQUEADO)"
                            : "Esperando lectura de ambos seriales..."}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs font-mono pt-1">
                        <div>
                          <span className="text-slate-400">Caja: </span>
                          <span className="font-bold text-white">{serialCaja || "(Sin leer)"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Televisor: </span>
                          <span className="font-bold text-white">{serialTv || "(Sin leer)"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="self-end sm:self-auto">
                      {serialsMatch && (
                        <Badge className="bg-emerald-500 text-black font-bold uppercase tracking-wider">
                          ✓ VÁLIDO
                        </Badge>
                      )}
                      {serialsMismatch && (
                        <Badge variant="destructive" className="font-bold uppercase tracking-wider animate-pulse">
                          ✗ NO COINCIDE
                        </Badge>
                      )}
                    </div>
                  </div>

                  {serialsMismatch && (
                    <p className="text-xs text-destructive mt-3 bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                      ⚠️ <strong>Alerta de Seguridad:</strong> El serial de la caja no corresponde al serial del televisor. Por favor verifique las fotos o ingrese el serial correcto antes de continuar.
                    </p>
                  )}
                </div>
              )}

              {/* Información Automática del Equipo (Cargada desde BD) */}
              {serialsMatch && (
                <div className={`rounded-xl border p-4 space-y-3 ${
                  productInfo?.yaRegistradoDanado
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-primary/20 bg-primary/5"
                }`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Tv className="h-4 w-4" /> Información Automática del Equipo (Base de Datos)
                    </Label>
                    {loadingProductInfo && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>

                  {productInfo?.yaRegistradoDanado && (
                    <div className="flex items-start gap-2 bg-destructive/20 border border-destructive/40 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-destructive">⚠ Serial ya registrado como equipo dañado</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">Este número de serie ya tiene un registro previo de daño en el sistema. No se permiten registros duplicados.</p>
                      </div>
                    </div>
                  )}

                  {productInfo && !productInfo.yaRegistradoDanado ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase">Serial Validado</span>
                        <p className="text-sm font-mono font-bold text-white">{serialTv}</p>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase">Modelo Detectado</span>
                        <p className="text-sm font-bold text-primary">
                          {productInfo.modelo || productInfo.productoNombre || "No registrado en maestro"}
                        </p>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase">Pulgadas</span>
                        <p className="text-sm font-bold text-white">
                          {productInfo.pulgadas ? `${productInfo.pulgadas}"` : "N/D"}
                        </p>
                      </div>
                    </div>
                  ) : productInfo?.yaRegistradoDanado ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 opacity-50">
                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase">Serial</span>
                        <p className="text-sm font-mono font-bold text-white">{serialTv}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Consultando datos del equipo...</p>
                  )}
                  {!productInfo?.yaRegistradoDanado && (
                    <p className="text-[10px] text-muted-foreground italic">
                      * Estos datos se extraen automáticamente de la base de datos de Skyworth y no son modificables.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registro de la Falla y Observaciones */}
          <Card className="glass-card border-white/10 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  3
                </div>
                <CardTitle className="text-base text-white font-display">Registro de la Falla y Respaldo</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Selecciona la falla principal del equipo y añade hasta 3 fotografías adicionales del daño.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Dropdown Fallas + Botones de gestión */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Tipo de Falla Presentada *</Label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2 flex items-center gap-1"
                      onClick={() => setShowAddFallaModal(true)}
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> + Otra falla
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-slate-400 hover:text-white hover:bg-white/5 px-2 flex items-center gap-1"
                      onClick={() => setShowManageFailuresModal(true)}
                    >
                      <Settings className="h-3.5 w-3.5" /> Administrar
                    </Button>
                  </div>
                </div>

                <Select value={selectedFalla} onValueChange={setSelectedFalla} required>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar falla común..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white max-h-64">
                    {fallas.map((f) => (
                      <SelectItem key={f.id} value={f.nombre} className="focus:bg-white/5 focus:text-white">
                        {f.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Comentarios — solo visible y obligatorio cuando la falla seleccionada es OTROS */}
              {(() => {
                const esOtros = selectedFalla.trim().toUpperCase() === "OTROS";
                if (!esOtros) return null;
                return (
                  <div className="space-y-1.5 rounded-xl p-3.5 border-2 border-amber-500/50 bg-amber-500/5 transition-all animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                        Descripción Detallada de la Falla * (Obligatorio)
                      </Label>
                      {!comentarios.trim() ? (
                        <Badge variant="destructive" className="text-[10px] animate-pulse">* Campo Requerido</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">✓ Completado</Badge>
                      )}
                    </div>
                    <Textarea
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      placeholder="Describe detalladamente la falla del equipo (tipo de daño, síntomas técnicos, ubicación en la pantalla, condiciones en las que se presentó, etc.)..."
                      rows={3}
                      required
                      className={`bg-black/30 text-white focus:border-amber-400 text-xs ${
                        !comentarios.trim() ? "border-amber-500/60" : "border-white/10"
                      }`}
                    />
                    <p className="text-[11px] text-amber-400/90 italic">
                      * Al seleccionar la opción "OTROS", es obligatorio especificar la falla para poder registrar el equipo.
                    </p>
                  </div>
                );
              })()}

              {/* Fotografías de la Falla (Hasta 3, Mínimo 1 obligatoria) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" /> Fotografías de la Falla o Daño * (Obligatorio, mínimo 1 foto)
                  </Label>
                  {fotosFalla.length === 0 ? (
                    <Badge variant="destructive" className="text-[10px] animate-pulse">
                      * Requerido (0/3)
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                      ✓ {fotosFalla.length}/3 subida(s)
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fotosFalla.map((file, idx) => {
                    const preview = URL.createObjectURL(file);
                    return (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40 h-28 group">
                        <img src={preview} alt={`Falla ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveFotoFalla(idx)}
                          className="absolute top-1 right-1 bg-destructive/90 hover:bg-destructive text-white p-1 rounded-md transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] px-1.5 py-0.5 rounded text-white font-mono">
                          Foto {idx + 1}
                        </span>
                      </div>
                    );
                  })}

                  {fotosFalla.length < 3 && (
                    <div
                      onClick={() => setShowFallaSourceModal(true)}
                      className={`border-2 border-dashed rounded-lg h-28 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-center p-2 select-none ${
                        fotosFalla.length === 0
                          ? "border-amber-500/40 bg-amber-500/5 hover:border-primary/60 hover:bg-white/5"
                          : "border-white/15 hover:border-primary/40 hover:bg-white/5"
                      }`}
                    >
                      <Upload className={`h-5 w-5 ${fotosFalla.length === 0 ? "text-amber-400" : "text-muted-foreground"}`} />
                      <span className="text-[11px] text-slate-300 font-medium">
                        {fotosFalla.length === 0 ? "Subir foto del daño *" : `Subir foto ${fotosFalla.length + 1}`}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <span className="text-amber-400">📸 Cámara</span>
                        <span>o</span>
                        <span className="text-cyan-400">🖼️ Galería</span>
                      </div>
                    </div>
                  )}

                  <ImageSourceModal
                    open={showFallaSourceModal}
                    onOpenChange={setShowFallaSourceModal}
                    title="Foto de Falla / Daño"
                    subtitle="Captura una foto de la falla con la cámara o elígela de tu galería."
                    onSelect={handleAddFotoFalla}
                  />
                </div>
                {fotosFalla.length === 0 && (
                  <p className="text-[11px] text-amber-400/90 italic">
                    * Debes adjuntar al menos una fotografía legible que evidencie la falla del equipo para continuar.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botón Enviar */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={
                submitting ||
                !serialsMatch ||
                !selectedFalla ||
                fotosFalla.length === 0 ||
                productInfo?.yaRegistradoDanado === true ||
                (selectedFalla.trim().toUpperCase() === "OTROS" && !comentarios.trim())
              }
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold shadow-xl text-base h-12 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando registro de equipo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Registrar Equipo Dañado
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Modal Agregar Nuevo Cliente */}
      <AddClientDialog
        open={showAddClientModal}
        onOpenChange={setShowAddClientModal}
        initialName={initialClientForModal}
        initialCity={ciudad}
        onClientAdded={(nuevoCliente) => {
          setClientes((prev) => {
            const exists = prev.some((c) => c.nombre.toUpperCase() === nuevoCliente.nombre.toUpperCase());
            if (exists) return prev;
            return [...prev, nuevoCliente].sort((a, b) => a.nombre.localeCompare(b.nombre));
          });
          setClienteNombre(nuevoCliente.nombre);
          if (nuevoCliente.ciudad) {
            setCiudad(nuevoCliente.ciudad);
          }
        }}
      />

      {/* Modal Administrar Clientes */}
      <ManageClientsDialog
        open={showManageClientsModal}
        onOpenChange={setShowManageClientsModal}
        onClientsChanged={loadClientes}
      />

      {/* Modal Administrar Fallas */}
      <ManageFailuresDialog
        open={showManageFailuresModal}
        onOpenChange={setShowManageFailuresModal}
        onFailuresChanged={loadFallas}
      />

      {/* Modal Agregar Otra Falla Rápida */}
      <AddFailureDialog
        open={showAddFallaModal}
        onOpenChange={setShowAddFallaModal}
        onFailureAdded={(nuevaFalla) => {
          setFallas((prev) => [...prev, nuevaFalla]);
          setSelectedFalla(nuevaFalla.nombre);
        }}
      />

      {/* Diálogo Multi-Equipo para el mismo cliente */}
      <Dialog open={showMultiDialog} onOpenChange={setShowMultiDialog}>
        <DialogContent className="max-w-md glass-card border-white/10 text-white">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center font-display text-white text-lg">
              ¡Equipo registrado correctamente!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-300 text-sm pt-2">
              ¿Desea registrar <strong>otro equipo</strong> para el cliente <strong>{clienteNombre}</strong> ({ciudad})?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleFinishSession}
              className="w-full border-white/10 hover:bg-white/5 text-white"
            >
              No, finalizar e ir al listado
            </Button>
            <Button
              type="button"
              onClick={handleRegisterAnother}
              className="w-full bg-primary hover:bg-primary/95 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-1.5" /> Sí, registrar otro equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
