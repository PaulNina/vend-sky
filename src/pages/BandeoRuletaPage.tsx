import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCities } from "@/hooks/useCities";
import { apiGet, apiPostForm, apiPostFormWithProgress } from "@/lib/api";
import { RuletaWheel, PremioItem } from "@/components/ruleta/RuletaWheel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { compressImage, formatBytes } from "@/lib/imageCompressor";
import { VersionBadge } from "@/components/common/VersionBadge";
import { ImageUploadBox } from "@/components/common/ImageUploadBox";
import { 
  CheckCircle2, 
  Sparkles, 
  Gift, 
  Camera, 
  Tv, 
  User, 
  FileText, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  ShieldCheck, 
  Trophy,
  ArrowRight,
  RefreshCw,
  Store,
  UploadCloud,
  Filter,
  Search,
  RotateCcw,
  Clock,
  Eye,
  XCircle,
  Check
} from "lucide-react";

export interface RegistroBandeoItem {
  id: number;
  nombreCliente: string;
  apellidoCliente: string;
  ci?: string;
  celular: string;
  email?: string;
  ciudad: string;
  puntoVenta?: string;
  productoModelo?: string;
  productoPulgadas?: number;
  serial: string;
  fechaCompra: string;
  estado: "PENDIENTE" | "APROBADO" | "OBSERVADO" | "RECHAZADO";
  motivoObservacion?: string;
  motivoRechazo?: string;
  fotoTag?: string;
  fotoPoliza?: string;
  fotoNota?: string;
  fotoCiAnverso?: string;
  fotoCiReverso?: string;
  createdAt: string;
  entregaId?: number;
  premioNombre?: string;
  premioImagen?: string;
  premioColor?: string;
  premioEntregado?: boolean;
  esSinPremio?: boolean;
  revertido?: boolean;
  fotoEntrega?: string;
}

