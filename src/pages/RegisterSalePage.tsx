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
import { Loader2, CheckCircle2, XCircle, Upload, ImageIcon, Brain, AlertTriangle, Package, Camera, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

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
  registration_open_at: string | null;
  registration_close_at: string | null;
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

function FileInput({ label, file, onFile, onClear, id, isMobile }: { label: string; file: File | null; onFile: (f: File) => void; onClear: () => void; id: string; isMobile: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label} *</Label>
      {preview ? (
        <div className="relative group rounded-lg overflow-hidden border border-border aspect-square">
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onClear(); }}
            className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100"
          >
            <X className="h-3.5 w-3.5 text-destructive" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-background/70 backdrop-blur-sm py-1 px-2">
            <p className="text-[10px] text-foreground truncate">{file?.name}</p>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg aspect-square cursor-pointer hover:border-primary/50 active:border-primary transition-colors"
        >
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            {isMobile ? <Camera className="h-6 w-6" /> : <Upload className="h-5 w-5" />}
            <span className="text-[10px] text-center leading-tight">{isMobile ? "Tomar foto" : "Subir imagen"}</span>
          </div>
        </label>
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={isMobile ? "environment" : undefined}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
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

function getBoliviaNow() {
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcNow + boliviaOffset * 60000);
}

function getCurrentWeekBounds() {
  const boliviaNow = getBoliviaNow();
  const todayStr = boliviaNow.toISOString().split("T")[0];
  const week = getBoliviaWeek(todayStr);
  // max date is today (can't register future sales)
  return { min: week.week_start, max: todayStr };
}

function isWithinCurrentWeek(dateStr: string) {
  const boliviaNow = getBoliviaNow();
  const currentWeek = getBoliviaWeek(boliviaNow.toISOString().split("T")[0]);
  const inputWeek = getBoliviaWeek(dateStr);
  return inputWeek.week_start === currentWeek.week_start;
}

function isCampaignRegistrationOpen(c: Campaign) {
  if (!c.registration_enabled) return false;
  const now = new Date();
  if (c.registration_open_at && new Date(c.registration_open_at) > now) return false;
  if (c.registration_close_at && new Date(c.registration_close_at) < now) return false;
  return true;
}

// --- Main Component ---

export default function RegisterSalePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productAutoDetected, setProductAutoDetected] = useState(false);
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
      supabase.from("campaigns").select("id, name, registration_enabled, ai_date_validation, registration_open_at, registration_close_at").eq("is_active", true),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("vendors").select("id, city, pending_approval, is_active").eq("user_id", user.id).single(),
    ]);

    if (campaignsRes.data) {
      setCampaigns(campaignsRes.data);
      const openCampaigns = campaignsRes.data.filter(isCampaignRegistrationOpen);
      if (openCampaigns.length >= 1) {
        setSelectedCampaign(openCampaigns[0].id);
      } else if (campaignsRes.data.length === 1) {
        setSelectedCampaign(campaignsRes.data[0].id);
      }
    }
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

  // Serial validation + auto-detect product
  useEffect(() => {
    if (!serial || serial.length < 3) {
      setSerialValidation({ status: "idle", message: "" });
      setProductAutoDetected(false);
      setSelectedProduct("");
      return;
    }
    const timer = setTimeout(async () => {
      setSerialValidation({ status: "checking", message: "Verificando serial..." });
      const { data: restricted } = await supabase
        .from("restricted_serials").select("reason").eq("serial", serial).maybeSingle();
      if (restricted) {
        setSerialValidation({ status: "error", message: `Serial restringido: ${restricted.reason}` });
        setProductAutoDetected(false);
        setSelectedProduct("");
        return;
      }
      const [serialRes, salesRes] = await Promise.all([
        supabase.from("serials").select("id, status, product_id").eq("serial", serial).maybeSingle(),
        supabase.from("sales").select("id").eq("serial", serial).not("status", "eq", "rejected").limit(1),
      ]);
      const serialData = serialRes.data;
      if (!serialData) {
        setSerialValidation({ status: "error", message: "Serial no encontrado en el sistema" });
        setProductAutoDetected(false);
        setSelectedProduct("");
        return;
      }
      if (serialData.status === "used" || (salesRes.data && salesRes.data.length > 0)) {
        setSerialValidation({ status: "error", message: "Serial ya fue registrado en otra venta" });
        setProductAutoDetected(false);
        setSelectedProduct("");
        return;
      }
      if (serialData.status === "blocked") {
        setSerialValidation({ status: "error", message: "Serial bloqueado" });
        setProductAutoDetected(false);
        setSelectedProduct("");
        return;
      }
      if (serialData.product_id) {
        setSelectedProduct(serialData.product_id);
        setProductAutoDetected(true);
      } else {
        setProductAutoDetected(false);
        setSelectedProduct("");
      }
      setSerialValidation({ status: "ok", message: "Serial disponible ✓" });
    }, 500);
    return () => clearTimeout(timer);
  }, [serial]);

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
    if (campaign) {
      if (!campaign.registration_enabled) {
        toast({ title: "Error", description: "El registro para esta campaña está deshabilitado.", variant: "destructive" });
        return;
      }
      const now = new Date();
      if (campaign.registration_open_at && new Date(campaign.registration_open_at) > now) {
        toast({ title: "Error", description: `El registro abre el ${new Date(campaign.registration_open_at).toLocaleString("es-BO")}.`, variant: "destructive" });
        return;
      }
      if (campaign.registration_close_at && new Date(campaign.registration_close_at) < now) {
        toast({ title: "Error", description: "El periodo de registro para esta campaña ha finalizado.", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const [tagPath, polizaPath, notaPath] = await Promise.all([
        uploadFile(tagFile, "tag"),
        uploadFile(polizaFile, "poliza"),
        uploadFile(notaFile, "nota"),
      ]);

      const product = products.find((p) => p.id === selectedProduct);
      const week = getBoliviaWeek(saleDate);

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
            setAiValidation({ status: "warning", message: "No se pudo detectar la fecha en la imagen. La venta será marcada para revisión." });
            aiFlag = true;
          } else if (!fnData?.matches_week) {
            setAiValidation({ status: "error", message: `La fecha detectada (${fnData.date_detected}) no corresponde a la semana actual. Venta bloqueada.`, date_detected: fnData.date_detected, confidence: fnData.confidence });
            setSubmitting(false);
            return;
          } else {
            setAiValidation({ status: "ok", message: "Fecha verificada correctamente por IA.", date_detected: fnData.date_detected, confidence: fnData.confidence });
          }
        } catch (aiErr: any) {
          console.error("AI validation error:", aiErr);
          setAiValidation({ status: "warning", message: "Error en validación IA. La venta será marcada para revisión manual." });
          aiFlag = true;
        }
      }

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
      <div className="max-w-2xl mx-auto px-2">
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
  const detectedProduct = products.find((p) => p.id === selectedProduct);
  const weekBounds = getCurrentWeekBounds();

  const completedSteps = [
    !!selectedCampaign,
    serialValidation.status === "ok",
    !!selectedProduct,
    !!saleDate && isWithinCurrentWeek(saleDate),
    !!tagFile && !!polizaFile && !!notaFile,
  ];
  const progress = completedSteps.filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
          <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Registrar Venta
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Completa los 5 pasos para registrar tu venta</p>

        {/* Progress indicator */}
        <div className="flex items-center gap-1.5 mt-3">
          {completedSteps.map((done, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${done ? "bg-primary" : "bg-muted"}`} />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">{progress}/5</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {selectedCampaignData?.ai_date_validation && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Brain className="h-3 w-3" /> Validación IA activa
            </Badge>
          )}
        </div>

        {selectedCampaignData && !isCampaignRegistrationOpen(selectedCampaignData) && (
          <div className="mt-2 p-2.5 rounded-lg border border-warning/50 bg-warning/10 text-xs sm:text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <span>
              {!selectedCampaignData.registration_enabled
                ? "El registro está deshabilitado para esta campaña."
                : selectedCampaignData.registration_open_at && new Date(selectedCampaignData.registration_open_at) > new Date()
                  ? `El registro abre el ${new Date(selectedCampaignData.registration_open_at).toLocaleString("es-BO")}.`
                  : "El periodo de registro para esta campaña ha finalizado."}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
        {/* Step 1: Campaign */}
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-display flex items-center gap-2">
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-bold ${completedSteps[0] ? "gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</span>
              Campaña
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {campaigns.length <= 1 && selectedCampaign ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs sm:text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="font-medium truncate">{selectedCampaignData?.name}</span>
              </div>
            ) : (
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder="Selecciona una campaña" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Serial */}
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-display flex items-center gap-2">
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-bold ${completedSteps[1] ? "gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
              Serial
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-2">
            <Input
              placeholder="Ingresa el número de serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value.trim())}
              className="text-sm"
            />
            {serialValidation.status !== "idle" && (
              <div className={`flex items-center gap-2 text-xs sm:text-sm p-2 rounded-md ${
                serialValidation.status === "ok" ? "text-success bg-success/10" :
                serialValidation.status === "error" ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted/30"
              }`}>
                {serialValidation.status === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                {serialValidation.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                {serialValidation.status === "error" && <XCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>{serialValidation.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Product (auto-detected) */}
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-display flex items-center gap-2">
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-bold ${completedSteps[2] ? "gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</span>
              Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {productAutoDetected && detectedProduct ? (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-success/10 border border-success/30 text-xs sm:text-sm">
                <Package className="h-4 w-4 text-success shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium text-foreground block truncate">{detectedProduct.name}</span>
                  <span className="text-muted-foreground text-[10px] sm:text-xs">{detectedProduct.points_value} pts / Bs {detectedProduct.bonus_bs_value}</span>
                </div>
              </div>
            ) : serialValidation.status === "ok" && !productAutoDetected ? (
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.points_value} pts / Bs {p.bonus_bs_value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4 shrink-0" />
                Se detectará automáticamente al ingresar un serial válido
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Date */}
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-display flex items-center gap-2">
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-bold ${completedSteps[3] ? "gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>4</span>
              Fecha de Venta
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <Input type="date" value={saleDate} min={weekBounds.min} max={weekBounds.max} onChange={(e) => setSaleDate(e.target.value)} className="text-sm" />
            {saleDate && !isWithinCurrentWeek(saleDate) && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                La fecha debe estar entre {weekBounds.min} y {weekBounds.max}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Photos */}
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-display flex items-center gap-2">
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-bold ${completedSteps[4] ? "gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>5</span>
              Fotos (obligatorias)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <FileInput label="TAG" file={tagFile} onFile={setTagFile} onClear={() => setTagFile(null)} id="tag" isMobile={isMobile} />
              <FileInput label="Póliza" file={polizaFile} onFile={setPolizaFile} onClear={() => setPolizaFile(null)} id="poliza" isMobile={isMobile} />
              <FileInput label="Nota de Venta" file={notaFile} onFile={setNotaFile} onClear={() => setNotaFile(null)} id="nota" isMobile={isMobile} />
            </div>
            <AiValidationBadge ai={aiValidation} />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" variant="premium" disabled={submitting || progress < 5}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar Venta
        </Button>
      </form>
    </div>
  );
}
