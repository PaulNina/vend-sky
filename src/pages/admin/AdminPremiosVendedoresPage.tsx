import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete, apiPostForm } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Gift, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package, 
  UploadCloud, 
  Loader2, 
  Eye, 
  FileText, 
  Sparkles,
  Search,
  Truck
} from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminInterface";
import { cn, formatDateBolivia } from "@/lib/utils";

interface Premio {
  id: number;
  nombre: string;
  descripcion?: string | null;
  puntosRequeridos: number;
  stock: number;
  foto?: string | null;
  activo: boolean;
  campana?: { id: number; nombre: string } | null;
  condiciones?: string | null;
  alcanceCiudades?: string | null;
  politicaCanje?: "DESCUENTO_EXACTO" | "REINICIO_SALDO";
}

interface Canje {
  id: number;
  vendedor: {
    id: number;
    nombreCompleto: string;
    email: string;
    ci?: string;
    telefono?: string;
    tienda?: string;
  };
  premio: Premio;
  puntosConsumidos: number;
  fechaSolicitud: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "ENTREGADO";
  fechaResolucion?: string | null;
  usuarioResolucion?: string | null;
  motivoRechazo?: string | null;
  fotoComprobante?: string | null;
  observaciones?: string | null;
}

export default function AdminPremiosVendedoresPage() {
  const [tab, setTab] = useState<"catalogo" | "canjes">("canjes");

  // Premios state
  const [premios, setPremios] = useState<Premio[]>([]);
  const [loadingPremios, setLoadingPremios] = useState(false);
  const [premioModal, setPremioModal] = useState(false);
  const [editingPremio, setEditingPremio] = useState<Premio | null>(null);
  const [premioForm, setPremioForm] = useState({
    nombre: "",
    descripcion: "",
    puntosRequeridos: 100,
    stock: 5,
    foto: "",
    activo: true,
    condiciones: "",
    alcanceCiudades: "",
    politicaCanje: "DESCUENTO_EXACTO" as "DESCUENTO_EXACTO" | "REINICIO_SALDO",
  });
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [savingPremio, setSavingPremio] = useState(false);

  // Canjes state
  const [canjes, setCanjes] = useState<Canje[]>([]);
  const [loadingCanjes, setLoadingCanjes] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Reject modal
  const [rejectModal, setRejectModal] = useState(false);
  const [canjeToReject, setCanjeToReject] = useState<Canje | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  // Deliver modal
  const [deliverModal, setDeliverModal] = useState(false);
  const [canjeToDeliver, setCanjeToDeliver] = useState<Canje | null>(null);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);

  // Photo viewer modal
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPremios();
    loadCanjes();
  }, []);

  const loadPremios = async () => {
    setLoadingPremios(true);
    try {
      const data = await apiGet<Premio[]>("/premios-vendedores/admin");
      setPremios(data || []);
    } catch (e: unknown) {
      toast({ title: "Error al cargar premios", variant: "destructive" });
    } finally {
      setLoadingPremios(false);
    }
  };

  const loadCanjes = async () => {
    setLoadingCanjes(true);
    try {
      const data = await apiGet<Canje[]>("/canjes/admin");
      setCanjes(data || []);
    } catch (e: unknown) {
      toast({ title: "Error al cargar canjes", variant: "destructive" });
    } finally {
      setLoadingCanjes(false);
    }
  };

  // Upload foto premio
  const handleUploadFotoPremio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiPostForm<{ url: string }>("/premios-vendedores/upload-foto", formData);

      setPremioForm(prev => ({ ...prev, foto: res.url }));
      toast({ title: "Foto subida exitosamente" });
    } catch (err: unknown) {
      toast({ title: "Error subiendo foto", variant: "destructive" });
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleOpenNewPremio = () => {
    setEditingPremio(null);
    setPremioForm({
      nombre: "",
      descripcion: "",
      puntosRequeridos: 50,
      stock: 5,
      foto: "",
      activo: true,
      condiciones: "",
      alcanceCiudades: "",
      politicaCanje: "DESCUENTO_EXACTO",
    });
    setPremioModal(true);
  };

  const handleOpenEditPremio = (p: Premio) => {
    setEditingPremio(p);
    setPremioForm({
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      puntosRequeridos: p.puntosRequeridos,
      stock: p.stock,
      foto: p.foto || "",
      activo: p.activo,
      condiciones: p.condiciones || "",
      alcanceCiudades: p.alcanceCiudades || "",
      politicaCanje: p.politicaCanje || "DESCUENTO_EXACTO",
    });
    setPremioModal(true);
  };

  const handleSavePremio = async () => {
    if (!premioForm.nombre.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    setSavingPremio(true);
    try {
      if (editingPremio) {
        await apiPut(`/premios-vendedores/${editingPremio.id}`, premioForm);
        toast({ title: "Premio actualizado exitosamente" });
      } else {
        await apiPost("/premios-vendedores", premioForm);
        toast({ title: "Premio creado exitosamente" });
      }
      setPremioModal(false);
      loadPremios();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error al guardar premio", description: error.message, variant: "destructive" });
    } finally {
      setSavingPremio(false);
    }
  };

  const handleDeletePremio = async (p: Premio) => {
    if (!confirm(`¿Desactivar el premio "${p.nombre}"?`)) return;
    try {
      await apiDelete(`/premios-vendedores/${p.id}`);
      toast({ title: "Premio desactivado" });
      loadPremios();
    } catch (e: unknown) {
      toast({ title: "Error al desactivar", variant: "destructive" });
    }
  };

  // Canje resolution
  const handleApproveCanje = async (canje: Canje) => {
    if (!confirm(`¿Aprobar solicitud de canje para ${canje.vendedor?.nombreCompleto}?`)) return;
    try {
      await apiPut(`/canjes/${canje.id}/status`, { estado: "APROBADO" });
      toast({ title: "Canje aprobado", description: "El canje se encuentra listo para entrega física." });
      loadCanjes();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error al aprobar", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenReject = (canje: Canje) => {
    setCanjeToReject(canje);
    setMotivoRechazo("");
    setRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!canjeToReject) return;
    if (!motivoRechazo.trim()) {
      toast({ title: "Ingresa el motivo del rechazo", variant: "destructive" });
      return;
    }
    setProcessingAction(true);
    try {
      await apiPut(`/canjes/${canjeToReject.id}/status`, {
        estado: "RECHAZADO",
        motivoRechazo: motivoRechazo.trim(),
      });
      toast({ 
        title: "Canje rechazado", 
        description: "Se han revertido los puntos al balance del vendedor y restaurado el stock." 
      });
      setRejectModal(false);
      loadCanjes();
      loadPremios();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error al rechazar", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleOpenDeliver = (canje: Canje) => {
    setCanjeToDeliver(canje);
    setComprobanteFile(null);
    setDeliverModal(true);
  };

  const handleConfirmDeliver = async () => {
    if (!canjeToDeliver) return;
    setUploadingComprobante(true);
    try {
      let fotoUrl = canjeToDeliver.fotoComprobante;
      if (comprobanteFile) {
        const formData = new FormData();
        formData.append("file", comprobanteFile);
        const uploadRes = await apiPostForm<{ url: string }>(`/canjes/${canjeToDeliver.id}/upload-comprobante`, formData);

        fotoUrl = uploadRes.url;
      }

      await apiPut(`/canjes/${canjeToDeliver.id}/status`, {
        estado: "ENTREGADO",
        fotoComprobante: fotoUrl,
      });

      toast({ title: "Canje entregado", description: "Entrega registrada con comprobante." });
      setDeliverModal(false);
      loadCanjes();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error registrando entrega", description: error.message, variant: "destructive" });
    } finally {
      setUploadingComprobante(false);
    }
  };

  // Filtered canjes
  const filteredCanjes = canjes.filter(c => {
    const matchesEstado = estadoFilter === "ALL" || c.estado === estadoFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      c.vendedor?.nombreCompleto?.toLowerCase().includes(q) ||
      c.vendedor?.email?.toLowerCase().includes(q) ||
      c.vendedor?.ci?.toLowerCase().includes(q) ||
      c.premio?.nombre?.toLowerCase().includes(q);
    return matchesEstado && matchesSearch;
  });

  const countPendientes = canjes.filter(c => c.estado === "PENDIENTE").length;
  const countAprobados = canjes.filter(c => c.estado === "APROBADO").length;
  const countEntregados = canjes.filter(c => c.estado === "ENTREGADO").length;
  const totalStock = premios.reduce((acc, p) => acc + (p.stock || 0), 0);

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        eyebrow="Fidelización comercial / Vendedores"
        title="Premios y Canjes de Puntos"
        description="Administra el catálogo de premios por puntos para vendedores y autoriza las entregas físicas."
        icon={Gift}
        meta={
          <div className="flex gap-2">
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400">
              {countPendientes} Pendientes
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
              {totalStock} en Stock
            </span>
          </div>
        }
        actions={
          <Button onClick={handleOpenNewPremio} variant="premium" className="rounded-xl">
            <Plus className="h-4 w-4 mr-1" />Nuevo Premio
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card border-white/5 p-4">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Premios en Catálogo</span>
          <p className="text-2xl font-bold font-display text-white mt-1">{premios.length}</p>
        </Card>
        <Card className="glass-card border-white/5 p-4">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Stock Total Disponible</span>
          <p className="text-2xl font-bold font-display text-amber-400 mt-1">{totalStock}</p>
        </Card>
        <Card className="glass-card border-white/5 p-4">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Canjes Pendientes</span>
          <p className="text-2xl font-bold font-display text-warning mt-1">{countPendientes}</p>
        </Card>
        <Card className="glass-card border-white/5 p-4">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Canjes Entregados</span>
          <p className="text-2xl font-bold font-display text-success mt-1">{countEntregados}</p>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "catalogo" | "canjes")} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="canjes" className="gap-2">
            <Clock className="h-4 w-4" />
            Solicitudes de Canje ({canjes.length})
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="gap-2">
            <Package className="h-4 w-4" />
            Catálogo de Premios ({premios.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SOLICITUDES DE CANJE */}
        <TabsContent value="canjes" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div>
                <CardTitle className="text-base font-semibold">Solicitudes de Canje de Vendedores</CardTitle>
                <CardDescription className="text-xs">
                  Revisa y autoriza las peticiones de redención de puntos acumulados.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por vendedor, CI, premio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-white/5 border-white/10 text-xs"
                  />
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                  <SelectTrigger className="w-36 h-9 bg-white/5 border-white/10 text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                    <SelectItem value="APROBADO">Aprobados</SelectItem>
                    <SelectItem value="ENTREGADO">Entregados</SelectItem>
                    <SelectItem value="RECHAZADO">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingCanjes ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredCanjes.length === 0 ? (
                <AdminEmptyState
                  title="Sin solicitudes de canje"
                  description="No se registran solicitudes que coincidan con los filtros seleccionados."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Premio Solicitado</TableHead>
                      <TableHead className="text-center">Puntos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCanjes.map((c) => (
                      <TableRow key={c.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-xs text-muted-foreground">
                          {c.fechaSolicitud ? formatDateBolivia(c.fechaSolicitud) : "—"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm text-white">{c.vendedor?.nombreCompleto || "Vendedor"}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.vendedor?.email} • CI: {c.vendedor?.ci || "S/CI"} • {c.vendedor?.tienda || "Tienda"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {c.premio?.foto ? (
                              <img
                                src={`/${c.premio.foto}`}
                                alt={c.premio.nombre}
                                className="w-8 h-8 rounded-lg object-cover cursor-pointer border border-white/10"
                                onClick={() => setViewPhotoUrl(`/${c.premio.foto}`)}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <Gift className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-xs text-white">{c.premio?.nombre}</p>
                              {c.observaciones && (
                                <p className="text-[11px] text-muted-foreground italic">"{c.observaciones}"</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-amber-400">
                          {c.puntosConsumidos} pts
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                c.estado === "PENDIENTE" && "border-amber-500/30 text-amber-400 bg-amber-500/10",
                                c.estado === "APROBADO" && "border-blue-500/30 text-blue-400 bg-blue-500/10",
                                c.estado === "ENTREGADO" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                                c.estado === "RECHAZADO" && "border-rose-500/30 text-rose-400 bg-rose-500/10"
                              )}
                            >
                              {c.estado}
                            </Badge>
                            {c.motivoRechazo && (
                              <p className="text-[10px] text-rose-300">Motivo: {c.motivoRechazo}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.estado === "PENDIENTE" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleApproveCanje(c)}
                                  className="h-8 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  title="Aprobar Canje"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenReject(c)}
                                  className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                  title="Rechazar Canje"
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Rechazar
                                </Button>
                              </>
                            )}
                            {c.estado === "APROBADO" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDeliver(c)}
                                className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Truck className="h-3.5 w-3.5 mr-1" /> Marcar Entregado
                              </Button>
                            )}
                            {c.estado === "ENTREGADO" && c.fotoComprobante && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewPhotoUrl(`/${c.fotoComprobante}`)}
                                className="h-8 text-xs text-sky-400 hover:bg-sky-500/10"
                                title="Ver Comprobante de Entrega"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> Acta / Comprobante
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CATALOGO DE PREMIOS */}
        <TabsContent value="catalogo" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader className="p-4 border-b border-white/5 flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-semibold">Artículos y Premios Configurables</CardTitle>
                <CardDescription className="text-xs">
                  Gestiona los premios físicos ofrecidos a los vendedores a cambio de sus puntos de venta acumulados.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPremios ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : premios.length === 0 ? (
                <AdminEmptyState
                  title="Catálogo vacío"
                  description="Añade el primer premio para incentivar las ventas de los asesores."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead>Foto</TableHead>
                      <TableHead>Nombre del Premio</TableHead>
                      <TableHead className="text-center">Puntos Req.</TableHead>
                      <TableHead className="text-center">Stock Actual</TableHead>
                      <TableHead>Política Canje</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {premios.map((p) => (
                      <TableRow key={p.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          {p.foto ? (
                            <img
                              src={`/${p.foto}`}
                              alt={p.nombre}
                              className="w-10 h-10 rounded-lg object-cover border border-white/10 cursor-pointer"
                              onClick={() => setViewPhotoUrl(`/${p.foto}`)}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                              <Gift className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm text-white">{p.nombre}</p>
                            {p.descripcion && <p className="text-xs text-muted-foreground line-clamp-1">{p.descripcion}</p>}
                            {p.condiciones && (
                              <p className="text-[11px] text-amber-400/90 italic line-clamp-1 mt-0.5">
                                Condiciones: {p.condiciones}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-amber-400">
                          {p.puntosRequeridos} pts
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={p.stock > 0 ? "outline" : "destructive"}
                            className={p.stock > 0 ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold" : ""}
                          >
                            {p.stock} unids
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              p.politicaCanje === "REINICIO_SALDO"
                                ? "border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]"
                                : "border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-[10px]"
                            }
                          >
                            {p.politicaCanje === "REINICIO_SALDO" ? "Reinicio Saldo" : "Descuento Exacto"}
                          </Badge>
                          {p.alcanceCiudades && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {p.alcanceCiudades}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.activo ? "outline" : "secondary"}>
                            {p.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditPremio(p)}
                              title="Editar Premio"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePremio(p)}
                              title="Desactivar Premio"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Crear / Editar Premio */}
      <Dialog open={premioModal} onOpenChange={setPremioModal}>
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPremio ? "Editar Premio" : "Nuevo Premio para Vendedores"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre del Premio *</Label>
              <Input
                placeholder="Ej. Mochila Ejecutiva Skyworth"
                value={premioForm.nombre}
                onChange={(e) => setPremioForm({ ...premioForm, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Detalles técnicos, color, características..."
                rows={2}
                value={premioForm.descripcion}
                onChange={(e) => setPremioForm({ ...premioForm, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Política de Canje *</Label>
                <Select
                  value={premioForm.politicaCanje}
                  onValueChange={(val: "DESCUENTO_EXACTO" | "REINICIO_SALDO") =>
                    setPremioForm({ ...premioForm, politicaCanje: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="DESCUENTO_EXACTO">
                      Descuento Exacto (descuenta solo pts req.)
                    </SelectItem>
                    <SelectItem value="REINICIO_SALDO">
                      Reinicio de Saldo (ajusta sobrante a 0)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alcance Ciudades</Label>
                <Input
                  placeholder="Ej. Santa Cruz, La Paz (vacío = nacional)"
                  className="bg-white/5 border-white/10 text-xs"
                  value={premioForm.alcanceCiudades}
                  onChange={(e) => setPremioForm({ ...premioForm, alcanceCiudades: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condiciones y Restricciones de Entrega</Label>
              <Textarea
                placeholder="Ej. Entrega sujeta a presentación de CI vigente en agencia central..."
                rows={2}
                value={premioForm.condiciones}
                onChange={(e) => setPremioForm({ ...premioForm, condiciones: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puntos Requeridos *</Label>
                <Input
                  type="number"
                  min={1}
                  value={premioForm.puntosRequeridos}
                  onChange={(e) => setPremioForm({ ...premioForm, puntosRequeridos: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Disponible *</Label>
                <Input
                  type="number"
                  min={0}
                  value={premioForm.stock}
                  onChange={(e) => setPremioForm({ ...premioForm, stock: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fotografía del Producto</Label>
              <div className="flex items-center gap-3">
                {premioForm.foto ? (
                  <img
                    src={`/${premioForm.foto}`}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-muted-foreground">
                    <Gift className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFotoPremio}
                    disabled={uploadingFoto}
                    className="bg-white/5 border-white/10 text-xs"
                  />
                  {uploadingFoto && <p className="text-xs text-primary mt-1">Subiendo imagen...</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Premio Activo para Canje</Label>
              <Switch
                checked={premioForm.activo}
                onCheckedChange={(v) => setPremioForm({ ...premioForm, activo: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPremioModal(false)}>Cancelar</Button>
            <Button onClick={handleSavePremio} disabled={savingPremio || uploadingFoto} variant="premium">
              {savingPremio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
              {editingPremio ? "Guardar Cambios" : "Crear Premio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rechazar Canje */}
      <Dialog open={rejectModal} onOpenChange={setRejectModal}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <XCircle className="h-5 w-5" />
              Rechazar Solicitud de Canje
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Al rechazar el canje, los <strong className="text-white">{canjeToReject?.puntosConsumidos} puntos</strong> serán reintegrados automáticamente al saldo del asesor ({canjeToReject?.vendedor?.nombreCompleto}) y se restaurará el stock del artículo.
            </p>
            <div className="space-y-2">
              <Label>Motivo del Rechazo *</Label>
              <Textarea
                placeholder="Indica la razón administrativa o de inventario..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectModal(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={processingAction || !motivoRechazo.trim()}
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Entregar Canje con Comprobante */}
      <Dialog open={deliverModal} onOpenChange={setDeliverModal}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Truck className="h-5 w-5" />
              Registrar Entrega de Premio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Confirmar la entrega física del premio <strong className="text-white">{canjeToDeliver?.premio?.nombre}</strong> al vendedor <strong className="text-white">{canjeToDeliver?.vendedor?.nombreCompleto}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Acta de Entrega / Comprobante Firmado (Foto/PDF)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                className="bg-white/5 border-white/10 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Opcional pero recomendado para respaldo de auditoría.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeliverModal(false)}>Cancelar</Button>
            <Button
              variant="premium"
              onClick={handleConfirmDeliver}
              disabled={uploadingComprobante}
            >
              {uploadingComprobante ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor de Fotos */}
      <Dialog open={!!viewPhotoUrl} onOpenChange={() => setViewPhotoUrl(null)}>
        <DialogContent className="max-w-xl p-2 bg-black/90 border-white/10">
          {viewPhotoUrl && (
            <img src={viewPhotoUrl} alt="Vista previa" className="w-full h-auto rounded-lg max-h-[80vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
