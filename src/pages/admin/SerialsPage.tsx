import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import * as XLSX from "xlsx";

interface Serial {
  id: string;
  serial: string;
  status: string;
  product_id: string | null;
  imported_at: string;
}

export default function SerialsPage() {
  const [serials, setSerials] = useState<Serial[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [counts, setCounts] = useState({ available: 0, used: 0, blocked: 0 });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("serials").select("*").order("imported_at", { ascending: false }).limit(500);
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    if (search) q = q.ilike("serial", `%${search}%`);
    const { data } = await q;
    setSerials(data || []);

    // Counts
    const [av, us, bl] = await Promise.all([
      supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "used"),
      supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "blocked"),
    ]);
    setCounts({ available: av.count || 0, used: us.count || 0, blocked: bl.count || 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, search]);

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
        product_id: r.product_id || null,
        status: "available" as const,
      })).filter((r) => r.serial);

      if (toInsert.length === 0) { toast({ title: "Error", description: "No se encontraron seriales en el archivo.", variant: "destructive" }); return; }

      // Batch insert in chunks of 500
      for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500);
        const { error } = await supabase.from("serials").insert(chunk);
        if (error) throw error;
      }

      toast({ title: "Importación exitosa", description: `${toInsert.length} seriales importados.` });
      load();
    } catch (err: any) {
      toast({ title: "Error en importación", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleExport = () => {
    exportToExcel(serials.map((s) => ({ Serial: s.serial, Estado: s.status, "Importado": s.imported_at.split("T")[0] })), "seriales");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Seriales</h1><p className="text-sm text-muted-foreground">Base nacional de seriales</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <label>
            <Button asChild disabled={importing}><span><Upload className="h-4 w-4 mr-1" />{importing ? "Importando..." : "Importar CSV/Excel"}</span></Button>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{counts.available}</p><p className="text-xs text-muted-foreground">Disponibles</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{counts.used}</p><p className="text-xs text-muted-foreground">Usados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{counts.blocked}</p><p className="text-xs text-muted-foreground">Bloqueados</p></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Buscar serial..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponibles</SelectItem>
            <SelectItem value="used">Usados</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Serial</TableHead><TableHead>Estado</TableHead><TableHead>Importado</TableHead></TableRow></TableHeader>
              <TableBody>
                {serials.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.serial}</TableCell>
                    <TableCell><Badge variant={s.status === "available" ? "default" : s.status === "used" ? "secondary" : "destructive"}>{s.status === "available" ? "Disponible" : s.status === "used" ? "Usado" : "Bloqueado"}</Badge></TableCell>
                    <TableCell className="text-sm">{s.imported_at.split("T")[0]}</TableCell>
                  </TableRow>
                ))}
                {serials.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin seriales</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
