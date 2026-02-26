import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  subtitle: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  registration_enabled: boolean;
  ai_date_validation: boolean;
  points_mode: string;
  registration_open_at: string | null;
  registration_close_at: string | null;
  require_vendor_approval: boolean;
}

const empty: Omit<Campaign, "id"> = {
  name: "", subtitle: "", start_date: "", end_date: "",
  is_active: true, registration_enabled: true, ai_date_validation: false, points_mode: "product",
  registration_open_at: null, registration_close_at: null, require_vendor_approval: false,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("campaigns").select("*").order("start_date", { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setDialog(true); };
  const openEdit = (c: Campaign) => { setEditing(c); setForm({ name: c.name, subtitle: c.subtitle, start_date: c.start_date, end_date: c.end_date, is_active: c.is_active, registration_enabled: c.registration_enabled, ai_date_validation: c.ai_date_validation, points_mode: c.points_mode, registration_open_at: c.registration_open_at, registration_close_at: c.registration_close_at, require_vendor_approval: c.require_vendor_approval }); setDialog(true); };

  const save = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast({ title: "Error", description: "Nombre, fecha inicio y fecha fin son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("campaigns").update(form).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Campaña actualizada" });
    } else {
      const { error } = await supabase.from("campaigns").insert(form);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Campaña creada" });
    }
    setSaving(false);
    setDialog(false);
    load();
  };

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Campañas</h1>
          <p className="text-sm text-muted-foreground">Administra las campañas del programa</p>
        </div>
        <Button onClick={openNew} variant="premium"><Plus className="h-4 w-4 mr-1" />Nueva Campaña</Button>
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
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>IA Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.subtitle && <p className="text-xs text-muted-foreground">{c.subtitle}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(c.start_date)} — {fmtDate(c.end_date)}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Activa" : "Inactiva"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={c.registration_enabled ? "default" : "outline"}>{c.registration_enabled ? "Abierto" : "Cerrado"}</Badge>
                        {(c.registration_open_at || c.registration_close_at) && (
                          <span className="text-[10px] text-muted-foreground">
                            {c.registration_open_at && `Abre: ${new Date(c.registration_open_at).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}`}
                            {c.registration_open_at && c.registration_close_at && " · "}
                            {c.registration_close_at && `Cierra: ${new Date(c.registration_close_at).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{c.ai_date_validation ? <Badge>ON</Badge> : <Badge variant="outline">OFF</Badge>}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Subtítulo</Label><Input value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha inicio *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fecha fin *</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Campaña activa</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
            <div className="flex items-center justify-between"><Label>Registro habilitado (manual)</Label><Switch checked={form.registration_enabled} onCheckedChange={(v) => setForm({ ...form, registration_enabled: v })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registro abre en (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={form.registration_open_at ? form.registration_open_at.slice(0, 16) : ""}
                  onChange={(e) => setForm({ ...form, registration_open_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
                <p className="text-xs text-muted-foreground">Si se establece, el registro se abre automáticamente en esta fecha/hora</p>
              </div>
              <div className="space-y-2">
                <Label>Registro cierra en (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={form.registration_close_at ? form.registration_close_at.slice(0, 16) : ""}
                  onChange={(e) => setForm({ ...form, registration_close_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
                <p className="text-xs text-muted-foreground">Si se establece, el registro se cierra automáticamente en esta fecha/hora</p>
              </div>
            </div>
            <div className="flex items-center justify-between"><Label>Requerir aprobación de vendedores</Label><Switch checked={form.require_vendor_approval ?? false} onCheckedChange={(v) => setForm({ ...form, require_vendor_approval: v })} /></div>
            <p className="text-xs text-muted-foreground -mt-2 ml-1">Si está desactivado, los vendedores se registran y acceden inmediatamente. Si está activado, requieren aprobación manual.</p>
            <div className="flex items-center justify-between"><Label>Validación IA de fecha</Label><Switch checked={form.ai_date_validation} onCheckedChange={(v) => setForm({ ...form, ai_date_validation: v })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
