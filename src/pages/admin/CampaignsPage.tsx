import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
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
import { Loader2, Plus, Pencil, Package, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn, formatDateBolivia } from "@/lib/utils";

interface Campaign {
  id: number;
  nombre: string;
  subtitulo?: string | null;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
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
  activo: boolean;
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
        bonoBs: Number(newBonoBs)
      });
      loadCampaignProducts(managingCampaign.id);
      setSelectedProductToAdd("");
      setNewPuntos("");
      setNewBonoBs("");
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



  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Campañas</h1>
          <p className="text-sm text-muted-foreground">Administra las campañas del programa</p>
        </div>
        <Button onClick={openNew} variant="premium">
          <Plus className="h-4 w-4 mr-1" />Nueva Campaña
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
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
                      <Badge variant={c.activo ? "default" : "secondary"}>
                        {c.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.registroHabilitado ? "default" : "outline"}>
                        {c.registroHabilitado ? "Abierto" : "Cerrado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openProducts(c)} title="Ver Productos">
                          <Package className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar Campaña">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {campaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Sin campañas
                    </TableCell>
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
        <DialogContent className="w-full sm:max-w-3xl">
          <DialogHeader className="mb-4">
            <DialogTitle>Productos en Campaña: {managingCampaign?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_auto] gap-3 items-end bg-muted/40 p-4 rounded-lg border">
              <div className="space-y-1">
                <Label>Producto</Label>
                <Popover open={openProductCombo} onOpenChange={setOpenProductCombo}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selectedProductToAdd
                        ? (() => {
                            const p = allProducts.find((p) => String(p.id) === selectedProductToAdd);
                            return p ? `[${p.tipoProducto?.nombre || "—"}] ${p.nombre} ${p.modelo || p.modeloCodigo || ""}` : "Seleccionar producto";
                          })()
                        : "Seleccionar producto"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar producto..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron productos.</CommandEmpty>
                        <CommandGroup>
                          {allProducts.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.nombre} ${p.modelo || p.modeloCodigo || ""} ${p.tipoProducto?.nombre || ""}`}
                              onSelect={() => {
                                setSelectedProductToAdd(String(p.id));
                                setOpenProductCombo(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedProductToAdd === String(p.id) ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{p.nombre} {p.modelo || p.modeloCodigo || ""}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{p.tipoProducto?.nombre || "Sin Categoría"}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Puntos</Label>
                <Input type="number" min="0" value={newPuntos} onChange={e => setNewPuntos(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Bono Bs</Label>
                <Input type="number" min="0" value={newBonoBs} onChange={e => setNewBonoBs(e.target.value)} />
              </div>
              <Button onClick={handleAddProduct}>
                <Plus className="h-4 w-4 mr-1" /> Añadir
              </Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead className="text-right">Bono Bs</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignProducts.map(cp => (
                    <TableRow key={cp.id}>
                      <TableCell className="font-medium">
                        {cp.producto.nombre} 
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {cp.producto.modelo ?? cp.producto.modeloCodigo ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{cp.puntos}</TableCell>
                      <TableCell className="text-right font-bold">Bs {cp.bonoBs}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(cp.producto.id, cp.id)} title="Quitar de campaña">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {campaignProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No hay productos asignados a esta campaña
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={() => setProductsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
