import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete, uploadUrl, apiDownloadFile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Layers,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  Gift,
  PackageCheck,
  AlertCircle,
  Undo2,
  CheckCircle2,
  Store,
  UserCheck,
  Briefcase,
  Users,
  Eye,
  Camera,
  Printer,
  Download,
  Search,
  Image as ImageIcon,
  ExternalLink,
  FileText,
  X,
  Pencil,
  Trash2
} from "lucide-react";

import { 
  CampanaActivaResponse, 
  CampanaCliente, 
  CampanaDetalleResponse, 
  PremioRuleta 
} from "@/types/clientCampaign";

interface DestinatarioItem {
  id: number;
  nombre: string;
  email?: string;
  ciudad?: string;
  rol?: string;
  tipo: "OPERADOR_BANDEO" | "TRABAJADOR_SKYWORTH" | "VENDEDOR" | "TIENDA";
}

interface DestinatariosResponse {
  operadoresBandeo: DestinatarioItem[];
  trabajadoresSkyworth: DestinatarioItem[];
  vendedores: DestinatarioItem[];
  tiendas: DestinatarioItem[];
}

interface InventarioImpulsadorExt {
  id: number;
  premioRuleta: {
    id: number;
    nombre: string;
    descripcion?: string;
    colorHex?: string;
  };
  usuarioId?: number;
  vendedorId?: number;
  vendedorNombre?: string;
  nombreDestinatario?: string;
  tipoDestinatario?: string;
  tiendaId?: number;
  tiendaNombre?: string;
  cantidadAsignada: number;
  cantidadEntregada: number;
  cantidadDevuelta: number;
  saldo: number;
  estadoConciliacion: string;
  observaciones?: string;
  fechaConciliacion?: string;
  updatedAt?: string;
}

export interface EntregaItem {
  id: number;
  fechaGiro: string;
  fotoEntrega?: string;
  impulsadorId?: number;
  impulsadorNombre?: string;
  revertido?: boolean;
  motivoReversion?: string;
  premio?: {
    id: number;
    nombre: string;
    descripcion?: string;
    colorHex?: string;
  };
  cliente?: {
    id: number;
    nombreCliente: string;
    apellidoCliente?: string;
    nombreCompleto: string;
    ci: string;
    celular: string;
    email?: string;
    ciudad: string;
    puntoVenta?: string;
    productoModelo?: string;
    productoPulgadas?: number;
    serial: string;
    fechaCompra?: string;
    nroFactura?: string;
    estado?: string;
    createdAt?: string;
  };
}

