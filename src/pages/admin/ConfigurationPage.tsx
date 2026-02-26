import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Loader2, Package, ShieldCheck, BarChart3, Users, Calendar,
  Clock, Brain, ArrowRight, MapPin, Key, Eye, EyeOff, Save, Mail, Zap
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCities, type City } from "@/hooks/useCities";
import CityGroupsSection from "@/components/admin/CityGroupsSection";

interface CampaignFull {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  registration_enabled: boolean;
  ai_date_validation: boolean;
  points_mode: string;
}

export default function ConfigurationPage() {
  const [campaigns, setCampaigns] = useState<CampaignFull[]>([]);
  const [counts, setCounts] = useState({ products: 0, serials: 0, vendors: 0, recipients: 0 });
  const [loading, setLoading] = useState(true);
  const { cities, reload: reloadCities } = useCities(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiKeyExists, setGeminiKeyExists] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [campRes, prodCount, serialCount, vendorCount, recipientCount, settingRes] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("report_recipients").select("id", { count: "exact", head: true }),
      supabase.from("app_settings").select("value").eq("key", "gemini_api_key").maybeSingle(),
    ]);
    setCampaigns(campRes.data || []);
    setCounts({
      products: prodCount.count || 0,
      serials: serialCount.count || 0,
      vendors: vendorCount.count || 0,
      recipients: recipientCount.count || 0,
    });
    if (settingRes.data?.value) {
      setGeminiKeyExists(true);
      setGeminiKey(settingRes.data.value);
    }
    setLoading(false);
  };

  const toggleAiValidation = async (campaignId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("campaigns")
      .update({ ai_date_validation: !currentValue })
      .eq("id", campaignId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, ai_date_validation: !currentValue } : c))
      );
      toast({ title: "Actualizado", description: `Validación IA ${!currentValue ? "activada" : "desactivada"}` });
    }
  };

  const toggleCity = async (city: City) => {
    const { error } = await supabase
      .from("cities")
      .update({ is_active: !city.is_active })
      .eq("id", city.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      reloadCities();
      toast({ title: "Actualizado", description: `${city.name} ${!city.is_active ? "habilitada" : "deshabilitada"}` });
    }
  };

  const saveGeminiKey = async () => {
    setSavingKey(true);
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      await supabase.from("app_settings").delete().eq("key", "gemini_api_key");
      setGeminiKeyExists(false);
      setGeminiKey("");
      toast({ title: "API Key eliminada", description: "Se usará Lovable AI como respaldo" });
    } else {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "gemini_api_key", value: trimmed, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setGeminiKeyExists(true);
        toast({ title: "Guardado", description: "API Key de Gemini actualizada" });
      }
    }
    setSavingKey(false);
  };

  // Current Bolivia week info
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const boliviaNow = new Date(utcNow + boliviaOffset * 60000);
  const day = boliviaNow.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(boliviaNow);
  monday.setDate(boliviaNow.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const quickLinks = [
    { label: "Campañas", href: "/admin/campanias", icon: Calendar, count: campaigns.length },
    { label: "Productos", href: "/admin/productos-modelos", icon: Package, count: counts.products },
    { label: "Seriales Disponibles", href: "/admin/seriales", icon: ShieldCheck, count: counts.serials },
    { label: "Vendedores Activos", href: "/admin/vendedores", icon: Users, count: counts.vendors },
    { label: "Métricas", href: "/admin/metricas", icon: BarChart3 },
    { label: "Correos por Ciudad", href: "/admin/correos-ciudad", icon: Mail, count: counts.recipients },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">Estado general, accesos rápidos y ajustes del sistema</p>
      </div>

      {/* Current Week - hero-style */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-card to-primary/5">
        <CardContent className="py-5 px-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold shrink-0">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Semana en Curso (Bolivia)</p>
            <p className="text-lg font-bold font-display mt-0.5">
              {format(monday, "d MMM", { locale: es })} — {format(sunday, "d MMM yyyy", { locale: es })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hoy: {format(boliviaNow, "EEEE d 'de' MMMM, HH:mm", { locale: es })} (BOT UTC-4)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Cards */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold font-display flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Campañas
        </h2>
        {campaigns.map((c) => (
          <Card key={c.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="py-4 px-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[15px]">{c.name}</h3>
                    <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                      {c.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    {c.registration_enabled && (
                      <Badge variant="outline" className="text-success border-success/40 bg-success/5 text-[10px]">
                        Registro abierto
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(c.start_date), "d MMM yyyy", { locale: es })} — {format(new Date(c.end_date), "d MMM yyyy", { locale: es })}
                    {" · "}Modo: {c.points_mode}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Validación IA</span>
                  <Switch
                    checked={c.ai_date_validation}
                    onCheckedChange={() => toggleAiValidation(c.id, c.ai_date_validation)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Cities Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 font-display">
            <MapPin className="h-4 w-4 text-primary" />
            Ciudades Habilitadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Las ciudades deshabilitadas no aparecerán en los formularios de registro ni de ventas.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {cities.map((city) => (
              <div
                key={city.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                  city.is_active
                    ? "bg-success/5 border-success/20 hover:border-success/40"
                    : "bg-muted/30 border-border/50 hover:border-border"
                }`}
              >
                <span className={`text-[13px] font-medium ${!city.is_active ? "text-muted-foreground line-through" : ""}`}>
                  {city.name}
                </span>
                <Switch
                  checked={city.is_active}
                  onCheckedChange={() => toggleCity(city)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* City Groups */}
      <CityGroupsSection />

      {/* Gemini API Key */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 font-display">
            <Key className="h-4 w-4 text-primary" />
            API Key de Google Gemini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Configura tu propia API key de Google Gemini para la validación IA de fechas. Si no se configura, se usará Lovable AI como respaldo.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={saveGeminiKey} disabled={savingKey} size="sm" variant="premium">
              {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar
            </Button>
          </div>
          {geminiKeyExists && (
            <Badge variant="outline" className="text-success border-success/40 bg-success/5">
              API Key configurada
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <section>
        <h2 className="text-base font-semibold font-display mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {quickLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className="hover:border-primary/30 hover:bg-card/80 transition-all duration-200 cursor-pointer group">
                <CardContent className="py-3.5 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <link.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-[13px]">{link.label}</p>
                      {link.count !== undefined && (
                        <p className="text-[11px] text-muted-foreground">{link.count} registros</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Cron Jobs Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Tareas Programadas (Cron)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <p className="font-medium text-[13px]">Cierre Semanal</p>
              <p className="text-[11px] text-muted-foreground">Lunes 23:59 BOT — Cierra ventas pendientes de la semana anterior</p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">weekly-close</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <p className="font-medium text-[13px]">Reporte Semanal</p>
              <p className="text-[11px] text-muted-foreground">Martes 09:00 BOT — Genera resumen semanal por ciudad</p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">weekly-report</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
