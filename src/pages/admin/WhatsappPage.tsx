import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import {
  ConversacionResumen,
  MensajeWhatsapp,
  ChatbotConfig,
  EstadoConversacion,
  TipoAtencion,
} from "@/types/whatsapp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Bot,
  Send,
  Search,
  RefreshCw,
  Phone,
  Check,
  CheckCheck,
  Sparkles,
  ExternalLink,
  Copy,
  User,
  Sliders,
  AlertCircle,
  ArrowDown,
  ShieldAlert,
  UserCheck,
  VolumeX,
  Volume2,
  CheckCircle2,
  Clock,
  Pencil,
  X,
} from "lucide-react";

export default function WhatsappPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNumero = searchParams.get("numero");

  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [selectedNumero, setSelectedNumero] = useState<string | null>(urlNumero);
  const [mensajes, setMensajes] = useState<MensajeWhatsapp[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [enviando, setEnviando] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [chatbotActivo, setChatbotActivo] = useState<boolean>(true);
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig | null>(null);
  const [guardandoToggle, setGuardandoToggle] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreInput, setNombreInput] = useState("");

  // Estados y Refs para Control Inteligente de Scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const prevNumeroRef = useRef<string | null>(null);
  const prevMensajesLenRef = useRef<number>(0);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [nuevosMensajesCount, setNuevosMensajesCount] = useState<number>(0);

  // Cargar estado global del chatbot
  const cargarChatbotConfig = useCallback(async () => {
    try {
      const config = await apiGet<ChatbotConfig>("/whatsapp/chatbot/config");
      setChatbotConfig(config);
      setChatbotActivo(config.activo);
    } catch (err) {
      console.error("No se pudo cargar la config del chatbot:", err);
    }
  }, []);

  // Cargar lista de conversaciones
  const cargarConversaciones = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargandoLista(true);
    try {
      const data = await apiGet<ConversacionResumen[]>("/whatsapp/conversaciones");
      setConversaciones(data || []);
    } catch (err) {
      console.error("Error al cargar conversaciones:", err);
    } finally {
      if (!silencioso) setCargandoLista(false);
    }
  }, []);

  // Cargar historial de la conversación seleccionada
  const cargarMensajes = useCallback(async (numero: string, silencioso = false) => {
    if (!silencioso) setCargandoMensajes(true);
    try {
      const data = await apiGet<MensajeWhatsapp[]>(`/whatsapp/conversaciones/${numero}`);
      setMensajes(data || []);
    } catch (err) {
      console.error("Error al cargar mensajes:", err);
    } finally {
      if (!silencioso) setCargandoMensajes(false);
    }
  }, []);

  // Marcar como leído en backend y actualizar estado local
  const marcarComoLeido = useCallback(async (numero: string) => {
    try {
      await apiPost(`/whatsapp/conversaciones/${numero}/leer`, {});
      setConversaciones((prev) =>
        prev.map((c) => (c.numero === numero ? { ...c, noLeidos: 0 } : c))
      );
      // Notificar al listener global para actualizar el badge de la barra superior
      window.dispatchEvent(
        new CustomEvent("skyworth_wa_unread_cleared", { detail: { numero } })
      );
    } catch (err) {
      console.error("Error marcando mensajes como leídos:", err);
    }
  }, []);

  // Selección de conversación con limpieza inmediata de no leídos
  const handleSeleccionarConversacion = (numero: string) => {
    setSelectedNumero(numero);
    setSearchParams({ numero });
    marcarComoLeido(numero);
    setNuevosMensajesCount(0);
    setShowScrollBottom(false);
    setEditandoNombre(false);
    isNearBottomRef.current = true;
  };

  // Carga inicial
  useEffect(() => {
    cargarConversaciones();
    cargarChatbotConfig();
  }, [cargarConversaciones, cargarChatbotConfig]);

  // Si cambia el parámetro ?numero= en la URL
  useEffect(() => {
    if (urlNumero && urlNumero !== selectedNumero) {
      setSelectedNumero(urlNumero);
      marcarComoLeido(urlNumero);
    }
  }, [urlNumero, selectedNumero, marcarComoLeido]);

  // Polling periódico cada 4 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      cargarConversaciones(true);
      if (selectedNumero) {
        cargarMensajes(selectedNumero, true);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedNumero, cargarConversaciones, cargarMensajes]);

  // Cargar mensajes cuando cambia selectedNumero
  useEffect(() => {
    if (selectedNumero) {
      cargarMensajes(selectedNumero);
      marcarComoLeido(selectedNumero);
    } else {
      setMensajes([]);
    }
  }, [selectedNumero, cargarMensajes, marcarComoLeido]);

  // Detector del scroll del usuario en el contenedor de mensajes
  const handleChatScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceToBottom < 120;
    isNearBottomRef.current = isNearBottom;

    if (isNearBottom) {
      setShowScrollBottom(false);
      setNuevosMensajesCount(0);
    } else {
      setShowScrollBottom(true);
    }
  };

  // Gestión de scroll inteligente al recibir mensajes o cambiar de chat
  useEffect(() => {
    if (!selectedNumero) return;

    // 1. Cambio de conversación: siempre hacer scroll al final
    if (prevNumeroRef.current !== selectedNumero) {
      prevNumeroRef.current = selectedNumero;
      prevMensajesLenRef.current = mensajes.length;
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
      setNuevosMensajesCount(0);
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      });
      return;
    }

    // 2. Misma conversación con nuevos mensajes llegados
    if (mensajes.length > prevMensajesLenRef.current) {
      const cantidadNuevos = mensajes.length - prevMensajesLenRef.current;
      prevMensajesLenRef.current = mensajes.length;

      if (isNearBottomRef.current) {
        // El usuario está al final: hacer scroll suave
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      } else {
        // El usuario está arriba leyendo el historial antiguo: NO TOCAR EL SCROLL
        setNuevosMensajesCount((prev) => prev + cantidadNuevos);
        setShowScrollBottom(true);
      }
    } else {
      // Mismo número de mensajes (refresco normal de polling): mantener scroll intacto
      prevMensajesLenRef.current = mensajes.length;
    }
  }, [mensajes, selectedNumero]);

  // Función para forzar scroll al fondo manualmente (botón flotante)
  const scrollToBottom = () => {
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
    setNuevosMensajesCount(0);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Guardar nombre de contacto personalizado en backend
  const iniciarEdicionNombre = () => {
    setNombreInput(conversacionActual?.nombreContacto || "");
    setEditandoNombre(true);
  };

  const handleGuardarNombre = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedNumero) return;
    const clean = nombreInput.trim();
    try {
      setConversaciones((prev) =>
        prev.map((c) =>
          c.numero === selectedNumero ? { ...c, nombreContacto: clean || null } : c
        )
      );
      await apiPut(`/whatsapp/conversaciones/${selectedNumero}/nombre`, {
        nombre: clean,
      });
      toast({
        title: "Nombre guardado",
        description: clean
          ? `El contacto se guardó permanentemente como "${clean}".`
          : "Se restableció el número telefónico como nombre.",
      });
      setEditandoNombre(false);
      cargarConversaciones(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al guardar nombre";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Actualizar Estado de la conversación (ABIERTA, EN_REGISTRO, ESPERANDO_AGENTE, FINALIZADA)
  const handleActualizarEstado = async (nuevoEstado: EstadoConversacion) => {
    if (!selectedNumero) return;
    try {
      // Actualización optimista en lista de conversaciones
      setConversaciones((prev) =>
        prev.map((c) => (c.numero === selectedNumero ? { ...c, estado: nuevoEstado } : c))
      );
      await apiPut(`/whatsapp/conversaciones/${selectedNumero}/estado`, {
        estado: nuevoEstado,
      });

      const nombreEstado =
        nuevoEstado === "ESPERANDO_AGENTE"
          ? "⚠️ Esperando Agente"
          : nuevoEstado === "EN_REGISTRO"
          ? "📝 En Registro"
          : nuevoEstado === "FINALIZADA"
          ? "✅ Finalizada"
          : "🟢 Abierta";

      toast({
        title: "Estado actualizado",
        description: `La conversación ahora está en: ${nombreEstado}`,
      });
      cargarConversaciones(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar estado";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Actualizar Modo de Atención (Bot IA vs Atención Humana)
  const handleActualizarAtencion = async (
    nuevoAtendidoPor: TipoAtencion,
    nuevoBotSilenciado: boolean
  ) => {
    if (!selectedNumero) return;
    try {
      setConversaciones((prev) =>
        prev.map((c) =>
          c.numero === selectedNumero
            ? { ...c, atendidoPor: nuevoAtendidoPor, botSilenciado: nuevoBotSilenciado }
            : c
        )
      );

      await apiPut(`/whatsapp/conversaciones/${selectedNumero}/atencion`, {
        atendidoPor: nuevoAtendidoPor,
        botSilenciado: nuevoBotSilenciado,
        operador: nuevoAtendidoPor === "HUMANO" ? "Operador Panel" : undefined,
      });

      toast({
        title:
          nuevoAtendidoPor === "HUMANO"
            ? "👤 Asignado a Atención Humana"
            : "🤖 Reactivado Bot IA",
        description:
          nuevoAtendidoPor === "HUMANO"
            ? "El Bot IA ha sido silenciado para este chat. Puedes responder directamente sin respuestas automáticas."
            : "El asistente responderá automáticamente los mensajes de este cliente.",
      });
      cargarConversaciones(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar atención";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Toggle rápido global del Chatbot
  const handleToggleChatbot = async (checked: boolean) => {
    setGuardandoToggle(true);
    try {
      if (!chatbotConfig) return;
      const updated = await apiPut<ChatbotConfig>("/whatsapp/chatbot/config", {
        ...chatbotConfig,
        apiKey: undefined,
        activo: checked,
      });
      setChatbotConfig(updated);
      setChatbotActivo(updated.activo);
      toast({
        title: checked ? "Chatbot IA Activado" : "Chatbot IA Pausado",
        description: checked
          ? "El asistente responderá automáticamente los mensajes entrantes."
          : "El asistente IA está apagado; deberás responder manualmente.",
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar chatbot";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setGuardandoToggle(false);
    }
  };

  // Enviar mensaje manual desde el panel
  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedNumero || !nuevoMensaje.trim() || enviando) return;

    const textoAEnviar = nuevoMensaje.trim();
    setEnviando(true);
    try {
      const ultEntrada = [...mensajes].reverse().find(
        (m) => m.direccion === "ENTRADA" && m.phoneNumberId
      );
      const fromPhoneId = ultEntrada?.phoneNumberId;

      await apiPost("/whatsapp/enviar", {
        to: selectedNumero,
        texto: textoAEnviar,
        fromPhoneNumberId: fromPhoneId,
      });

      // Añadir mensaje optimistamente al listado
      const optimisticMsg: MensajeWhatsapp = {
        fromNumber: "Skyworth",
        toNumber: selectedNumero,
        phoneNumberId: fromPhoneId,
        direccion: "SALIDA",
        contenido: textoAEnviar,
        estado: "ENVIADO",
        esRespuestaChatbot: false,
        createdAt: new Date().toISOString(),
      };
      setMensajes((prev) => [...prev, optimisticMsg]);
      setNuevoMensaje("");

      // Forzar scroll al final al enviar mensaje propio
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });

      // Refrescar conversaciones y limpiar badge
      marcarComoLeido(selectedNumero);
      cargarConversaciones(true);
      inputRef.current?.focus();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "No se pudo enviar el mensaje";
      toast({
        title: "Error al enviar",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const copiarNumero = (num: string) => {
    navigator.clipboard.writeText(num);
    toast({
      title: "Copiado",
      description: `Número ${num} copiado al portapapeles.`,
    });
  };

  const plantillasRapidas = [
    "¡Hola! Gracias por comunicarte con Skyworth Bolivia. ¿En qué podemos ayudarte?",
    "Para validar tu compra, por favor envíanos una foto clara de tu factura y carnet de identidad.",
    "¡Felicidades! Tu registro ha sido verificado con éxito y ya estás participando en el sorteo.",
    "Un asesor humano revisará tu caso en breve. Por favor aguarda un momento.",
  ];

  // Métricas de conteo por estado
  const conteos = {
    TODOS: conversaciones.length,
    ESPERANDO_AGENTE: conversaciones.filter((c) => c.estado === "ESPERANDO_AGENTE").length,
    EN_REGISTRO: conversaciones.filter((c) => c.estado === "EN_REGISTRO").length,
    ABIERTA: conversaciones.filter((c) => !c.estado || c.estado === "ABIERTA").length,
    FINALIZADA: conversaciones.filter((c) => c.estado === "FINALIZADA").length,
  };

  // Filtrado de conversaciones por texto y estado seleccionado
  const conversacionesFiltradas = conversaciones.filter((c) => {
    const matchTexto =
      c.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.nombreContacto && c.nombreContacto.toLowerCase().includes(busqueda.toLowerCase())) ||
      (c.ultimoMensaje && c.ultimoMensaje.toLowerCase().includes(busqueda.toLowerCase()));

    if (!matchTexto) return false;

    if (filtroEstado === "TODOS") return true;
    if (filtroEstado === "ESPERANDO_AGENTE") return c.estado === "ESPERANDO_AGENTE";
    if (filtroEstado === "EN_REGISTRO") return c.estado === "EN_REGISTRO";
    if (filtroEstado === "ABIERTA") return !c.estado || c.estado === "ABIERTA";
    if (filtroEstado === "FINALIZADA") return c.estado === "FINALIZADA";
    return true;
  });

  const conversacionActual = conversaciones.find((c) => c.numero === selectedNumero);

  const formatHora = (fechaIso?: string) => {
    if (!fechaIso) return "";
    try {
      const d = new Date(fechaIso);
      const hoy = new Date();
      const esHoy =
        d.getDate() === hoy.getDate() &&
        d.getMonth() === hoy.getMonth() &&
        d.getFullYear() === hoy.getFullYear();

      if (esHoy) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return `${d.getDate()}/${d.getMonth() + 1} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.1rem)] space-y-2 p-1 md:p-1.5">
      {/* Header Superior Compacto */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card border rounded-xl px-3.5 py-2 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              WhatsApp Business Hub
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Oficial Meta
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Mensajes en vivo, atención directa y respuestas automatizadas con IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Rápido del Chatbot */}
          <div className="flex items-center space-x-2 bg-muted/60 px-3 py-1.5 rounded-lg border">
            <Bot className={`h-4 w-4 ${chatbotActivo ? "text-purple-600 animate-pulse" : "text-muted-foreground"}`} />
            <div className="text-xs">
              <span className="font-semibold block leading-tight">
                {chatbotActivo ? "Chatbot IA: Activo" : "Chatbot IA: Pausado"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {chatbotConfig?.modelo || "Modelo configurado"}
              </span>
            </div>
            <Switch
              checked={chatbotActivo}
              disabled={guardandoToggle}
              onCheckedChange={handleToggleChatbot}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          <Link to="/admin/whatsapp-config">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              Configurar Chatbot
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              cargarConversaciones();
              if (selectedNumero) cargarMensajes(selectedNumero);
            }}
            title="Actualizar ahora"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenedor Principal de Dos Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Columna Izquierda: Lista de Conversaciones y Filtros (4 cols) */}
        <Card className="md:col-span-4 flex flex-col h-full border shadow-sm overflow-hidden">
          {/* Barra de búsqueda y contador */}
          <div className="p-3 border-b space-y-2.5 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o texto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs bg-background h-9"
              />
            </div>

            {/* Filtros rápidos por estado */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                onClick={() => setFiltroEstado("TODOS")}
                className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 shrink-0 ${
                  filtroEstado === "TODOS"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Todos
                <span className="text-[10px] opacity-80">({conteos.TODOS})</span>
              </button>

              <button
                onClick={() => setFiltroEstado("ESPERANDO_AGENTE")}
                className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 shrink-0 ${
                  filtroEstado === "ESPERANDO_AGENTE"
                    ? "bg-amber-600 text-white shadow-xs"
                    : conteos.ESPERANDO_AGENTE > 0
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                ⚠️ Agente
                {conteos.ESPERANDO_AGENTE > 0 && (
                  <span className="bg-amber-700/80 text-white px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                    {conteos.ESPERANDO_AGENTE}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFiltroEstado("EN_REGISTRO")}
                className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 shrink-0 ${
                  filtroEstado === "EN_REGISTRO"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                📝 Registro
                <span className="text-[10px] opacity-80">({conteos.EN_REGISTRO})</span>
              </button>

              <button
                onClick={() => setFiltroEstado("ABIERTA")}
                className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 shrink-0 ${
                  filtroEstado === "ABIERTA"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                🟢 Abiertas
                <span className="text-[10px] opacity-80">({conteos.ABIERTA})</span>
              </button>

              <button
                onClick={() => setFiltroEstado("FINALIZADA")}
                className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 shrink-0 ${
                  filtroEstado === "FINALIZADA"
                    ? "bg-muted text-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                ✅ Finalizadas
                <span className="text-[10px] opacity-80">({conteos.FINALIZADA})</span>
              </button>
            </div>
          </div>

          {/* Listado de Contactos */}
          <ScrollArea className="flex-1">
            {cargandoLista ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                <p>Cargando conversaciones...</p>
              </div>
            ) : conversacionesFiltradas.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs font-medium">No hay conversaciones con este filtro</p>
                <p className="text-[11px] text-muted-foreground/80">
                  Cambia el filtro de estado o busca por otro número.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {conversacionesFiltradas.map((conv) => {
                  const isSelected = selectedNumero === conv.numero;
                  const esEsperando = conv.estado === "ESPERANDO_AGENTE";
                  const esEnRegistro = conv.estado === "EN_REGISTRO";
                  const esFinalizada = conv.estado === "FINALIZADA";
                  const esHumano = conv.atendidoPor === "HUMANO" || conv.botSilenciado;

                  return (
                    <div
                      key={conv.numero}
                      onClick={() => handleSeleccionarConversacion(conv.numero)}
                      className={`p-3 cursor-pointer transition-colors flex items-start gap-3 hover:bg-muted/50 relative ${
                        isSelected
                          ? "bg-emerald-500/10 border-l-4 border-l-emerald-600 dark:border-l-emerald-400"
                          : esEsperando
                          ? "bg-amber-500/5 border-l-2 border-l-amber-500"
                          : ""
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            esEsperando
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : esHumano
                              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {esEsperando ? (
                            <ShieldAlert className="h-5 w-5" />
                          ) : esHumano ? (
                            <UserCheck className="h-5 w-5" />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>

                        {/* Indicador Bot vs Humano */}
                        {esHumano ? (
                          <div
                            className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5"
                            title="Atendido por Agente Humano (Bot Pausado)"
                          >
                            <VolumeX className="h-3 w-3" />
                          </div>
                        ) : conv.ultimaEsChatbot ? (
                          <div
                            className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-0.5"
                            title="Respondido por Chatbot IA"
                          >
                            <Bot className="h-3 w-3" />
                          </div>
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-bold text-foreground truncate">
                            {conv.nombreContacto
                              ? `${conv.nombreContacto} (+${conv.numero})`
                              : `+${conv.numero}`}
                          </p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                            {formatHora(conv.fechaUltimo)}
                          </span>
                        </div>

                        {/* Badges de Estado y Atención en el ítem */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {esEsperando && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              ⚠️ Espera Agente
                            </span>
                          )}
                          {esEnRegistro && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300">
                              📝 En Registro
                            </span>
                          )}
                          {esFinalizada && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-muted text-muted-foreground">
                              ✅ Finalizada
                            </span>
                          )}
                          {esHumano && !esEsperando && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                              👤 Humano
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground truncate leading-relaxed">
                          {conv.ultimoMensaje || "Mensaje sin texto"}
                        </p>
                      </div>

                      {conv.noLeidos > 0 && (
                        <Badge className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-emerald-600 text-white text-[10px] font-bold rounded-full animate-bounce">
                          {conv.noLeidos}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Columna Derecha: Vista del Chat Activo y Controles de Atención (8 cols) */}
        <Card className="md:col-span-8 flex flex-col h-full border shadow-sm overflow-hidden relative">
          {selectedNumero ? (
            <>
              {/* Header de la Conversación Activa */}
              <div className="px-4 py-2.5 border-b bg-card flex flex-wrap items-center justify-between gap-3 shadow-sm z-10">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {editandoNombre ? (
                        <form onSubmit={handleGuardarNombre} className="flex items-center gap-1">
                          <Input
                            value={nombreInput}
                            onChange={(e) => setNombreInput(e.target.value)}
                            placeholder="Nombre del cliente..."
                            className="h-7 text-xs w-44 bg-background px-2"
                            autoFocus
                          />
                          <Button type="submit" size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white" title="Guardar">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditandoNombre(false)}
                            className="h-7 w-7 text-muted-foreground"
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <h2
                            onClick={iniciarEdicionNombre}
                            className="text-sm font-bold text-foreground cursor-pointer hover:underline flex items-center gap-1.5"
                            title="Haz clic para editar el nombre de este contacto"
                          >
                            {conversacionActual?.nombreContacto
                              ? `${conversacionActual.nombreContacto} (+${selectedNumero})`
                              : `+${selectedNumero}`}
                          </h2>
                          <button
                            onClick={iniciarEdicionNombre}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
                            title="Editar nombre del cliente"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => copiarNumero(selectedNumero)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
                            title="Copiar número"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Canal oficial WhatsApp Cloud API
                      </p>
                      {(() => {
                        const ultEntrada = [...mensajes].reverse().find((m) => m.direccion === "ENTRADA");
                        if (!ultEntrada?.toNumber) return null;
                        return (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            Línea: {ultEntrada.toNumber}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Controles de Estado de Conversación y Modo de Atención */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector de Estado */}
                  <div className="flex items-center space-x-1 bg-muted/50 p-1 rounded-lg border">
                    <span className="text-[10px] text-muted-foreground font-semibold px-1">Estado:</span>
                    <select
                      value={conversacionActual?.estado || "ABIERTA"}
                      onChange={(e) => handleActualizarEstado(e.target.value as EstadoConversacion)}
                      className="text-xs bg-background border rounded px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="ABIERTA">🟢 Abierta</option>
                      <option value="ESPERANDO_AGENTE">⚠️ Esperando Agente</option>
                      <option value="EN_REGISTRO">📝 En Registro</option>
                      <option value="FINALIZADA">✅ Finalizada</option>
                    </select>
                  </div>

                  {/* Switch / Botón Modo de Atención (Bot vs Humano) */}
                  {conversacionActual?.atendidoPor === "HUMANO" || conversacionActual?.botSilenciado ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActualizarAtencion("BOT", false)}
                      className="h-8 gap-1.5 text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                      title="Haz clic para que el bot IA vuelva a contestar automáticamente a este cliente"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Reactivar Bot IA</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActualizarAtencion("HUMANO", true)}
                      className="h-8 gap-1.5 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                      title="Silencia el bot en este chat para atender tú sin que la IA intervenga"
                    >
                      <VolumeX className="h-3.5 w-3.5 text-amber-500" />
                      <span>Pausar Bot / Atender</span>
                    </Button>
                  )}

                  <a
                    href={`https://wa.me/${selectedNumero}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">WhatsApp Web</span>
                    </Button>
                  </a>
                </div>
              </div>

              {/* Banner de Aviso de Atención Humana Activa */}
              {(conversacionActual?.estado === "ESPERANDO_AGENTE" ||
                conversacionActual?.atendidoPor === "HUMANO" ||
                conversacionActual?.botSilenciado) && (
                <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>Atención Humana activa:</strong> El Bot IA está silenciado para este chat.
                      Puedes responderle con calma desde aquí sin interferencia de la IA.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleActualizarEstado("FINALIZADA")}
                      className="underline font-semibold hover:text-amber-700 text-[11px]"
                    >
                      Marcar Finalizada
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleActualizarAtencion("BOT", false)}
                      className="underline font-semibold hover:text-amber-700 text-[11px]"
                    >
                      Reactivar Bot
                    </button>
                  </div>
                </div>
              )}

              {/* Hilo de Mensajes con Scroll Inteligente */}
              <div
                ref={scrollContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 min-h-0 bg-muted/10 p-4 overflow-y-auto relative"
              >
                {cargandoMensajes ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span>Cargando historial de mensajes...</span>
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-xs">No hay mensajes registrados con este contacto.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-2">
                    {mensajes.map((msg, idx) => {
                      const esEntrada = msg.direccion === "ENTRADA";
                      const esBot = msg.esRespuestaChatbot;

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${esEntrada ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                              esEntrada
                                ? "bg-card border text-foreground rounded-tl-sm"
                                : esBot
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm shadow-purple-500/10"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-emerald-500/10"
                            }`}
                          >
                            {/* Etiqueta del remitente */}
                            <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-85 font-medium">
                              {esEntrada ? (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <User className="h-3 w-3" /> Cliente
                                </span>
                              ) : esBot ? (
                                <span className="flex items-center gap-1 text-purple-100 font-semibold">
                                  <Bot className="h-3 w-3" /> Asistente IA (Auto)
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-emerald-100 font-semibold">
                                  <Sparkles className="h-3 w-3" /> Operador Skyworth
                                </span>
                              )}
                            </div>

                            {/* Contenido del Mensaje */}
                            <p className="whitespace-pre-wrap leading-relaxed text-[13px]">
                              {msg.contenido}
                            </p>

                            {/* Timestamp y Estado */}
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                esEntrada ? "text-muted-foreground" : "text-white/80"
                              }`}
                            >
                              <span>{formatHora(msg.createdAt)}</span>
                              {!esEntrada && (
                                <span
                                  title={
                                    msg.estado === "LEIDO"
                                      ? "Leído"
                                      : msg.estado === "ENTREGADO"
                                      ? "Entregado"
                                      : msg.estado === "FALLIDO"
                                      ? "Error"
                                      : "Enviado"
                                  }
                                >
                                  {msg.estado === "LEIDO" ? (
                                    <CheckCheck className="h-3 w-3 text-cyan-200" />
                                  ) : msg.estado === "ENTREGADO" ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : msg.estado === "FALLIDO" ? (
                                    <AlertCircle className="h-3 w-3 text-red-300" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Botón Flotante para Bajar al Fondo si el usuario subió a leer */}
                {showScrollBottom && (
                  <button
                    onClick={scrollToBottom}
                    className="sticky bottom-3 left-1/2 -translate-x-1/2 mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background shadow-lg hover:opacity-90 text-xs font-semibold transition-all animate-in fade-in zoom-in-95 z-20 cursor-pointer"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    {nuevosMensajesCount > 0 ? (
                      <span>{nuevosMensajesCount} nuevo(s) mensaje(s)</span>
                    ) : (
                      <span>Ir al final</span>
                    )}
                  </button>
                )}
              </div>

              {/* Plantillas Rápidas */}
              <div className="px-4 py-1.5 bg-card border-t flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-muted-foreground flex-shrink-0 font-medium text-[10px]">
                  Respuestas rápidas:
                </span>
                {plantillasRapidas.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setNuevoMensaje(tpl)}
                    className="flex-shrink-0 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full border border-border/50 text-[10px] truncate max-w-[180px]"
                    title={tpl}
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              {/* Compositor de Mensaje */}
              <form onSubmit={handleEnviar} className="p-3 bg-card border-t flex items-center gap-2">
                <Input
                  ref={inputRef}
                  placeholder={`Escribir respuesta a +${selectedNumero}...`}
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  disabled={enviando}
                  className="flex-1 text-xs h-10"
                />
                <Button
                  type="submit"
                  disabled={!nuevoMensaje.trim() || enviando}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 gap-1.5"
                >
                  {enviando ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs">Enviar</span>
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* Estado Vacío cuando no hay chat seleccionado */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 text-muted-foreground bg-muted/5">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  Selecciona una conversación
                </h3>
                <p className="text-xs text-muted-foreground">
                  Haz clic en cualquier contacto del panel izquierdo para ver su historial completo de mensajes o responder directamente.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Link to="/admin/whatsapp-config">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Sliders className="h-3.5 w-3.5" />
                    Ajustar Configuración y Preguntas Frecuentes
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
