import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Loader2, Settings, Package, ShieldCheck, BarChart3, Users, Calendar,
  Clock, Brain, ArrowRight, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCities, type City } from "@/hooks/useCities";

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [campRes, prodCount, serialCount, vendorCount, recipientCount] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("report_recipients").select("id", { count: "exact", head: true }),
    ]);
    setCampaigns(campRes.data || []);
    setCounts({
      products: prodCount.count || 0,
      serials: serialCount.count || 0,
      vendors: vendorCount.count || 0,
      recipients: recipientCount.count || 0,
    });
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
    { label: "Correos por Ciudad", href: "/admin/correos-ciudad", icon: Settings, count: counts.recipients },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground">Estado general y accesos rápidos</p>
      </div>

      {/* Current Week */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Semana en Curso (Bolivia)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {format(monday, "d MMM", { locale: es })} — {format(sunday, "d MMM yyyy", { locale: es })}
          </p>
          <p className="text-sm text-muted-foreground">
            Hoy: {format(boliviaNow, "EEEE d 'de' MMMM, HH:mm", { locale: es })} (BOT UTC-4)
          </p>
        </CardContent>
      </Card>

      {/* Campaign Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Campañas</h2>
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    {c.registration_enabled && (
                      <Badge variant="outline" className="text-success border-success">
                        Registro abierto
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(c.start_date), "d MMM yyyy", { locale: es })} — {format(new Date(c.end_date), "d MMM yyyy", { locale: es })}
                    {" · "}Modo: {c.points_mode}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Validación IA</span>
                    <Switch
                      checked={c.ai_date_validation}
                      onCheckedChange={() => toggleAiValidation(c.id, c.ai_date_validation)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cities Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Ciudades Habilitadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Las ciudades deshabilitadas no aparecerán en los formularios de registro ni de ventas.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cities.map((city) => (
              <div
                key={city.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  city.is_active ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-muted"
                }`}
              >
                <span className={`text-sm font-medium ${!city.is_active ? "text-muted-foreground line-through" : ""}`}>
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

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <link.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{link.label}</p>
                      {link.count !== undefined && (
                        <p className="text-xs text-muted-foreground">{link.count} registros</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Cron Jobs Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tareas Programadas (Cron)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-sm">Cierre Semanal</p>
              <p className="text-xs text-muted-foreground">Lunes 23:59 BOT — Cierra ventas pendientes de la semana anterior</p>
            </div>
            <Badge variant="outline">weekly-close</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-sm">Reporte Semanal</p>
              <p className="text-xs text-muted-foreground">Martes 09:00 BOT — Genera resumen semanal por ciudad</p>
            </div>
            <Badge variant="outline">weekly-report</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
