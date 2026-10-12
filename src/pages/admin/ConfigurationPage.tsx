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
  Clock, Brain, ArrowRight, MapPin, Key, Eye, EyeOff, Save, Mail, Zap, FileSpreadsheet, UserCheck, Globe, History as HistoryIcon, Settings, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCities, City } from "@/hooks/useCities";
import CityGroupsSection from "@/components/admin/CityGroupsSection";
import RolePermissionsSection from "@/components/admin/RolePermissionsSection";
import SmtpConfigurationSection from "@/components/admin/SmtpConfigurationSection";
import LandingConfigSection from "@/components/admin/LandingConfigSection";
import WhatsappTemplatesSection from "@/components/admin/WhatsappTemplatesSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white">Configuración del Sistema</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Estado general del servidor, accesos rápidos y ajustes generales del sistema</p>
      </div>

      {/* Current Week - hero-style */}
      <Card className="overflow-hidden glass-card border-primary/20 bg-gradient-to-r from-slate-900/40 via-primary/5 to-slate-900/40 hover-glow-primary transition-all duration-300">
        <CardContent className="py-5 px-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Semana en Curso (Bolivia)</p>
            <p className="text-lg font-bold font-display text-white mt-0.5">
              {format(monday, "d MMM", { locale: es })} — {format(sunday, "d MMM yyyy", { locale: es })}
            </p>
            <p className="text-xs text-slate-550 mt-0.5 font-mono">
              Hoy: {format(boliviaNow, "EEEE d 'de' MMMM, HH:mm", { locale: es })} (BOT UTC-4)
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-black/40 border border-white/5 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <Zap className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <Globe className="h-4 w-4" /> Landing
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <Mail className="h-4 w-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <FileSpreadsheet className="h-4 w-4" /> Backup
          </TabsTrigger>
          <TabsTrigger value="permisos" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-primary/20 data-[state=active]:text-primary focus:ring-0 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Permisos por Rol
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <Settings className="h-4 w-4" /> Sistema
          </TabsTrigger>
          <TabsTrigger value="templates-wa" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 focus:ring-0 font-semibold">
            <MessageSquare className="h-4 w-4" /> Templates WhatsApp
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
            <HistoryIcon className="h-4 w-4" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 outline-none">
          {/* Campaign Cards */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />Campañas
            </h2>
            {campaigns.map((c) => (
              <Card key={c.id} className="glass-card border-white/5 hover:border-white/10 transition-colors duration-300">
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white text-[15px]">{c.nombre}</h3>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 h-4.5",
                            c.activo ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-white/5"
                          )}
                        >
                          {c.activo ? "Activa" : "Inactiva"}
                        </Badge>
                        {c.registroHabilitado && (
                          <Badge variant="outline" className="text-success border-success/40 bg-success/5 text-[10px] px-1.5 h-4.5 animate-pulse">
                            Registro abierto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {c.fechaInicio} — {c.fechaFin}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 bg-black/20 border border-white/5 rounded-lg px-3 py-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-xs text-slate-350 font-medium">Validación IA</span>
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
          <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-base flex items-center gap-2 font-display text-white">
                <MapPin className="h-4 w-4 text-primary" />Ciudades Habilitadas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-4">
                Las ciudades deshabilitadas no aparecerán en los formularios de registro ni de ventas de los vendedores.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {cities.map((city) => (
                  <div
                    key={city.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                      city.activo
                        ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30"
                        : "bg-black/20 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span className={cn("text-[13px] font-semibold text-white", !city.activo && "text-slate-500 line-through")}>
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
            <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-base flex items-center gap-2 font-display text-white">
                  <UserCheck className="h-4 w-4 text-primary" />Registro de Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <p className="text-xs text-muted-foreground">
                  Controla si los vendedores nuevos necesitan aprobación manual o se activan automáticamente.
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                  <div>
                    <p className="font-semibold text-white text-[13px]">Autorizar automáticamente</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {autoAprobar
                        ? "Activo — se aprueban automáticamente"
                        : "Inactivo — requiere aprobación manual"}
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

            <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-base flex items-center gap-2 font-display text-white">
                  <Clock className="h-4 w-4 text-primary" />Restricción de Fecha de Ventas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <p className="text-xs text-muted-foreground">
                  Define cuántas semanas atrás puede un vendedor registrar una venta en los formularios.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-slate-400 text-xs">Semanas adicionales permitidas</Label>
                    <div className="flex items-center gap-2.5">
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        value={maxSemanasVenta} 
                        onChange={(e) => setMaxSemanasVenta(parseInt(e.target.value) || 0)}
                        className="h-10 w-20 bg-black/20 border-white/10 text-white focus:border-primary focus:ring-0 font-mono text-center"
                      />
                      <div className="flex-1 text-[11px] text-slate-400">
                        {maxSemanasVenta === 0 
                          ? "Solo semana actual." 
                          : `Semana actual + ${maxSemanasVenta} anteriores.`}
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={updateMaxSemanasVenta} 
                    className="mt-5 bg-primary hover:bg-primary/95 text-white" 
                    disabled={savingMaxSemanas}
                  >
                    {savingMaxSemanas ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />Accesos Rápidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  <Card className="glass-card border-white/5 hover:border-primary/20 hover:bg-white/5 transition-all duration-300 cursor-pointer group">
                    <CardContent className="py-3.5 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <link.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-[13px] text-white group-hover:text-primary transition-colors">{link.label}</p>
                          {link.count !== undefined && (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{link.count} registros</p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="permisos" className="space-y-6 outline-none">
          {/* Dynamic Role Page Access Matrix */}
          <RolePermissionsSection />
        </TabsContent>

        <TabsContent value="sistema" className="space-y-6 outline-none">
          {/* Cron Jobs Info */}
          <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 transition-all duration-300">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-base font-display flex items-center gap-2 text-white">
                <Clock className="h-4 w-4 text-primary" />Tareas Programadas (Cron)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div>
                  <p className="font-semibold text-white text-[13px]">Cierre Semanal</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Lunes 23:59 BOT — Cierra ventas pendientes de la semana anterior</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] border-white/10 text-slate-350 bg-white/5">weekly-close</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div>
                  <p className="font-semibold text-white text-[13px]">Reporte Semanal</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Martes 09:00 BOT — Genera resumen semanal por ciudad</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] border-white/10 text-slate-350 bg-white/5">weekly-report</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates-wa" className="space-y-6 outline-none">
          <WhatsappTemplatesSection />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6 outline-none">
          <AuditoriaLogsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
