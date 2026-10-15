import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost, apiPostForm, getToken, uploadUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, UserCircle, Store, Shirt, MapPin, Phone, 
  Mail, Pencil, Save, X, Building2, Clock, CheckCircle2, 
  XCircle, ShieldCheck, Upload, FileText, Check, AlertCircle 
} from "lucide-react";
import { useCities } from "@/hooks/useCities";

interface VendorData {
  id: number;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  tienda: string | null;
  ciudad: { id: number; nombre: string; departamento?: string } | null;
  activo: boolean;
  pendingApproval?: boolean;
  tallaPolera?: string | null;
  fotoQr?: string | null;
}

interface TiendaOption {
  id: number;
  nombre: string;
  codigo?: string;
  direccion?: string;
  canal?: string;
  ciudad?: {
    id: number;
    nombre: string;
    departamento?: string;
  };
}

interface SolicitudTiendaItem {
  id: number;
  tipoSolicitud: "NUEVA_TIENDA" | "RECLAMAR_TIENDA";
  nombreTienda?: string;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  motivoRechazo?: string;
  createdAt?: string;
}

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function VendorProfilePage() {
  const { user } = useAuth();
  const { cities, departments } = useCities();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos de edición
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [tiendaNombre, setTiendaNombre] = useState("");
  const [tallaPolera, setTallaPolera] = useState<string>("M");
  const [fotoQr, setFotoQr] = useState<File | null>(null);
  const [fotoQrPreview, setFotoQrPreview] = useState<string | null>(null);

  // Tiendas activas filtradas por ciudad
  const [storesInCity, setStoresInCity] = useState<TiendaOption[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  // Solicitudes de tienda del vendedor
  const [myRequests, setMyRequests] = useState<SolicitudTiendaItem[]>([]);

  // Modal Reclamar / Solicitar Tienda
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimTab, setClaimTab] = useState<"reclamar" | "nueva">("reclamar");
  const [tiendaIdToClaim, setTiendaIdToClaim] = useState<string>("");
  const [claimNotes, setClaimNotes] = useState("");
  const [claimDocUrl, setClaimDocUrl] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Formulario Nueva Tienda Solicitada
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState("");
  const [nuevaTiendaCanal, setNuevaTiendaCanal] = useState("Retail");
  const [nuevaTiendaDireccion, setNuevaTiendaDireccion] = useState("");
  const [nuevaTiendaTelefono, setNuevaTiendaTelefono] = useState("");
  const [nuevaTiendaNit, setNuevaTiendaNit] = useState("");

  const [submittingClaim, setSubmittingClaim] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const v = await apiGet<VendorData>("/vendor/me");
      if (v) {
        setVendor(v);
        syncEditFields(v);
      }
    } catch {
      // Error manejado
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    try {
      const list = await apiGet<SolicitudTiendaItem[]>("/tiendas/solicitudes/my-requests");
      setMyRequests(list || []);
    } catch {
      setMyRequests([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cargar tiendas cuando cambia la ciudad seleccionada
  useEffect(() => {
    if (!city) {
      setStoresInCity([]);
      return;
    }
    setLoadingStores(true);
    apiGet<TiendaOption[]>(`/tiendas/by-city/${encodeURIComponent(city)}`)
      .then((data) => setStoresInCity(data || []))
      .catch(() => setStoresInCity([]))
      .finally(() => setLoadingStores(false));
  }, [city]);

  const syncEditFields = (v: VendorData) => {
    setFullName(v.nombreCompleto);
    setPhone(v.telefono || "");
    const initialCity = v.ciudad?.nombre || "";
    setCity(initialCity);
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
      toast({ title: "Perfil actualizado correctamente" });
      setEditing(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ocurrió un error inesperado.";
      toast({ title: "Error al guardar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Subir documento de respaldo para reclamo de tienda
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadingDoc(true);
      const res = await apiPostForm<{ url: string }>("/tiendas/solicitudes/upload-verificacion", formData);
      if (res && res.url) {
        setClaimDocUrl(res.url);
        toast({ title: "Documento adjuntado exitosamente" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir documento";
      toast({ title: "Error al subir", description: msg, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
  };

  // Enviar solicitud de reclamo o nueva tienda a administración
  const handleSendStoreRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    if (claimTab === "reclamar" && !tiendaIdToClaim) {
      toast({ title: "Selecciona una tienda", description: "Debes elegir la tienda que deseas reclamar o asignarte.", variant: "destructive" });
      return;
    }

    if (claimTab === "nueva" && !nuevaTiendaNombre.trim()) {
      toast({ title: "Nombre requerido", description: "Indica el nombre de la nueva tienda.", variant: "destructive" });
      return;
    }

    setSubmittingClaim(true);
    try {
      const payload = {
        tipoSolicitud: claimTab === "reclamar" ? "RECLAMAR_TIENDA" : "NUEVA_TIENDA",
        tiendaExistenteId: claimTab === "reclamar" ? Number(tiendaIdToClaim) : undefined,
        nombreTienda: claimTab === "nueva" ? nuevaTiendaNombre.trim() : undefined,
        canal: nuevaTiendaCanal,
        ciudadNombre: city,
        direccion: nuevaTiendaDireccion.trim() || undefined,
        telefonoTienda: nuevaTiendaTelefono.trim() || undefined,
        nit: nuevaTiendaNit.trim() || undefined,
        nombreSolicitante: vendor.nombreCompleto,
        ciSolicitante: "",
        telefonoSolicitante: vendor.telefono || "",
        emailSolicitante: vendor.email || "",
        cargoSolicitante: "Vendedor de Tienda",
        fotoVerificacionUrl: claimDocUrl || undefined,
        notasAdicionales: claimNotes.trim() || undefined,
      };

      await apiPost("/tiendas/solicitudes/public", payload);
      toast({ 
        title: "Solicitud de Tienda Enviada", 
        description: "Un administrador o supervisor revisará y aprobará la asignación de tu tienda." 
      });
      setClaimModalOpen(false);
      setClaimNotes("");
      setClaimDocUrl("");
      setNuevaTiendaNombre("");
      setTiendaIdToClaim("");
      loadMyRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar la solicitud.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!vendor) return <p className="text-muted-foreground text-center py-12">No se encontró información de vendedor.</p>;

  const pendingRequest = myRequests.find(r => r.estado === "PENDIENTE");
  const rejectedRequest = myRequests.find(r => r.estado === "RECHAZADA");

  const profileItems = [
    { icon: UserCircle, label: "Nombre Completo", value: vendor.nombreCompleto },
    { icon: Mail, label: "Email", value: vendor.email || "—" },
    { icon: Phone, label: "Teléfono", value: vendor.telefono || "—" },
    { icon: MapPin, label: "Ciudad", value: vendor.ciudad?.nombre || "—" },
    { icon: MapPin, label: "Departamento", value: vendor.ciudad?.departamento || "—" },
    { icon: Store, label: "Tienda Oficial", value: vendor.tienda || "Sin tienda asignada" },
    { icon: Shirt, label: "Talla de Polera", value: vendor.tallaPolera || "Sin definir" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" /> Mi Perfil
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Información personal y comercial de vendedor</p>
        </div>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Editar Perfil
            </Button>
          </div>
        )}
      </div>

      {/* BANNER DE SOLICITUD DE TIENDA PENDIENTE O RECHAZADA */}
      {pendingRequest && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">Solicitud de Tienda en Revisión</p>
              <p className="text-slate-300 mt-0.5">
                Has solicitado la tienda: <strong className="text-amber-300">{pendingRequest.nombreTienda}</strong> ({pendingRequest.tipoSolicitud === "RECLAMAR_TIENDA" ? "Reclamo" : "Nueva Tienda"}).
                Está pendiente de aprobación por el supervisor de Skyworth.
              </p>
            </div>
          </div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] shrink-0">
            En Revisión
          </Badge>
        </div>
      )}

      {rejectedRequest && !pendingRequest && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">Solicitud de Tienda Observada</p>
              <p className="text-slate-300 mt-0.5">
                Tu solicitud para <strong className="text-rose-300">{rejectedRequest.nombreTienda}</strong> fue rechazada: 
                <span className="italic text-slate-400"> "{rejectedRequest.motivoRechazo || "No cumple con los requisitos"}"</span>.
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setClaimModalOpen(true)}
            className="text-rose-300 hover:text-white hover:bg-rose-500/20 text-xs h-7 shrink-0"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Tarjeta Principal */}
      <Card className="glass-card border-white/5 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display">Datos del Vendedor</CardTitle>
            <Badge variant={vendor.activo ? "default" : "secondary"}>
              {vendor.pendingApproval ? "Pendiente" : vendor.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold">Nombre completo *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">Teléfono *</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
                </div>
                
                {/* SELECT DE CIUDAD */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ciudad *</Label>
                  <Select value={city} onValueChange={(val) => {
                    setCity(val);
                    // Si cambia de ciudad, sugerir limpiar o actualizar la tienda seleccionada
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona tu ciudad" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {departments.map((dept) => (
                        <SelectGroup key={dept}>
                          <SelectLabel className="text-muted-foreground text-xs uppercase tracking-wider">{dept}</SelectLabel>
                          {cities.filter((c) => c.departamento === dept).map((c) => (
                            <SelectItem key={c.nombre} value={c.nombre}>{c.nombre}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* SELECT DE TIENDA (FILTRADA POR CIUDAD) CON BOTÓN PARA RECLAMAR */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Tienda Oficial *</Label>
                    <button
                      type="button"
                      onClick={() => setClaimModalOpen(true)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 hover:underline"
                    >
                      <Store className="h-3 w-3" /> Reclamar tienda
                    </button>
                  </div>

                  {loadingStores ? (
                    <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-md text-xs text-muted-foreground border border-border/50">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Cargando tiendas de {city}...
                    </div>
                  ) : (
                    <Select value={tiendaNombre} onValueChange={setTiendaNombre}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={storesInCity.length === 0 ? "No hay tiendas registradas en esta ciudad" : "Selecciona tu tienda"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {/* Si el vendedor tenía un texto legacy que no está en la lista oficial, incluirlo como opción */}
                        {tiendaNombre && !storesInCity.some(s => s.nombre.trim().toLowerCase() === tiendaNombre.trim().toLowerCase()) && (
                          <SelectItem value={tiendaNombre}>
                            {tiendaNombre} (Actual registrada)
                          </SelectItem>
                        )}
                        {storesInCity.map((s) => (
                          <SelectItem key={s.id} value={s.nombre}>
                            {s.nombre} {s.codigo ? `(${s.codigo})` : ""} {s.canal ? `• ${s.canal}` : ""}
                          </SelectItem>
                        ))}
                        {storesInCity.length === 0 && (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No hay tiendas registradas en {city || "la ciudad seleccionada"}.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Tiendas activas en {city || "tu ciudad"}. Si no figura tu sucursal, puedes reclamarla con el botón superior.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Talla de Polera</Label>
                  <Select value={tallaPolera} onValueChange={setTallaPolera}>
                    <SelectTrigger><SelectValue placeholder="Seleccione talla" /></SelectTrigger>
                    <SelectContent>
                      {TALLAS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email</Label>
                  <Input value={vendor.email || ""} disabled className="bg-muted/50 cursor-not-allowed text-xs text-muted-foreground" />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">QR de Pagos (Imagen)</Label>
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
              <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profileItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-medium mt-0.5 truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón rápido para reclamar o solicitar tienda en modo vista */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Store className="h-4 w-4 text-amber-400" />
                  <span>¿Deseas cambiar o vincularte formalmente a una tienda?</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setClaimModalOpen(true)}
                  className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  Reclamar / Solicitar Tienda
                </Button>
              </div>
              
              {vendor.fotoQr && (
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest w-full text-left">Foto QR Asociada</p>
                  <img src={uploadUrl(vendor.fotoQr)} alt="QR Vendedor" className="max-h-[200px] object-contain border rounded" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL RECLAMAR / SOLICITAR TIENDA */}
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="max-w-lg glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-base sm:text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-amber-400" /> Reclamar o Solicitar Tienda
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSendStoreRequest} className="space-y-4 py-2 text-xs">
            <Tabs value={claimTab} onValueChange={(v) => setClaimTab(v as "reclamar" | "nueva")}>
              <TabsList className="grid grid-cols-2 bg-black/40 border border-white/10 p-1 rounded-xl h-auto mb-4">
                <TabsTrigger value="reclamar" className="text-xs py-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  1. Reclamar Tienda Existente
                </TabsTrigger>
                <TabsTrigger value="nueva" className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  2. Solicitar Nueva Tienda
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reclamar" className="space-y-3 m-0">
                <p className="text-slate-400 text-xs">
                  Selecciona la tienda de <strong>{city || "tu ciudad"}</strong> a la cual perteneces para que el administrador apruebe tu asignación:
                </p>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Tienda de {city || "tu ciudad"} *</Label>
                  <Select value={tiendaIdToClaim} onValueChange={setTiendaIdToClaim}>
                    <SelectTrigger className="bg-black/30 border-white/10 text-white text-xs">
                      <SelectValue placeholder="Selecciona la tienda..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-56">
                      {storesInCity.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                          {t.nombre} {t.codigo ? `(${t.codigo})` : ""} {t.direccion ? `• ${t.direccion}` : ""}
                        </SelectItem>
                      ))}
                      {storesInCity.length === 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          No hay tiendas activas registradas en {city}. Puedes usar la pestaña "Solicitar Nueva Tienda".
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="nueva" className="space-y-3 m-0">
                <p className="text-slate-400 text-xs">
                  Si tu tienda es nueva y no figura en la red de Skyworth, ingresa sus datos para que un supervisor la registre y te asigne:
                </p>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Nombre de la Tienda *</Label>
                    <Input
                      value={nuevaTiendaNombre}
                      onChange={(e) => setNuevaTiendaNombre(e.target.value)}
                      placeholder="Ej: Electro Centro Norte"
                      className="bg-black/30 border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-xs">Canal</Label>
                      <Select value={nuevaTiendaCanal} onValueChange={setNuevaTiendaCanal}>
                        <SelectTrigger className="bg-black/30 border-white/10 text-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Mayorista">Mayorista</SelectItem>
                          <SelectItem value="Distribuidor">Distribuidor</SelectItem>
                          <SelectItem value="Mercado">Mercado</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-300 text-xs">NIT (opcional)</Label>
                      <Input
                        value={nuevaTiendaNit}
                        onChange={(e) => setNuevaTiendaNit(e.target.value)}
                        placeholder="1023456789"
                        className="bg-black/30 border-white/10 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Dirección</Label>
                    <Input
                      value={nuevaTiendaDireccion}
                      onChange={(e) => setNuevaTiendaDireccion(e.target.value)}
                      placeholder="Av. Principal #123"
                      className="bg-black/30 border-white/10 text-white text-xs"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Motivo y Justificación */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <Label className="text-slate-300 text-xs">Motivo o justificación para el supervisor (opcional)</Label>
              <Textarea
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                placeholder="Ej: Fui contratado en esta sucursal a partir de este mes..."
                className="bg-black/30 border-white/10 text-white text-xs min-h-[50px]"
              />
            </div>

            {/* Documento adjunto opcional */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Comprobante o foto de respaldo (opcional)</Label>
              <label className="cursor-pointer block">
                <div className="p-3 border border-dashed border-white/15 hover:border-amber-500/50 rounded-lg bg-black/20 text-center transition-all flex items-center justify-center gap-2 text-xs">
                  {uploadingDoc ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  ) : claimDocUrl ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Check className="h-4 w-4" /> Comprobante adjuntado
                    </span>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-400">Subir foto o documento de respaldo</span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*,.pdf" onChange={handleDocUpload} className="hidden" />
              </label>
            </div>

            <DialogFooter className="pt-2 border-t border-white/10 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setClaimModalOpen(false)} className="border-white/10 text-slate-400 text-xs">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submittingClaim || uploadingDoc} 
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5 shadow-md"
              >
                {submittingClaim ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Enviar Solicitud a Administración
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
