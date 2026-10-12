import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Download, Package, Search } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { AdminEmptyState, AdminPageHeader, AdminToolbar } from "@/components/admin/AdminInterface";

interface Product {
  id: number;
  nombre: string;
  // campos nuevos
  modelo?: string | null;
  tamanoPulgadas?: number | null;
  descripcion?: string | null;
  fechaCreacion?: string | null;
  campanasActivas?: string[];
  // campos legacy
  modeloCodigo?: string | null;
  pulgadas?: number | null;
  activo: boolean;
  tipoProducto?: { id: number; nombre: string } | null;
}

interface ProductType {
  id: number;
  nombre: string;
}

const emptyProduct = {
  nombre: "",
  modelo: "",
  tamanoPulgadas: "" as string | number,
  descripcion: "",
  // legacy
  modeloCodigo: "",
  pulgadas: "" as string | number,
  activo: true,
  tipoProductoId: "" as string | number,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: "", typeId: "all" });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.typeId !== "all") params.append("tipoProductoId", filters.typeId);
    
    const data = await apiGet<Product[]>(`/products?${params.toString()}`).catch(() => []);
    setProducts(data || []);
    setLoading(false);
  };

  const loadTypes = async () => {
    const data = await apiGet<ProductType[]>("/product-types").catch(() => []);
    setProductTypes(data || []);
  };

  useEffect(() => { loadTypes(); }, []);
  useEffect(() => { load(); }, [filters]);

  const openNew = () => { setEditing(null); setForm(emptyProduct); setDialog(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      modelo: p.modelo ?? p.modeloCodigo ?? "",
      tamanoPulgadas: p.tamanoPulgadas ?? p.pulgadas ?? "",
      descripcion: p.descripcion ?? "",
      modeloCodigo: p.modeloCodigo ?? "",
      pulgadas: p.pulgadas ?? "",
      activo: p.activo,
      tipoProductoId: p.tipoProducto?.id ?? "",
    });
    setDialog(true);
  };

  const save = async () => {
    if (!form.nombre) { toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      ...form,
      tamanoPulgadas: form.tamanoPulgadas === "" ? null : Number(form.tamanoPulgadas),
      pulgadas: form.tamanoPulgadas === "" ? null : Number(form.tamanoPulgadas),
      // sincronizar modelo ↔ modeloCodigo
      modeloCodigo: form.modelo || form.modeloCodigo,
      tipoProducto: form.tipoProductoId ? { id: Number(form.tipoProductoId) } : null,
    };
    try {
      if (editing) {
        await apiPut(`/products/${editing.id}`, payload);
        toast({ title: "Producto actualizado" });
      } else {
        await apiPost("/products", payload);
        toast({ title: "Producto creado" });
      }
      setDialog(false); load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleExport = () => {
    exportToExcel(products.map((p) => ({
      Nombre: p.nombre,
      Modelo: p.modelo ?? p.modeloCodigo ?? "",
      "Pulgadas": p.tamanoPulgadas ?? p.pulgadas ?? "",
      Tipo: p.tipoProducto?.nombre ?? "—",
      Campañas: p.campanasActivas?.join(", ") ?? "—",
      Descripción: p.descripcion ?? "",
      Activo: p.activo ? "Sí" : "No",
    })), "productos");
  };

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        eyebrow="Catálogo maestro / Bonos"
        title="Productos y modelos"
        description="Mantén el catálogo comercial, sus especificaciones y la disponibilidad por campaña."
        icon={Package}
        meta={<span className="rounded-full border border-white/[.07] bg-white/[.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">{products.length} resultados</span>}
        actions={<>
          <Button variant="outline" onClick={handleExport} className="admin-control rounded-xl text-white">
            <Download className="h-4 w-4 mr-1.5" />Excel
          </Button>
          <Button onClick={openNew} className="rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/95">
            <Plus className="h-4 w-4 mr-1.5" />Nuevo Producto
          </Button>
        </>}
      />

      <AdminToolbar>
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
              <Input
                placeholder="Buscar por nombre o modelo..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="admin-control h-10 rounded-lg pl-9 text-white placeholder-slate-600"
              />
            </div>
            <div className="w-full sm:w-60">
              <Select
                value={filters.typeId}
                onValueChange={(v) => setFilters(prev => ({ ...prev, typeId: v }))}
              >
                <SelectTrigger className="admin-control h-10 rounded-lg text-white">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="all" className="focus:bg-white/5 focus:text-white">Todos los tipos</SelectItem>
                  {productTypes.map(t => (
                    <SelectItem key={t.id} value={String(t.id)} className="focus:bg-white/5 focus:text-white">{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
      </AdminToolbar>

      <Card className="admin-data-card glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Modelo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Pulgadas</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Campañas Activas</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-xs text-muted-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell className="font-semibold text-white text-sm">{p.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[11px]">
                        {p.tipoProducto?.nombre ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-300">{p.modelo ?? p.modeloCodigo ?? "—"}</TableCell>
                    <TableCell className="text-sm text-slate-300">{(p.tamanoPulgadas ?? p.pulgadas) ? `${p.tamanoPulgadas ?? p.pulgadas}"` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.campanasActivas && p.campanasActivas.length > 0 ? (
                          p.campanasActivas.map(c => (
                            <Badge key={c} variant="secondary" className="text-[10px] bg-slate-800 text-slate-300 border border-white/5">
                              {c}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.activo ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] animate-pulse">Activo</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-400 border border-red-500/20 text-[11px]">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-slate-400 hover:text-white hover:bg-white/5">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0"><AdminEmptyState title="Sin productos en el catálogo" /></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="w-full sm:max-w-lg glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display text-white text-lg">{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Modelo</Label>
                <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value, modeloCodigo: e.target.value })} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Tamaño (pulgadas)</Label>
                <Input type="number" value={form.tamanoPulgadas} onChange={(e) => setForm({ ...form, tamanoPulgadas: e.target.value, pulgadas: e.target.value })} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Tipo de Producto *</Label>
              <Select value={String(form.tipoProductoId)} onValueChange={(v) => setForm({ ...form, tipoProductoId: v })}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  {productTypes.map(t => (
                    <SelectItem key={t.id} value={String(t.id)} className="focus:bg-white/5 focus:text-white">{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Descripción</Label>
              <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 resize-none" />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5 mt-4">
              <Label className="text-slate-300 text-sm">Habilitado para Bonos (Activo)</Label>
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
