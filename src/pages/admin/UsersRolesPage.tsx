import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCities } from "@/hooks/useCities";

const ROLES: { value: string; label: string }[] = [
  { value: "vendedor", label: "Vendedor" },
  { value: "revisor_ciudad", label: "Revisor de Ciudad" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Administrador" },
];



interface UserRole {
  id: string;
  user_id: string;
  role: string;
  city: string | null;
  created_at: string;
}

export default function UsersRolesPage() {
  const { cityNames: CITIES } = useCities();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ user_id: "", role: "", city: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    setRoles(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.user_id || !form.role) {
      toast({ title: "Error", description: "User ID y rol son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert({
      user_id: form.user_id,
      role: form.role as any,
      city: form.city || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Rol asignado" }); setDialog(false); setForm({ user_id: "", role: "", city: "" }); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_roles").delete().eq("id", id);
    toast({ title: "Rol eliminado" });
    load();
  };

  const getRoleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label || r;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Usuarios y Roles</h1><p className="text-sm text-muted-foreground">Gestión de roles del sistema</p></div>
        <Button onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1" />Asignar rol</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>User ID</TableHead><TableHead>Rol</TableHead><TableHead>Ciudad</TableHead><TableHead>Asignado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}...</TableCell>
                    <TableCell><Badge>{getRoleLabel(r.role)}</Badge></TableCell>
                    <TableCell>{r.city ? <Badge variant="outline">{r.city}</Badge> : "—"}</TableCell>
                    <TableCell className="text-sm">{r.created_at.split("T")[0]}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar rol</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>User ID *</Label><Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="UUID del usuario" /></div>
            <div className="space-y-2"><Label>Rol *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Ciudad (para revisor)</Label>
              <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Asignar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
