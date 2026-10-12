import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api";
import { PlusCircle, Layers, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export interface ProductoOption {
  id: number;
  nombre: string;
  modelo?: string | null;
  modeloCodigo?: string | null;
  tamanoPulgadas?: number | null;
  pulgadas?: number | null;
}

interface AddSerialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productos: ProductoOption[];
  onSuccess: () => void;
}

export default function AddSerialDialog({
  open,
  onOpenChange,
  productos,
  onSuccess,
}: AddSerialDialogProps) {
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [submitting, setSubmitting] = useState(false);

  // Single Serial Form State
  const [singleNumeroSerie, setSingleNumeroSerie] = useState("");
  const [singleProductoId, setSingleProductoId] = useState<string>("none");
  const [singleContainer, setSingleContainer] = useState("");
  const [singleSeal, setSingleSeal] = useState("");
  const [singleHojaRegistro, setSingleHojaRegistro] = useState("");
  const [singleInvoice, setSingleInvoice] = useState("");
  const [singleDateInvoice, setSingleDateInvoice] = useState("");

  // Bulk Serials Form State
  const [bulkSerialsRaw, setBulkSerialsRaw] = useState("");
  const [bulkProductoId, setBulkProductoId] = useState<string>("none");
  const [bulkContainer, setBulkContainer] = useState("");
  const [bulkSeal, setBulkSeal] = useState("");
  const [bulkHojaRegistro, setBulkHojaRegistro] = useState("");
  const [bulkInvoice, setBulkInvoice] = useState("");
  const [bulkDateInvoice, setBulkDateInvoice] = useState("");

  // Parse bulk serials in real-time
  const parsedBulkSerials = useMemo(() => {
    if (!bulkSerialsRaw.trim()) return [];
    // Split by newlines, commas, semicolons or spaces
    const tokens = bulkSerialsRaw
      .split(/[\r\n,;\t]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    // Remove duplicates within the text input
    return Array.from(new Set(tokens));
  }, [bulkSerialsRaw]);

  const resetForm = () => {
    setSingleNumeroSerie("");
    setSingleProductoId("none");
    setSingleContainer("");
    setSingleSeal("");
    setSingleHojaRegistro("");
    setSingleInvoice("");
    setSingleDateInvoice("");

    setBulkSerialsRaw("");
    setBulkProductoId("none");
    setBulkContainer("");
    setBulkSeal("");
    setBulkHojaRegistro("");
    setBulkInvoice("");
    setBulkDateInvoice("");
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSerial = singleNumeroSerie.trim().toUpperCase();
    if (!cleanSerial) {
      toast({ title: "El número de serie es obligatorio", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const selectedProd = productos.find((p) => String(p.id) === singleProductoId);
      const payload: Record<string, unknown> = {
        numeroSerie: cleanSerial,
        container: singleContainer.trim() || null,
        seal: singleSeal.trim() || null,
        hojaRegistro: singleHojaRegistro.trim() || null,
        invoice: singleInvoice.trim() || null,
        dateInvoice: singleDateInvoice ? `${singleDateInvoice}T00:00:00` : null,
        estado: "DISPONIBLE",
        bloqueado: false,
      };

      if (selectedProd) {
        payload.productoId = selectedProd.id;
        payload.modelo = selectedProd.modelo || selectedProd.modeloCodigo || null;
        payload.productoNombre = selectedProd.nombre;
      }

      await apiPost("/serials", payload);

      toast({
        title: "✓ Serial agregado exitosamente",
        description: `Serial: ${cleanSerial}`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Error al registrar serial",
        description: err instanceof Error ? err.message : "Error inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBulkSerials.length === 0) {
      toast({ title: "No se detectaron números de serie válidos en el cuadro de texto", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const selectedProd = productos.find((p) => String(p.id) === bulkProductoId);

      const toInsert = parsedBulkSerials.map((ns) => ({
        numeroSerie: ns,
        productoId: selectedProd ? selectedProd.id : null,
        modelo: selectedProd ? (selectedProd.modelo || selectedProd.modeloCodigo || null) : null,
        productoNombre: selectedProd ? selectedProd.nombre : null,
        container: bulkContainer.trim() || null,
        seal: bulkSeal.trim() || null,
        hojaRegistro: bulkHojaRegistro.trim() || null,
        invoice: bulkInvoice.trim() || null,
        dateInvoice: bulkDateInvoice ? `${bulkDateInvoice}T00:00:00` : null,
        estado: "DISPONIBLE",
        bloqueado: false,
      }));

      // Send in batches of 500
      let totalGuardados = 0;
      let totalOmitidos = 0;

      for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500);
        const res = await apiPost<{ guardados: number; omitidos: number }>("/serials/bulk", chunk);
        if (res) {
          totalGuardados += res.guardados || 0;
          totalOmitidos += res.omitidos || 0;
        }
      }

      toast({
        title: "✓ Registro masivo completado",
        description: `${totalGuardados} serial(es) guardados con éxito. ${totalOmitidos > 0 ? `(${totalOmitidos} ya existían y fueron omitidos)` : ""}`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Error al registrar seriales masivos",
        description: err instanceof Error ? err.message : "Error inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl glass-card border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-display text-white flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Agregar Seriales al Sistema
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Registra números de serie individuales o pega un listado masivo en lote.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "single" | "bulk")} className="w-full pt-1">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/10">
            <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Registro Individual
            </TabsTrigger>
            <TabsTrigger value="bulk" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
              <Layers className="h-3.5 w-3.5 mr-1.5" /> Múltiples Seriales (Textbox)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: INDIVIDUAL */}
          <TabsContent value="single" className="space-y-4 pt-3">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Número de Serie *</Label>
                <Input
                  value={singleNumeroSerie}
                  onChange={(e) => setSingleNumeroSerie(e.target.value.toUpperCase())}
                  placeholder="Ej: 65X6600H-240101928"
                  className="bg-black/20 border-white/10 text-white font-mono uppercase focus:border-primary font-bold"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Producto / Modelo Asociado</Label>
                <Select value={singleProductoId} onValueChange={setSingleProductoId}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white max-h-60">
                    <SelectItem value="none">-- Sin producto asignado --</SelectItem>
                    {productos.map((p) => {
                      const inches = p.tamanoPulgadas ?? p.pulgadas;
                      const model = p.modelo ?? p.modeloCodigo;
                      return (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre} {inches ? `(${inches}")` : ""} {model ? `— ${model}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Logistics Grid */}
              <div className="p-3 rounded-lg border border-white/5 bg-black/20 space-y-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Datos Logísticos (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Contenedor (Container)</Label>
                    <Input
                      value={singleContainer}
                      onChange={(e) => setSingleContainer(e.target.value)}
                      placeholder="Ej: MSCU1234567"
                      className="bg-black/20 border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Precinto (Seal)</Label>
                    <Input
                      value={singleSeal}
                      onChange={(e) => setSingleSeal(e.target.value)}
                      placeholder="Ej: SL-98765"
                      className="bg-black/20 border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Hoja de Registro</Label>
                    <Input
                      value={singleHojaRegistro}
                      onChange={(e) => setSingleHojaRegistro(e.target.value)}
                      placeholder="Ej: HR-2026-01"
                      className="bg-black/20 border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Factura / Invoice</Label>
                    <Input
                      value={singleInvoice}
                      onChange={(e) => setSingleInvoice(e.target.value)}
                      placeholder="Ej: INV-99012"
                      className="bg-black/20 border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] text-slate-400">Fecha Factura</Label>
                    <Input
                      type="date"
                      value={singleDateInvoice}
                      onChange={(e) => setSingleDateInvoice(e.target.value)}
                      className="bg-black/20 border-white/10 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  disabled={submitting || !singleNumeroSerie.trim()}
                  className="bg-primary hover:bg-primary/95 text-white font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Guardar Serial
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 2: BULK MULTI-SERIALS (TEXTBOX) */}
          <TabsContent value="bulk" className="space-y-4 pt-3">
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Producto / Modelo para todo el Lote</Label>
                <Select value={bulkProductoId} onValueChange={setBulkProductoId}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar producto para este lote..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white max-h-60">
                    <SelectItem value="none">-- Sin producto asignado --</SelectItem>
                    {productos.map((p) => {
                      const inches = p.tamanoPulgadas ?? p.pulgadas;
                      const model = p.modelo ?? p.modeloCodigo;
                      return (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre} {inches ? `(${inches}")` : ""} {model ? `— ${model}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Pega aquí la lista de Seriales *</Label>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      parsedBulkSerials.length > 0
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-white/5 text-slate-400 border-white/10"
                    }`}
                  >
                    {parsedBulkSerials.length} serial(es) detectados
                  </Badge>
                </div>
                <Textarea
                  value={bulkSerialsRaw}
                  onChange={(e) => setBulkSerialsRaw(e.target.value)}
                  placeholder={"65X6600H-240101928\n65X6600H-240101929\n65X6600H-240101930\n..."}
                  rows={6}
                  className="bg-black/20 border-white/10 text-white font-mono text-xs uppercase focus:border-primary"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  * Puedes pegar seriales separados por saltos de línea (Enter), comas o espacios. Los duplicados se filtran automáticamente.
                </p>
              </div>

              {/* Optional Common Logistics */}
              <div className="p-3 rounded-lg border border-white/5 bg-black/20 space-y-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Datos Logísticos Comunes (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Contenedor Común</Label>
                    <Input
                      value={bulkContainer}
                      onChange={(e) => setBulkContainer(e.target.value)}
                      placeholder="Ej: MSCU1234567"
                      className="bg-black/20 border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Factura Común</Label>
                    <Input
                      value={bulkInvoice}
                      onChange={(e) => setBulkInvoice(e.target.value)}
                      placeholder="Ej: INV-2026-001"
                      className="bg-black/20 border-white/10 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  disabled={submitting || parsedBulkSerials.length === 0}
                  className="bg-primary hover:bg-primary/95 text-white font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Guardando {parsedBulkSerials.length} seriales...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Guardar {parsedBulkSerials.length} Seriales
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
