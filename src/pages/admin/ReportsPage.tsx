import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete, apiPostForm } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Mail, Send, Users, Megaphone, FileSpreadsheet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useCities } from "@/hooks/useCities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";

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

  // Send Bulk Ranking Form
  const [bulkForm, setBulkForm] = useState({ asunto: "", titulo: "", texto: "" });
  const [bulkImage, setBulkImage] = useState<File | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);

  // Vendor list for bulk send
  interface VendorSummary { id: number; nombreCompleto: string; email: string; ciudad?: { nombre: string }; activo: boolean; }
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [loadingVendors, setLoadingVendors] = useState(false);

  const load = async () => {
    setLoading(true);
    const [recRes, grpRes, campRes] = await Promise.all([
      apiGet<Recipient[]>("/email-recipients").catch(() => []),
      apiGet<CityGroup[]>("/city-groups").catch(() => []),
      apiGet<Campaign[]>("/campaigns").catch(() => []),
    ]);
    setRecipients(recRes || []);
    setGroups(grpRes || []);
    const camps = (campRes || []).filter((c) => c.activo || c.registroHabilitado);
    setCampaigns(camps);
    const active = camps.find(c => c.activo);
    if (active) {
      setForm(prev => ({ ...prev, campanaId: String(active.id) }));
      setSendForm(prev => ({ ...prev, campanaId: String(active.id) }));
    }
    setLoading(false);
  };

  const loadVendors = async () => {
    setLoadingVendors(true);
    const res = await apiGet<VendorSummary[]>("/vendors").catch(() => []);
    const active = (res || []).filter(v => v.activo);
    setVendors(active);
    // Default: select all
    setSelectedEmails(new Set(active.map(v => v.email)));
    setLoadingVendors(false);
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

  const handleSendBulk = async () => {
    if (!bulkForm.asunto || !bulkForm.titulo || !bulkImage || !bulkForm.texto) {
      toast({ title: "Error", description: "El asunto, el título, el texto y la imagen son obligatorios.", variant: "destructive" });
      return;
    }
    if (bulkImage.size > 3 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no debe superar los 3MB.", variant: "destructive" });
      return;
    }
    if (selectedEmails.size === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos un vendedor.", variant: "destructive" });
      return;
    }

    setSendingBulk(true);
    try {
      const fd = new FormData();
      fd.append("asunto", bulkForm.asunto);
      fd.append("titulo", bulkForm.titulo);
      fd.append("texto", bulkForm.texto);
      fd.append("imagen", bulkImage);
      // Only append emails if it's a subset (not all)
      if (selectedEmails.size < vendors.length) {
        Array.from(selectedEmails).forEach(email => fd.append("emails", email));
      }

      const res = await apiPostForm<{message: string}>("/reports/send-ranking-to-vendors", fd);
      toast({ title: "Envío Iniciado ✅", description: res.message });
      setBulkForm({ asunto: "", titulo: "", texto: "" });
      setBulkImage(null);
    } catch(e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error inesperado", variant: "destructive" });
    }
    setSendingBulk(false);
  };

  const filteredVendors = vendors.filter(v =>
    v.nombreCompleto.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.email.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.ciudad?.nombre || "").toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const toggleVendor = (email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEmails.size === vendors.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(vendors.map(v => v.email)));
    }
  };

  const getGroupName = (id?: number) => groups.find(g => g.id === id)?.nombre || "—";
  const getCampaignName = (id?: number) => campaigns.find(c => c.id === id)?.nombre || "Todas las Campañas";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" /> Reportes de Ventas
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Generación de reportes y configuración de envíos automatizados</p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="bg-black/40 border border-white/5 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="send" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <Send className="h-4 w-4" /> Envíos Manuales
          </TabsTrigger>
          <TabsTrigger value="recipients" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <Users className="h-4 w-4" /> Destinatarios Programados
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <Megaphone className="h-4 w-4" /> Envío a Vendedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4 outline-none">
          <Card className="glass-card border-white/5 text-white shadow-xl hover:border-white/10 transition-all duration-300">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-base flex items-center gap-2 font-display text-white">
                <Mail className="h-4 w-4 text-primary" /> Enviar Reporte por Correo
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Genera un reporte en Excel para un rango de fechas y envíalo instantáneamente al correo indicado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Rango de Fechas *</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={sendForm.startDate} onChange={e => setSendForm({...sendForm, startDate: e.target.value})} className="bg-black/20 border-white/10 text-white placeholder-slate-550 focus:border-primary focus:ring-0 [color-scheme:dark] text-xs h-10" />
                    <Input type="date" value={sendForm.endDate} onChange={e => setSendForm({...sendForm, endDate: e.target.value})} className="bg-black/20 border-white/10 text-white placeholder-slate-550 focus:border-primary focus:ring-0 [color-scheme:dark] text-xs h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Correo Destino *</Label>
                  <Input type="email" placeholder="ejemplo@correo.com" value={sendForm.toEmail} onChange={e => setSendForm({...sendForm, toEmail: e.target.value})} className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 h-10 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Tipo de Filtro *</Label>
                  <Select value={sendForm.tipoDestino} onValueChange={(v) => setSendForm({ ...sendForm, tipoDestino: v })}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="ciudad" className="focus:bg-white/5 focus:text-white text-xs">Una Ciudad Específica</SelectItem>
                      <SelectItem value="grupo" className="focus:bg-white/5 focus:text-white text-xs">Un Grupo de Ciudades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">{sendForm.tipoDestino === "ciudad" ? "Ciudad" : "Grupo"} *</Label>
                  <Select value={sendForm.tipoDestino === "ciudad" ? sendForm.ciudad : sendForm.grupoId} 
                          onValueChange={(v) => setSendForm({ ...sendForm, [sendForm.tipoDestino === "ciudad" ? 'ciudad' : 'grupoId']: v })}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white h-10 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-56 overflow-y-auto">
                      {sendForm.tipoDestino === "ciudad" 
                        ? CITIES.map((c) => <SelectItem key={c} value={c} className="focus:bg-white/5 focus:text-white text-xs">{c}</SelectItem>)
                        : groups.map((g) => <SelectItem key={g.id} value={String(g.id)} className="focus:bg-white/5 focus:text-white text-xs">{g.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Campaña</Label>
                  <Select value={sendForm.campanaId} onValueChange={(v) => setSendForm({ ...sendForm, campanaId: v })}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white h-10 text-xs"><SelectValue placeholder="Todas las Campañas" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="all" className="focus:bg-white/5 focus:text-white text-xs">Todas las Campañas</SelectItem>
                      {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)} className="focus:bg-white/5 focus:text-white text-xs">{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <Button onClick={handleSendManual} disabled={sending} className="bg-primary hover:bg-primary/95 text-white w-full sm:w-auto">
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Generar y Enviar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* LEFT: Form */}
            <Card className="glass-card border-white/5 text-white shadow-xl hover:border-white/10 transition-all duration-300">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-base flex items-center gap-2 font-display text-white">
                  <Megaphone className="h-4 w-4 text-primary" /> Componer Correo
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Escribe el mensaje que recibirán los vendedores seleccionados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Asunto del Correo *</Label>
                  <Input
                    placeholder="Ej. 🏆 Ranking Semanal - Semana del 7 al 13 de Abril"
                    value={bulkForm.asunto}
                    onChange={e => setBulkForm({...bulkForm, asunto: e.target.value})}
                    className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 text-xs h-10"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Este texto aparece como el asunto en la bandeja de entrada del vendedor.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Título del Correo *</Label>
                  <Input placeholder="Ej. ¡Resultados de la Semana!" value={bulkForm.titulo} onChange={e => setBulkForm({...bulkForm, titulo: e.target.value})} className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 text-xs h-10" />
                  <p className="text-[10px] text-slate-550 font-medium">Este texto aparece como encabezado principal dentro del cuerpo del correo.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Mensaje / Ranking *</Label>
                  <Textarea
                    placeholder="Pega aquí el texto del ranking semanal..."
                    rows={9}
                    value={bulkForm.texto}
                    onChange={e => setBulkForm({...bulkForm, texto: e.target.value})}
                    className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 text-xs min-h-[150px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Imagen a Enviar * <span className="text-slate-550 text-[10px]">(Max 3MB)</span></Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => setBulkImage(e.target.files?.[0] || null)}
                    className="bg-black/20 border-white/10 text-white text-xs file:bg-white/10 file:text-white file:border-0 file:rounded-md file:mr-2 file:px-2 file:py-1 cursor-pointer"
                  />
                  {bulkImage && (
                    <p className="text-[11px] text-slate-400 font-mono">Archivo: {bulkImage.name} ({(bulkImage.size / 1024 / 1024).toFixed(2)} MB)</p>
                  )}
                </div>
                <Button onClick={handleSendBulk} disabled={sendingBulk || selectedEmails.size === 0} className="w-full bg-primary hover:bg-primary/95 text-white">
                  {sendingBulk ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar a {selectedEmails.size} vendedor{selectedEmails.size !== 1 ? "es" : ""}
                </Button>
              </CardContent>
            </Card>

            {/* RIGHT: Vendor selection */}
            <Card className="glass-card border-white/5 text-white shadow-xl hover:border-white/10 transition-all duration-300">
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2 font-display text-white">
                      <Users className="h-4 w-4 text-primary" /> Seleccionar Vendedores
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 mt-0.5">
                      {selectedEmails.size} de {vendors.length} seleccionados
                    </CardDescription>
                  </div>
                  {vendors.length === 0 && !loadingVendors ? (
                    <Button size="sm" variant="outline" onClick={loadVendors} className="border-white/10 hover:bg-white/5 text-white">
                      <Users className="h-4 w-4 mr-1.5" /> Cargar Lista
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedEmails(new Set(vendors.map(v => v.email)))} className="border-white/10 hover:bg-white/5 text-white text-xs px-2.5 h-8">
                        Todos
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedEmails(new Set())} className="border-white/10 hover:bg-white/5 text-white text-xs px-2.5 h-8">
                        Ninguno
                      </Button>
                    </div>
                  )}
                </div>
                {vendors.length > 0 && (
                  <Input
                    placeholder="Buscar vendedor por nombre, email o ciudad..."
                    value={vendorSearch}
                    onChange={e => setVendorSearch(e.target.value)}
                    className="mt-3 bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 text-xs h-9"
                  />
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loadingVendors ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : vendors.length === 0 ? (
                  <div className="text-center text-slate-500 py-16 text-xs">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-450">Lista vacía</p>
                    <p className="text-slate-500 mt-1">Haz clic en "Cargar Lista" para ver los vendedores activos.</p>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredVendors.map(v => (
                      <label
                        key={v.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedEmails.has(v.email)}
                          onCheckedChange={() => toggleVendor(v.email)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{v.nombreCompleto}</p>
                          <p className="text-[11px] text-slate-400 truncate">{v.email}</p>
                        </div>
                        {v.ciudad?.nombre && (
                          <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5 px-1.5 py-0.5 rounded shrink-0">
                            {v.ciudad.nombre}
                          </Badge>
                        )}
                      </label>
                    ))}
                    {filteredVendors.length === 0 && (
                      <p className="text-center text-slate-500 py-12 text-xs border-white/5">No se encontraron vendedores para esta búsqueda</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4 outline-none">
          <Card className="glass-card border-white/5 text-white shadow-xl hover:border-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5 gap-3">
              <div>
                <CardTitle className="text-base font-display text-white">Correos Automáticos (Cron)</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">Se enviarán reportes semanales a estas cuentas los días Martes a las 09:00 AM.</CardDescription>
              </div>
              <Button onClick={() => setDialog(true)} size="sm" className="bg-primary hover:bg-primary/95 text-white"><Plus className="h-4 w-4 mr-1.5" />Agregar Destinatario</Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : isMobile ? (
                <div className="divide-y divide-white/5">
                  {recipients.map((r) => (
                    <div key={r.id} className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{r.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {r.grupoId ? (
                            <Badge variant="secondary" className="text-[9px] h-5 bg-primary/10 text-primary border border-primary/20">Grupo: {getGroupName(r.grupoId)}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] h-5 border-white/10 text-slate-350">Ciudad: {r.ciudad}</Badge>
                          )}
                          {r.campanaId && (
                            <Badge variant="outline" className="border-indigo-500/20 text-indigo-400 bg-indigo-500/10 text-[9px] h-5">Camp: {getCampaignName(r.campanaId)}</Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="shrink-0 h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {recipients.length === 0 && (
                    <p className="text-center text-slate-500 py-12 text-xs">No hay destinatarios registrados</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                      <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Destino de Reportes</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((r) => (
                      <TableRow key={r.id} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                        <TableCell className="font-semibold text-sm text-white">{r.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {r.grupoId ? (
                              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px]">Grupo: {getGroupName(r.grupoId)}</Badge>
                            ) : (
                              <Badge variant="outline" className="border-white/10 text-slate-350 bg-white/5 text-[10px]">Ciudad: {r.ciudad}</Badge>
                            )}
                            {r.campanaId && (
                              <Badge variant="outline" className="border-indigo-500/20 text-indigo-400 bg-indigo-500/10 text-[10px]">Camp: {getCampaignName(r.campanaId)}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {recipients.length === 0 && (
                       <TableRow className="hover:bg-transparent">
                         <TableCell colSpan={3} className="text-center text-slate-500 py-12 text-xs">
                           No hay destinatarios configurados para reportes programados.
                         </TableCell>
                       </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="w-full sm:max-w-md glass-card border-white/10 shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">Nuevo Destinatario Programado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ejemplo@corporativo.com" className="bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-primary focus:ring-0 h-10 text-xs" />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">¿Qué reportes recibirá? *</Label>
              <Select value={tipoDestino} onValueChange={(v: "ciudad"|"grupo") => setTipoDestino(v)}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="ciudad" className="focus:bg-white/5 focus:text-white text-xs">Ventas de una sola ciudad</SelectItem>
                  <SelectItem value="grupo" className="focus:bg-white/5 focus:text-white text-xs">Ventas de un Grupo de Ciudades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">{tipoDestino === "ciudad" ? "Ciudad *" : "Grupo de Ciudades *"}</Label>
              <Select 
                value={tipoDestino === "ciudad" ? form.ciudad : form.grupoId} 
                onValueChange={(v) => setForm({ ...form, [tipoDestino === "ciudad" ? 'ciudad' : 'grupoId']: v })}
              >
                <SelectTrigger className="bg-black/20 border-white/10 text-white h-10 text-xs"><SelectValue placeholder="Seleccionar destino..." /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-56 overflow-y-auto">
                  {tipoDestino === "ciudad" 
                    ? CITIES.map((c) => <SelectItem key={c} value={c} className="focus:bg-white/5 focus:text-white text-xs">{c}</SelectItem>)
                    : groups.map((g) => <SelectItem key={g.id} value={String(g.id)} className="focus:bg-white/5 focus:text-white text-xs">{g.nombre}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold">Campaña de Origen</Label>
              <Select value={form.campanaId} onValueChange={(v) => setForm({ ...form, campanaId: v })}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white h-10 text-xs"><SelectValue placeholder="Todas las Campañas" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="all" className="focus:bg-white/5 focus:text-white text-xs">Todas las Campañas</SelectItem>
                  {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)} className="focus:bg-white/5 focus:text-white text-xs">{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={saveRecipient} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar Destinatario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