export default function BandeoRuletaPage() {
  const { user } = useAuth();

  // Estados de campaña y premios
  const [campana, setCampana] = useState<{
    id: number;
    nombre: string;
    ruletaSigaParticipandoHabilitado?: boolean;
    ruletaSigaParticipandoPorcentaje?: number;
  } | null>(null);
  const [premiosDisponibles, setPremiosDisponibles] = useState<PremioItem[]>([]);
  const [loadingPremios, setLoadingPremios] = useState(true);
  const tieneSigaParticipando = !!campana?.ruletaSigaParticipandoHabilitado;

  // Formulario de registro
  const [serial, setSerial] = useState("");
  const [validatingSerial, setValidatingSerial] = useState(false);
  const [serialValidation, setSerialValidation] = useState<{
    valido: boolean;
    noParticipa?: boolean;
    serialExiste?: boolean;
    modelo?: string;
    pulgadas?: number;
    ticketsProyectados?: number;
    mensaje?: string;
    productoId?: number;
  } | null>(null);

  const [isRuletaFullscreen, setIsRuletaFullscreen] = useState(false);

  const [nombreCliente, setNombreCliente] = useState("");
  const [apellidoCliente, setApellidoCliente] = useState("");
  const [ci, setCi] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [ciudad, setCiudad] = useState("Santa Cruz");
  const [puntoVenta, setPuntoVenta] = useState("");
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split("T")[0]);

  // Los 5 respaldos obligatorios
  const [fotoTag, setFotoTag] = useState<File | null>(null);
  const [fotoPoliza, setFotoPoliza] = useState<File | null>(null);
  const [fotoNota, setFotoNota] = useState<File | null>(null);
  const [fotoCiAnverso, setFotoCiAnverso] = useState<File | null>(null);
  const [fotoCiReverso, setFotoCiReverso] = useState<File | null>(null);

  // Estados de carga de optimización individual para cada foto
  const [compressingTag, setCompressingTag] = useState(false);
  const [compressingPoliza, setCompressingPoliza] = useState(false);
  const [compressingNota, setCompressingNota] = useState(false);
  const [compressingCiAnverso, setCompressingCiAnverso] = useState(false);
  const [compressingCiReverso, setCompressingCiReverso] = useState(false);
  const [compressingEntrega, setCompressingEntrega] = useState(false);

  // Optimización inmediata de fotografías en el evento de selección
  const handlePhotoSelect = async (
    file: File,
    type: "tag" | "poliza" | "nota" | "ciAnverso" | "ciReverso" | "entrega"
  ) => {
    if (!file) return;

    if (type === "tag") setCompressingTag(true);
    else if (type === "poliza") setCompressingPoliza(true);
    else if (type === "nota") setCompressingNota(true);
    else if (type === "ciAnverso") setCompressingCiAnverso(true);
    else if (type === "ciReverso") setCompressingCiReverso(true);
    else if (type === "entrega") setCompressingEntrega(true);

    try {
      const compressed = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.75,
      });

      if (type === "tag") setFotoTag(compressed);
      else if (type === "poliza") setFotoPoliza(compressed);
      else if (type === "nota") setFotoNota(compressed);
      else if (type === "ciAnverso") setFotoCiAnverso(compressed);
      else if (type === "ciReverso") setFotoCiReverso(compressed);
      else if (type === "entrega") setFotoEntrega(compressed);
    } catch (err) {
      console.warn("Fallo al comprimir imagen en bandeo, usando archivo original:", err);
      if (type === "tag") setFotoTag(file);
      else if (type === "poliza") setFotoPoliza(file);
      else if (type === "nota") setFotoNota(file);
      else if (type === "ciAnverso") setFotoCiAnverso(file);
      else if (type === "ciReverso") setFotoCiReverso(file);
      else if (type === "entrega") setFotoEntrega(file);
    } finally {
      if (type === "tag") setCompressingTag(false);
      else if (type === "poliza") setCompressingPoliza(false);
      else if (type === "nota") setCompressingNota(false);
      else if (type === "ciAnverso") setCompressingCiAnverso(false);
      else if (type === "ciReverso") setCompressingCiReverso(false);
      else if (type === "entrega") setCompressingEntrega(false);
    }
  };

  // Estados de Ruleta
  const [showRuletaModal, setShowRuletaModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [premioGanadorId, setPremioGanadorId] = useState<number | null>(null);
  const [premioGanador, setPremioGanador] = useState<PremioItem | null>(null);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);

  // Estados de barra de estado y velocidad de subida
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState<"uploading" | "processing" | "success" | "error">("uploading");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadDetailText, setUploadDetailText] = useState("");
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");

  // Modal de confirmación de entrega con foto
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [entregaId, setEntregaId] = useState<number | null>(null);
  const [fotoEntrega, setFotoEntrega] = useState<File | null>(null);
  const [submittingEntrega, setSubmittingEntrega] = useState(false);

  // Vista activa: Registro & Ruleta vs Mis Registros
  const [vistaActiva, setVistaActiva] = useState<"registro" | "mis-registros">("registro");

  // Estados de Mis Registros y Estadísticas del impulsador
  const [registrosStats, setRegistrosStats] = useState<{
    total: number;
    pendientes: number;
    aprobados: number;
    observados: number;
    rechazados: number;
  }>({ total: 0, pendientes: 0, aprobados: 0, observados: 0, rechazados: 0 });

  const [registrosList, setRegistrosList] = useState<RegistroBandeoItem[]>([]);

  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "PENDIENTE" | "APROBADO" | "OBSERVADO" | "RECHAZADO">("TODOS");
  const [busquedaRegistros, setBusquedaRegistros] = useState("");

  // Subsanación desde Bandeo
  const [subsanarModalOpen, setSubsanarModalOpen] = useState(false);
  const [registroASubsanar, setRegistroASubsanar] = useState<RegistroBandeoItem | null>(null);
  const [subFotoTag, setSubFotoTag] = useState<File | null>(null);
  const [subFotoPoliza, setSubFotoPoliza] = useState<File | null>(null);
  const [subFotoNota, setSubFotoNota] = useState<File | null>(null);
  const [subFotoCiAnverso, setSubFotoCiAnverso] = useState<File | null>(null);
  const [subFotoCiReverso, setSubFotoCiReverso] = useState<File | null>(null);
  const [subCompressingTag, setSubCompressingTag] = useState(false);
  const [subCompressingPoliza, setSubCompressingPoliza] = useState(false);
  const [subCompressingNota, setSubCompressingNota] = useState(false);
  const [subCompressingCiAnverso, setSubCompressingCiAnverso] = useState(false);
  const [subCompressingCiReverso, setSubCompressingCiReverso] = useState(false);
  const [submittingSubsanacion, setSubmittingSubsanacion] = useState(false);

  const cargarMisRegistros = async () => {
    try {
      setLoadingRegistros(true);
      const campanaParam = campana?.id ? `?campanaId=${campana.id}` : "";
      const res = await apiGet<{
        total: number;
        pendientes: number;
        aprobados: number;
        observados: number;
        rechazados: number;
        registros: RegistroBandeoItem[];
      }>(`/bandeo/mis-registros${campanaParam}`);

      if (res) {
        setRegistrosStats({
          total: res.total || 0,
          pendientes: res.pendientes || 0,
          aprobados: res.aprobados || 0,
          observados: res.observados || 0,
          rechazados: res.rechazados || 0,
        });
        setRegistrosList(res.registros || []);
      }
    } catch (err) {
      console.error("Error al cargar mis registros de bandeo:", err);
    } finally {
      setLoadingRegistros(false);
    }
  };

  const handlePhotoSubsanarSelect = async (
    file: File,
    type: "tag" | "poliza" | "nota" | "ciAnverso" | "ciReverso"
  ) => {
    if (!file) return;
    if (type === "tag") setSubCompressingTag(true);
    else if (type === "poliza") setSubCompressingPoliza(true);
    else if (type === "nota") setSubCompressingNota(true);
    else if (type === "ciAnverso") setSubCompressingCiAnverso(true);
    else if (type === "ciReverso") setSubCompressingCiReverso(true);

    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.75 });
      if (type === "tag") setSubFotoTag(compressed);
      else if (type === "poliza") setSubFotoPoliza(compressed);
      else if (type === "nota") setSubFotoNota(compressed);
      else if (type === "ciAnverso") setSubFotoCiAnverso(compressed);
      else if (type === "ciReverso") setSubFotoCiReverso(compressed);
    } catch (err) {
      console.warn("Fallo compresión en subsanación, usando archivo original:", err);
      if (type === "tag") setSubFotoTag(file);
      else if (type === "poliza") setSubFotoPoliza(file);
      else if (type === "nota") setSubFotoNota(file);
      else if (type === "ciAnverso") setSubFotoCiAnverso(file);
      else if (type === "ciReverso") setSubFotoCiReverso(file);
    } finally {
      if (type === "tag") setSubCompressingTag(false);
      else if (type === "poliza") setSubCompressingPoliza(false);
      else if (type === "nota") setSubCompressingNota(false);
      else if (type === "ciAnverso") setSubCompressingCiAnverso(false);
      else if (type === "ciReverso") setSubCompressingCiReverso(false);
    }
  };

  const handleEnviarSubsanacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registroASubsanar) return;

    if (!subFotoTag && !subFotoPoliza && !subFotoNota && !subFotoCiAnverso && !subFotoCiReverso) {
      toast({
        title: "Seleccione al menos un documento",
        description: "Debe adjuntar al menos una fotografía corregida para subsanar la observación.",
        variant: "destructive"
      });
      return;
    }

    if (subCompressingTag || subCompressingPoliza || subCompressingNota || subCompressingCiAnverso || subCompressingCiReverso) {
      toast({
        title: "Optimizando fotografías",
        description: "Espere a que finalice la optimización de las fotos antes de enviar.",
        variant: "destructive"
      });
      return;
    }

    setSubmittingSubsanacion(true);
    try {
      const formData = new FormData();
      formData.append("registroId", String(registroASubsanar.id));
      if (subFotoTag) formData.append("fotoTag", subFotoTag, subFotoTag.name.endsWith(".jpg") ? subFotoTag.name : "foto_tag.jpg");
      if (subFotoPoliza) formData.append("fotoPoliza", subFotoPoliza, subFotoPoliza.name.endsWith(".jpg") ? subFotoPoliza.name : "foto_poliza.jpg");
      if (subFotoNota) formData.append("fotoNota", subFotoNota, subFotoNota.name.endsWith(".jpg") ? subFotoNota.name : "foto_nota.jpg");
      if (subFotoCiAnverso) formData.append("fotoCiAnverso", subFotoCiAnverso, subFotoCiAnverso.name.endsWith(".jpg") ? subFotoCiAnverso.name : "foto_ci_anverso.jpg");
      if (subFotoCiReverso) formData.append("fotoCiReverso", subFotoCiReverso, subFotoCiReverso.name.endsWith(".jpg") ? subFotoCiReverso.name : "foto_ci_reverso.jpg");

      await apiPostForm("/bandeo/subsanar-observacion", formData);

      toast({
        title: "¡Registro Subsanado!",
        description: "Los respaldos han sido corregidos. El registro volvió a estado Pendiente para revisión del Supervisor."
      });

      setSubsanarModalOpen(false);
      setRegistroASubsanar(null);
      setSubFotoTag(null);
      setSubFotoPoliza(null);
      setSubFotoNota(null);
      setSubFotoCiAnverso(null);
      setSubFotoCiReverso(null);

      await cargarMisRegistros();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al subsanar registro";
      toast({ title: "Error al subsanar", description: message, variant: "destructive" });
    } finally {
      setSubmittingSubsanacion(false);
    }
  };

  // Cargar campaña y premios disponibles para este impulsador
  const cargarPremios = async () => {
    try {
      setLoadingPremios(true);
      let campanaData: {
        id: number;
        nombre: string;
        ruletaSigaParticipandoHabilitado?: boolean;
        ruletaSigaParticipandoPorcentaje?: number;
      } | null = null;

      try {
        const campanaRes = await apiGet<{
          activa: boolean;
          campana: {
            id: number;
            nombre: string;
            ruletaSigaParticipandoHabilitado?: boolean;
            ruletaSigaParticipandoPorcentaje?: number;
          };
        }>("/cliente/campana-activa");
        if (campanaRes && campanaRes.campana) {
          campanaData = campanaRes.campana;
          setCampana(campanaData);
        }
      } catch (e) {
        console.warn("No se pudo obtener campaña activa:", e);
      }

      const campanaParam = campanaData?.id ? `?campanaId=${campanaData.id}` : "";
      const premiosRes = await apiGet<PremioItem[]>(`/bandeo/premios-disponibles${campanaParam}`);
      setPremiosDisponibles(premiosRes || []);
    } catch (err) {
      console.error("Error al cargar premios del impulsador:", err);
    } finally {
      setLoadingPremios(false);
    }
  };

  const { cities: dbCities } = useCities(true);
  const [todasLasTiendas, setTodasLasTiendas] = useState<Array<{
    id: number;
    nombre: string;
    codigo?: string;
    departamento?: string;
    ciudad?: { id: number; nombre: string; departamento?: string };
  }>>([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [tiendaManual, setTiendaManual] = useState(false);

  useEffect(() => {
    cargarPremios();
    cargarMisRegistros();
    setLoadingTiendas(true);
    apiGet<Array<{
      id: number;
      nombre: string;
      codigo?: string;
      departamento?: string;
      ciudad?: { id: number; nombre: string; departamento?: string };
    }>>("/tiendas/active")
      .then(data => setTodasLasTiendas(data || []))
      .catch(() => setTodasLasTiendas([]))
      .finally(() => setLoadingTiendas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listaCiudades = useMemo(() => {
    const DEFAULT_CITIES = [
      "Santa Cruz", "La Paz", "Cochabamba", "El Alto", "Oruro",
      "Potosí", "Sucre", "Tarija", "Beni", "Pando"
    ];
    if (dbCities && dbCities.length > 0) {
      const names = dbCities.map(c => c.nombre).filter(Boolean);
      return Array.from(new Set([...names, ...DEFAULT_CITIES]));
    }
    return DEFAULT_CITIES;
  }, [dbCities]);

  const tiendasDeLaCiudad = useMemo(() => {
    if (!ciudad) return todasLasTiendas;
    const c = ciudad.trim().toLowerCase();
    return todasLasTiendas.filter((t) => {
      const cNombre = t.ciudad?.nombre?.trim().toLowerCase() || "";
      const cDepto = t.ciudad?.departamento?.trim().toLowerCase() || "";
      const tDepto = t.departamento?.trim().toLowerCase() || "";

      if (cNombre === c) return true;
      if (c === "el alto") return cNombre === "el alto";
      if (c === "la paz") return cNombre === "la paz";
      if (cDepto === c || tDepto === c) return true;

      if (c === "cochabamba") {
        return cNombre === "cochabamba" || cNombre === "cercado" || cNombre === "quillacollo" || 
               cNombre === "sacaba" || cNombre === "tiquipaya" || cDepto === "cochabamba";
      }

      if (c === "santa cruz") {
        return cNombre === "santa cruz" || cNombre === "montero" || cNombre === "warnes" || 
               cNombre === "camiri" || cDepto === "santa cruz";
      }

      return false;
    });
  }, [todasLasTiendas, ciudad]);

  const handleCiudadChange = (nuevaCiudad: string) => {
    setCiudad(nuevaCiudad);
    const c = nuevaCiudad.trim().toLowerCase();
    const siguePerteneciendo = todasLasTiendas.some(t => {
      if (t.nombre.toLowerCase() !== puntoVenta.toLowerCase()) return false;
      const cNombre = t.ciudad?.nombre?.trim().toLowerCase() || "";
      const cDepto = t.ciudad?.departamento?.trim().toLowerCase() || "";
      return cNombre === c || cDepto === c;
    });
    if (!siguePerteneciendo && !tiendaManual) {
      setPuntoVenta("");
    }
  };

  // Validación de serial en tiempo real
  const handleValidarSerial = async () => {
    if (!serial.trim()) {
      toast({ title: "Serial requerido", description: "Por favor, ingrese el número de serial o TAG.", variant: "destructive" });
      return;
    }
    setValidatingSerial(true);
    setSerialValidation(null);
    try {
      const campanaParam = campana?.id ? `?campanaId=${campana.id}` : "";
      const res = await apiGet<{
        valido: boolean;
        noParticipa?: boolean;
        serialExiste?: boolean;
        modelo?: string;
        pulgadas?: number;
        ticketsProyectados?: number;
        mensaje?: string;
        productoId?: number;
      }>(`/cliente/validar-serial/${encodeURIComponent(serial.trim())}${campanaParam}`);
      
      setSerialValidation(res);
      if (res.valido) {
        toast({ title: "Serial Legítimo", description: res.mensaje || "Serial validado con éxito." });
      } else if (res.noParticipa) {
        toast({ title: "Producto Fuera de Campaña", description: res.mensaje || "Este producto no participa en la campaña.", variant: "destructive" });
      } else {
        toast({ title: "Serial Observado", description: res.mensaje || "El serial no está disponible.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo conectar al servidor.";
      toast({ title: "Error al validar", description: message, variant: "destructive" });
    } finally {
      setValidatingSerial(false);
    }
  };

  const handleToggleRuletaFullscreen = () => {
    setIsRuletaFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

  // Validación, subida con barra de estado y preparación de ruleta
  const ejecutarSubidaYPrepararRuleta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Si escribió un serial pero no presionó "Validar Serial", auto-validarlo en este momento
    let currentValidation = serialValidation;
    if ((!currentValidation || !currentValidation.valido) && serial.trim()) {
      try {
        setValidatingSerial(true);
        const campanaParam = campana?.id ? `?campanaId=${campana.id}` : "";
        const res = await apiGet<{
          valido: boolean;
          modelo?: string;
          pulgadas?: number;
          ticketsProyectados?: number;
          mensaje?: string;
          productoId?: number;
          noParticipa?: boolean;
          serialExiste?: boolean;
        }>(`/cliente/validar-serial/${encodeURIComponent(serial.trim())}${campanaParam}`);
        currentValidation = res;
        setSerialValidation(res);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
        toast({ title: "Error al validar serial", description: message, variant: "destructive" });
        return;
      } finally {
        setValidatingSerial(false);
      }
    }

    if (!serial.trim()) {
      toast({ title: "Serial requerido", description: "Debe ingresar el número de TAG / Serie en el Paso 1.", variant: "destructive" });
      document.getElementById("paso1-serial")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!currentValidation?.valido) {
      toast({ 
        title: "Serial no válido o no verificado", 
        description: currentValidation?.mensaje || "El serial ingresado no figura o está restringido. Revise el TAG en el Paso 1.", 
        variant: "destructive" 
      });
      document.getElementById("paso1-serial")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!nombreCliente.trim() || !apellidoCliente.trim() || !celular.trim()) {
      toast({ title: "Datos del cliente incompletos", description: "Complete los nombres, apellidos y celular del comprador.", variant: "destructive" });
      return;
    }

    if (compressingTag || compressingPoliza || compressingNota || compressingCiAnverso || compressingCiReverso) {
      toast({ 
        title: "Optimizando fotografías", 
        description: "Por favor espere un momento a que finalice la optimización de las fotos antes de proceder a la ruleta.", 
        variant: "destructive" 
      });
      return;
    }

    const fotosFaltantes: string[] = [];
    if (!fotoTag) fotosFaltantes.push("1. TAG");
    if (!fotoPoliza) fotosFaltantes.push("2. Póliza");
    if (!fotoNota) fotosFaltantes.push("3. Factura/Nota");

    if (fotosFaltantes.length > 0) {
      toast({ 
        title: "Respaldos incompletos", 
        description: `Debe adjuntar las fotografías obligatorias (TAG, Póliza y Factura/Nota). Falta: ${fotosFaltantes.join(", ")}.`, 
        variant: "destructive" 
      });
      return;
    }

    if (premiosDisponibles.length === 0 && !tieneSigaParticipando) {
      toast({ 
        title: "Sin stock de premios en tu inventario", 
        description: "Tu usuario no cuenta con premios con saldo disponible para girar la ruleta y la opción 'Siga Participando' no está habilitada. Solicita asignación al Administrador.", 
        variant: "destructive" 
      });
      return;
    }

    // Iniciar modal de progreso y monitoreo de velocidad
    setUploadModalOpen(true);
    setUploadState("uploading");
    setUploadPercent(0);
    setUploadSpeed("");
    setUploadDetailText("Iniciando subida segura de respaldos...");
    setUploadErrorMessage("");
    setSubmittingRegistration(true);

    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append("campanaId", String(campana?.id || 1));
      formData.append("nombreCliente", nombreCliente.trim());
      formData.append("apellidoCliente", apellidoCliente.trim());
      formData.append("ci", ci.trim());
      formData.append("celular", celular.trim());
      if (email.trim()) formData.append("email", email.trim());
      formData.append("ciudad", ciudad);
      if (puntoVenta.trim()) formData.append("puntoVenta", puntoVenta.trim());
      if (serialValidation?.productoId) formData.append("productoId", String(serialValidation.productoId));
      if (serialValidation?.modelo) formData.append("productoModelo", serialValidation.modelo);
      if (serialValidation?.pulgadas) formData.append("productoPulgadas", String(serialValidation.pulgadas));
      formData.append("serial", serial.trim().toUpperCase());
      formData.append("fechaCompra", fechaCompra);

      // Las fotos ya están 100% optimizadas individualmente al seleccionarlas (~300KB c/u)
      if (fotoTag) formData.append("fotoTag", fotoTag, fotoTag.name.endsWith(".jpg") ? fotoTag.name : "foto_tag.jpg");
      if (fotoPoliza) formData.append("fotoPoliza", fotoPoliza, fotoPoliza.name.endsWith(".jpg") ? fotoPoliza.name : "foto_poliza.jpg");
      if (fotoNota) formData.append("fotoNota", fotoNota, fotoNota.name.endsWith(".jpg") ? fotoNota.name : "foto_nota.jpg");
      if (fotoCiAnverso) formData.append("fotoCiAnverso", fotoCiAnverso, fotoCiAnverso.name.endsWith(".jpg") ? fotoCiAnverso.name : "foto_ci_anverso.jpg");
      if (fotoCiReverso) formData.append("fotoCiReverso", fotoCiReverso, fotoCiReverso.name.endsWith(".jpg") ? fotoCiReverso.name : "foto_ci_reverso.jpg");

      const res = await apiPostFormWithProgress<{
        success: boolean;
        registroId: number;
        entregaId?: number | null;
        resultado?: string;
        premioGanado?: {
          id: number;
          nombre: string;
          descripcion?: string;
          colorHex?: string;
          esSinPremio?: boolean;
        };
      }>("/bandeo/registro-y-ruleta", formData, (prog) => {
        setUploadPercent(prog.percent);
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBytes = elapsedSec > 0.1 ? prog.loaded / elapsedSec : 0;
        if (speedBytes > 0) {
          setUploadSpeed(`${formatBytes(speedBytes)}/s`);
        }
        if (prog.percent < 100) {
          setUploadDetailText(`${formatBytes(prog.loaded)} de ${formatBytes(prog.total)} (${prog.percent}%)`);
        } else {
          setUploadState("processing");
          setUploadDetailText("Verificando registro y configurando ruleta de premios...");
        }
      });

      if (res.success && res.premioGanado) {
        setEntregaId(res.entregaId ?? null);
        const winnerId = (res.resultado === "SIGA_PARTICIPANDO" || res.premioGanado.esSinPremio || !res.entregaId)
          ? -1
          : res.premioGanado.id;
        setPremioGanadorId(winnerId);
        setUploadPercent(100);
        setUploadState("success");
        setUploadDetailText("¡Respaldos verificados exitosamente!");

        // Breve transición visual y apertura de la ruleta de premios
        setTimeout(() => {
          setUploadModalOpen(false);
          setShowRuletaModal(true);
        }, 700);
      }
    } catch (err: unknown) {
      setUploadState("error");
      let message = err instanceof Error ? err.message : "Error al procesar el registro.";
      if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
        message = "Problema de red o conexión inestable al conectar con el servidor. Por favor, reintenta la subida.";
      }
      setUploadErrorMessage(message);
    } finally {
      setSubmittingRegistration(false);
    }
  };

  // Giro instantáneo en la ruleta (ya registrado y seguro, no requiere llamadas de red lentas)
  const handleSpinRequest = () => {
    if (isSpinning) return;
    setIsSpinning(true);
  };

  const handleSpinComplete = (winner: PremioItem) => {
    setIsSpinning(false);
    setPremioGanador(winner);
    const isSiga = !!winner.esSinPremio || (winner.nombre || "").toLowerCase().includes("siga");

    setTimeout(() => {
      setShowRuletaModal(false);
      if (isSiga) {
        toast({
          title: "¡Registro Completado!",
          description: "El cliente ya está participando en el Gran Sorteo Nacional. No requiere foto de entrega física.",
        });
        resetFormulario();
        cargarPremios();
        cargarMisRegistros();
      } else {
        setShowEntregaModal(true);
        cargarPremios(); // Refrescar inventario del impulsador
        cargarMisRegistros();
      }
    }, 2800);
  };

  const [formKey, setFormKey] = useState(0);

  const resetFormulario = () => {
    setSerial("");
    setValidatingSerial(false);
    setSerialValidation(null);
    setNombreCliente("");
    setApellidoCliente("");
    setCi("");
    setCelular("");
    setEmail("");
    setPuntoVenta("");
    setFotoTag(null);
    setFotoPoliza(null);
    setFotoNota(null);
    setFotoCiAnverso(null);
    setFotoCiReverso(null);
    setFotoEntrega(null);
    setCompressingTag(false);
    setCompressingPoliza(false);
    setCompressingNota(false);
    setCompressingCiAnverso(false);
    setCompressingCiReverso(false);
    setCompressingEntrega(false);
    setUploadModalOpen(false);
    setUploadPercent(0);
    setUploadSpeed("");
    setUploadDetailText("");
    setUploadErrorMessage("");
    setPremioGanador(null);
    setPremioGanadorId(null);
    setEntregaId(null);
    setShowRuletaModal(false);
    setShowEntregaModal(false);
    setIsSpinning(false);
    // Cambiar la clave desmonta y resetea todos los inputs de archivos nativos del navegador a blanco
    setFormKey((prev) => prev + 1);
  };

  // Confirmar entrega con foto
  const handleConfirmarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregaId || !fotoEntrega) {
      toast({ title: "Foto requerida", description: "Debe cargar la fotografía de entrega del premio.", variant: "destructive" });
      return;
    }

    if (compressingEntrega) {
      toast({ title: "Optimizando fotografía", description: "Espere un momento a que finalice la optimización de la foto antes de confirmar.", variant: "destructive" });
      return;
    }

    setSubmittingEntrega(true);
    try {
      const formData = new FormData();
      formData.append("entregaId", String(entregaId));
      formData.append("fotoEntrega", fotoEntrega, fotoEntrega.name.endsWith(".jpg") ? fotoEntrega.name : "foto_entrega.jpg");

      await apiPostForm("/bandeo/confirmar-entrega", formData);
      toast({ title: "¡Entrega Confirmada!", description: "Premio entregado y stock actualizado exitosamente." });
      
      // Limpiar formulario por completo para el siguiente cliente
      resetFormulario();
      cargarPremios();
      cargarMisRegistros();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al confirmar entrega";
      toast({ title: "Error al confirmar", description: message, variant: "destructive" });
    } finally {
      setSubmittingEntrega(false);
    }
  };

  const FotoUploadCard = ({
    title,
    subtitle,
    file,
    isCompressing,
    onSelect,
    onRemove,
    accept = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp",
  }: {
    title: string;
    subtitle: string;
    file: File | null;
    isCompressing: boolean;
    onSelect: (f: File) => void;
    onRemove?: () => void;
    accept?: string;
    capture?: "user" | "environment";
  }) => (
    <ImageUploadBox
      title={title}
      subtitle={subtitle}
      file={file}
      isCompressing={isCompressing}
      onSelect={onSelect}
      onRemove={onRemove}
      accept={accept}
    />
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Bandeo & Ruleta de Premios
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Registro Cliente Final & Ruleta Inmediata
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Campaña: <span className="text-amber-300 font-semibold">{campana?.nombre || "Campaña Activa Skyworth"}</span> · Impulsador: <span className="text-slate-200">{user?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <VersionBadge compact className="mr-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRuletaModal(true)}
            className="border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Ver Ruleta
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFormulario}
            className="border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-xs"
          >
            Nuevo Registro
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cargarPremios}
            className="border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingPremios ? "animate-spin" : ""}`} />
            Stock ({premiosDisponibles.reduce((acc, p) => acc + (p.saldoDisponible || 0), 0)} u.)
          </Button>
        </div>
      </div>

      {/* Selector de Vistas: Registro & Ruleta vs Mis Registros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setVistaActiva("registro")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              vistaActiva === "registro"
                ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Nueva Venta & Ruleta
          </button>
          <button
            type="button"
            onClick={() => {
              setVistaActiva("mis-registros");
              cargarMisRegistros();
            }}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              vistaActiva === "mis-registros"
                ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            Mis Registros Bandeo
            {registrosStats.total > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                vistaActiva === "mis-registros" ? "bg-slate-950 text-amber-300" : "bg-white/10 text-slate-300"
              }`}>
                {registrosStats.total}
              </span>
            )}
            {registrosStats.observados > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white animate-pulse">
                {registrosStats.observados} Obs!
              </span>
            )}
          </button>
        </div>

        {vistaActiva === "mis-registros" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cargarMisRegistros}
            disabled={loadingRegistros}
            className="text-slate-300 hover:bg-white/5 text-xs rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingRegistros ? "animate-spin" : ""}`} />
            Actualizar Lista
          </Button>
        )}
      </div>

      {vistaActiva === "registro" && (
        <>
          {/* Alerta de inventario si no hay stock */}
          {!loadingPremios && premiosDisponibles.length === 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-amber-200">Sin stock de premios de ruleta asignados a tu usuario</p>
                <p className="text-amber-300/80">
                  Actualmente no cuentas con saldo disponible de premios en tu inventario para entregar físicamente al cliente en la ruleta.
                  Puedes consultar tus asignaciones en el menú <span className="font-bold text-amber-300">"Mi Stock Premios"</span> o solicitar recarga de inventario al Administrador.
                </p>
              </div>
            </div>
          )}

          <form key={formKey} onSubmit={ejecutarSubidaYPrepararRuleta} className="space-y-6">
        {/* Paso 1: Validación del Serial */}
        <Card id="paso1-serial" className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Tv className="w-5 h-5 text-amber-400" />
              Paso 1: Serial del Televisor / TAG
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Valide el número de serie para autodetección de modelo y tickets otorgados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ej: SKY-55G22-778219"
                  value={serial}
                  onChange={(e) => {
                    setSerial(e.target.value.toUpperCase());
                    setSerialValidation(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleValidarSerial();
                    }
                  }}
                  className="font-mono text-base tracking-wider uppercase bg-slate-950/60 border-white/10 h-12 rounded-xl"
                />
              </div>
              <Button
                type="button"
                onClick={handleValidarSerial}
                disabled={validatingSerial || !serial.trim()}
                className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                {validatingSerial ? <Loader2 className="w-5 h-5 animate-spin" /> : "Validar Serial"}
              </Button>
            </div>

            {serialValidation && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                serialValidation.valido 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : serialValidation.noParticipa
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}>
                {serialValidation.valido ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                ) : serialValidation.noParticipa ? (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                )}
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-semibold">{serialValidation.mensaje}</p>
                  {serialValidation.noParticipa && serialValidation.modelo && (
                    <p className="text-amber-200/90 text-xs">
                      El producto fue detectado como <span className="font-bold text-white">{serialValidation.modelo}</span> ({serialValidation.pulgadas}"). Para ingresar a la ruleta o sorteos, el producto debe pertenecer a la campaña activa.
                    </p>
                  )}
                  {serialValidation.valido && (
                    <p className="text-slate-300">
                      Modelo: <span className="font-bold text-white">{serialValidation.modelo}</span> ({serialValidation.pulgadas}") · Tickets para sorteos: <span className="font-bold text-amber-400 text-base">{serialValidation.ticketsProyectados} ticket(s)</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paso 2: Datos del Comprador */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <User className="w-5 h-5 text-amber-400" />
              Paso 2: Datos del Cliente Final
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Datos que quedarán vinculados a los tickets para los sorteos quincenales y el sorteo final de Bs. 100.000.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-400">Nombres *</Label>
              <Input
                required
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value.toUpperCase())}
                placeholder="JUAN CARLOS"
                className="uppercase bg-slate-950/60 border-white/10 mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Apellidos *</Label>
              <Input
                required
                value={apellidoCliente}
                onChange={(e) => setApellidoCliente(e.target.value.toUpperCase())}
                placeholder="PÉREZ MAMANI"
                className="uppercase bg-slate-950/60 border-white/10 mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Cédula de Identidad (C.I.) (Opcional)</Label>
              <Input
                value={ci}
                onChange={(e) => setCi(e.target.value.toUpperCase())}
                placeholder="1234567 SC"
                className="uppercase bg-slate-950/60 border-white/10 mt-1 rounded-xl"
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
                className="bg-slate-950/60 border-white/10 mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Correo Electrónico (Opcional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@gmail.com"
                className="bg-slate-950/60 border-white/10 mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Ciudad *</Label>
              <select
                value={ciudad}
                onChange={(e) => handleCiudadChange(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 h-10 text-sm text-slate-200 mt-1 focus:border-primary focus:outline-none"
              >
                {listaCiudades.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-primary" />
                  Punto de Venta / Tienda (Opcional)
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    const nuevo = !tiendaManual;
                    setTiendaManual(nuevo);
                    setPuntoVenta("");
                  }}
                  className="text-[11px] text-primary hover:underline transition-colors"
                >
                  {tiendaManual ? `← Elegir de la lista de ${ciudad}` : "+ Escribir otra tienda"}
                </button>
              </div>

              {!tiendaManual ? (
                <div className="relative mt-1">
                  <select
                    value={puntoVenta}
                    onChange={(e) => {
                      if (e.target.value === "__OTRA__") {
                        setTiendaManual(true);
                        setPuntoVenta("");
                      } else {
                        setPuntoVenta(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 h-10 text-sm text-slate-200 focus:border-primary focus:outline-none"
                  >
                    <option value="" className="bg-slate-900 text-slate-500">
                      {loadingTiendas
                        ? "Cargando tiendas..."
                        : tiendasDeLaCiudad.length > 0
                          ? `-- (Opcional) Seleccione tienda de ${ciudad} (${tiendasDeLaCiudad.length} disponibles) --`
                          : `-- Sin tiendas en ${ciudad} (opcional) --`}
                    </option>
                    {tiendasDeLaCiudad.map((t) => (
                      <option key={t.id} value={t.nombre} className="bg-slate-900 text-slate-200">
                        {t.nombre} {t.codigo ? `(${t.codigo})` : ""} {t.ciudad?.nombre && t.ciudad.nombre.toLowerCase() !== ciudad.toLowerCase() ? `· [${t.ciudad.nombre}]` : ""}
                      </option>
                    ))}
                    <option value="__OTRA__" className="bg-slate-900 text-amber-400 font-semibold">
                      + Escribir otro punto de venta / tienda no listada...
                    </option>
                  </select>
                  {tiendasDeLaCiudad.length > 0 && !puntoVenta && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {tiendasDeLaCiudad.length} tiendas autorizadas en <span className="text-slate-300 font-medium">{ciudad}</span> (Dato opcional).
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-1">
                  <Input
                    value={puntoVenta}
                    onChange={(e) => setPuntoVenta(e.target.value.toUpperCase())}
                    placeholder={`Escriba el nombre de la tienda o punto de venta en ${ciudad} (Opcional)...`}
                    className="uppercase bg-slate-950/60 border-primary/30 rounded-xl text-white placeholder:text-slate-500"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ingresando tienda personalizada para la ciudad de <span className="text-primary font-semibold">{ciudad}</span> (Opcional).
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-slate-400">Fecha de Compra *</Label>
              <Input
                type="date"
                required
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="bg-slate-950/60 border-white/10 mt-1 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Paso 3: Respaldos de Compra */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Camera className="w-5 h-5 text-amber-400" />
              Paso 3: Carga de Respaldos de Compra
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              TAG, Póliza de Garantía y Factura/Nota son obligatorios. Las fotos de Carnet son opcionales.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FotoUploadCard
              title="1. Foto TAG (Etiqueta Trasera) *"
              subtitle="Debe verse claro el código de barras y número de serie."
              file={fotoTag}
              isCompressing={compressingTag}
              onSelect={(file) => handlePhotoSelect(file, "tag")}
              onRemove={() => setFotoTag(null)}
            />

            <FotoUploadCard
              title="2. Foto Póliza de Garantía *"
              subtitle="Póliza oficial debidamente sellada por la tienda."
              file={fotoPoliza}
              isCompressing={compressingPoliza}
              onSelect={(file) => handlePhotoSelect(file, "poliza")}
              onRemove={() => setFotoPoliza(null)}
            />

            <FotoUploadCard
              title="3. Foto Factura o Nota de Venta *"
              subtitle="Recibo, comprobante de compra o factura."
              file={fotoNota}
              isCompressing={compressingNota}
              onSelect={(file) => handlePhotoSelect(file, "nota")}
              onRemove={() => setFotoNota(null)}
            />

            <FotoUploadCard
              title="4. Carnet de Identidad (Anverso) (Opcional)"
              subtitle="Frente del documento con fotografía y nombres."
              file={fotoCiAnverso}
              isCompressing={compressingCiAnverso}
              onSelect={(file) => handlePhotoSelect(file, "ciAnverso")}
              onRemove={() => setFotoCiAnverso(null)}
            />

            <FotoUploadCard
              title="5. Carnet de Identidad (Reverso) (Opcional)"
              subtitle="Reverso con número de serie y huella/firma."
              file={fotoCiReverso}
              isCompressing={compressingCiReverso}
              onSelect={(file) => handlePhotoSelect(file, "ciReverso")}
              onRemove={() => setFotoCiReverso(null)}
            />
          </CardContent>
        </Card>

        {/* Checklist de Estado del Formulario */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Estado de Requisitos para Girar la Ruleta:
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              serialValidation?.valido ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
            }`}>
              {serialValidation?.valido ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
              {serialValidation?.valido ? "Serial Validado" : (serial.trim() ? "Serial sin Validar" : "Serial Requerido")}
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              nombreCliente.trim() && apellidoCliente.trim() && celular.trim() ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
            }`}>
              {nombreCliente.trim() && apellidoCliente.trim() && celular.trim() ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
              {nombreCliente.trim() && apellidoCliente.trim() && celular.trim() ? "Cliente Completo" : "Datos Cliente"}
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              puntoVenta.trim() ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-400 border border-white/10"
            }`}>
              {puntoVenta.trim() ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Check className="w-3.5 h-3.5 text-slate-500" />}
              {puntoVenta.trim() ? `Tienda: ${puntoVenta}` : "Tienda (Opcional)"}
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              fotoTag && fotoPoliza && fotoNota && !compressingTag && !compressingPoliza && !compressingNota
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
            }`}>
              {fotoTag && fotoPoliza && fotoNota && !compressingTag && !compressingPoliza && !compressingNota ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (compressingTag || compressingPoliza || compressingNota) ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
              {(compressingTag || compressingPoliza || compressingNota)
                ? "Optimizando fotos..."
                : `Fotos obligatorias: ${[fotoTag, fotoPoliza, fotoNota].filter(Boolean).length}/3`}
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              premiosDisponibles.length > 0 || tieneSigaParticipando ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
            }`}>
              {premiosDisponibles.length > 0 || tieneSigaParticipando ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
              {premiosDisponibles.length > 0 
                ? `Stock Ruleta (${premiosDisponibles.length} premios)` 
                : tieneSigaParticipando 
                  ? "Ruleta Activa (Siga Participando)" 
                  : "Sin Stock Ruleta"}
            </span>
          </div>
        </div>

        {/* Botón de Enviar a Ruleta */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={submittingRegistration || validatingSerial}
            className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-lg tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
          >
            {validatingSerial ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                VALIDANDO SERIAL...
              </>
            ) : submittingRegistration ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                SUBIENDO FOTOS Y PREPARANDO RULETA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                PROCEDER A LA RULETA DE PREMIOS
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  )}

      {vistaActiva === "mis-registros" && (
        <div className="space-y-6">
          {/* Tarjetas de Estadísticas de Procesos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Total Registros</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
                {registrosStats.total}
              </p>
              <span className="text-[10px] text-slate-500 mt-1">Realizados por ti</span>
            </div>

            {/* Pendientes */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-xs font-semibold">Pendientes</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-2 font-mono">
                {registrosStats.pendientes}
              </p>
              <span className="text-[10px] text-amber-400/80 mt-1">En revisión supervisor</span>
            </div>

            {/* Aprobados */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-xs font-semibold">Aprobados</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-2 font-mono">
                {registrosStats.aprobados}
              </p>
              <span className="text-[10px] text-emerald-400/80 mt-1">Tickets habilitados</span>
            </div>

            {/* Observados */}
            <div className={`p-4 rounded-2xl border backdrop-blur-xl flex flex-col justify-between ${
              registrosStats.observados > 0 
                ? "bg-orange-500/15 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)] animate-pulse"
                : "bg-slate-900/80 border-white/10"
            }`}>
              <div className="flex items-center justify-between text-orange-400">
                <span className="text-xs font-semibold">Observados</span>
                <AlertTriangle className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-orange-300 mt-2 font-mono">
                {registrosStats.observados}
              </p>
              <span className="text-[10px] text-orange-300 mt-1 font-semibold">
                {registrosStats.observados > 0 ? "¡Requiere subsanación!" : "Sin observaciones"}
              </span>
            </div>

            {/* Rechazados */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-xl flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-rose-400">
                <span className="text-xs font-semibold">Rechazados</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-300 mt-2 font-mono">
                {registrosStats.rechazados}
              </p>
              <span className="text-[10px] text-rose-400/80 mt-1">No cumplen requisitos</span>
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
            {/* Chips de filtro */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["TODOS", "PENDIENTE", "APROBADO", "OBSERVADO", "RECHAZADO"] as const).map((estado) => {
                const count = estado === "TODOS" ? registrosStats.total
                  : estado === "PENDIENTE" ? registrosStats.pendientes
                  : estado === "APROBADO" ? registrosStats.aprobados
                  : estado === "OBSERVADO" ? registrosStats.observados
                  : registrosStats.rechazados;

                const isSelected = filtroEstado === estado;
                return (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setFiltroEstado(estado)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? estado === "OBSERVADO"
                          ? "bg-orange-500 text-slate-950 font-bold"
                          : estado === "APROBADO"
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : estado === "PENDIENTE"
                          ? "bg-amber-400 text-slate-950 font-bold"
                          : estado === "RECHAZADO"
                          ? "bg-rose-500 text-white font-bold"
                          : "bg-white text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {estado === "TODOS" && "Todos"}
                    {estado === "PENDIENTE" && "Pendientes"}
                    {estado === "APROBADO" && "Aprobados"}
                    {estado === "OBSERVADO" && "Observados"}
                    {estado === "RECHAZADO" && "Rechazados"}
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-black/20">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={busquedaRegistros}
                onChange={(e) => setBusquedaRegistros(e.target.value)}
                placeholder="Buscar cliente, CI, serie..."
                className="pl-8 bg-slate-950/60 border-white/10 h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Listado de Registros */}
          {loadingRegistros ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-white/10">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-300">Cargando tus registros...</p>
            </div>
          ) : registrosList.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-white/10 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No tienes registros aún</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Las compras de clientes que registres y en las que gires la ruleta se listarán aquí con su estado de validación.
              </p>
              <Button
                type="button"
                onClick={() => setVistaActiva("registro")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Registrar Primera Venta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {registrosList
                .filter((r) => {
                  if (filtroEstado !== "TODOS" && r.estado !== filtroEstado) return false;
                  if (!busquedaRegistros.trim()) return true;
                  const q = busquedaRegistros.toLowerCase().trim();
                  return (
                    (r.nombreCliente && r.nombreCliente.toLowerCase().includes(q)) ||
                    (r.apellidoCliente && r.apellidoCliente.toLowerCase().includes(q)) ||
                    (r.ci && r.ci.toLowerCase().includes(q)) ||
                    (r.serial && r.serial.toLowerCase().includes(q)) ||
                    (r.celular && r.celular.includes(q))
                  );
                })
                .map((r) => (
                  <Card key={r.id} className="border-white/10 bg-slate-900/70 backdrop-blur-xl overflow-hidden rounded-2xl hover:border-white/20 transition-all">
                    <CardHeader className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10">
                          #{r.id}
                        </span>
                        <div>
                          <CardTitle className="text-base text-white font-bold flex items-center gap-2">
                            {r.nombreCliente} {r.apellidoCliente}
                          </CardTitle>
                          <p className="text-[11px] text-slate-400">
                            {r.createdAt ? new Date(r.createdAt).toLocaleString("es-BO") : r.fechaCompra}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {r.estado === "PENDIENTE" && (
                          <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1 px-3 py-1 text-xs">
                            <Clock className="w-3.5 h-3.5" /> Pendiente Revisión
                          </Badge>
                        )}
                        {r.estado === "APROBADO" && (
                          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 flex items-center gap-1 px-3 py-1 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado - Tickets Habilitados
                          </Badge>
                        )}
                        {r.estado === "OBSERVADO" && (
                          <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/40 flex items-center gap-1 px-3 py-1 text-xs animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" /> Observado
                          </Badge>
                        )}
                        {r.estado === "RECHAZADO" && (
                          <Badge className="bg-rose-500/10 text-rose-300 border-rose-500/30 flex items-center gap-1 px-3 py-1 text-xs">
                            <XCircle className="w-3.5 h-3.5" /> Rechazado
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-5 space-y-4">
                      {/* Grilla de datos */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">CÉDULA DE IDENTIDAD</span>
                          <span className="text-slate-200 font-mono font-medium">{r.ci || "Sin C.I."}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">CELULAR / WHATSAPP</span>
                          <span className="text-slate-200 font-medium">{r.celular}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">MODELO & SERIAL</span>
                          <span className="text-slate-200 font-mono font-bold block truncate" title={r.serial}>
                            {r.serial}
                          </span>
                          <span className="text-[10px] text-slate-400">{r.productoModelo || "TV Skyworth"} {r.productoPulgadas ? `(${r.productoPulgadas}")` : ""}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">CIUDAD & TIENDA</span>
                          <span className="text-slate-200 font-medium block truncate">
                            {r.ciudad}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">{r.puntoVenta || "Comercio autorizado"}</span>
                        </div>
                      </div>

                      {/* Info de Ruleta y Premio */}
                      {r.premioNombre && (
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              r.esSinPremio || (r.premioNombre || "").toLowerCase().includes("siga")
                                ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                            }`}>
                              {r.esSinPremio || (r.premioNombre || "").toLowerCase().includes("siga") ? (
                                <Sparkles className="w-4 h-4" />
                              ) : (
                                <Gift className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold">RESULTADO EN RULETA</span>
                              <p className="font-bold text-white text-sm">{r.premioNombre}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {r.esSinPremio || (r.premioNombre || "").toLowerCase().includes("siga") ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold">
                                <Sparkles className="w-3.5 h-3.5" /> Habilitado al Gran Sorteo
                              </span>
                            ) : r.premioEntregado ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Entregado con Foto
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                                  <Clock className="w-3.5 h-3.5" /> Pendiente Foto Entrega
                                </span>
                                {r.entregaId && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      setEntregaId(r.entregaId!);
                                      setFotoEntrega(null);
                                      setShowEntregaModal(true);
                                    }}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-7 rounded-lg"
                                  >
                                    <Camera className="w-3 h-3 mr-1" /> Subir Foto Entrega
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Alerta de Observación y Botón de Subsanación */}
                      {r.estado === "OBSERVADO" && (
                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                            <div className="space-y-1 flex-1">
                              <p className="font-bold text-orange-300 text-xs uppercase tracking-wide">
                                Observación del Supervisor:
                              </p>
                              <p className="text-white text-xs bg-black/20 p-2.5 rounded-lg border border-orange-500/20">
                                "{r.motivoObservacion || "Documentación observada. Por favor revisar y cargar respaldos nítidos."}"
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <Button
                              type="button"
                              onClick={() => {
                                setRegistroASubsanar(r);
                                setSubFotoTag(null);
                                setSubFotoPoliza(null);
                                setSubFotoNota(null);
                                setSubFotoCiAnverso(null);
                                setSubFotoCiReverso(null);
                                setSubsanarModalOpen(true);
                              }}
                              className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                            >
                              <UploadCloud className="w-4 h-4 mr-1.5" /> Subsanar y Cargar Fotos Corregidas
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Alerta de Rechazo */}
                      {r.estado === "RECHAZADO" && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                          <div>
                            <span className="font-semibold block text-rose-200">Motivo del Rechazo:</span>
                            <span>{r.motivoRechazo || r.motivoObservacion || "Registro no cumple con las condiciones oficiales de la campaña."}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de barra de estado y velocidad de subida antes de pasar a la ruleta */}
      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => {
          if (!open && uploadState === "error") {
            setUploadModalOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-slate-950 border border-amber-500/30 text-white shadow-[0_0_60px_rgba(245,158,11,0.2)] rounded-3xl p-6">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center border transition-all">
              {uploadState === "uploading" && (
                <div className="w-full h-full rounded-full bg-amber-500/10 border-amber-500/30 flex items-center justify-center">
                  <UploadCloud className="w-8 h-8 text-amber-400 animate-bounce" />
                </div>
              )}
              {uploadState === "processing" && (
                <div className="w-full h-full rounded-full bg-cyan-500/10 border-cyan-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              )}
              {uploadState === "success" && (
                <div className="w-full h-full rounded-full bg-emerald-500/10 border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              )}
              {uploadState === "error" && (
                <div className="w-full h-full rounded-full bg-rose-500/10 border-rose-500/30 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                </div>
              )}
            </div>

            <DialogTitle className="text-xl font-black tracking-tight text-white">
              {uploadState === "uploading" && "Subiendo Fotografías de Respaldo"}
              {uploadState === "processing" && "Verificando y Preparando Ruleta"}
              {uploadState === "success" && "¡Respaldos Listos!"}
              {uploadState === "error" && "Error al Subir Fotografías"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              {uploadState === "uploading" && "Transfiriendo las 5 fotografías optimizadas al servidor antes de pasar a la ruleta..."}
              {uploadState === "processing" && "Validando serial con padrón Skyworth y configurando ruleta de premios..."}
              {uploadState === "success" && "Datos registrados. Abriendo la ruleta de premios..."}
              {uploadState === "error" && "Ocurrió una interrupción de red al intentar transferir los archivos."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="truncate max-w-[220px] text-slate-400">{uploadDetailText}</span>
                  <span className="font-bold text-amber-400 text-sm">{uploadPercent}%</span>
                </div>

                <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 transition-all duration-200"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>

                {/* Tarjetas de telemetría de red */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col">
                    <span className="text-slate-500 text-[10px]">Velocidad de Subida</span>
                    <span className="font-bold font-mono text-amber-300 mt-0.5">
                      {uploadSpeed || "Midiendo..."}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col">
                    <span className="text-slate-500 text-[10px]">Estado de Transferencia</span>
                    <span className="font-bold text-slate-300 mt-0.5 truncate">
                      {uploadState === "processing" ? "Procesando en servidor" : "Enviando respaldos"}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-center text-slate-500 italic">
                  Por favor mantén abierta esta ventana mientras se transfieren las fotos...
                </p>
              </div>
            )}

            {uploadState === "success" && (
              <div className="py-2 text-center text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                ¡Todo listo! Ingresando a la ruleta...
              </div>
            )}

            {uploadState === "error" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <p className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Detalle del error:
                  </p>
                  <p className="pl-5 text-slate-300 break-words">{uploadErrorMessage}</p>
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  💡 Tus datos y fotografías siguen guardados intactos. Puedes presionar <strong>Reintentar Subida</strong> para enviar nuevamente sin tener que volver a tomar las fotos.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            {uploadState === "error" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 text-xs"
                  onClick={() => setUploadModalOpen(false)}
                >
                  Revisar datos
                </Button>
                <Button
                  type="button"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
                  onClick={() => ejecutarSubidaYPrepararRuleta()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reintentar Subida
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pantalla Completa Inmersiva de la Ruleta (Optimizada Móvil, Cero Modales, Cero Agrandar) */}
      <AnimatePresence>
        {showRuletaModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#001038] text-white overflow-hidden flex flex-col"
          >
            <RuletaWheel
              premios={premiosDisponibles}
              sigaParticipandoHabilitado={tieneSigaParticipando}
              premioGanadorId={premioGanadorId}
              isSpinning={isSpinning}
              onSpinRequest={handleSpinRequest}
              onSpinComplete={handleSpinComplete}
              disabled={submittingRegistration}
              isSubmitting={submittingRegistration}
              clienteNombre={`${nombreCliente} ${apellidoCliente}`.trim()}
              clienteCi={ci}
              onClose={() => setShowRuletaModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Entrega Física con Foto */}
      <Dialog open={showEntregaModal} onOpenChange={setShowEntregaModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-emerald-500/30 text-white rounded-3xl p-6">
          <DialogHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Gift className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-emerald-400">
              ¡Premio Ganado: {premioGanador?.nombre}!
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs mt-1">
              Para completar la entrega y descontar del inventario, capture la fotografía de entrega con el cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmarEntrega} className="space-y-4 py-3">
            <FotoUploadCard
              title="Foto de Entrega del Premio *"
              subtitle="Fotografía del cliente recibiendo su obsequio."
              file={fotoEntrega}
              isCompressing={compressingEntrega}
              onSelect={(file) => handlePhotoSelect(file, "entrega")}
              onRemove={() => setFotoEntrega(null)}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={submittingEntrega || !fotoEntrega || compressingEntrega}
                className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              >
                {submittingEntrega ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Registrando Entrega...
                  </>
                ) : compressingEntrega ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Optimizando Foto...
                  </>
                ) : (
                  "Confirmar Entrega de Premio"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Subsanación para el Impulsador */}
      <Dialog open={subsanarModalOpen} onOpenChange={setSubsanarModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border border-white/10 text-white max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-amber-400">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              Subsanar Registro #{registroASubsanar?.id}
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Cliente: <span className="text-white font-semibold">{registroASubsanar?.nombreCliente} {registroASubsanar?.apellidoCliente}</span> · Serial: <span className="font-mono text-amber-300 font-bold">{registroASubsanar?.serial}</span>
            </DialogDescription>
          </DialogHeader>

          {registroASubsanar && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs space-y-1">
                <p className="font-bold text-orange-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Motivo de la Observación del Supervisor:
                </p>
                <p className="text-sm text-white font-medium pl-5 bg-black/20 p-2.5 rounded-xl border border-orange-500/20">
                  "{registroASubsanar.motivoObservacion || "Respaldos ilegibles o incompletos."}"
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-semibold">
                  Selecciona la(s) fotografía(s) corregida(s) que deseas actualizar:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FotoUploadCard
                    title="1. Foto TAG (Etiqueta Trasera)"
                    subtitle="Actualizar si el TAG estaba borroso o cortado."
                    file={subFotoTag}
                    isCompressing={subCompressingTag}
                    onSelect={(file) => handlePhotoSubsanarSelect(file, "tag")}
                    onRemove={() => setSubFotoTag(null)}
                  />

                  <FotoUploadCard
                    title="2. Foto Póliza de Garantía"
                    subtitle="Actualizar si faltaba sello o datos legibles."
                    file={subFotoPoliza}
                    isCompressing={subCompressingPoliza}
                    onSelect={(file) => handlePhotoSubsanarSelect(file, "poliza")}
                    onRemove={() => setSubFotoPoliza(null)}
                  />

                  <FotoUploadCard
                    title="3. Foto Factura o Nota de Venta"
                    subtitle="Actualizar si la nota de entrega era ilegible."
                    file={subFotoNota}
                    isCompressing={subCompressingNota}
                    onSelect={(file) => handlePhotoSubsanarSelect(file, "nota")}
                    onRemove={() => setSubFotoNota(null)}
                  />

                  <FotoUploadCard
                    title="4. Carnet (Anverso) (Opcional)"
                    subtitle="Frente del carnet de identidad si corresponde."
                    file={subFotoCiAnverso}
                    isCompressing={subCompressingCiAnverso}
                    onSelect={(file) => handlePhotoSubsanarSelect(file, "ciAnverso")}
                    onRemove={() => setSubFotoCiAnverso(null)}
                  />

                  <FotoUploadCard
                    title="5. Carnet (Reverso) (Opcional)"
                    subtitle="Reverso del carnet si corresponde."
                    file={subFotoCiReverso}
                    isCompressing={subCompressingCiReverso}
                    onSelect={(file) => handlePhotoSubsanarSelect(file, "ciReverso")}
                    onRemove={() => setSubFotoCiReverso(null)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSubsanarModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleEnviarSubsanacion}
                  disabled={submittingSubsanacion || (!subFotoTag && !subFotoPoliza && !subFotoNota && !subFotoCiAnverso && !subFotoCiReverso)}
                  className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl px-6"
                >
                  {submittingSubsanacion ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando Subsanación...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Reenviar al Supervisor
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}