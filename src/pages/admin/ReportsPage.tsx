import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Mail, Send, Users } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface Recipient {
  id: number;
  email: string;
  ciudad?: string;
  grupoId?: number;
  campanaId?: number;
}

interface CityGroup {
  id: number;
  nombre: string;
}

interface Campaign {
  id: number;
  nombre: string;
}

export default function ReportsPage() {
  const { cityNames: CITIES } = useCities();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [groups, setGroups] = useState<CityGroup[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  
  // Recipient Modal Form
  const [dialog, setDialog] = useState(false);
  const [tipoDestino, setTipoDestino] = useState<"ciudad" | "grupo">("ciudad");
  const [form, setForm] = useState({ email: "", ciudad: "", grupoId: "", campanaId: "all" });
  const [saving, setSaving] = useState(false);

  // Send Manual Form
  const [sendForm, setSendForm] = useState({ toEmail: "", tipoDestino: "ciudad", ciudad: "", grupoId: "", campanaId: "all", startDate: "", endDate: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [recRes, grpRes, campRes] = await Promise.all([
      apiGet<Recipient[]>("/email-recipients").catch(() => []),
      apiGet<CityGroup[]>("/city-groups").catch(() => []),
      apiGet<Campaign[]>("/campaigns").catch(() => []),
    ]);
    setRecipients(recRes || []);
    setGroups(grpRes || []);
    setCampaigns(campRes || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveRecipient = async () => {
    if (!form.email || (tipoDestino === "ciudad" ? !form.ciudad : !form.grupoId)) {
      toast({ title: "Error", description: "Todos los campos obligatorios deben completarse.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | number> = { email: form.email };
      if (tipoDestino === "ciudad") payload.ciudad = form.ciudad;
      else payload.grupoId = Number(form.grupoId);
      if (form.campanaId !== "all") payload.campanaId = Number(form.campanaId);

      await apiPost("/email-recipients", payload);
      toast({ title: "Destinatario agregado exitosamente" });
      setDialog(false); setForm({ email: "", ciudad: "", grupoId: "", campanaId: "all" }); load();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error inesperado", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    await apiDelete(`/email-recipients/${id}`).catch(() => {});
    toast({ title: "Destinatario eliminado" });
    load();
  };

  const handleSendManual = async () => {
    if (!sendForm.toEmail || !sendForm.startDate || !sendForm.endDate || (sendForm.tipoDestino === "ciudad" ? !sendForm.ciudad : !sendForm.grupoId)) {
      toast({ title: "Error", description: "Completa todos los parámetros de envío.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      let queryParams = `toEmail=${encodeURIComponent(sendForm.toEmail)}&startDate=${sendForm.startDate}&endDate=${sendForm.endDate}`;
      if (sendForm.tipoDestino === "ciudad") queryParams += `&ciudad=${encodeURIComponent(sendForm.ciudad)}`;
      else queryParams += `&grupoId=${sendForm.grupoId}`;
      if (sendForm.campanaId !== "all") queryParams += `&campanaId=${sendForm.campanaId}`;

      const res = await apiPost<{message: string}>(`/reports/send-manual?${queryParams}`, {});
      toast({ title: "Reporte Enviado", description: res.message });
      setSendForm({ ...sendForm, toEmail: "" });
    } catch(e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error inesperado", variant: "destructive" });
    }
    setSending(false);
  };

  const getGroupName = (id?: number) => groups.find(g => g.id === id)?.nombre || "—";
  const getCampaignName = (id?: number) => campaigns.find(c => c.id === id)?.nombre || "Todas las Campañas";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">Reportes de Ventas</h1>
        <p className="text-sm text-muted-foreground mt-1">Generación de reportes y configuración de envíos automatizados</p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="send" className="flex items-center gap-2"><Send className="h-4 w-4" /> Envíos Manuales</TabsTrigger>
          <TabsTrigger value="recipients" className="flex items-center gap-2"><Users className="h-4 w-4" /> Destinatarios Programados</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Enviar Reporte por Correo</CardTitle>
              <CardDescription>Genera un reporte en Excel para un rango de fechas y envíalo instantáneamente al correo indicado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rango de Fechas *</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={sendForm.startDate} onChange={e => setSendForm({...sendForm, startDate: e.target.value})} />
                    <Input type="date" value={sendForm.endDate} onChange={e => setSendForm({...sendForm, endDate: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correo Destino *</Label>
                  <Input type="email" placeholder="ejemplo@correo.com" value={sendForm.toEmail} onChange={e => setSendForm({...sendForm, toEmail: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Filtro *</Label>
                  <Select value={sendForm.tipoDestino} onValueChange={(v) => setSendForm({ ...sendForm, tipoDestino: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ciudad">Una Ciudad Específica</SelectItem>
                      <SelectItem value="grupo">Un Grupo de Ciudades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{sendForm.tipoDestino === "ciudad" ? "Ciudad" : "Grupo"} *</Label>
                  <Select value={sendForm.tipoDestino === "ciudad" ? sendForm.ciudad : sendForm.grupoId} 
                          onValueChange={(v) => setSendForm({ ...sendForm, [sendForm.tipoDestino === "ciudad" ? 'ciudad' : 'grupoId']: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {sendForm.tipoDestino === "ciudad" 
                        ? CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)
                        : groups.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaña</Label>
                  <Select value={sendForm.campanaId} onValueChange={(v) => setSendForm({ ...sendForm, campanaId: v })}>
                    <SelectTrigger><SelectValue placeholder="Todas las Campañas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las Campañas</SelectItem>
                      {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-2">
                <Button onClick={handleSendManual} disabled={sending} className="w-full sm:w-auto">
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Generar y Enviar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Correos Automáticos (Cron)</CardTitle>
                <CardDescription>Se enviarán reportes semanales a estas cuentas los días Martes a las 09:00 AM.</CardDescription>
              </div>
              <Button onClick={() => setDialog(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Agregar Destinatario</Button>
            </CardHeader>
            <CardContent>
              {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : isMobile ? (
                <div className="divide-y divide-border">
                  {recipients.map((r) => (
                    <div key={r.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.grupoId ? (
                            <Badge variant="secondary" className="text-[9px] h-5">G: {getGroupName(r.grupoId)}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] h-5">C: {r.ciudad}</Badge>
                          )}
                          {r.campanaId && (
                            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-[9px] h-5">Cp: {getCampaignName(r.campanaId)}</Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="shrink-0 h-8 w-8 mt-1">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {recipients.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">No hay destinatarios</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {r.grupoId ? (
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Grupo: {getGroupName(r.grupoId)}</Badge>
                            ) : (
                              <Badge variant="outline">Ciudad: {r.ciudad}</Badge>
                            )}
                            {r.campanaId && (
                              <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">Camp: {getCampaignName(r.campanaId)}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {recipients.length === 0 && (
                       <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No hay destinatarios configurados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle>Nuevo destinatario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            
            <div className="space-y-2">
              <Label>¿Qué reportes recibirá? *</Label>
              <Select value={tipoDestino} onValueChange={(v: "ciudad"|"grupo") => setTipoDestino(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ciudad">Ventas de una sola ciudad</SelectItem>
                  <SelectItem value="grupo">Ventas de un Grupo de Ciudades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tipoDestino === "ciudad" ? "Ciudad *" : "Grupo de Ciudades *"}</Label>
              <Select 
                value={tipoDestino === "ciudad" ? form.ciudad : form.grupoId} 
                onValueChange={(v) => setForm({ ...form, [tipoDestino === "ciudad" ? 'ciudad' : 'grupoId']: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                <SelectContent>
                  {tipoDestino === "ciudad" 
                    ? CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)
                    : groups.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Campaña</Label>
              <Select value={form.campanaId} onValueChange={(v) => setForm({ ...form, campanaId: v })}>
                <SelectTrigger><SelectValue placeholder="Todas las Campañas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Campañas</SelectItem>
                  {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={saveRecipient} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
