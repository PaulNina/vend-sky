import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Package, Trash2, Check, ChevronsUpDown, BarChart3, Printer, X, Target, Copy, Store, CheckCircle2, XCircle, Play, Pause, Archive } from "lucide-react";
import { cn, formatDateBolivia } from "@/lib/utils";
import { ProductSearchSelect } from "@/components/common/ProductSearchSelect";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminInterface";

interface Campaign {
  id: number;
  nombre: string;
  subtitulo?: string | null;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  estadoCampana?: "BORRADOR" | "ACTIVA" | "PAUSADA" | "CERRADA" | "ARCHIVADA";
  registroHabilitado?: boolean;
  validacionIa?: boolean;
  modoPoints?: string;
}

interface Product {
  id: number;
  nombre: string;
  modelo?: string | null;
  modeloCodigo?: string | null;
  tamanoPulgadas?: number | null;
  pulgadas?: number | null;
  tipoProducto?: { id: number; nombre: string } | null;
}

interface CampanaProducto {
  id: number;
  producto: Product;
  puntos: number;
  bonoBs: number;
  bonoBsTienda?: number;
  ticketsDigitales?: number;
  cuponesActivados?: boolean;
  puntosTienda?: number;
  ticketsDigitalesTienda?: number;
  cuponesFisicosTienda?: boolean;
  activo: boolean;
}

interface TiendaItem {
  id: number;
  nombre: string;
  canal?: string;
  departamento?: string;
  ciudad?: {
    id?: number;
    nombre?: string;
    departamento?: string;
  };
}

interface DashboardStats {
  totalVentas: number;
  ventasAprobadas: number;
  ventasPendientes: number;
  ventasRechazadas: number;
  totalBonusBs: number;
  totalPuntos: number;
  totalVendedores: number;
  ventasPorCiudad?: {
    ciudad: string;
    total: number;
    aprobadas: number;
    pendientes: number;
    rechazadas: number;
    bonusBs: number;
  }[];
}

