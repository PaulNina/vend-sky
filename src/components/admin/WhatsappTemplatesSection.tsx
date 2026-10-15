import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  ImageIcon,
  Sparkles,
  Info,
  Check,
  XCircle,
  Save,
  Loader2,
} from "lucide-react";

interface TemplateDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  params: { label: string; placeholder: string; defaultValue: string }[];
  csvHeaders: string[];
  csvEjemplo: string[];
}

const TEMPLATES_DISPONIBLES: TemplateDefinition[] = [
  {
    id: "skyworth_registro_recibido",
    nombre: "skyworth_registro_recibido",
    descripcion: "Notificación de confirmación tras registrar un equipo (Bandeo o Web)",
    params: [
      { label: "{{1}} Nombre del Cliente", placeholder: "Ej: Juan Pérez", defaultValue: "Juan Pérez" },
      { label: "{{2}} Modelo de Televisor", placeholder: "Ej: Televisor Skyworth 55G6600H", defaultValue: "Televisor Skyworth 55G6600H" },
      { label: "{{3}} Serie / TAG del Equipo", placeholder: "Ej: SK-78901234", defaultValue: "SK-78901234" },
      { label: "{{4}} Cantidad de Tickets", placeholder: "Ej: 2", defaultValue: "2" },
    ],
    csvHeaders: ["celular", "nombre", "modelo", "serie", "tickets"],
    csvEjemplo: ["59171234567", "Juan Perez", "Televisor Skyworth 55G6600H", "SK-78901234", "2"],
  },
  {
    id: "skyworth_registro_aprobado",
    nombre: "skyworth_registro_aprobado",
    descripcion: "Notificación de aprobación de registro y tickets habilitados para sorteos",
    params: [
      { label: "{{1}} Nombre del Cliente", placeholder: "Ej: Juan Pérez", defaultValue: "Juan Pérez" },
      { label: "{{2}} Modelo de Televisor", placeholder: "Ej: Televisor Skyworth 65G6600H", defaultValue: "Televisor Skyworth 65G6600H" },
      { label: "{{3}} Serie / TAG del Equipo", placeholder: "Ej: SK-78901234", defaultValue: "SK-78901234" },
      { label: "{{4}} Tickets Habilitados", placeholder: "Ej: 3", defaultValue: "3" },
    ],
    csvHeaders: ["celular", "nombre", "modelo", "serie", "tickets"],
    csvEjemplo: ["59171234567", "Juan Perez", "Televisor Skyworth 65G6600H", "SK-78901234", "3"],
  },
  {
    id: "skyworth_registro_observado_2",
    nombre: "skyworth_registro_observado_2",
    descripcion: "Notificación de observación v2 con enlace para corregir fotografías o datos",
    params: [
      { label: "{{1}} Nombre del Cliente", placeholder: "Ej: Juan Pérez", defaultValue: "Juan Pérez" },
      { label: "{{2}} Modelo de Televisor", placeholder: "Ej: Televisor Skyworth 50G6600H", defaultValue: "Televisor Skyworth 50G6600H" },
      { label: "{{3}} Serie / TAG del Equipo", placeholder: "Ej: SK-78901234", defaultValue: "SK-78901234" },
      { label: "{{4}} Motivo de Observación", placeholder: "Ej: Foto de factura borrosa", defaultValue: "Foto de factura poco legible, favor reenviar" },
    ],
    csvHeaders: ["celular", "nombre", "modelo", "serie", "motivo"],
    csvEjemplo: ["59171234567", "Juan Perez", "Televisor Skyworth 50G6600H", "SK-78901234", "Foto de factura poco legible"],
  },
  {
    id: "skyworth_registro_rechazado",
    nombre: "skyworth_registro_rechazado",
    descripcion: "Notificación de registro rechazado con motivo explicativo",
    params: [
      { label: "{{1}} Nombre del Cliente", placeholder: "Ej: Juan Pérez", defaultValue: "Juan Pérez" },
      { label: "{{2}} Producto / Modelo", placeholder: "Ej: Televisor Skyworth G6600H 50\"", defaultValue: "Televisor Skyworth G6600H 50\"" },
      { label: "{{3}} Serie / TAG del Equipo", placeholder: "Ej: TCL-123456123", defaultValue: "TCL-123456123" },
      { label: "{{4}} Motivo del Rechazo", placeholder: "Ej: Imágenes no corresponden a un producto Skyworth", defaultValue: "Imágenes no corresponden a un producto Skyworth" },
    ],
    csvHeaders: ["celular", "nombre", "producto", "serie", "motivo"],
    csvEjemplo: ["59171234567", "Juan Perez", "Televisor Skyworth G6600H 50\"", "TCL-123456123", "Imágenes no corresponden a un producto Skyworth"],
  },
];

