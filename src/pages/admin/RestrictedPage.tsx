import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, Trash2 } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Seriales Restringidos</h1><p className="text-sm text-muted-foreground">Seriales que participaron en otras promociones</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <label><Button asChild disabled={importing}><span><Upload className="h-4 w-4 mr-1" />{importing ? "Importando..." : "Importar"}</span></Button><input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} /></label>
        </div>
      </div>

      <Input placeholder="Buscar serial restringido..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Serial</TableHead><TableHead>Motivo</TableHead><TableHead>Campaña origen</TableHead><TableHead>Fecha</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono">{i.serial}</TableCell>
                    <TableCell className="text-sm">{i.reason}</TableCell>
                    <TableCell className="text-sm">{i.source_campaign || "—"}</TableCell>
                    <TableCell className="text-sm">{i.imported_at.split("T")[0]}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin restringidos</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
