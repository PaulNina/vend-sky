import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";

interface AddFailureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFailureAdded: (nuevaFalla: { id: number; nombre: string; descripcion?: string }) => void;
}

export default function AddFailureDialog({
  open,
  onOpenChange,
  onFailureAdded,
}: AddFailureDialogProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast({ title: "El nombre de la falla es obligatorio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await apiPost<{ id: number; nombre: string; descripcion?: string }>(
        "/admin/equipos-danados/fallas",
        {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
        }
      );
      toast({ title: "✓ Falla agregada al catálogo", description: res.nombre });
      onFailureAdded(res);
      setNombre("");
      setDescripcion("");
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: "Error al agregar falla",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-white">
            <PlusCircle className="h-5 w-5 text-primary" />
            Agregar Otra Falla al Catálogo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Nombre / Tipo de Falla *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Falla de retroiluminación LED / Blacklight"
              className="bg-black/20 border-white/10 text-white focus:border-primary"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Descripción / Detalles (opcional)</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve descripción o síntomas característicos..."
              rows={3}
              className="bg-black/20 border-white/10 text-white focus:border-primary"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !nombre.trim()} className="bg-primary hover:bg-primary/95 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-1.5" />}
              Guardar Falla
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
