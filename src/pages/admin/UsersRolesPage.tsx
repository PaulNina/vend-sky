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
import { Loader2, Plus, Trash2, Pencil, Shield, Store, Building2 } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { cn } from "@/lib/utils";

const ROLES: { value: string; label: string; description: string; badgeColor: string }[] = [
  { value: "ADMIN", label: "Administrador", description: "Acceso total, configuración del sistema, gestión de usuarios y operaciones", badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  { value: "SUPERVISOR", label: "Supervisor Regional", description: "Supervisión y aprobación de ventas, tiendas y auditoría regional", badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "REVISOR", label: "Revisor de Ventas", description: "Revisión y validación de expedientes de ventas", badgeColor: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  { value: "ENCARGADO_TIENDA", label: "Encargado de Tienda", description: "Monitoreo y consulta de ventas en su tienda asignada", badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "VISOR", label: "Visor / Auditor (Solo Lectura)", description: "Acceso de solo lectura a métricas y reportes ejecutivos", badgeColor: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  { value: "OPERADOR_BANDEO", label: "Operador de Bandeo", description: "Ruleta, tómbola y registro de cliente final", badgeColor: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  { value: "TECNICO", label: "Técnico (Equipos Dañados)", description: "Diagnóstico y registro de equipos con fallas", badgeColor: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { value: "VENDOR", label: "Vendedor de Tienda", description: "Registro y control de ventas personales", badgeColor: "bg-lime-500/15 text-lime-300 border-lime-500/30" },
];

interface Tienda {
  id: number;
  nombre: string;
  ciudadNombre?: string;
  codigo?: string;
}

interface UserRole {
  id: number;
  email: string;
  nombreCompleto?: string;
  rol: string;
  ciudad?: string | null;
  departamento?: string | null;
  tiendaId?: number | null;
  createdAt?: string;
}

export default function UsersRolesPage() {
  const { cities } = useCities();
  const [assignments, setAssignments] = useState<UserRole[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<{
    email: string;
    nombreCompleto?: string;
    password?: string;
    rol: string;
    cities: string[];
    tiendaId?: string;
  }>({ email: "", nombreCompleto: "", password: "", rol: "", cities: [], tiendaId: "" });

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filters, setFilters] = useState({ search: "", role: "all" });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.role !== "all") params.append("rol", filters.role);

    try {
      const [usersData, tiendasData] = await Promise.all([
        apiGet<UserRole[]>(`/users/roles?${params.toString()}`).catch(() => []),
        apiGet<Tienda[]>("/tiendas/active").catch(() => apiGet<Tienda[]>("/tiendas").catch(() => []))
      ]);
      setAssignments(usersData || []);
      setTiendas(tiendasData || []);
    } finally {
      setLoading(false);
    }
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
        nombreCompleto: form.nombreCompleto,
        password: form.password,
        rol: form.rol, 
        ciudad: form.cities.length > 0 ? form.cities.join(",") : "",
        tiendaId: form.tiendaId && form.tiendaId !== "none" ? form.tiendaId : ""
      });
      toast({ title: isEditing ? "Usuario actualizado" : "Usuario creado / Rol asignado" });
      setDialog(false); 
      setForm({ email: "", nombreCompleto: "", password: "", rol: "", cities: [], tiendaId: "" }); 
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
    if (!window.confirm("¿Seguro de revocar el acceso a este usuario?")) return;
    await apiDelete(`/users/roles/${id}`).catch(() => {});
    toast({ title: "Rol revocado / Usuario desactivado" });
    load();
  };

  const handleEdit = (user: UserRole) => {
    setForm({
      email: user.email,
      nombreCompleto: user.nombreCompleto || "",
      password: "",
      rol: user.rol,
      cities: user.ciudad ? user.ciudad.split(",").map(c => c.trim()) : [],
      tiendaId: user.tiendaId ? String(user.tiendaId) : ""
    });
    setIsEditing(true);
    setDialog(true);
  };

  const openNewDialog = () => {
    setForm({ email: "", nombreCompleto: "", password: "", rol: "REVISOR", cities: [], tiendaId: "" });
    setIsEditing(false);
    setDialog(true);
  };

  const getRoleObj = (r: string) => {
    if (r === "ADMIN_TOTAL" || r === "ADMIN_OPERATIVO") return ROLES.find(x => x.value === "ADMIN");
    if (r === "REVIEWER") return ROLES.find(x => x.value === "REVISOR");
    return ROLES.find((x) => x.value === r);
  };
  const getRoleLabel = (r: string) => getRoleObj(r)?.label || r;

  const getCityBadgeText = (cityName: string) => {
    if (!cityName) return "";
    const c = cities.find(x => x && x.nombre && x.nombre.trim().toLowerCase() === cityName.trim().toLowerCase());
    return c && c.departamento ? `${c.departamento} > ${c.nombre}` : cityName;
  };

  const getTiendaNombre = (tiendaId?: number | null) => {
    if (!tiendaId) return null;
    const t = tiendas.find(x => x.id === tiendaId);
    return t ? t.nombre : `Tienda #${tiendaId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Usuarios y Roles Granulares
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestión de privilegios, roles operativos, supervisión y ámbito territorial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/95 text-white w-fit shadow-lg">
            <Plus className="h-4 w-4 mr-1.5" />Crear Usuario / Asignar Rol
          </Button>
        </div>
      </div>

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por email o nombre..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0"
              />
            </div>
            <div className="w-full sm:w-72">
              <Select
                value={filters.role}
                onValueChange={(v) => setFilters(prev => ({ ...prev, role: v }))}
              >
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-72">
                  <SelectItem value="all" className="focus:bg-white/5 focus:text-white">Todos los roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="focus:bg-white/5 focus:text-white">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Usuario / Email</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Rol Asignado</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ámbito (Ciudad / Tienda)</TableHead>
                  <TableHead className="w-24 text-xs text-muted-foreground text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const roleObj = getRoleObj(assignment.rol);
                  const tiendaNombre = getTiendaNombre(assignment.tiendaId);

                  return (
                    <TableRow key={assignment.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {assignment.nombreCompleto || <span className="text-slate-500 italic text-xs">Sin nombre</span>}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">{assignment.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-medium border",
                            roleObj?.badgeColor || "bg-slate-700/30 text-slate-400 border-white/10"
                          )}
                        >
                          {roleObj?.label || assignment.rol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {tiendaNombre && (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px] flex items-center w-fit gap-1">
                              <Store className="h-3 w-3" /> {tiendaNombre}
                            </Badge>
                          )}
                          {assignment.ciudad ? (
                            <div className="flex flex-wrap gap-1">
                              {assignment.ciudad.split(",").map(c => (
                                <Badge key={c.trim()} variant="outline" className="text-[10px] border-white/10 text-slate-300 bg-white/5">
                                  {getCityBadgeText(c.trim())}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            !tiendaNombre && <span className="text-xs text-slate-500">Nacional (Sin restricción)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(assignment)} className="text-slate-400 hover:text-white hover:bg-white/5" title="Editar Rol">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(assignment.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Revocar Acceso">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {assignments.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12 border-white/5">
                      Sin usuarios encontrados para el filtro seleccionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogo de Creacion / Edicion */}
      <Dialog open={dialog} onOpenChange={(open) => {
        if (!open) { setDialog(false); setIsEditing(false); }
        else setDialog(true);
      }}>
        <DialogContent className="max-w-lg glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">
              {isEditing ? "Editar Usuario y Rol" : "Crear Nuevo Usuario y Asignar Rol"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Nombre Completo *</Label>
              <Input 
                value={form.nombreCompleto || ""} 
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} 
                placeholder="Ej: Carlos Mendoza" 
                className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Email del usuario *</Label>
              <Input 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                placeholder="usuario@skyworth.com" 
                disabled={isEditing} 
                className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">
                {isEditing ? "Nueva Contraseña (dejar en blanco para mantener actual)" : "Contraseña (por defecto: skyworth123)"}
              </Label>
              <Input 
                type="password"
                value={form.password || ""} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                placeholder={isEditing ? "••••••••" : "skyworth123"} 
                className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Rol de Usuario *</Label>
              <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v })}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-72">
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="focus:bg-white/5 focus:text-white">
                      <div className="py-0.5">
                        <p className="font-medium">{r.label}</p>
                        <p className="text-[10px] text-muted-foreground">{r.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Tienda (Para ENCARGADO_TIENDA o SUPERVISOR) */}
            {(form.rol === "ENCARGADO_TIENDA" || form.rol === "SUPERVISOR") && (
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Tienda Asignada (Ámbito de Control)
                </Label>
                <Select 
                  value={form.tiendaId || "none"} 
                  onValueChange={(v) => setForm({ ...form, tiendaId: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar tienda..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white max-h-60">
                    <SelectItem value="none">Sin tienda fija (Todas)</SelectItem>
                    {tiendas.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.nombre} {t.ciudadNombre ? `(${t.ciudadNombre})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Ciudades asignadas para revisión territorial */}
            {form.rol !== "VENDOR" && form.rol !== "ADMIN_TOTAL" && form.rol !== "ADMIN" && form.rol !== "" && (
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-semibold">Ciudades asignadas para revisión / monitoreo</Label>
                <div className="grid grid-cols-2 gap-2 border border-white/5 rounded-md p-3 max-h-40 overflow-y-auto bg-black/20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {cities.map((c) => (
                    <label key={c.nombre} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer hover:bg-white/5 p-1.5 rounded transition-colors">
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
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="truncate">{c.departamento ? `${c.departamento} > ` : ""}{c.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => { setDialog(false); setIsEditing(false); }}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