export default function AdminInventariosPremiosPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "admin";

  const [campana, setCampana] = useState<CampanaCliente | null>(null);
  const [inventarios, setInventarios] = useState<InventarioImpulsadorExt[]>([]);
  const [premios, setPremios] = useState<PremioRuleta[]>([]);
  const [destinatarios, setDestinatarios] = useState<DestinatariosResponse>({
    operadoresBandeo: [],
    trabajadoresSkyworth: [],
    vendedores: [],
    tiendas: []
  });
  const [loading, setLoading] = useState(true);

  // Modal Asignar Stock
  const [showModal, setShowModal] = useState(false);
  const [tipoDestinatario, setTipoDestinatario] = useState<"OPERADOR_BANDEO" | "TRABAJADOR_SKYWORTH" | "VENDEDOR" | "TIENDA">("OPERADOR_BANDEO");
  const [selectedDestinatarioId, setSelectedDestinatarioId] = useState("");
  const [tiendaPuntoBandeo, setTiendaPuntoBandeo] = useState("");
  const [selectedPremioId, setSelectedPremioId] = useState("");
  const [cantidadAsignada, setCantidadAsignada] = useState(10);
  const [observacionesAsignacion, setObservacionesAsignacion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal Editar Asignación (Solo Admin)
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItemParaEditar, setSelectedItemParaEditar] = useState<InventarioImpulsadorExt | null>(null);
  const [editCantidadAsignada, setEditCantidadAsignada] = useState(0);
  const [editTiendaNombre, setEditTiendaNombre] = useState("");
  const [editObservaciones, setEditObservaciones] = useState("");
  const [editEstadoConciliacion, setEditEstadoConciliacion] = useState("ABIERTO");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal Eliminar Asignación (Solo Admin)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemParaEliminar, setSelectedItemParaEliminar] = useState<InventarioImpulsadorExt | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Modal Devolución / Conciliación
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [selectedItemParaDevolucion, setSelectedItemParaDevolucion] = useState<InventarioImpulsadorExt | null>(null);
  const [cantidadDevolucion, setCantidadDevolucion] = useState(0);
  const [observacionesDevolucion, setObservacionesDevolucion] = useState("");
  const [submittingDevolucion, setSubmittingDevolucion] = useState(false);

  // Modal Reporte y Ver Entregas con Fotos
  const [showEntregasModal, setShowEntregasModal] = useState(false);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [entregasModalData, setEntregasModalData] = useState<EntregaItem[]>([]);
  const [entregasContext, setEntregasContext] = useState<{
    titulo: string;
    subtitulo: string;
    inventarioId?: number;
    premioNombre?: string;
    totalAsignado?: number;
    totalEntregado?: number;
  } | null>(null);
  const [busquedaEntrega, setBusquedaEntrega] = useState("");
  const [filtroConFoto, setFiltroConFoto] = useState<"TODAS" | "CON_FOTO" | "SIN_FOTO">("TODAS");
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const campanaRes = await apiGet<CampanaActivaResponse>("/cliente/campana-activa");
      if (campanaRes.activa && campanaRes.campana) {
        setCampana(campanaRes.campana);
        const invRes = await apiGet<InventarioImpulsadorExt[]>(`/admin/campanas-cliente/${campanaRes.campana.id}/inventario`);
        setInventarios(invRes || []);

        const det = await apiGet<CampanaDetalleResponse>(`/admin/campanas-cliente/${campanaRes.campana.id}`);
        setPremios(det?.premiosRuleta || []);
      }

      const destRes = await apiGet<DestinatariosResponse>("/admin/campanas-cliente/destinatarios-bandeo");
      if (destRes) {
        setDestinatarios(destRes);
      }
    } catch (err: unknown) {
      console.error("Error al cargar inventarios y destinatarios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campana?.id || !selectedDestinatarioId || !selectedPremioId) {
      toast({ title: "Datos requeridos", description: "Seleccione destinatario y premio.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const destList = 
        tipoDestinatario === "OPERADOR_BANDEO" ? destinatarios.operadoresBandeo :
        tipoDestinatario === "TRABAJADOR_SKYWORTH" ? destinatarios.trabajadoresSkyworth :
        tipoDestinatario === "VENDEDOR" ? destinatarios.vendedores :
        destinatarios.tiendas;

      const objDest = destList.find(d => String(d.id) === String(selectedDestinatarioId));
      const destinatarioNombre = objDest ? objDest.nombre : "";

      const params = new URLSearchParams();
      params.append("premioRuletaId", selectedPremioId);
      params.append("cantidadAsignada", String(cantidadAsignada));
      params.append("tipoDestinatario", tipoDestinatario);
      params.append("destinatarioId", selectedDestinatarioId);
      if (destinatarioNombre) params.append("destinatarioNombre", destinatarioNombre);
      if (tiendaPuntoBandeo) params.append("tiendaNombre", tiendaPuntoBandeo);
      if (observacionesAsignacion) params.append("observaciones", observacionesAsignacion);

      await apiPost(`/admin/campanas-cliente/${campana.id}/inventario/asignar?${params.toString()}`, {});
      toast({ title: "Stock Asignado Exitosamente", description: "El inventario para bandeo ha sido registrado." });
      setShowModal(false);
      setSelectedDestinatarioId("");
      setTiendaPuntoBandeo("");
      setObservacionesAsignacion("");
      cargarDatos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al asignar stock";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const abrirModalEditar = (inv: InventarioImpulsadorExt) => {
    setSelectedItemParaEditar(inv);
    setEditCantidadAsignada(inv.cantidadAsignada);
    setEditTiendaNombre(inv.tiendaNombre || "");
    setEditObservaciones(inv.observaciones || "");
    setEditEstadoConciliacion(inv.estadoConciliacion || "ABIERTO");
    setShowEditModal(true);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemParaEditar) return;

    const entregadasYDevueltas = (selectedItemParaEditar.cantidadEntregada || 0) + (selectedItemParaEditar.cantidadDevuelta || 0);
    if (editCantidadAsignada < entregadasYDevueltas) {
      toast({
        title: "Cantidad no válida",
        description: `No puede asignar menos de ${entregadasYDevueltas} unidades (ya existen ${selectedItemParaEditar.cantidadEntregada} entregas y ${selectedItemParaEditar.cantidadDevuelta} devoluciones).`,
        variant: "destructive"
      });
      return;
    }

    setSubmittingEdit(true);
    try {
      const params = new URLSearchParams();
      params.append("cantidadAsignada", String(editCantidadAsignada));
      if (editTiendaNombre.trim()) params.append("tiendaNombre", editTiendaNombre.trim());
      if (editObservaciones.trim()) params.append("observaciones", editObservaciones.trim());
      params.append("estadoConciliacion", editEstadoConciliacion);

      await apiPut(`/admin/campanas-cliente/inventario/${selectedItemParaEditar.id}?${params.toString()}`, {});
      toast({
        title: "Asignación actualizada",
        description: `Se actualizó el stock para ${selectedItemParaEditar.nombreDestinatario || "el destinatario"}.`
      });
      setShowEditModal(false);
      cargarDatos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al actualizar asignación";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const abrirModalEliminar = (inv: InventarioImpulsadorExt) => {
    setSelectedItemParaEliminar(inv);
    setShowDeleteModal(true);
  };

  const handleConfirmarEliminar = async () => {
    if (!selectedItemParaEliminar) return;

    if (selectedItemParaEliminar.cantidadEntregada > 0) {
      toast({
        title: "No se puede eliminar",
        description: `Esta asignación cuenta con ${selectedItemParaEliminar.cantidadEntregada} entregas registradas a clientes. Primero debe conciliarla o resolver las entregas.`,
        variant: "destructive"
      });
      setShowDeleteModal(false);
      return;
    }

    setSubmittingDelete(true);
    try {
      await apiDelete(`/admin/campanas-cliente/inventario/${selectedItemParaEliminar.id}`);
      toast({
        title: "Asignación eliminada",
        description: "El registro de asignación fue removido exitosamente."
      });
      setShowDeleteModal(false);
      cargarDatos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al eliminar asignación";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmittingDelete(false);
    }
  };

  const abrirModalDevolucion = (item: InventarioImpulsadorExt) => {
    setSelectedItemParaDevolucion(item);
    // Sugerir la cantidad que tiene en mano (saldo actual)
    setCantidadDevolucion(Math.max(0, item.saldo));
    setObservacionesDevolucion("");
    setShowDevolucionModal(true);
  };

  const handleGuardarDevolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemParaDevolucion) return;

    setSubmittingDevolucion(true);
    try {
      const params = new URLSearchParams();
      params.append("cantidadDevuelta", String(cantidadDevolucion));
      if (observacionesDevolucion) params.append("observaciones", observacionesDevolucion);

      await apiPost(`/admin/campanas-cliente/inventario/${selectedItemParaDevolucion.id}/devolucion?${params.toString()}`, {});
      toast({ title: "Devolución y Conciliación Guardada", description: "El stock fue actualizado y el saldo recalculado." });
      setShowDevolucionModal(false);
      cargarDatos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al registrar devolución";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmittingDevolucion(false);
    }
  };

  // KPIs consolidados
  const totalAsignado = inventarios.reduce((sum, item) => sum + (item.cantidadAsignada || 0), 0);
  const totalEntregado = inventarios.reduce((sum, item) => sum + (item.cantidadEntregada || 0), 0);
  const totalDevuelto = inventarios.reduce((sum, item) => sum + (item.cantidadDevuelta || 0), 0);
  const totalPendiente = inventarios.reduce((sum, item) => sum + (item.saldo || 0), 0);

  const abrirReporteEntregas = async (inv: InventarioImpulsadorExt) => {
    try {
      setLoadingEntregas(true);
      setShowEntregasModal(true);
      setBusquedaEntrega("");
      setFiltroConFoto("TODAS");
      setEntregasContext({
        titulo: `Entregas de ${inv.premioRuleta?.nombre || "Insumo / Premio"}`,
        subtitulo: `Asignado a: ${inv.nombreDestinatario || inv.vendedorNombre || "Operador"} · Tienda: ${inv.tiendaNombre || "Punto General"}`,
        inventarioId: inv.id,
        premioNombre: inv.premioRuleta?.nombre,
        totalAsignado: inv.cantidadAsignada,
        totalEntregado: inv.cantidadEntregada,
      });

      const res = await apiGet<EntregaItem[]>(`/admin/campanas-cliente/inventario/${inv.id}/entregas`);
      setEntregasModalData(res || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudieron obtener las entregas.";
      toast({
        title: "Error al cargar entregas",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingEntregas(false);
    }
  };

  const abrirTodasLasEntregas = async () => {
    if (!campana?.id) return;
    try {
      setLoadingEntregas(true);
      setShowEntregasModal(true);
      setBusquedaEntrega("");
      setFiltroConFoto("TODAS");
      setEntregasContext({
        titulo: `Consolidado General de Entregas - ${campana.nombre}`,
        subtitulo: `Historial completo de clientes beneficiarios y evidencias fotográficas de bandeo`,
        totalAsignado: totalAsignado,
        totalEntregado: totalEntregado,
      });

      const res = await apiGet<EntregaItem[]>(`/admin/campanas-cliente/${campana.id}/entregas-todas`);
      setEntregasModalData(res || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudieron obtener las entregas.";
      toast({
        title: "Error al cargar entregas",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingEntregas(false);
    }
  };

  const exportarEntregasExcel = async (inventarioId?: number) => {
    try {
      if (inventarioId) {
        await apiDownloadFile(
          `/admin/reportes-cliente/exportar-entregas?inventarioId=${inventarioId}`,
          `entregas_inventario_${inventarioId}_${new Date().toISOString().split("T")[0]}.xlsx`
        );
      } else if (campana?.id) {
        await apiDownloadFile(
          `/admin/reportes-cliente/exportar-entregas?campanaId=${campana.id}`,
          `entregas_campana_${campana.id}_${new Date().toISOString().split("T")[0]}.xlsx`
        );
      }
      toast({ title: "Excel descargado exitosamente" });
    } catch (err: unknown) {
      toast({ title: "Error al exportar entregas", description: (err as Error).message, variant: "destructive" });
    }
  };

  const entregasFiltradas = entregasModalData.filter((e) => {
    if (filtroConFoto === "CON_FOTO" && (!e.fotoEntrega || e.fotoEntrega.trim() === "")) return false;
    if (filtroConFoto === "SIN_FOTO" && e.fotoEntrega && e.fotoEntrega.trim() !== "") return false;

    if (!busquedaEntrega.trim()) return true;
    const q = busquedaEntrega.toLowerCase();
    const cli = e.cliente;
    return (
      cli?.nombreCompleto?.toLowerCase().includes(q) ||
      cli?.ci?.toLowerCase().includes(q) ||
      cli?.celular?.toLowerCase().includes(q) ||
      cli?.serial?.toLowerCase().includes(q) ||
      cli?.productoModelo?.toLowerCase().includes(q) ||
      cli?.puntoVenta?.toLowerCase().includes(q) ||
      e.impulsadorNombre?.toLowerCase().includes(q) ||
      e.premio?.nombre?.toLowerCase().includes(q)
    );
  });

  const imprimirReporteConFotos = () => {
    if (!entregasFiltradas || entregasFiltradas.length === 0) {
      toast({ title: "Sin entregas", description: "No hay registros para generar el informe.", variant: "destructive" });
      return;
    }

    const printWindow = window.open("", "_blank", "width=1050,height=900");
    if (!printWindow) {
      toast({ title: "Ventana emergente bloqueada", description: "Por favor permite ventanas emergentes en el navegador.", variant: "destructive" });
      return;
    }

    const filasHtml = entregasFiltradas.map((e, index) => {
      const cli = e.cliente;
      const imgUrl = e.fotoEntrega ? uploadUrl(e.fotoEntrega) : "";
      const fecha = e.fechaGiro ? new Date(e.fechaGiro).toLocaleString("es-BO") : "-";

      return `
        <tr class="item-row">
          <td class="idx-col">${index + 1}</td>
          <td class="photo-col">
            ${imgUrl ? `
              <div class="photo-container">
                <img src="${imgUrl}" alt="Foto Entrega">
                <div class="photo-tag">EVIDENCIA FÍSICA</div>
              </div>
            ` : `
              <div class="no-photo">Sin fotografía registrada</div>
            `}
          </td>
          <td class="client-col">
            <div class="client-name">${cli?.nombreCompleto || "Cliente"}</div>
            <div class="detail-line"><strong>CI:</strong> ${cli?.ci || "-"} &nbsp;|&nbsp; <strong>Celular:</strong> ${cli?.celular || "-"}</div>
            <div class="detail-line"><strong>Ciudad:</strong> ${cli?.ciudad || "-"} &nbsp;|&nbsp; <strong>Punto Venta:</strong> ${cli?.puntoVenta || "-"}</div>
            <div class="detail-line"><strong>Modelo TV:</strong> ${cli?.productoModelo || "TV Skyworth"} (${cli?.productoPulgadas || 'N/A'}")</div>
            <div class="detail-line"><strong>N° Serial:</strong> <span class="serial-tag">${cli?.serial || "-"}</span></div>
            <div class="detail-line"><strong>Factura:</strong> ${cli?.nroFactura || "-"} &nbsp;|&nbsp; <strong>Compra:</strong> ${cli?.fechaCompra || "-"}</div>
          </td>
          <td class="prize-col">
            <div class="prize-badge">${e.premio?.nombre || "Premio"}</div>
            <div class="detail-line mt-2"><strong>Operador:</strong> ${e.impulsadorNombre || "-"}</div>
            <div class="detail-line"><strong>Fecha Giro:</strong> ${fecha}</div>
            <div class="detail-line"><strong>ID Entrega:</strong> #${e.id}</div>
          </td>
          <td class="sign-col">
            <div class="sign-box">
              <div class="sign-line"></div>
              <div class="sign-label">Firma de Conformidad</div>
              <div class="sign-ci">CI: ${cli?.ci || ""}</div>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reporte Oficial de Entregas y Fotos - Skyworth</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 15px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px; }
          .logo-title h1 { margin: 0; font-size: 20px; font-weight: 800; color: #0369a1; letter-spacing: 0.5px; }
          .logo-title p { margin: 3px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600; }
          .meta-info { text-align: right; font-size: 10px; color: #475569; }
          .meta-info strong { color: #0f172a; }
          .kpi-bar { display: flex; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 15px; margin-bottom: 15px; }
          .kpi-item { flex: 1; }
          .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
          .kpi-val { font-size: 13px; font-weight: 800; color: #0284c7; }
          table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; vertical-align: top; }
          .idx-col { width: 25px; font-weight: bold; color: #64748b; text-align: center; }
          .photo-col { width: 170px; text-align: center; }
          .photo-container { position: relative; width: 160px; height: 120px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; background: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .photo-container img { width: 100%; height: 100%; object-fit: cover; }
          .photo-tag { position: absolute; bottom: 3px; right: 3px; background: rgba(0,0,0,0.75); color: #fff; font-size: 8px; font-weight: 700; padding: 2px 4px; border-radius: 3px; }
          .no-photo { width: 160px; height: 100px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #94a3b8; font-size: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; }
          .client-col { width: 270px; }
          .client-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .detail-line { font-size: 10px; color: #334155; margin-bottom: 2px; }
          .serial-tag { font-family: monospace; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 3px; font-weight: 600; }
          .prize-col { width: 180px; }
          .prize-badge { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 700; padding: 3px 8px; border-radius: 12px; font-size: 11px; }
          .sign-col { width: 120px; }
          .sign-box { border: 1px dashed #94a3b8; border-radius: 6px; height: 110px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding: 6px; background: #fafafa; }
          .sign-line { width: 85%; border-top: 1px solid #475569; margin-bottom: 4px; }
          .sign-label { font-size: 8px; text-transform: uppercase; color: #475569; font-weight: 700; }
          .sign-ci { font-size: 8px; color: #64748b; }
          .footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-title">
            <h1>SKYWORTH · REPORTE OFICIAL DE ENTREGAS</h1>
            <p>CONCILIACIÓN FÍSICA Y EVIDENCIA FOTOGRÁFICA DE BANDEO</p>
          </div>
          <div class="meta-info">
            <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-BO')} ${new Date().toLocaleTimeString('es-BO')}</div>
            <div><strong>Total Registros:</strong> ${entregasFiltradas.length} clientes</div>
          </div>
        </div>

        <div class="kpi-bar">
          <div class="kpi-item">
            <div class="kpi-label">Asignación / Contexto</div>
            <div class="kpi-val">${entregasContext?.titulo || "Entregas Ruleta"}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">Responsable / Tienda</div>
            <div class="kpi-val">${entregasContext?.subtitulo || "-"}</div>
          </div>
          <div class="kpi-item" style="max-width: 140px;">
            <div class="kpi-label">Total Entregados</div>
            <div class="kpi-val">${entregasFiltradas.length} u.</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="idx-col">#</th>
              <th class="photo-col">Foto de Entrega</th>
              <th class="client-col">Datos del Cliente y Producto</th>
              <th class="prize-col">Premio / Insumo</th>
              <th class="sign-col">Recepción</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Sistema Skyworth Bono Vendedor &copy; ${new Date().getFullYear()} · Confidencial</div>
          <div>Auditoría de Conciliación de Bandeos de Ruleta</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 via-slate-900 to-slate-900 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" /> Logística y Bandeos
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Control de Stock & Conciliación de Bandeos
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Asignación de insumos a operadores, tiendas y trabajadores de Skyworth · Conciliación: Asignado = Entregado + Devuelto
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cargarDatos}
            className="border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          {campana?.id && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={abrirTodasLasEntregas}
                className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl"
                title="Ver listado y fotos de todas las entregas realizadas en la campaña"
              >
                <Camera className="w-4 h-4 mr-2 text-emerald-400" />
                Ver Entregas & Fotos ({totalEntregado})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => exportarEntregasExcel()}
                className="border-white/10 hover:bg-white/5 text-emerald-400 rounded-xl"
                title="Exportar todas las entregas de bandeo a Excel"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </>
          )}

          <Button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Asignar Items
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Asignado</p>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">{totalAsignado} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Gift className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Entregados Ruleta</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{totalEntregado} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Devueltos Almacén</p>
              <h3 className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">{totalDevuelto} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Undo2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Saldo por Rendir</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{totalPendiente} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Conciliación */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader className="p-5 border-b border-white/5">
          <CardTitle className="text-lg text-white">Detalle de Asignaciones y Conciliación Física</CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Cada operador o tienda debe conciliar entregas de ruleta y devolución de sobrantes al cerrar la jornada.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-2xl overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/80">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Destinatario / Asignado A</TableHead>
                  <TableHead className="text-slate-400 text-xs">Tienda / Punto de Bandeo</TableHead>
                  <TableHead className="text-slate-400 text-xs">Insumo / Premio</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Asignados</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Entregados</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Devueltos</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Saldo Pendiente</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Conciliación</TableHead>
                  <TableHead className="text-right text-slate-400 text-xs">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-500 text-xs">
                      No hay asignaciones de stock para esta campaña todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventarios.map((inv) => {
                    const tipo = inv.tipoDestinatario || "OPERADOR_BANDEO";
                    const nombre = inv.nombreDestinatario || inv.vendedorNombre || `ID #${inv.usuarioId || inv.vendedorId}`;
                    return (
                      <TableRow key={inv.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-xs text-white">{nombre}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {tipo === "OPERADOR_BANDEO" && (
                                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px]">
                                  <UserCheck className="w-2.5 h-2.5 mr-1" /> Operador Bandeo
                                </Badge>
                              )}
                              {tipo === "TRABAJADOR_SKYWORTH" && (
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">
                                  <Briefcase className="w-2.5 h-2.5 mr-1" /> Skyworth
                                </Badge>
                              )}
                              {tipo === "VENDEDOR" && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                                  <Users className="w-2.5 h-2.5 mr-1" /> Vendedor
                                </Badge>
                              )}
                              {tipo === "TIENDA" && (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                                  <Store className="w-2.5 h-2.5 mr-1" /> Tienda
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-300 font-medium">
                            {inv.tiendaNombre || "Punto General"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: inv.premioRuleta?.colorHex || "#3b82f6" }} />
                            <span className="text-xs text-slate-200">{inv.premioRuleta?.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-medium text-slate-300">
                          {inv.cantidadAsignada} u.
                        </TableCell>
                        <TableCell className="text-center font-mono font-medium">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-emerald-400 font-bold">{inv.cantidadEntregada} u.</span>
                            {inv.cantidadEntregada > 0 ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => abrirReporteEntregas(inv)}
                                className="h-6 px-2 text-[10px] text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg flex items-center gap-1 font-semibold"
                                title="Ver entregas físicas y fotos de clientes"
                              >
                                <Eye className="w-3 h-3 text-emerald-400" />
                                Ver {inv.cantidadEntregada}
                              </Button>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-sans">Sin entregas</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-medium text-cyan-400">
                          {inv.cantidadDevuelta || 0} u.
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-amber-400 text-sm">
                          {inv.saldo} u.
                        </TableCell>
                        <TableCell className="text-center">
                          {inv.saldo === 0 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Conciliado
                            </Badge>
                          ) : inv.cantidadDevuelta > 0 ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                              Parcial ({inv.saldo} u. falta)
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">
                              En Circulación
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => abrirModalEditar(inv)}
                                  className="h-8 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-300 rounded-xl"
                                  title="Editar asignación (solo Administrador)"
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-1 text-amber-400" />
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => abrirModalEliminar(inv)}
                                  className="h-8 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 rounded-xl"
                                  title="Eliminar asignación (solo Administrador)"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
                                  Eliminar
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirReporteEntregas(inv)}
                              className="h-8 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-300 rounded-xl"
                              title="Exportar registros y fotos de las entregas realizadas"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                              Exportar / Entregas ({inv.cantidadEntregada})
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalDevolucion(inv)}
                              className="h-8 border-white/10 hover:bg-white/5 text-xs text-slate-200 rounded-xl"
                            >
                              <Undo2 className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                              Devolver / Conciliar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Asignar Stock */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Asignar Stock para Bandeos</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Entregue insumos promocionales a operadores, personal Skyworth, vendedores o tiendas.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tipoDestinatario} onValueChange={(v) => {
            setTipoDestinatario(v as "OPERADOR_BANDEO" | "TRABAJADOR_SKYWORTH" | "VENDEDOR" | "TIENDA");
            setSelectedDestinatarioId("");
          }}>
            <TabsList className="grid grid-cols-4 bg-slate-900 border border-white/10 p-1 rounded-2xl mb-4">
              <TabsTrigger value="OPERADOR_BANDEO" className="text-[11px] rounded-xl">Operador</TabsTrigger>
              <TabsTrigger value="TRABAJADOR_SKYWORTH" className="text-[11px] rounded-xl">Skyworth</TabsTrigger>
              <TabsTrigger value="VENDEDOR" className="text-[11px] rounded-xl">Vendedor</TabsTrigger>
              <TabsTrigger value="TIENDA" className="text-[11px] rounded-xl">Tienda</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleAsignar} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs text-slate-400">
                {tipoDestinatario === "OPERADOR_BANDEO" && "Seleccionar Operador de Bandeo *"}
                {tipoDestinatario === "TRABAJADOR_SKYWORTH" && "Seleccionar Personal / Trabajador Skyworth *"}
                {tipoDestinatario === "VENDEDOR" && "Seleccionar Vendedor de Tienda *"}
                {tipoDestinatario === "TIENDA" && "Seleccionar Tienda Comercial *"}
              </Label>
              <select
                required
                value={selectedDestinatarioId}
                onChange={(e) => setSelectedDestinatarioId(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-200 mt-1"
              >
                <option value="">Seleccione...</option>
                {tipoDestinatario === "OPERADOR_BANDEO" && destinatarios.operadoresBandeo.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.ciudad || "Sin ciudad"}) - {d.email}
                  </option>
                ))}
                {tipoDestinatario === "TRABAJADOR_SKYWORTH" && destinatarios.trabajadoresSkyworth.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} [{d.rol}] ({d.ciudad || "General"})
                  </option>
                ))}
                {tipoDestinatario === "VENDEDOR" && destinatarios.vendedores.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.ciudad || "Tienda"})
                  </option>
                ))}
                {tipoDestinatario === "TIENDA" && destinatarios.tiendas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.ciudad || "Central"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-slate-400">Tienda / Punto de Venta donde realizará el bandeo</Label>
              <Input
                placeholder="Ej: Tienda MegaHogar, Feria La Cancha, Central..."
                value={tiendaPuntoBandeo}
                onChange={(e) => setTiendaPuntoBandeo(e.target.value)}
                className="bg-slate-900 border-white/10 mt-1 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-400">Insumo / Premio de Ruleta *</Label>
              <select
                required
                value={selectedPremioId}
                onChange={(e) => setSelectedPremioId(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-200 mt-1"
              >
                <option value="">Seleccione premio...</option>
                {premios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-slate-400">Cantidad Total Asignada (Unidades) *</Label>
              <Input
                type="number"
                min="1"
                required
                value={cantidadAsignada}
                onChange={(e) => setCantidadAsignada(Number(e.target.value))}
                className="bg-slate-900 border-white/10 mt-1 rounded-xl font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-400">Observaciones / Nota de entrega</Label>
              <Textarea
                rows={2}
                placeholder="Ej. Entrega para evento fin de semana..."
                value={observacionesAsignacion}
                onChange={(e) => setObservacionesAsignacion(e.target.value)}
                className="bg-slate-900 border-white/10 mt-1 rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">
                Confirmar Asignación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Devolución / Conciliación */}
      <Dialog open={showDevolucionModal} onOpenChange={setShowDevolucionModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Registrar Devolución & Conciliar</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Registre las unidades físicas devueltas al almacén para cerrar el balance del bandeo.
            </DialogDescription>
          </DialogHeader>

          {selectedItemParaDevolucion && (
            <form onSubmit={handleGuardarDevolucion} className="space-y-4 text-xs">
              <div className="bg-slate-900/80 border border-white/5 p-3 rounded-2xl space-y-1">
                <p className="text-slate-400 text-[11px]">Destinatario: <span className="text-white font-semibold">{selectedItemParaDevolucion.nombreDestinatario || selectedItemParaDevolucion.vendedorNombre}</span></p>
                <p className="text-slate-400 text-[11px]">Premio: <span className="text-white font-semibold">{selectedItemParaDevolucion.premioRuleta?.nombre}</span></p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400">Asignados</p>
                    <p className="font-bold text-white font-mono">{selectedItemParaDevolucion.cantidadAsignada}</p>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400">Entregados</p>
                    <p className="font-bold text-emerald-400 font-mono">{selectedItemParaDevolucion.cantidadEntregada}</p>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400">Por Devolver</p>
                    <p className="font-bold text-amber-400 font-mono">{selectedItemParaDevolucion.saldo}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Unidades Físicas Devueltas *</Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedItemParaDevolucion.cantidadAsignada - selectedItemParaDevolucion.cantidadEntregada}
                  required
                  value={cantidadDevolucion}
                  onChange={(e) => setCantidadDevolucion(Number(e.target.value))}
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Máximo posible a devolver: {(selectedItemParaDevolucion.cantidadAsignada - selectedItemParaDevolucion.cantidadEntregada)} u.
                </p>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Observaciones de Conciliación</Label>
                <Textarea
                  rows={2}
                  placeholder="Ej. Insumos devueltos en perfecto estado al almacén central..."
                  value={observacionesDevolucion}
                  onChange={(e) => setObservacionesDevolucion(e.target.value)}
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={submittingDevolucion} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl">
                  Guardar Devolución y Conciliar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Editar Asignación (Solo Administrador) */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-400" />
              Editar Asignación de Stock
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Modifique la cantidad asignada, punto de venta o estado de conciliación.
            </DialogDescription>
          </DialogHeader>

          {selectedItemParaEditar && (
            <form onSubmit={handleGuardarEdicion} className="space-y-4 text-xs">
              <div className="bg-slate-900/80 border border-white/5 p-3 rounded-2xl space-y-1">
                <p className="text-slate-400 text-[11px]">
                  Destinatario: <span className="text-white font-semibold">{selectedItemParaEditar.nombreDestinatario || selectedItemParaEditar.vendedorNombre || "Operador"}</span>
                </p>
                <p className="text-slate-400 text-[11px]">
                  Premio / Insumo: <span className="text-white font-semibold">{selectedItemParaEditar.premioRuleta?.nombre}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400">Entregados</p>
                    <p className="font-bold text-emerald-400 font-mono">{selectedItemParaEditar.cantidadEntregada} u.</p>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400">Devueltos</p>
                    <p className="font-bold text-cyan-400 font-mono">{selectedItemParaEditar.cantidadDevuelta || 0} u.</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Cantidad Total Asignada *</Label>
                <Input
                  type="number"
                  min={(selectedItemParaEditar.cantidadEntregada || 0) + (selectedItemParaEditar.cantidadDevuelta || 0)}
                  required
                  value={editCantidadAsignada}
                  onChange={(e) => setEditCantidadAsignada(Number(e.target.value))}
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Mínimo permitido: {(selectedItemParaEditar.cantidadEntregada || 0) + (selectedItemParaEditar.cantidadDevuelta || 0)} u. (por entregas y devoluciones existentes).
                </p>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Tienda / Punto de Bandeo</Label>
                <Input
                  value={editTiendaNombre}
                  onChange={(e) => setEditTiendaNombre(e.target.value)}
                  placeholder="Ej: Cañoto, Central, Sucursal 1..."
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl text-xs"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-400">Estado de Conciliación</Label>
                <select
                  value={editEstadoConciliacion}
                  onChange={(e) => setEditEstadoConciliacion(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 h-10 text-xs text-slate-200 mt-1"
                >
                  <option value="ABIERTO">ABIERTO (En circulación)</option>
                  <option value="CONCILIADO">CONCILIADO (Cerrado)</option>
                  <option value="PARCIAL">PARCIAL (Con saldo pendiente)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Observaciones</Label>
                <Textarea
                  rows={2}
                  placeholder="Motivo de la modificación o notas adicionales..."
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  className="bg-slate-900 border-white/10 mt-1 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingEdit}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                >
                  {submittingEdit ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación (Solo Administrador) */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-rose-500/20 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Eliminar Asignación de Stock
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Esta acción eliminará el registro de stock asignado permanentemente.
            </DialogDescription>
          </DialogHeader>

          {selectedItemParaEliminar && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-900/80 border border-white/5 p-3 rounded-2xl space-y-1.5">
                <p className="text-slate-400 text-[11px]">
                  Destinatario: <span className="text-white font-semibold">{selectedItemParaEliminar.nombreDestinatario || selectedItemParaEliminar.vendedorNombre || "Operador"}</span>
                </p>
                <p className="text-slate-400 text-[11px]">
                  Premio / Insumo: <span className="text-white font-semibold">{selectedItemParaEliminar.premioRuleta?.nombre}</span>
                </p>
                <p className="text-slate-400 text-[11px]">
                  Cantidad Asignada: <span className="text-white font-mono font-semibold">{selectedItemParaEliminar.cantidadAsignada} u.</span>
                </p>
                <p className="text-slate-400 text-[11px]">
                  Entregas Registradas: <span className={`font-mono font-bold ${selectedItemParaEliminar.cantidadEntregada > 0 ? "text-amber-400" : "text-emerald-400"}`}>{selectedItemParaEliminar.cantidadEntregada} u.</span>
                </p>
              </div>

              {selectedItemParaEliminar.cantidadEntregada > 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    No es posible eliminar esta asignación porque ya cuenta con <strong>{selectedItemParaEliminar.cantidadEntregada} entregas físicas registradas</strong> con evidencias de clientes. Si desea cerrar el saldo, utilice la opción <strong>Devolver / Conciliar</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  ¿Está seguro de que desea eliminar esta asignación? Esta operación no se puede deshacer.
                </div>
              )}

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={submittingDelete || selectedItemParaEliminar.cantidadEntregada > 0}
                  onClick={handleConfirmarEliminar}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
                >
                  {submittingDelete ? "Eliminando..." : "Eliminar Asignación"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Reporte Detallado de Entregas y Fotos */}
      <Dialog open={showEntregasModal} onOpenChange={setShowEntregasModal}>
        <DialogContent className="max-w-5xl bg-slate-950 border border-white/10 text-white rounded-3xl p-6 max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b border-white/10 pb-4 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {entregasFiltradas.length} Registros de Entrega
                  </Badge>
                  {entregasContext?.totalAsignado !== undefined && (
                    <span className="text-[11px] text-slate-400">
                      (Asignados: {entregasContext.totalAsignado} u. · Entregados: {entregasModalData.length} u.)
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-black text-white mt-1">
                  {entregasContext?.titulo || "Reporte de Entregas a Clientes"}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-0.5">
                  {entregasContext?.subtitulo || "Auditoría de insumos promocionales y fotografías de entrega física"}
                </DialogDescription>
              </div>

              {/* Acciones principales de exportación */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={imprimirReporteConFotos}
                  disabled={entregasFiltradas.length === 0}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs h-9 shadow-lg shadow-blue-500/20"
                  title="Abrir vista de impresión y PDF con membrete y fotografías embebidas"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Imprimir / PDF con Fotos
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportarEntregasExcel(entregasContext?.inventarioId)}
                  className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold rounded-xl text-xs h-9"
                  title="Descargar archivo Excel con datos completos y links a las fotos"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Excel (.xlsx)
                </Button>
              </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 pt-3 border-t border-white/5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Buscar por cliente, CI, celular, serial TV, modelo o punto de venta..."
                  value={busquedaEntrega}
                  onChange={(e) => setBusquedaEntrega(e.target.value)}
                  className="bg-slate-900 border-white/10 pl-9 rounded-xl text-xs h-9 text-slate-200"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 p-1 rounded-xl border border-white/5">
                <Button
                  size="sm"
                  variant={filtroConFoto === "TODAS" ? "secondary" : "ghost"}
                  onClick={() => setFiltroConFoto("TODAS")}
                  className="text-[11px] h-7 px-2.5 rounded-lg"
                >
                  Todas ({entregasModalData.length})
                </Button>
                <Button
                  size="sm"
                  variant={filtroConFoto === "CON_FOTO" ? "secondary" : "ghost"}
                  onClick={() => setFiltroConFoto("CON_FOTO")}
                  className="text-[11px] h-7 px-2.5 rounded-lg text-emerald-400"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  Con Foto ({entregasModalData.filter(e => !!e.fotoEntrega).length})
                </Button>
                <Button
                  size="sm"
                  variant={filtroConFoto === "SIN_FOTO" ? "secondary" : "ghost"}
                  onClick={() => setFiltroConFoto("SIN_FOTO")}
                  className="text-[11px] h-7 px-2.5 rounded-lg text-slate-400"
                >
                  Sin Foto ({entregasModalData.filter(e => !e.fotoEntrega).length})
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Lista de Registros con Fotos */}
          <div className="flex-1 overflow-y-auto pr-1 py-4">
            {loadingEntregas ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
                <p className="text-xs">Cargando registros de entrega y evidencias fotográficas...</p>
              </div>
            ) : entregasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 bg-slate-900/30 rounded-2xl border border-white/5">
                <Gift className="w-12 h-12 text-slate-600 mb-3 stroke-[1.5]" />
                <h4 className="text-sm font-semibold text-slate-300">No se encontraron registros de entrega</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {busquedaEntrega.trim()
                    ? "No hay resultados que coincidan con su búsqueda."
                    : "Aún no se han registrado entregas para esta asignación en la ruleta."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {entregasFiltradas.map((e, index) => {
                  const cli = e.cliente;
                  const tieneFoto = !!e.fotoEntrega;
                  const urlFoto = tieneFoto ? uploadUrl(e.fotoEntrega!) : "";

                  return (
                    <div
                      key={e.id}
                      className="bg-slate-900/70 border border-white/10 hover:border-blue-500/30 transition-all rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      {/* Foto / Miniatura */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-500 w-5 text-center">
                          {index + 1}
                        </span>

                        <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                          {tieneFoto ? (
                            <>
                              <img
                                src={urlFoto}
                                alt="Foto entrega"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(err) => {
                                  (err.target as HTMLImageElement).src = "https://placehold.co/120x120?text=Error+Carga";
                                }}
                              />
                              <div
                                onClick={() => setPreviewFoto(urlFoto)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-semibold gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                Ampliar
                              </div>
                              <span className="absolute bottom-1 right-1 bg-emerald-500/90 text-[8px] font-bold px-1.5 py-0.5 rounded text-black">
                                FOTO
                              </span>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-600 text-[10px] p-2 text-center">
                              <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                              <span>Sin foto</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Datos del Cliente y Producto */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{cli?.nombreCompleto || "Cliente Sin Datos"}</h4>
                            {cli?.estado && (
                              <Badge className={`text-[9px] ${
                                cli.estado === "APROBADO"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}>
                                {cli.estado}
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            CI: <span className="text-slate-200 font-mono font-medium">{cli?.ci || "-"}</span> · Cel: <span className="text-slate-200 font-mono font-medium">{cli?.celular || "-"}</span>
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            Ciudad: <span className="text-slate-200">{cli?.ciudad || "-"}</span> · Punto Venta: <span className="text-slate-200">{cli?.puntoVenta || "-"}</span>
                          </p>
                        </div>

                        <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Producto Comprado:</span>
                            <span className="font-semibold text-white">{cli?.productoModelo || "TV Skyworth"} {cli?.productoPulgadas ? `(${cli.productoPulgadas}")` : ""}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Serial / TAG:</span>
                            <span className="font-mono text-cyan-400 font-medium">{cli?.serial || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Factura: {cli?.nroFactura || "-"}</span>
                            <span>Compra: {cli?.fechaCompra || "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Premio y Entrega */}
                      <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5 text-xs border-t md:border-t-0 pt-2 md:pt-0 border-white/5 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.premio?.colorHex || "#3b82f6" }} />
                          <span className="font-bold text-white text-xs">{e.premio?.nombre || "Premio"}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Entregado por: <span className="text-slate-200 font-medium">{e.impulsadorNombre || "Operador"}</span>
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          {e.fechaGiro ? new Date(e.fechaGiro).toLocaleString("es-BO") : "-"}
                        </p>
                        {tieneFoto && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewFoto(urlFoto)}
                            className="h-7 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 mt-1"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver Foto Ampliada
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-white/10 pt-3 shrink-0 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Mostrando {entregasFiltradas.length} de {entregasModalData.length} entregas realizadas
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEntregasModal(false)}
              className="border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Zoom Foto Entrega */}
      <Dialog open={!!previewFoto} onOpenChange={() => setPreviewFoto(null)}>
        <DialogContent className="max-w-3xl bg-slate-950/95 border border-white/10 text-white rounded-3xl p-6 backdrop-blur-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Evidencia Fotográfica de Entrega
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Fotografía física capturada al momento de otorgar el obsequio al cliente.
              </DialogDescription>
            </div>
            {previewFoto && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(previewFoto, "_blank")}
                className="border-white/10 hover:bg-white/5 text-xs text-blue-400 rounded-xl"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Abrir Original
              </Button>
            )}
          </DialogHeader>

          <div className="flex items-center justify-center p-2 max-h-[70vh] overflow-hidden rounded-2xl bg-black/60 border border-white/5">
            {previewFoto && (
              <img
                src={previewFoto}
                alt="Evidencia fotográfica ampliada"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

