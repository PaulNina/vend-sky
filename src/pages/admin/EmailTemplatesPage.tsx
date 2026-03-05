import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Mail } from "lucide-react";

interface EmailTemplate {
  id: string;
  key: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  from_name: string | null;
  reply_to: string | null;
  updated_at: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ subject: "", body_html: "", is_active: true, from_name: "", reply_to: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("email_templates").select("*").order("key");
    setTemplates((data as EmailTemplate[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({
      subject: t.subject,
      body_html: t.body_html,
      is_active: t.is_active,
      from_name: t.from_name || "",
      reply_to: t.reply_to || "",
    });
    setDialog(true);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: form.subject,
        body_html: form.body_html,
        is_active: form.is_active,
        from_name: form.from_name || null,
        reply_to: form.reply_to || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editing.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Plantilla actualizada" });
    setSaving(false);
    setDialog(false);
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          Plantillas de Email
        </h1>
        <p className="text-sm text-muted-foreground">Personaliza los correos que se envían automáticamente</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">No hay plantillas configuradas.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Remitente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.key}</code></TableCell>
                    <TableCell className="text-sm">{t.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.from_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Activa" : "Inactiva"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Variables disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {["{{vendor_name}}", "{{campaign_name}}", "{{period_start}}", "{{period_end}}", "{{amount_bs}}"].map((v) => (
              <code key={v} className="bg-muted px-2 py-1 rounded">{v}</code>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Plantilla: {editing?.key}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Asunto</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre remitente</Label>
                <Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="Skyworth Bonos" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reply-To</Label>
                <Input value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} placeholder="soporte@empresa.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cuerpo HTML</Label>
              <Textarea
                value={form.body_html}
                onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                rows={12}
                className="font-mono text-xs"
                placeholder="<h2>¡Hola {{vendor_name}}!</h2>..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Plantilla activa</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
