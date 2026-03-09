import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Users, Trash2, Download, Lock, Unlock, Trophy } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

interface Campaign {
  id: string;
  name: string;
  subtitle: string | null;
  slug: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  registration_enabled: boolean;
  ai_date_validation: boolean;
  points_mode: string;
  registration_open_at: string | null;
  registration_close_at: string | null;
  status: string;
  closed_at: string | null;
  close_reason: string | null;
}

const empty: Omit<Campaign, "id"> = {
  name: "", subtitle: "", slug: null, start_date: "", end_date: "",
  is_active: true, registration_enabled: true, ai_date_validation: false, points_mode: "product",
  registration_open_at: null, registration_close_at: null,
  status: "active", closed_at: null, close_reason: null,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [enrollmentsDialog, setEnrollmentsDialog] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [closeDialog, setCloseDialog] = useState<Campaign | null>(null);
  const [closeReason, setCloseReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("campaigns").select("*").order("start_date", { ascending: false });
    setCampaigns(data || []);

    // Get enrollment counts per campaign using individual count queries
    if (data && data.length > 0) {
      const counts: Record<string, number> = {};
      const countPromises = data.map(async (c) => {
        const { count } = await supabase
          .from("vendor_campaign_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", c.id)
          .eq("status", "active");
        counts[c.id] = count || 0;
      });
      await Promise.all(countPromises);
      setEnrollmentCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setDialog(true); };
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name, subtitle: c.subtitle, slug: c.slug, start_date: c.start_date,
      end_date: c.end_date, is_active: c.is_active, registration_enabled: c.registration_enabled,
      ai_date_validation: c.ai_date_validation, points_mode: c.points_mode,
      registration_open_at: c.registration_open_at, registration_close_at: c.registration_close_at,
      status: c.status, closed_at: c.closed_at, close_reason: c.close_reason,
    });
    setDialog(true);
  };

  const save = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast({ title: "Error", description: "Nombre, fecha inicio y fecha fin son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("campaigns").update(form).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Campaña actualizada" });
    } else {
      const { error } = await supabase.from("campaigns").insert(form);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Campaña creada" });
    }
    setSaving(false);
    setDialog(false);
    load();
  };

  const closeCampaign = async () => {
    if (!closeDialog) return;
    setSaving(true);
    const { error } = await supabase.from("campaigns").update({
      status: "closed",
      is_active: false,
      closed_at: new Date().toISOString(),
      close_reason: closeReason || "Cerrada manualmente",
    }).eq("id", closeDialog.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Campaña cerrada" });
    setSaving(false);
    setCloseDialog(null);
    setCloseReason("");
    load();
  };

  const reopenCampaign = async (c: Campaign) => {
    const { error } = await supabase.from("campaigns").update({
      status: "active", is_active: true, closed_at: null, close_reason: null,
    }).eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Campaña reabierta" });
    load();
  };

  const loadEnrollments = async (campaignId: string) => {
    setLoadingEnrollments(true);
    const { data } = await supabase.from("vendor_campaign_enrollments")
      .select("id, enrolled_at, status, vendors(id, full_name, city, store_name)")
      .eq("campaign_id", campaignId).order("enrolled_at", { ascending: false });
    setEnrollments(data || []);
    setLoadingEnrollments(false);
  };

  const openEnrollments = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    loadEnrollments(campaignId);
    setEnrollmentsDialog(true);
  };

  const removeEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase.from("vendor_campaign_enrollments").delete().eq("id", enrollmentId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Inscripción eliminada" });
    if (selectedCampaignId) loadEnrollments(selectedCampaignId);
    load(); // refresh counts
  };

  const exportEnrollments = () => {
    exportToExcel(enrollments.map((e: any) => ({
      Vendedor: e.vendors?.full_name || "",
      Ciudad: e.vendors?.city || "",
      Tienda: e.vendors?.store_name || "",
      Estado: e.status,
      Inscrito: new Date(e.enrolled_at).toLocaleDateString("es-BO"),
    })), `inscritos-${selectedCampaignId?.slice(0, 8)}`);
  };

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Campañas
          </h1>
          <p className="text-sm text-muted-foreground">Administra las campañas del programa</p>
        </div>
        <Button onClick={openNew} variant="premium"><Plus className="h-4 w-4 mr-1" />Nueva Campaña</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Activas</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-success">{campaigns.filter(c => c.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Cerradas</p>
            <p className="text-2xl font-bold font-display mt-0.5">{campaigns.filter(c => c.status === "closed").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Total Inscritos</p>
            <p className="text-2xl font-bold font-display mt-0.5 text-primary">{Object.values(enrollmentCounts).reduce((a, b) => a + b, 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inscritos</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>IA Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id} className={c.status === "closed" ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.subtitle && <p className="text-xs text-muted-foreground">{c.subtitle}</p>}
                        {c.slug && <p className="text-[10px] text-primary font-mono">/c/{c.slug}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(c.start_date)} — {fmtDate(c.end_date)}</TableCell>
                    <TableCell>
                      {c.status === "active" ? (
                        <Badge variant="default">Activa</Badge>
                      ) : c.status === "closed" ? (
                        <Badge variant="secondary">Cerrada</Badge>
                      ) : (
                        <Badge variant="outline">Borrador</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        <Users className="h-3 w-3 mr-1" />
                        {enrollmentCounts[c.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={c.registration_enabled ? "default" : "outline"}>{c.registration_enabled ? "Abierto" : "Cerrado"}</Badge>
                        {(c.registration_open_at || c.registration_close_at) && (
                          <span className="text-[10px] text-muted-foreground">
                            {c.registration_open_at && `Abre: ${new Date(c.registration_open_at).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}`}
                            {c.registration_open_at && c.registration_close_at && " · "}
                            {c.registration_close_at && `Cierra: ${new Date(c.registration_close_at).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{c.ai_date_validation ? <Badge>ON</Badge> : <Badge variant="outline">OFF</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEnrollments(c.id)}>
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                        {c.status === "active" ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCloseDialog(c); setCloseReason(""); }} title="Cerrar campaña">
                            <Lock className="h-3.5 w-3.5 text-warning" />
                          </Button>
                        ) : c.status === "closed" ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reopenCampaign(c)} title="Reabrir campaña">
                            <Unlock className="h-3.5 w-3.5 text-success" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Close campaign dialog */}
      <Dialog open={!!closeDialog} onOpenChange={(open) => !open && setCloseDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cerrar Campaña</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de cerrar <strong>{closeDialog?.name}</strong>? Los vendedores ya no podrán registrar ventas.
          </p>
          <div className="space-y-2">
            <Label>Motivo de cierre (opcional)</Label>
            <Textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Ej: Campaña finalizada, objetivo alcanzado..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={closeCampaign} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Lock className="h-4 w-4 mr-1" />Cerrar Campaña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollments dialog */}
      <Dialog open={enrollmentsDialog} onOpenChange={setEnrollmentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Vendedores Inscritos</span>
              {enrollments.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportEnrollments}>
                  <Download className="h-3.5 w-3.5 mr-1" />Excel
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingEnrollments ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay vendedores inscritos</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{enrollments.length} vendedores inscritos</p>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Tienda</TableHead>
                      <TableHead>Inscrito</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.vendors?.full_name}</TableCell>
                        <TableCell><Badge variant="outline">{e.vendors?.city}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.vendors?.store_name || "—"}</TableCell>
                        <TableCell className="text-xs">{new Date(e.enrolled_at).toLocaleDateString("es-BO")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEnrollment(e.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Subtítulo</Label><Input value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Slug (URL de la landing)</Label>
              <Input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") || null })} placeholder="ej: bono-hincha-2026" />
              <p className="text-xs text-muted-foreground">{form.slug ? `Landing accesible en /c/${form.slug}` : "Sin slug = sin landing propia."}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha inicio *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fecha fin *</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Campaña activa</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
            <div className="flex items-center justify-between"><Label>Registro habilitado (manual)</Label><Switch checked={form.registration_enabled} onCheckedChange={(v) => setForm({ ...form, registration_enabled: v })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registro abre en (opcional)</Label>
                <Input type="datetime-local" value={form.registration_open_at ? form.registration_open_at.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, registration_open_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div className="space-y-2">
                <Label>Registro cierra en (opcional)</Label>
                <Input type="datetime-local" value={form.registration_close_at ? form.registration_close_at.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, registration_close_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </div>
            <div className="flex items-center justify-between"><Label>Validación IA de fecha</Label><Switch checked={form.ai_date_validation} onCheckedChange={(v) => setForm({ ...form, ai_date_validation: v })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
