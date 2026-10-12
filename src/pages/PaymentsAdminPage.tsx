import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiPutForm, uploadUrl, getToken, apiDownloadFile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  DollarSign,
  QrCode,
  Upload,
  Download,
  Search,
  AlertTriangle,
  Layers,
  CheckCircle,
  FileText,
  Plus,
  Eye,
  RefreshCw,
  Scale,
  Ban,
  Check,
  Building2,
  User,
  ArrowRight,
} from "lucide-react";

const getErrorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : "Error desconocido";

interface Campaign {
  id: number;
  nombre: string;
  activo?: boolean;
  registroHabilitado?: boolean;
}

interface Ciudad {
  id: number;
  nombre: string;
}

interface CommissionReport {
  vendedorId: number;
  vendedorNombre: string;
  ciudad: string;
  tienda: string;
  fotoQr: string | null;
  tallaPolera: string | null;
  cantidadVentas: number;
  montoTotal: number;
  estado: string;
}

interface LoteLiquidacion {
  id: number;
  codigoLote: string;
  fechaCierre: string;
  estado: "BORRADOR" | "EN_REVISION" | "AUTORIZADO" | "PAGADO" | "OBSERVADO" | "ANULADO";
  motivoObservacion?: string;
  campanaId?: number;
  campanaNombre?: string;
  ciudad?: string;
  tipoBeneficiario: string;
  periodoInicio?: string;
  periodoFin?: string;
  totalMontoBrutoBs: number;
  totalDeduccionesBs: number;
  totalMontoNetoBs: number;
  totalVentas: number;
  totalBeneficiarios: number;
  usuarioCreador?: string;
  usuarioAutorizador?: string;
  fechaAutorizacion?: string;
  usuarioPagador?: string;
  fechaPago?: string;
  comprobantePagoGlobalUrl?: string;
  observaciones?: string;
  detalles?: LoteLiquidacionDetalle[];
}

interface LoteLiquidacionDetalle {
  id: number;
  ventaId: number;
  serial?: string;
  productModel?: string;
  vendedorId?: number;
  vendedorNombre?: string;
  vendedorCi?: string;
  tiendaId?: number;
  tiendaNombre?: string;
  ciudad?: string;
  tipoBeneficiario?: string;
  montoBruto: number;
  deduccionIncidencias: number;
  montoNeto: number;
  estado: "PENDIENTE" | "OBSERVADO" | "PAGADO" | "EXCLUIDO";
  motivoObservacion?: string;
  comprobanteIndividualUrl?: string;
}

interface BeneficiarioResumen {
  beneficiarioId: number;
  beneficiarioNombre: string;
  tipoBeneficiario: string;
  ciudad: string;
  tiendaNombre: string;
  cantidadVentas: number;
  montoBruto: number;
  deduccionIncidencias: number;
  montoNeto: number;
  fotoQr?: string;
}

interface LotePreviewResponse {
  totalVentas: number;
  totalBeneficiarios: number;
  totalMontoBrutoBs: number;
  totalDeduccionesBs: number;
  totalMontoNetoBs: number;
  beneficiarios: BeneficiarioResumen[];
  detalles: LoteLiquidacionDetalle[];
}

interface IncidenciaRegularizacion {
  id: number;
  tipo: string;
  ventaId?: number;
  serialAfectado?: string;
  vendedorId?: number;
  vendedorNombre?: string;
  tiendaId?: number;
  tiendaNombre?: string;
  montoACompensar: number;
  saldoPendiente: number;
  estado: "PENDIENTE" | "COMPENSADA" | "CANCELADA";
  fechaRegistro: string;
  loteCompensadorId?: number;
  fechaCompensacion?: string;
  observaciones?: string;
}

