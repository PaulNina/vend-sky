import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

interface Product {
  id: string;
  name: string;
  model_code: string;
  size_inches: number | null;
  bonus_bs_value: number;
  points_value: number;
  is_active: boolean;
}

const emptyProduct = { name: "", model_code: "", size_inches: "" as any, bonus_bs_value: 0, points_value: 0, is_active: true };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyProduct); setDialog(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, model_code: p.model_code, size_inches: p.size_inches ?? "", bonus_bs_value: p.bonus_bs_value, points_value: p.points_value, is_active: p.is_active });
    setDialog(true);
  };

  const save = async () => {
    if (!form.name || !form.model_code) { toast({ title: "Error", description: "Nombre y código modelo son obligatorios.", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { ...form, size_inches: form.size_inches === "" ? null : Number(form.size_inches), bonus_bs_value: Number(form.bonus_bs_value), points_value: Number(form.points_value) };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Producto actualizado" });
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Producto creado" });
    }
    setSaving(false); setDialog(false); load();
  };

  const handleExport = () => {
    exportToExcel(products.map((p) => ({ Nombre: p.name, Modelo: p.model_code, Pulgadas: p.size_inches ?? "", "Bono Bs": p.bonus_bs_value, Puntos: p.points_value, Activo: p.is_active ? "Sí" : "No" })), "productos");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Productos y Modelos</h1><p className="text-sm text-muted-foreground">Bono Bs y puntos por modelo</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Modelo</TableHead><TableHead>Pulgadas</TableHead><TableHead className="text-right">Bono Bs</TableHead><TableHead className="text-right">Puntos</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-sm">{p.model_code}</TableCell>
                    <TableCell>{p.size_inches ?? "—"}</TableCell>
                    <TableCell className="text-right font-bold">Bs {p.bonus_bs_value}</TableCell>
                    <TableCell className="text-right">{p.points_value}</TableCell>
                    <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Activo" : "Inactivo"}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Código Modelo *</Label><Input value={form.model_code} onChange={(e) => setForm({ ...form, model_code: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Pulgadas</Label><Input type="number" value={form.size_inches} onChange={(e) => setForm({ ...form, size_inches: e.target.value })} /></div>
              <div className="space-y-2"><Label>Bono Bs</Label><Input type="number" value={form.bonus_bs_value} onChange={(e) => setForm({ ...form, bonus_bs_value: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Puntos</Label><Input type="number" value={form.points_value} onChange={(e) => setForm({ ...form, points_value: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Activo</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editing ? "Guardar" : "Crear"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
