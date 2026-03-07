import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  name: string;
  model_code: string;
  size_inches: number | null;
  bonus_bs_value: number;
  points_value: number;
  is_active: boolean;
}

interface ImportRow {
  name: string;
  model_code: string;
  size_inches: number | null;
  bonus_bs_value: number;
  points_value: number;
  error?: string;
}

const emptyProduct = { name: "", model_code: "", size_inches: "" as any, bonus_bs_value: 0, points_value: 0, is_active: true };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  // Import state
  const [importDialog, setImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyProduct); setDialog(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, model_code: p.model_code, size_inches: p.size_inches ?? "", bonus_bs_value: p.bonus_bs_value, points_value: p.points_value, is_active: p.is_active });
    setDialog(true);
  };

  const save = async () => {
    if (!form.name || !form.model_code) { toast({ title: "Error", description: "Nombre y código modelo son obligatorios.", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { ...form, size_inches: form.size_inches === "" ? null : Number(form.size_inches), bonus_bs_value: Number(form.bonus_bs_value), points_value: Number(form.points_value) };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Producto actualizado" });
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Producto creado" });
    }
    setSaving(false); setDialog(false); load();
  };

  const handleExport = () => {
    exportToExcel(products.map((p) => ({ Nombre: p.name, Modelo: p.model_code, Pulgadas: p.size_inches ?? "", "Bono Bs": p.bonus_bs_value, Puntos: p.points_value, Activo: p.is_active ? "Sí" : "No" })), "productos");
  };

  // --- Import functions ---

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { nombre: "SKYWORTH 32E3A", modelo: "32E3A", pulgadas: 32, bono_bs: 50, puntos: 10 },
      { nombre: "SKYWORTH 43SUE9500", modelo: "43SUE9500", pulgadas: 43, bono_bs: 80, puntos: 15 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportParsing(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

      const existingCodes = new Set(products.map(p => p.model_code.toLowerCase()));

      const parsed: ImportRow[] = raw.map((row, i) => {
        const name = String(row.nombre || row.name || row.Nombre || row.Name || "").trim();
        const model_code = String(row.modelo || row.model_code || row.Modelo || row.codigo || row.Código || "").trim();
        const size_inches = parseFloat(row.pulgadas || row.size_inches || row.Pulgadas || "") || null;
        const bonus_bs_value = parseFloat(row.bono_bs || row.bonus_bs_value || row["Bono Bs"] || row.bono || "0") || 0;
        const points_value = parseInt(row.puntos || row.points_value || row.Puntos || "0") || 0;

        let error: string | undefined;
        if (!name) error = "Nombre vacío";
        else if (!model_code) error = "Código modelo vacío";
        else if (existingCodes.has(model_code.toLowerCase())) error = "Modelo ya existe";

        return { name, model_code, size_inches, bonus_bs_value, points_value, error };
      });

      setImportRows(parsed);
    } catch (err: any) {
      toast({ title: "Error al leer archivo", description: err.message, variant: "destructive" });
    }

    setImportParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeImport = async () => {
    const valid = importRows.filter(r => !r.error);
    if (valid.length === 0) {
      toast({ title: "No hay registros válidos para importar", variant: "destructive" });
      return;
    }

    setImporting(true);
    let inserted = 0;
    let errors = 0;

    // Insert in batches of 50
    for (let i = 0; i < valid.length; i += 50) {
      const batch = valid.slice(i, i + 50).map(r => ({
        name: r.name,
        model_code: r.model_code,
        size_inches: r.size_inches,
        bonus_bs_value: r.bonus_bs_value,
        points_value: r.points_value,
        is_active: true,
      }));

      const { error } = await supabase.from("products").insert(batch);
      if (error) {
        errors += batch.length;
        console.error("Import batch error:", error);
      } else {
        inserted += batch.length;
      }
    }

    setImportResult({ inserted, errors });
    if (inserted > 0) {
      toast({ title: "Importación completada", description: `${inserted} productos importados.` });
      load();
    }
    setImporting(false);
  };

  const openImport = () => {
    setImportRows([]);
    setImportResult(null);
    setImportDialog(true);
  };

  const validCount = importRows.filter(r => !r.error).length;
  const errorCount = importRows.filter(r => r.error).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Productos y Modelos</h1><p className="text-sm text-muted-foreground">Bono Bs y puntos por modelo</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" onClick={openImport}><Upload className="h-4 w-4 mr-1" />Importar</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Modelo</TableHead><TableHead>Pulgadas</TableHead><TableHead className="text-right">Bono Bs</TableHead><TableHead className="text-right">Puntos</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-sm">{p.model_code}</TableCell>
                    <TableCell>{p.size_inches ?? "—"}</TableCell>
                    <TableCell className="text-right font-bold">Bs {p.bonus_bs_value}</TableCell>
                    <TableCell className="text-right">{p.points_value}</TableCell>
                    <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Activo" : "Inactivo"}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Código Modelo *</Label><Input value={form.model_code} onChange={(e) => setForm({ ...form, model_code: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Pulgadas</Label><Input type="number" value={form.size_inches} onChange={(e) => setForm({ ...form, size_inches: e.target.value })} /></div>
              <div className="space-y-2"><Label>Bono Bs</Label><Input type="number" value={form.bonus_bs_value} onChange={(e) => setForm({ ...form, bonus_bs_value: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Puntos</Label><Input type="number" value={form.points_value} onChange={(e) => setForm({ ...form, points_value: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Activo</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editing ? "Guardar" : "Crear"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importar Productos desde Excel
            </DialogTitle>
            <DialogDescription>
              Sube un archivo Excel (.xlsx) con las columnas: <strong>nombre</strong>, <strong>modelo</strong>, <strong>pulgadas</strong>, <strong>bono_bs</strong>, <strong>puntos</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload area */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1" />Descargar plantilla
              </Button>
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="text-sm"
                />
              </div>
            </div>

            {importParsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Procesando archivo...
              </div>
            )}

            {/* Preview */}
            {importRows.length > 0 && !importResult && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="default">{validCount} válidos</Badge>
                  {errorCount > 0 && <Badge variant="destructive">{errorCount} con errores</Badge>}
                  <span className="text-muted-foreground">{importRows.length} filas totales</span>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nombre</TableHead>
                        <TableHead className="text-xs">Modelo</TableHead>
                        <TableHead className="text-xs">Pulg.</TableHead>
                        <TableHead className="text-xs">Bs</TableHead>
                        <TableHead className="text-xs">Pts</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.slice(0, 100).map((r, i) => (
                        <TableRow key={i} className={r.error ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs py-1.5">{r.name || "—"}</TableCell>
                          <TableCell className="text-xs py-1.5 font-mono">{r.model_code || "—"}</TableCell>
                          <TableCell className="text-xs py-1.5">{r.size_inches ?? "—"}</TableCell>
                          <TableCell className="text-xs py-1.5">{r.bonus_bs_value}</TableCell>
                          <TableCell className="text-xs py-1.5">{r.points_value}</TableCell>
                          <TableCell className="text-xs py-1.5">
                            {r.error ? (
                              <span className="text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />{r.error}
                              </span>
                            ) : (
                              <span className="text-success flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />OK
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {importRows.length > 100 && (
                  <p className="text-xs text-muted-foreground">Mostrando 100 de {importRows.length} filas</p>
                )}
              </>
            )}

            {/* Result */}
            {importResult && (
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-sm space-y-1">
                <p className="font-medium text-success">✅ Importación completada</p>
                <p>{importResult.inserted} productos importados correctamente</p>
                {importResult.errors > 0 && <p className="text-destructive">{importResult.errors} con error</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>
              {importResult ? "Cerrar" : "Cancelar"}
            </Button>
            {!importResult && importRows.length > 0 && (
              <Button onClick={executeImport} disabled={importing || validCount === 0}>
                {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Importar {validCount} productos
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
