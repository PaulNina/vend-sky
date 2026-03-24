import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useCities } from "@/hooks/useCities";

const ROLES: { value: string; label: string }[] = [
  { value: "VENDOR", label: "Vendedor" },
  { value: "REVIEWER", label: "Revisor de Ciudad" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ADMIN", label: "Administrador" },
];

interface UserRole {
  id: number;
  email: string;
  rol: string;
  ciudad?: string | null;
  departamento?: string | null;
  createdAt?: string;
}

export default function UsersRolesPage() {
  const { cities } = useCities();
  const [assignments, setAssignments] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<{email: string, rol: string, cities: string[]}>({ email: "", rol: "", cities: [] });
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filters, setFilters] = useState({ search: "", role: "all" });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.role !== "all") params.append("rol", filters.role);

    const data = await apiGet<UserRole[]>(`/users/roles?${params.toString()}`).catch(() => []);
    setAssignments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters]);

  const save = async () => {
    if (!form.email || !form.rol) {
      toast({ title: "Error", description: "Email y rol son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiPost("/users/roles", { 
        email: form.email, 
        rol: form.rol, 
        ciudad: form.cities.length > 0 ? form.cities.join(",") : "" 
      });
      toast({ title: isEditing ? "Rol actualizado" : "Rol asignado" });
      setDialog(false); 
      setForm({ email: "", rol: "", cities: [] }); 
      setIsEditing(false);
      load();
    } catch (e: unknown) {
      toast({ 
        title: "Error", 
        description: e instanceof Error ? e.message : "Error inesperado", 
        variant: "destructive" 
      });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    await apiDelete(`/users/roles/${id}`).catch(() => {});
    toast({ title: "Rol eliminado" });
    load();
  };

  const handleEdit = (user: UserRole) => {
    setForm({
      email: user.email,
      rol: user.rol,
      cities: user.ciudad ? user.ciudad.split(",").map(c => c.trim()) : []
    });
    setIsEditing(true);
    setDialog(true);
  };

  const openNewDialog = () => {
    setForm({ email: "", rol: "", cities: [] });
    setIsEditing(false);
    setDialog(true);
  };

  const getRoleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label || r;

  const getCityBadgeText = (cityName: string) => {
    const c = cities.find(x => x.nombre.trim().toLowerCase() === cityName.trim().toLowerCase());
    return c && c.departamento ? `${c.departamento} > ${c.nombre}` : cityName;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Usuarios y Roles</h1><p className="text-sm text-muted-foreground">Gestión de roles del sistema</p></div>
        <Button onClick={openNewDialog}><Plus className="h-4 w-4 mr-1" />Asignar rol</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={filters.role}
                onValueChange={(v) => setFilters(prev => ({ ...prev, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="VENDEDOR">Vendedor</SelectItem>
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
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Ubicación</TableHead><TableHead>Asignado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                    <TableCell className="text-sm">{assignment.email}</TableCell>
                    <TableCell><Badge>{getRoleLabel(assignment.rol)}</Badge></TableCell>
                    <TableCell>
                      {assignment.ciudad ? (
                        <div className="flex flex-wrap gap-1">
                          {assignment.ciudad.split(",").map(c => <Badge key={c.trim()} variant="outline" className="text-[10px]">{getCityBadgeText(c.trim())}</Badge>)}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{assignment.createdAt?.split("T")[0] || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(assignment)}>
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(assignment.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={(open) => {
        if (!open) { setDialog(false); setIsEditing(false); }
        else setDialog(true);
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEditing ? "Editar Rol de Usuario" : "Asignar rol"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email del usuario *</Label>
              <Input 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                placeholder="usuario@ejemplo.com" 
                disabled={isEditing} 
              />
            </div>
            <div className="space-y-2"><Label>Rol *</Label>
              <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.rol !== "VENDOR" && form.rol !== "ADMIN" && form.rol !== "" && (
              <div className="space-y-2"><Label>Ciudades asignadas</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/20">
                  {cities.map((c) => (
                    <label key={c.nombre} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded-md transition-colors">
                      <Checkbox
                        checked={form.cities.includes(c.nombre)}
                        onCheckedChange={(checked) => {
                          setForm(prev => ({
                            ...prev,
                            cities: checked
                              ? [...prev.cities, c.nombre]
                              : prev.cities.filter(city => city !== c.nombre)
                          }));
                        }}
                      />
                      <span>{c.departamento ? `${c.departamento} > ` : ""}{c.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(false); setIsEditing(false); }}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
