import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete, apiGetBlob } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, Trash2, Pencil, Plus, Database, CircleCheck, Clock3, Ban, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import AddSerialDialog from "@/components/serials/AddSerialDialog";
import { ProductSearchSelect } from "@/components/common/ProductSearchSelect";
import { AdminEmptyState, AdminPageHeader, AdminStat, AdminToolbar } from "@/components/admin/AdminInterface";

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

const EMPTY_EDIT: Partial<Serial> = {
  numeroSerie: "", modelo: "", container: "", seal: "",
  hojaRegistro: "", invoice: "", dateInvoice: "",
  bloqueado: false, motivoBloqueo: "", estado: "DISPONIBLE",
};

export default function SerialsPage() {
  const [serials, setSerials] = useState<Serial[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [counts, setCounts] = useState({ disponibles: 0, usados: 0, bloqueados: 0, total: 0 });

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [jumpPage, setJumpPage] = useState("1");
  const pageSize = 10;

  // Edit modal
  const [editSerial, setEditSerial] = useState<Serial | null>(null);
  const [editForm, setEditForm] = useState<Partial<Serial>>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);

  // Add serial modal
  const [showAddModal, setShowAddModal] = useState(false);

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
          id: r.id, numeroSerie: r.serial,
          productoNombre: r.campanaNombre || "Restringido (otra prom.)",
          motivoBloqueo: r.motivo, estado: "RESTRINGIDO", bloqueado: true, createdAt: r.importadoEn
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

  useEffect(() => { setPage(0); setJumpPage("1"); }, [statusFilter, search]);
  useEffect(() => { load(); }, [load]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPage) - 1;
    if (!isNaN(p) && p >= 0 && p < totalPages) setPage(p);
    else setJumpPage((page + 1).toString());
  };

  const handleDeleteRestricted = async (id: number) => {
    if (!confirm("¿Eliminar este serial de la lista de restringidos?")) return;
    try {
      await apiDelete(`/restricted-serials/${id}`);
      toast({ title: "Eliminado con éxito" });
      load();
    } catch (e: unknown) {
      toast({ title: "Error al eliminar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteSerial = async (s: Serial) => {
    if (!confirm(`¿Eliminar el serial "${s.numeroSerie}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiDelete(`/serials/${s.id}`);
      toast({ title: "Serial eliminado" });
      load();
    } catch (e: unknown) {
      toast({ title: "Error al eliminar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const openEdit = (s: Serial) => {
    setEditSerial(s);
    setEditForm({ ...s });
  };

  const handleSaveEdit = async () => {
    if (!editSerial) return;
    setSaving(true);
    try {
      await apiPut(`/serials/${editSerial.id}`, editForm);
      toast({ title: "Serial actualizado correctamente" });
      setEditSerial(null);
      load();
    } catch (e: unknown) {
      toast({ title: "Error al guardar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMissingProducts([]);
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(ws);
      const parsed = rows.map((r) => ({
        numeroSerie: String(r["Serial"] || r.serial || r.Serial || r.SERIAL || r["numero_serie"] || r.numero_serie || r.numeroSerie || "").trim(),
        modelo: String(r["Modelo"] || r.modelo || r.Modelo || r.MODELO || "").trim(),
        pulgadas: Number(r["Pulgadas"] || r.pulgadas || r.Pulgadas || r.tamanoPulgadas || r.tamano_pulgadas || r.size || 0),
        container: r["Container"] || r.container || r.Container || null,
        seal: r["Seal"] || r.seal || r.Seal || null,
        hojaRegistro: r["Hoja Registro"] || r.hoja_registro || r.hojaRegistro || null,
        invoice: r["Invoice"] || r.invoice || r.Invoice || null,
        dateInvoice: r["Fecha Invoice"] || r.date_invoice || r.dateInvoice || r.fecha_invoice || null,
      })).filter((r) => r.numeroSerie);

      if (parsed.length === 0) {
        toast({ title: "Error", description: "No se encontraron seriales.", variant: "destructive" });
        return;
      }
      const sinModelo = parsed.filter((r) => !r.modelo);
      const sinPulgadas = parsed.filter((r) => !r.pulgadas || r.pulgadas === 0);
      if (sinModelo.length > 0 || sinPulgadas.length > 0) {
        const msgs: string[] = [];
        if (sinModelo.length > 0) msgs.push(`${sinModelo.length} fila(s) sin columna 'modelo'`);
        if (sinPulgadas.length > 0) msgs.push(`${sinPulgadas.length} fila(s) sin columna 'pulgadas'`);
        toast({ title: "Datos incompletos", description: msgs.join(" · "), variant: "destructive" });
        return;
      }
      const combos = [...new Set(parsed.map((r) => `${r.modelo}|${r.pulgadas}`))];
      const notFound: string[] = [];
      const productoMap: Record<string, number> = {};
      for (const combo of combos) {
        const [modelo, pulgadasStr] = combo.split("|");
        const pulgadas = Number(pulgadasStr);
        const found = productos.find((p) => (p.modelo === modelo || p.modeloCodigo === modelo) && ((p.tamanoPulgadas ?? p.pulgadas) === pulgadas));
        if (found) productoMap[combo] = found.id;
        else notFound.push(`${modelo} ${pulgadas}"`);
      }
      if (notFound.length > 0) {
        setMissingProducts(notFound);
        toast({ title: "Productos no encontrados", description: `${notFound.length} combinación(es) no existen.`, variant: "destructive" });
        return;
      }
      const toInsert = parsed.map((r) => ({
        numeroSerie: r.numeroSerie, modelo: r.modelo,
        productoId: productoMap[`${r.modelo}|${r.pulgadas}`],
        productoNombre: null, container: r.container ?? null,
        seal: r.seal ?? null, hojaRegistro: r.hojaRegistro ?? null,
        invoice: r.invoice ?? null, dateInvoice: r.dateInvoice ?? null,
        estado: "DISPONIBLE", bloqueado: false,
      }));
      for (let i = 0; i < toInsert.length; i += 500) {
        await apiPost("/serials/bulk", toInsert.slice(i, i + 500));
      }
      toast({ title: "Importación exitosa", description: `${toInsert.length} seriales importados.` });
      setMissingProducts([]);
      load();
    } catch (err: unknown) {
      toast({ title: "Error en importación", description: (err as Error).message, variant: "destructive" });
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
      toast({ title: "Exportación completada" });
    } catch (err: unknown) {
      toast({ title: "Error al exportar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const isRestricted = statusFilter === "RESTRINGIDO";

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        eyebrow="Inventario nacional / Trazabilidad"
        title="Seriales"
        description="Consulta la disponibilidad, procedencia y uso de cada unidad registrada en el sistema."
        icon={Database}
        meta={<span className="rounded-full border border-white/[.07] bg-white/[.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">{counts.total.toLocaleString()} registros</span>}
        actions={<div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/95"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Agregar Serial(es)
          </Button>

          <Button variant="outline" onClick={handleExport} disabled={exporting} className="admin-control rounded-xl text-white">
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <label>
            <Button asChild disabled={importing} className="rounded-xl border border-white/10 bg-white/[.06] text-white hover:bg-white/10">
              <span>
                <Upload className="h-4 w-4 mr-1.5" />
                {importing ? "Importando..." : "Importar Excel/CSV"}
              </span>
            </Button>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          </label>
        </div>}
      />

      {missingProducts.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
          <p className="text-sm font-semibold text-destructive">⚠️ Importación cancelada — Los siguientes productos no existen:</p>
          <ul className="list-disc list-inside space-y-1">
            {missingProducts.map((mp) => (<li key={mp} className="text-sm text-destructive font-mono">{mp}</li>))}
          </ul>
          <button className="text-xs underline text-destructive hover:opacity-70" onClick={() => setMissingProducts([])}>Cerrar aviso</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminStat index="01 / STOCK" label="Disponibles" value={counts.disponibles.toLocaleString()} icon={CircleCheck} tone="green" caption="Listos para registro" />
        <AdminStat index="02 / TRAZA" label="Usados" value={counts.usados.toLocaleString()} icon={Clock3} caption="Vinculados a una venta" />
        <AdminStat index="03 / ALERTA" label="Bloqueados" value={counts.bloqueados.toLocaleString()} icon={Ban} tone="red" caption="Requieren control" />
      </div>

      <AdminToolbar>
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
          <Input
          placeholder="Buscar serial, container, invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-control h-10 rounded-lg pl-9 text-white placeholder-slate-600"
        />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="admin-control w-full sm:w-[180px] h-10 rounded-lg text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="all" className="focus:bg-white/5 focus:text-white">Todos</SelectItem>
            <SelectItem value="DISPONIBLE" className="focus:bg-white/5 focus:text-white">Disponibles</SelectItem>
            <SelectItem value="USADO" className="focus:bg-white/5 focus:text-white">Usados</SelectItem>
            <SelectItem value="BLOQUEADO" className="focus:bg-white/5 focus:text-white">Bloqueados</SelectItem>
            <SelectItem value="RESTRINGIDO" className="focus:bg-white/5 focus:text-white">Restringidos</SelectItem>
          </SelectContent>
        </Select>
      </AdminToolbar>

      <Card className="admin-data-card glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                  <TableHead className="text-xs text-muted-foreground">Número de Serie</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Producto</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{isRestricted ? "Motivo de Bloqueo" : "Container"}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Seal</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Hoja Registro</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Invoice</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Fecha Invoice</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Importado</TableHead>
                  <TableHead className="w-[90px] text-right text-xs text-muted-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serials.map((s) => {
                  const est = getEstado(s);
                  const isBlocked = est.label === "Bloqueado" || isRestricted;
                  const isUsed = est.label === "Usado";
                  return (
                    <TableRow key={s.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                      <TableCell className="font-mono text-sm text-white font-semibold">{s.numeroSerie}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 h-5",
                            isBlocked && "bg-red-500/10 text-red-400 border border-red-500/20",
                            isUsed && "bg-slate-700/30 text-slate-400 border border-white/5",
                            (!isBlocked && !isUsed) && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"
                          )}
                        >
                          {isRestricted ? "Restringido" : est.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate text-slate-300">{isRestricted ? s.productoNombre : getProductoNombre(s)}</TableCell>
                      <TableCell className="text-sm text-slate-300">{isRestricted ? (s.motivoBloqueo || "—") : (s.container || "—")}</TableCell>
                      <TableCell className="text-sm text-slate-300">{isRestricted ? "—" : (s.seal ?? "—")}</TableCell>
                      <TableCell className="text-sm text-slate-300">{isRestricted ? "—" : (s.hojaRegistro ?? "—")}</TableCell>
                      <TableCell className="text-sm text-slate-300">{isRestricted ? "—" : (s.invoice ?? "—")}</TableCell>
                      <TableCell className="text-sm text-slate-300 font-mono">{isRestricted ? "—" : (s.dateInvoice?.split("T")[0] ?? "—")}</TableCell>
                      <TableCell className="text-sm text-slate-400 font-mono">{s.createdAt?.split("T")[0] ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isRestricted && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
                              title="Editar serial"
                              onClick={() => openEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Eliminar serial"
                            onClick={() => isRestricted ? handleDeleteRestricted(s.id) : handleDeleteSerial(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {serials.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={10} className="p-0"><AdminEmptyState title="Sin seriales registrados" /></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {statusFilter !== "RESTRINGIDO" && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4 border-t border-white/5 mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="border-white/10 hover:bg-white/5 text-white">Anterior</Button>
            <span className="text-sm text-slate-400 whitespace-nowrap">Página {page + 1} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="border-white/10 hover:bg-white/5 text-white">Siguiente</Button>
          </div>
          <form onSubmit={handleJumpPage} className="flex items-center gap-2 border-l border-white/10 pl-4">
            <span className="text-sm text-slate-400 whitespace-nowrap">Ir a página:</span>
            <Input type="number" className="w-16 h-9 text-center bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" value={jumpPage} onChange={e => setJumpPage(e.target.value)} min={1} max={totalPages} />
            <Button type="submit" size="sm" variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-white">Ir</Button>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editSerial} onOpenChange={(open) => { if (!open) setEditSerial(null); }}>
        <DialogContent className="max-w-lg glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Editar Serial</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-slate-400 text-xs">Número de Serie</Label>
              <Input value={editForm.numeroSerie ?? ""} onChange={e => setEditForm(f => ({ ...f, numeroSerie: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Modelo</Label>
              <Input value={editForm.modelo ?? ""} onChange={e => setEditForm(f => ({ ...f, modelo: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Producto Asociado</Label>
              <ProductSearchSelect
                value={editForm.productoId ? editForm.productoId.toString() : "none"}
                onChange={(v) => setEditForm((f) => ({ ...f, productoId: !v || v === "none" ? null : Number(v) }))}
                productos={productos}
                placeholder="-- Sin producto asignado --"
                allowEmpty={true}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Container</Label>
              <Input value={editForm.container ?? ""} onChange={e => setEditForm(f => ({ ...f, container: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Seal</Label>
              <Input value={editForm.seal ?? ""} onChange={e => setEditForm(f => ({ ...f, seal: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Hoja Registro</Label>
              <Input value={editForm.hojaRegistro ?? ""} onChange={e => setEditForm(f => ({ ...f, hojaRegistro: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Invoice</Label>
              <Input value={editForm.invoice ?? ""} onChange={e => setEditForm(f => ({ ...f, invoice: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Fecha Invoice</Label>
              <Input type="date" value={editForm.dateInvoice?.split("T")[0] ?? ""} onChange={e => setEditForm(f => ({ ...f, dateInvoice: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Estado</Label>
              <Select value={editForm.estado ?? "DISPONIBLE"} onValueChange={v => setEditForm(f => ({ ...f, estado: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="DISPONIBLE" className="focus:bg-white/5 focus:text-white">Disponible</SelectItem>
                  <SelectItem value="USADO" className="focus:bg-white/5 focus:text-white">Usado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Bloqueado</Label>
              <Select value={editForm.bloqueado ? "true" : "false"} onValueChange={v => setEditForm(f => ({ ...f, bloqueado: v === "true" }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="false" className="focus:bg-white/5 focus:text-white">No</SelectItem>
                  <SelectItem value="true" className="focus:bg-white/5 focus:text-white">Sí</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.bloqueado && (
              <div className="col-span-2 space-y-1.5">
                <Label className="text-slate-400 text-xs">Motivo de bloqueo</Label>
                <Input value={editForm.motivoBloqueo ?? ""} onChange={e => setEditForm(f => ({ ...f, motivoBloqueo: e.target.value }))} className="bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0" />
              </div>
            )}
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setEditSerial(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Guardando...</> : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Agregar Seriales (Individual y Masivo) */}
      <AddSerialDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        productos={productos}
        onSuccess={load}
      />
    </div>
  );
}
