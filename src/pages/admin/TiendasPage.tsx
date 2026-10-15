import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost, apiPostForm, apiPut, apiPatch, apiDelete, uploadUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, PlusCircle, Pencil, BarChart2, Store, Search, Globe, 
  Users, UserPlus, Trash2, Tag, Building2, Phone, CreditCard, 
  QrCode, Eye, Upload, UserCheck, ShieldCheck, Wallet, Image as ImageIcon, X, Check 
} from "lucide-react";
import { useCities } from "@/hooks/useCities";

interface Tienda {
  id: number;
  codigo?: string;
  nombre: string;
  canal?: string;
  nombrePropietario?: string;
  encargadoNombre?: string;
  encargadoTelefono?: string;
  encargadoEmail?: string;
  encargadoCi?: string;
  qrPagoUrl?: string;
  banco?: string;
  nroCuenta?: string;
  titularCobro?: string;
  telefonoTitular?: string;
  direccion?: string;
  telefono?: string;
  ciudad: {
    id: number;
    nombre: string;
    departamento?: string;
  };
  nit?: string;
  activo: boolean;
}

interface AssignedVendor {
  id: number;
  nombreCompleto: string;
  ci?: string;
  telefono?: string;
  email: string;
  activo: boolean;
  fechaAsignacion?: string;
}

interface TiendaStats {
  tiendaId: number;
  tiendaNombre: string;
  totalVendedores: number;
  totalVentasAprobadas: number;
  totalBonoBs: number;
}

const EMPTY_FORM = {
  codigo: "",
  nombre: "",
  canal: "Retail",
  nombrePropietario: "",
  encargadoNombre: "",
  encargadoTelefono: "",
  encargadoEmail: "",
  encargadoCi: "",
  qrPagoUrl: "",
  banco: "",
  nroCuenta: "",
  titularCobro: "",
  telefonoTitular: "",
  direccion: "",
  telefono: "",
  ciudadId: "",
  ciudadNombre: "",
  departamento: "",
  nit: "",
};

