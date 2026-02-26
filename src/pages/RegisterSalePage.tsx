import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Upload, ImageIcon, Brain, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  model_code: string;
  name: string;
  size_inches: number | null;
  points_value: number;
  bonus_bs_value: number;
}

interface Campaign {
  id: string;
  name: string;
  registration_enabled: boolean;
  ai_date_validation: boolean;
}

type SerialValidation = {
  status: "idle" | "checking" | "ok" | "error";
  message: string;
};

type AiValidation = {
  status: "idle" | "validating" | "ok" | "warning" | "error";
  message: string;
  date_detected?: string | null;
  confidence?: number;
};

// --- Subcomponents ---

function FileInput({ label, file, onFile, id }: { label: string; file: File | null; onFile: (f: File) => void; id: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} *</Label>
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
      >
        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-success" />
            <span className="text-foreground truncate max-w-[200px]">{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <span className="text-xs">Subir imagen</span>
          </div>
        )}
      </label>
      <input id={id} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

function AiValidationBadge({ ai }: { ai: AiValidation }) {
  if (ai.status === "idle") return null;
  return (
    <div className={`mt-3 p-3 rounded-lg border ${
      ai.status === "validating" ? "border-muted bg-muted/30" :
      ai.status === "ok" ? "border-success/50 bg-success/10" :
      ai.status === "warning" ? "border-warning/50 bg-warning/10" :
      "border-destructive/50 bg-destructive/10"
    }`}>
      <div className="flex items-center gap-2 text-sm">
        {ai.status === "validating" && <Loader2 className="h-4 w-4 animate-spin" />}
        {ai.status === "ok" && <CheckCircle2 className="h-4 w-4 text-success" />}
        {ai.status === "warning" && <AlertTriangle className="h-4 w-4 text-warning" />}
        {ai.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
        <Brain className="h-4 w-4" />
        <span className="font-medium">Validación IA</span>
      </div>
      <p className="text-sm mt-1">{ai.message}</p>
      {ai.date_detected && (
        <p className="text-xs text-muted-foreground mt-1">
          Fecha detectada: {ai.date_detected} · Confianza: {Math.round((ai.confidence || 0) * 100)}%
        </p>
      )}
    </div>
  );
}

// --- Helper Functions ---

function getBoliviaWeek(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00-04:00");
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    week_start: monday.toISOString().split("T")[0],
    week_end: sunday.toISOString().split("T")[0],
  };
}

function isWithinCurrentWeek(dateStr: string) {
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const boliviaNow = new Date(utcNow + boliviaOffset * 60000);
  const currentWeek = getBoliviaWeek(boliviaNow.toISOString().split("T")[0]);
  const inputWeek = getBoliviaWeek(dateStr);
  return inputWeek.week_start === currentWeek.week_start;
}

// --- Main Component ---

