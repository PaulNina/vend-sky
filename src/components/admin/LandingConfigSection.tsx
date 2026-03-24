import { useState, useEffect } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, RotateCcw, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface LandingConfig {
  landing_badge_text: string;
  landing_headline: string;
  landing_highlight: string;
  landing_description: string;
  landing_cta_text: string;
  landing_cta_login_text: string;
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

export const LANDING_DEFAULTS: LandingConfig = {
  landing_badge_text: "¡Campaña activa!",
  landing_headline: "Vende TVs",
  landing_highlight: "SKYWORTH",
  landing_description: "Cada televisor que vendes se convierte en un bono en efectivo. Registra tu venta, un operador la aprueba y el dinero es tuyo.",
  landing_cta_text: "¡Quiero ganar bonos!",
  landing_cta_login_text: "Ya tengo cuenta",
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

export default function LandingConfigSection() {
  const [cfg, setCfg] = useState<LandingConfig>({ ...LANDING_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await apiGet<Record<string, string>>("/admin/config/global");
      const merged = { ...LANDING_DEFAULTS };
      Object.keys(merged).forEach((key) => {
        const k = key as keyof LandingConfig;
        if (data[key]) {
          merged[k] = data[k] as string;
        }
      });
      setCfg(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await apiPut("/admin/config/global", cfg);
      toast({ title: "Configuración guardada", description: "El contenido de la landing page ha sido actualizado." });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "No se pudo guardar la configuración", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setCfg({ ...LANDING_DEFAULTS });
    toast({ title: "Valores restablecidos", description: "No olvides guardar los cambios." });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 text-primary">
        <CardTitle className="text-base flex items-center gap-2 font-display">
          <Globe className="h-4 w-4" /> Contenido de la Landing Page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Texto del badge superior</Label>
            <Input 
              value={cfg.landing_badge_text} 
              onChange={(e) => setCfg({ ...cfg, landing_badge_text: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Título principal (antes del highlight)</Label>
            <Input 
              value={cfg.landing_headline} 
              onChange={(e) => setCfg({ ...cfg, landing_headline: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Texto destacado (primario)</Label>
            <Input 
              value={cfg.landing_highlight} 
              onChange={(e) => setCfg({ ...cfg, landing_highlight: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Botón principal (CTA)</Label>
            <Input 
              value={cfg.landing_cta_text} 
              onChange={(e) => setCfg({ ...cfg, landing_cta_text: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Botón secundario (Login)</Label>
            <Input 
              value={cfg.landing_cta_login_text} 
              onChange={(e) => setCfg({ ...cfg, landing_cta_login_text: e.target.value })} 
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripción del hero</Label>
            <Textarea 
              value={cfg.landing_description} 
              onChange={(e) => setCfg({ ...cfg, landing_description: e.target.value })} 
            />
          </div>
        </div>

        <div className="separator border-t border-border mt-6"></div>
        <h3 className="text-sm font-semibold opacity-70">Sección de Pasos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 border p-3 rounded-md bg-muted/20">
            <Label className="text-xs uppercase text-muted-foreground">Paso 1</Label>
            <Input 
              placeholder="Título"
              value={cfg.landing_step1_title} 
              onChange={(e) => setCfg({ ...cfg, landing_step1_title: e.target.value })} 
              className="mb-2"
            />
            <Input 
              placeholder="Descripción"
              value={cfg.landing_step1_desc} 
              onChange={(e) => setCfg({ ...cfg, landing_step1_desc: e.target.value })} 
            />
          </div>
          <div className="space-y-2 border p-3 rounded-md bg-muted/20">
            <Label className="text-xs uppercase text-muted-foreground">Paso 2</Label>
            <Input 
              placeholder="Título"
              value={cfg.landing_step2_title} 
              onChange={(e) => setCfg({ ...cfg, landing_step2_title: e.target.value })} 
              className="mb-2"
            />
            <Input 
              placeholder="Descripción"
              value={cfg.landing_step2_desc} 
              onChange={(e) => setCfg({ ...cfg, landing_step2_desc: e.target.value })} 
            />
          </div>
          <div className="space-y-2 border p-3 rounded-md bg-muted/20">
            <Label className="text-xs uppercase text-muted-foreground">Paso 3</Label>
            <Input 
              placeholder="Título"
              value={cfg.landing_step3_title} 
              onChange={(e) => setCfg({ ...cfg, landing_step3_title: e.target.value })} 
              className="mb-2"
            />
            <Input 
              placeholder="Descripción"
              value={cfg.landing_step3_desc} 
              onChange={(e) => setCfg({ ...cfg, landing_step3_desc: e.target.value })} 
            />
          </div>
        </div>

        <div className="separator border-t border-border mt-6"></div>
        <h3 className="text-sm font-semibold opacity-70">CTA Final</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título CTA Final</Label>
            <Input 
              value={cfg.landing_cta_final_title} 
              onChange={(e) => setCfg({ ...cfg, landing_cta_final_title: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Botón CTA Final</Label>
            <Input 
              value={cfg.landing_cta_final_button} 
              onChange={(e) => setCfg({ ...cfg, landing_cta_final_button: e.target.value })} 
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripción CTA Final</Label>
            <Textarea 
              value={cfg.landing_cta_final_desc} 
              onChange={(e) => setCfg({ ...cfg, landing_cta_final_desc: e.target.value })} 
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 border rounded-md bg-muted/10">
          <div className="space-y-0.5">
            <Label>Mostrar confetti y monedas animadas</Label>
            <p className="text-xs text-muted-foreground">Efectos visuales festivos en el hero</p>
          </div>
          <Switch 
            checked={cfg.landing_show_confetti === "true"} 
            onCheckedChange={(val) => setCfg({ ...cfg, landing_show_confetti: val ? "true" : "false" })} 
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={saveConfig} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Cambios
          </Button>
          <Button variant="outline" onClick={resetDefaults} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar valores por defecto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
