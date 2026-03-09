import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, ChevronLeft, ChevronRight, Hash, Plus, Trash2, Search } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  model_code: string;
}

const PAGE_SIZE = 50;

export default function SerialsPage() {
  const [serials, setSerials] = useState<Serial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [counts, setCounts] = useState({ available: 0, used: 0, blocked: 0, total: 0 });
  const [page, setPage] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);

  // Add serial dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newSerial, setNewSerial] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [adding, setAdding] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Serial | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load products for dropdown
  useEffect(() => {
    supabase.from("products").select("id, name, model_code").eq("is_active", true).order("name").then(({ data }) => {
      setProducts(data || []);
    });
  }, []);

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

  const handleAddSerial = async () => {
    const trimmed = newSerial.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "El serial no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (trimmed.length < 5 || trimmed.length > 50) {
      toast({ title: "Error", description: "El serial debe tener entre 5 y 50 caracteres.", variant: "destructive" });
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("serials").insert({
      serial: trimmed,
      product_id: newProductId || null,
      status: "available",
    });

    if (error) {
      if (error.message.includes("duplicate")) {
        toast({ title: "Error", description: "Este serial ya existe.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Serial agregado", description: `${trimmed} registrado correctamente.` });
      setAddOpen(false);
      setNewSerial("");
      setNewProductId("");
      load();
    }
    setAdding(false);
  };

  const handleDeleteSerial = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("serials").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serial eliminado" });
      load();
    }
    setDeleteTarget(null);
    setDeleting(false);
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-1" />Excel
          </Button>
          <label>
            <Button asChild disabled={importing} variant="outline" size="sm">
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-1" />{importing ? "Importando..." : "Importar"}
              </span>
            </Button>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          </label>
          <Button variant="premium" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Agregar
          </Button>
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
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar serial..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
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
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Serial</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Producto</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Estado</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Importado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serials.map((s) => (
                  <TableRow key={s.id} className="group">
                    <TableCell>
                      <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono font-medium">{s.serial}</code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.products ? (
                        <span>{s.products.name} <span className="text-muted-foreground text-xs">({s.products.model_code})</span></span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)} className="text-[11px]">{statusLabel(s.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.imported_at.split("T")[0]}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(s)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {serials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-muted/50">
                          <Hash className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">Sin seriales encontrados</p>
                      </div>
                    </TableCell>
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

      {/* Add Serial Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Plus className="h-5 w-5 text-primary" />
              Agregar Serial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial *</Label>
              <Input
                id="serial"
                placeholder="Ingresa el número de serial..."
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
                className="font-mono"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">Entre 5 y 50 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Producto (opcional)</Label>
              <Select value={newProductId || "none"} onValueChange={(v) => setNewProductId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin producto</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.model_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddSerial} disabled={adding || !newSerial.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar serial
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>¿Estás seguro de eliminar el serial <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">{deleteTarget?.serial}</code>?</p>
              {deleteTarget?.status === "used" && (
                <p className="text-destructive text-sm font-medium">⚠️ Este serial está marcado como usado. Eliminarlo puede causar inconsistencias.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSerial} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
