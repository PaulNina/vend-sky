import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiPost } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useCities } from "@/hooks/useCities";
import { Loader2, PlusCircle, Building2 } from "lucide-react";

export interface CatalogoClienteItem {
  id: number;
  nombre: string;
  ciudad?: string;
}

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: (nuevoCliente: CatalogoClienteItem) => void;
  initialName?: string;
  initialCity?: string;
}

export default function AddClientDialog({
  open,
  onOpenChange,
  onClientAdded,
  initialName = "",
  initialCity = "",
}: AddClientDialogProps) {
  const { cityNames: CITIES } = useCities();
  const [nombre, setNombre] = useState(initialName);
  const [ciudad, setCiudad] = useState(initialCity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(initialName.trim().toUpperCase());
      setCiudad(initialCity || "");
    }
  }, [open, initialName, initialCity]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast({ title: "El nombre o razón social del cliente es obligatorio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const cleanNombre = nombre.trim().toUpperCase();
      const res = await apiPost<CatalogoClienteItem>(
        "/admin/equipos-danados/clientes",
        {
          nombre: cleanNombre,
          ciudad: ciudad.trim() || undefined,
        }
      );
      toast({
        title: "✓ Cliente registrado con éxito",
        description: `${res.nombre}${res.ciudad ? ` (${res.ciudad})` : ""}`,
      });
      onClientAdded(res);
      setNombre("");
      setCiudad("");
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: "Error al registrar cliente",
        description: err instanceof Error ? err.message : "Error inesperado al guardar cliente",
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
          <DialogTitle className="flex items-center gap-2 font-display text-white text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Agregar Nuevo Cliente
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            El cliente se guardará en el catálogo de búsqueda para registros de equipos dañados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Nombre Completo o Razón Social *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              placeholder="EJ: COMERCIAL CENTRAL S.R.L."
              className="bg-black/20 border-white/10 text-white uppercase focus:border-primary font-semibold"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Ciudad (opcional)</Label>
            <Select value={ciudad} onValueChange={setCiudad}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white">
                <SelectValue placeholder="Seleccionar ciudad predeterminada..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c} className="focus:bg-white/5 focus:text-white">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button
              type="submit"
              disabled={saving || !nombre.trim()}
              className="bg-primary hover:bg-primary/95 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-1.5" />
              )}
              Guardar Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
