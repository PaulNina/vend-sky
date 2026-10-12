import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPut, apiPatch, apiPost } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Download, Search, Users, Store, Check } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCities } from "@/hooks/useCities";
import { AdminEmptyState, AdminPageHeader, AdminToolbar } from "@/components/admin/AdminInterface";

interface Vendor {
  id: number;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  tienda?: string | null;
  ciudad?: { id: number; nombre: string; departamento?: string } | null;
  activo: boolean;
  createdAt?: string;
  ci?: string;
}

interface TiendaSimple {
  id: number;
  codigo?: string;
  nombre: string;
  canal?: string;
  ciudad?: { id: number; nombre: string; departamento?: string };
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editForm, setEditForm] = useState({ 
    nombreCompleto: "", 
    email: "", 
    telefono: "", 
    ci: "", 
    ciudadId: "",
    tiendaNombre: ""
  });
  const { cities: allCities, departments } = useCities();
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  // Multi-store assignment state
  const [allStores, setAllStores] = useState<TiendaSimple[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storeFilterText, setStoreFilterText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cityFilter !== "all") params.set("city", cityFilter);
    if (search) params.set("search", search);
    const data = await apiGet<Vendor[]>(`/vendors?${params}`).catch(() => [] as Vendor[]);
    setVendors(data);
    const uniqueCities = [...new Set(data.map((v) => v.ciudad?.nombre).filter(Boolean).map(String))];
    setCities(uniqueCities);
    setLoading(false);
  }, [cityFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async (v: Vendor) => {
    setEditVendor(v);
    setEditForm({
      nombreCompleto: v.nombreCompleto || "",
      email: v.email || "",
      telefono: v.telefono || "",
      ci: v.ci || "",
      ciudadId: v.ciudad?.id ? String(v.ciudad.id) : "",
      tiendaNombre: v.tienda || ""
    });
    setStoreFilterText("");
    setLoadingStores(true);

    try {
      const [stores, assigned] = await Promise.all([
        allStores.length > 0 ? Promise.resolve(allStores) : apiGet<TiendaSimple[]>("/tiendas").catch(() => []),
        apiGet<TiendaSimple[]>(`/tiendas/vendor/${v.id}`).catch(() => [])
      ]);
      setAllStores(stores);
      setSelectedStoreIds(assigned.map(s => s.id));
    } catch {
      // Ignorar error al cargar tiendas
    } finally {
      setLoadingStores(false);
    }
  };

  const toggleStoreSelection = (storeId: number) => {
    setSelectedStoreIds(prev => 
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  };

  const saveVendor = async () => {
    if (!editVendor) return;
    setSaving(true);
    try {
      const selectedCity = allCities.find(c => String(c.id) === String(editForm.ciudadId)) || null;
      
      // Si seleccionó tiendas, podemos usar el nombre de la primera tienda como tienda principal (retrocompatibilidad)
      let tiendaPrincipal = editForm.tiendaNombre;
      if (selectedStoreIds.length > 0) {
        const firstStore = allStores.find(s => s.id === selectedStoreIds[0]);
        if (firstStore) {
          tiendaPrincipal = firstStore.nombre;
        }
      }

      const updatedVendor = {
        ...editVendor,
        nombreCompleto: editForm.nombreCompleto,
        email: editForm.email,
        telefono: editForm.telefono,
        ci: editForm.ci,
        ciudad: selectedCity ? { id: Number(selectedCity.id), nombre: selectedCity.nombre } : null,
        tienda: tiendaPrincipal || null,
      };

      await Promise.all([
        apiPut(`/vendors/${editVendor.id}`, updatedVendor),
        apiPost(`/tiendas/vendor/${editVendor.id}/sync`, selectedStoreIds)
      ]);

      toast({ title: "Vendedor actualizado", description: "Datos personales y tiendas asignadas guardadas con éxito." });
      setEditVendor(null);
      load();
    } catch (err: unknown) {
      toast({ title: "Error al guardar", description: (err as Error).message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (v: Vendor) => {
    try {
      await apiPatch(`/vendors/${v.id}/toggle`);
      toast({ title: v.activo ? "Vendedor desactivado" : "Vendedor activado", description: `El estado del vendedor ha sido actualizado.` });
      load();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    exportToExcel(vendors.map((v) => ({
      Nombre: v.nombreCompleto,
      Email: v.email || "",
      Teléfono: v.telefono || "",
      Ciudad: v.ciudad?.nombre || "-",
      Tienda: v.tienda || "",
      Activo: v.activo ? "Sí" : "No",
    })), "vendedores");
  };

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        eyebrow="Red comercial / Kardex"
        title="Vendedores"
        description="Consulta el padrón nacional, ubicación, tienda y estado operativo de cada vendedor."
        icon={Users}
        meta={<span className="rounded-full border border-white/[.07] bg-white/[.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">{vendors.length} registrados · {vendors.filter(v => v.activo).length} activos</span>}
        actions={<Button variant="outline" onClick={handleExport} size={isMobile ? "sm" : "default"} className="admin-control w-fit rounded-xl text-white">
          <Download className="h-4 w-4 mr-1.5" /> Exportar Excel
        </Button>}
      />

      <AdminToolbar>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
          <Input
            placeholder="Buscar por nombre, CI o cel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-control pl-9 text-white placeholder-slate-600 h-10 text-xs rounded-lg"
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="admin-control w-full sm:w-[210px] h-10 text-white text-xs rounded-lg"><SelectValue placeholder="Todas las ciudades" /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="all" className="focus:bg-white/5 focus:text-white text-xs">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c} className="focus:bg-white/5 focus:text-white text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </AdminToolbar>

      <Card className="admin-data-card glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : isMobile ? (
            <div className="divide-y divide-white/5">
              {vendors.map((v) => (
                <div key={v.id} className="p-4 flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openEdit(v)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-white truncate pr-2">{v.nombreCompleto}</p>
                      {v.activo ? (
                        <Badge className="h-5 text-[9px] px-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" onClick={(e) => { e.stopPropagation(); toggleActive(v); }}>Activo</Badge>
                      ) : (
                        <Badge variant="destructive" className="h-5 text-[9px] px-1.5 bg-red-500/10 text-red-400 border border-red-500/20" onClick={(e) => { e.stopPropagation(); toggleActive(v); }}>Inactivo</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{v.tienda || "Sin tienda asignada"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[9px] h-5 border-primary/20 text-primary bg-primary/5 px-1.5">{v.ciudad?.nombre || "—"}</Badge>
                      <p className="text-[10px] text-slate-500">{v.telefono || v.email || ""}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 mt-2 text-slate-400 hover:text-white hover:bg-white/5">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {vendors.length === 0 && (
                <AdminEmptyState title="No se encontraron vendedores" compact />
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Depto</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tienda</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell className="font-semibold text-white text-sm">{v.nombreCompleto}</TableCell>
                    <TableCell className="text-sm text-slate-300">{v.email || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-300 font-mono">{v.telefono || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-[10px] px-1.5 py-0.5 rounded">
                        {v.ciudad?.nombre || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10 text-slate-400 bg-white/5 text-[10px] px-1.5 py-0.5 rounded">
                        {v.ciudad?.departamento || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{v.tienda || "—"}</TableCell>
                    <TableCell>
                      {v.activo ? (
                        <Badge className="cursor-pointer bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] px-1.5" onClick={() => toggleActive(v)}>Activo</Badge>
                      ) : (
                        <Badge variant="destructive" className="cursor-pointer bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-[10px] px-1.5" onClick={() => toggleActive(v)}>Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)} className="text-slate-400 hover:text-white hover:bg-white/5">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="p-0"><AdminEmptyState title="No se encontraron vendedores" /></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editVendor} onOpenChange={(open) => !open && setEditVendor(null)}>
        <DialogContent className="w-full sm:max-w-lg glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display text-white text-lg">Kardex: {editVendor?.nombreCompleto}</DialogTitle>
          </DialogHeader>
          {editVendor && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Nombre Completo</Label>
                  <Input value={editForm.nombreCompleto} onChange={(e) => setEditForm({ ...editForm, nombreCompleto: e.target.value })} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 text-xs h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 text-xs h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Teléfono</Label>
                  <Input value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono text-xs h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">CI</Label>
                  <Input value={editForm.ci} onChange={(e) => setEditForm({ ...editForm, ci: e.target.value })} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono text-xs h-10" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs font-semibold">Ciudad</Label>
                  <Select 
                    value={editForm.ciudadId} 
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, ciudadId: val }))}
                  >
                    <SelectTrigger className="w-full h-10 bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 text-xs">
                      <SelectValue placeholder="Seleccionar ciudad..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-60">
                      {departments.map((dept) => (
                        <SelectGroup key={dept}>
                          <SelectLabel className="text-slate-400 text-[10px] uppercase tracking-wider">{dept}</SelectLabel>
                          {allCities.filter((c) => c.departamento === dept).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)} className="focus:bg-white/5 focus:text-white text-xs">
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Tienda Referencial (Legacy)</Label>
                  <Input
                    value={editForm.tiendaNombre}
                    onChange={(e) => setEditForm({ ...editForm, tiendaNombre: e.target.value })}
                    placeholder="Ej: Tienda Centro..."
                    maxLength={200}
                    className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 text-xs h-10"
                  />
                </div>
              </div>

              {/* Multi-tienda Asignada */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-primary" /> Tiendas Asignadas ({selectedStoreIds.length})
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Haz clic para asignar o desasignar</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    placeholder="Filtrar tiendas por nombre o código..."
                    value={storeFilterText}
                    onChange={(e) => setStoreFilterText(e.target.value)}
                    className="bg-black/20 border-white/10 text-white placeholder-slate-500 text-xs pl-8 h-8 rounded-lg"
                  />
                </div>
                {loadingStores ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 p-1 bg-black/25 rounded-lg border border-white/5">
                    {allStores
                      .filter(s => 
                        s.nombre.toLowerCase().includes(storeFilterText.toLowerCase()) ||
                        (s.codigo && s.codigo.toLowerCase().includes(storeFilterText.toLowerCase())) ||
                        (s.ciudad && s.ciudad.nombre.toLowerCase().includes(storeFilterText.toLowerCase()))
                      )
                      .map(s => {
                        const isSelected = selectedStoreIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleStoreSelection(s.id)}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all text-xs ${
                              isSelected 
                                ? "bg-primary/20 border border-primary/40 text-white" 
                                : "bg-white/5 border border-transparent text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? "bg-primary border-primary text-white" : "border-white/20"}`}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <span className="font-medium">{s.nombre}</span>
                              {s.codigo && <span className="font-mono text-[10px] text-slate-400">({s.codigo})</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {s.canal && <Badge variant="outline" className="border-white/10 text-slate-400 py-0 px-1">{s.canal}</Badge>}
                              {s.ciudad && <Badge variant="outline" className="border-primary/20 text-primary py-0 px-1">{s.ciudad.nombre}</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    {allStores.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-3">No hay tiendas registradas</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setEditVendor(null)}>Cancelar</Button>
            <Button onClick={saveVendor} disabled={saving} className="bg-primary hover:bg-primary/95 text-white text-xs px-4 h-9 font-semibold">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
