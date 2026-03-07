import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LandingConfig {
  landing_headline: string;
  landing_highlight: string;
  landing_description: string;
  landing_cta_text: string;
  landing_cta_login_text: string;
  landing_badge_text: string;
  landing_step1_title: string;
  landing_step1_desc: string;
  landing_step2_title: string;
  landing_step2_desc: string;
  landing_step3_title: string;
  landing_step3_desc: string;
  landing_cta_final_title: string;
  landing_cta_final_desc: string;
  landing_cta_final_button: string;
  landing_show_confetti: string;
}

const DEFAULTS: LandingConfig = {
  landing_headline: "Vende TVs",
  landing_highlight: "SKYWORTH",
  landing_description: "Cada televisor que vendes se convierte en un bono en efectivo. Registra tu venta, un operador la aprueba y el dinero es tuyo.",
  landing_cta_text: "¡Quiero ganar bonos!",
  landing_cta_login_text: "Ya tengo cuenta",
  landing_badge_text: "¡Campaña activa!",
  landing_step1_title: "Vende un TV SKYWORTH",
  landing_step1_desc: "Cada televisor vendido cuenta",
  landing_step2_title: "Un operador valida",
  landing_step2_desc: "Tu venta es revisada y aprobada",
  landing_step3_title: "Recibe tu bono en Bs",
  landing_step3_desc: "Dinero real cada semana",
  landing_cta_final_title: "¡No te quedes fuera! 🏆",
  landing_cta_final_desc: "Cada TV SKYWORTH que vendes es dinero directo a tu bolsillo.",
  landing_cta_final_button: "Registrarme ahora",
  landing_show_confetti: "true",
};

const FIELDS: { key: keyof LandingConfig; label: string; type: "text" | "textarea" | "switch" }[] = [
  { key: "landing_badge_text", label: "Texto del badge superior", type: "text" },
  { key: "landing_headline", label: "Título principal (antes del highlight)", type: "text" },
  { key: "landing_highlight", label: "Texto destacado (dorado)", type: "text" },
  { key: "landing_description", label: "Descripción del hero", type: "textarea" },
  { key: "landing_cta_text", label: "Botón principal (CTA)", type: "text" },
  { key: "landing_cta_login_text", label: "Botón secundario", type: "text" },
  { key: "landing_step1_title", label: "Paso 1 – Título", type: "text" },
  { key: "landing_step1_desc", label: "Paso 1 – Descripción", type: "text" },
  { key: "landing_step2_title", label: "Paso 2 – Título", type: "text" },
  { key: "landing_step2_desc", label: "Paso 2 – Descripción", type: "text" },
  { key: "landing_step3_title", label: "Paso 3 – Título", type: "text" },
  { key: "landing_step3_desc", label: "Paso 3 – Descripción", type: "text" },
  { key: "landing_cta_final_title", label: "CTA final – Título", type: "text" },
  { key: "landing_cta_final_desc", label: "CTA final – Descripción", type: "text" },
  { key: "landing_cta_final_button", label: "CTA final – Botón", type: "text" },
  { key: "landing_show_confetti", label: "Mostrar confetti y monedas animadas", type: "switch" },
];

interface Campaign {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
  status: string;
}

export default function LandingConfigSection() {
  const [config, setConfig] = useState<LandingConfig>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>("global"); // "global" or campaign_id

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    loadConfig();
  }, [selectedScope]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, slug, is_active, status")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    setCampaigns((data || []) as Campaign[]);
  };

  const getKeyPrefix = () => {
    if (selectedScope === "global") return "landing_";
    return `landing_${selectedScope}_`;
  };

  const loadConfig = async () => {
    setLoading(true);
    const prefix = getKeyPrefix();

    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .like("key", `${prefix}%`);

    if (data && data.length > 0) {
      const merged = { ...DEFAULTS };
      for (const row of data) {
        const baseKey = selectedScope === "global"
          ? row.key
          : row.key.replace(`landing_${selectedScope}_`, "landing_");
        if (baseKey in merged) {
          (merged as any)[baseKey] = row.value;
        }
      }
      setConfig(merged);
    } else {
      setConfig({ ...DEFAULTS });
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const entries = Object.entries(config);

    for (const [key, value] of entries) {
      const dbKey = selectedScope === "global"
        ? key
        : key.replace("landing_", `landing_${selectedScope}_`);

      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: dbKey, value, updated_at: now }, { onConflict: "key" });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const scopeLabel = selectedScope === "global" ? "global" : campaigns.find(c => c.id === selectedScope)?.name || "campaña";
    toast({ title: "Landing actualizada", description: `Configuración ${scopeLabel} guardada.` });
    setSaving(false);
  };

  const resetDefaults = () => {
    setConfig({ ...DEFAULTS });
    toast({ title: "Valores por defecto restaurados", description: "Presiona Guardar para aplicar." });
  };

  const copyFromGlobal = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .like("key", "landing_%");

    if (data) {
      const merged = { ...DEFAULTS };
      for (const row of data) {
        if (row.key.match(/^landing_[0-9a-f-]{36}_/)) continue;
        if (row.key in merged) {
          (merged as any)[row.key] = row.value;
        }
      }
      setConfig(merged);
      toast({ title: "Copiado desde configuración global", description: "Presiona Guardar para aplicar." });
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedScope);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-display">
          <Globe className="h-4 w-4 text-primary" />
          Contenido de la Landing Page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scope selector */}
        {campaigns.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Configurar landing para:</Label>
            <Select value={selectedScope} onValueChange={setSelectedScope}>
              <SelectTrigger className="text-sm max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">🌐 Landing Principal (global)</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    📢 {c.name} {c.slug ? `(/c/${c.slug})` : "(sin slug)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedScope === "global" ? (
              <p className="text-xs text-muted-foreground">
                La landing principal se muestra en <code className="text-[10px] bg-muted px-1 py-0.5 rounded">/</code>.
                {campaigns.length > 1 && " Cuando hay múltiples campañas activas, muestra un listado de campañas."}
              </p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCampaign?.slug ? (
                  <Badge variant="outline" className="text-[10px] text-success border-success/40 bg-success/5">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    /c/{selectedCampaign.slug}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400/40 bg-amber-50">
                    Sin slug configurado – configúralo en Campañas
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Personaliza los textos y opciones que se muestran en la página de inicio.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div key={field.key} className={`space-y-1.5 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
              <Label className="text-xs">{field.label}</Label>
              {field.type === "text" && (
                <Input
                  value={config[field.key]}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="text-sm"
                />
              )}
              {field.type === "textarea" && (
                <Textarea
                  value={config[field.key]}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="text-sm"
                  rows={3}
                />
              )}
              {field.type === "switch" && (
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={config[field.key] === "true"}
                    onCheckedChange={(v) =>
                      setConfig((prev) => ({ ...prev, [field.key]: v ? "true" : "false" }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {config[field.key] === "true" ? "Activado" : "Desactivado"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          <Button onClick={saveConfig} disabled={saving} variant="premium" size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar Cambios
          </Button>
          {selectedScope !== "global" && (
            <Button onClick={copyFromGlobal} variant="outline" size="sm">
              Copiar desde global
            </Button>
          )}
          <Button onClick={resetDefaults} variant="outline" size="sm">
            Restaurar valores por defecto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULTS as LANDING_DEFAULTS };