interface CsvRow {
  to: string;
  params: string[];
  raw: Record<string, string>;
  status?: "pending" | "success" | "error";
  errorMessage?: string;
  waId?: string;
}

export default function WhatsappTemplatesSection() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("skyworth_registro_recibido");
  const [headerImageUrl, setHeaderImageUrl] = useState<string>("https://bono.skyworth.bo/logo_skyworth.jpg");
  const [savingHeader, setSavingHeader] = useState<boolean>(false);

  useEffect(() => {
    apiGet<{ headerImageUrl: string }>("/whatsapp/header-image")
      .then((res) => {
        if (res?.headerImageUrl) {
          setHeaderImageUrl(res.headerImageUrl);
        }
      })
      .catch((err) => {
        console.warn("No se pudo cargar la imagen de cabecera de WhatsApp:", err);
      });
  }, []);

  const handleSaveHeaderImage = async () => {
    if (!headerImageUrl.trim()) {
      toast({
        title: "URL requerida",
        description: "Ingresa una URL válida para la imagen de cabecera.",
        variant: "destructive",
      });
      return;
    }
    setSavingHeader(true);
    try {
      const res = await apiPut<{ headerImageUrl: string }>("/whatsapp/header-image", {
        headerImageUrl: headerImageUrl.trim(),
      });
      if (res?.headerImageUrl) {
        setHeaderImageUrl(res.headerImageUrl);
      }
      toast({
        title: "¡Imagen de Cabecera Guardada!",
        description: "Se guardó en la base de datos y se aplicará a todas las aprobaciones, observaciones y pruebas sin reiniciar.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error al guardar cabecera",
        description: err instanceof Error ? err.message : "Error al conectar con el servidor",
        variant: "destructive",
      });
    } finally {
      setSavingHeader(false);
    }
  };

  // Estado Prueba Individual
  const [testPhone, setTestPhone] = useState<string>("");
  const [testParams, setTestParams] = useState<string[]>(["Juan Pérez", "Televisor Skyworth 55G6600H", "SK-78901234", "2"]);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; waMessageId?: string; error?: string } | null>(null);

  // Estado Envío Masivo CSV
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [sendingMasivo, setSendingMasivo] = useState<boolean>(false);
  const [progressMasivo, setProgressMasivo] = useState<{ total: number; done: number; success: number; fail: number }>({
    total: 0,
    done: 0,
    success: 0,
    fail: 0,
  });

  const currentTemplate = TEMPLATES_DISPONIBLES.find((t) => t.id === selectedTemplateId) || TEMPLATES_DISPONIBLES[0];

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = TEMPLATES_DISPONIBLES.find((t) => t.id === templateId) || TEMPLATES_DISPONIBLES[0];
    setTestParams(tmpl.params.map((p) => p.defaultValue));
    setTestResult(null);
    setCsvRows([]);
    setCsvFileName("");
  };

  const handleParamChange = (index: number, val: string) => {
    const updated = [...testParams];
    updated[index] = val;
    setTestParams(updated);
  };

  const handleFillExamples = () => {
    setTestParams(currentTemplate.params.map((p) => p.defaultValue));
    toast({ title: "Datos completados", description: "Variables de prueba listas para enviar." });
  };

  // Enviar Prueba Individual
  const handleSendTest = async () => {
    const cleanPhone = testPhone.trim().replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      toast({ title: "Número requerido", description: "Ingresa el número de WhatsApp a donde enviar la prueba.", variant: "destructive" });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await apiPost<{ success: boolean; to: string; waMessageId?: string; error?: string }>(
        "/whatsapp/templates/probar",
        {
          to: cleanPhone,
          templateName: currentTemplate.nombre,
          headerImageUrl: headerImageUrl.trim(),
          params: testParams,
        }
      );

      setTestResult(res);
      if (res.success) {
        toast({
          title: "¡Template enviado con éxito!",
          description: `Meta aceptó el envío (ID: ${res.waMessageId || "OK"}) a ${res.to}`,
        });
      } else {
        toast({
          title: "Meta rechazó el template",
          description: res.error || "Verifica el estado de la plantilla en Meta Business Manager.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado al conectar con el servidor";
      setTestResult({ success: false, error: msg });
      toast({ title: "Error en el servidor", description: msg, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  // Descargar Plantilla CSV
  const handleDownloadCsvTemplate = () => {
    const headers = currentTemplate.csvHeaders.join(",");
    const sample1 = currentTemplate.csvEjemplo.join(",");
    const sample2 = currentTemplate.csvEjemplo
      .map((val, idx) => (idx === 0 ? "59179876543" : idx === 1 ? "Maria Gomez" : val))
      .join(",");

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent([headers, sample1, sample2].join("\n"));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `plantilla_${currentTemplate.id}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast({ title: "Plantilla descargada", description: `Archivo plantilla_${currentTemplate.id}.csv descargado.` });
  };

  // Cargar y Parsear CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        toast({ title: "CSV vacío", description: "El archivo no contiene filas de datos.", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows: CsvRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length === 0 || !cols[0]) continue;

        const raw: Record<string, string> = {};
        headers.forEach((h, idx) => {
          raw[h] = cols[idx] || "";
        });

        // Extraer celular
        const celular = cols[0];
        // Los parámetros son las columnas siguientes a celular
        const params = cols.slice(1);

        rows.push({
          to: celular,
          params: params,
          raw: raw,
          status: "pending",
        });
      }

      setCsvRows(rows);
      toast({
        title: "CSV cargado exitosamente",
        description: `Se encontraron ${rows.length} registros listos para enviar con ${currentTemplate.nombre}.`,
      });
    };

    reader.readAsText(file);
  };

  // Iniciar Envío Masivo
  const handleStartMasivo = async () => {
    if (csvRows.length === 0) {
      toast({ title: "Sin datos", description: "Carga un archivo CSV primero.", variant: "destructive" });
      return;
    }

    setSendingMasivo(true);
    setProgressMasivo({ total: csvRows.length, done: 0, success: 0, fail: 0 });

    try {
      const payload = {
        templateName: currentTemplate.nombre,
        headerImageUrl: headerImageUrl.trim(),
        destinatarios: csvRows.map((r) => ({
          to: r.to,
          params: r.params,
        })),
      };

      const res = await apiPost<{
        total: number;
        exitosos: number;
        fallidos: number;
        resultados: { success: boolean; to: string; waMessageId?: string; error?: string }[];
      }>("/whatsapp/templates/masivo", payload);

      // Actualizar estados en la tabla de filas
      const updatedRows = [...csvRows];
      res.resultados.forEach((resItem, idx) => {
        if (updatedRows[idx]) {
          updatedRows[idx].status = resItem.success ? "success" : "error";
          updatedRows[idx].waId = resItem.waMessageId;
          updatedRows[idx].errorMessage = resItem.error;
        }
      });

      setCsvRows(updatedRows);
      setProgressMasivo({
        total: res.total,
        done: res.total,
        success: res.exitosos,
        fail: res.fallidos,
      });

      toast({
        title: "Envío masivo finalizado",
        description: `Total: ${res.total} | Exitosos: ${res.exitosos} | Fallidos: ${res.fallidos}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error durante el envío masivo";
      toast({ title: "Error en envío masivo", description: msg, variant: "destructive" });
    } finally {
      setSendingMasivo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Plantilla */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                Plantillas Oficiales de WhatsApp (Meta Cloud API)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Envía plantillas de categoría Utilidad aprobadas por Meta a clientes con o sin sesión activa de 24 horas.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs w-fit">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Idioma: Spanish (es)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Grid de Plantillas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TEMPLATES_DISPONIBLES.map((t) => {
              const isSelected = t.id === selectedTemplateId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t.id)}
                  className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "border-white/5 bg-black/20 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-white truncate">{t.nombre}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{t.descripcion}</p>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <span>{t.params.length} variables</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Configuración de Cabecera Imagen */}
          <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
                URL de Imagen de Cabecera (Header Image)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveHeaderImage}
                  disabled={savingHeader}
                  className="h-7 text-xs px-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30"
                >
                  {savingHeader ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" /> Guardar Cabecera
                    </>
                  )}
                </Button>
                <a
                  href={headerImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Abrir imagen <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                value={headerImageUrl}
                onChange={(e) => setHeaderImageUrl(e.target.value)}
                placeholder="https://bono.skyworth.bo/logo_skyworth.jpg"
                className="bg-black/50 border-white/10 text-xs font-mono h-8"
              />
              <img
                src={headerImageUrl}
                alt="Logo preview"
                className="h-8 w-14 object-contain rounded bg-black/40 border border-white/10 p-0.5 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Esta imagen se adjunta como banner superior del template en los teléfonos de los clientes. Al guardarla, se actualiza en base de datos sin tocar el backend.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Prueba Individual vs Envío Masivo CSV */}
      <Tabs defaultValue="test" className="space-y-4">
        <TabsList className="bg-black/40 border border-white/5 p-1">
          <TabsTrigger
            value="test"
            className="flex items-center gap-1.5 text-xs text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <Send className="h-3.5 w-3.5 text-blue-400" />
            1. Enviar Template de Prueba
          </TabsTrigger>
          <TabsTrigger
            value="masivo"
            className="flex items-center gap-1.5 text-xs text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            2. Envío Masivo con Archivo CSV
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: PRUEBA INDIVIDUAL ── */}
        <TabsContent value="test">
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Probar plantilla: <span className="font-mono text-emerald-400">{currentTemplate.nombre}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Envía un mensaje de prueba a tu propio número para verificar que Meta lo entregue con la imagen de cabecera.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleFillExamples} className="text-xs text-slate-400 hover:text-white h-7">
                  Llenar datos de ejemplo
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teléfono Destino */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-slate-300">Número de WhatsApp Destino (Celular)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="Ej: 59171234567 o 71234567"
                      className="bg-black/50 border-white/10 text-sm font-mono max-w-md"
                    />
                    <span className="text-xs text-slate-400 self-center">
                      (Si no incluyes el código de país 591, se agregará automáticamente)
                    </span>
                  </div>
                </div>

                {/* Parámetros Dinámicos */}
                {currentTemplate.params.map((p, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <Label className="text-xs text-slate-300">{p.label}</Label>
                    <Input
                      value={testParams[idx] || ""}
                      onChange={(e) => handleParamChange(idx, e.target.value)}
                      placeholder={p.placeholder}
                      className="bg-black/50 border-white/10 text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Botón de Envío */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  onClick={handleSendTest}
                  disabled={sendingTest || !testPhone.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
                >
                  {sendingTest ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Enviar Template de Prueba Ahora
                </Button>
              </div>

              {/* Resultado de la Prueba */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                    testResult.success
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                      : "bg-red-950/30 border-red-500/30 text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>¡Plantilla Aceptada y Enviada por Meta!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span>Respuesta de Meta (Error o Rechazo):</span>
                      </>
                    )}
                  </div>
                  {testResult.waMessageId && (
                    <p className="font-mono text-[11px] text-slate-300">
                      WhatsApp Message ID: <span className="text-emerald-400">{testResult.waMessageId}</span>
                    </p>
                  )}
                  {testResult.error && (
                    <div className="font-mono text-[11px] bg-black/40 p-2 rounded border border-red-500/20 text-red-300 break-all">
                      {testResult.error}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: ENVÍO MASIVO CSV ── */}
        <TabsContent value="masivo">
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                    Envío Masivo vía Archivo CSV: <span className="font-mono text-emerald-400">{currentTemplate.nombre}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Descarga la plantilla con las columnas exactas, llena los clientes y cárgala para enviar a cientos de personas.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCsvTemplate}
                  className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 h-8 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar Plantilla .CSV
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Instrucciones de Columnas */}
              <div className="p-3 rounded-lg bg-black/30 border border-white/5 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-400" />
                  Estructura requerida para este template:
                </p>
                <div className="font-mono text-[11px] bg-black/50 p-2 rounded border border-white/5 text-slate-400">
                  {currentTemplate.csvHeaders.join(" , ")}
                </div>
              </div>

              {/* Selector de Archivo CSV */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 bg-black/20 hover:border-emerald-500 hover:bg-emerald-500/5 cursor-pointer transition-colors text-xs text-slate-300">
                  <Upload className="h-4 w-4 text-slate-400" />
                  <span>{csvFileName ? `Archivo: ${csvFileName}` : "Hacer clic para seleccionar archivo .CSV"}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                </label>

                {csvRows.length > 0 && (
                  <Button
                    onClick={handleStartMasivo}
                    disabled={sendingMasivo}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs shrink-0 h-10 w-full sm:w-auto"
                  >
                    {sendingMasivo ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Enviar a {csvRows.length} destinatarios
                  </Button>
                )}
              </div>

              {/* Barra de Progreso Masivo */}
              {progressMasivo.total > 0 && (
                <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Progreso del Envío:</span>
                    <span className="text-white">
                      {progressMasivo.done} / {progressMasivo.total} (
                      {Math.round((progressMasivo.done / progressMasivo.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 transition-all duration-300"
                      style={{ width: `${(progressMasivo.done / progressMasivo.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="text-emerald-400">✓ Exitosos: {progressMasivo.success}</span>
                    <span className="text-red-400">✗ Fallidos: {progressMasivo.fail}</span>
                  </div>
                </div>
              )}

              {/* Vista Previa de Filas Cargadas */}
              {csvRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Registros en el archivo ({csvRows.length}):
                  </p>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-white/5 bg-black/40">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-white/5 text-slate-400 border-b border-white/5 sticky top-0">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Celular</th>
                          <th className="p-2">Parámetros (Variables)</th>
                          <th className="p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {csvRows.map((r, i) => (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                            <td className="p-2 font-mono text-white">{r.to}</td>
                            <td className="p-2 text-slate-300 truncate max-w-xs">{r.params.join(" | ")}</td>
                            <td className="p-2">
                              {r.status === "success" && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                                  <Check className="h-2.5 w-2.5" /> Enviado
                                </Badge>
                              )}
                              {r.status === "error" && (
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] gap-1" title={r.errorMessage}>
                                  <XCircle className="h-2.5 w-2.5" /> Error
                                </Badge>
                              )}
                              {r.status === "pending" && (
                                <Badge variant="outline" className="text-slate-400 text-[10px]">
                                  Pendiente
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
