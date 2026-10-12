import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CityGroup {
  id: number;
  nombre: string;
  displayOrder: number;
  ciudades: string[];
}

export default function CityGroupsPage() {
  const [groups, setGroups] = useState<CityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<CityGroup | null>(null);
  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formMembers, setFormMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { cities } = useCities(false);

  const load = async () => {
    setLoading(true);
    const data = await apiGet<CityGroup[]>("/city-groups").catch(() => []);
    setGroups(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setFormName(""); setFormOrder(groups.length); setFormMembers([]); setDialog(true); };
  const openEdit = (g: CityGroup) => { setEditing(g); setFormName(g.nombre); setFormOrder(g.displayOrder); setFormMembers(g.ciudades || []); setDialog(true); };
  const toggleMember = (cityName: string) => {
    setFormMembers((prev) => prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]);
  };

  const save = async () => {
    if (!formName.trim()) { toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { nombre: formName.trim(), displayOrder: formOrder, ciudades: formMembers };
      if (editing) {
        await apiPut(`/city-groups/${editing.id}`, payload);
      } else {
        await apiPost("/city-groups", payload);
      }
      toast({ title: editing ? "Grupo actualizado" : "Grupo creado" });
      setDialog(false); load();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteGroup = async (id: number) => {
    if (!confirm("¿Eliminar este grupo?")) return;
    await apiDelete(`/city-groups/${id}`).catch(() => {});
    toast({ title: "Grupo eliminado" }); load();
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-primary" /> Agrupación de Ciudades
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Configura grupos territoriales de ciudades para los reportes semanales</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/95 text-white w-fit"><Plus className="h-4 w-4 mr-1.5" />Nuevo Grupo</Button>
      </div>

      {groups.length === 0 ? (
        <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
          <CardContent className="py-12 text-center text-slate-400">
            <FolderTree className="h-12 w-12 mx-auto mb-3 text-slate-500 opacity-60" />
            <p className="font-semibold text-sm">No hay grupos configurados</p>
            <p className="text-xs text-slate-500 mt-1">Crea uno para organizar las ciudades en los reportes gerenciales.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <Card key={g.id} className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 hover-glow-primary transition-all duration-300">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 border-b border-white/5 bg-white/5">
                <CardTitle className="text-sm font-semibold text-white">{g.nombre}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(g)} className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteGroup(g.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {(g.ciudades || []).length === 0 ? (
                    <span className="text-xs text-slate-500 italic">Sin ciudades asignadas</span>
                  ) : (g.ciudades || []).map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] border-white/10 text-slate-300 bg-white/5">{m}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="w-full sm:max-w-md glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display text-white text-lg">{editing ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Nombre del grupo *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Ciudades Intermedias" className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Orden de visualización</Label>
              <Input type="number" value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold">Ciudades del grupo</Label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 border border-white/5 rounded-lg bg-black/20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {cities.map((city) => (
                  <label key={city.id} className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                    <Checkbox checked={formMembers.includes(city.nombre)} onCheckedChange={() => toggleMember(city.nombre)} className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <span className={cn("truncate", !city.activo && "text-slate-500 line-through")}>{city.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Guardar Cambios" : "Crear Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
