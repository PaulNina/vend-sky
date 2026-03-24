import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete, apiGetBlob } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, Trash2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import * as XLSX from "xlsx";

interface Producto {
  id: number;
  nombre: string;
  modelo?: string | null;
  modeloCodigo?: string | null;
  tamanoPulgadas?: number | null;
  pulgadas?: number | null;
}

interface Serial {
  id: number;
  numeroSerie: string;
  productoId?: number | null;
  productoNombre?: string | null;
  modelo?: string | null;
  estado: string;
  bloqueado: boolean;
  motivoBloqueo?: string | null;
  registroVendedorId?: number | null;
  registroCompradorId?: number | null;
  fechaRegistroVendedor?: string | null;
  fechaRegistroComprador?: string | null;
  container?: string | null;
  seal?: string | null;
  hojaRegistro?: string | null;
  invoice?: string | null;
  dateInvoice?: string | null;
  createdAt?: string | null;
}

function getEstado(s: Serial): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (s.bloqueado) return { label: "Bloqueado", variant: "destructive" };
  if (s.estado === "USADO" || s.registroVendedorId) return { label: "Usado", variant: "secondary" };
  return { label: "Disponible", variant: "default" };
}

export default function SerialsPage() {
  const [serials, setSerials] = useState<Serial[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [counts, setCounts] = useState({ disponibles: 0, usados: 0, bloqueados: 0, total: 0 });
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [jumpPage, setJumpPage] = useState("1");
  const pageSize = 10;

  const getProductoNombre = (s: Serial) => {
    if (s.productoNombre) return s.productoNombre;
    if (s.productoId) {
      const p = productos.find((p) => p.id === s.productoId);
      if (p) return `${p.nombre}${(p.tamanoPulgadas ?? p.pulgadas) ? ` ${p.tamanoPulgadas ?? p.pulgadas}"` : ""}${p.modelo ?? p.modeloCodigo ? ` — ${p.modelo ?? p.modeloCodigo}` : ""}`;
    }
    return s.modelo ?? "—";
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const prods = await apiGet<Producto[]>("/products").catch(() => [] as Producto[]);
      setProductos(prods || []);

      if (statusFilter === "RESTRINGIDO") {
        const restData = await apiGet<{ id: number, serial: string, campanaNombre?: string, motivo?: string, importadoEn?: string }[]>("/restricted-serials").catch(() => []);
        const mapped: Serial[] = restData.map(r => ({
          id: r.id,
          numeroSerie: r.serial,
          productoNombre: r.campanaNombre || "Restringido (otra prom.)",
          motivoBloqueo: r.motivo,
          estado: "RESTRINGIDO",
          bloqueado: true,
          createdAt: r.importadoEn
        } as Serial));
        
        let filtered = mapped;
        if (search) filtered = filtered.filter((s) => s.numeroSerie?.toLowerCase().includes(search.toLowerCase()));
        
        setSerials(filtered.slice(page * pageSize, (page + 1) * pageSize));
        setTotalPages(Math.ceil(filtered.length / pageSize));
        setCounts(prev => ({ ...prev, total: filtered.length }));
      } else {
        const [pageData, stats] = await Promise.all([
          apiGet<{ content: Serial[], page?: { totalPages: number, totalElements: number }, totalPages?: number, totalElements?: number }>(`/serials?page=${page}&size=${pageSize}&search=${encodeURIComponent(search)}&status=${statusFilter}`),
          apiGet<{ disponibles: number; usados: number; bloqueados: number; total: number }>("/serials/stats")
            .catch(() => ({ disponibles: 0, usados: 0, bloqueados: 0, total: 0 })),
        ]);

        setSerials(pageData.content || []);
        setTotalPages(pageData.page?.totalPages ?? pageData.totalPages ?? 0);
        setCounts({
          disponibles: stats?.disponibles ?? 0,
          usados: stats?.usados ?? 0,
          bloqueados: stats?.bloqueados ?? 0,
          total: pageData.page?.totalElements ?? pageData.totalElements ?? stats?.total ?? 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => { 
    setPage(0); // Reset to page 0 when filters change
    setJumpPage("1");
  }, [statusFilter, search]);

  const handleDeleteRestricted = async (id: number) => {
    if (!confirm("¿Eliminar este serial de la lista de restringidos?")) return;
    try {
      await apiDelete(`/restricted-serials/${id}`);
      toast({ title: "Eliminado con éxito" });
      load();
    } catch (e: unknown) {
      const err = e as Error;
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => { load(); }, [load]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPage) - 1;
    if (!isNaN(p) && p >= 0 && p < totalPages) {
      setPage(p);
    } else {
      setJumpPage((page + 1).toString());
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(ws);

      const toInsert = rows.map((r) => ({
        numeroSerie: String(r.numero_serie || r.numeroSerie || r.serial || r.Serial || r.SERIAL || "").trim(),
        modelo: r.modelo || r.Modelo || null,
        productoNombre: r.producto_nombre || r.productoNombre || null,
        container: r.container || r.Container || null,
        seal: r.seal || r.Seal || null,
        hojaRegistro: r.hoja_registro || r.hojaRegistro || null,
        invoice: r.invoice || r.Invoice || null,
        estado: "DISPONIBLE",
        bloqueado: false,
      })).filter((r) => r.numeroSerie);

      if (toInsert.length === 0) {
        toast({ title: "Error", description: "No se encontraron seriales. Verifica que el archivo tenga una columna 'numero_serie'.", variant: "destructive" });
        return;
      }

      for (let i = 0; i < toInsert.length; i += 500) {
        await apiPost("/serials/bulk", toInsert.slice(i, i + 500));
      }
      toast({ title: "Importación exitosa", description: `${toInsert.length} seriales importados.` });
      load();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error en importación", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      toast({ title: "Preparando exportación", description: "Generando archivo en el servidor..." });
      
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (statusFilter !== "all" && statusFilter !== "RESTRINGIDO") queryParams.append("status", statusFilter);

      const endpoint = statusFilter === "RESTRINGIDO" ? "/restricted-serials/export" : "/serials/export";
      const blob = await apiGetBlob(`${endpoint}?${queryParams.toString()}`);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seriales_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Exportación completada", description: "El archivo se ha descargado correctamente." });
    } catch (err: unknown) {
      const error = err as any;
      console.error("Export error:", error);
      toast({ 
        title: "Error al exportar", 
        description: error.message || "No se pudo generar el archivo de exportación.",
        variant: "destructive" 
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Seriales</h1><p className="text-sm text-muted-foreground">Base nacional de seriales — {counts.total} registros</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            {exporting ? "Exportando..." : "Excel"}
          </Button>
          <label>
            <Button asChild disabled={importing}><span><Upload className="h-4 w-4 mr-1" />{importing ? "Importando..." : "Importar CSV/Excel"}</span></Button>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{counts.disponibles}</p><p className="text-xs text-muted-foreground">Disponibles</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{counts.usados}</p><p className="text-xs text-muted-foreground">Usados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{counts.bloqueados}</p><p className="text-xs text-muted-foreground">Bloqueados</p></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Buscar serial, container, invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="DISPONIBLE">Disponibles</SelectItem>
            <SelectItem value="USADO">Usados</SelectItem>
            <SelectItem value="BLOQUEADO">Bloqueados</SelectItem>
            <SelectItem value="RESTRINGIDO">Restringidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Serie</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Seal</TableHead>
                  <TableHead>Hoja Registro</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Fecha Invoice</TableHead>
                  <TableHead>Importado</TableHead>
                  {statusFilter === "RESTRINGIDO" && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {serials.map((s) => {
                  const est = getEstado(s);
                  const isRestricted = statusFilter === "RESTRINGIDO";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.numeroSerie}</TableCell>
                      <TableCell>
                        <Badge variant={est.variant}>{isRestricted ? "Restringido" : est.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">
                        {isRestricted ? s.productoNombre : getProductoNombre(s)}
                      </TableCell>
                      <TableCell className="text-sm">{isRestricted ? (s.motivoBloqueo || "—") : (s.container || "—")}</TableCell>
                      <TableCell className="text-sm">{isRestricted ? "—" : (s.seal ?? "—")}</TableCell>
                      <TableCell className="text-sm">{isRestricted ? "—" : (s.hojaRegistro ?? "—")}</TableCell>
                      <TableCell className="text-sm">{isRestricted ? "—" : (s.invoice ?? "—")}</TableCell>
                      <TableCell className="text-sm">{isRestricted ? "—" : (s.dateInvoice?.split("T")[0] ?? "—")}</TableCell>
                      <TableCell className="text-sm">{s.createdAt?.split("T")[0] ?? "—"}</TableCell>
                      {isRestricted && (
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRestricted(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {serials.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sin seriales</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {statusFilter !== "RESTRINGIDO" && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4 border-t mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">Página {page + 1} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Siguiente</Button>
          </div>
          
          <form onSubmit={handleJumpPage} className="flex items-center gap-2 border-l pl-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Ir a página:</span>
            <Input 
              type="number" 
              className="w-20 h-9 text-center" 
              value={jumpPage} 
              onChange={e => setJumpPage(e.target.value)}
              min={1}
              max={totalPages}
            />
            <Button type="submit" size="sm" variant="secondary">Ir</Button>
          </form>
        </div>
      )}
    </div>
  );
}
