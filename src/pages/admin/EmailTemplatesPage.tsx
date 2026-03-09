import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Mail, Eye, Code2, Wand2 } from "lucide-react";

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

interface VisualEmailForm {
  title: string;
  greeting: string;
  mainText: string;
  highlightAmount: string;
  highlightLabel: string;
  ctaText: string;
  ctaUrl: string;
  footerText: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ subject: "", body_html: "", is_active: true, from_name: "", reply_to: "" });
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");

  // Visual editor fields
  const [visualForm, setVisualForm] = useState<VisualEmailForm>({
    title: "¡Golazo! ⚽",
    greeting: "Hola {{vendor_name}},",
    mainText: "Tus comisiones de la campaña {{campaign_name}} ya fueron pagadas.",
    highlightAmount: "{{amount_bs}}",
    highlightLabel: "Monto pagado (Bs)",
    ctaText: "Ver mi panel",
    ctaUrl: "https://vend-sky.lovable.app",
    footerText: "— Equipo Skyworth",
  });

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
    // Try to parse HTML into visual fields (basic heuristic)
    parseHtmlToVisual(t.body_html);
    setDialog(true);
  };

  const parseHtmlToVisual = (html: string) => {
    // Simple extraction logic (can be enhanced)
    const titleMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
    const greetingMatch = html.match(/<p[^>]*>(Hola .*?)<\/p>/i);
    const amountMatch = html.match(/Bs\s+([\d,]+)/i);
    
    if (titleMatch) visualForm.title = titleMatch[1].replace(/<[^>]*>/g, "");
    if (greetingMatch) visualForm.greeting = greetingMatch[1];
    if (amountMatch) visualForm.highlightAmount = amountMatch[1];
  };

  const generateHtmlFromVisual = (): string => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <h2 style="color: #c8a45a; font-size: 24px; margin-bottom: 10px;">${visualForm.title}</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">${visualForm.greeting}</p>
        <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 15px 0;">${visualForm.mainText}</p>
        
        <div style="background: #f9f5eb; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="color: #666; margin: 0 0 5px; font-size: 12px;">${visualForm.highlightLabel}</p>
          <p style="font-size: 28px; font-weight: bold; color: #c8a45a; margin: 0;">Bs ${visualForm.highlightAmount}</p>
        </div>

        ${visualForm.ctaText && visualForm.ctaUrl ? `
        <div style="text-align: center; margin: 25px 0;">
          <a href="${visualForm.ctaUrl}" style="display: inline-block; background: #c8a45a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            ${visualForm.ctaText}
          </a>
        </div>
        ` : ""}

        <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">${visualForm.footerText}</p>
      </div>
    `.trim();
  };

  const previewHtml = useMemo(() => {
    if (editorMode === "visual") return generateHtmlFromVisual();
    return form.body_html;
  }, [editorMode, visualForm, form.body_html]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);

    const finalHtml = editorMode === "visual" ? generateHtmlFromVisual() : form.body_html;

    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: form.subject,
        body_html: finalHtml,
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
    <div className="space-y-6 max-w-5xl">
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
          <p className="text-xs text-muted-foreground mt-2">Estas variables se reemplazan automáticamente al enviar el email.</p>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Editar: {editing?.key}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={editorMode === "visual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode("visual")}
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  Visual
                </Button>
                <Button
                  variant={editorMode === "html" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode("html")}
                >
                  <Code2 className="h-3.5 w-3.5 mr-1" />
                  HTML
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* LEFT: Editor */}
            <div className="space-y-4 overflow-y-auto pr-2">
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

              {editorMode === "visual" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título principal</Label>
                    <Input value={visualForm.title} onChange={(e) => setVisualForm({ ...visualForm, title: e.target.value })} placeholder="¡Golazo! ⚽" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Saludo</Label>
                    <Input value={visualForm.greeting} onChange={(e) => setVisualForm({ ...visualForm, greeting: e.target.value })} placeholder="Hola {{vendor_name}}," />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Texto principal</Label>
                    <Textarea
                      value={visualForm.mainText}
                      onChange={(e) => setVisualForm({ ...visualForm, mainText: e.target.value })}
                      rows={3}
                      placeholder="Tus comisiones fueron pagadas..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Etiqueta destacada</Label>
                      <Input value={visualForm.highlightLabel} onChange={(e) => setVisualForm({ ...visualForm, highlightLabel: e.target.value })} placeholder="Monto pagado (Bs)" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor destacado</Label>
                      <Input value={visualForm.highlightAmount} onChange={(e) => setVisualForm({ ...visualForm, highlightAmount: e.target.value })} placeholder="{{amount_bs}}" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Texto botón (opcional)</Label>
                      <Input value={visualForm.ctaText} onChange={(e) => setVisualForm({ ...visualForm, ctaText: e.target.value })} placeholder="Ver mi panel" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL botón</Label>
                      <Input value={visualForm.ctaUrl} onChange={(e) => setVisualForm({ ...visualForm, ctaUrl: e.target.value })} placeholder="https://..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pie de página</Label>
                    <Input value={visualForm.footerText} onChange={(e) => setVisualForm({ ...visualForm, footerText: e.target.value })} placeholder="— Equipo Skyworth" />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-2">
                    <Code2 className="h-3.5 w-3.5" />
                    Código HTML
                  </Label>
                  <Textarea
                    value={form.body_html}
                    onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                    rows={16}
                    className="font-mono text-xs"
                    placeholder="<div>...</div>"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <Label className="text-xs">Plantilla activa</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>

            {/* RIGHT: Preview */}
            <div className="border rounded-lg p-4 bg-muted/20 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span>Vista previa</span>
              </div>
              <div
                className="bg-white rounded-lg shadow-sm p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
