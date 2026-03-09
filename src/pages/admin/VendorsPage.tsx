import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Download, QrCode, Users, UserCheck, UserX, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { useAuth } from "@/contexts/AuthContext";

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

  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  // Stats from current loaded data (note: page-level only, not global)
  const stats = useMemo(() => {
    const totalActive = vendors.filter((v) => v.is_active).length;
    const totalInactive = vendors.filter((v) => !v.is_active).length;
    const totalPending = vendors.filter((v) => v.pending_approval).length;
    return { totalActive, totalInactive, totalPending };
  }, [vendors]);

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
              <p className="text-lg font-bold font-display">{stats.totalActive}</p>
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
              <p className="text-lg font-bold font-display">{stats.totalInactive}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Inactivos</p>
            </div>
          </CardContent>
        </Card>
        {stats.totalPending > 0 && (
          <Card className="hover:border-warning/20 transition-colors cursor-pointer border-warning/30" onClick={() => setStatusFilter("pending")}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-lg font-bold font-display text-warning">{stats.totalPending}</p>
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
