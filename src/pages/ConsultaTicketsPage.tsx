import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPostForm } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";
import { compressImage } from "@/lib/imageCompressor";
import {
  Search,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  XCircle,
  Trophy,
  Loader2,
  Tv,
  ArrowLeft,
  Upload
} from "lucide-react";

import { ConsultarTicketsResponse } from "@/types/clientCampaign";

export default function ConsultaTicketsPage() {
  const [ci, setCi] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ConsultarTicketsResponse | null>(null);

  // Subsanación de fotos observadas
  const [selectedObservadoId, setSelectedObservadoId] = useState<number | null>(null);
  const [fotoTag, setFotoTag] = useState<File | null>(null);
  const [fotoPoliza, setFotoPoliza] = useState<File | null>(null);
  const [fotoNota, setFotoNota] = useState<File | null>(null);
  const [fotoCiAnverso, setFotoCiAnverso] = useState<File | null>(null);
  const [fotoCiReverso, setFotoCiReverso] = useState<File | null>(null);
  const [submittingSubsanacion, setSubmittingSubsanacion] = useState(false);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ci.trim()) {
      toast({ title: "C.I. requerida", description: "Ingrese su cédula de identidad.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiGet<ConsultarTicketsResponse>(`/cliente/consultar-tickets/${encodeURIComponent(ci.trim())}`);
      setResultado(res);
      if (res.registros.length === 0) {
        toast({ title: "Sin registros", description: "No se encontraron compras registradas con esa C.I." });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al consultar tickets";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubsanar = async (registroId: number) => {
    setSubmittingSubsanacion(true);
    try {
      const [compTag, compPoliza, compNota, compCiAnverso, compCiReverso] = await Promise.all([
        fotoTag ? compressImage(fotoTag) : Promise.resolve(null),
        fotoPoliza ? compressImage(fotoPoliza) : Promise.resolve(null),
        fotoNota ? compressImage(fotoNota) : Promise.resolve(null),
        fotoCiAnverso ? compressImage(fotoCiAnverso) : Promise.resolve(null),
        fotoCiReverso ? compressImage(fotoCiReverso) : Promise.resolve(null),
      ]);

      const formData = new FormData();
      formData.append("registroId", String(registroId));
      formData.append("ci", ci.trim());
      if (compTag) formData.append("fotoTag", compTag);
      if (compPoliza) formData.append("fotoPoliza", compPoliza);
      if (compNota) formData.append("fotoNota", compNota);
      if (compCiAnverso) formData.append("fotoCiAnverso", compCiAnverso);
      if (compCiReverso) formData.append("fotoCiReverso", compCiReverso);

      await apiPostForm("/cliente/subsanar-observacion", formData);
      toast({ title: "¡Subsanación Enviada!", description: "Tus documentos han sido reenviados al supervisor para revisión." });
      setSelectedObservadoId(null);
      // Re-consultar
      const res = await apiGet<ConsultarTicketsResponse>(`/cliente/consultar-tickets/${encodeURIComponent(ci.trim())}`);
      setResultado(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al subsanar";
      toast({ title: "Error al subsanar", description: message, variant: "destructive" });
    } finally {
      setSubmittingSubsanacion(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/[0.08] bg-[#07090e]/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkyworthLogo tone="white" className="w-28 sm:w-32" />
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase hidden sm:inline">
            Mis Tickets de Sorteo
          </span>
        </div>

        <Link to="/sorteo">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white text-xs">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Registrar Otra Compra
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white">Consulta el Estado de tus Tickets</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Ingresa tu número de Cédula de Identidad para verificar tus tickets y estado de aprobación.
          </p>
        </div>

        {/* Buscador */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6">
          <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Ej: 1234567 SC"
                value={ci}
                onChange={(e) => setCi(e.target.value)}
                className="bg-slate-950 border-white/10 h-12 rounded-xl text-base font-mono"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !ci.trim()}
              className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Consultar Tickets"}
            </Button>
          </form>
        </Card>

        {/* Resultados */}
        {resultado && (
          <div className="space-y-6">
            {/* Tarjeta de Resumen */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-white/10 bg-slate-900/60 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-400 uppercase">Total Tickets Generados</p>
                <h3 className="text-3xl font-black text-white mt-1">{resultado.totalTickets}</h3>
              </Card>
              <Card className="border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 text-center">
                <p className="text-xs text-emerald-400 uppercase font-semibold">Tickets Habilitados para Sorteo</p>
                <h3 className="text-3xl font-black text-emerald-400 mt-1">{resultado.ticketsHabilitados}</h3>
              </Card>
            </div>

            {/* Lista de Registros y Subsanación */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-amber-400" />
                Mis Compras Registradas
              </h2>

              {resultado.registros.map((reg) => (
                <Card key={reg.id} className="border-white/10 bg-slate-900/60 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">{reg.serial}</span>
                        <span className="text-slate-400 text-xs">({reg.productoModelo || "TV Skyworth"})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Fecha: {reg.fechaCompra} · Ciudad: {reg.ciudad}</p>
                    </div>

                    <div>
                      {reg.estado === "APROBADO" && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Aprobado / Tickets Habilitados</Badge>}
                      {reg.estado === "PENDIENTE" && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Pendiente de Revisión</Badge>}
                      {reg.estado === "OBSERVADO" && <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30">Observado por Supervisor</Badge>}
                      {reg.estado === "RECHAZADO" && <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Rechazado</Badge>}
                    </div>
                  </div>

                  {/* Si está OBSERVADO: muestra el motivo y el formulario para subsanar */}
                  {reg.estado === "OBSERVADO" && (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3">
                      <div className="flex items-start gap-2 text-xs text-orange-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Motivo de la Observación:</strong> {reg.motivoObservacion}
                        </div>
                      </div>

                      {selectedObservadoId === reg.id ? (
                        <div className="pt-2 space-y-3 border-t border-orange-500/20">
                          <p className="text-xs font-semibold text-white">Cargar respaldos corregidos:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <Label className="text-[11px] text-slate-300">Foto TAG</Label>
                              <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" onChange={(e) => setFotoTag(e.target.files?.[0] || null)} className="bg-slate-950 text-xs h-9" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-300">Foto Póliza Sellada</Label>
                              <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" onChange={(e) => setFotoPoliza(e.target.files?.[0] || null)} className="bg-slate-950 text-xs h-9" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-300">Foto Factura/Nota</Label>
                              <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" onChange={(e) => setFotoNota(e.target.files?.[0] || null)} className="bg-slate-950 text-xs h-9" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-300">Foto CI Anverso (Opcional)</Label>
                              <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" onChange={(e) => setFotoCiAnverso(e.target.files?.[0] || null)} className="bg-slate-950 text-xs h-9" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-300">Foto CI Reverso (Opcional)</Label>
                              <Input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp" onChange={(e) => setFotoCiReverso(e.target.files?.[0] || null)} className="bg-slate-950 text-xs h-9" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedObservadoId(null)} className="text-xs text-slate-400">
                              Cancelar
                            </Button>
                            <Button size="sm" disabled={submittingSubsanacion} onClick={() => handleSubsanar(reg.id)} className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs">
                              {submittingSubsanacion ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                              Reenviar Documentos al Supervisor
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => setSelectedObservadoId(reg.id)} className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs rounded-xl">
                          Subsanar y Cargar Fotos Corregidas
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Desglose de Tickets */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                Mis Números de Ticket
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resultado.tickets.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono">CÓDIGO DE TICKET</span>
                      <h4 className="font-mono text-lg font-black text-white">{t.codigoTicket}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Serial: {t.serial}</p>
                    </div>

                    <div>
                      {t.estado === "HABILITADO" && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Habilitado</Badge>}
                      {t.estado === "NO_HABILITADO" && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Pendiente Aprobación</Badge>}
                      {t.estado === "PREMIADO" && <Badge className="bg-amber-400 text-slate-950 font-bold">¡PREMIADO!</Badge>}
                      {t.estado === "ANULADO" && <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Anulado</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
