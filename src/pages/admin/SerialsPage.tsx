import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, ChevronLeft, ChevronRight, Hash, AlertTriangle } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import * as XLSX from "xlsx";

interface Serial {
  id: string;
  serial: string;
  status: string;
  product_id: string | null;
  imported_at: string;
  products?: { name: string; model_code: string } | null;
}

const PAGE_SIZE = 50;

export default function SerialsPage() {
  const [serials, setSerials] = useState<Serial[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [counts, setCounts] = useState({ available: 0, used: 0, blocked: 0, total: 0 });
  const [page, setPage] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [statusFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase.from("serials")
      .select("id, serial, status, product_id, imported_at, products(name, model_code)", { count: "exact" })
      .order("imported_at", { ascending: false })
      .range(from, to);

    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    if (debouncedSearch) q = q.ilike("serial", `%${debouncedSearch}%`);

    const { data, count } = await q;
    setSerials((data as any) || []);
    setTotalFiltered(count || 0);

    // Global counts (only on initial/filter change)
    if (page === 0) {
      const [av, us, bl] = await Promise.all([
        supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "used"),
        supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "blocked"),
      ]);
      setCounts({
        available: av.count || 0,
        used: us.count || 0,
        blocked: bl.count || 0,
        total: (av.count || 0) + (us.count || 0) + (bl.count || 0),
      });
    }
    setLoading(false);
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

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

      if (toInsert.length === 0) {
        toast({ title: "Error", description: "No se encontraron seriales.", variant: "destructive" });
        return;
      }

      let inserted = 0;
      let duplicates = 0;
      for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500);
        const { error, data } = await supabase.from("serials").insert(chunk).select("id");
        if (error) {
          if (error.message.includes("duplicate")) {
            duplicates += chunk.length;
          } else throw error;
        } else {
          inserted += data?.length || chunk.length;
        }
      }

      toast({
        title: "Importación completada",
        description: `${inserted} seriales importados.${duplicates > 0 ? ` ${duplicates} duplicados omitidos.` : ""}`,
      });
      load();
    } catch (err: any) {
      toast({ title: "Error en importación", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleExportAll = async () => {
    toast({ title: "Exportando...", description: "Obteniendo todos los seriales." });
    let allSerials: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      let q = supabase.from("serials")
        .select("serial, status, imported_at, products(name, model_code)")
        .order("imported_at", { ascending: false })
        .range(from, from + batchSize - 1);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      if (debouncedSearch) q = q.ilike("serial", `%${debouncedSearch}%`);
      const { data } = await q;
      if (!data || data.length === 0) break;
      allSerials = allSerials.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    const statusMap: Record<string, string> = { available: "Disponible", used: "Usado", blocked: "Bloqueado" };
    exportToExcel(allSerials.map((s: any) => ({
      Serial: s.serial,
      Estado: statusMap[s.status] || s.status,
      Producto: s.products?.name || "—",
      Modelo: s.products?.model_code || "—",
      Importado: s.imported_at.split("T")[0],
    })), "seriales");
  };

  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
  const statusLabel = (s: string) => s === "available" ? "Disponible" : s === "used" ? "Usado" : "Bloqueado";
  const statusVariant = (s: string) => s === "available" ? "default" as const : s === "used" ? "secondary" as const : "destructive" as const;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary" />
            Seriales
          </h1>
          <p className="text-sm text-muted-foreground">Base nacional — {counts.total.toLocaleString()} seriales registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAll}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <label>
            <Button asChild disabled={importing} variant="premium"><span><Upload className="h-4 w-4 mr-1" />{importing ? "Importando..." : "Importar"}</span></Button>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:border-primary/20 transition-colors cursor-pointer" onClick={() => setStatusFilter("all")}>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Total</p>
            <p className="text-2xl font-bold font-display mt-0.5">{counts.total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-success/20 transition-colors cursor-pointer" onClick={() => setStatusFilter("available")}>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Disponibles</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-success">{counts.available.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-warning/20 transition-colors cursor-pointer" onClick={() => setStatusFilter("used")}>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Usados</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-warning">{counts.used.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-destructive/20 transition-colors cursor-pointer" onClick={() => setStatusFilter("blocked")}>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bloqueados</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-destructive">{counts.blocked.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
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
        <span className="text-xs text-muted-foreground ml-auto">{totalFiltered.toLocaleString()} resultados</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Importado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serials.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.serial}</TableCell>
                    <TableCell className="text-sm">
                      {s.products ? (
                        <span>{s.products.name} <span className="text-muted-foreground text-xs">({s.products.model_code})</span></span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.imported_at.split("T")[0]}</TableCell>
                  </TableRow>
                ))}
                {serials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin seriales</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Siguiente<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