export default function PaymentsAdminPage() {
  const [activeTab, setActiveTab] = useState("lotes");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  // Common filters data
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

  // ==================== TAB 1: LOTES DE LIQUIDACIÓN ====================
  const [lotes, setLotes] = useState<LoteLiquidacion[]>([]);
  const [fLoteCampana, setFLoteCampana] = useState<string>("todas");
  const [fLoteCiudad, setFLoteCiudad] = useState<string>("todas");
  const [fLoteEstado, setFLoteEstado] = useState<string>("TODOS");
  const [fLoteBeneficiario, setFLoteBeneficiario] = useState<string>("TODOS");

  // Wizard Modal Create Batch
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [wCampanaId, setWCampanaId] = useState<string>("todas");
  const [wCiudad, setWCiudad] = useState<string>("todas");
  const [wTipoBeneficiario, setWTipoBeneficiario] = useState<string>("VENDEDOR");
  const [wStartDate, setWStartDate] = useState<string>("");
  const [wEndDate, setWEndDate] = useState<string>("");
  const [wObservaciones, setWObservaciones] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<LotePreviewResponse | null>(null);
  const [creatingBatch, setCreatingBatch] = useState(false);

  // View Details Modal
  const [selectedLote, setSelectedLote] = useState<LoteLiquidacion | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Pay Batch Modal
  const [loteToPay, setLoteToPay] = useState<LoteLiquidacion | null>(null);
  const [batchVoucherFile, setBatchVoucherFile] = useState<File | null>(null);
  const [payingBatch, setPayingBatch] = useState(false);

  // Annul Batch Modal
  const [loteToAnnul, setLoteToAnnul] = useState<LoteLiquidacion | null>(null);
  const [annulMotivo, setAnnulMotivo] = useState("");
  const [annulling, setAnnulling] = useState(false);

  // Observar Batch Modal
  const [loteToObservar, setLoteToObservar] = useState<LoteLiquidacion | null>(null);
  const [observarMotivo, setObservarMotivo] = useState("");
  const [observingBatch, setObservingBatch] = useState(false);

  // Observar Detalle Modal
  const [detalleToObservar, setDetalleToObservar] = useState<{ loteId: number; detalleId: number } | null>(null);
  const [detalleObservarMotivo, setDetalleObservarMotivo] = useState("");
  const [observingDetalle, setObservingDetalle] = useState(false);

  // ==================== TAB 2: PAGOS INDIVIDUALES (LEGACY) ====================
  const [reports, setReports] = useState<CommissionReport[]>([]);
  const [fCampana, setFCampana] = useState<string>("todas");
  const [fCiudad, setFCiudad] = useState<string>("todas");
  const [fStartDate, setFStartDate] = useState<string>("");
  const [fEndDate, setFEndDate] = useState<string>("");
  const [fEstado, setFEstado] = useState<string>("Todos");
  const [fMostrarCon0, setFMostrarCon0] = useState(false);
  const [fDesgloseSemanal, setFDesgloseSemanal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<CommissionReport | null>(null);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // ==================== TAB 3: INCIDENCIAS DE REGULARIZACIÓN ====================
  const [incidencias, setIncidencias] = useState<IncidenciaRegularizacion[]>([]);
  const [fIncEstado, setFIncEstado] = useState<string>("TODOS");
  const [openManualIncModal, setOpenManualIncModal] = useState(false);
  const [incTipo, setIncTipo] = useState<string>("VENTA_PAGADA_ANULADA");
  const [incVendedorNombre, setIncVendedorNombre] = useState("");
  const [incTiendaNombre, setIncTiendaNombre] = useState("");
  const [incSerial, setIncSerial] = useState("");
  const [incMonto, setIncMonto] = useState("");
  const [incObs, setIncObs] = useState("");
  const [savingInc, setSavingInc] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [camps, cities] = await Promise.all([
        apiGet<Campaign[]>("/campaigns"),
        apiGet<Ciudad[]>("/cities/active"),
      ]);
      const list = camps || [];
      setCampaigns(list);
      setCiudades(cities || []);

      const active = list.find((c) => c.activo);
      let initialCampaignId = "todas";
      if (active) {
        initialCampaignId = String(active.id);
        setFCampana(initialCampaignId);
        setWCampanaId(initialCampaignId);
      }

      await Promise.all([
        loadLotes(),
        handleSearchIndividual(initialCampaignId),
        loadIncidencias(),
      ]);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos iniciales.",
        variant: "destructive",
      });
    }
    setInitLoading(false);
  };

  // ==================== LOTES FUNCTIONS ====================
  const loadLotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fLoteCampana !== "todas") params.append("campanaId", fLoteCampana);
      if (fLoteCiudad !== "todas") params.append("ciudad", fLoteCiudad);
      if (fLoteEstado !== "TODOS") params.append("estado", fLoteEstado);
      if (fLoteBeneficiario !== "TODOS") params.append("tipoBeneficiario", fLoteBeneficiario);

      const data = await apiGet<LoteLiquidacion[]>(`/liquidaciones/lotes?${params.toString()}`);
      setLotes(data || []);
    } catch (e: unknown) {
      toast({ title: "Error al cargar lotes", description: getErrorMessage(e), variant: "destructive" });
    }
    setLoading(false);
  };

  const handlePreviewBatch = async () => {
    setPreviewLoading(true);
    try {
      const body = {
        campanaId: wCampanaId !== "todas" ? Number(wCampanaId) : null,
        ciudad: wCiudad !== "todas" ? wCiudad : null,
        tipoBeneficiario: wTipoBeneficiario,
        periodoInicio: wStartDate || null,
        periodoFin: wEndDate || null,
      };
      const res = await apiPost<LotePreviewResponse>("/liquidaciones/lotes/previsualizar", body);
      setPreviewResult(res);
      if (res.totalVentas === 0) {
        toast({
          title: "Sin Ventas Pendientes",
          description: "No se encontraron ventas aprobadas pendientes para los filtros seleccionados.",
        });
      }
    } catch (e: unknown) {
      toast({ title: "Error en Previsualización", description: getErrorMessage(e), variant: "destructive" });
    }
    setPreviewLoading(false);
  };

  const handleCreateBatch = async (estadoTarget: "BORRADOR" | "EN_REVISION") => {
    if (!previewResult || previewResult.totalVentas === 0) {
      toast({ title: "Atención", description: "Debe previsualizar un lote con ventas candidatas antes de crearlo.", variant: "destructive" });
      return;
    }
    setCreatingBatch(true);
    try {
      const body = {
        campanaId: wCampanaId !== "todas" ? Number(wCampanaId) : null,
        ciudad: wCiudad !== "todas" ? wCiudad : null,
        tipoBeneficiario: wTipoBeneficiario,
        periodoInicio: wStartDate || null,
        periodoFin: wEndDate || null,
        observaciones: wObservaciones,
        estado: estadoTarget,
      };
      const created = await apiPost<LoteLiquidacion>("/liquidaciones/lotes", body);
      toast({
        title: "Lote de Liquidación Creado",
        description: `Se ha generado el lote ${created.codigoLote} en estado ${created.estado}.`,
      });
      setOpenCreateModal(false);
      setPreviewResult(null);
      setWObservaciones("");
      loadLotes();
    } catch (e: unknown) {
      toast({ title: "Error al crear lote", description: getErrorMessage(e), variant: "destructive" });
    }
    setCreatingBatch(false);
  };

  const handleOpenDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const lote = await apiGet<LoteLiquidacion>(`/liquidaciones/lotes/${id}`);
      setSelectedLote(lote);
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudo cargar el detalle del lote.", variant: "destructive" });
    }
    setLoadingDetail(false);
  };

  const handleAuthorizeBatch = async (id: number) => {
    try {
      const res = await apiPut<LoteLiquidacion>(`/liquidaciones/lotes/${id}/autorizar`, {});
      toast({
        title: "Lote Autorizado",
        description: `El lote ${res.codigoLote} fue autorizado para desembolso financiero.`,
      });
      loadLotes();
      if (selectedLote && selectedLote.id === id) {
        setSelectedLote(res);
      }
    } catch (e: unknown) {
      toast({ title: "Error al autorizar", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const handleConfirmPayBatch = async () => {
    if (!loteToPay) return;
    setPayingBatch(true);
    try {
      const formData = new FormData();
      if (batchVoucherFile) {
        formData.append("comprobante", batchVoucherFile);
      }
      const updated = await apiPutForm<LoteLiquidacion>(`/liquidaciones/lotes/${loteToPay.id}/pagar`, formData);
      toast({
        title: "Lote Liquidado y Pagado",
        description: `El lote ${updated.codigoLote} fue pagado. Se regularizaron las incidencias y se cerraron las ventas.`,
      });
      setLoteToPay(null);
      setBatchVoucherFile(null);
      loadLotes();
      loadIncidencias();
      handleSearchIndividual();
    } catch (e: unknown) {
      toast({ title: "Error al pagar lote", description: getErrorMessage(e), variant: "destructive" });
    }
    setPayingBatch(false);
  };

  const handleConfirmAnnulBatch = async () => {
    if (!loteToAnnul) return;
    setAnnulling(true);
    try {
      const updated = await apiPut<LoteLiquidacion>(`/liquidaciones/lotes/${loteToAnnul.id}/anular`, {
        motivo: annulMotivo || "Anulado por el administrador",
      });
      toast({
        title: "Lote Anulado",
        description: `El lote ${updated.codigoLote} fue anulado. Las ventas han sido liberadas para futuros lotes.`,
      });
      setLoteToAnnul(null);
      setAnnulMotivo("");
      loadLotes();
    } catch (e: unknown) {
      toast({ title: "Error al anular lote", description: getErrorMessage(e), variant: "destructive" });
    }
    setAnnulling(false);
  };

  const handleConfirmObservarBatch = async () => {
    if (!loteToObservar) return;
    if (!observarMotivo.trim()) {
      toast({ title: "Atención", description: "Debe ingresar el motivo de la observación.", variant: "destructive" });
      return;
    }
    setObservingBatch(true);
    try {
      const updated = await apiPut<LoteLiquidacion>(`/liquidaciones/lotes/${loteToObservar.id}/observar`, {
        motivo: observarMotivo.trim(),
      });
      toast({
        title: "Lote Observado",
        description: `El lote ${updated.codigoLote} fue marcado como OBSERVADO para subsanación o revisión.`,
      });
      setLoteToObservar(null);
      setObservarMotivo("");
      loadLotes();
      if (selectedLote && selectedLote.id === updated.id) {
        setSelectedLote(updated);
      }
    } catch (e: unknown) {
      toast({ title: "Error al observar lote", description: getErrorMessage(e), variant: "destructive" });
    }
    setObservingBatch(false);
  };

  const handleConfirmObservarDetalle = async () => {
    if (!detalleToObservar) return;
    if (!detalleObservarMotivo.trim()) {
      toast({ title: "Atención", description: "Debe ingresar el motivo de observación del beneficiario.", variant: "destructive" });
      return;
    }
    setObservingDetalle(true);
    try {
      const updated = await apiPut<LoteLiquidacion>(
        `/liquidaciones/lotes/${detalleToObservar.loteId}/detalles/${detalleToObservar.detalleId}/observar`,
        { motivo: detalleObservarMotivo.trim() }
      );
      toast({
        title: "Beneficiario Observado",
        description: "El beneficiario ha sido retenido individualmente sin detener el desembolso del resto del lote.",
      });
      setSelectedLote(updated);
      setDetalleToObservar(null);
      setDetalleObservarMotivo("");
      loadLotes();
    } catch (e: unknown) {
      toast({ title: "Error al observar detalle", description: getErrorMessage(e), variant: "destructive" });
    }
    setObservingDetalle(false);
  };

  const handleReactivarDetalle = async (loteId: number, detalleId: number) => {
    try {
      const updated = await apiPut<LoteLiquidacion>(
        `/liquidaciones/lotes/${loteId}/detalles/${detalleId}/reactivar`,
        {}
      );
      toast({
        title: "Beneficiario Reactivado",
        description: "El beneficiario vuelve a estar habilitado para liquidación en este lote.",
      });
      setSelectedLote(updated);
      loadLotes();
    } catch (e: unknown) {
      toast({ title: "Error al reactivar detalle", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const handleExcluirDetalle = async (loteId: number, detalleId: number) => {
    try {
      const updated = await apiPut<LoteLiquidacion>(
        `/liquidaciones/lotes/${loteId}/detalles/${detalleId}/excluir`,
        {}
      );
      toast({
        title: "Beneficiario Excluido",
        description: "El beneficiario fue excluido de este lote y sus ventas quedarán disponibles para futuros cortes.",
      });
      setSelectedLote(updated);
      loadLotes();
    } catch (e: unknown) {
      toast({ title: "Error al excluir detalle", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  // ==================== TAB 2 INDIVIDUAL PAYMENTS ====================
  const handlePeriodChange = (val: string) => {
    const today = new Date();
    if (val === "mes") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
      setFStartDate(firstDay);
      setFEndDate(lastDay);
    } else if (val === "semana") {
      const dayOfWeek = today.getDay() || 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFStartDate(monday.toISOString().split("T")[0]);
      setFEndDate(sunday.toISOString().split("T")[0]);
    } else if (val === "todos") {
      setFStartDate("");
      setFEndDate("");
    }
  };

  const handleSearchIndividual = async (overrideCampanaId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const campaignToUse = overrideCampanaId !== undefined ? overrideCampanaId : fCampana;
      if (campaignToUse !== "todas") params.append("campanaId", campaignToUse);
      if (fCiudad !== "todas") params.append("ciudad", fCiudad);
      if (fStartDate) params.append("startDate", fStartDate);
      if (fEndDate) params.append("endDate", fEndDate);
      if (fEstado !== "Todos") params.append("estadoPago", fEstado);

      const data = await apiGet<CommissionReport[]>(`/payments/commissions?${params.toString()}`);
      setReports(data || []);
    } catch (e: unknown) {
      toast({ title: "Error de Búsqueda", description: getErrorMessage(e), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleConfirmPayIndividual = async () => {
    if (!selectedVendor || !voucherFile) {
      toast({ title: "Atención", description: "Debe seleccionar un comprobante de depósito.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("fotoComprobante", voucherFile);

      let url = uploadUrl(`/payments/pay/${selectedVendor.vendedorId}?`);
      if (fCampana !== "todas") url += `campanaId=${fCampana}&`;
      if (fCiudad !== "todas") url += `ciudad=${fCiudad}&`;
      if (fStartDate) url += `startDate=${fStartDate}&`;
      if (fEndDate) url += `endDate=${fEndDate}&`;

      const token = getToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, { method: "POST", headers, body: formData });
      if (!res.ok) throw new Error("Fallo al registrar el pago.");

      toast({ title: "Pago Registrado", description: `Se ha marcado el pago para ${selectedVendor.vendedorNombre}.` });
      setSelectedVendor(null);
      handleSearchIndividual();
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleExportExcel = async (withQr: boolean) => {
    try {
      setExportingExcel(true);
      const params = new URLSearchParams();
      if (fCampana !== "todas") {
        params.append("campanaId", fCampana);
        const camp = campaigns.find((c) => c.id.toString() === fCampana);
        if (camp) params.append("campanaNombre", camp.nombre);
      }
      if (fCiudad !== "todas") params.append("ciudad", fCiudad);
      if (fStartDate) params.append("startDate", fStartDate);
      if (fEndDate) params.append("endDate", fEndDate);
      if (fEstado !== "Todos") params.append("estadoPago", fEstado);
      params.append("withQr", String(withQr));

      const filename = withQr ? "Liquidacion_Comisiones_QR.xlsx" : "Reporte_Comisiones.xlsx";
      await apiDownloadFile(`/payments/export-excel?${params.toString()}`, filename);
      toast({ title: "Éxito", description: `Reporte ${withQr ? "con QR " : ""}descargado correctamente` });
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setExportingExcel(false);
    }
  };

  // ==================== TAB 3 INCIDENCIAS ====================
  const loadIncidencias = async () => {
    try {
      const params = new URLSearchParams();
      if (fIncEstado !== "TODOS") params.append("estado", fIncEstado);
      const data = await apiGet<IncidenciaRegularizacion[]>(`/liquidaciones/incidencias?${params.toString()}`);
      setIncidencias(data || []);
    } catch (e: unknown) {
      console.error("Error al cargar incidencias:", e);
    }
  };

  const handleCreateManualIncidencia = async () => {
    if (!incMonto || Number(incMonto) <= 0) {
      toast({ title: "Atención", description: "Ingrese un monto válido a compensar.", variant: "destructive" });
      return;
    }
    setSavingInc(true);
    try {
      const body = {
        tipo: incTipo,
        vendedorNombre: incVendedorNombre || null,
        tiendaNombre: incTiendaNombre || null,
        serialAfectado: incSerial || null,
        montoACompensar: Number(incMonto),
        saldoPendiente: Number(incMonto),
        estado: "PENDIENTE",
        observaciones: incObs || "Ajuste manual registrado por administración",
      };
      await apiPost("/liquidaciones/incidencias", body);
      toast({ title: "Incidencia Registrada", description: "Se ha registrado la compensación pendiente." });
      setOpenManualIncModal(false);
      setIncMonto("");
      setIncSerial("");
      setIncVendedorNombre("");
      setIncTiendaNombre("");
      setIncObs("");
      loadIncidencias();
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
    setSavingInc(false);
  };

  // Metrics for Tab 1
  const totalLotesCount = lotes.length;
  const totalLotesPagadosBs = lotes
    .filter((l) => l.estado === "PAGADO")
    .reduce((acc, curr) => acc + (Number(curr.totalMontoNetoBs) || 0), 0);
  const totalLotesPendientes = lotes.filter((l) => l.estado === "BORRADOR" || l.estado === "EN_REVISION" || l.estado === "AUTORIZADO").length;

  // Metrics for Tab 2
  const filteredReports = reports.filter((r) => (fMostrarCon0 ? true : r.montoTotal > 0));
  const totalVendors = filteredReports.length;
  const totalUnits = filteredReports.reduce((acc, curr) => acc + curr.cantidadVentas, 0);
  const totalMonto = filteredReports.reduce((acc, curr) => acc + curr.montoTotal, 0);

  // Metrics for Tab 3
  const totalIncidenciasCount = incidencias.length;
  const saldoPendienteIncidencias = incidencias
    .filter((i) => i.estado === "PENDIENTE")
    .reduce((acc, curr) => acc + (Number(curr.saldoPendiente) || 0), 0);
  const totalCompensadasCount = incidencias.filter((i) => i.estado === "COMPENSADA").length;

  const renderBadgeEstadoLote = (estado: string) => {
    switch (estado) {
      case "BORRADOR":
        return <Badge variant="outline" className="border-slate-500/30 text-slate-400 bg-slate-500/10">Borrador</Badge>;
      case "EN_REVISION":
        return <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10">En Revisión</Badge>;
      case "AUTORIZADO":
        return <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">Autorizado</Badge>;
      case "PAGADO":
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold">Pagado</Badge>;
      case "OBSERVADO":
        return <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10 font-bold">Observado</Badge>;
      case "ANULADO":
        return <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">Anulado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const renderBadgeEstadoDetalle = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">Pendiente</Badge>;
      case "OBSERVADO":
        return <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-400 bg-orange-500/10 font-semibold">Observado</Badge>;
      case "EXCLUIDO":
        return <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400 bg-rose-500/10">Excluido</Badge>;
      case "PAGADO":
        return <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold">Pagado</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{estado}</Badge>;
    }
  };

  if (initLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* HEADER TÍTULO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
            <DollarSign className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-white">
              Cierre, Liquidaciones y Pagos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión de lotes de liquidación, regularización de incidencias y desembolsos
            </p>
          </div>
        </div>

        {activeTab === "lotes" && (
          <Button
            onClick={() => {
              setPreviewResult(null);
              setOpenCreateModal(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo Lote de Cierre
          </Button>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="lotes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg gap-2 text-sm">
            <Layers className="h-4 w-4" /> Lotes de Liquidación
          </TabsTrigger>
          <TabsTrigger value="individuales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg gap-2 text-sm">
            <DollarSign className="h-4 w-4" /> Pagos Individuales
          </TabsTrigger>
          <TabsTrigger value="incidencias" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg gap-2 text-sm">
            <Scale className="h-4 w-4" /> Regularización de Incidencias
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: LOTES DE LIQUIDACIÓN                                              */}
        {/* ========================================================================= */}
        <TabsContent value="lotes" className="space-y-6">
          {/* METRICS CARDS LOTES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg hover-glow-primary transition-all duration-300">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Lotes Generados</p>
              <p className="text-3xl font-bold text-white">{totalLotesCount}</p>
            </Card>
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg hover-glow-primary transition-all duration-300">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Lotes por Autorizar / Pendientes</p>
              <p className="text-3xl font-bold text-amber-400">{totalLotesPendientes}</p>
            </Card>
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg hover-glow-success transition-all duration-300">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Liquidado Pagado</p>
              <p className="text-3xl font-bold text-emerald-400">Bs {totalLotesPagadosBs.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</p>
            </Card>
          </div>

          {/* FILTERS FOR LOTES */}
          <Card className="glass-card border-white/5 text-white shadow-xl shadow-black/20">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Campaña</Label>
                  <Select value={fLoteCampana} onValueChange={(val) => { setFLoteCampana(val); }}>
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Todas las campañas" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="todas">Todas las campañas</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ciudad</Label>
                  <Select value={fLoteCiudad} onValueChange={(val) => { setFLoteCiudad(val); }}>
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="todas">Todas</SelectItem>
                      {ciudades.map((c) => (
                        <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Beneficiario</Label>
                  <Select value={fLoteBeneficiario} onValueChange={(val) => { setFLoteBeneficiario(val); }}>
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="TODOS">Todos</SelectItem>
                      <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                      <SelectItem value="TIENDA">Tienda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={fLoteEstado} onValueChange={(val) => { setFLoteEstado(val); }}>
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="TODOS">Todos los estados</SelectItem>
                      <SelectItem value="BORRADOR">Borrador</SelectItem>
                      <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                      <SelectItem value="AUTORIZADO">Autorizado</SelectItem>
                      <SelectItem value="OBSERVADO">Observado</SelectItem>
                      <SelectItem value="PAGADO">Pagado</SelectItem>
                      <SelectItem value="ANULADO">Anulado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-4">
                <Button variant="outline" size="sm" onClick={loadLotes} className="border-white/10 hover:bg-white/5 gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Actualizar Lotes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TABLE LOTES */}
          <Card className="glass-card border-white/5 shadow-xl shadow-black/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Código Lote</TableHead>
                  <TableHead className="text-muted-foreground">Fecha Cierre</TableHead>
                  <TableHead className="text-muted-foreground">Campaña / Ciudad</TableHead>
                  <TableHead className="text-muted-foreground text-center">Tipo</TableHead>
                  <TableHead className="text-muted-foreground text-center">Ventas</TableHead>
                  <TableHead className="text-muted-foreground text-right">Bruto (Bs)</TableHead>
                  <TableHead className="text-muted-foreground text-right text-rose-400">Deducción</TableHead>
                  <TableHead className="text-muted-foreground text-right text-emerald-400 font-bold">Neto a Pagar</TableHead>
                  <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                  <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground border-white/5">
                      No se encontraron lotes de liquidación con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  lotes.map((lote) => (
                    <TableRow key={lote.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-semibold text-white font-mono">{lote.codigoLote}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{lote.fechaCierre}</TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        <div>{lote.campanaNombre || "Todas"}</div>
                        <div className="text-xs text-muted-foreground">{lote.ciudad || "Nacional"}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-white/10 text-xs">
                          {lote.tipoBeneficiario === "TIENDA" ? (
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Tienda</span>
                          ) : (
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Vendedor</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-200">{lote.totalVentas}</TableCell>
                      <TableCell className="text-right text-slate-300 font-mono">
                        Bs {Number(lote.totalMontoBrutoBs).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-rose-400 font-mono">
                        {Number(lote.totalDeduccionesBs) > 0 ? (
                          `- Bs ${Number(lote.totalDeduccionesBs).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`
                        ) : (
                          "0.00"
                        )}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400 font-bold font-mono">
                        Bs {Number(lote.totalMontoNetoBs).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">{renderBadgeEstadoLote(lote.estado)}</TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDetail(lote.id)}
                          className="hover:bg-white/10 text-xs h-7 px-2"
                          title="Ver detalle"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Detalle
                        </Button>

                        {(lote.estado === "BORRADOR" || lote.estado === "EN_REVISION" || lote.estado === "OBSERVADO") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAuthorizeBatch(lote.id)}
                            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs h-7 px-2"
                            title="Autorizar desembolso"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Autorizar
                          </Button>
                        )}

                        {lote.estado === "AUTORIZADO" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setLoteToPay(lote);
                              setBatchVoucherFile(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-2.5 font-semibold"
                            title="Pagar lote"
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1" /> Pagar
                          </Button>
                        )}

                        {lote.estado !== "PAGADO" && lote.estado !== "ANULADO" && lote.estado !== "OBSERVADO" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setLoteToObservar(lote);
                              setObservarMotivo("");
                            }}
                            className="text-orange-400 hover:bg-orange-500/10 text-xs h-7 px-2"
                            title="Observar lote"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Observar
                          </Button>
                        )}

                        {lote.estado !== "PAGADO" && lote.estado !== "ANULADO" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setLoteToAnnul(lote);
                              setAnnulMotivo("");
                            }}
                            className="text-rose-400 hover:bg-rose-500/10 text-xs h-7 px-2"
                            title="Anular lote"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {lote.comprobantePagoGlobalUrl && (
                          <a
                            href={uploadUrl(lote.comprobantePagoGlobalUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-white/10 hover:bg-white/10 h-7 px-2 text-cyan-400"
                            title="Ver comprobante de transferencia"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> Voucher
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: PAGOS INDIVIDUALES                                                 */}
        {/* ========================================================================= */}
        <TabsContent value="individuales" className="space-y-6">
          <Card className="glass-card border-white/5 text-white shadow-xl shadow-black/20">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Campaña *</Label>
                  <Select value={fCampana} onValueChange={setFCampana}>
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="todas">Todas las campañas</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Periodo</Label>
                  <Select onValueChange={handlePeriodChange} defaultValue="personalizado">
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Rango de fecha" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="todos">Todos los periodos</SelectItem>
                      <SelectItem value="mes">Este Mes</SelectItem>
                      <SelectItem value="semana">Esta Semana</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Ciudad</Label>
                  <Select value={fCiudad} onValueChange={setFCiudad}>
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="todas">Todas</SelectItem>
                      {ciudades.map((c) => (
                        <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    type="date"
                    className="glass-card border-white/10 text-sm [color-scheme:dark]"
                    value={fStartDate}
                    onChange={(e) => setFStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    type="date"
                    className="glass-card border-white/10 text-sm [color-scheme:dark]"
                    value={fEndDate}
                    onChange={(e) => setFEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="space-y-2 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Estado pago</Label>
                  <Select value={fEstado} onValueChange={setFEstado}>
                    <SelectTrigger className="glass-card border-white/10 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Pendiente">Pendientes</SelectItem>
                      <SelectItem value="Pagado">Pagados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                  <Switch id="mostrar-0" checked={fMostrarCon0} onCheckedChange={setFMostrarCon0} />
                  <Label htmlFor="mostrar-0" className="text-sm font-medium">Mostrar con 0</Label>
                </div>

                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                  <Switch id="desglose" checked={fDesgloseSemanal} onCheckedChange={setFDesgloseSemanal} />
                  <Label htmlFor="desglose" className="text-sm font-medium">Desglose semanal</Label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  onClick={() => handleExportExcel(true)}
                  disabled={exportingExcel}
                >
                  {exportingExcel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Generar Liquidación
                </Button>
                <Button variant="outline" className="border-white/10 hover:bg-white/5 bg-transparent" onClick={() => handleSearchIndividual()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Consultar
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 hover:bg-white/5 bg-transparent"
                  onClick={() => handleExportExcel(false)}
                  disabled={exportingExcel}
                >
                  {exportingExcel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Excel
                </Button>
              </div>

              <div className="pt-2 text-yellow-500 text-xs flex items-center gap-1.5 opacity-80">
                <AlertTriangle className="h-3.5 w-3.5" /> El periodo excede el rango de campaña (opcional)
              </div>
            </CardContent>
          </Card>

          {/* METRICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg hover-glow-primary transition-all duration-300">
              <p className="text-muted-foreground text-sm mb-1">Vendedores</p>
              <p className="text-3xl font-bold text-white">{totalVendors}</p>
            </Card>
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg hover-glow-primary transition-all duration-300">
              <p className="text-muted-foreground text-sm mb-1">Unidades</p>
              <p className="text-3xl font-bold text-white">{totalUnits}</p>
            </Card>
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg hover-glow-success transition-all duration-300">
              <p className="text-muted-foreground text-sm mb-1">Total Bs</p>
              <p className="text-3xl font-bold text-emerald-400">Bs {totalMonto}</p>
            </Card>
          </div>

          {/* DATA TABLE */}
          <Card className="glass-card border-white/5 shadow-xl shadow-black/20 pb-4 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Vendedor</TableHead>
                  <TableHead className="text-muted-foreground">Ciudad</TableHead>
                  <TableHead className="text-muted-foreground">Tienda</TableHead>
                  <TableHead className="text-muted-foreground text-center">Uds</TableHead>
                  <TableHead className="text-muted-foreground text-right w-32">Comisión Bs</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground text-center">QR</TableHead>
                  <TableHead className="text-muted-foreground text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground border-white/5">
                      No hay comisiones para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((p) => (
                    <TableRow key={p.vendedorId} className="border-b border-white/5 hover:bg-white/5 transition-all duration-150">
                      <TableCell className="font-medium text-white">{p.vendedorNombre}</TableCell>
                      <TableCell className="text-slate-300">{p.ciudad}</TableCell>
                      <TableCell className="text-slate-300">{p.tienda || "--"}</TableCell>
                      <TableCell className="text-center text-slate-300">{p.cantidadVentas}</TableCell>
                      <TableCell className="font-bold text-right text-white">Bs {p.montoTotal}</TableCell>
                      <TableCell>
                        {p.estado === "Pendiente" ? (
                          <Badge variant="outline" className="border-slate-400/30 text-slate-400 bg-slate-400/10 text-[10px]">Pendiente</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">Pagado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.fotoQr ? (
                          <div className="flex justify-center"><QrCode className="h-4 w-4 text-slate-400 animate-pulse" /></div>
                        ) : (
                          <span className="text-slate-600">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.estado === "Pendiente" && p.montoTotal > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 hover:bg-yellow-500 hover:text-black bg-transparent text-xs py-0 h-7"
                            onClick={() => {
                              setSelectedVendor(p);
                              setVoucherFile(null);
                            }}
                          >
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: REGULARIZACIÓN DE INCIDENCIAS                                      */}
        {/* ========================================================================= */}
        <TabsContent value="incidencias" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-400" />
                Control de Compensaciones Automáticas
              </h2>
              <p className="text-xs text-muted-foreground">
                Cuando una venta previamente pagada es rechazada o devuelta, el sistema registra una incidencia de regularización.
                El monto se deduce de forma automática en el próximo lote de liquidación del vendedor o tienda.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenManualIncModal(true)}
              className="border-white/10 hover:bg-white/10 gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" /> Registrar Ajuste Manual
            </Button>
          </div>

          {/* INCIDENCIAS METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Incidencias</p>
              <p className="text-3xl font-bold text-white">{totalIncidenciasCount}</p>
            </Card>
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Saldo Pendiente de Compensar</p>
              <p className="text-3xl font-bold text-rose-400">Bs {saldoPendienteIncidencias.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</p>
            </Card>
            <Card className="glass-card border-white/5 flex flex-col items-center justify-center p-6 shadow-lg">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Incidencias Compensadas</p>
              <p className="text-3xl font-bold text-emerald-400">{totalCompensadasCount}</p>
            </Card>
          </div>

          {/* INCIDENCIAS TABLE */}
          <Card className="glass-card border-white/5 shadow-xl shadow-black/20 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Filtrar Estado:</Label>
                <Select value={fIncEstado} onValueChange={(val) => { setFIncEstado(val); loadIncidencias(); }}>
                  <SelectTrigger className="w-[180px] h-8 text-xs glass-card border-white/10">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="PENDIENTE">Pendientes de compensar</SelectItem>
                    <SelectItem value="COMPENSADA">Compensadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="ghost" onClick={loadIncidencias} className="h-8 text-xs">
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refrescar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Tipo Incidencia</TableHead>
                  <TableHead className="text-muted-foreground">Beneficiario Afectado</TableHead>
                  <TableHead className="text-muted-foreground">Serial / Venta</TableHead>
                  <TableHead className="text-muted-foreground text-right">Monto Original</TableHead>
                  <TableHead className="text-muted-foreground text-right text-rose-400 font-bold">Saldo Pendiente</TableHead>
                  <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                  <TableHead className="text-muted-foreground">Lote Compensador</TableHead>
                  <TableHead className="text-muted-foreground">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidencias.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground border-white/5">
                      No hay incidencias de regularización registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  incidencias.map((inc) => (
                    <TableRow key={inc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">#{inc.id}</TableCell>
                      <TableCell className="text-sm font-medium text-white">
                        {inc.tipo === "VENTA_PAGADA_ANULADA" ? (
                          <span className="text-rose-400">Venta Pagada Anulada</span>
                        ) : (
                          <span className="text-amber-400">Ajuste Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-200">
                        {inc.vendedorNombre || inc.tiendaNombre || "--"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-300">
                        {inc.serialAfectado ? (
                          <div>Serial: {inc.serialAfectado}</div>
                        ) : inc.ventaId ? (
                          <div>Venta #{inc.ventaId}</div>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-300">
                        Bs {Number(inc.montoACompensar).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-rose-400 font-bold">
                        Bs {Number(inc.saldoPendiente).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {inc.estado === "PENDIENTE" ? (
                          <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-[10px]">
                            Pendiente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                            Compensada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {inc.loteCompensadorId ? `Lote #${inc.loteCompensadorId}` : "--"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inc.fechaRegistro?.split("T")[0] || "--"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: NUEVO LOTE DE CIERRE (WIZARD CON PREVISUALIZACIÓN)                 */}
      {/* ========================================================================= */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-[850px] glass-card border-white/10 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Generación de Lote de Liquidación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Step 1: Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Campaña</Label>
                <Select value={wCampanaId} onValueChange={setWCampanaId}>
                  <SelectTrigger className="glass-card border-white/10 text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="todas">Todas las campañas</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ciudad</Label>
                <Select value={wCiudad} onValueChange={setWCiudad}>
                  <SelectTrigger className="glass-card border-white/10 text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="todas">Todas</SelectItem>
                    {ciudades.map((c) => (
                      <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Beneficiario</Label>
                <Select value={wTipoBeneficiario} onValueChange={setWTipoBeneficiario}>
                  <SelectTrigger className="glass-card border-white/10 text-sm">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="VENDEDOR">Vendedores Directos</SelectItem>
                    <SelectItem value="TIENDA">Tiendas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Button
                  onClick={handlePreviewBatch}
                  disabled={previewLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
                >
                  {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Previsualizar Cierre
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Periodo Desde</Label>
                <Input
                  type="date"
                  className="glass-card border-white/10 text-sm [color-scheme:dark]"
                  value={wStartDate}
                  onChange={(e) => setWStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Periodo Hasta</Label>
                <Input
                  type="date"
                  className="glass-card border-white/10 text-sm [color-scheme:dark]"
                  value={wEndDate}
                  onChange={(e) => setWEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Step 2: Preview Results */}
            {previewResult && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-muted-foreground">Ventas</div>
                    <div className="text-xl font-bold text-white">{previewResult.totalVentas}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-muted-foreground">Beneficiarios</div>
                    <div className="text-xl font-bold text-white">{previewResult.totalBeneficiarios}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-muted-foreground">Monto Bruto</div>
                    <div className="text-xl font-bold text-slate-200">
                      Bs {Number(previewResult.totalMontoBrutoBs).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 text-center">
                    <div className="text-xs text-rose-400">Deducción Incidencias</div>
                    <div className="text-xl font-bold text-rose-400">
                      - Bs {Number(previewResult.totalDeduccionesBs).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                    <div className="text-xs text-emerald-400">Neto a Liquidar</div>
                    <div className="text-xl font-bold text-emerald-400">
                      Bs {Number(previewResult.totalMontoNetoBs).toFixed(2)}
                    </div>
                  </div>
                </div>

                {Number(previewResult.totalDeduccionesBs) > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                    <Scale className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      Se detectaron deducciones automáticas por regularización de incidencias (ventas pagadas previamente devueltas o anuladas).
                      Estas deducciones se compensarán en este lote.
                    </span>
                  </div>
                )}

                {/* Beneficiarios Summary Sub-table */}
                <div className="border border-white/10 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-white/5 sticky top-0">
                      <TableRow className="border-b border-white/10 hover:bg-transparent">
                        <TableHead className="text-xs text-muted-foreground">Beneficiario</TableHead>
                        <TableHead className="text-xs text-muted-foreground">Ciudad / Tienda</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-center">Uds</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right">Bruto (Bs)</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right text-rose-400">Deducción</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right text-emerald-400">Neto (Bs)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewResult.beneficiarios.map((b) => (
                        <TableRow key={b.beneficiarioId} className="border-b border-white/5 text-xs">
                          <TableCell className="font-medium text-white">{b.beneficiarioNombre}</TableCell>
                          <TableCell className="text-slate-300">{b.ciudad || b.tiendaNombre || "--"}</TableCell>
                          <TableCell className="text-center text-slate-200">{b.cantidadVentas}</TableCell>
                          <TableCell className="text-right font-mono text-slate-300">
                            {Number(b.montoBruto).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-rose-400">
                            {Number(b.deduccionIncidencias) > 0 ? `-${Number(b.deduccionIncidencias).toFixed(2)}` : "0.00"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-400">
                            {Number(b.montoNeto).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Observaciones / Notas del Cierre</Label>
                  <Textarea
                    placeholder="Ej. Liquidación primera quincena de octubre, aprobada por finanzas..."
                    className="glass-card border-white/10 text-sm h-18"
                    value={wObservaciones}
                    onChange={(e) => setWObservaciones(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setOpenCreateModal(false)} disabled={creatingBatch}>
              Cancelar
            </Button>
            {previewResult && previewResult.totalVentas > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCreateBatch("BORRADOR")}
                  disabled={creatingBatch}
                  className="border-white/10 hover:bg-white/5"
                >
                  Guardar como Borrador
                </Button>
                <Button
                  onClick={() => handleCreateBatch("EN_REVISION")}
                  disabled={creatingBatch}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
                >
                  {creatingBatch && <Loader2 className="h-4 w-4 animate-spin" />}
                  Generar para Revisión
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: VER DETALLE DEL LOTE                                               */}
      {/* ========================================================================= */}
      <Dialog open={selectedLote !== null} onOpenChange={(open) => !open && setSelectedLote(null)}>
        <DialogContent className="sm:max-w-[900px] glass-card border-white/10 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
          {selectedLote && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-display flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Detalle del Lote: {selectedLote.codigoLote}
                  </DialogTitle>
                  <div>{renderBadgeEstadoLote(selectedLote.estado)}</div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white/5 rounded-lg border border-white/5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Campaña:</span>{" "}
                    <span className="font-semibold text-white">{selectedLote.campanaNombre || "Todas"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ciudad:</span>{" "}
                    <span className="font-semibold text-white">{selectedLote.ciudad || "Nacional"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Creado por:</span>{" "}
                    <span className="font-semibold text-white">{selectedLote.usuarioCreador || "--"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha Cierre:</span>{" "}
                    <span className="font-semibold text-white">{selectedLote.fechaCierre}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monto Bruto:</span>{" "}
                    <span className="font-semibold text-slate-200">Bs {Number(selectedLote.totalMontoBrutoBs).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deducciones:</span>{" "}
                    <span className="font-semibold text-rose-400">- Bs {Number(selectedLote.totalDeduccionesBs).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Neto Liquidado:</span>{" "}
                    <span className="font-bold text-emerald-400">Bs {Number(selectedLote.totalMontoNetoBs).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Ventas:</span>{" "}
                    <span className="font-semibold text-white">{selectedLote.totalVentas}</span>
                  </div>
                </div>

                {selectedLote.motivoObservacion && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 text-xs text-orange-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400 mt-0.5" />
                    <div>
                      <span className="font-semibold text-orange-400">Lote Observado: </span>
                      {selectedLote.motivoObservacion}
                    </div>
                  </div>
                )}

                {selectedLote.observaciones && (
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-slate-300">
                    <span className="text-muted-foreground font-semibold">Observaciones: </span>
                    {selectedLote.observaciones}
                  </div>
                )}

                {selectedLote.comprobantePagoGlobalUrl && (
                  <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-xs flex items-center justify-between">
                    <span className="text-cyan-300 font-medium flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Comprobante de transferencia bancaria registrado
                    </span>
                    <a
                      href={uploadUrl(selectedLote.comprobantePagoGlobalUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      Descargar / Ver Voucher <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {/* Items Table */}
                <div className="border border-white/10 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-white/5 sticky top-0">
                      <TableRow className="border-b border-white/10 hover:bg-transparent text-xs">
                        <TableHead className="text-muted-foreground">Beneficiario</TableHead>
                        <TableHead className="text-muted-foreground">Producto / Serial</TableHead>
                        <TableHead className="text-muted-foreground text-right">Bruto</TableHead>
                        <TableHead className="text-muted-foreground text-right text-rose-400">Deducción</TableHead>
                        <TableHead className="text-muted-foreground text-right text-emerald-400 font-bold">Neto</TableHead>
                        <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                        <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLote.detalles && selectedLote.detalles.length > 0 ? (
                        selectedLote.detalles.map((d) => (
                          <TableRow key={d.id} className="border-b border-white/5 text-xs hover:bg-white/5">
                            <TableCell className="font-medium text-white">
                              <div>{d.vendedorNombre || d.tiendaNombre}</div>
                              <div className="text-[10px] text-muted-foreground">{d.ciudad || d.tiendaNombre}</div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              <div>{d.productModel || "Producto"}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">{d.serial}</div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-300">
                              Bs {Number(d.montoBruto).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-rose-400">
                              {Number(d.deduccionIncidencias) > 0 ? `- Bs ${Number(d.deduccionIncidencias).toFixed(2)}` : "0.00"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-emerald-400">
                              Bs {Number(d.montoNeto).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderBadgeEstadoDetalle(d.estado)}
                              {d.motivoObservacion && (
                                <div className="text-[10px] text-orange-400 italic max-w-[130px] mx-auto truncate" title={d.motivoObservacion}>
                                  {d.motivoObservacion}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {selectedLote.estado !== "PAGADO" && selectedLote.estado !== "ANULADO" && (
                                <>
                                  {d.estado === "PENDIENTE" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setDetalleToObservar({ loteId: selectedLote.id, detalleId: d.id });
                                          setDetalleObservarMotivo("");
                                        }}
                                        className="text-orange-400 hover:bg-orange-500/10 text-[10px] h-6 px-1.5"
                                        title="Observar beneficiario"
                                      >
                                        Observar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleExcluirDetalle(selectedLote.id, d.id)}
                                        className="text-rose-400 hover:bg-rose-500/10 text-[10px] h-6 px-1.5"
                                        title="Excluir del lote"
                                      >
                                        Excluir
                                      </Button>
                                    </>
                                  )}
                                  {d.estado === "OBSERVADO" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleReactivarDetalle(selectedLote.id, d.id)}
                                        className="text-emerald-400 hover:bg-emerald-500/10 text-[10px] h-6 px-1.5"
                                        title="Reactivar beneficiario"
                                      >
                                        Reactivar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleExcluirDetalle(selectedLote.id, d.id)}
                                        className="text-rose-400 hover:bg-rose-500/10 text-[10px] h-6 px-1.5"
                                        title="Excluir del lote"
                                      >
                                        Excluir
                                      </Button>
                                    </>
                                  )}
                                  {d.estado === "EXCLUIDO" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleReactivarDetalle(selectedLote.id, d.id)}
                                      className="text-emerald-400 hover:bg-emerald-500/10 text-[10px] h-6 px-1.5"
                                      title="Reactivar beneficiario"
                                    >
                                      Reactivar
                                    </Button>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                            No hay detalles registrados para este lote.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setSelectedLote(null)}>
                  Cerrar
                </Button>
                {(selectedLote.estado === "BORRADOR" || selectedLote.estado === "EN_REVISION" || selectedLote.estado === "OBSERVADO") && (
                  <Button
                    onClick={() => handleAuthorizeBatch(selectedLote.id)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                  >
                    <Check className="h-4 w-4 mr-1.5" /> {selectedLote.estado === "OBSERVADO" ? "Re-Autorizar Lote" : "Autorizar Lote"}
                  </Button>
                )}
                {selectedLote.estado === "AUTORIZADO" && (
                  <Button
                    onClick={() => {
                      const l = selectedLote;
                      setSelectedLote(null);
                      setLoteToPay(l);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    <DollarSign className="h-4 w-4 mr-1.5" /> Pagar Lote
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: PAGAR LOTE (SUBIR VOUCHER GLOBAL)                                  */}
      {/* ========================================================================= */}
      <Dialog open={loteToPay !== null} onOpenChange={(open) => !open && setLoteToPay(null)}>
        <DialogContent className="sm:max-w-[450px] glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-display flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Confirmar Desembolso y Cierre de Lote
            </DialogTitle>
          </DialogHeader>

          {loteToPay && (
            <div className="space-y-5 py-3">
              <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Lote:</span>
                  <span className="font-mono font-bold text-white">{loteToPay.codigoLote}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Ventas:</span>
                  <span className="font-semibold text-white">{loteToPay.totalVentas}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Neto a Desembolsar:</span>
                  <span className="font-bold text-emerald-400 font-mono text-base">
                    Bs {Number(loteToPay.totalMontoNetoBs).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  Comprobante Global de Pago / Transferencia (Voucher)
                </Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="glass-card border-white/10 text-sm"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setBatchVoucherFile(e.target.files[0]);
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Opcional pero recomendado para respaldo contable. Al marcar como pagado, todas las ventas se cerrarán y las incidencias quedarán resueltas.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoteToPay(null)} disabled={payingBatch}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayBatch}
              disabled={payingBatch}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5"
            >
              {payingBatch && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Desembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ANULAR LOTE                                                        */}
      {/* ========================================================================= */}
      <Dialog open={loteToAnnul !== null} onOpenChange={(open) => !open && setLoteToAnnul(null)}>
        <DialogContent className="sm:max-w-[450px] glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-display flex items-center gap-2 text-rose-400">
              <Ban className="h-5 w-5" />
              Anular Lote de Liquidación
            </DialogTitle>
          </DialogHeader>

          {loteToAnnul && (
            <div className="space-y-4 py-3">
              <p className="text-sm text-slate-300">
                ¿Está seguro de anular el lote <span className="font-mono font-bold text-white">{loteToAnnul.codigoLote}</span>?
                Las ventas vinculadas serán liberadas inmediatamente y podrán incluirse en futuros lotes.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Motivo de Anulación</Label>
                <Input
                  placeholder="Ej. Error en selección de fechas o corrección de datos..."
                  className="glass-card border-white/10 text-sm"
                  value={annulMotivo}
                  onChange={(e) => setAnnulMotivo(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoteToAnnul(null)} disabled={annulling}>
              Volver
            </Button>
            <Button
              onClick={handleConfirmAnnulBatch}
              disabled={annulling}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5"
            >
              {annulling && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: OBSERVAR LOTE                                                      */}
      {/* ========================================================================= */}
      <Dialog open={loteToObservar !== null} onOpenChange={(open) => !open && setLoteToObservar(null)}>
        <DialogContent className="sm:max-w-[480px] glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-display flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Observar Lote de Liquidación
            </DialogTitle>
          </DialogHeader>

          {loteToObservar && (
            <div className="space-y-4 py-3">
              <p className="text-sm text-slate-300">
                El lote <span className="font-mono font-bold text-white">{loteToObservar.codigoLote}</span> quedará retenido en estado <span className="text-orange-400 font-semibold">OBSERVADO</span> hasta que se subsanen las diferencias señaladas.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Motivo de Observación *</Label>
                <Textarea
                  placeholder="Detalla la razón por la que se retiene este lote (ej. Discrepancia en comprobantes, retención solicitada por auditoría)..."
                  className="glass-card border-white/10 text-sm"
                  rows={3}
                  value={observarMotivo}
                  onChange={(e) => setObservarMotivo(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoteToObservar(null)} disabled={observingBatch}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmObservarBatch}
              disabled={observingBatch}
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold gap-1.5"
            >
              {observingBatch && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Observación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: OBSERVAR BENEFICIARIO INDIVIDUAL (DETALLE)                         */}
      {/* ========================================================================= */}
      <Dialog open={detalleToObservar !== null} onOpenChange={(open) => !open && setDetalleToObservar(null)}>
        <DialogContent className="sm:max-w-[450px] glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-display flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Observar Beneficiario Individual
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <p className="text-sm text-slate-300">
              Este beneficiario quedará en estado <span className="text-orange-400 font-semibold">OBSERVADO</span> y no será desembolsado al pagar el lote, permitiendo que los demás beneficiarios válidos reciban su pago con normalidad.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Motivo de Observación *</Label>
              <Textarea
                placeholder="Indica la razón de observación para este beneficiario específico..."
                className="glass-card border-white/10 text-sm"
                rows={3}
                value={detalleObservarMotivo}
                onChange={(e) => setDetalleObservarMotivo(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetalleToObservar(null)} disabled={observingDetalle}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmObservarDetalle}
              disabled={observingDetalle}
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold gap-1.5"
            >
              {observingDetalle && <Loader2 className="h-4 w-4 animate-spin" />}
              Observar Beneficiario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR INCIDENCIA MANUAL                                        */}
      {/* ========================================================================= */}
      <Dialog open={openManualIncModal} onOpenChange={setOpenManualIncModal}>
        <DialogContent className="sm:max-w-[500px] glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-display flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-400" />
              Registrar Incidencia / Regularización Manual
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de Incidencia</Label>
              <Select value={incTipo} onValueChange={setIncTipo}>
                <SelectTrigger className="glass-card border-white/10 text-sm">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="VENTA_PAGADA_ANULADA">Venta Pagada Anulada / Devuelta</SelectItem>
                  <SelectItem value="AJUSTE_MANUAL">Ajuste Contable Manual</SelectItem>
                  <SelectItem value="DEVOLUCION_PRODUCTO">Devolución de Producto en Tienda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vendedor Afectado</Label>
                <Input
                  placeholder="Nombre de vendedor"
                  className="glass-card border-white/10 text-sm"
                  value={incVendedorNombre}
                  onChange={(e) => setIncVendedorNombre(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tienda Afectada</Label>
                <Input
                  placeholder="Nombre de tienda"
                  className="glass-card border-white/10 text-sm"
                  value={incTiendaNombre}
                  onChange={(e) => setIncTiendaNombre(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Serial Afectado (opcional)</Label>
                <Input
                  placeholder="Serial TV"
                  className="glass-card border-white/10 text-sm"
                  value={incSerial}
                  onChange={(e) => setIncSerial(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Monto a Compensar (Bs) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="glass-card border-white/10 text-sm font-mono"
                  value={incMonto}
                  onChange={(e) => setIncMonto(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observaciones / Justificación</Label>
              <Textarea
                placeholder="Indique el motivo del ajuste o devolución..."
                className="glass-card border-white/10 text-sm"
                value={incObs}
                onChange={(e) => setIncObs(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenManualIncModal(false)} disabled={savingInc}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateManualIncidencia}
              disabled={savingInc}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
            >
              {savingInc && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Incidencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: PAGO INDIVIDUAL (LEGACY)                                           */}
      {/* ========================================================================= */}
      <Dialog open={selectedVendor !== null} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle>Registrar Depósito</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6 py-4">
              <div className="rounded-lg bg-white/5 p-4 border border-white/5 flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{selectedVendor.vendedorNombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Monto a liquidar:{" "}
                    <span className="font-bold text-emerald-400">Bs {selectedVendor.montoTotal}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Esta acción marcará las ventas filtradas como Pagadas.</p>
                </div>
              </div>

              {selectedVendor.fotoQr ? (
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-1"><QrCode className="h-3 w-3" /> QR del Vendedor</Label>
                  <img
                    src={uploadUrl(selectedVendor.fotoQr)}
                    alt="QR"
                    className="max-h-[220px] mx-auto object-contain border border-white/5 rounded shadow-sm"
                  />
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-yellow-500/30 rounded bg-yellow-500/10">
                  <p className="text-xs text-yellow-500 font-medium">Este vendedor no ha subido su QR.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Deberá contactarlo para coordinar el depósito a cuenta bancaria.</p>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-white/10">
                <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Subir Comprobante (Voucher)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="glass-card border-white/10"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVoucherFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="hover:bg-white/5" onClick={() => setSelectedVendor(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayIndividual} disabled={submitting || !voucherFile} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