export default function TiendasPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [canalFilter, setCanalFilter] = useState("all");
  const { cities, departments } = useCities();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tienda | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [statsDialog, setStatsDialog] = useState(false);
  const [stats, setStats] = useState<TiendaStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Vendor Assignment State
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [selectedTiendaForVendors, setSelectedTiendaForVendors] = useState<Tienda | null>(null);
  const [assignedVendors, setAssignedVendors] = useState<AssignedVendor[]>([]);
  const [loadingAssignedVendors, setLoadingAssignedVendors] = useState(false);
  const [allVendors, setAllVendors] = useState<AssignedVendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [assigningVendor, setAssigningVendor] = useState(false);

  // Pending Store Requests Count
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Store Manager (Encargado / Dueño) State
  const [encargadoModalOpen, setEncargadoModalOpen] = useState(false);
  const [selectedTiendaForEncargado, setSelectedTiendaForEncargado] = useState<Tienda | null>(null);
  const [encargadoData, setEncargadoData] = useState<{
    tiendaId: number;
    tiendaNombre: string;
    nombrePropietario?: string;
    encargadoNombre?: string;
    encargadoEmail?: string;
    encargadoTelefono?: string;
    tieneUsuario: boolean;
    usuarioId?: number;
    usuarioEmail?: string;
    usuarioNombre?: string;
    usuarioRol?: string;
    usuarioActivo?: boolean;
  } | null>(null);
  const [loadingEncargado, setLoadingEncargado] = useState(false);
  const [encargadoTab, setEncargadoTab] = useState<"nuevo" | "existente">("nuevo");
  const [nuevoEncargadoNombre, setNuevoEncargadoNombre] = useState("");
  const [nuevoEncargadoEmail, setNuevoEncargadoEmail] = useState("");
  const [nuevoEncargadoTelefono, setNuevoEncargadoTelefono] = useState("");
  const [nuevoEncargadoPassword, setNuevoEncargadoPassword] = useState("");
  const [selectedExistingUserId, setSelectedExistingUserId] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<Array<{
    id: number;
    email: string;
    nombreCompleto?: string;
    rol: string;
  }>>([]);
  const [savingEncargado, setSavingEncargado] = useState(false);

  const load = async () => {
    setLoading(true);
    const [data, statsRes] = await Promise.all([
      apiGet<Tienda[]>(`/tiendas`).catch(() => [] as Tienda[]),
      apiGet<{ pendientes: number }>(`/tiendas/solicitudes/stats`).catch(() => null)
    ]);
    setTiendas(data);
    if (statsRes) setPendingRequestsCount(statsRes.pendientes || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredTiendas = useMemo(() => {
    return tiendas.filter((t) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = t.nombre.toLowerCase().includes(q) ||
                          (t.codigo?.toLowerCase() || "").includes(q) ||
                          (t.nombrePropietario?.toLowerCase() || "").includes(q) ||
                          (t.titularCobro?.toLowerCase() || "").includes(q);
      const matchesCity = cityFilter === "all" || t.ciudad?.nombre === cityFilter;
      const matchesDept = deptFilter === "all" || t.ciudad?.departamento === deptFilter;
      const matchesCanal = canalFilter === "all" || t.canal === canalFilter;
      return matchesSearch && matchesCity && matchesDept && matchesCanal;
    });
  }, [tiendas, searchTerm, cityFilter, deptFilter, canalFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  // QR Preview Modal State
  const [qrModal, setQrModal] = useState<{ open: boolean; tienda: Tienda | null }>({ open: false, tienda: null });
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const openEdit = (t: Tienda) => {
    setEditing(t);
    setForm({
      codigo: t.codigo || "",
      nombre: t.nombre,
      canal: t.canal || "Retail",
      nombrePropietario: t.nombrePropietario || "",
      encargadoNombre: t.encargadoNombre || "",
      encargadoTelefono: t.encargadoTelefono || "",
      encargadoEmail: t.encargadoEmail || "",
      encargadoCi: t.encargadoCi || "",
      qrPagoUrl: t.qrPagoUrl || "",
      banco: t.banco || "",
      nroCuenta: t.nroCuenta || "",
      titularCobro: t.titularCobro || "",
      telefonoTitular: t.telefonoTitular || "",
      direccion: t.direccion || "",
      telefono: t.telefono || "",
      ciudadId: t.ciudad?.id?.toString() || "",
      ciudadNombre: t.ciudad?.nombre || "",
      departamento: t.ciudad?.departamento || "",
      nit: t.nit || "",
    });
    setDialogOpen(true);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editing) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadingQr(true);
      const updated = await apiPostForm<Tienda>(`/tiendas/${editing.id}/qr-pago`, formData);
      toast({ title: "QR de pago guardado exitosamente" });
      setForm(prev => ({ ...prev, qrPagoUrl: updated.qrPagoUrl || "" }));
      setEditing(prev => prev ? { ...prev, qrPagoUrl: updated.qrPagoUrl } : null);
      load();
    } catch (err: unknown) {
      toast({ title: "Error al subir QR", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!form.nombre || !form.ciudadId) {
      toast({ title: "Error", description: "Nombre y ciudad son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, ciudadId: Number(form.ciudadId) };
      if (editing) {
        await apiPut(`/tiendas/${editing.id}`, payload);
        toast({ title: "Tienda actualizada" });
      } else {
        await apiPost("/tiendas", payload);
        toast({ title: "Tienda creada" });
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setSaving(false);
  };

  const openVendorsModal = async (t: Tienda) => {
    setSelectedTiendaForVendors(t);
    setVendorsDialogOpen(true);
    setLoadingAssignedVendors(true);
    try {
      const [assigned, vendorsList] = await Promise.all([
        apiGet<AssignedVendor[]>(`/tiendas/${t.id}/vendors`).catch(() => []),
        apiGet<AssignedVendor[]>(`/vendors`).catch(() => [])
      ]);
      setAssignedVendors(assigned);
      setAllVendors(vendorsList);
    } catch (e) {
      toast({ title: "Error al cargar vendedores", variant: "destructive" });
    } finally {
      setLoadingAssignedVendors(false);
    }
  };

  const handleAssignVendor = async (vendedorId: number) => {
    if (!selectedTiendaForVendors) return;
    setAssigningVendor(true);
    try {
      await apiPost(`/tiendas/${selectedTiendaForVendors.id}/assign-vendor/${vendedorId}`, {});
      toast({ title: "Vendedor asignado a la tienda" });
      const updated = await apiGet<AssignedVendor[]>(`/tiendas/${selectedTiendaForVendors.id}/vendors`);
      setAssignedVendors(updated);
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAssigningVendor(false);
    }
  };

  const handleRemoveVendor = async (vendedorId: number) => {
    if (!selectedTiendaForVendors) return;
    try {
      await apiPatch(`/tiendas/${selectedTiendaForVendors.id}/remove-vendor/${vendedorId}`, {});
      toast({ title: "Asignación removida" });
      setAssignedVendors(prev => prev.filter(v => v.id !== vendedorId));
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const toggle = async (t: Tienda) => {
    try {
      await apiPatch(`/tiendas/${t.id}/toggle`);
      toast({ title: t.activo ? "Tienda desactivada" : "Tienda activada" });
      load();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const viewStats = async (t: Tienda) => {
    setStats(null);
    setStatsDialog(true);
    setLoadingStats(true);
    try {
      const data = await apiGet<TiendaStats>(`/tiendas/${t.id}/stats`);
      setStats(data);
    } catch {
      toast({ title: "Error al cargar estadísticas", variant: "destructive" });
      setStatsDialog(false);
    }
    setLoadingStats(false);
  };

  const openEncargadoModal = async (t: Tienda) => {
    setSelectedTiendaForEncargado(t);
    setEncargadoModalOpen(true);
    setLoadingEncargado(true);
    setNuevoEncargadoNombre(t.encargadoNombre || t.nombrePropietario || "");
    setNuevoEncargadoEmail(t.encargadoEmail || "");
    setNuevoEncargadoTelefono(t.encargadoTelefono || "");
    setNuevoEncargadoPassword("");
    setSelectedExistingUserId("");
    try {
      const [data, usersList] = await Promise.all([
        apiGet<typeof encargadoData>(`/tiendas/${t.id}/encargado`),
        apiGet<typeof availableUsers>("/users/roles").catch(() => [])
      ]);
      setEncargadoData(data);
      setAvailableUsers(usersList || []);
    } catch {
      toast({ title: "Error al cargar datos del encargado", variant: "destructive" });
    } finally {
      setLoadingEncargado(false);
    }
  };

  const handleVincularEncargado = async () => {
    if (!selectedTiendaForEncargado) return;
    setSavingEncargado(true);
    try {
      const payload = encargadoTab === "nuevo"
        ? {
            nombre: nuevoEncargadoNombre.trim(),
            email: nuevoEncargadoEmail.trim(),
            telefono: nuevoEncargadoTelefono.trim(),
            password: nuevoEncargadoPassword.trim() || undefined
          }
        : { usuarioId: selectedExistingUserId };

      await apiPost(`/tiendas/${selectedTiendaForEncargado.id}/vincular-encargado`, payload);
      toast({ title: "Encargado vinculado correctamente" });
      openEncargadoModal(selectedTiendaForEncargado);
      load();
    } catch (err: unknown) {
      toast({ title: "Error al vincular", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingEncargado(false);
    }
  };

  const handleDesvincularEncargado = async () => {
    if (!selectedTiendaForEncargado || !encargadoData?.usuarioId) return;
    setSavingEncargado(true);
    try {
      await apiDelete(`/tiendas/${selectedTiendaForEncargado.id}/desvincular-encargado/${encargadoData.usuarioId}`);
      toast({ title: "Encargado desvinculado de la tienda" });
      openEncargadoModal(selectedTiendaForEncargado);
      load();
    } catch (err: unknown) {
      toast({ title: "Error al desvincular", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingEncargado(false);
    }
  };

  const setField = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Tiendas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {filteredTiendas.length} {filteredTiendas.length === 1 ? "tienda encontrada" : "tiendas encontradas"}
            {tiendas.length > 0 && ` de ${tiendas.length} registradas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 text-xs">
            <Link to="/admin/solicitudes-tiendas">
              <Store className="h-3.5 w-3.5 mr-1.5" /> Solicitudes de Tiendas
              {pendingRequestsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {pendingRequestsCount}
                </span>
              )}
            </Link>
          </Button>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/95 text-white w-fit text-xs">
            <PlusCircle className="h-4 w-4 mr-2" /> Nueva Tienda
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-[250px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Buscar por nombre o código</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Nombre, código, titular..."
              className="pl-9 h-10 bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="w-[180px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Departamento</Label>
          <Select value={deptFilter} onValueChange={(val) => {
            setDeptFilter(val);
            setCityFilter("all");
          }}>
            <SelectTrigger className="h-10 bg-black/20 border-white/10 text-white">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <SelectValue placeholder="Dpto." />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="all" className="focus:bg-white/5 focus:text-white">Todos los dptos.</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d} className="focus:bg-white/5 focus:text-white">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Ciudad</Label>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-10 bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="all" className="focus:bg-white/5 focus:text-white">{deptFilter === "all" ? "Todas las ciudades" : "Todas las ciudades del dpto."}</SelectItem>
              {cities
                .filter(c => deptFilter === "all" || c.departamento === deptFilter)
                .map((c) => (
                  <SelectItem key={c.nombre} value={c.nombre} className="focus:bg-white/5 focus:text-white">{c.nombre}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[160px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Canal</Label>
          <Select value={canalFilter} onValueChange={setCanalFilter}>
            <SelectTrigger className="h-10 bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="all" className="focus:bg-white/5 focus:text-white">Todos los canales</SelectItem>
              <SelectItem value="Retail" className="focus:bg-white/5 focus:text-white">Retail</SelectItem>
              <SelectItem value="Mayorista" className="focus:bg-white/5 focus:text-white">Mayorista</SelectItem>
              <SelectItem value="Distribuidor" className="focus:bg-white/5 focus:text-white">Distribuidor</SelectItem>
              <SelectItem value="Mercado" className="focus:bg-white/5 focus:text-white">Mercado</SelectItem>
              <SelectItem value="Especializado" className="focus:bg-white/5 focus:text-white">Especializado</SelectItem>
              <SelectItem value="Otro" className="focus:bg-white/5 focus:text-white">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 border-white/10 hover:bg-white/5 text-white"
          onClick={() => {
            setSearchTerm("");
            setCityFilter("all");
            setDeptFilter("all");
            setCanalFilter("all");
          }}
          title="Limpiar filtros"
        >
          <PlusCircle className="h-4 w-4 rotate-45" />
        </Button>
      </div>

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Código</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tienda & Canal</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ubicación</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Encargado</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Titular Cobro & Cuenta</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-center">QR Pago</TableHead>
                  <TableHead className="text-xs text-muted-foreground">NIT</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                  <TableHead className="w-32 text-xs text-right text-muted-foreground pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTiendas.map((t) => (
                  <TableRow key={t.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px] border-white/15 bg-white/5 text-slate-300">
                        {t.codigo || `TND-${t.id}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm text-white">{t.nombre}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px] px-1.5 py-0">
                            {t.canal || "Retail"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-200">{t.ciudad?.nombre}</span>
                        <span className="text-[10px] text-muted-foreground">{t.ciudad?.departamento || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-slate-200 flex items-center gap-1">
                          {t.encargadoNombre || "Sin encargado"}
                        </span>
                        {t.encargadoTelefono && (
                          <span className="text-[10px] text-primary font-mono">{t.encargadoTelefono}</span>
                        )}
                        {t.encargadoCi && (
                          <span className="text-[10px] text-muted-foreground">CI: {t.encargadoCi}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-200">{t.titularCobro || t.nombrePropietario || "—"}</span>
                        {t.banco && (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            {t.banco} {t.nroCuenta ? `· ${t.nroCuenta}` : ""}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {t.qrPagoUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQrModal({ open: true, tienda: t })}
                          className="h-7 px-2 text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1"
                          title="Ver QR de pago"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Ver QR</span>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px]">
                          Sin QR
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 font-mono">{t.nit || "—"}</TableCell>
                    <TableCell>
                      {t.activo ? (
                        <Badge className="cursor-pointer bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]" onClick={() => toggle(t)}>Activa</Badge>
                      ) : (
                        <Badge variant="destructive" className="cursor-pointer bg-red-500/10 text-red-400 border border-red-500/20 text-[11px]" onClick={() => toggle(t)}>Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEncargadoModal(t)} 
                          title="Gestionar Dueño / Encargado Vinculado"
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openVendorsModal(t)} 
                          title="Gestionar vendedores asignados"
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEdit(t)} 
                          title="Editar tienda"
                          className="text-slate-400 hover:text-white hover:bg-white/5"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => viewStats(t)} 
                          title="Ver estadísticas"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <BarChart2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTiendas.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12 border-white/5">
                      No hay tiendas registradas en esta selección
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {editing ? `Editar Tienda: ${editing.nombre}` : "Nueva Tienda"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* SECCIÓN 1: DATOS GENERALES */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-white/10 pb-1">
                <Building2 className="h-3.5 w-3.5" /> 1. Información General de la Tienda
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Código de Tienda</Label>
                  <Input 
                    value={form.codigo} 
                    onChange={(e) => setField("codigo", e.target.value)} 
                    placeholder="Ej: TND-LPZ-01" 
                    className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 font-mono text-xs uppercase" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Canal Comercial *</Label>
                  <Select value={form.canal} onValueChange={(val) => setField("canal", val)}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white text-xs">
                      <SelectValue placeholder="Canal..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Mayorista">Mayorista</SelectItem>
                      <SelectItem value="Distribuidor">Distribuidor</SelectItem>
                      <SelectItem value="Mercado">Mercado</SelectItem>
                      <SelectItem value="Especializado">Especializado</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-slate-400 text-xs">Nombre de la tienda *</Label>
                  <Input value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} placeholder="Electro Sur Central" className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0" />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Ciudad *</Label>
                  <Select value={form.ciudadNombre} onValueChange={(val) => {
                    const city = cities.find((c) => c.nombre === val);
                    setForm((prev) => ({ 
                      ...prev, 
                      ciudadId: city?.id?.toString() || "",
                      ciudadNombre: val, 
                      departamento: city?.departamento || "" 
                    }));
                  }}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue placeholder="Selecciona ciudad..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-56 overflow-y-auto">
                      {departments.map((dept) => (
                        <div key={dept}>
                          <p className="px-2 py-1.5 text-xs text-primary font-bold border-b border-white/5 bg-white/5">{dept}</p>
                          {cities.filter((c) => c.departamento === dept).map((c) => (
                            <SelectItem key={c.nombre} value={c.nombre} className="focus:bg-white/5 focus:text-white pl-4">{c.nombre}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Departamento</Label>
                  <Input value={form.departamento} readOnly className="bg-white/5 border-white/10 text-slate-400 focus:ring-0" />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-slate-400 text-xs">Dirección</Label>
                  <Input value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} placeholder="Av. Ejemplo 123" className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0" />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Propietario / Dueño</Label>
                  <Input value={form.nombrePropietario} onChange={(e) => setField("nombrePropietario", e.target.value)} placeholder="Juan Pérez" className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Teléfono Fijo / Sucursal</Label>
                  <Input value={form.telefono} onChange={(e) => setField("telefono", e.target.value)} placeholder="3-3345678" className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">NIT</Label>
                  <Input value={form.nit} onChange={(e) => setField("nit", e.target.value)} placeholder="123456789" className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 font-mono" />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ENCARGADO DE LA SUCURSAL */}
            <div className="space-y-3 p-3.5 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-white/10 pb-1">
                <UserCheck className="h-3.5 w-3.5" /> 2. Encargado de la Sucursal
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Nombre Completo del Encargado</Label>
                  <Input 
                    value={form.encargadoNombre} 
                    onChange={(e) => setField("encargadoNombre", e.target.value)} 
                    placeholder="Ej: Carlos Rojas" 
                    className="bg-black/30 border-white/10 text-white text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">C.I. Encargado</Label>
                  <Input 
                    value={form.encargadoCi} 
                    onChange={(e) => setField("encargadoCi", e.target.value)} 
                    placeholder="Ej: 5432109 SC" 
                    className="bg-black/30 border-white/10 text-white text-xs font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Celular / WhatsApp Encargado</Label>
                  <Input 
                    value={form.encargadoTelefono} 
                    onChange={(e) => setField("encargadoTelefono", e.target.value)} 
                    placeholder="Ej: 71234567" 
                    className="bg-black/30 border-white/10 text-white text-xs font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Correo Electrónico Encargado</Label>
                  <Input 
                    value={form.encargadoEmail} 
                    onChange={(e) => setField("encargadoEmail", e.target.value)} 
                    placeholder="encargado@tienda.com" 
                    className="bg-black/30 border-white/10 text-white text-xs" 
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: DATOS PARA PAGO Y QR DE COBRO */}
            <div className="space-y-3 p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-emerald-500/20 pb-1">
                <Wallet className="h-3.5 w-3.5" /> 3. Datos de Cobro y QR de Pago
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Titular de Cobro (Persona o Razón Social)</Label>
                  <Input 
                    value={form.titularCobro} 
                    onChange={(e) => setField("titularCobro", e.target.value)} 
                    placeholder="Titular para facturación/recibo..." 
                    className="bg-black/30 border-white/10 text-white text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Teléfono del Titular de Cobro</Label>
                  <Input 
                    value={form.telefonoTitular} 
                    onChange={(e) => setField("telefonoTitular", e.target.value)} 
                    placeholder="+591 7XXXXXXX" 
                    className="bg-black/30 border-white/10 text-white text-xs font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Banco</Label>
                  <Input 
                    value={form.banco} 
                    onChange={(e) => setField("banco", e.target.value)} 
                    placeholder="Ej: Banco Unión, BCP, BNB" 
                    className="bg-black/30 border-white/10 text-white text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Nro. de Cuenta Bancaria</Label>
                  <Input 
                    value={form.nroCuenta} 
                    onChange={(e) => setField("nroCuenta", e.target.value)} 
                    placeholder="100000XXXXXXX" 
                    className="bg-black/30 border-white/10 text-white text-xs font-mono" 
                  />
                </div>

                {/* Subida y Previsualización del QR */}
                <div className="col-span-2 pt-2 border-t border-emerald-500/20">
                  <Label className="text-slate-300 text-xs block mb-1.5 font-semibold">Código QR de Pago</Label>
                  {editing ? (
                    <div className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/10">
                      {form.qrPagoUrl ? (
                        <div className="relative group w-20 h-20 bg-white p-1 rounded-md overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => setQrModal({ open: true, tienda: editing })}>
                          <img src={uploadUrl(form.qrPagoUrl)} alt="QR Tienda" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="h-5 w-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-white/5 border border-dashed border-white/20 rounded-md flex flex-col items-center justify-center text-slate-500 text-[10px] gap-1 flex-shrink-0">
                          <QrCode className="h-6 w-6 text-slate-400" />
                          <span>Sin QR</span>
                        </div>
                      )}

                      <div className="space-y-1 flex-1">
                        <p className="text-xs text-slate-300 font-medium">
                          {form.qrPagoUrl ? "QR Registrado para transferencias" : "Sube el código QR oficial de la tienda para realizar pagos de bonos."}
                        </p>
                        <input 
                          type="file" 
                          ref={qrInputRef} 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleQrUpload} 
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          disabled={uploadingQr}
                          onClick={() => qrInputRef.current?.click()}
                          className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5"
                        >
                          {uploadingQr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {form.qrPagoUrl ? "Reemplazar Imagen QR" : "Subir Imagen QR"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-black/20 p-2.5 rounded-lg border border-white/5">
                      Podrás subir la imagen del código QR de pago una vez guardada la tienda haciendo clic en Editar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Guardar Cambios" : "Crear Tienda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Assignment Dialog */}
      <Dialog open={vendorsDialogOpen} onOpenChange={(o) => !o && setVendorsDialogOpen(false)}>
        <DialogContent className="max-w-2xl glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Vendedores Asignados: {selectedTiendaForVendors?.nombre}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Gestiona qué vendedores tienen asignada esta tienda para registrar ventas.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Assign Dropdown */}
            <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
              <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-primary" /> Asignar Vendedor a esta Tienda
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Filtrar vendedores disponibles por nombre..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="h-9 bg-black/20 border-white/10 text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pt-1">
                {allVendors
                  .filter(v => 
                    !assignedVendors.some(a => a.id === v.id) &&
                    (v.nombreCompleto.toLowerCase().includes(vendorSearch.toLowerCase()) || 
                     (v.ci && v.ci.includes(vendorSearch)) ||
                     v.email.toLowerCase().includes(vendorSearch.toLowerCase()))
                  )
                  .slice(0, 10)
                  .map(v => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded bg-black/20 hover:bg-white/5 border border-white/5 text-xs">
                      <div>
                        <span className="font-semibold text-white">{v.nombreCompleto}</span>
                        <span className="text-muted-foreground ml-2">CI: {v.ci || "—"}</span>
                        <span className="text-slate-500 ml-2">({v.email})</span>
                      </div>
                      <Button
                        size="sm"
                        disabled={assigningVendor}
                        onClick={() => handleAssignVendor(v.id)}
                        className="h-7 text-xs bg-primary hover:bg-primary/90 text-white"
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Asignar
                      </Button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Currently Assigned List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Vendedores con Acceso ({assignedVendors.length})
                </Label>
              </div>

              {loadingAssignedVendors ? (
                <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : assignedVendors.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground bg-black/20 rounded-lg border border-white/5">
                  No hay vendedores asignados a esta tienda actualmente.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {assignedVendors.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-black/25 border border-white/5 text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{v.nombreCompleto}</span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {v.ci && <span>CI: {v.ci}</span>}
                          {v.telefono && <span>Tel: {v.telefono}</span>}
                          <span>{v.email}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVendor(v.id)}
                        className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Desvincular de esta tienda"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Desvincular
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white w-full" onClick={() => setVendorsDialogOpen(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialog} onOpenChange={(o) => !o && setStatsDialog(false)}>
        <DialogContent className="max-w-sm glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Estadísticas de Tienda</DialogTitle>
          </DialogHeader>
          {loadingStats ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : stats ? (
            <div className="space-y-4 py-2">
              <p className="text-base font-bold text-white text-center bg-white/5 py-1.5 rounded border border-white/5">{stats.tiendaNombre}</p>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-lg bg-black/20 border border-white/5 p-3">
                  <p className="text-xl font-bold text-primary font-display">{stats.totalVendedores}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Vendedores</p>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 p-3">
                  <p className="text-xl font-bold text-emerald-450 font-display">{stats.totalVentasAprobadas}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Ventas OK</p>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 p-3">
                  <p className="text-xl font-bold text-amber-500 font-display">Bs {stats.totalBonoBs}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Bonos Bs</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="mt-4">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white w-full" onClick={() => setStatsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Preview Dialog */}
      <Dialog open={qrModal.open} onOpenChange={(o) => !o && setQrModal({ open: false, tienda: null })}>
        <DialogContent className="max-w-md glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-400" />
              QR de Pago — {qrModal.tienda?.nombre}
            </DialogTitle>
          </DialogHeader>
          {qrModal.tienda && (
            <div className="space-y-4 py-2">
              <div className="flex justify-center bg-black/40 p-3 rounded-xl border border-white/10">
                {qrModal.tienda.qrPagoUrl ? (
                  <img
                    src={uploadUrl(qrModal.tienda.qrPagoUrl)}
                    alt={`QR de Pago ${qrModal.tienda.nombre}`}
                    className="max-h-72 w-auto object-contain rounded-lg shadow-md bg-white p-2"
                  />
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No tiene imagen de QR subida.
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-white/5 border border-white/5 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titular Cobro:</span>
                  <span className="font-semibold text-white">{qrModal.tienda.titularCobro || qrModal.tienda.nombrePropietario || "—"}</span>
                </div>
                {qrModal.tienda.banco && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Banco:</span>
                    <span className="text-emerald-400 font-medium">{qrModal.tienda.banco}</span>
                  </div>
                )}
                {qrModal.tienda.nroCuenta && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">N° Cuenta:</span>
                    <span className="text-slate-200 font-mono">{qrModal.tienda.nroCuenta}</span>
                  </div>
                )}
                {qrModal.tienda.encargadoNombre && (
                  <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1.5">
                    <span className="text-muted-foreground">Encargado:</span>
                    <span className="text-white">{qrModal.tienda.encargadoNombre} ({qrModal.tienda.encargadoTelefono || "Sin telf"})</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-2 flex gap-2">
            {qrModal.tienda?.qrPagoUrl && (
              <a
                href={uploadUrl(qrModal.tienda.qrPagoUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white h-9 px-4"
              >
                Abrir Original
              </a>
            )}
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white flex-1"
              onClick={() => setQrModal({ open: false, tienda: null })}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encargado / Dueño Vinculado Dialog */}
      <Dialog open={encargadoModalOpen} onOpenChange={(o) => !o && setEncargadoModalOpen(false)}>
        <DialogContent className="max-w-xl glass-card border-white/10 shadow-2xl text-white max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-base sm:text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              Dueño / Encargado — {selectedTiendaForEncargado?.nombre}
            </DialogTitle>
          </DialogHeader>

          {loadingEncargado ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5 py-2 text-xs">
              {/* ESTADO ACTUAL DEL ENCARGADO */}
              {encargadoData?.tieneUsuario ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Usuario de Acceso Vinculado
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                      {encargadoData.usuarioRol}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-400">Nombre:</span>{" "}
                      <strong className="text-white">{encargadoData.usuarioNombre || "Sin nombre"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>{" "}
                      <strong className="text-white font-mono">{encargadoData.usuarioEmail}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Teléfono:</span>{" "}
                      <span>{encargadoData.encargadoTelefono || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Estado:</span>{" "}
                      <span className="text-emerald-400 font-semibold">{encargadoData.usuarioActivo ? "Activo" : "Inactivo"}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDesvincularEncargado}
                      disabled={savingEncargado}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs h-7 gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Desvincular de esta tienda
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <p className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" /> Sin cuenta de usuario vinculada
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Esta tienda tiene datos informativos ({selectedTiendaForEncargado?.encargadoNombre || "Sin encargado"}), pero aún no cuenta con un usuario en el sistema para iniciar sesión.
                  </p>
                </div>
              )}

              {/* SECCIÓN ASIGNAR / VINCULAR ENCARGADO */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-primary">
                  <UserPlus className="h-4 w-4" /> {encargadoData?.tieneUsuario ? "Cambiar Encargado" : "Vincular Encargado"}
                </h4>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={encargadoTab === "nuevo" ? "default" : "outline"}
                    onClick={() => setEncargadoTab("nuevo")}
                    className={`text-xs h-8 ${encargadoTab === "nuevo" ? "bg-primary text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
                  >
                    Crear Nuevo Usuario
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={encargadoTab === "existente" ? "default" : "outline"}
                    onClick={() => setEncargadoTab("existente")}
                    className={`text-xs h-8 ${encargadoTab === "existente" ? "bg-primary text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
                  >
                    Vincular Usuario Existente
                  </Button>
                </div>

                {encargadoTab === "nuevo" ? (
                  <div className="space-y-3 p-3 bg-black/20 rounded-xl border border-white/5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[11px]">Nombre Completo *</Label>
                        <Input
                          value={nuevoEncargadoNombre}
                          onChange={(e) => setNuevoEncargadoNombre(e.target.value)}
                          placeholder="Ej: Carlos Rojas"
                          className="bg-black/30 border-white/10 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[11px]">Correo Electrónico (Login) *</Label>
                        <Input
                          type="email"
                          value={nuevoEncargadoEmail}
                          onChange={(e) => setNuevoEncargadoEmail(e.target.value)}
                          placeholder="carlos@mitienda.com"
                          className="bg-black/30 border-white/10 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[11px]">Teléfono / WhatsApp</Label>
                        <Input
                          value={nuevoEncargadoTelefono}
                          onChange={(e) => setNuevoEncargadoTelefono(e.target.value)}
                          placeholder="71234567"
                          className="bg-black/30 border-white/10 text-white text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-[11px]">Contraseña</Label>
                        <Input
                          type="password"
                          value={nuevoEncargadoPassword}
                          onChange={(e) => setNuevoEncargadoPassword(e.target.value)}
                          placeholder="Por defecto: skyworth123"
                          className="bg-black/30 border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-3 bg-black/20 rounded-xl border border-white/5">
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-[11px]">Seleccionar Usuario del Sistema</Label>
                      <Select value={selectedExistingUserId} onValueChange={setSelectedExistingUserId}>
                        <SelectTrigger className="bg-black/30 border-white/10 text-white text-xs">
                          <SelectValue placeholder="Busca y selecciona un usuario..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white max-h-56">
                          {availableUsers.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                              {u.nombreCompleto || u.email} ({u.email}) — {u.rol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={handleVincularEncargado}
                    disabled={savingEncargado || (encargadoTab === "existente" && !selectedExistingUserId) || (encargadoTab === "nuevo" && !nuevoEncargadoEmail.trim())}
                    className="bg-primary hover:bg-primary/90 text-white text-xs shadow-md"
                  >
                    {savingEncargado ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                    Guardar y Vincular como Encargado
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 border-t border-white/10 pt-3">
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white w-full text-xs"
              onClick={() => setEncargadoModalOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

