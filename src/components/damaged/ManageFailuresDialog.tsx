import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Loader2,
  Check,
  X,
  PlusCircle,
  Wrench
} from "lucide-react";

export interface FallaAdminItem {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

interface ManageFailuresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFailuresChanged: () => void;
}

export default function ManageFailuresDialog({
  open,
  onOpenChange,
  onFailuresChanged,
}: ManageFailuresDialogProps) {
  const [fallas, setFallas] = useState<FallaAdminItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Create / Edit state
  const [editingFalla, setEditingFalla] = useState<FallaAdminItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formActivo, setFormActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadFallas();
    }
  }, [open]);

  const loadFallas = async () => {
    setLoading(true);
    try {
      const data = await apiGet<FallaAdminItem[]>("/admin/equipos-danados/fallas/todas");
      setFallas(data || []);
    } catch (e) {
      console.error("Error cargando catálogo de fallas", e);
      toast({ title: "Error al cargar fallas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingFalla(null);
    setFormNombre("");
    setFormDescripcion("");
    setFormActivo(true);
    setIsCreating(true);
  };

  const handleStartEdit = (falla: FallaAdminItem) => {
    setIsCreating(false);
    setEditingFalla(falla);
    setFormNombre(falla.nombre);
    setFormDescripcion(falla.descripcion || "");
    setFormActivo(falla.activo);
  };

  const handleCancelForm = () => {
    setEditingFalla(null);
    setIsCreating(false);
    setFormNombre("");
    setFormDescripcion("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      toast({ title: "El nombre de la falla es obligatorio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const cleanNombre = formNombre.trim();
      const cleanDescripcion = formDescripcion.trim() || undefined;

      if (isCreating) {
        await apiPost<FallaAdminItem>("/admin/equipos-danados/fallas", {
          nombre: cleanNombre,
          descripcion: cleanDescripcion,
        });
        toast({ title: "✓ Tipo de falla agregado con éxito" });
      } else if (editingFalla) {
        await apiPut<FallaAdminItem>(`/admin/equipos-danados/fallas/${editingFalla.id}`, {
          nombre: cleanNombre,
          descripcion: cleanDescripcion,
          activo: formActivo,
        });
        toast({ title: "✓ Tipo de falla actualizado con éxito" });
      }

      handleCancelForm();
      await loadFallas();
      onFailuresChanged();
    } catch (err: unknown) {
      toast({
        title: "Error al guardar falla",
        description: err instanceof Error ? err.message : "Error inesperado",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (falla: FallaAdminItem) => {
    try {
      await apiPut(`/admin/equipos-danados/fallas/${falla.id}`, {
        activo: !falla.activo,
      });
      toast({
        title: falla.activo ? "Falla deshabilitada" : "Falla habilitada",
      });
      await loadFallas();
      onFailuresChanged();
    } catch (e) {
      toast({ title: "Error al cambiar estado de la falla", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl glass-card border-white/10 text-white max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-display text-white flex items-center gap-2">
                <Wrench className="h-6 w-6 text-primary" />
                Administración de Tipos de Fallas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Gestiona las fallas disponibles para el reporte de televisores y equipos defectuosos.
              </DialogDescription>
            </div>

            <Button
              type="button"
              onClick={handleStartCreate}
              className="bg-primary hover:bg-primary/95 text-white text-xs h-9 shadow"
            >
              <Plus className="h-4 w-4 mr-1" /> Nueva Falla
            </Button>
          </div>
        </DialogHeader>

        {/* Formulario de Creación / Edición */}
        {(isCreating || editingFalla) && (
          <form onSubmit={handleSave} className="bg-black/40 border border-primary/30 rounded-xl p-4 my-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                {isCreating ? <PlusCircle className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {isCreating ? "Agregar Nuevo Tipo de Falla" : `Editando: ${editingFalla?.nombre}`}
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

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Nombre / Identificador de la Falla *</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Pantalla rota / Manchas negras / Líneas verticales"
                  className="bg-black/30 border-white/10 text-white focus:border-primary text-xs font-semibold"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Descripción o Síntomas (opcional)</Label>
                <Textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Descripción detallada de la condición o síntoma técnico..."
                  rows={2}
                  className="bg-black/30 border-white/10 text-white focus:border-primary text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="rounded border-white/20 text-primary focus:ring-primary h-4 w-4 bg-black/40"
                />
                <span>Falla Activa (visible en el formulario de registro)</span>
              </label>

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
                  {isCreating ? "Guardar Falla" : "Actualizar Falla"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* List of Failures */}
        <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-black/20 my-2">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5 sticky top-0 z-10">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs text-slate-300">Tipo de Falla</TableHead>
                  <TableHead className="text-xs text-slate-300">Descripción</TableHead>
                  <TableHead className="text-xs text-slate-300 text-center">Estado</TableHead>
                  <TableHead className="text-xs text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/5">
                {fallas.map((falla) => (
                  <TableRow key={falla.id} className="hover:bg-white/5 border-white/5 text-xs">
                    <TableCell className="font-bold text-white py-2.5">
                      {falla.nombre}
                    </TableCell>
                    <TableCell className="text-slate-300 py-2.5 max-w-[260px] truncate">
                      {falla.descripcion || <span className="text-slate-500 italic">Sin descripción</span>}
                    </TableCell>
                    <TableCell className="text-center py-2.5">
                      {falla.activo ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5">
                          Habilitada
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5 opacity-70">
                          Deshabilitada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(falla)}
                          className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/10"
                          title="Editar falla"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(falla)}
                          className={`h-7 w-7 ${
                            falla.activo
                              ? "text-slate-400 hover:text-destructive hover:bg-destructive/10"
                              : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          }`}
                          title={falla.activo ? "Deshabilitar falla" : "Habilitar falla"}
                        >
                          {falla.activo ? <Trash2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {fallas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                      No hay fallas registradas en el catálogo
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
