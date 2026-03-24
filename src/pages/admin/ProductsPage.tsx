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
import { Loader2, Plus, Pencil, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Productos y Modelos</h1><p className="text-sm text-muted-foreground">Catálogo de productos Skyworth</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre o modelo..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={filters.typeId}
                onValueChange={(v) => setFilters(prev => ({ ...prev, typeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {productTypes.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Pulgadas</TableHead>
                  <TableHead>Campañas Activas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell><Badge variant="outline">{p.tipoProducto?.nombre ?? "—"}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{p.modelo ?? p.modeloCodigo ?? "—"}</TableCell>
                    <TableCell>{(p.tamanoPulgadas ?? p.pulgadas) ? `${p.tamanoPulgadas ?? p.pulgadas}"` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.campanasActivas && p.campanasActivas.length > 0 ? (
                          p.campanasActivas.map(c => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)
                        ) : "—"}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sin productos</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader className="mb-4">
            <DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value, modeloCodigo: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tamaño (pulgadas)</Label><Input type="number" value={form.tamanoPulgadas} onChange={(e) => setForm({ ...form, tamanoPulgadas: e.target.value, pulgadas: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Producto *</Label>
              <Select value={String(form.tipoProductoId)} onValueChange={(v) => setForm({ ...form, tipoProductoId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                <SelectContent>
                  {productTypes.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} /></div>
            <div className="flex items-center justify-between"><Label>Activo</Label><Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} /></div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
