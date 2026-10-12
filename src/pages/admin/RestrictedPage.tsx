import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, Trash2, ShieldAlert } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import * as XLSX from "xlsx";

interface Restricted {
  id: number;
  serial: string;
  motivo: string;
  campanaNombre?: string | null;
  importadoEn: string;
}

export default function RestrictedPage() {
  const [items, setItems] = useState<Restricted[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await apiGet<Restricted[]>(`/restricted-serials${search ? `?search=${encodeURIComponent(search)}` : ""}`).catch(() => []);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const toInsert = rows.map((r) => ({
        serial: String(r.serial ?? r.Serial ?? r.SERIAL ?? "").trim(),
        motivo: String(r.reason ?? r.Reason ?? r.motivo ?? "Participó en otra promoción"),
        campanaNombre: (r.source_campaign ?? r["campaña"] ?? r.campana ?? null) as string | null,
      })).filter((r) => r.serial);

      if (toInsert.length === 0) {
        toast({ title: "Error", description: "Sin datos válidos en el archivo.", variant: "destructive" });
        return;
      }

      for (let i = 0; i < toInsert.length; i += 500) {
        await apiPost("/restricted-serials/bulk", toInsert.slice(i, i + 500));
      }
      toast({ title: "Importación exitosa", description: `${toInsert.length} seriales restringidos importados.` });
      load();
    } catch (err: unknown) {
      toast({ title: "Error en importación", description: (err as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleExport = () => {
    exportToExcel(items.map((i) => ({
      Serial: i.serial,
      Motivo: i.motivo,
      Campaña: i.campanaNombre || "",
      Fecha: i.importadoEn?.split("T")[0]
    })), "restringidos");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este serial de la lista de restringidos?")) return;
    await apiDelete(`/restricted-serials/${id}`).catch(() => {});
    toast({ title: "Serial eliminado de la lista de restricciones" });
    load();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Seriales Restringidos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Base de datos de seriales restringidos que participaron en otras promociones</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} className="border-white/10 hover:bg-white/5 text-white flex-1 sm:flex-initial">
            <Download className="h-4 w-4 mr-1.5" /> Exportar Excel
          </Button>
          <label className="flex-1 sm:flex-initial">
            <Button asChild disabled={importing} className="bg-primary hover:bg-primary/95 text-white w-full cursor-pointer">
              <span>
                <Upload className="h-4 w-4 mr-1.5" />
                {importing ? "Importando..." : "Importar Excel"}
              </span>
            </Button>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          </label>
        </div>
      </div>

      <Input 
        placeholder="Buscar serial restringido..." 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
        className="max-w-xs bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 text-xs h-10" 
      />

      <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Serial</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Motivo de Restricción</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Campaña Origen</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Fecha Registro</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                    <TableCell className="font-mono text-sm text-white font-semibold">{i.serial}</TableCell>
                    <TableCell className="text-sm text-slate-300">{i.motivo}</TableCell>
                    <TableCell className="text-sm text-slate-300">{i.campanaNombre || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-400 font-mono">{i.importadoEn?.split("T")[0]}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="text-center text-slate-500 py-12 text-xs">
                      No hay seriales restringidos en la lista.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
