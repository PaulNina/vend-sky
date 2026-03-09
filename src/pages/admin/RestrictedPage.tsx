import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, Trash2, ShieldBan, Search, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import * as XLSX from "xlsx";

interface Restricted {
  id: string;
  serial: string;
  reason: string;
  source_campaign: string | null;
  imported_at: string;
}

export default function RestrictedPage() {
  const [items, setItems] = useState<Restricted[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("restricted_serials").select("*").order("imported_at", { ascending: false }).limit(500);
    if (search) q = q.ilike("serial", `%${search}%`);
    const { data } = await q;
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
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const toInsert = rows.map((r) => ({
        serial: String(r.serial || r.Serial || r.SERIAL || "").trim(),
        reason: String(r.reason || r.Reason || r.motivo || "Participó en otra promoción"),
        source_campaign: r.source_campaign || r.campaña || null,
      })).filter((r) => r.serial);

      if (toInsert.length === 0) { toast({ title: "Error", description: "Sin datos válidos.", variant: "destructive" }); return; }

      for (let i = 0; i < toInsert.length; i += 500) {
        const { error } = await supabase.from("restricted_serials").insert(toInsert.slice(i, i + 500));
        if (error) throw error;
      }
      toast({ title: "Importación exitosa", description: `${toInsert.length} restringidos importados.` });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setImporting(false); e.target.value = ""; }
  };

  const handleExport = () => {
    exportToExcel(items.map((i) => ({ Serial: i.serial, Motivo: i.reason, Campaña: i.source_campaign || "", Fecha: i.imported_at.split("T")[0] })), "restringidos");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("restricted_serials").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Eliminado" }); load(); }
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <ShieldBan className="h-5 w-5 text-destructive" />
            </div>
            Seriales Restringidos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Seriales bloqueados por participación en otras promociones</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" />Excel
          </Button>
          <label>
            <Button asChild variant="premium" size="sm" disabled={importing}>
              <span className="gap-1.5 cursor-pointer">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? "Importando..." : "Importar"}
              </span>
            </Button>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="hover:border-destructive/20 transition-colors">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <ShieldBan className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold font-display">{items.length}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Total restringidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-warning/20 transition-colors">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <FileSpreadsheet className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold font-display">{new Set(items.map(i => i.source_campaign).filter(Boolean)).size}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Campañas origen</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertTriangle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold font-display">{new Set(items.map(i => i.reason)).size}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Motivos distintos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar serial restringido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Cargando restringidos…</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Serial</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Motivo</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Campaña origen</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Fecha importación</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id} className="group">
                    <TableCell>
                      <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono font-medium">{i.serial}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-normal border-destructive/30 text-destructive bg-destructive/5">
                        {i.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {i.source_campaign || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(i.imported_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(i.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-muted/50">
                          <ShieldBan className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Sin seriales restringidos</p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">Importa un archivo Excel para agregar seriales</p>
                        </div>
                      </div>
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
