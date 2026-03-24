import { useState, useEffect, useMemo } from "react";
import { apiGet, apiPost, apiPut, apiPatch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Pencil, BarChart2, Store, Search, Globe } from "lucide-react";
import { useCities } from "@/hooks/useCities";

interface Tienda {
  id: number;
  nombre: string;
  nombrePropietario?: string;
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

interface TiendaStats {
  tiendaId: number;
  tiendaNombre: string;
  totalVendedores: number;
  totalVentasAprobadas: number;
  totalBonoBs: number;
}

const EMPTY_FORM = {
  nombre: "",
  nombrePropietario: "",
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
  const { cities, departments } = useCities();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tienda | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [statsDialog, setStatsDialog] = useState(false);
  const [stats, setStats] = useState<TiendaStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const load = async () => {
    setLoading(true);
    // Fetch all stores and filter on client side for better UX
    const data = await apiGet<Tienda[]>(`/tiendas`).catch(() => [] as Tienda[]);
    setTiendas(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // Only load once on mount

  const filteredTiendas = useMemo(() => {
    return tiendas.filter((t) => {
      const matchesSearch = t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.nombrePropietario?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesCity = cityFilter === "all" || t.ciudad?.nombre === cityFilter;
      const matchesDept = deptFilter === "all" || t.ciudad?.departamento === deptFilter;
      return matchesSearch && matchesCity && matchesDept;
    });
  }, [tiendas, searchTerm, cityFilter, deptFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: Tienda) => {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      nombrePropietario: t.nombrePropietario || "",
      direccion: t.direccion || "",
      telefono: t.telefono || "",
      ciudadId: t.ciudad?.id?.toString() || "",
      ciudadNombre: t.ciudad?.nombre || "",
      departamento: t.ciudad?.departamento || "",
      nit: t.nit || "",
    });
    setDialogOpen(true);
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

  const setField = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Tiendas
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredTiendas.length} {filteredTiendas.length === 1 ? "tienda encontrada" : "tiendas encontradas"}
            {tiendas.length > 0 && ` de ${tiendas.length} registradas`}
          </p>
        </div>
        <Button onClick={openCreate}><PlusCircle className="h-4 w-4 mr-2" />Nueva Tienda</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-[250px] space-y-1.5">
          <Label className="text-[11px] font-medium uppercase text-muted-foreground tracking-wider">Buscar por nombre</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nombre de tienda o dueño..."
              className="pl-9 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="w-[180px] space-y-1.5">
          <Label className="text-[11px] font-medium uppercase text-muted-foreground tracking-wider">Departamento</Label>
          <Select value={deptFilter} onValueChange={(val) => {
            setDeptFilter(val);
            setCityFilter("all"); // Reset city when changing department
          }}>
            <SelectTrigger className="h-10">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Dpto." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los dptos.</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px] space-y-1.5">
          <Label className="text-[11px] font-medium uppercase text-muted-foreground tracking-wider">Ciudad</Label>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{deptFilter === "all" ? "Todas las ciudades" : "Todas las ciudad del dpto."}</SelectItem>
              {cities
                .filter(c => deptFilter === "all" || c.departamento === deptFilter)
                .map((c) => (
                  <SelectItem key={c.nombre} value={c.nombre}>{c.nombre}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => {
            setSearchTerm("");
            setCityFilter("all");
            setDeptFilter("all");
          }}
          title="Limpiar filtros"
        >
          <PlusCircle className="h-4 w-4 rotate-45" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTiendas.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nombre}</TableCell>
                    <TableCell className="text-sm">{t.nombrePropietario || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{t.ciudad?.nombre}</Badge></TableCell>
                    <TableCell className="text-sm">{t.ciudad?.departamento || "—"}</TableCell>
                    <TableCell className="text-sm">{t.telefono || "—"}</TableCell>
                    <TableCell className="text-sm">{t.nit || "—"}</TableCell>
                    <TableCell>
                      {t.activo ? (
                        <Badge className="cursor-pointer" onClick={() => toggle(t)}>Activa</Badge>
                      ) : (
                        <Badge variant="destructive" className="cursor-pointer" onClick={() => toggle(t)}>Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => viewStats(t)}><BarChart2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTiendas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No hay tiendas registradas
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar: ${editing.nombre}` : "Nueva Tienda"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nombre de la tienda *</Label>
              <Input value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} placeholder="Electro Sur" />
            </div>
            <div className="space-y-1">
              <Label>Propietario</Label>
              <Input value={form.nombrePropietario} onChange={(e) => setField("nombrePropietario", e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setField("telefono", e.target.value)} placeholder="+591 7XXXXXXX" />
            </div>
            <div className="space-y-1">
              <Label>Ciudad *</Label>
              <Select value={form.ciudadNombre} onValueChange={(val) => {
                const city = cities.find((c) => c.nombre === val);
                setForm((prev) => ({ 
                  ...prev, 
                  ciudadId: city?.id?.toString() || "",
                  ciudadNombre: val, 
                  departamento: city?.departamento || "" 
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecciona ciudad" /></SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <div key={dept}>
                      <p className="px-2 py-1 text-xs text-muted-foreground font-semibold">{dept}</p>
                      {cities.filter((c) => c.departamento === dept).map((c) => (
                        <SelectItem key={c.nombre} value={c.nombre}>{c.nombre}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Departamento</Label>
              <Input value={form.departamento} readOnly className="bg-muted/50" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} placeholder="Av. Ejemplo 123" />
            </div>
            <div className="space-y-1">
              <Label>NIT</Label>
              <Input value={form.nit} onChange={(e) => setField("nit", e.target.value)} placeholder="123456789" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear tienda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialog} onOpenChange={(o) => !o && setStatsDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Estadísticas de Tienda</DialogTitle></DialogHeader>
          {loadingStats ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : stats ? (
            <div className="space-y-3">
              <p className="text-lg font-bold">{stats.tiendaNombre}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold text-primary">{stats.totalVendedores}</p>
                  <p className="text-xs text-muted-foreground">Vendedores</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold text-green-600">{stats.totalVentasAprobadas}</p>
                  <p className="text-xs text-muted-foreground">Ventas aprobadas</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold text-amber-500">Bs {stats.totalBonoBs}</p>
                  <p className="text-xs text-muted-foreground">Bono acumulado</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
