import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useCities } from "@/hooks/useCities";
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Loader2,
  Check,
  X,
  PlusCircle
} from "lucide-react";

export interface ClienteAdminItem {
  id: number;
  nombre: string;
  ciudad?: string;
  activo: boolean;
  createdAt?: string;
}

interface ManageClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientsChanged: () => void;
}

export default function ManageClientsDialog({
  open,
  onOpenChange,
  onClientsChanged,
}: ManageClientsDialogProps) {
  const { cityNames: CITIES } = useCities();

  const [clients, setClients] = useState<ClienteAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit / Create State
  const [editingClient, setEditingClient] = useState<ClienteAdminItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formCiudad, setFormCiudad] = useState("");
  const [formActivo, setFormActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await apiGet<ClienteAdminItem[]>("/admin/equipos-danados/clientes/todos");
      setClients(data || []);
    } catch (e) {
      console.error("Error cargando clientes para administración", e);
      toast({ title: "Error al cargar clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingClient(null);
    setFormNombre("");
    setFormCiudad("");
    setFormActivo(true);
    setIsCreating(true);
  };

  const handleStartEdit = (client: ClienteAdminItem) => {
    setIsCreating(false);
    setEditingClient(client);
    setFormNombre(client.nombre);
    setFormCiudad(client.ciudad || "");
    setFormActivo(client.activo);
  };

  const handleCancelForm = () => {
    setEditingClient(null);
    setIsCreating(false);
    setFormNombre("");
    setFormCiudad("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      toast({ title: "El nombre del cliente es obligatorio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const cleanNombre = formNombre.trim().toUpperCase();
      const cleanCiudad = formCiudad.trim() || undefined;

      if (isCreating) {
        await apiPost<ClienteAdminItem>("/admin/equipos-danados/clientes", {
          nombre: cleanNombre,
          ciudad: cleanCiudad,
        });
        toast({ title: "✓ Cliente registrado con éxito" });
      } else if (editingClient) {
        await apiPut<ClienteAdminItem>(`/admin/equipos-danados/clientes/${editingClient.id}`, {
          nombre: cleanNombre,
          ciudad: cleanCiudad,
          activo: formActivo,
        });
        toast({ title: "✓ Cliente actualizado con éxito" });
      }

      handleCancelForm();
      await loadClients();
      onClientsChanged();
    } catch (err: unknown) {
      toast({
        title: "Error al guardar cliente",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (client: ClienteAdminItem) => {
    try {
      await apiPut(`/admin/equipos-danados/clientes/${client.id}`, {
        activo: !client.activo,
      });
      toast({
        title: client.activo ? "Cliente deshabilitado" : "Cliente habilitado",
      });
      await loadClients();
      onClientsChanged();
    } catch (e) {
      toast({ title: "Error al cambiar estado del cliente", variant: "destructive" });
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toUpperCase().trim();
    if (!q) return true;
    return c.nombre.toUpperCase().includes(q) || (c.ciudad && c.ciudad.toUpperCase().includes(q));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl glass-card border-white/10 text-white max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-display text-white flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                Administración de Clientes
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Consulta, registra y actualiza los clientes para la búsqueda en Equipos Dañados.
              </DialogDescription>
            </div>

            <Button
              type="button"
              onClick={handleStartCreate}
              className="bg-primary hover:bg-primary/95 text-white text-xs h-9 shadow"
            >
              <Plus className="h-4 w-4 mr-1" /> Nuevo Cliente
            </Button>
          </div>
        </DialogHeader>

        {/* Formulario de Creación / Edición */}
        {(isCreating || editingClient) && (
          <form onSubmit={handleSave} className="bg-black/40 border border-primary/30 rounded-xl p-4 my-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                {isCreating ? <PlusCircle className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {isCreating ? "Registrar Nuevo Cliente" : `Editando: ${editingClient?.nombre}`}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelForm}
                className="h-6 text-xs text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-slate-300">Nombre / Razón Social *</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value.toUpperCase())}
                  placeholder="EJ: COMERCIAL SUR S.R.L."
                  className="bg-black/30 border-white/10 text-white uppercase focus:border-primary text-xs font-semibold"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Ciudad (opcional)</Label>
                <Select value={formCiudad} onValueChange={setFormCiudad}>
                  <SelectTrigger className="bg-black/30 border-white/10 text-white text-xs">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="rounded border-white/20 text-primary focus:ring-primary h-4 w-4 bg-black/40"
                  />
                  <span>Cliente Activo (disponible en búsquedas)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelForm}
                  className="border-white/10 text-xs text-slate-300 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !formNombre.trim()}
                  className="bg-primary hover:bg-primary/95 text-white text-xs font-bold"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  {isCreating ? "Guardar Cliente" : "Actualizar Datos"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Search Filter and Stats */}
        <div className="flex items-center justify-between gap-3 my-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el catálogo de clientes..."
              className="bg-black/20 border-white/10 text-white pl-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Total: <strong className="text-white">{filteredClients.length}</strong> de <strong className="text-white">{clients.length}</strong> clientes
          </div>
        </div>

        {/* Table of Clients */}
        <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-black/20 my-2">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5 sticky top-0 z-10">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs text-slate-300">Nombre / Razón Social</TableHead>
                  <TableHead className="text-xs text-slate-300">Ciudad</TableHead>
                  <TableHead className="text-xs text-slate-300 text-center">Estado</TableHead>
                  <TableHead className="text-xs text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/5">
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-white/5 border-white/5 text-xs">
                    <TableCell className="font-bold text-white uppercase py-2.5">
                      {client.nombre}
                    </TableCell>
                    <TableCell className="text-slate-300 py-2.5">
                      {client.ciudad ? (
                        <Badge variant="outline" className="border-white/10 bg-black/40 text-[10px] text-slate-300">
                          {client.ciudad}
                        </Badge>
                      ) : (
                        <span className="text-slate-500 italic">No asignada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-2.5">
                      {client.activo ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5 opacity-70">
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(client)}
                          className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/10"
                          title="Editar cliente"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(client)}
                          className={`h-7 w-7 ${
                            client.activo
                              ? "text-slate-400 hover:text-destructive hover:bg-destructive/10"
                              : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          }`}
                          title={client.activo ? "Deshabilitar cliente" : "Habilitar cliente"}
                        >
                          {client.activo ? <Trash2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                      No se encontraron clientes registrados con el criterio de búsqueda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 text-xs text-white hover:bg-white/5"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
