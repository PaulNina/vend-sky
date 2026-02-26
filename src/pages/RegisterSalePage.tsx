import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Upload, ImageIcon } from "lucide-react";
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
}

type SerialValidation = {
  status: "idle" | "checking" | "ok" | "error";
  message: string;
};

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

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [campaignsRes, productsRes, vendorRes] = await Promise.all([
      supabase.from("campaigns").select("id, name, registration_enabled").eq("is_active", true),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("vendors").select("id, city").eq("user_id", user.id).single(),
    ]);

    if (campaignsRes.data) setCampaigns(campaignsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (vendorRes.data) {
      setVendorId(vendorRes.data.id);
      setVendorCity(vendorRes.data.city);
    }
  };

  // Bolivia week: Monday 00:00 to Sunday 23:59
  const getBoliviaWeek = (dateStr: string) => {
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
  };

  const isWithinCurrentWeek = (dateStr: string) => {
    const now = new Date();
    const boliviaOffset = -4 * 60;
    const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
    const boliviaNow = new Date(utcNow + boliviaOffset * 60000);
    const currentWeek = getBoliviaWeek(boliviaNow.toISOString().split("T")[0]);
    const inputWeek = getBoliviaWeek(dateStr);
    return inputWeek.week_start === currentWeek.week_start;
  };

  // Serial validation
  useEffect(() => {
    if (!serial || serial.length < 3) {
      setSerialValidation({ status: "idle", message: "" });
      return;
    }

    const timer = setTimeout(async () => {
      setSerialValidation({ status: "checking", message: "Verificando serial..." });

      // Check restricted
      const { data: restricted } = await supabase
        .from("restricted_serials")
        .select("reason")
        .eq("serial", serial)
        .maybeSingle();

      if (restricted) {
        setSerialValidation({ status: "error", message: `Serial restringido: ${restricted.reason}` });
        return;
      }

      // Check in serials pool
      const { data: serialData } = await supabase
        .from("serials")
        .select("id, status, product_id")
        .eq("serial", serial)
        .maybeSingle();

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

      // Check product match
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
      navigate("/mis-ventas");
    } catch (error: any) {
      toast({ title: "Error al registrar", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const FileInput = ({ label, file, onFile, id }: { label: string; file: File | null; onFile: (f: File) => void; id: string }) => (
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registrar Venta</h1>
        <p className="text-sm text-muted-foreground">Completa el formulario para registrar una nueva venta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Campaña</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una campaña" />
              </SelectTrigger>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Serial</CardTitle>
          </CardHeader>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4. Fecha de Venta</CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            {saleDate && !isWithinCurrentWeek(saleDate) && (
              <p className="text-sm text-destructive mt-2">La fecha debe estar dentro de la semana en curso (Lun–Dom)</p>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">5. Fotos (obligatorias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FileInput label="Foto TAG" file={tagFile} onFile={setTagFile} id="tag" />
              <FileInput label="Foto Póliza" file={polizaFile} onFile={setPolizaFile} id="poliza" />
              <FileInput label="Foto Nota de Venta" file={notaFile} onFile={setNotaFile} id="nota" />
            </div>
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
