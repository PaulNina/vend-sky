import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, History as HistoryIcon, ChevronLeft, ChevronRight, FilterX } from "lucide-react";
import { formatDateTimeBolivia } from "@/lib/utils";

interface Auditoria {
  id: number;
  usuarioEmail: string;
  accion: string;
  descripcion: string;
  entidad: string;
  entidadId: string;
  fecha: string;
}

const MODULES = [
  { label: "Todos", value: "ALL" },
  { label: "Ventas", value: "VENTA" },
  { label: "Configuración", value: "CONFIGURACION" },
  { label: "Productos", value: "PRODUCTO" },
  { label: "Campañas", value: "CAMPANA" },
  { label: "Seriales", value: "SERIAL" },
  { label: "Usuarios", value: "USUARIO" },
  { label: "Vendedores", value: "VENDEDOR" },
  { label: "Tiendas", value: "TIENDA" },
  { label: "Ciudades", value: "CIUDAD" },
  { label: "Grupos", value: "GRUPO_CIUDAD" },
  { label: "Popups", value: "POPUP" },
];

export default function AuditoriaLogsSection() {
  const [logs, setLogs] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        size: "20",
        search,
        module,
        startDate,
        endDate,
      });
      const data = await apiGet<any>(`/audit?${query.toString()}`);
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error("Error loading audit logs", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, module, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const clearFilters = () => {
    setSearch("");
    setModule("ALL");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  const getActionBadge = (accion: string) => {
    if (accion.includes("CREAD") || accion.includes("IMPORT")) return "bg-success/10 text-success border-success/20";
    if (accion.includes("ACTUALIZ") || accion.includes("UPDATE") || accion.includes("TOGGLE")) return "bg-primary/10 text-primary border-primary/20";
    if (accion.includes("ELIMIN") || accion.includes("REMOVID")) return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2 font-display">
          <HistoryIcon className="h-4 w-4 text-primary" />Log de Auditoría
        </CardTitle>
        <div className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border">
          {totalElements} registros encontrados
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-end bg-muted/20 p-3 rounded-xl border border-border/50">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Búsqueda</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Usuario o descripción..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-1.5 w-40">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Módulo</label>
            <Select value={module} onValueChange={(v) => { setModule(v); setPage(0); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Fecha Inicio</label>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} className="h-9 w-36 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Fecha Fin</label>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} className="h-9 w-36 text-sm" />
          </div>

          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-muted-foreground hover:text-foreground">
            <FilterX className="h-4 w-4 mr-1.5" /> Limpiar
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[180px] text-[11px] uppercase tracking-wider">Fecha</TableHead>
                <TableHead className="w-[180px] text-[11px] uppercase tracking-wider">Usuario</TableHead>
                <TableHead className="w-[180px] text-[11px] uppercase tracking-wider">Acción</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Descripción</TableHead>
                <TableHead className="w-[120px] text-[11px] uppercase tracking-wider">Entidad ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-50" />
                    <p className="text-xs text-muted-foreground mt-2">Cargando logs...</p>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm uppercase tracking-wide opacity-60">
                    No se encontraron registros
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-b last:border-0">
                    <TableCell className="text-[11px] font-medium whitespace-nowrap">
                      {formatDateTimeBolivia(log.fecha)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground truncate max-w-[160px]" title={log.usuarioEmail}>
                      {log.usuarioEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded-md border shadow-none ${getActionBadge(log.accion)}`}>
                        {log.accion}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs leading-relaxed py-3">
                      {log.descripcion}
                      {log.entidad && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-medium underline underline-offset-2">
                          {log.entidad}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono font-bold text-center bg-muted/10">
                      {log.entidadId || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-muted-foreground font-medium">
              Página <span className="text-foreground">{page + 1}</span> de <span className="text-foreground">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page === totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