const empty = {
  nombre: "", subtitulo: "", fechaInicio: "", fechaFin: "",
  activo: true, registroHabilitado: true, validacionIa: false,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const [productsDialog, setProductsDialog] = useState(false);
  const [managingCampaign, setManagingCampaign] = useState<Campaign | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<CampanaProducto[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState("");
  const [openProductCombo, setOpenProductCombo] = useState(false);
  const [newPuntos, setNewPuntos] = useState("");
  const [newBonoBs, setNewBonoBs] = useState("");
  const [editProductDialog, setEditProductDialog] = useState(false);
  const [productToEdit, setProductToEdit] = useState<CampanaProducto | null>(null);
  const [editPuntos, setEditPuntos] = useState("");
  const [editBonoBs, setEditBonoBs] = useState("");
  const [newBonoBsTienda, setNewBonoBsTienda] = useState("0");
  const [newTicketsDigitales, setNewTicketsDigitales] = useState("0");
  const [newCuponesActivados, setNewCuponesActivados] = useState(false);
  const [editBonoBsTienda, setEditBonoBsTienda] = useState("0");
  const [editTicketsDigitales, setEditTicketsDigitales] = useState("0");
  const [editCuponesActivados, setEditCuponesActivados] = useState(false);
  const [newPuntosTienda, setNewPuntosTienda] = useState("0");
  const [newTicketsDigitalesTienda, setNewTicketsDigitalesTienda] = useState("0");
  const [newCuponesFisicosTienda, setNewCuponesFisicosTienda] = useState(false);
  const [editPuntosTienda, setEditPuntosTienda] = useState("0");
  const [editTicketsDigitalesTienda, setEditTicketsDigitalesTienda] = useState("0");
  const [editCuponesFisicosTienda, setEditCuponesFisicosTienda] = useState(false);

  // Managerial stats modal states
  const [statsCampaign, setStatsCampaign] = useState<Campaign | null>(null);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Estados para Duplicación de Campaña
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [campaignToDuplicate, setCampaignToDuplicate] = useState<Campaign | null>(null);
  const [duplicateForm, setDuplicateForm] = useState({ nombre: "", fechaInicio: "", fechaFin: "" });
  const [duplicating, setDuplicating] = useState(false);

  // Estados para Tiendas Excluidas / Participantes
  const [storesDialog, setStoresDialog] = useState(false);
  const [campaignForStores, setCampaignForStores] = useState<Campaign | null>(null);
  const [allStores, setAllStores] = useState<TiendaItem[]>([]);
  const [excludedStoreIds, setExcludedStoreIds] = useState<number[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");

  const handleOpenDuplicate = (c: Campaign) => {
    setCampaignToDuplicate(c);
    setDuplicateForm({
      nombre: `${c.nombre} (Copia)`,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
    });
    setDuplicateDialog(true);
  };

  const handleExecuteDuplicate = async () => {
    if (!campaignToDuplicate || !duplicateForm.nombre.trim()) return;
    setDuplicating(true);
    try {
      await apiPost(`/campaigns/${campaignToDuplicate.id}/duplicate`, duplicateForm);
      toast({ title: "Campaña duplicada", description: "Se clonaron los parámetros y productos asociados exitosamente." });
      setDuplicateDialog(false);
      load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error al duplicar", description: error.message, variant: "destructive" });
    } finally {
      setDuplicating(false);
    }
  };

  const handleOpenStores = async (c: Campaign) => {
    setCampaignForStores(c);
    setStoresDialog(true);
    setLoadingStores(true);
    try {
      const [stores, excluded] = await Promise.all([
        apiGet<TiendaItem[]>("/tiendas"),
        apiGet<TiendaItem[]>(`/campaigns/${c.id}/excluded-stores`),
      ]);
      setAllStores(stores || []);
      setExcludedStoreIds((excluded || []).map((t: TiendaItem) => t.id));
    } catch (e: unknown) {
      toast({ title: "Error al cargar tiendas", variant: "destructive" });
    } finally {
      setLoadingStores(false);
    }
  };

  const handleToggleStore = async (storeId: number) => {
    if (!campaignForStores) return;
    const isExcluded = excludedStoreIds.includes(storeId);
    try {
      if (isExcluded) {
        await apiDelete(`/campaigns/${campaignForStores.id}/excluded-stores/${storeId}`);
        setExcludedStoreIds(prev => prev.filter(id => id !== storeId));
        toast({ title: "Tienda habilitada", description: "La tienda ahora participa en la campaña." });
      } else {
        await apiPost(`/campaigns/${campaignForStores.id}/excluded-stores/${storeId}`, {});
        setExcludedStoreIds(prev => [...prev, storeId]);
        toast({ title: "Tienda excluida", description: "La tienda ha sido excluida de la campaña." });
      }
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  const handleViewStats = async (campaign: Campaign) => {
    setStatsCampaign(campaign);
    setLoadingStats(true);
    setIsStatsOpen(true);
    try {
      const data = await apiGet<DashboardStats>(`/admin/dashboard?campanaId=${campaign.id}`);
      setStatsData(data);
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudieron obtener las estadísticas.", variant: "destructive" });
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePrint = (campaign: Campaign, data: DashboardStats) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Error", description: "Por favor, permite las ventanas emergentes (popups) para imprimir.", variant: "destructive" });
      return;
    }

    const cityRows = (data.ventasPorCiudad || []).map(c => `
      <tr>
        <td style="font-weight: 700;">${c.ciudad}</td>
        <td style="text-align: center;">${c.total}</td>
        <td style="text-align: center; color: #16a34a; font-weight: 700;">${c.aprobadas}</td>
        <td style="text-align: center; color: #d97706;">${c.pendientes}</td>
        <td style="text-align: center; color: #dc2626;">${c.rechazadas}</td>
        <td style="text-align: right; font-weight: 700;">Bs ${c.bonusBs}</td>
      </tr>
    `).join("");

    const dateRange = `${formatDateBolivia(campaign.fechaInicio)} — ${formatDateBolivia(campaign.fechaFin)}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte Gerencial - ${campaign.nombre}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              background-color: #ffffff;
              padding: 40px;
              margin: 0;
            }
            .header {
              border-bottom: 3px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              text-transform: uppercase;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .header h2 {
              font-size: 18px;
              color: #475569;
              margin: 8px 0 0 0;
              font-weight: 600;
            }
            .header .subtitle {
              font-size: 14px;
              color: #64748b;
              margin: 3px 0 0 0;
              font-style: italic;
            }
            .header p {
              font-size: 12px;
              color: #64748b;
              margin: 8px 0 0 0;
              font-family: monospace;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 15px;
              background: #f8fafc;
            }
            .card span {
              font-size: 10px;
              text-transform: uppercase;
              color: #64748b;
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            .card p {
              font-size: 24px;
              font-weight: 700;
              margin: 5px 0 0 0;
              color: #0f172a;
            }
            .text-success { color: #16a34a !important; }
            .text-warning { color: #d97706 !important; }
            .text-destructive { color: #dc2626 !important; }
            
            .table-title {
              font-size: 14px;
              text-transform: uppercase;
              color: #475569;
              font-weight: 700;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #475569;
            }
            td {
              color: #334155;
            }
            
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px dashed #cbd5e1;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #94a3b8;
            }
            
            @media print {
              body { padding: 0; }
              @page { size: portrait; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte Gerencial de Campaña</h1>
            <h2>${campaign.nombre}</h2>
            ${campaign.subtitulo ? `<div class="subtitle">${campaign.subtitulo}</div>` : ""}
            <p>Periodo: ${dateRange}</p>
          </div>
          
          <div class="grid">
            <div class="card">
              <span>Total Ventas</span>
              <p>${data.totalVentas}</p>
            </div>
            <div class="card">
              <span class="text-success">Aprobadas</span>
              <p class="text-success">${data.ventasAprobadas}</p>
            </div>
            <div class="card">
              <span class="text-warning">Pendientes</span>
              <p class="text-warning">${data.ventasPendientes}</p>
            </div>
            <div class="card">
              <span class="text-destructive">Rechazadas</span>
              <p class="text-destructive">${data.ventasRechazadas}</p>
            </div>
          </div>
          
          <div class="grid-3">
            <div class="card">
              <span>Bono Acumulado</span>
              <p class="text-success">Bs ${Number(data.totalBonusBs || 0).toLocaleString()}</p>
            </div>
            <div class="card">
              <span>Puntos Totales</span>
              <p>${Number(data.totalPuntos || 0).toLocaleString()}</p>
            </div>
            <div class="card">
              <span>Vendedores Activos</span>
              <p>${data.totalVendedores}</p>
            </div>
          </div>
          
          ${cityRows ? `
            <div class="table-title">Desglose por Ciudad</div>
            <table>
              <thead>
                <tr>
                  <th>Ciudad</th>
                  <th style="text-align: center;">Total</th>
                  <th style="text-align: center; color: #16a34a;">Aprob.</th>
                  <th style="text-align: center; color: #d97706;">Pend.</th>
                  <th style="text-align: center; color: #dc2626;">Rech.</th>
                  <th style="text-align: right;">Bono Bs</th>
                </tr>
              </thead>
              <tbody>
                ${cityRows}
              </tbody>
            </table>
          ` : ""}
          
          <div class="footer">
            <p>Reporte generado automáticamente por el Sistema de Bonos Skyworth</p>
            <p>Fecha de emisión: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const load = async () => {
    setLoading(true);
    const data = await apiGet<Campaign[]>("/campaigns").catch(() => []);
    setCampaigns(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadCampaignProducts = async (campaignId: number) => {
    const data = await apiGet<CampanaProducto[]>(`/campaigns/${campaignId}/products`).catch(() => []);
    setCampaignProducts(data || []);
  };

  const openProducts = async (c: Campaign) => {
    setManagingCampaign(c);
    setProductsDialog(true);
    setCampaignProducts([]);
    setSelectedProductToAdd("");
    setNewPuntos("");
    setNewBonoBs("");
    setNewBonoBsTienda("0");
    setNewTicketsDigitales("0");
    setNewCuponesActivados(false);
    setNewPuntosTienda("0");
    setNewTicketsDigitalesTienda("0");
    setNewCuponesFisicosTienda(false);
    if (allProducts.length === 0) {
      const prods = await apiGet<Product[]>("/products").catch(() => []);
      setAllProducts(prods);
    }
    loadCampaignProducts(c.id);
  };

  const handleAddProduct = async () => {
    if (!managingCampaign || !selectedProductToAdd || !newPuntos || !newBonoBs) {
      toast({ title: "Error", description: "Todos los campos son obligatorios.", variant: "destructive" });
      return;
    }
    try {
      await apiPost(`/campaigns/${managingCampaign.id}/products`, {
        productoId: Number(selectedProductToAdd),
        puntos: Number(newPuntos),
        bonoBs: Number(newBonoBs),
        bonoBsTienda: Number(newBonoBsTienda || 0),
        ticketsDigitales: Number(newTicketsDigitales || 0),
        cuponesActivados: newCuponesActivados,
        puntosTienda: Number(newPuntosTienda || 0),
        ticketsDigitalesTienda: Number(newTicketsDigitalesTienda || 0),
        cuponesFisicosTienda: newCuponesFisicosTienda
      });
      loadCampaignProducts(managingCampaign.id);
      setSelectedProductToAdd("");
      setNewPuntos("");
      setNewBonoBs("");
      setNewBonoBsTienda("0");
      setNewTicketsDigitales("0");
      setNewCuponesActivados(false);
      setNewPuntosTienda("0");
      setNewTicketsDigitalesTienda("0");
      setNewCuponesFisicosTienda(false);
      toast({ title: "Producto añadido a la campaña" });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveProduct = async (productoId: number, cpId: number) => {
    if (!managingCampaign) return;
    try {
      await apiDelete(`/campaigns/${managingCampaign.id}/products/${productoId}`);
      setCampaignProducts(campaignProducts.filter(cp => cp.id !== cpId));
      toast({ title: "Producto removido" });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditProduct = (cp: CampanaProducto) => {
    setProductToEdit(cp);
    setEditPuntos(String(cp.puntos));
    setEditBonoBs(String(cp.bonoBs));
    setEditBonoBsTienda(String(cp.bonoBsTienda ?? 0));
    setEditTicketsDigitales(String(cp.ticketsDigitales ?? 0));
    setEditCuponesActivados(Boolean(cp.cuponesActivados));
    setEditPuntosTienda(String(cp.puntosTienda ?? 0));
    setEditTicketsDigitalesTienda(String(cp.ticketsDigitalesTienda ?? 0));
    setEditCuponesFisicosTienda(Boolean(cp.cuponesFisicosTienda));
    setEditProductDialog(true);
  };

  const handleSaveEditProduct = async () => {
    if (!managingCampaign || !productToEdit || !editPuntos || !editBonoBs) {
      toast({ title: "Error", description: "Todos los campos son obligatorios.", variant: "destructive" });
      return;
    }
    try {
      await apiPost(`/campaigns/${managingCampaign.id}/products`, {
        productoId: productToEdit.producto.id,
        puntos: Number(editPuntos),
        bonoBs: Number(editBonoBs),
        bonoBsTienda: Number(editBonoBsTienda || 0),
        ticketsDigitales: Number(editTicketsDigitales || 0),
        cuponesActivados: editCuponesActivados,
        puntosTienda: Number(editPuntosTienda || 0),
        ticketsDigitalesTienda: Number(editTicketsDigitalesTienda || 0),
        cuponesFisicosTienda: editCuponesFisicosTienda
      });
      loadCampaignProducts(managingCampaign.id);
      setEditProductDialog(false);
      setProductToEdit(null);
      toast({ title: "Producto actualizado" });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openNew = () => { setEditing(null); setForm(empty); setDialog(true); };
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      nombre: c.nombre, subtitulo: c.subtitulo || "",
      fechaInicio: c.fechaInicio, fechaFin: c.fechaFin,
      activo: c.activo, registroHabilitado: c.registroHabilitado ?? true, validacionIa: c.validacionIa ?? false,
    });
    setDialog(true);
  };

  const save = async () => {
    if (!form.nombre || !form.fechaInicio || !form.fechaFin) {
      toast({ title: "Error", description: "Nombre, fecha inicio y fecha fin son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, subtitulo: form.subtitulo || null };
      if (editing) {
        await apiPut(`/campaigns/${editing.id}`, payload);
        toast({ title: "Campaña actualizada" });
      } else {
        await apiPost("/campaigns", payload);
        toast({ title: "Campaña creada" });
      }
      setDialog(false);
      load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDeleteCampaign = async (c: Campaign) => {
    const confirmed = window.confirm(
      `¿Eliminar la campaña "${c.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    try {
      await apiDelete(`/campaigns/${c.id}`);
      toast({ title: "Campaña eliminada" });
      load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({
        title: "No se puede eliminar",
        description: error.message || "La campaña tiene ventas registradas.",
        variant: "destructive"
      });
    }
  };

  const handleLifecycleAction = async (c: Campaign, action: "activate" | "pause" | "close" | "archive" | "reactivate") => {
    let motivo = "";
    if (action === "pause" || action === "close" || action === "archive") {
      const input = window.prompt(`Ingresa el motivo para ${action === "pause" ? "pausar" : action === "close" ? "cerrar" : "archivar"} la campaña "${c.nombre}":`, "");
      if (input === null) return;
      motivo = input.trim();
    } else {
      const confirm = window.confirm(`¿Confirmas ${action === "activate" ? "activar" : "reactivar"} la campaña "${c.nombre}"?`);
      if (!confirm) return;
    }

    try {
      await apiPatch(`/campaigns/${c.id}/${action}`, motivo ? { motivo } : {});
      toast({ title: `Campaña ${action === "activate" ? "activada" : action === "pause" ? "pausada" : action === "close" ? "cerrada" : action === "archive" ? "archivada" : "reactivada"}` });
      load();
    } catch (e: unknown) {
      toast({ title: "Error en cambio de estado", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        eyebrow="Estrategia comercial / Periodos"
        title="Campañas"
        description="Configura periodos, productos participantes, incentivos y disponibilidad de registro."
        icon={Target}
        meta={<span className="rounded-full border border-white/[.07] bg-white/[.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">{campaigns.length} campañas</span>}
        actions={<Button onClick={openNew} variant="premium" className="rounded-xl">
          <Plus className="h-4 w-4 mr-1" />Nueva Campaña
        </Button>}
      />

      <Card className="admin-data-card glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.nombre}</p>
                        {c.subtitulo && <p className="text-xs text-muted-foreground">{c.subtitulo}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateBolivia(c.fechaInicio)} — {formatDateBolivia(c.fechaFin)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.activo ? "outline" : "secondary"} className={c.activo ? "border-success/30 text-success bg-success/10 animate-pulse" : ""}>
                        {c.estadoCampana || (c.activo ? "ACTIVA" : "PAUSADA")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.registroHabilitado ? "outline" : "secondary"} className={c.registroHabilitado ? "border-primary/30 text-primary bg-primary/10" : ""}>
                        {c.registroHabilitado ? "Abierto" : "Cerrado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewStats(c)} title="Ver Estadísticas Gerenciales">
                          <BarChart3 className="h-4 w-4 text-emerald-500 hover:text-emerald-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openProducts(c)} title="Ver Productos">
                          <Package className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenStores(c)} title="Tiendas Participantes y Exclusiones">
                          <Store className="h-4 w-4 text-amber-500 hover:text-amber-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDuplicate(c)} title="Duplicar Campaña">
                          <Copy className="h-4 w-4 text-blue-400 hover:text-blue-300" />
                        </Button>
                        {c.estadoCampana === "BORRADOR" && (
                          <Button variant="ghost" size="icon" onClick={() => handleLifecycleAction(c, "activate")} title="Activar Campaña" className="text-emerald-400 hover:text-emerald-300">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {c.estadoCampana === "ACTIVA" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleLifecycleAction(c, "pause")} title="Pausar Campaña" className="text-orange-400 hover:text-orange-300">
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleLifecycleAction(c, "close")} title="Cerrar Campaña" className="text-blue-400 hover:text-blue-300">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {c.estadoCampana === "PAUSADA" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleLifecycleAction(c, "reactivate")} title="Reactivar Campaña" className="text-emerald-400 hover:text-emerald-300">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleLifecycleAction(c, "close")} title="Cerrar Campaña" className="text-blue-400 hover:text-blue-300">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {c.estadoCampana === "CERRADA" && (
                          <Button variant="ghost" size="icon" onClick={() => handleLifecycleAction(c, "archive")} title="Archivar Campaña" className="text-slate-400 hover:text-slate-300">
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar Campaña">

                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCampaign(c)}
                          title="Eliminar campaña"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {campaigns.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0"><AdminEmptyState title="Sin campañas configuradas" description="Crea la primera campaña para habilitar productos, periodos e incentivos." /></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader className="mb-4">
            <DialogTitle>{editing ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input value={form.subtitulo || ""} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio *</Label>
                <Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin *</Label>
                <Input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Campaña activa</Label>
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Registro habilitado</Label>
              <Switch checked={form.registroHabilitado ?? true} onCheckedChange={(v) => setForm({ ...form, registroHabilitado: v })} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={productsDialog} onOpenChange={setProductsDialog}>
        <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg font-display flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Productos y Beneficios de Campaña: <span className="text-primary font-bold">{managingCampaign?.nombre}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulario Añadir Producto */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Seleccionar Producto</Label>
                <ProductSearchSelect
                  value={selectedProductToAdd}
                  onChange={(val) => setSelectedProductToAdd(val && val !== "none" ? val : "")}
                  productos={allProducts}
                  placeholder="Buscar producto por modelo, nombre o pulgadas..."
                  allowEmpty={false}
                />
              </div>

              {/* Beneficios Divididos: Vendedor vs Tienda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. BENEFICIOS VENDEDOR */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-3">
                  <div className="flex items-center gap-2 border-b border-primary/15 pb-1.5">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      👤 Beneficios Vendedor
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Bono (Bs)</Label>
                      <Input type="number" min="0" placeholder="0" value={newBonoBs} onChange={e => setNewBonoBs(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Puntos</Label>
                      <Input type="number" min="0" placeholder="0" value={newPuntos} onChange={e => setNewPuntos(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Tickets</Label>
                      <Input type="number" min="0" placeholder="0" value={newTicketsDigitales} onChange={e => setNewTicketsDigitales(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch id="cupones-add" checked={newCuponesActivados} onCheckedChange={setNewCuponesActivados} />
                    <Label htmlFor="cupones-add" className="text-xs text-slate-300 cursor-pointer">Cupones físicos vendedor</Label>
                  </div>
                </div>

                {/* 2. BENEFICIOS TIENDA */}
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-3">
                  <div className="flex items-center gap-2 border-b border-amber-500/15 pb-1.5">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" /> Beneficios Tienda / Sucursal
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Bono (Bs)</Label>
                      <Input type="number" min="0" placeholder="0" value={newBonoBsTienda} onChange={e => setNewBonoBsTienda(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Puntos</Label>
                      <Input type="number" min="0" placeholder="0" value={newPuntosTienda} onChange={e => setNewPuntosTienda(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-300">Tickets</Label>
                      <Input type="number" min="0" placeholder="0" value={newTicketsDigitalesTienda} onChange={e => setNewTicketsDigitalesTienda(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch id="cupones-tienda-add" checked={newCuponesFisicosTienda} onCheckedChange={setNewCuponesFisicosTienda} />
                    <Label htmlFor="cupones-tienda-add" className="text-xs text-slate-300 cursor-pointer">Cupones físicos tienda</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Añadir Producto a Campaña
                </Button>
              </div>
            </div>

            {/* Tabla de Productos Configurados */}
            <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
                    <TableHead className="text-xs font-semibold text-slate-300">Producto / Modelo</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-300">Beneficios Vendedor</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-300">Beneficios Tienda</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-300 text-right pr-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignProducts.map(cp => (
                    <TableRow key={cp.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-sm">{cp.producto.nombre}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {cp.producto.modelo ?? cp.producto.modeloCodigo ?? "Sin código"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-emerald-400">Bs {cp.bonoBs}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-200">{cp.puntos} pts</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span>Tickets: <strong className="text-slate-300">{cp.ticketsDigitales ?? 0}</strong></span>
                            <span>·</span>
                            <span>Cupones: {cp.cuponesActivados ? <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-400">Sí</Badge> : "No"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-amber-400">Bs {cp.bonoBsTienda ?? 0}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-200">{cp.puntosTienda ?? 0} pts</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span>Tickets: <strong className="text-slate-300">{cp.ticketsDigitalesTienda ?? 0}</strong></span>
                            <span>·</span>
                            <span>Cupones: {cp.cuponesFisicosTienda ? <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-400">Sí</Badge> : "No"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(cp)} title="Editar beneficios" className="h-8 w-8 hover:bg-white/10 text-primary">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(cp.producto.id, cp.id)} title="Quitar de campaña" className="h-8 w-8 hover:bg-red-500/10 text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {campaignProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                        No hay productos asignados a esta campaña. Agrega productos arriba.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white w-full" onClick={() => setProductsDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Producto */}
      <Dialog open={editProductDialog} onOpenChange={setEditProductDialog}>
        <DialogContent className="sm:max-w-xl glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg font-display flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Editar Beneficios de Producto en Campaña
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-white/5 border border-white/5 p-3">
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Producto Seleccionado</Label>
              <p className="font-semibold text-white text-base mt-0.5">
                {productToEdit?.producto.nombre} 
                <span className="text-muted-foreground ml-2 font-mono text-xs font-normal">
                  ({productToEdit?.producto.modelo ?? productToEdit?.producto.modeloCodigo ?? "Sin código"})
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Beneficios Vendedor */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-3">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block border-b border-primary/15 pb-1">
                  👤 Beneficios Vendedor
                </span>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-300">Bono en Bs</Label>
                    <Input type="number" min="0" value={editBonoBs} onChange={e => setEditBonoBs(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Puntos</Label>
                    <Input type="number" min="0" value={editPuntos} onChange={e => setEditPuntos(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Tickets Sorteo</Label>
                    <Input type="number" min="0" value={editTicketsDigitales} onChange={e => setEditTicketsDigitales(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <Switch id="edit-cupones" checked={editCuponesActivados} onCheckedChange={setEditCuponesActivados} />
                    <Label htmlFor="edit-cupones" className="text-xs text-slate-300 cursor-pointer">Cupones físicos</Label>
                  </div>
                </div>
              </div>

              {/* Beneficios Tienda */}
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 border-b border-amber-500/15 pb-1">
                  <Store className="h-3 w-3" /> Beneficios Tienda
                </span>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-300">Bono Tienda (Bs)</Label>
                    <Input type="number" min="0" value={editBonoBsTienda} onChange={e => setEditBonoBsTienda(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Puntos Tienda</Label>
                    <Input type="number" min="0" value={editPuntosTienda} onChange={e => setEditPuntosTienda(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Tickets Tienda</Label>
                    <Input type="number" min="0" value={editTicketsDigitalesTienda} onChange={e => setEditTicketsDigitalesTienda(e.target.value)} className="h-8 text-xs bg-black/20 border-white/10 text-white" />
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <Switch id="edit-cupones-tienda" checked={editCuponesFisicosTienda} onCheckedChange={setEditCuponesFisicosTienda} />
                    <Label htmlFor="edit-cupones-tienda" className="text-xs text-slate-300 cursor-pointer">Cupones físicos tienda</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white flex-1" onClick={() => setEditProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditProduct} className="bg-primary hover:bg-primary/90 text-white flex-1">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE ESTADÍSTICAS GERENCIALES */}
      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="w-full sm:max-w-3xl glass-card border-white/10 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center justify-between pr-6 w-full">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Estadísticas Gerenciales
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-white/10 hover:bg-white/5 text-xs h-8 ml-auto"
                onClick={() => statsCampaign && statsData && handlePrint(statsCampaign, statsData)}
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir / PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {loadingStats ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : statsData && statsCampaign ? (
            <div className="space-y-6 py-2 print-section">
              {/* Campaign header details */}
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-primary font-display">{statsCampaign.nombre}</h3>
                {statsCampaign.subtitulo && <p className="text-sm text-muted-foreground mt-0.5">{statsCampaign.subtitulo}</p>}
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Periodo: {formatDateBolivia(statsCampaign.fechaInicio)} — {formatDateBolivia(statsCampaign.fechaFin)}
                </p>
              </div>

              {/* KPI metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl glass-card border-white/5 shadow-inner">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total Ventas</span>
                  <p className="text-2xl font-bold font-display mt-0.5">{statsData.totalVentas}</p>
                </div>
                <div className="p-3.5 rounded-xl glass-card border-white/5 shadow-inner">
                  <span className="text-[10px] text-success uppercase tracking-widest font-semibold">Aprobadas</span>
                  <p className="text-2xl font-bold font-display mt-0.5 text-success">{statsData.ventasAprobadas}</p>
                </div>
                <div className="p-3.5 rounded-xl glass-card border-white/5 shadow-inner">
                  <span className="text-[10px] text-warning uppercase tracking-widest font-semibold">Pendientes</span>
                  <p className="text-2xl font-bold font-display mt-0.5 text-warning">{statsData.ventasPendientes}</p>
                </div>
                <div className="p-3.5 rounded-xl glass-card border-white/5 shadow-inner">
                  <span className="text-[10px] text-destructive uppercase tracking-widest font-semibold">Rechazadas</span>
                  <p className="text-2xl font-bold font-display mt-0.5 text-destructive">{statsData.ventasRechazadas}</p>
                </div>
              </div>

              {/* Bonus / Points aggregated */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl glass-card border-white/5 shadow-inner flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Bono Acumulado</span>
                  <p className="text-3xl font-bold text-success font-display mt-1">Bs {Number(statsData.totalBonusBs || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl glass-card border-white/5 shadow-inner flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Puntos Totales</span>
                  <p className="text-3xl font-bold text-primary font-display mt-1">{Number(statsData.totalPuntos || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl glass-card border-white/5 shadow-inner flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vendedores Activos</span>
                  <p className="text-3xl font-bold text-white font-display mt-1">{statsData.totalVendedores}</p>
                </div>
              </div>

              {/* Breakdown by City */}
              {statsData.ventasPorCiudad && statsData.ventasPorCiudad.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Desglose por Ciudad</h4>
                  <div className="overflow-hidden rounded-lg border border-white/5">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                          <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                          <TableHead className="text-xs text-muted-foreground text-center">Total</TableHead>
                          <TableHead className="text-xs text-muted-foreground text-center text-success">Aprob.</TableHead>
                          <TableHead className="text-xs text-muted-foreground text-center text-warning">Pend.</TableHead>
                          <TableHead className="text-xs text-muted-foreground text-center text-destructive">Rech.</TableHead>
                          <TableHead className="text-xs text-muted-foreground text-right">Bono Bs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsData.ventasPorCiudad.map((c) => (
                          <TableRow key={c.ciudad} className="border-white/5 hover:bg-white/5">
                            <TableCell className="font-semibold text-xs text-white">{c.ciudad}</TableCell>
                            <TableCell className="text-center text-xs">{c.total}</TableCell>
                            <TableCell className="text-center text-xs text-success">{c.aprobadas}</TableCell>
                            <TableCell className="text-center text-xs text-warning">{c.pendientes}</TableCell>
                            <TableCell className="text-center text-xs text-destructive">{c.rechazadas}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-white">Bs {c.bonusBs}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No se encontraron estadísticas para esta campaña.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Duplicar Campaña */}
      <Dialog open={duplicateDialog} onOpenChange={setDuplicateDialog}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-blue-400" />
              Duplicar Campaña
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Se clonarán todos los parámetros de la campaña original, su catálogo de productos participantes, puntos y bonos Bs asociados. Los registros operativos (ventas, pagos, tickets) no serán transferidos.
            </p>
            <div className="space-y-2">
              <Label>Nombre de la Nueva Campaña *</Label>
              <Input
                value={duplicateForm.nombre}
                onChange={(e) => setDuplicateForm({ ...duplicateForm, nombre: e.target.value })}
                placeholder="Ej. Campaña Skyworth 2026 - Q2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={duplicateForm.fechaInicio}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, fechaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={duplicateForm.fechaFin}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, fechaFin: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDuplicateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExecuteDuplicate} disabled={duplicating || !duplicateForm.nombre.trim()} className="bg-blue-600 hover:bg-blue-500 text-white">
              {duplicating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Duplicar Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tiendas Participantes / Excluidas */}
      <Dialog open={storesDialog} onOpenChange={setStoresDialog}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-amber-500" />
              Gestión de Tiendas Participantes / Exclusiones
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Campaña: <strong className="text-white">{campaignForStores?.nombre}</strong>. Si una tienda está marcada como excluida, los vendedores no podrán registrar ventas bajo esta campaña en dicha sucursal.
            </p>
          </DialogHeader>

          <div className="py-2 space-y-3 flex-1 overflow-hidden flex flex-col">
            <Input
              placeholder="Buscar tienda por nombre, ciudad o departamento..."
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              className="bg-white/5 border-white/10"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
              {loadingStores ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : allStores.filter(s => {
                const q = storeSearch.toLowerCase();
                return (
                  s.nombre?.toLowerCase().includes(q) ||
                  s.ciudad?.nombre?.toLowerCase().includes(q) ||
                  s.departamento?.toLowerCase().includes(q)
                );
              }).map(store => {
                const isExcluded = excludedStoreIds.includes(store.id);
                return (
                  <div
                    key={store.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all duration-150",
                      isExcluded
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                        : "bg-white/5 border-white/5 hover:border-white/10 text-white"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-sm">{store.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {store.ciudad?.nombre || "Sin ciudad"} • {store.departamento || "Bolivia"} • {store.canal || "Canal general"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={isExcluded ? "destructive" : "outline"}
                        className={isExcluded ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"}
                      >
                        {isExcluded ? "Excluida" : "Participante"}
                      </Badge>
                      <Button
                        size="sm"
                        variant={isExcluded ? "outline" : "destructive"}
                        onClick={() => handleToggleStore(store.id)}
                        className="h-8 text-xs font-semibold"
                      >
                        {isExcluded ? "Habilitar" : "Excluir"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setStoresDialog(false)} variant="secondary">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
