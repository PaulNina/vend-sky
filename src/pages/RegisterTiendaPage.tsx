import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiPost, apiPostForm, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, CheckCircle2, Store, Building2, UserCheck, 
  Wallet, ShieldCheck, ArrowLeft, Upload, FileText, Check, Phone, Eye
} from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";

interface TiendaExistenteOption {
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

export default function RegisterTiendaPage() {
  const { cities, departments } = useCities();
  const [tab, setTab] = useState<"nueva" | "reclamar">("nueva");

  // Estado formulario Nueva Tienda
  const [nombreTienda, setNombreTienda] = useState("");
  const [canal, setCanal] = useState("Retail");
  const [ciudadNombre, setCiudadNombre] = useState("");
  const [ciudadId, setCiudadId] = useState<number | null>(null);
  const [departamento, setDepartamento] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefonoTienda, setTelefonoTienda] = useState("");
  const [nit, setNit] = useState("");

  // Estado formulario Reclamar Tienda
  const [tiendasDisponibles, setTiendasDisponibles] = useState<TiendaExistenteOption[]>([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<TiendaExistenteOption | null>(null);
  const [searchTiendaTerm, setSearchTiendaTerm] = useState("");

  // Datos Solicitante / Encargado
  const [nombreSolicitante, setNombreSolicitante] = useState("");
  const [ciSolicitante, setCiSolicitante] = useState("");
  const [telefonoSolicitante, setTelefonoSolicitante] = useState("");
  const [emailSolicitante, setEmailSolicitante] = useState("");
  const [password, setPassword] = useState("");
  const [cargoSolicitante, setCargoSolicitante] = useState("Propietario / Dueño");

  // Datos de Cobro (opcionales)
  const [banco, setBanco] = useState("");
  const [nroCuenta, setNroCuenta] = useState("");
  const [titularCobro, setTitularCobro] = useState("");
  const [telefonoTitular, setTelefonoTitular] = useState("");

  // Respaldo / Verificación
  const [fotoVerificacionUrl, setFotoVerificacionUrl] = useState("");
  const [uploadingVerif, setUploadingVerif] = useState(false);
  const [notasAdicionales, setNotasAdicionales] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Cargar tiendas activas para el reclamo
  useEffect(() => {
    if (tab === "reclamar") {
      setLoadingTiendas(true);
      apiGet<TiendaExistenteOption[]>("/tiendas/active")
        .then(data => setTiendasDisponibles(data || []))
        .catch(() => setTiendasDisponibles([]))
        .finally(() => setLoadingTiendas(false));
    }
  }, [tab]);

  const handleCitySelect = (val: string) => {
    const c = cities.find(city => city.nombre === val);
    setCiudadNombre(val);
    if (c) {
      const parsedId = Number(c.id);
      setCiudadId(!isNaN(parsedId) ? parsedId : null);
      setDepartamento(c.departamento || "");
    } else {
      setCiudadId(null);
    }
  };

  const handleVerificacionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadingVerif(true);
      const res = await apiPostForm<{ url: string }>("/tiendas/solicitudes/upload-verificacion", formData);
      if (res && res.url) {
        setFotoVerificacionUrl(res.url);
        toast({ title: "Documento adjuntado correctamente" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir comprobante";
      toast({ title: "Error al subir archivo", description: msg, variant: "destructive" });
    } finally {
      setUploadingVerif(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreSolicitante.trim() || !telefonoSolicitante.trim() || !emailSolicitante.trim()) {
      toast({ title: "Campos obligatorios", description: "Completa tu nombre, teléfono y correo electrónico.", variant: "destructive" });
      return;
    }

    if (tab === "nueva") {
      if (!nombreTienda.trim() || !ciudadNombre) {
        toast({ title: "Datos incompletos", description: "El nombre de la tienda y la ciudad son obligatorios.", variant: "destructive" });
        return;
      }
    } else {
      if (!tiendaSeleccionada) {
        toast({ title: "Selecciona una tienda", description: "Debes buscar y seleccionar la tienda que deseas reclamar.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        tipoSolicitud: tab === "nueva" ? "NUEVA_TIENDA" : "RECLAMAR_TIENDA",
        tiendaExistenteId: tab === "reclamar" ? tiendaSeleccionada?.id : undefined,
        nombreTienda: tab === "nueva" ? nombreTienda.trim() : tiendaSeleccionada?.nombre,
        canal,
        ciudadId,
        ciudadNombre,
        departamento,
        direccion,
        telefonoTienda,
        nit,
        nombreSolicitante: nombreSolicitante.trim(),
        ciSolicitante: ciSolicitante.trim(),
        telefonoSolicitante: telefonoSolicitante.trim(),
        emailSolicitante: emailSolicitante.trim().toLowerCase(),
        password: password.trim() || undefined,
        cargoSolicitante,
        banco: banco.trim() || undefined,
        nroCuenta: nroCuenta.trim() || undefined,
        titularCobro: titularCobro.trim() || undefined,
        telefonoTitular: telefonoTitular.trim() || undefined,
        fotoVerificacionUrl: fotoVerificacionUrl || undefined,
        notasAdicionales: notasAdicionales.trim() || undefined,
      };

      const res = await apiPost<{ success: boolean; message: string }>("/tiendas/solicitudes/public", payload);
      setSuccessMessage(res.message || "Tu solicitud ha sido enviada con éxito.");
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar la solicitud.";
      toast({ title: "Error en el registro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredTiendasParaReclamar = tiendasDisponibles.filter(t => {
    if (!searchTiendaTerm.trim()) return true;
    const term = searchTiendaTerm.toLowerCase();
    return t.nombre.toLowerCase().includes(term) ||
      (t.codigo && t.codigo.toLowerCase().includes(term)) ||
      (t.ciudad && t.ciudad.nombre.toLowerCase().includes(term));
  });

  if (success) {
    return (
      <div className="login-stage relative flex min-h-screen items-center justify-center p-4">
        <div className="login-grid pointer-events-none absolute inset-0" />
        <Card className="max-w-lg w-full glass-card border-white/10 shadow-2xl relative z-10 text-white">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold font-display text-white">¡Solicitud Enviada con Éxito!</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {successMessage}
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-primary flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> ¿Qué ocurre ahora?
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Un supervisor regional de Skyworth revisará y validará tu solicitud.</li>
                <li>Se creará tu usuario de acceso como <strong>Encargado de Tienda</strong> con tu correo: <span className="text-white font-mono">{emailSolicitante}</span>.</li>
                <li>Te contactaremos a tu número de WhatsApp para confirmar la aprobación.</li>
              </ul>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg">
                <Link to="/login">Ir a Iniciar Sesión</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                <Link to="/">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="login-stage relative flex min-h-screen items-center justify-center overflow-x-hidden p-4 py-8">
      <div className="login-grid pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-3xl space-y-6 z-10">
        {/* Cabecera */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <SkyworthLogo tone="white" className="w-44" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Store className="h-3.5 w-3.5" /> Portal de Tiendas Autorizadas
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
            Registro y Reclamo de Tiendas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Registra una nueva tienda comercial o solicita la vinculación como dueño/encargado de una tienda registrada.
          </p>
        </div>

        {/* Formulario Principal */}
        <Card className="glass-card border-white/10 shadow-2xl text-white overflow-hidden">
          <CardContent className="p-5 sm:p-7">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "nueva" | "reclamar")} className="space-y-6">
              <TabsList className="grid grid-cols-2 bg-black/40 border border-white/10 p-1 rounded-xl h-auto">
                <TabsTrigger 
                  value="nueva" 
                  className="py-2.5 text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Building2 className="h-4 w-4 mr-2" /> 1. Registrar Nueva Tienda
                </TabsTrigger>
                <TabsTrigger 
                  value="reclamar" 
                  className="py-2.5 text-xs sm:text-sm font-medium data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Store className="h-4 w-4 mr-2" /> 2. Reclamar Tienda Existente
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-6">
                <TabsContent value="nueva" className="space-y-4 m-0">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Alta de Nueva Tienda Comercial</p>
                      <p className="text-slate-400 mt-0.5">
                        Si tu tienda aún no figura en la red de Skyworth, ingresa sus datos comerciales. Será revisada y activada por el supervisor.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs text-slate-300">Nombre de la Tienda / Razón Comercial *</Label>
                      <Input
                        required
                        value={nombreTienda}
                        onChange={(e) => setNombreTienda(e.target.value)}
                        placeholder="Ej: Electro Hogar San Martín"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-primary text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Ciudad *</Label>
                      <Select value={ciudadNombre} onValueChange={handleCitySelect}>
                        <SelectTrigger className="bg-black/30 border-white/10 text-white text-xs">
                          <SelectValue placeholder="Selecciona ciudad..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white max-h-56">
                          {departments.map((dept) => (
                            <div key={dept}>
                              <p className="px-2 py-1 text-[11px] text-primary font-bold bg-white/5">{dept}</p>
                              {cities.filter(c => c.departamento === dept).map(c => (
                                <SelectItem key={c.nombre} value={c.nombre} className="text-xs pl-4">{c.nombre}</SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Canal Comercial</Label>
                      <Select value={canal} onValueChange={setCanal}>
                        <SelectTrigger className="bg-black/30 border-white/10 text-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Mayorista">Mayorista</SelectItem>
                          <SelectItem value="Distribuidor">Distribuidor</SelectItem>
                          <SelectItem value="Mercado">Mercado</SelectItem>
                          <SelectItem value="Especializado">Especializado</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs text-slate-300">Dirección de la Tienda</Label>
                      <Input
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Ej: Av. Mutualista #1420 entre 3er y 4to anillo"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Teléfono Fijo / Local</Label>
                      <Input
                        value={telefonoTienda}
                        onChange={(e) => setTelefonoTienda(e.target.value)}
                        placeholder="3-3456789"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">NIT (opcional)</Label>
                      <Input
                        value={nit}
                        onChange={(e) => setNit(e.target.value)}
                        placeholder="1023456789"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs font-mono"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reclamar" className="space-y-4 m-0">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                    <Store className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Reclamar Tienda Pre-registrada</p>
                      <p className="text-slate-400 mt-0.5">
                        Si Skyworth ya creó tu tienda en el sistema, búscala aquí para solicitar que tu cuenta sea vinculada como su Propietario o Encargado oficial.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Buscar tienda por nombre, código o ciudad</Label>
                      <Input
                        value={searchTiendaTerm}
                        onChange={(e) => setSearchTiendaTerm(e.target.value)}
                        placeholder="Escribe el nombre de tu tienda..."
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs"
                      />
                    </div>

                    {loadingTiendas ? (
                      <div className="flex items-center justify-center p-6 text-xs text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Cargando catálogo de tiendas...
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-white/5 p-2 bg-black/20">
                        {filteredTiendasParaReclamar.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-500">
                            No se encontraron tiendas con ese nombre. Prueba con la pestaña "Registrar Nueva Tienda".
                          </div>
                        ) : (
                          filteredTiendasParaReclamar.slice(0, 20).map((t) => {
                            const isSelected = tiendaSeleccionada?.id === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setTiendaSeleccionada(t)}
                                className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                                  isSelected 
                                    ? "bg-amber-500/20 border-amber-500/50 text-white shadow-md" 
                                    : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                                }`}
                              >
                                <div>
                                  <p className="font-semibold text-white flex items-center gap-1.5">
                                    {t.nombre}
                                    {t.codigo && (
                                      <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-amber-300">
                                        {t.codigo}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {t.ciudad?.nombre || "Sin ciudad"} • {t.direccion || "Sin dirección registrada"}
                                  </p>
                                </div>
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                                    <Check className="h-3 w-3" /> Seleccionada
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500 hover:text-white">Seleccionar</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    {tiendaSeleccionada && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Reclamando: <strong>{tiendaSeleccionada.nombre}</strong> ({tiendaSeleccionada.ciudad?.nombre || "Ciudad registrada"})</span>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* SECCIÓN DATOS DEL SOLICITANTE / DUEÑO */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" /> Datos de Acceso del Dueño o Encargado
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Tu Nombre Completo *</Label>
                      <Input
                        required
                        value={nombreSolicitante}
                        onChange={(e) => setNombreSolicitante(e.target.value)}
                        placeholder="Ej: Juan Pérez Morales"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">C.I. / Documento de Identidad</Label>
                      <Input
                        value={ciSolicitante}
                        onChange={(e) => setCiSolicitante(e.target.value)}
                        placeholder="Ej: 5432109 SC"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">WhatsApp / Celular de Contacto *</Label>
                      <Input
                        required
                        type="tel"
                        value={telefonoSolicitante}
                        onChange={(e) => setTelefonoSolicitante(e.target.value)}
                        placeholder="Ej: 71234567"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Correo Electrónico (Tu usuario de ingreso) *</Label>
                      <Input
                        required
                        type="email"
                        value={emailSolicitante}
                        onChange={(e) => setEmailSolicitante(e.target.value)}
                        placeholder="tu-correo@tienda.com"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Contraseña de Acceso</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs"
                      />
                      <p className="text-[10px] text-slate-500">Si lo dejas en blanco se te asignará una contraseña temporal.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Cargo en la Tienda</Label>
                      <Select value={cargoSolicitante} onValueChange={setCargoSolicitante}>
                        <SelectTrigger className="bg-black/30 border-white/10 text-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                          <SelectItem value="Propietario / Dueño">Propietario / Dueño</SelectItem>
                          <SelectItem value="Encargado de Sucursal">Encargado de Sucursal</SelectItem>
                          <SelectItem value="Administrador General">Administrador General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN VERIFICACIÓN / RESPALDO */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Respaldo / Comprobante de la Tienda
                  </h4>
                  <p className="text-xs text-slate-400">
                    Sube una foto de la fachada del local, credencial, NIT o recibo que acredite tu relación con la tienda para agilizar la aprobación.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <label className="flex-1 cursor-pointer w-full">
                      <div className="p-4 border-2 border-dashed border-white/15 hover:border-primary/50 rounded-xl bg-black/20 text-center transition-all flex flex-col items-center justify-center gap-2">
                        {uploadingVerif ? (
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        ) : fotoVerificacionUrl ? (
                          <div className="text-emerald-400 flex items-center gap-2 text-xs font-semibold">
                            <CheckCircle2 className="h-5 w-5" /> Documento adjuntado con éxito
                          </div>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-slate-400" />
                            <span className="text-xs text-slate-300 font-medium">Hacer clic para subir comprobante o foto</span>
                            <span className="text-[10px] text-slate-500">Formatos: JPG, PNG, WEBP o PDF</span>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*,.pdf" onChange={handleVerificacionUpload} className="hidden" />
                    </label>

                    {fotoVerificacionUrl && (
                      <div className="p-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-xs text-slate-300">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="truncate max-w-[160px]">Archivo adjunto</span>
                        <a 
                          href={`/${fotoVerificacionUrl}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="h-3 w-3" /> Ver
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Notas u observaciones adicionales (opcional)</Label>
                    <Textarea
                      value={notasAdicionales}
                      onChange={(e) => setNotasAdicionales(e.target.value)}
                      placeholder="Indica referencias de la tienda, horario de contacto o detalles para el supervisor..."
                      className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs min-h-[60px]"
                    />
                  </div>
                </div>

                {/* SECCIÓN COBRO (OPCIONAL) */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Wallet className="h-4 w-4" /> Datos de Pago y Cuenta Bancaria (Opcional)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Banco</Label>
                      <Input
                        value={banco}
                        onChange={(e) => setBanco(e.target.value)}
                        placeholder="Ej: Banco Unión, Banco FIE..."
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Nro. de Cuenta</Label>
                      <Input
                        value={nroCuenta}
                        onChange={(e) => setNroCuenta(e.target.value)}
                        placeholder="1234567890"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Titular de Cobro</Label>
                      <Input
                        value={titularCobro}
                        onChange={(e) => setTitularCobro(e.target.value)}
                        placeholder="Nombre o Razón Social"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Teléfono del Titular</Label>
                      <Input
                        value={telefonoTitular}
                        onChange={(e) => setTelefonoTitular(e.target.value)}
                        placeholder="71234567"
                        className="bg-black/30 border-white/10 text-white placeholder-slate-500 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón de Enviar */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={loading || uploadingVerif}
                    className="flex-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white font-semibold py-2.5 shadow-lg shadow-primary/20 text-xs sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando Solicitud...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" /> Enviar Solicitud a Supervisión
                      </>
                    )}
                  </Button>

                  <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs">
                    <Link to="/login">
                      <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Ya tengo cuenta / Iniciar Sesión
                    </Link>
                  </Button>
                </div>
              </form>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pie de página informativo */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-4">
          <Link to="/register" className="hover:text-primary transition-colors">
            ¿Eres vendedor individual? Regístrate aquí
          </Link>
          <span>•</span>
          <Link to="/login" className="hover:text-primary transition-colors">
            Acceso Administrativo
          </Link>
        </div>
      </div>
    </div>
  );
}