export default function RegisterSalePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [serial, setSerial] = useState("");
  const [serialValidation, setSerialValidation] = useState<SerialValidation>({ status: "idle", message: "" });
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tagFile, setTagFile] = useState<File | null>(null);
  const [polizaFile, setPolizaFile] = useState<File | null>(null);
  const [notaFile, setNotaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorCity, setVendorCity] = useState("");
  const [vendorBlocked, setVendorBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [aiValidation, setAiValidation] = useState<AiValidation>({ status: "idle", message: "" });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [campaignsRes, productsRes, vendorRes] = await Promise.all([
      supabase.from("campaigns").select("id, name, registration_enabled, ai_date_validation").eq("is_active", true),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("vendors").select("id, city, pending_approval, is_active").eq("user_id", user.id).single(),
    ]);

    if (campaignsRes.data) setCampaigns(campaignsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (vendorRes.data) {
      setVendorId(vendorRes.data.id);
      setVendorCity(vendorRes.data.city);
      if (vendorRes.data.pending_approval) {
        setVendorBlocked(true);
        setBlockReason("Tu cuenta está pendiente de aprobación.");
      } else if (!vendorRes.data.is_active) {
        setVendorBlocked(true);
        setBlockReason("Tu cuenta está inactiva. Contacta al administrador.");
      }
    }
  };

  // Serial validation
  useEffect(() => {
    if (!serial || serial.length < 3) {
      setSerialValidation({ status: "idle", message: "" });
      return;
    }
    const timer = setTimeout(async () => {
      setSerialValidation({ status: "checking", message: "Verificando serial..." });
      const { data: restricted } = await supabase
        .from("restricted_serials").select("reason").eq("serial", serial).maybeSingle();
      if (restricted) {
        setSerialValidation({ status: "error", message: `Serial restringido: ${restricted.reason}` });
        return;
      }
      const { data: serialData } = await supabase
        .from("serials").select("id, status, product_id").eq("serial", serial).maybeSingle();
      if (!serialData) {
        setSerialValidation({ status: "error", message: "Serial no encontrado en el sistema" });
        return;
      }
      if (serialData.status === "used") {
        setSerialValidation({ status: "error", message: "Serial ya fue utilizado en otra venta" });
        return;
      }
      if (serialData.status === "blocked") {
        setSerialValidation({ status: "error", message: "Serial bloqueado" });
        return;
      }
      if (selectedProduct && serialData.product_id && serialData.product_id !== selectedProduct) {
        setSerialValidation({ status: "error", message: "El serial no corresponde al producto seleccionado" });
        return;
      }
      setSerialValidation({ status: "ok", message: "Serial disponible ✓" });
    }, 500);
    return () => clearTimeout(timer);
  }, [serial, selectedProduct]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("sale-attachments").upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId || !selectedCampaign || !selectedProduct || !serial || !tagFile || !polizaFile || !notaFile) {
      toast({ title: "Error", description: "Completa todos los campos obligatorios.", variant: "destructive" });
      return;
    }
    if (serialValidation.status !== "ok") {
      toast({ title: "Error", description: "El serial no pasó la validación.", variant: "destructive" });
      return;
    }
    if (!isWithinCurrentWeek(saleDate)) {
      toast({ title: "Error", description: "La fecha de venta debe estar dentro de la semana en curso (Lun–Dom).", variant: "destructive" });
      return;
    }
    const campaign = campaigns.find((c) => c.id === selectedCampaign);
    if (campaign && !campaign.registration_enabled) {
      toast({ title: "Error", description: "El registro para esta campaña está deshabilitado.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Upload files
      const [tagPath, polizaPath, notaPath] = await Promise.all([
        uploadFile(tagFile, "tag"),
        uploadFile(polizaFile, "poliza"),
        uploadFile(notaFile, "nota"),
      ]);

      const product = products.find((p) => p.id === selectedProduct);
      const week = getBoliviaWeek(saleDate);

      // AI Date Validation (if enabled)
      let aiDateDetected: string | null = null;
      let aiDateConfidence: number | null = null;
      let aiFlag = false;

      if (campaign?.ai_date_validation) {
        setAiValidation({ status: "validating", message: "Analizando fecha en la imagen con IA..." });
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke("validate-sale-date", {
            body: { image_path: notaPath, week_start: week.week_start, week_end: week.week_end },
          });

          if (fnError) throw fnError;

          aiDateDetected = fnData?.date_detected || null;
          aiDateConfidence = fnData?.confidence || null;

          if (!fnData?.date_detected) {
            setAiValidation({
              status: "warning",
              message: "No se pudo detectar la fecha en la imagen. La venta será marcada para revisión.",
            });
            aiFlag = true;
          } else if (!fnData?.matches_week) {
            setAiValidation({
              status: "error",
              message: `La fecha detectada (${fnData.date_detected}) no corresponde a la semana actual. Venta bloqueada.`,
              date_detected: fnData.date_detected,
              confidence: fnData.confidence,
            });
            setSubmitting(false);
            return;
          } else {
            setAiValidation({
              status: "ok",
              message: "Fecha verificada correctamente por IA.",
              date_detected: fnData.date_detected,
              confidence: fnData.confidence,
            });
          }
        } catch (aiErr: any) {
          console.error("AI validation error:", aiErr);
          setAiValidation({
            status: "warning",
            message: "Error en validación IA. La venta será marcada para revisión manual.",
          });
          aiFlag = true;
        }
      }

      // Insert sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          campaign_id: selectedCampaign,
          vendor_id: vendorId,
          product_id: selectedProduct,
          serial,
          sale_date: saleDate,
          week_start: week.week_start,
          week_end: week.week_end,
          points: product?.points_value || 0,
          bonus_bs: product?.bonus_bs_value || 0,
          city: vendorCity,
          ai_flag: aiFlag,
          ai_date_detected: aiDateDetected,
          ai_date_confidence: aiDateConfidence,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert attachments
      await supabase.from("sale_attachments").insert({
        sale_id: sale.id,
        tag_url: tagPath,
        poliza_url: polizaPath,
        nota_url: notaPath,
      });

      toast({ title: "¡Venta registrada!", description: "Tu venta fue enviada para revisión." });
      navigate("/v/mis-ventas");
    } catch (error: any) {
      toast({ title: "Error al registrar", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (vendorBlocked) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Acceso Bloqueado</h2>
            <p className="text-muted-foreground">{blockReason}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCampaignData = campaigns.find((c) => c.id === selectedCampaign);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registrar Venta</h1>
        <p className="text-sm text-muted-foreground">Completa el formulario para registrar una nueva venta</p>
        {selectedCampaignData?.ai_date_validation && (
          <Badge variant="outline" className="mt-2 gap-1">
            <Brain className="h-3 w-3" /> Validación IA de fecha activa
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Campaña</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger><SelectValue placeholder="Selecciona una campaña" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Product */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">2. Producto</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.points_value} pts / Bs {p.bonus_bs_value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Serial */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">3. Serial</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Ingresa el número de serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value.trim())}
            />
            {serialValidation.status !== "idle" && (
              <div className={`flex items-center gap-2 text-sm ${
                serialValidation.status === "ok" ? "text-success" :
                serialValidation.status === "error" ? "text-destructive" : "text-muted-foreground"
              }`}>
                {serialValidation.status === "checking" && <Loader2 className="h-4 w-4 animate-spin" />}
                {serialValidation.status === "ok" && <CheckCircle2 className="h-4 w-4" />}
                {serialValidation.status === "error" && <XCircle className="h-4 w-4" />}
                {serialValidation.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">4. Fecha de Venta</CardTitle></CardHeader>
          <CardContent>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            {saleDate && !isWithinCurrentWeek(saleDate) && (
              <p className="text-sm text-destructive mt-2">La fecha debe estar dentro de la semana en curso (Lun–Dom)</p>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">5. Fotos (obligatorias)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FileInput label="Foto TAG" file={tagFile} onFile={setTagFile} id="tag" />
              <FileInput label="Foto Póliza" file={polizaFile} onFile={setPolizaFile} id="poliza" />
              <FileInput label="Foto Nota de Venta" file={notaFile} onFile={setNotaFile} id="nota" />
            </div>
            <AiValidationBadge ai={aiValidation} />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar Venta
        </Button>
      </form>
    </div>
  );
}
