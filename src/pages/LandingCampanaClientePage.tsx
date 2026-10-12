import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPostForm } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";
import { compressImage } from "@/lib/imageCompressor";
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  Tv,
  Camera,
  Search,
  AlertCircle,
  Loader2,
  Ticket,
  Calendar,
  Flame,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

import { CampanaActivaResponse, SerialValidationResponse } from "@/types/clientCampaign";

export default function LandingCampanaClientePage() {
  const [campana, setCampana] = useState<{ id: number; nombre: string; premioFinalMonto: number } | null>(null);
  const [loadingCampana, setLoadingCampana] = useState(true);

  // Formulario
  const [serial, setSerial] = useState("");
  const [validatingSerial, setValidatingSerial] = useState(false);
  const [serialValidation, setSerialValidation] = useState<SerialValidationResponse | null>(null);

  const [nombreCliente, setNombreCliente] = useState("");
  const [apellidoCliente, setApellidoCliente] = useState("");
  const [ci, setCi] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [ciudad, setCiudad] = useState("Santa Cruz");
  const [puntoVenta, setPuntoVenta] = useState("");
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split("T")[0]);

  // Los 5 respaldos
  const [fotoTag, setFotoTag] = useState<File | null>(null);
  const [fotoPoliza, setFotoPoliza] = useState<File | null>(null);
  const [fotoNota, setFotoNota] = useState<File | null>(null);
  const [fotoCiAnverso, setFotoCiAnverso] = useState<File | null>(null);
  const [fotoCiReverso, setFotoCiReverso] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [submittedRegistroId, setSubmittedRegistroId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<CampanaActivaResponse>("/cliente/campana-activa");
        if (res.activa && res.campana) {
          setCampana(res.campana);
        }
      } catch (err) {
        console.error("Error al cargar campaña activa:", err);
      } finally {
        setLoadingCampana(false);
      }
    }
    load();
  }, []);

  const handleValidarSerial = async () => {
    if (!serial.trim()) {
      toast({ title: "Serial requerido", description: "Ingrese el número de serie de su televisor.", variant: "destructive" });
      return;
    }
    setValidatingSerial(true);
    setSerialValidation(null);
    try {
      const campanaParam = campana?.id ? `?campanaId=${campana.id}` : "";
      const res = await apiGet<SerialValidationResponse>(`/cliente/validar-serial/${encodeURIComponent(serial.trim())}${campanaParam}`);
      setSerialValidation(res);
      if (res.valido) {
        toast({ title: "Serial Verificado", description: res.mensaje || "Serial legítimo de Skyworth." });
      } else {
        toast({ title: "Serial no disponible", description: res.mensaje || "Serial no disponible.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al validar serial";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setValidatingSerial(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialValidation?.valido) {
      toast({ title: "Serial pendiente", description: "Valide el serial de su televisor antes de enviar.", variant: "destructive" });
      return;
    }
    if (!fotoTag || !fotoPoliza || !fotoNota) {
      toast({ title: "Fotos obligatorias", description: "Debe cargar las fotografías de TAG, Póliza de Garantía y Factura/Nota de Venta.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("campanaId", String(campana?.id || 1));
      formData.append("nombreCliente", nombreCliente.trim());
      formData.append("apellidoCliente", apellidoCliente.trim());
      if (ci.trim()) formData.append("ci", ci.trim());
      formData.append("celular", celular.trim());
      if (email.trim()) formData.append("email", email.trim());
      formData.append("ciudad", ciudad);
      if (puntoVenta.trim()) formData.append("puntoVenta", puntoVenta.trim());
      if (serialValidation?.productoId) formData.append("productoId", String(serialValidation.productoId));
      if (serialValidation?.modelo) formData.append("productoModelo", serialValidation.modelo);
      if (serialValidation?.pulgadas) formData.append("productoPulgadas", String(serialValidation.pulgadas));
      formData.append("serial", serial.trim().toUpperCase());
      formData.append("fechaCompra", fechaCompra);

      // Optimizar y convertir fotos HEIC a JPEG antes de subir
      const [compTag, compPoliza, compNota, compCiAnverso, compCiReverso] = await Promise.all([
        fotoTag ? compressImage(fotoTag) : Promise.resolve(null),
        fotoPoliza ? compressImage(fotoPoliza) : Promise.resolve(null),
        fotoNota ? compressImage(fotoNota) : Promise.resolve(null),
        fotoCiAnverso ? compressImage(fotoCiAnverso) : Promise.resolve(null),
        fotoCiReverso ? compressImage(fotoCiReverso) : Promise.resolve(null),
      ]);

      if (compTag) formData.append("fotoTag", compTag);
      if (compPoliza) formData.append("fotoPoliza", compPoliza);
      if (compNota) formData.append("fotoNota", compNota);
      if (compCiAnverso) formData.append("fotoCiAnverso", compCiAnverso);
      if (compCiReverso) formData.append("fotoCiReverso", compCiReverso);

      const res = await apiPostForm<{ success: boolean; registroId: number }>("/cliente/registro-publico", formData);
      if (res.success) {
        setSubmittedSuccess(true);
        setSubmittedRegistroId(res.registroId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al registrar compra";
      toast({ title: "Error al registrar", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Navbar Público */}
      <header className="h-16 border-b border-white/[0.08] bg-[#07090e]/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkyworthLogo tone="white" className="w-28 sm:w-32" />
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-xs font-semibold tracking-wider text-amber-400 hidden sm:inline uppercase">
            Sorteos Oficiales
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/mis-tickets">
            <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 rounded-xl text-xs">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Consultar Mis Tickets
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
              Ingreso Personal
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        {/* Banner Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/30 p-6 sm:p-10 text-center shadow-[0_0_60px_rgba(245,158,11,0.15)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Registro de Clientes Finales Skyworth
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            ¡Registra tu Compra y Participa por <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">Bs 100.000</span>!
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-3 max-w-xl mx-auto">
            Participa en los sorteos quincenales de televisores y en la gran tómbola final. Ingresa tu número de serie y documentos de respaldo.
          </p>
        </div>

        {submittedSuccess ? (
          <Card className="border-emerald-500/30 bg-slate-900/90 text-center p-8 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">¡Registro Recibido Exitosamente!</h2>
            <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto">
              Tu número de registro es <strong>#{submittedRegistroId}</strong>. Nuestro equipo de supervisores validará tus respaldos para habilitar tus tickets para los sorteos.
            </p>
            <div className="pt-6 flex justify-center gap-3">
              <Link to="/mis-tickets">
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl px-6">
                  Ver Estado de Mis Tickets
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paso 1: Serial del Televisor */}
            <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-amber-400" />
                  1. Número de Serie o TAG de tu Televisor
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Lo encuentras en la etiqueta trasera del televisor o en la caja del producto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Ej: SKY-55G22-00123"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.toUpperCase())}
                    className="font-mono text-base tracking-wider bg-slate-950 border-white/10 h-12 rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={handleValidarSerial}
                    disabled={validatingSerial || !serial.trim()}
                    className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    {validatingSerial ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar Serial"}
                  </Button>
                </div>

                {serialValidation && (
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    serialValidation.valido ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}>
                    {serialValidation.valido ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                    <div className="text-xs sm:text-sm">
                      <p className="font-semibold">{serialValidation.mensaje}</p>
                      {serialValidation.valido && (
                        <p className="text-slate-300 mt-1">
                          Modelo: <strong className="text-white">{serialValidation.modelo}</strong> ({serialValidation.pulgadas}") · Tickets asignados: <strong className="text-amber-400 text-base">{serialValidation.ticketsProyectados} ticket(s)</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Paso 2: Datos Personales */}
            <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  2. Tus Datos Personales
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Asegúrate de que coincidan exactamente con tu carnet de identidad.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-400">Nombres *</Label>
                  <Input
                    required
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    placeholder="Carlos Alberto"
                    className="bg-slate-950 border-white/10 mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Apellidos *</Label>
                  <Input
                    required
                    value={apellidoCliente}
                    onChange={(e) => setApellidoCliente(e.target.value)}
                    placeholder="Mamani Quispe"
                    className="bg-slate-950 border-white/10 mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Cédula de Identidad (C.I.) (Opcional)</Label>
                  <Input
                    value={ci}
                    onChange={(e) => setCi(e.target.value)}
                    placeholder="1234567 SC"
                    className="bg-slate-950 border-white/10 mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Celular / WhatsApp *</Label>
                  <Input
                    required
                    type="tel"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="77012345"
                    className="bg-slate-950 border-white/10 mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Ciudad *</Label>
                  <select
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 h-10 text-sm text-slate-200 mt-1"
                  >
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Cochabamba">Cochabamba</option>
                    <option value="El Alto">El Alto</option>
                    <option value="Sucre">Sucre</option>
                    <option value="Oruro">Oruro</option>
                    <option value="Tarija">Tarija</option>
                    <option value="Potosí">Potosí</option>
                    <option value="Beni">Beni</option>
                    <option value="Pando">Pando</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Fecha de Compra *</Label>
                  <Input
                    type="date"
                    required
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                    className="bg-slate-950 border-white/10 mt-1 rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Paso 3: Los 5 Respaldos Fotográficos */}
            <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-400" />
                  3. Fotografías de Respaldo Obligatorias
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Sube fotos nítidas para la validación de tus tickets.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">1. Foto TAG (Etiqueta Trasera) *</Label>
                  <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" required onChange={(e) => setFotoTag(e.target.files?.[0] || null)} className="bg-slate-900 border-white/10 text-xs" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">2. Póliza de Garantía Sellada *</Label>
                  <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" required onChange={(e) => setFotoPoliza(e.target.files?.[0] || null)} className="bg-slate-900 border-white/10 text-xs" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">3. Factura o Nota de Venta *</Label>
                  <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" required onChange={(e) => setFotoNota(e.target.files?.[0] || null)} className="bg-slate-900 border-white/10 text-xs" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">4. Carnet de Identidad (Anverso) (Opcional)</Label>
                  <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" onChange={(e) => setFotoCiAnverso(e.target.files?.[0] || null)} className="bg-slate-900 border-white/10 text-xs" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">5. Carnet de Identidad (Reverso) (Opcional)</Label>
                  <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" onChange={(e) => setFotoCiReverso(e.target.files?.[0] || null)} className="bg-slate-900 border-white/10 text-xs" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={submitting || !serialValidation?.valido}
                className="w-full sm:w-auto px-10 py-7 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-lg tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.4)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ENVIANDO REGISTRO...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    REGISTRAR Y GENERAR MIS TICKETS
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
