import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Globe } from "lucide-react";

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

export default function LandingConfigSection() {
  const [config, setConfig] = useState<LandingConfig>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .like("key", "landing_%");

    if (data) {
      const merged = { ...DEFAULTS };
      for (const row of data) {
        if (row.key in merged) {
          (merged as any)[row.key] = row.value;
        }
      }
      setConfig(merged);
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const entries = Object.entries(config);

    for (const [key, value] of entries) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value, updated_at: now }, { onConflict: "key" });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: "Landing page actualizada", description: "Los cambios se verán reflejados inmediatamente." });
    setSaving(false);
  };

  const resetDefaults = () => {
    setConfig({ ...DEFAULTS });
    toast({ title: "Valores por defecto restaurados", description: "Presiona Guardar para aplicar." });
  };

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
        <p className="text-xs text-muted-foreground">
          Personaliza los textos y opciones que se muestran en la página de inicio pública.
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
          <Button onClick={resetDefaults} variant="outline" size="sm">
            Restaurar valores por defecto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULTS as LANDING_DEFAULTS };
