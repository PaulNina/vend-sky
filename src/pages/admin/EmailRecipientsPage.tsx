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
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCities } from "@/hooks/useCities";



interface Recipient {
  id: string;
  email: string;
  city: string;
  campaign_id: string;
  campaigns?: { name: string } | null;
}

export default function EmailRecipientsPage() {
  const { cityNames: CITIES } = useCities();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ email: "", city: "", campaign_id: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [recRes, campRes] = await Promise.all([
      supabase.from("report_recipients").select("*, campaigns(name)").order("city"),
      supabase.from("campaigns").select("id, name"),
    ]);
    setRecipients((recRes.data as any) || []);
    setCampaigns(campRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.email || !form.city || !form.campaign_id) {
      toast({ title: "Error", description: "Todos los campos son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("report_recipients").insert(form);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Destinatario agregado" }); setDialog(false); setForm({ email: "", city: "", campaign_id: "" }); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("report_recipients").delete().eq("id", id);
    toast({ title: "Eliminado" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Correos por Ciudad</h1><p className="text-sm text-muted-foreground">Destinatarios de reportes semanales</p></div>
        <Button onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Ciudad</TableHead><TableHead>Campaña</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.email}</TableCell>
                    <TableCell><Badge variant="outline">{r.city}</Badge></TableCell>
                    <TableCell className="text-sm">{r.campaigns?.name || "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
                {recipients.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin destinatarios</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo destinatario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Ciudad *</Label>
              <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Campaña *</Label>
              <Select value={form.campaign_id} onValueChange={(v) => setForm({ ...form, campaign_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Agregar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
