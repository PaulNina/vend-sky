import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface CityGroup {
  id: string;
  name: string;
  display_order: number;
  members: string[];
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
    const { data: groupsData } = await supabase
      .from("city_groups")
      .select("id, name, display_order")
      .order("display_order");
    
    if (!groupsData) { setLoading(false); return; }

    const { data: membersData } = await supabase
      .from("city_group_members")
      .select("group_id, city_name");

    const result: CityGroup[] = groupsData.map((g) => ({
      ...g,
      members: (membersData || []).filter((m) => m.group_id === g.id).map((m) => m.city_name),
    }));

    setGroups(result);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setFormName("");
    setFormOrder(groups.length);
    setFormMembers([]);
    setDialog(true);
  };

  const openEdit = (g: CityGroup) => {
    setEditing(g);
    setFormName(g.name);
    setFormOrder(g.display_order);
    setFormMembers(g.members);
    setDialog(true);
  };

  const toggleMember = (cityName: string) => {
    setFormMembers((prev) =>
      prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]
    );
  };

  const save = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      let groupId: string;

      if (editing) {
        await supabase.from("city_groups").update({ name: formName.trim(), display_order: formOrder }).eq("id", editing.id);
        groupId = editing.id;
        // Clear old members
        await supabase.from("city_group_members").delete().eq("group_id", groupId);
      } else {
        const { data, error } = await supabase.from("city_groups").insert({ name: formName.trim(), display_order: formOrder }).select().single();
        if (error) throw error;
        groupId = data.id;
      }

      // Insert members
      if (formMembers.length > 0) {
        await supabase.from("city_group_members").insert(
          formMembers.map((city_name) => ({ group_id: groupId, city_name }))
        );
      }

      toast({ title: editing ? "Grupo actualizado" : "Grupo creado" });
      setDialog(false);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("¿Eliminar este grupo?")) return;
    await supabase.from("city_groups").delete().eq("id", id);
    toast({ title: "Grupo eliminado" });
    load();
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agrupación de Ciudades</h1>
          <p className="text-sm text-muted-foreground">Configura grupos de ciudades para los reportes semanales</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nuevo Grupo</Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay grupos configurados. Crea uno para agrupar ciudades en los reportes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteGroup(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {g.members.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Sin ciudades asignadas</span>
                  ) : g.members.map((m) => (
                    <Badge key={m} variant="outline">{m}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del grupo *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Ciudades Intermedias" />
            </div>
            <div className="space-y-2">
              <Label>Orden de visualización</Label>
              <Input type="number" value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Ciudades del grupo</Label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                {cities.map((city) => (
                  <label key={city.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formMembers.includes(city.name)}
                      onCheckedChange={() => toggleMember(city.name)}
                    />
                    <span className={!city.is_active ? "text-muted-foreground line-through" : ""}>{city.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
