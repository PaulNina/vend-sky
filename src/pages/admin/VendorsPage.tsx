import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, Pencil, Download, QrCode } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { useAuth } from "@/contexts/AuthContext";

interface Vendor {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string;
  store_name: string | null;
  is_active: boolean;
  pending_approval: boolean;
  talla_polera: string | null;
  created_at: string;
  qr_url: string | null;
  qr_expires_at: string | null;
}

interface StoreHistory {
  id: string;
  previous_store: string | null;
  new_store: string | null;
  changed_by: string;
  observation: string | null;
  changed_at: string;
}

export default function VendorsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editForm, setEditForm] = useState({ talla_polera: "", store_name: "", storeObs: "" });
  const [storeHistory, setStoreHistory] = useState<StoreHistory[]>([]);
  const [saving, setSaving] = useState(false);
  const [qrDialog, setQrDialog] = useState(false);
  const [qrSignedUrl, setQrSignedUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("vendors").select("*").order("full_name");
    if (cityFilter !== "all") q = q.eq("city", cityFilter);
    if (search) q = q.ilike("full_name", `%${search}%`);
    const { data } = await q;
    setVendors(data || []);
    const uniqueCities = [...new Set((data || []).map((v) => v.city))];
    setCities(uniqueCities);
    setLoading(false);
  };

  useEffect(() => { load(); }, [cityFilter, search]);

  const openEdit = async (v: Vendor) => {
    setEditVendor(v);
    setEditForm({ talla_polera: v.talla_polera || "", store_name: v.store_name || "", storeObs: "" });
    const { data } = await supabase.from("vendor_store_history").select("*").eq("vendor_id", v.id).order("changed_at", { ascending: false });
    setStoreHistory(data || []);
  };

  const saveVendor = async () => {
    if (!editVendor || !user) return;
    setSaving(true);

    const updates: any = { talla_polera: editForm.talla_polera || null };

    // If store changed, record history
    if (editForm.store_name !== (editVendor.store_name || "")) {
      updates.store_name = editForm.store_name || null;
      await supabase.from("vendor_store_history").insert({
        vendor_id: editVendor.id,
        previous_store: editVendor.store_name,
        new_store: editForm.store_name || null,
        changed_by: user.id,
        observation: editForm.storeObs || null,
      });
    }

    const { error } = await supabase.from("vendors").update(updates).eq("id", editVendor.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Vendedor actualizado" });

    setSaving(false);
    setEditVendor(null);
    load();
  };

  const handleExport = () => {
    exportToExcel(vendors.map((v) => ({
      Nombre: v.full_name, Email: v.email || "", Teléfono: v.phone || "",
      Ciudad: v.city, Tienda: v.store_name || "", Talla: v.talla_polera || "",
      Activo: v.is_active ? "Sí" : "No", Pendiente: v.pending_approval ? "Sí" : "No",
    })), "vendedores");
  };

  // Stats
  const totalActive = vendors.filter((v) => v.is_active).length;
  const totalPending = vendors.filter((v) => v.pending_approval).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Vendedores (Kardex)</h1><p className="text-sm text-muted-foreground">{vendors.length} vendedores · {totalActive} activos · {totalPending} pendientes</p></div>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Excel</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c} ({vendors.filter((v) => v.city === c).length})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Teléfono</TableHead>
                <TableHead>Ciudad</TableHead><TableHead>Tienda</TableHead><TableHead>Talla</TableHead><TableHead>QR</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.full_name}</TableCell>
                    <TableCell className="text-sm">{v.email || "—"}</TableCell>
                    <TableCell className="text-sm">{v.phone || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{v.city}</Badge></TableCell>
                    <TableCell className="text-sm">{v.store_name || "—"}</TableCell>
                    <TableCell className="text-sm">{v.talla_polera || "—"}</TableCell>
                    <TableCell>
                      {v.qr_url ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={async () => {
                          setQrLoading(true);
                          setQrDialog(true);
                          const { data } = await supabase.storage.from("vendor-qr").createSignedUrl(v.qr_url!, 300);
                          setQrSignedUrl(data?.signedUrl || null);
                          setQrLoading(false);
                        }}>
                          <QrCode className="h-3.5 w-3.5" />
                          <Badge variant={v.qr_expires_at && new Date(v.qr_expires_at) < new Date() ? "destructive" : "default"} className="text-[9px] px-1">
                            {v.qr_expires_at && new Date(v.qr_expires_at) < new Date() ? "Venc." : "OK"}
                          </Badge>
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {v.pending_approval ? <Badge variant="secondary">Pendiente</Badge> : v.is_active ? <Badge>Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editVendor} onOpenChange={(open) => !open && setEditVendor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Kardex: {editVendor?.full_name}</DialogTitle></DialogHeader>
          {editVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {editVendor.email}</div>
                <div><span className="text-muted-foreground">Teléfono:</span> {editVendor.phone}</div>
                <div><span className="text-muted-foreground">Ciudad:</span> {editVendor.city}</div>
                <div><span className="text-muted-foreground">Registro:</span> {editVendor.created_at.split("T")[0]}</div>
              </div>

              <div className="space-y-2"><Label>Talla de polera</Label><Input value={editForm.talla_polera} onChange={(e) => setEditForm({ ...editForm, talla_polera: e.target.value })} placeholder="S, M, L, XL..." /></div>
              <div className="space-y-2"><Label>Tienda actual</Label><Input value={editForm.store_name} onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })} /></div>
              {editForm.store_name !== (editVendor.store_name || "") && (
                <div className="space-y-2"><Label>Observación del cambio</Label><Textarea value={editForm.storeObs} onChange={(e) => setEditForm({ ...editForm, storeObs: e.target.value })} placeholder="Motivo del cambio de tienda..." /></div>
              )}

              {storeHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Historial de cambios de tienda</p>
                  <div className="border border-border rounded-md divide-y divide-border max-h-40 overflow-y-auto">
                    {storeHistory.map((h) => (
                      <div key={h.id} className="p-2 text-xs">
                        <span className="text-muted-foreground">{h.changed_at.split("T")[0]}</span>
                        {" "}{h.previous_store || "(sin tienda)"} → <strong>{h.new_store || "(sin tienda)"}</strong>
                        {h.observation && <p className="text-muted-foreground mt-0.5">{h.observation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVendor(null)}>Cancelar</Button>
            <Button onClick={saveVendor} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialog} onOpenChange={setQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR de Cobro</DialogTitle></DialogHeader>
          {qrLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : qrSignedUrl ? (
            <img src={qrSignedUrl} alt="QR de cobro" className="w-full rounded-lg" />
          ) : (
            <p className="text-sm text-muted-foreground text-center p-4">No se pudo cargar el QR</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
