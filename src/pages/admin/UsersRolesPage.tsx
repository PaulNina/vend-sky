import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, KeyRound, UserX, Search, ShieldAlert, Copy, Ban } from "lucide-react";
import { useCities } from "@/hooks/useCities";

const ROLES: { value: string; label: string }[] = [
  { value: "vendedor", label: "Vendedor" },
  { value: "revisor_ciudad", label: "Revisor de Ciudad" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Administrador" },
];

interface UserRoleRow {
  id: string;
  user_id: string;
  role: string;
  city: string | null;
  created_at: string;
  email?: string;
  full_name?: string;
  is_disabled?: boolean;
}

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  is_disabled: boolean;
}

export default function UsersRolesPage() {
  const { cityNames: CITIES } = useCities();
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Assign role dialog
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({ email: "", role: "", city: "" });
  const [saving, setSaving] = useState(false);

  // Reset password dialog
  const [resetDialog, setResetDialog] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ user_id: string; email: string } | null>(null);
  const [resetMode, setResetMode] = useState<"send_link" | "set_temp_password">("send_link");
  const [resetLoading, setResetLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  // Delete/disable dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ user_id: string; email: string } | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hasHistory, setHasHistory] = useState<boolean | null>(null);

  // Remove role confirm
  const [removeRoleDialog, setRemoveRoleDialog] = useState(false);
  const [removeRoleTarget, setRemoveRoleTarget] = useState<UserRoleRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [rolesRes, profilesRes, vendorsRes] = await Promise.all([
      supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_profiles").select("*") as any,
      supabase.from("vendors").select("user_id, email, full_name, is_active"),
    ]);
    setRoles(rolesRes.data || []);
    // Merge profiles with vendor fallback
    const profilesList: UserProfile[] = profilesRes.data || [];
    const profileUserIds = new Set(profilesList.map((p: UserProfile) => p.user_id));
    const vendorFallbacks: UserProfile[] = (vendorsRes.data || [])
      .filter((v: any) => !profileUserIds.has(v.user_id) && v.email)
      .map((v: any) => ({
        user_id: v.user_id,
        email: v.email,
        full_name: v.full_name || null,
        is_disabled: !v.is_active,
      }));
    setProfiles([...profilesList, ...vendorFallbacks]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Merge profiles into roles
  const enrichedRoles = useMemo(() => {
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    return roles.map(r => ({
      ...r,
      email: profileMap.get(r.user_id)?.email || "",
      full_name: profileMap.get(r.user_id)?.full_name || "",
      is_disabled: profileMap.get(r.user_id)?.is_disabled || false,
    }));
  }, [roles, profiles]);

  // Filter
  const filtered = useMemo(() => {
    return enrichedRoles.filter(r => {
      const matchSearch = !search ||
        (r.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.full_name || "").toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || r.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [enrichedRoles, search, roleFilter]);

  const getRoleLabel = (r: string) => ROLES.find(x => x.value === r)?.label || r;

  // Assign role
  const handleAssign = async () => {
    if (!assignForm.email || !assignForm.role) {
      toast({ title: "Error", description: "Email y rol son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Find user_id by email from profiles
    const profile = profiles.find(p => p.email.toLowerCase() === assignForm.email.toLowerCase());
    if (!profile) {
      toast({ title: "Error", description: "No se encontró un usuario con ese email. El usuario debe haberse registrado primero.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("user_roles").insert({
      user_id: profile.user_id,
      role: assignForm.role as any,
      city: assignForm.city || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rol asignado correctamente" });
      setAssignDialog(false);
      setAssignForm({ email: "", role: "", city: "" });
      load();
    }
    setSaving(false);
  };

  // Remove role
  const handleRemoveRole = async () => {
    if (!removeRoleTarget) return;
    await supabase.from("user_roles").delete().eq("id", removeRoleTarget.id);

    // Audit
    await supabase.from("admin_audit_logs").insert({
      admin_user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "remove_role",
      target_user_id: removeRoleTarget.user_id,
      details: { role: removeRoleTarget.role, city: removeRoleTarget.city },
    } as any);

    toast({ title: "Rol eliminado" });
    setRemoveRoleDialog(false);
    setRemoveRoleTarget(null);
    load();
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    setTempPassword("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-reset-password", {
        body: { target_user_id: resetTarget.user_id, mode: resetMode },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;

      if (!result.success) throw new Error(result.error);

      if (resetMode === "set_temp_password" && result.temp_password) {
        setTempPassword(result.temp_password);
        toast({ title: "Contraseña temporal generada" });
      } else {
        toast({ title: "Éxito", description: result.message || "Link de recuperación generado" });
        setResetDialog(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setResetLoading(false);
  };

  // Delete/disable user
  const openDeleteDialog = async (user_id: string, email: string) => {
    setDeleteTarget({ user_id, email });
    setDeleteConfirmEmail("");
    setHasHistory(null);
    setDeleteDialog(true);

    // Check history
    try {
      const res = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: user_id, mode: "check" },
      });
      setHasHistory(res.data?.has_history || false);
    } catch {
      setHasHistory(true); // assume history if check fails
    }
  };

  const handleDeleteUser = async (mode: "soft" | "hard") => {
    if (!deleteTarget) return;
    if (mode === "hard" && deleteConfirmEmail.toLowerCase() !== deleteTarget.email.toLowerCase()) {
      toast({ title: "Error", description: "El email de confirmación no coincide.", variant: "destructive" });
      return;
    }
    setDeleteLoading(true);

    try {
      const res = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: deleteTarget.user_id, mode },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (!result.success) throw new Error(result.error);

      toast({
        title: mode === "soft" ? "Usuario deshabilitado" : "Usuario eliminado",
        description: mode === "soft"
          ? "El usuario ha sido deshabilitado y no podrá iniciar sesión."
          : "El usuario ha sido eliminado permanentemente.",
      });
      setDeleteDialog(false);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios y Roles</h1>
          <p className="text-sm text-muted-foreground">Gestión de roles, contraseñas y acceso del sistema</p>
        </div>
        <Button onClick={() => setAssignDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />Asignar rol
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {ROLES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No se encontraron registros</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.email || <span className="text-muted-foreground italic">{r.user_id.slice(0, 8)}...</span>}
                    </TableCell>
                    <TableCell>{r.full_name || "—"}</TableCell>
                    <TableCell><Badge>{getRoleLabel(r.role)}</Badge></TableCell>
                    <TableCell>{r.city ? <Badge variant="outline">{r.city}</Badge> : "—"}</TableCell>
                    <TableCell>
                      {r.is_disabled ? (
                        <Badge variant="destructive">Deshabilitado</Badge>
                      ) : (
                        <Badge variant="secondary">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.created_at.split("T")[0]}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset contraseña"
                          onClick={() => { setResetTarget({ user_id: r.user_id, email: r.email || "" }); setResetDialog(true); setTempPassword(""); setResetMode("send_link"); }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Quitar rol"
                          onClick={() => { setRemoveRoleTarget(r); setRemoveRoleDialog(true); }}
                        >
                          <Trash2 className="h-4 w-4 text-warning" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar / deshabilitar usuario"
                          onClick={() => openDeleteDialog(r.user_id, r.email || "")}
                        >
                          <UserX className="h-4 w-4 text-destructive" />
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

      {/* Assign Role Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rol</DialogTitle>
            <DialogDescription>El usuario debe estar registrado previamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email del usuario *</Label>
              <Input
                value={assignForm.email}
                onChange={e => setAssignForm({ ...assignForm, email: e.target.value })}
                placeholder="usuario@email.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={assignForm.role} onValueChange={v => setAssignForm({ ...assignForm, role: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ciudad (para revisor)</Label>
              <Select value={assignForm.city} onValueChange={v => setAssignForm({ ...assignForm, city: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirm */}
      <AlertDialog open={removeRoleDialog} onOpenChange={setRemoveRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el rol <strong>{removeRoleTarget && getRoleLabel(removeRoleTarget.role)}</strong> del usuario{" "}
              <strong>{removeRoleTarget?.email || removeRoleTarget?.user_id.slice(0, 8)}</strong>.
              Esta acción no elimina la cuenta del usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveRole}>Quitar rol</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog} onOpenChange={v => { setResetDialog(v); if (!v) setTempPassword(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear contraseña</DialogTitle>
            <DialogDescription>
              Usuario: <strong>{resetTarget?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Contraseña temporal generada:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded border text-sm font-mono">{tempPassword}</code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { navigator.clipboard.writeText(tempPassword); toast({ title: "Copiado" }); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Comparte esta contraseña de forma segura con el usuario.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setResetDialog(false); setTempPassword(""); }}>Cerrar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition">
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === "send_link"}
                    onChange={() => setResetMode("send_link")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">Enviar enlace de restablecimiento</p>
                    <p className="text-xs text-muted-foreground">Se genera un link de recuperación (recomendado).</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition">
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === "set_temp_password"}
                    onChange={() => setResetMode("set_temp_password")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">Asignar contraseña temporal</p>
                    <p className="text-xs text-muted-foreground">Se generará una contraseña temporal automática.</p>
                  </div>
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetDialog(false)}>Cancelar</Button>
                <Button onClick={handleResetPassword} disabled={resetLoading}>
                  {resetLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Ejecutar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete / Disable User Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Eliminar / Deshabilitar usuario
            </DialogTitle>
            <DialogDescription>
              Usuario: <strong>{deleteTarget?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          {hasHistory === null ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {hasHistory && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm">
                  <p className="font-medium text-destructive">⚠️ Este usuario tiene historial en el sistema</p>
                  <p className="text-muted-foreground mt-1">
                    Tiene ventas, revisiones o auditorías registradas. Solo se puede <strong>deshabilitar</strong> (se corta el acceso pero se conserva el historial).
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleDeleteUser("soft")}
                  disabled={deleteLoading}
                >
                  <Ban className="h-4 w-4" />
                  Deshabilitar usuario (soft delete)
                  <span className="text-xs text-muted-foreground ml-auto">Recomendado</span>
                </Button>

                {!hasHistory && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium text-destructive">Eliminación permanente</p>
                    <p className="text-xs text-muted-foreground">
                      Escribe el email del usuario para confirmar: <strong>{deleteTarget?.email}</strong>
                    </p>
                    <Input
                      value={deleteConfirmEmail}
                      onChange={e => setDeleteConfirmEmail(e.target.value)}
                      placeholder="Confirmar email"
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleDeleteUser("hard")}
                      disabled={deleteLoading || deleteConfirmEmail.toLowerCase() !== (deleteTarget?.email || "").toLowerCase()}
                    >
                      {deleteLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Eliminar permanentemente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
