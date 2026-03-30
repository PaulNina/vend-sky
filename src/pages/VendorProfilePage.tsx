import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, getToken, uploadUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserCircle, Store, Shirt, MapPin, Phone, Mail, Pencil, Save, X } from "lucide-react";
import { useCities } from "@/hooks/useCities";

interface VendorData {
  id: number;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  /** Ahora tienda es texto libre (string), no objeto */
  tienda: string | null;
  /** Ciudad es objeto con nombre */
  ciudad: { id: number; nombre: string; departamento?: string } | null;
  activo: boolean;
  pendingApproval?: boolean;
  tallaPolera?: string | null;
  fotoQr?: string | null;
}

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function VendorProfilePage() {
  const { user } = useAuth();
  const { cities, departments } = useCities();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [tiendaNombre, setTiendaNombre] = useState("");
  const [tallaPolera, setTallaPolera] = useState<string>("M");
  const [fotoQr, setFotoQr] = useState<File | null>(null);
  const [fotoQrPreview, setFotoQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiGet<VendorData>("/vendor/me")
      .then((v) => {
        if (v) {
          setVendor(v);
          syncEditFields(v);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const syncEditFields = (v: VendorData) => {
    setFullName(v.nombreCompleto);
    setPhone(v.telefono || "");
    setCity(v.ciudad?.nombre || "");
    setTiendaNombre(v.tienda || "");
    setTallaPolera(v.tallaPolera || "M");
    setFotoQr(null);
    setFotoQrPreview(v.fotoQr ? uploadUrl(v.fotoQr) : null);
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
    try {
      const formData = new FormData();
      formData.append("nombreCompleto", trimmedName);
      formData.append("telefono", phone.trim());
      formData.append("ciudad", city);
      formData.append("tienda", tiendaNombre.trim());
      formData.append("tallaPolera", tallaPolera);
      if (fotoQr) {
        formData.append("fotoQr", fotoQr);
      }

      const url = uploadUrl('/vendor/me');
      const _token = getToken();
      const headers: HeadersInit = {};
      if (_token) headers.Authorization = `Bearer ${_token}`;

      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: formData,
      });

      if (!res.ok) throw new Error("Fallo al actualizar el perfil.");
      const updated = await res.json();
      
      setVendor(updated);
      toast({ title: "Perfil actualizado" });
      setEditing(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: "destructive" });
      }
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!vendor) return <p className="text-muted-foreground text-center py-12">No se encontró información de vendedor.</p>;

  const readOnlyItems = [
    { icon: Mail, label: "Email", value: vendor.email || "—" },
    { icon: MapPin, label: "Departamento", value: vendor.ciudad?.departamento || "—" },
    { icon: MapPin, label: "Ciudad", value: vendor.ciudad?.nombre || "—" },
    { icon: Shirt, label: "Talla de Polera", value: vendor.tallaPolera || "Sin definir" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />Mi Perfil
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Datos personales</p>
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
            <Badge variant={vendor.activo ? "default" : "secondary"} className="text-[10px]">
              {vendor.pendingApproval ? "Pendiente" : vendor.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {editing ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="fullName" className="text-xs">Nombre completo</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} /></div>
                <div className="space-y-1.5"><Label htmlFor="phone" className="text-xs">Teléfono</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Ciudad *</Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger><SelectValue placeholder="Selecciona tu ciudad" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectGroup key={dept}>
                          <SelectLabel className="text-muted-foreground">{dept}</SelectLabel>
                          {cities.filter((c) => c.departamento === dept).map((c) => (
                            <SelectItem key={c.nombre} value={c.nombre}>{c.nombre}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre de tienda <span className="text-muted-foreground">(opcional)</span></Label>
                  <Input
                    value={tiendaNombre}
                    onChange={(e) => setTiendaNombre(e.target.value)}
                    placeholder="Ej: Tienda Centro..."
                    maxLength={200}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Talla de Polera</Label>
                  <Select value={tallaPolera} onValueChange={setTallaPolera}>
                    <SelectTrigger><SelectValue placeholder="Seleccione talla" /></SelectTrigger>
                    <SelectContent>
                      {TALLAS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">QR de Pagos (Imagen)</Label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFotoQr(e.target.files[0]);
                        setFotoQrPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }} 
                  />
                  {fotoQrPreview && (
                    <div className="mt-2 text-center border rounded p-2 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-2">Vista previa QR actual:</p>
                      <img src={fotoQrPreview} alt="QR" className="mx-auto max-h-[150px] object-contain" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}><X className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: UserCircle, label: "Nombre", value: vendor.nombreCompleto },
                { icon: Phone, label: "Teléfono", value: vendor.telefono || "—" },
                { icon: Store, label: "Tienda", value: vendor.tienda || "Sin tienda" },
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
              
              {vendor.fotoQr && (
                <div className="flex flex-col items-center gap-2 p-3 sm:col-span-2 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest w-full text-left">Foto QR Asociada</p>
                  <img src={uploadUrl(vendor.fotoQr)} alt="QR Vendedor" className="max-h-[200px] object-contain border rounded" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
