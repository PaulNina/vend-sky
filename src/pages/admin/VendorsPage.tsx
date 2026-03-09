import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Download, Upload, QrCode, Users, UserCheck, UserX, Clock, ChevronLeft, ChevronRight, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

interface Vendor {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string;
  store_name: string | null;
  is_active: boolean;
  talla_polera: string | null;
  created_at: string;
  qr_url: string | null;
  qr_expires_at: string | null;
  pending_approval: boolean;
}

interface StoreHistory {
  id: string;
  previous_store: string | null;
  new_store: string | null;
  changed_by: string;
  observation: string | null;
  changed_at: string;
}

interface ImportVendorRow {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  store_name: string;
  talla_polera: string;
  error?: string;
}

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
}

const PAGE_SIZE = 50;

export default function VendorsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editForm, setEditForm] = useState({ talla_polera: "", store_name: "", storeObs: "" });
  const [storeHistory, setStoreHistory] = useState<StoreHistory[]>([]);
  const [saving, setSaving] = useState(false);
  const [qrDialog, setQrDialog] = useState(false);
  const [qrSignedUrl, setQrSignedUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [globalStats, setGlobalStats] = useState({ active: 0, inactive: 0, pending: 0 });

  // Import state
  const [importDialog, setImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<ImportVendorRow[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [importCampaignId, setImportCampaignId] = useState<string>("none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [cityFilter, statusFilter, debouncedSearch]);

  // Load cities from cities table (not from vendors)
  useEffect(() => {
    supabase.from("cities").select("name").eq("is_active", true).order("display_order").then(({ data }) => {
      setCities((data || []).map(c => c.name));
    });
  }, []);

  const load = async () => {
    setLoading(true);

    let q = supabase.from("vendors").select("*", { count: "exact" }).order("full_name")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (cityFilter !== "all") q = q.eq("city", cityFilter);
    if (statusFilter === "active") q = q.eq("is_active", true);
    if (statusFilter === "inactive") q = q.eq("is_active", false);
    if (statusFilter === "pending") q = q.eq("pending_approval", true);
    if (debouncedSearch) q = q.ilike("full_name", `%${debouncedSearch}%`);
    const { data, count } = await q;
    setVendors(data || []);
    setTotalFiltered(count || 0);
    setLoading(false);
  };

  // Load global stats (independent of filters/pagination)
  const loadGlobalStats = async () => {
    const [activeRes, inactiveRes, pendingRes] = await Promise.all([
      supabase.from("vendors").select("id", { head: true, count: "exact" }).eq("is_active", true),
      supabase.from("vendors").select("id", { head: true, count: "exact" }).eq("is_active", false),
      supabase.from("vendors").select("id", { head: true, count: "exact" }).eq("pending_approval", true),
    ]);
    setGlobalStats({
      active: activeRes.count || 0,
      inactive: inactiveRes.count || 0,
      pending: pendingRes.count || 0,
    });
  };

  useEffect(() => { loadGlobalStats(); }, []);
  useEffect(() => { load(); }, [cityFilter, statusFilter, debouncedSearch, page]);

  const openEdit = async (v: Vendor) => {
    setEditVendor(v);
    setEditForm({ talla_polera: v.talla_polera || "", store_name: v.store_name || "", storeObs: "" });
    const { data } = await supabase.from("vendor_store_history").select("*").eq("vendor_id", v.id).order("changed_at", { ascending: false });
    setStoreHistory(data || []);
  };

  const saveVendor = async () => {
    if (!editVendor || !user) return;
    setSaving(true);
    const updates: any = { talla_polera: editForm.talla_polera || null };
    if (editForm.store_name !== (editVendor.store_name || "")) {
      updates.store_name = editForm.store_name || null;
      await supabase.from("vendor_store_history").insert({
        vendor_id: editVendor.id, previous_store: editVendor.store_name,
        new_store: editForm.store_name || null, changed_by: user.id, observation: editForm.storeObs || null,
      });
    }
    const { error } = await supabase.from("vendors").update(updates).eq("id", editVendor.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Vendedor actualizado" });
    setSaving(false);
    setEditVendor(null);
    load();
  };

  const toggleActive = async (v: Vendor) => {
    const { error } = await supabase.from("vendors").update({ is_active: !v.is_active }).eq("id", v.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: v.is_active ? "Vendedor desactivado" : "Vendedor activado" });
    load();
  };

  const approveVendor = async (v: Vendor) => {
    const { error } = await supabase.from("vendors").update({ pending_approval: false, is_active: true }).eq("id", v.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Vendedor aprobado" });
    load();
  };

  const handleExport = async () => {
    // Export all filtered, not just current page
    let all: any[] = [];
    let from = 0;
    while (true) {
      let q = supabase.from("vendors").select("*").order("full_name").range(from, from + 999);
      if (cityFilter !== "all") q = q.eq("city", cityFilter);
      if (statusFilter === "active") q = q.eq("is_active", true);
      if (statusFilter === "inactive") q = q.eq("is_active", false);
      if (debouncedSearch) q = q.ilike("full_name", `%${debouncedSearch}%`);
      const { data } = await q;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    exportToExcel(all.map((v: any) => ({
      Nombre: v.full_name, Email: v.email || "", Teléfono: v.phone || "",
      Ciudad: v.city, Tienda: v.store_name || "", Talla: v.talla_polera || "",
      Activo: v.is_active ? "Sí" : "No", Registro: v.created_at.split("T")[0],
    })), "vendedores");
  };

  // --- Import functions ---
  const loadActiveCampaigns = async () => {
    const { data } = await supabase.from("campaigns").select("id, name, is_active").eq("is_active", true);
    setActiveCampaigns(data || []);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { nombre: "Juan Pérez", email: "juan@ejemplo.com", telefono: "70012345", ciudad: "La Paz", tienda: "Tienda Centro", talla: "M" },
      { nombre: "María López", email: "maria@ejemplo.com", telefono: "71098765", ciudad: "Santa Cruz", tienda: "Tienda Norte", talla: "S" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendedores");
    XLSX.writeFile(wb, "plantilla_vendedores.xlsx");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportParsing(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

      const parsed: ImportVendorRow[] = raw.map((row) => {
        const full_name = String(row.nombre || row.full_name || row.Nombre || row.Name || "").trim();
        const email = String(row.email || row.Email || row.correo || row.Correo || "").trim().toLowerCase();
        const phone = String(row.telefono || row.phone || row.Teléfono || row.Phone || "").trim();
        const city = String(row.ciudad || row.city || row.Ciudad || row.City || "").trim();
        const store_name = String(row.tienda || row.store_name || row.Tienda || row.Store || "").trim();
        const talla_polera = String(row.talla || row.talla_polera || row.Talla || "").trim();

        let error: string | undefined;
        if (!full_name) error = "Nombre vacío";
        else if (!email) error = "Email vacío";
        else if (!email.includes("@")) error = "Email inválido";
        else if (!city) error = "Ciudad vacía";

        return { full_name, email, phone, city, store_name, talla_polera, error };
      });

      setImportRows(parsed);
    } catch (err: any) {
      toast({ title: "Error al leer archivo", description: err.message, variant: "destructive" });
    }

    setImportParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeImport = async () => {
    const valid = importRows.filter(r => !r.error);
    if (valid.length === 0) {
      toast({ title: "No hay registros válidos", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Sesión expirada");

      const { data, error } = await supabase.functions.invoke("import-vendors", {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          vendors: valid.map(r => ({
            full_name: r.full_name,
            email: r.email,
            phone: r.phone || undefined,
            city: r.city,
            store_name: r.store_name || undefined,
            talla_polera: r.talla_polera || undefined,
          })),
          campaign_id: importCampaignId !== "none" ? importCampaignId : undefined,
        },
      });

      if (error) throw error;

      setImportResult({ created: data.created, skipped: data.skipped, errors: data.errors || [] });
      if (data.created > 0) {
        toast({ title: "Importación completada", description: `${data.created} vendedores creados.` });
        load();
        loadGlobalStats();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setImporting(false);
  };

  const openImport = () => {
    setImportRows([]);
    setImportResult(null);
    setImportCampaignId("none");
    setImportDialog(true);
    loadActiveCampaigns();
  };

  const validImportCount = importRows.filter(r => !r.error).length;
  const errorImportCount = importRows.filter(r => r.error).length;

  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  const stats = globalStats;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Vendedores (Kardex)
          </h1>
          <p className="text-sm text-muted-foreground">{totalFiltered} vendedores encontrados</p>
        </div>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:border-success/20 transition-colors cursor-pointer" onClick={() => setStatusFilter("active")}>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold font-display">{stats.active}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-destructive/20 transition-colors cursor-pointer" onClick={() => setStatusFilter("inactive")}>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <UserX className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold font-display">{stats.inactive}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Inactivos</p>
            </div>
          </CardContent>
        </Card>
        {stats.pending > 0 && (
          <Card className="hover:border-warning/20 transition-colors cursor-pointer border-warning/30" onClick={() => setStatusFilter("pending")}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-lg font-bold font-display text-warning">{stats.pending}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pendientes</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ciudades</p>
            <p className="text-lg font-bold font-display mt-0.5">{cities.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id} className={v.pending_approval ? "bg-warning/5" : ""}>
                    <TableCell className="font-medium">
                      {v.full_name}
                      {v.pending_approval && (
                        <Badge variant="outline" className="ml-2 text-[9px] border-warning text-warning">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{v.email || "—"}</TableCell>
                    <TableCell className="text-sm">{v.phone || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{v.city}</Badge></TableCell>
                    <TableCell className="text-sm">{v.store_name || "—"}</TableCell>
                    <TableCell className="text-sm">{v.talla_polera || "—"}</TableCell>
                    <TableCell>
                      {v.qr_url ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={async () => {
                          setQrLoading(true); setQrDialog(true);
                          const { data } = await supabase.storage.from("vendor-qr").createSignedUrl(v.qr_url!, 300);
                          setQrSignedUrl(data?.signedUrl || null); setQrLoading(false);
                        }}>
                          <QrCode className="h-3.5 w-3.5" />
                          <Badge variant={v.qr_expires_at && new Date(v.qr_expires_at) < new Date() ? "destructive" : "default"} className="text-[9px] px-1">
                            {v.qr_expires_at && new Date(v.qr_expires_at) < new Date() ? "Venc." : "OK"}
                          </Badge>
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {v.is_active ? <Badge>Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {v.pending_approval && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-success hover:text-success" onClick={() => approveVendor(v)}>
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => toggleActive(v)}
                          title={v.is_active ? "Desactivar" : "Activar"}
                        >
                          {v.is_active ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-success" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sin vendedores</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Siguiente<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editVendor} onOpenChange={(open) => !open && setEditVendor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Kardex: {editVendor?.full_name}</DialogTitle></DialogHeader>
          {editVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-muted/30 border border-border/50">
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Email</span><p className="font-medium mt-0.5">{editVendor.email || "—"}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Teléfono</span><p className="font-medium mt-0.5">{editVendor.phone || "—"}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Ciudad</span><p className="font-medium mt-0.5">{editVendor.city}</p></div>
                <div><span className="text-[11px] text-muted-foreground uppercase tracking-wider">Registro</span><p className="font-medium mt-0.5">{editVendor.created_at.split("T")[0]}</p></div>
              </div>

              <div className="space-y-2"><Label>Talla de polera</Label><Input value={editForm.talla_polera} onChange={(e) => setEditForm({ ...editForm, talla_polera: e.target.value })} placeholder="S, M, L, XL..." /></div>
              <div className="space-y-2"><Label>Tienda actual</Label><Input value={editForm.store_name} onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })} /></div>
              {editForm.store_name !== (editVendor.store_name || "") && (
                <div className="space-y-2"><Label>Observación del cambio</Label><Textarea value={editForm.storeObs} onChange={(e) => setEditForm({ ...editForm, storeObs: e.target.value })} placeholder="Motivo del cambio de tienda..." /></div>
              )}

              {storeHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial de cambios de tienda</p>
                  <div className="border border-border rounded-md divide-y divide-border max-h-40 overflow-y-auto">
                    {storeHistory.map((h) => (
                      <div key={h.id} className="p-2 text-xs">
                        <span className="text-muted-foreground">{h.changed_at.split("T")[0]}</span>
                        {" "}{h.previous_store || "(sin tienda)"} → <strong>{h.new_store || "(sin tienda)"}</strong>
                        {h.observation && <p className="text-muted-foreground mt-0.5">{h.observation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVendor(null)}>Cancelar</Button>
            <Button onClick={saveVendor} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialog} onOpenChange={setQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR de Cobro</DialogTitle></DialogHeader>
          {qrLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : qrSignedUrl ? (
            <img src={qrSignedUrl} alt="QR de cobro" className="w-full rounded-lg" />
          ) : (
            <p className="text-sm text-muted-foreground text-center p-4">No se pudo cargar el QR</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
