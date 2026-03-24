import { useState, useEffect } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Loader2, Package, ShieldCheck, BarChart3, Users, Calendar,
  Clock, Brain, ArrowRight, MapPin, Key, Eye, EyeOff, Save, Mail, Zap, FileSpreadsheet, UserCheck, Globe, History as HistoryIcon
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCities, City } from "@/hooks/useCities";
import CityGroupsSection from "@/components/admin/CityGroupsSection";
import RolePermissionsSection from "@/components/admin/RolePermissionsSection";
import SmtpConfigurationSection from "@/components/admin/SmtpConfigurationSection";
import LandingConfigSection from "@/components/admin/LandingConfigSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PopupsConfigSection from "@/components/admin/PopupsConfigSection";
import AuditoriaLogsSection from "@/components/admin/AuditoriaLogsSection";

interface Campaign {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  registroHabilitado?: boolean;
  validacionIa?: boolean;
  modoPoints?: string;
}

interface DashboardCounts {
  totalProductos?: number;
  serialesDisponibles?: number;
  vendedoresActivos?: number;
  totalVentas?: number;
}

export default function ConfigurationPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [counts, setCounts] = useState({ products: 0, serials: 0, vendors: 0 });
  const [loading, setLoading] = useState(true);
  const [autoAprobar, setAutoAprobar] = useState(false);
  const [maxSemanasVenta, setMaxSemanasVenta] = useState(0);
  const [savingAutoAprobar, setSavingAutoAprobar] = useState(false);
  const [savingMaxSemanas, setSavingMaxSemanas] = useState(false);
  const { cities, reload: reloadCities } = useCities(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [campRes, dashRes, configRes] = await Promise.all([
      apiGet<Campaign[]>("/campaigns").catch(() => []),
      apiGet<DashboardCounts>("/admin/dashboard").catch(() => ({})),
      apiGet<Record<string, string>>("/admin/config/global").catch(() => ({})),
    ]);
    setCampaigns(campRes || []);
    setCounts({
      products: (dashRes as DashboardCounts)?.totalProductos ?? 0,
      serials: (dashRes as DashboardCounts)?.serialesDisponibles ?? 0,
      vendors: (dashRes as DashboardCounts)?.vendedoresActivos ?? 0,
    });
    setAutoAprobar((configRes as Record<string, string>)?.auto_aprobar_vendedores === "true");
    setMaxSemanasVenta(parseInt((configRes as Record<string, string>)?.venta_fecha_max_semanas || "0"));
    setLoading(false);
  };

  const toggleAiValidation = async (campaignId: number, currentValue: boolean) => {
    try {
      await apiPut(`/campaigns/${campaignId}`, { validacionIa: !currentValue });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, validacionIa: !currentValue } : c))
      );
      toast({ title: "Actualizado", description: `Validación IA ${!currentValue ? "activada" : "desactivada"}` });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error al actualizar la campaña", variant: "destructive" });
    }
  };

  const toggleCity = async (city: City) => {
    try {
      await apiPut(`/cities/${city.id}`, { isActive: !city.activo });
      reloadCities();
      toast({ title: "Actualizado", description: `${city.nombre} ${!city.activo ? "habilitada" : "deshabilitada"}` });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error inesperado", variant: "destructive" });
    }
  };

  const toggleAutoAprobar = async (value: boolean) => {
    setSavingAutoAprobar(true);
    try {
      await apiPut("/admin/config/global", { auto_aprobar_vendedores: value ? "true" : "false" });
      setAutoAprobar(value);
      // Invalidate global config cache so sidebar updates
      (window as Window & { __globalConfigCache?: unknown }).__globalConfigCache = null;
      toast({
        title: "Configuración guardada",
        description: value
          ? "Los vendedores se aprobarán automáticamente al registrarse."
          : "Los vendedores requerirán aprobación manual.",
      });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error al guardar", variant: "destructive" });
    } finally {
      setSavingAutoAprobar(false);
    }
  };

  const updateMaxSemanasVenta = async () => {
    setSavingMaxSemanas(true);
    try {
      await apiPut("/admin/config/global", { venta_fecha_max_semanas: String(maxSemanasVenta) });
      // Invalidate global config cache
      (window as Window & { __globalConfigCache?: unknown }).__globalConfigCache = null;
      toast({
        title: "Configuración guardada",
        description: `Se permiten ventas de hasta ${maxSemanasVenta + 1} semanas atrás.`,
      });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error al guardar", variant: "destructive" });
    } finally {
      setSavingMaxSemanas(false);
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
    { label: "Reportes y Envíos", href: "/admin/reportes", icon: FileSpreadsheet },
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Zap className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Landing
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Backup
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Sistema
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 outline-none">
          {/* Campaign Cards */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold font-display flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />Campañas
            </h2>
            {campaigns.map((c) => (
              <Card key={c.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[15px]">{c.nombre}</h3>
                        <Badge variant={c.activo ? "default" : "secondary"} className="text-[10px]">
                          {c.activo ? "Activa" : "Inactiva"}
                        </Badge>
                        {c.registroHabilitado && (
                          <Badge variant="outline" className="text-success border-success/40 bg-success/5 text-[10px]">
                            Registro abierto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.fechaInicio} — {c.fechaFin}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Validación IA</span>
                      <Switch
                        checked={c.validacionIa ?? false}
                        onCheckedChange={() => toggleAiValidation(c.id, c.validacionIa ?? false)}
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
                <MapPin className="h-4 w-4 text-primary" />Ciudades Habilitadas
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
                      city.activo
                        ? "bg-success/5 border-success/20 hover:border-success/40"
                        : "bg-muted/30 border-border/50 hover:border-border"
                    }`}
                  >
                    <span className={`text-[13px] font-medium ${!city.activo ? "text-muted-foreground line-through" : ""}`}>
                      {city.nombre}
                    </span>
                    <Switch
                      checked={city.activo}
                      onCheckedChange={() => toggleCity(city)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* City Groups */}
          <CityGroupsSection />

          {/* Popups de Inicio */}
          <PopupsConfigSection />

          {/* Vendor Registration Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 font-display">
                  <UserCheck className="h-4 w-4 text-primary" />Registro de Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Controla si los vendedores nuevos necesitan aprobación manual o se activan automáticamente.
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-[13px]">Autorizar vendedores automáticamente</p>
                    <p className="text-[11px] text-muted-foreground">
                      {autoAprobar
                        ? "Activo — los vendedores pueden iniciar sesión de inmediato"
                        : "Inactivo — el admin debe aprobar cada solicitud manualmente"}
                    </p>
                  </div>
                  <Switch
                    checked={autoAprobar}
                    disabled={savingAutoAprobar}
                    onCheckedChange={toggleAutoAprobar}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 font-display">
                  <Clock className="h-4 w-4 text-primary" />Restricción de Fecha de Ventas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Define cuántas semanas atrás puede un vendedor registrar una venta.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px]">Semanas adicionales permitidas</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        value={maxSemanasVenta} 
                        onChange={(e) => setMaxSemanasVenta(parseInt(e.target.value) || 0)}
                        className="h-9 w-20"
                      />
                      <div className="flex-1 text-[11px] text-muted-foreground">
                        {maxSemanasVenta === 0 
                          ? "Solo se permite la semana actual." 
                          : `Permite la semana actual + ${maxSemanasVenta} semanas anteriores.`}
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={updateMaxSemanasVenta} 
                    className="mt-4" 
                    disabled={savingMaxSemanas}
                  >
                    {savingMaxSemanas ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="landing" className="outline-none">
          <LandingConfigSection />
        </TabsContent>

        <TabsContent value="email" className="space-y-6 outline-none">
          <SmtpConfigurationSection />
        </TabsContent>

        <TabsContent value="backup" className="space-y-6 outline-none">
          {/* Quick Links / Reportes */}
          <section>
            <h2 className="text-base font-semibold font-display mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />Accesos Rápidos
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
        </TabsContent>

        <TabsContent value="sistema" className="space-y-6 outline-none">
          {/* Role Access Matrix */}
          <RolePermissionsSection />

          {/* Cron Jobs Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />Tareas Programadas (Cron)
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
        </TabsContent>

        <TabsContent value="logs" className="space-y-6 outline-none">
          <AuditoriaLogsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
