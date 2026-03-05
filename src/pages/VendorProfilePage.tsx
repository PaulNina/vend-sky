import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserCircle, Store, Shirt, MapPin, Phone, Mail, Pencil, Save, X, QrCode, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

interface VendorData {
  id: string;
  full_name: string; email: string | null; phone: string | null;
  city: string; store_name: string | null; talla_polera: string | null;
  is_active: boolean;
  qr_url: string | null; qr_uploaded_at: string | null; qr_expires_at: string | null;
}

interface StoreHistory {
  id: string; previous_store: string | null; new_store: string | null;
  changed_at: string; observation: string | null;
}

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function VendorProfilePage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [history, setHistory] = useState<StoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [tallaPolera, setTallaPolera] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: v } = await supabase
        .from("vendors")
        .select("id, full_name, email, phone, city, store_name, talla_polera, is_active, qr_url, qr_uploaded_at, qr_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (v) {
        setVendor(v);
        syncEditFields(v);
        const { data: h } = await supabase
          .from("vendor_store_history")
          .select("id, previous_store, new_store, changed_at, observation")
          .eq("vendor_id", v.id)
          .order("changed_at", { ascending: false });
        setHistory(h || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const syncEditFields = (v: VendorData) => {
    setFullName(v.full_name);
    setPhone(v.phone || "");
    setStoreName(v.store_name || "");
    setTallaPolera(v.talla_polera || "");
  };

  const handleCancel = () => {
    if (vendor) syncEditFields(vendor);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!vendor) return;
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast({ title: "Error", description: "El nombre no puede estar vacío.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({
        full_name: trimmedName,
        phone: phone.trim() || null,
        store_name: storeName.trim() || null,
        talla_polera: tallaPolera || null,
      })
      .eq("id", vendor.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const updated = { ...vendor, full_name: trimmedName, phone: phone.trim() || null, store_name: storeName.trim() || null, talla_polera: tallaPolera || null };
      setVendor(updated);
      toast({ title: "Perfil actualizado" });
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!vendor) return <p className="text-muted-foreground text-center py-12">No se encontró información de vendedor.</p>;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });

  const readOnlyItems = [
    { icon: Mail, label: "Email", value: vendor.email || "—" },
    { icon: MapPin, label: "Ciudad", value: vendor.city },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            Mi Perfil
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Datos personales y kardex</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display">Datos del Vendedor</CardTitle>
            <Badge variant={vendor.is_active ? "default" : "secondary"} className="text-[10px]">
              {vendor.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {readOnlyItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.label}</p>
                  <p className="text-sm font-medium mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Editable fields */}
          {editing ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">Nombre completo</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Teléfono</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="storeName" className="text-xs">Nombre de tienda</Label>
                  <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="talla" className="text-xs">Talla polera</Label>
                  <Select value={tallaPolera} onValueChange={setTallaPolera}>
                    <SelectTrigger id="talla"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {TALLAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: UserCircle, label: "Nombre", value: vendor.full_name },
                { icon: Phone, label: "Teléfono", value: vendor.phone || "—" },
                { icon: Store, label: "Tienda", value: vendor.store_name || "Sin tienda" },
                { icon: Shirt, label: "Talla Polera", value: vendor.talla_polera || "No asignada" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR de Cobro */}
      <QrSection vendor={vendor} onUpdate={(updated) => setVendor(updated)} userId={user?.id || ""} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Historial de Cambios de Tienda</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">Sin cambios registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tienda Anterior</TableHead>
                  <TableHead>Tienda Nueva</TableHead>
                  <TableHead>Observación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-sm">{formatDate(h.changed_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.previous_store || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{h.new_store || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.observation || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- QR Section Component ---

function QrSection({ vendor, onUpdate, userId }: { vendor: VendorData; onUpdate: (v: VendorData) => void; userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const isExpired = vendor.qr_expires_at ? new Date(vendor.qr_expires_at) < new Date() : false;
  const expiryDate = vendor.qr_expires_at
    ? new Date(vendor.qr_expires_at).toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  useEffect(() => {
    if (!vendor.qr_url) { setPreviewUrl(null); return; }
    setLoadingPreview(true);
    supabase.storage.from("vendor-qr").createSignedUrl(vendor.qr_url, 300).then(({ data }) => {
      setPreviewUrl(data?.signedUrl || null);
      setLoadingPreview(false);
    });
  }, [vendor.qr_url]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imágenes (jpg, png).", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("vendor-qr").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error: updateErr } = await supabase
        .from("vendors")
        .update({
          qr_url: path,
          qr_uploaded_at: now.toISOString(),
          qr_expires_at: expiresAt.toISOString(),
        })
        .eq("id", vendor.id);

      if (updateErr) throw updateErr;

      onUpdate({
        ...vendor,
        qr_url: path,
        qr_uploaded_at: now.toISOString(),
        qr_expires_at: expiresAt.toISOString(),
      });
      toast({ title: "QR actualizado", description: `Vigente hasta ${expiresAt.toLocaleDateString("es-BO")}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          Mi QR de Cobro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {vendor.qr_url ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant={isExpired ? "destructive" : "default"}>
                {isExpired ? "Vencido" : "Vigente"}
              </Badge>
              {expiryDate && (
                <span className="text-xs text-muted-foreground">
                  {isExpired ? "Venció el" : "Vence el"} {expiryDate}
                </span>
              )}
            </div>
            {loadingPreview ? (
              <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Mi QR" className="w-48 h-48 object-contain rounded-lg border border-border mx-auto" />
            ) : null}
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">Reemplazar QR</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-4">
            <QrCode className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Aún no has subido tu QR de cobro.</p>
            <p className="text-xs text-muted-foreground">Tu QR será válido por 1 año desde la fecha de carga.</p>
            <div>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </div>
          </div>
        )}
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo QR...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
