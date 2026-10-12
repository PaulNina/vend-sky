import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import {
  ChatbotConfig,
  ChatbotConfigRequest,
  FaqItem,
  ProveedorIA,
  ModoRegistroWa,
} from "@/types/whatsapp";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Bot,
  MessageSquare,
  Key,
  Cpu,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Send,
  Zap,
  Globe,
  Settings,
  BookOpen,
  Info,
  Phone,
  ShieldCheck,
  ListOrdered,
  FileText,
  Camera,
  CheckCircle2,
} from "lucide-react";

export default function WhatsappConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form State - Chatbot IA
  const [activo, setActivo] = useState(true);
  const [proveedorIa, setProveedorIa] = useState<ProveedorIA>("OPENAI");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyEnmascarado, setApiKeyEnmascarado] = useState("");
  const [modelo, setModelo] = useState("gpt-4o-mini");
  const [baseUrl, setBaseUrl] = useState("");
  const [promptSistema, setPromptSistema] = useState("");
  const [temperatura, setTemperatura] = useState(0.5);
  const [maxTokens, setMaxTokens] = useState(400);
  const [umbralSimilitudFaq, setUmbralSimilitudFaq] = useState(0.7);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  // Form State - Modo de Registro de Clientes por WhatsApp
  const [modoRegistroWa, setModoRegistroWa] = useState<ModoRegistroWa>("PASO_A_PASO");
  const [cantidadFotosRequeridas, setCantidadFotosRequeridas] = useState(2);
  const [mensajeRedireccionWeb, setMensajeRedireccionWeb] = useState("");

  // Form State - Meta WhatsApp Cloud API (Guardado en BD sin redespliegue)
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waAccessTokenEnmascarado, setWaAccessTokenEnmascarado] = useState("");
  const [showWaAccessToken, setShowWaAccessToken] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waNumero1, setWaNumero1] = useState("");
  const [waPhoneNumberId2, setWaPhoneNumberId2] = useState("");
  const [waNumero2, setWaNumero2] = useState("");
  const [waVerifyToken, setWaVerifyToken] = useState("");

  // FAQ modal state
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqIndexEdit, setFaqIndexEdit] = useState<number | null>(null);
  const [faqPregunta, setFaqPregunta] = useState("");
  const [faqRespuesta, setFaqRespuesta] = useState("");
  const [faqKeywords, setFaqKeywords] = useState("");

  // FAQ Search
  const [faqSearch, setFaqSearch] = useState("");

  // Chatbot Tester State
  const [preguntaPrueba, setPreguntaPrueba] = useState("");
  const [probando, setProbando] = useState(false);
  const [respuestaPrueba, setRespuestaPrueba] = useState<string | null>(null);

  // Copy helper
  const [copiadoUrl, setCopiadoUrl] = useState(false);
  const [copiadoToken, setCopiadoToken] = useState(false);

  const [webhookPublicUrl, setWebhookPublicUrl] = useState("");
  const [verifyTokenVal, setVerifyTokenVal] = useState("");

  const mensajeWebPorDefecto = `📺 *Registro de Compra Skyworth*\n\nPara brindarte la mejor experiencia y agilidad al cargar tus fotografías, el registro de compras se realiza a través de nuestra página web oficial:\n\n👉 https://bono.skyworth.bo/registro-cliente\n\n¡Es rápido, seguro y no consume datos de WhatsApp! Al registrarte entrarás inmediatamente al sorteo por *Bs 100.000* en premios 🏆`;

  const cargarConfig = async () => {
    setLoading(true);
    try {
      const data = await apiGet<ChatbotConfig>("/whatsapp/chatbot/config");
      setActivo(data.activo);
      setProveedorIa(data.proveedorIa || "OPENAI");
      setApiKeyEnmascarado(data.apiKeyEnmascarado || "");
      setModelo(data.modelo || (data.proveedorIa === "GEMINI" ? "gemini-3.8-flash" : "gpt-4o-mini"));
      setBaseUrl(data.baseUrl || "");
      setPromptSistema(data.promptSistema || "");
      setTemperatura(data.temperatura ?? 0.5);
      setMaxTokens(data.maxTokens ?? 400);
      setUmbralSimilitudFaq(data.umbralSimilitudFaq ?? 0.7);
      setFaqs(data.faqs || []);
      setWebhookPublicUrl(data.webhookPublicUrl || "");
      setVerifyTokenVal(data.verifyToken || "");

      // Modo de registro de clientes
      setModoRegistroWa(data.modoRegistroWa || "PASO_A_PASO");
      setCantidadFotosRequeridas(data.cantidadFotosRequeridas ?? 2);
      setMensajeRedireccionWeb(data.mensajeRedireccionWeb || "");

      // Cargar credenciales WhatsApp Cloud API
      setWaAccessTokenEnmascarado(data.waAccessTokenEnmascarado || "");
      setWaPhoneNumberId(data.waPhoneNumberId || "");
      setWaNumero1(data.waNumero1 || "");
      setWaPhoneNumberId2(data.waPhoneNumberId2 || "");
      setWaNumero2(data.waNumero2 || "");
      setWaVerifyToken(data.waVerifyToken || data.verifyToken || "");
    } catch (err) {
      console.error("Error al cargar config del chatbot:", err);
      toast({
        title: "Error al cargar configuración",
        description: "No se pudo recuperar la configuración del chatbot.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfig();
  }, []);

  const handleGuardarConfig = async () => {
    setSaving(true);
    try {
      const payload: ChatbotConfigRequest = {
        activo,
        proveedorIa,
        apiKey: apiKey.trim() ? apiKey.trim() : undefined,
        modelo,
        baseUrl: baseUrl.trim() ? baseUrl.trim() : undefined,
        promptSistema,
        temperatura,
        maxTokens,
        umbralSimilitudFaq,
        faqs,
        waAccessToken: waAccessToken.trim() ? waAccessToken.trim() : undefined,
        waPhoneNumberId: waPhoneNumberId.trim(),
        waNumero1: waNumero1.trim(),
        waPhoneNumberId2: waPhoneNumberId2.trim(),
        waNumero2: waNumero2.trim(),
        waVerifyToken: waVerifyToken.trim() ? waVerifyToken.trim() : undefined,
        modoRegistroWa,
        cantidadFotosRequeridas,
        mensajeRedireccionWeb: mensajeRedireccionWeb.trim() ? mensajeRedireccionWeb.trim() : undefined,
      };

      const resp = await apiPut<ChatbotConfig>("/whatsapp/chatbot/config", payload);
      setApiKeyEnmascarado(resp.apiKeyEnmascarado || "");
      setApiKey("");
      setWaAccessTokenEnmascarado(resp.waAccessTokenEnmascarado || "");
      setWaAccessToken("");
      if (resp.verifyToken) setVerifyTokenVal(resp.verifyToken);
      if (resp.waVerifyToken) setWaVerifyToken(resp.waVerifyToken);
      if (resp.modoRegistroWa) setModoRegistroWa(resp.modoRegistroWa);
      if (resp.cantidadFotosRequeridas != null) setCantidadFotosRequeridas(resp.cantidadFotosRequeridas);
      if (resp.mensajeRedireccionWeb != null) setMensajeRedireccionWeb(resp.mensajeRedireccionWeb);

      toast({
        title: "Configuración guardada",
        description: "Los cambios de Modo de Registro, WhatsApp Cloud API y Chatbot se han actualizado en vivo.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast({
        title: "Error al guardar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  const handleOpenFaqModal = (index?: number) => {
    if (typeof index === "number") {
      const item = faqs[index];
      setFaqIndexEdit(index);
      setFaqPregunta(item.pregunta);
      setFaqRespuesta(item.respuesta);
      setFaqKeywords(item.keywords ? item.keywords.join(", ") : "");
    } else {
      setFaqIndexEdit(null);
      setFaqPregunta("");
      setFaqRespuesta("");
      setFaqKeywords("");
    }
    setShowFaqModal(true);
  };

  const handleGuardarFaq = () => {
    if (!faqPregunta.trim() || !faqRespuesta.trim()) {
      toast({
        title: "Campos incompletos",
        description: "Debes ingresar al menos una pregunta y su respuesta.",
        variant: "destructive",
      });
      return;
    }

    const keywordsArray = faqKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const nuevaFaq: FaqItem = {
      pregunta: faqPregunta.trim(),
      respuesta: faqRespuesta.trim(),
      keywords: keywordsArray,
    };

    let updatedFaqs: FaqItem[];
    if (faqIndexEdit !== null) {
      updatedFaqs = [...faqs];
      updatedFaqs[faqIndexEdit] = nuevaFaq;
    } else {
      updatedFaqs = [...faqs, nuevaFaq];
    }

    setFaqs(updatedFaqs);
    setShowFaqModal(false);
    toast({
      title: faqIndexEdit !== null ? "FAQ Actualizada" : "FAQ Agregada",
      description: "Recuerda hacer clic en 'Guardar Cambios' para persistir en el servidor.",
    });
  };

  const handleEliminarFaq = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    setFaqs(updated);
    toast({
      title: "FAQ eliminada",
      description: "Recuerda hacer clic en 'Guardar Cambios' para persistir.",
    });
  };

  const handleProbarChatbot = async () => {
    if (!preguntaPrueba.trim() || probando) return;
    setProbando(true);
    setRespuestaPrueba(null);
    try {
      const res = await apiPost<{ respuesta: string }>("/whatsapp/chatbot/probar", {
        pregunta: preguntaPrueba.trim(),
      });
      setRespuestaPrueba(res.respuesta || "Sin respuesta.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error durante la prueba";
      toast({
        title: "Error de prueba",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setProbando(false);
    }
  };

  const promptSugerido = `Eres el Asistente Virtual Oficial de SKYWORTH Bolivia.
Tu objetivo es atender a los clientes que compraron un televisor Skyworth y desean participar en las campañas de premios y el Gran Sorteo.

Instrucciones de atención:
1. Sé siempre amable, profesional, conciso y entusiasta con la marca.
2. Si el cliente pregunta sobre cómo registrarse, explícale que debe ingresar a https://bono.skyworth.bo con su número de carnet, foto de la factura y número de serie del equipo.
3. Si el cliente tiene dudas sobre si su factura fue aprobada, indícale que el equipo de revisión verifica los datos en un lapso de 24 a 48 horas hábiles.
4. Si no conoces la respuesta o el caso es muy complejo, indícale amablemente que un operador humano se contactará a la brevedad.
5. Nunca inventes información técnica o de premios que no esté confirmada.`;

  const copiarPortapapeles = (texto: string, tipo: "url" | "token") => {
    navigator.clipboard.writeText(texto);
    if (tipo === "url") {
      setCopiadoUrl(true);
      setTimeout(() => setCopiadoUrl(false), 2000);
    } else {
      setCopiadoToken(true);
      setTimeout(() => setCopiadoToken(false), 2000);
    }
    toast({ title: "Copiado", description: "Valor copiado al portapapeles." });
  };

  const faqsFiltradas = faqs.filter(
    (f) =>
      f.pregunta.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.respuesta.toLowerCase().includes(faqSearch.toLowerCase()) ||
      (f.keywords && f.keywords.some((k) => k.toLowerCase().includes(faqSearch.toLowerCase())))
  );

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
      {/* Barra de Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center space-x-3">
          <Link to="/admin/whatsapp">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Bot className="h-6 w-6 text-purple-600" />
              Configuración de Chatbot IA & WhatsApp
            </h1>
            <p className="text-xs text-muted-foreground">
              Ajusta el motor de inteligencia artificial, prompt del sistema, FAQs y webhook de Meta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/whatsapp">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MessageSquare className="h-4 w-4" />
              Ver Chat en Vivo
            </Button>
          </Link>
          <Button
            onClick={handleGuardarConfig}
            disabled={saving || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </div>
      ) : (
        <Tabs defaultValue="flujo" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="flujo" className="gap-1.5 text-xs">
              <ListOrdered className="h-4 w-4" />
              Flujo Registro
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-1.5 text-xs">
              <Cpu className="h-4 w-4" />
              Motor de IA
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-1.5 text-xs">
              <BookOpen className="h-4 w-4" />
              FAQs y Base ({faqs.length})
            </TabsTrigger>
            <TabsTrigger value="conexion" className="gap-1.5 text-xs">
              <Globe className="h-4 w-4" />
              Conexión Meta Cloud
            </TabsTrigger>
          </TabsList>

          {/* TAB: FLUJO DE REGISTRO DE CLIENTES */}
          <TabsContent value="flujo" className="space-y-6">
            {/* CARD 1: SELECCIÓN DEL MODO DE REGISTRO */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListOrdered className="h-5 w-5 text-purple-600" />
                      Modo de Registro de Clientes por WhatsApp
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Define cómo interactúa el chatbot cuando un cliente presiona "Registrar equipo" o escribe para registrarse.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600 bg-purple-500/5">
                    Modo Activo: {modoRegistroWa === "PASO_A_PASO" ? "Paso a Paso" : modoRegistroWa === "COMPACTO" ? "Mensaje Compacto" : "Solo Web"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Opción 1: Paso a Paso */}
                  <div
                    onClick={() => setModoRegistroWa("PASO_A_PASO")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                      modoRegistroWa === "PASO_A_PASO"
                        ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/30 ring-2 ring-purple-600 shadow-sm"
                        : "border-border hover:border-purple-300 hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600">
                          <ListOrdered className="h-5 w-5" />
                        </span>
                        <Badge className="bg-emerald-600 text-white text-[10px] hover:bg-emerald-700">
                          Recomendado
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">Paso a Paso (Guiado)</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Pide cada dato en un mensaje individual para máxima claridad:
                        </p>
                      </div>
                      <div className="space-y-1 text-[11px] text-muted-foreground bg-background/60 p-2.5 rounded-lg border">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> 1. Serie / TAG del televisor
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> 2. Nombre y Apellido
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> 3. Carnet de Identidad (C.I.)
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> 4. Ciudad y Tienda
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> 5. Fotos de respaldo ({cantidadFotosRequeridas})
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-purple-600 font-medium mt-3">
                      ✓ Menor tasa de error y más fácil para los clientes
                    </p>
                  </div>

                  {/* Opción 2: Compacto */}
                  <div
                    onClick={() => setModoRegistroWa("COMPACTO")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                      modoRegistroWa === "COMPACTO"
                        ? "border-blue-600 bg-blue-500/10 dark:bg-blue-950/30 ring-2 ring-blue-600 shadow-sm"
                        : "border-border hover:border-blue-300 hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          1 solo mensaje
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">Mensaje Compacto</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Tras validar el serial, solicita todos los datos personales en un único texto:
                        </p>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-muted-foreground bg-background/60 p-2.5 rounded-lg border font-mono">
                        <p className="text-[10px] text-muted-foreground italic">Ejemplo solicitado al cliente:</p>
                        <p className="text-xs font-semibold text-foreground">"Juan Pérez, 8492019, Santa Cruz, Tienda Bolívar"</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-600 font-medium mt-3">
                      ✓ Más rápido para usuarios que prefieren redactar todo de una vez
                    </p>
                  </div>

                  {/* Opción 3: Solo Web */}
                  <div
                    onClick={() => setModoRegistroWa("SOLO_WEB")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                      modoRegistroWa === "SOLO_WEB"
                        ? "border-amber-600 bg-amber-500/10 dark:bg-amber-950/30 ring-2 ring-amber-600 shadow-sm"
                        : "border-border hover:border-amber-300 hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600">
                          <Globe className="h-5 w-5" />
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          Sin chat
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">Redirección a Página Web</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          No registra en WhatsApp. Envía mensaje con el link oficial del portal:
                        </p>
                      </div>
                      <div className="space-y-1 text-[11px] text-muted-foreground bg-background/60 p-2.5 rounded-lg border">
                        <p className="font-semibold text-primary">👉 bono.skyworth.bo/registro-cliente</p>
                        <p className="text-[10px]">Los clientes realizan la subida de fotos y validación desde el navegador.</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-600 font-medium mt-3">
                      ✓ Centraliza la carga de fotos en la interfaz web oficial
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: CANTIDAD DE FOTOGRAFÍAS REQUERIDAS (Solo aplica si no es SOLO_WEB) */}
            {modoRegistroWa !== "SOLO_WEB" && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Camera className="h-5 w-5 text-emerald-600" />
                        Fotografías de Respaldo Requeridas
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Define cuántas fotografías debe enviar el cliente por WhatsApp para completar su registro y generar sus tickets.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                      {cantidadFotosRequeridas} {cantidadFotosRequeridas === 1 ? "Foto requerida" : "Fotos requeridas"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Seleccionar cantidad de fotos requeridas:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCantidadFotosRequeridas(num)}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                            cantidadFotosRequeridas === num
                              ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-600 font-bold shadow-sm"
                              : "border-border hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <span className="text-lg font-extrabold">{num}</span>
                          <span className="text-[11px]">
                            {num === 1 ? "1 Foto" : `${num} Fotos`}
                          </span>
                          {num === 2 && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                              Sugerido
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resumen dinámico de las fotos que pedirá el bot */}
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-emerald-600" />
                      Fotos que el Chatbot solicitará en este modo:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {cantidadFotosRequeridas >= 1 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-[11px]">1</span>
                          <span className="text-foreground">
                            {cantidadFotosRequeridas === 1 ? "Factura o Etiqueta TAG trasera" : "Etiqueta/TAG trasera del televisor"}
                          </span>
                        </div>
                      )}
                      {cantidadFotosRequeridas >= 2 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-[11px]">2</span>
                          <span className="text-foreground">Factura o Nota de Venta</span>
                        </div>
                      )}
                      {cantidadFotosRequeridas >= 3 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-[11px]">3</span>
                          <span className="text-foreground">Póliza de Garantía / Carnet</span>
                        </div>
                      )}
                      {cantidadFotosRequeridas >= 4 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-[11px]">4</span>
                          <span className="text-foreground">C.I. (Carnet de Identidad)</span>
                        </div>
                      )}
                      {cantidadFotosRequeridas >= 5 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-[11px]">5</span>
                          <span className="text-foreground">C.I. Reverso</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      ⚡ Al recibir la foto #{cantidadFotosRequeridas}, el registro se guardará automáticamente como <strong>PENDIENTE</strong> para revisión del supervisor y se generarán los tickets al cliente.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CARD 3: MENSAJE DE REDIRECCIÓN WEB */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      Mensaje de Redirección Web (Portal de Clientes)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Mensaje enviado al cliente para invitarlo o dirigirlo al formulario web oficial: https://bono.skyworth.bo/registro-cliente.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMensajeRedireccionWeb(mensajeWebPorDefecto)}
                    className="text-xs gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    Restaurar Mensaje Recomendado
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto del mensaje enviado por WhatsApp</Label>
                  <Textarea
                    value={mensajeRedireccionWeb}
                    onChange={(e) => setMensajeRedireccionWeb(e.target.value)}
                    placeholder={mensajeWebPorDefecto}
                    rows={5}
                    className="text-xs font-mono resize-y"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Puedes usar formato de WhatsApp (*negrita*, _cursiva_, emojis y saltos de línea). Si se deja en blanco, se enviará el mensaje predeterminado.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleGuardarConfig}
                    disabled={saving}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Configuración de Registro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 1: MOTOR DE INTELIGENCIA ARTIFICIAL */}
          <TabsContent value="ia" className="space-y-6">
            {/* Estado General */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Estado del Asistente Virtual
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Si está activo, responderá automáticamente a cualquier cliente que escriba por WhatsApp.
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold">
                      {activo ? "Habilitado" : "Pausado"}
                    </span>
                    <Switch
                      checked={activo}
                      onCheckedChange={setActivo}
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Parámetros del Modelo y API Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Proveedor y Claves */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Key className="h-4 w-4 text-purple-600" />
                    Proveedor y Credenciales de IA
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Selecciona si usarás Google Gemini, DeepSeek u OpenAI (GPT).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selector de Proveedor */}
                  <div className="space-y-2">
                    <Label className="text-xs">Proveedor de IA</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProveedorIa("GEMINI");
                          if (!modelo || modelo.includes("gpt") || modelo.includes("deepseek")) setModelo("gemini-3.8-flash");
                        }}
                        className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                          proveedorIa === "GEMINI"
                            ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/40 text-foreground ring-1 ring-purple-600"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                          <Cpu className="h-3.5 w-3.5 text-blue-500" />
                          Google Gemini
                        </span>
                        <span className="text-[10px] text-muted-foreground">3.8 Flash, 2.0, 1.5</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProveedorIa("DEEPSEEK");
                          if (!modelo || modelo.includes("gpt") || modelo.includes("gemini")) setModelo("deepseek-flash");
                        }}
                        className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                          proveedorIa === "DEEPSEEK"
                            ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/40 text-foreground ring-1 ring-purple-600"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                          <Zap className="h-3.5 w-3.5 text-cyan-500" />
                          DeepSeek
                        </span>
                        <span className="text-[10px] text-muted-foreground">Flash, V4 Pro, Chat (V3), R1</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProveedorIa("OPENAI");
                          if (!modelo || modelo.includes("gemini") || modelo.includes("deepseek")) setModelo("gpt-4o-mini");
                        }}
                        className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                          proveedorIa === "OPENAI"
                            ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/40 text-foreground ring-1 ring-purple-600"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                          OpenAI
                        </span>
                        <span className="text-[10px] text-muted-foreground">GPT-4o-mini, GPT-4o</span>
                      </button>
                    </div>
                  </div>

                  {/* Campo Modelo */}
                  <div className="space-y-2">
                    <Label className="text-xs">Nombre del Modelo</Label>
                    <Input
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      placeholder={
                        proveedorIa === "GEMINI"
                          ? "gemini-3.8-flash"
                          : proveedorIa === "DEEPSEEK"
                          ? "deepseek-flash"
                          : "gpt-4o-mini"
                      }
                      className="text-xs h-9 font-mono"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] text-muted-foreground">Sugeridos:</span>
                      {proveedorIa === "GEMINI" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setModelo("gemini-3.8-flash")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            gemini-3.8-flash
                          </button>
                          <button
                            type="button"
                            onClick={() => setModelo("gemini-2.0-flash")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            gemini-2.0-flash
                          </button>
                          <button
                            type="button"
                            onClick={() => setModelo("gemini-1.5-flash")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            gemini-1.5-flash
                          </button>
                          <button
                            type="button"
                            onClick={() => setModelo("gemini-1.5-pro")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            gemini-1.5-pro
                          </button>
                        </>
                      ) : proveedorIa === "DEEPSEEK" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setModelo("deepseek-flash")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            deepseek-flash
                          </button>
                          <button
                            type="button"
                            onClick={() => setModelo("deepseek-v4-pro")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            deepseek-v4-pro
                          </button>
                          <button
                            type="button"
                            onClick={() => setModelo("deepseek-chat")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            deepseek-chat
                          </button>
                          <button
                            type="button"
                            onClick={() => setModelo("deepseek-reasoner")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            deepseek-reasoner
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setModelo("gpt-4o-mini")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            gpt-4o-mini
                          </button>
                          <button
                            type="button"
                            onClick={() => setModelo("gpt-4o")}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border font-mono"
                          >
                            gpt-4o
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* URL Base / Endpoint (Opcional) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">URL Base / Endpoint personalizado (Opcional)</Label>
                      <span className="text-[10px] text-muted-foreground">Por defecto si se deja vacío</span>
                    </div>
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={
                        proveedorIa === "DEEPSEEK"
                          ? "https://api.deepseek.com"
                          : proveedorIa === "GEMINI"
                          ? "https://generativelanguage.googleapis.com"
                          : "https://api.openai.com/v1/chat/completions"
                      }
                      className="text-xs h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {proveedorIa === "DEEPSEEK" && "Acepta https://api.deepseek.com o https://api.deepseek.com/chat/completions (automático)"}
                      {proveedorIa === "GEMINI" && "Por defecto utiliza https://generativelanguage.googleapis.com"}
                      {proveedorIa === "OPENAI" && "Por defecto utiliza https://api.openai.com/v1/chat/completions"}
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">API Key ({proveedorIa})</Label>
                      {apiKeyEnmascarado && (
                        <span className="text-[11px] text-emerald-600 font-mono">
                          Actual: {apiKeyEnmascarado}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={apiKeyEnmascarado ? "Dejar en blanco para mantener la actual" : "Pega tu clave secreta aquí"}
                        className="text-xs h-9 pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Tu clave se almacena cifrada en la base de datos de manera segura.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Parámetros de Generación */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4 text-purple-600" />
                    Hiperparámetros de la IA
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Controla la creatividad, longitud y el umbral para priorizar las FAQs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Temperatura */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <Label>Temperatura (Creatividad)</Label>
                      <span className="font-mono font-bold text-purple-600">{temperatura}</span>
                    </div>
                    <Slider
                      value={[temperatura]}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      onValueChange={(v) => setTemperatura(v[0])}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0.0 (Más preciso / formal)</span>
                      <span>1.0 (Muy creativo)</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <Label>Límite de Tokens por Respuesta</Label>
                      <span className="font-mono font-bold text-purple-600">{maxTokens}</span>
                    </div>
                    <Slider
                      value={[maxTokens]}
                      min={100}
                      max={1000}
                      step={50}
                      onValueChange={(v) => setMaxTokens(v[0])}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      400 tokens equivalen a unos 1 o 2 párrafos concisos ideales para WhatsApp.
                    </p>
                  </div>

                  {/* Umbral FAQ */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <Label>Umbral de Similitud con FAQs</Label>
                      <span className="font-mono font-bold text-purple-600">
                        {Math.round(umbralSimilitudFaq * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[umbralSimilitudFaq]}
                      min={0.4}
                      max={0.95}
                      step={0.05}
                      onValueChange={(v) => setUmbralSimilitudFaq(v[0])}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Si la pregunta del usuario coincide en más de este porcentaje con una FAQ registrada, se responderá de inmediato con la FAQ sin consultar la API de IA.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prompt del Sistema */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                      Contexto y Prompt del Sistema
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Instrucciones maestras que le indican a la IA quién es, cómo hablar y qué responder en casos especiales.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPromptSistema(promptSugerido)}
                    className="text-xs gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Cargar Prompt Recomendado
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={promptSistema}
                  onChange={(e) => setPromptSistema(e.target.value)}
                  placeholder="Escribe el prompt maestro aquí..."
                  rows={8}
                  className="text-xs font-mono leading-relaxed resize-y"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: BASE DE CONOCIMIENTO (FAQS) & SIMULADOR */}
          <TabsContent value="faqs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Listado de FAQs (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Input
                      placeholder="Buscar en FAQs..."
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <Button
                    onClick={() => handleOpenFaqModal()}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-9"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Pregunta Frecuente
                  </Button>
                </div>

                {faqsFiltradas.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">
                      No hay preguntas frecuentes registradas aún.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Agrega respuestas predeterminadas para que el bot responda de inmediato y ahorres llamadas a la IA.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {faqsFiltradas.map((faq, index) => (
                      <Card key={index} className="border shadow-sm hover:border-purple-300 transition-colors">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-foreground">
                              {faq.pregunta}
                            </h4>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenFaqModal(index)}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEliminarFaq(index)}
                                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {faq.respuesta}
                          </p>

                          {faq.keywords && faq.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {faq.keywords.map((kw, ki) => (
                                <Badge
                                  key={ki}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground"
                                >
                                  #{kw}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Simulador Interactivo del Chatbot (5 cols) */}
              <div className="lg:col-span-5">
                <Card className="border shadow-sm sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      Simulador de Respuestas en Vivo
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Escribe como si fueras un cliente para comprobar qué respondería el chatbot (consulta FAQs y luego la IA).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Mensaje simulado del cliente</Label>
                      <Input
                        value={preguntaPrueba}
                        onChange={(e) => setPreguntaPrueba(e.target.value)}
                        placeholder="Ej: ¿Dónde puedo registrar mi factura?"
                        className="text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleProbarChatbot();
                          }
                        }}
                      />
                    </div>

                    <Button
                      onClick={handleProbarChatbot}
                      disabled={!preguntaPrueba.trim() || probando}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-9"
                    >
                      {probando ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Simular Respuesta
                    </Button>

                    {respuestaPrueba && (
                      <div className="p-3.5 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                          <span className="flex items-center gap-1">
                            <Bot className="h-3.5 w-3.5" /> Respuesta generada:
                          </span>
                        </div>
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {respuestaPrueba}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: CONEXIÓN META WHATSAPP CLOUD API */}
          <TabsContent value="conexion" className="space-y-6">
            {/* CARD 1: LÍNEAS TELEFÓNICAS (2 NÚMEROS) */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Líneas Telefónicas de Skyworth</CardTitle>
                      <CardDescription className="text-xs">
                        Configura 1 o 2 números de WhatsApp oficiales de Meta. El sistema recibirá los mensajes de ambas líneas y responderá automáticamente por la misma línea.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-xs">
                    Multi-Número Activo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* LÍNEA 1 */}
                  <div className="rounded-lg border p-4 bg-muted/20 space-y-3.5">
                    <div className="flex items-center justify-between pb-1 border-b">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        Línea Telefónica 1 (Principal)
                      </span>
                      <Badge variant="secondary" className="text-[10px]">Línea Principal</Badge>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone Number ID (ID en Meta) *</Label>
                      <Input
                        value={waPhoneNumberId}
                        onChange={(e) => setWaPhoneNumberId(e.target.value)}
                        placeholder="Ej: 1363524846838753"
                        className="text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Identificador numérico asignado en Meta WhatsApp Cloud API.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Número o Etiqueta Visible</Label>
                      <Input
                        value={waNumero1}
                        onChange={(e) => setWaNumero1(e.target.value)}
                        placeholder="Ej: +591 78901234 (Ventas Skyworth)"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* LÍNEA 2 */}
                  <div className="rounded-lg border p-4 bg-muted/20 space-y-3.5">
                    <div className="flex items-center justify-between pb-1 border-b">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                        Línea Telefónica 2 (Secundaria)
                      </span>
                      <Badge variant="secondary" className="text-[10px]">Opcional / 2do Número</Badge>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone Number ID 2 (ID en Meta)</Label>
                      <Input
                        value={waPhoneNumberId2}
                        onChange={(e) => setWaPhoneNumberId2(e.target.value)}
                        placeholder="Ej: 123456789012345"
                        className="text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Identificador numérico de tu segundo número registrado en Meta.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Número o Etiqueta Visible</Label>
                      <Input
                        value={waNumero2}
                        onChange={(e) => setWaNumero2(e.target.value)}
                        placeholder="Ej: +591 71234567 (Soporte / Atención)"
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: TOKEN DE ACCESO Y VERIFICACIÓN META */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                  Credenciales de Acceso Meta Cloud API
                </CardTitle>
                <CardDescription className="text-xs">
                  Estos datos se guardan en la base de datos y tienen efecto inmediato sin reiniciar ni redesplegar el servidor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Access Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">
                      Meta Access Token Permanente (System User Token)
                    </Label>
                    {waAccessTokenEnmascarado && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                        Token configurado: {waAccessTokenEnmascarado}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showWaAccessToken ? "text" : "password"}
                      value={waAccessToken}
                      onChange={(e) => setWaAccessToken(e.target.value)}
                      placeholder={
                        waAccessTokenEnmascarado
                          ? "Escribe un nuevo token solo si deseas reemplazar el actual"
                          : "Pega el token generado en Meta Business Manager (EAAQiu...)"
                      }
                      className="text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWaAccessToken(!showWaAccessToken)}
                      className="px-3"
                    >
                      {showWaAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Token permanente generado en <em>Meta Business Suite → Configuración del negocio → Usuarios del sistema</em> con permisos <code>whatsapp_business_messaging</code> y <code>whatsapp_business_management</code>.
                  </p>
                </div>

                {/* Verify Token */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Verify Token (Identificador de Verificación del Webhook)</Label>
                  <Input
                    value={waVerifyToken}
                    onChange={(e) => setWaVerifyToken(e.target.value)}
                    placeholder="SKYWORTH_WA_VERIFY_2026"
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Palabra secreta compartida que Meta utiliza para validar tu webhook al conectarse.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleGuardarConfig}
                    disabled={saving}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Conexión de WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: DATOS DEL WEBHOOK PARA META DEVELOPERS */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Datos de Webhook para Meta Developers Portal
                </CardTitle>
                <CardDescription className="text-xs">
                  Copia estos valores exactos en tu aplicación de desarrolladores de Facebook (Meta Developer Portal).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Webhook URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Callback URL del Webhook (Público con HTTPS)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookPublicUrl}
                      className="text-xs font-mono bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copiarPortapapeles(webhookPublicUrl, "url")}
                      className="gap-1 text-xs"
                    >
                      {copiadoUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiadoUrl ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>

                {/* Verify Token actual */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Verify Token Actual</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={waVerifyToken || verifyTokenVal}
                      className="text-xs font-mono bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copiarPortapapeles(waVerifyToken || verifyTokenVal, "token")}
                      className="gap-1 text-xs"
                    >
                      {copiadoToken ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiadoToken ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>

                {/* Guía Rápida Paso a Paso */}
                <div className="rounded-lg bg-muted/40 p-4 border space-y-3 text-xs">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-blue-500" />
                    Pasos para activar ambos números en Meta Cloud API:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed">
                    <li>
                      Ingresa a <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">developers.facebook.com</a> y abre tu aplicación de WhatsApp.
                    </li>
                    <li>
                      En el menú lateral, ve a <strong>WhatsApp</strong> → <strong>Configuración de la API</strong> o <strong>Números de teléfono</strong>.
                    </li>
                    <li>
                      Registra y verifica tu <strong>Número 1</strong> y tu <strong>Número 2</strong>. Copia sus respectivos <em>Phone number ID</em> y pégalos arriba.
                    </li>
                    <li>
                      En la sección <strong>Webhook</strong>, haz clic en <em>Editar</em>. Pega la <strong>Callback URL</strong> y el <strong>Verify Token</strong> mostrados arriba y presiona <em>Verificar y Guardar</em>.
                    </li>
                    <li>
                      En los campos de suscripción del Webhook, haz clic en <em>Administrar</em> y suscríbete al evento <strong>messages</strong>.
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Modal Agregar / Editar FAQ */}
      <Dialog open={showFaqModal} onOpenChange={setShowFaqModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {faqIndexEdit !== null ? "Editar Pregunta Frecuente" : "Nueva Pregunta Frecuente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Pregunta del cliente</Label>
              <Input
                placeholder="Ej: ¿Dónde puedo registrar mi factura?"
                value={faqPregunta}
                onChange={(e) => setFaqPregunta(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Respuesta oficial a entregar</Label>
              <Textarea
                placeholder="Ej: Puedes registrar tu factura en https://bono.skyworth.bo completando tus datos..."
                value={faqRespuesta}
                onChange={(e) => setFaqRespuesta(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Palabras clave (separadas por coma)</Label>
              <Input
                placeholder="Ej: factura, registrar, subir, comprar"
                value={faqKeywords}
                onChange={(e) => setFaqKeywords(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Las palabras clave ayudan a coincidir con el cliente incluso si no escribe la frase exacta.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowFaqModal(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleGuardarFaq}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Guardar FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
