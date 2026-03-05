import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Loader2, Package, ShieldCheck, BarChart3, Users, Calendar,
  Clock, Brain, ArrowRight, MapPin, Key, Eye, EyeOff, Save, Mail, Zap,
  Play, AlertTriangle, CheckCircle2, Settings, XCircle
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
  status: string;
  period_mode: string;
  custom_days: number | null;
  anchor_date: string | null;
  close_time_local: string;
  report_on_close: boolean;
  report_recipients_mode: string;
  auto_periods_enabled: boolean;
  closed_at: string | null;
  close_reason: string | null;
}

interface CampaignPeriod {
  id: string;
  campaign_id: string;
  period_number: number;
  period_start: string;
  period_end: string;
  status: string;
  closed_at: string | null;
  settlement_generated_at: string | null;
  report_generated_at: string | null;
  report_sent_at: string | null;
}

export default function ConfigurationPage() {
  const [campaigns, setCampaigns] = useState<CampaignFull[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [periods, setPeriods] = useState<CampaignPeriod[]>([]);
  const [counts, setCounts] = useState({ products: 0, serials: 0, vendors: 0, recipients: 0 });
  const [loading, setLoading] = useState(true);
  const { cities, reload: reloadCities } = useCities(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiKeyExists, setGeminiKeyExists] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [generatingPeriods, setGeneratingPeriods] = useState(false);
  const [runningSystem, setRunningSystem] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closingCampaign, setClosingCampaign] = useState(false);

  // Period config form
  const [periodMode, setPeriodMode] = useState("WEEKLY");
  const [customDays, setCustomDays] = useState<number>(14);
  const [anchorDate, setAnchorDate] = useState("");
  const [closeTime, setCloseTime] = useState("23:59");
  const [reportOnClose, setReportOnClose] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [campRes, prodCount, serialCount, vendorCount, recipientCount, settingRes] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("report_recipients").select("id", { count: "exact", head: true }),
      supabase.from("app_settings").select("value").eq("key", "gemini_api_key").maybeSingle(),
    ]);
    const camps = (campRes.data || []) as CampaignFull[];
    setCampaigns(camps);
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
    // Auto-select first active campaign
    const active = camps.find((c) => c.status === "active") || camps[0];
    if (active) {
      setSelectedCampaignId(active.id);
      syncConfigForm(active);
    }
    setLoading(false);
  };

  const syncConfigForm = (c: CampaignFull) => {
    setPeriodMode(c.period_mode || "WEEKLY");
    setCustomDays(c.custom_days || 14);
    setAnchorDate(c.anchor_date || c.start_date);
    setCloseTime(c.close_time_local || "23:59");
    setReportOnClose(c.report_on_close ?? true);
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  useEffect(() => {
    if (selectedCampaign) {
      syncConfigForm(selectedCampaign);
      loadPeriods(selectedCampaign.id);
    }
  }, [selectedCampaignId]);

  const loadPeriods = async (campaignId: string) => {
    const { data } = await supabase
      .from("campaign_periods")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("period_number", { ascending: true });
    setPeriods((data || []) as CampaignPeriod[]);
  };

  // Auto-trigger system runner once per session per campaign per day
  useEffect(() => {
    if (!selectedCampaign || selectedCampaign.status !== "active") return;
    const key = `system_run_${selectedCampaign.id}_${new Date().toISOString().split("T")[0]}`;
    if (sessionStorage.getItem(key)) return;

    (async () => {
      const ok = await runSystemProcesses(true);
      if (ok) sessionStorage.setItem(key, "1");
    })();
  }, [selectedCampaignId]);

  const saveConfig = async () => {
    if (!selectedCampaign) return;
    setSavingConfig(true);
    const { error } = await supabase
      .from("campaigns")
      .update({
        period_mode: periodMode,
        custom_days: periodMode === "CUSTOM_DAYS" ? customDays : null,
        anchor_date: anchorDate,
        close_time_local: closeTime,
        report_on_close: reportOnClose,
      })
      .eq("id", selectedCampaign.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Configuración guardada" });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === selectedCampaign.id
            ? { ...c, period_mode: periodMode, custom_days: periodMode === "CUSTOM_DAYS" ? customDays : null, anchor_date: anchorDate, close_time_local: closeTime, report_on_close: reportOnClose }
            : c
        )
      );
    }
    setSavingConfig(false);
  };

  const generatePeriods = async () => {
    if (!selectedCampaign) return;
    setGeneratingPeriods(true);

    const start = new Date(selectedCampaign.start_date + "T12:00:00");
    const end = new Date(selectedCampaign.end_date + "T12:00:00");
    const anchor = anchorDate ? new Date(anchorDate + "T12:00:00") : start;

    let intervalDays: number;
    switch (periodMode) {
      case "WEEKLY": intervalDays = 7; break;
      case "BIWEEKLY": intervalDays = 14; break;
      case "MONTHLY": intervalDays = 30; break;
      case "CUSTOM_DAYS": intervalDays = customDays || 7; break;
      default: intervalDays = 7;
    }

    // Generate periods
    const newPeriods: { period_number: number; period_start: string; period_end: string }[] = [];
    let cursor = new Date(anchor);
    // Align cursor to start_date if anchor is before
    while (cursor < start) cursor.setDate(cursor.getDate() + intervalDays);
    if (cursor > start) cursor = new Date(start);

    let num = 1;
    while (cursor <= end) {
      const periodStart = cursor.toISOString().split("T")[0];
      const periodEndDate = new Date(cursor);
      periodEndDate.setDate(periodEndDate.getDate() + intervalDays - 1);
      const periodEnd = periodEndDate > end ? selectedCampaign.end_date : periodEndDate.toISOString().split("T")[0];
      newPeriods.push({ period_number: num, period_start: periodStart, period_end: periodEnd });
      num++;
      cursor.setDate(cursor.getDate() + intervalDays);
    }

    // Delete only OPEN periods, keep CLOSED
    await supabase
      .from("campaign_periods")
      .delete()
      .eq("campaign_id", selectedCampaign.id)
      .eq("status", "open");

    // Get existing closed periods to avoid conflicts
    const { data: closedPeriods } = await supabase
      .from("campaign_periods")
      .select("period_number, period_start, period_end")
      .eq("campaign_id", selectedCampaign.id)
      .eq("status", "closed");

    const closedNumbers = new Set((closedPeriods || []).map((p) => p.period_number));
    const toInsert = newPeriods
      .filter((p) => !closedNumbers.has(p.period_number))
      .map((p) => ({
        campaign_id: selectedCampaign.id,
        ...p,
        status: "open",
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("campaign_periods").insert(toInsert);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Periodos generados", description: `${toInsert.length} periodos creados.` });
    } else {
      toast({ title: "Sin cambios", description: "Todos los periodos ya están cerrados." });
    }

    await loadPeriods(selectedCampaign.id);
    setGeneratingPeriods(false);
  };

  const getValidAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token ?? null;
    if (!token) return null;

    const { error: userErr } = await supabase.auth.getUser(token);
    if (!userErr) return token;

    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshed.session?.access_token) return null;

    token = refreshed.session.access_token;
    const { error: refreshedUserErr } = await supabase.auth.getUser(token);
    if (refreshedUserErr) return null;

    return token;
  };

  const runSystemProcesses = async (silent = false): Promise<boolean> => {
    if (!selectedCampaign) return false;
    setRunningSystem(true);

    try {
      const token = await getValidAccessToken();
      if (!token) {
        if (!silent) {
          toast({
            title: "Sesión expirada",
            description: "Inicia sesión nuevamente para ejecutar procesos del sistema.",
            variant: "destructive",
          });
        }
        return false;
      }

      const { data, error } = await supabase.functions.invoke("run-system-processes", {
        headers: { Authorization: `Bearer ${token}` },
        body: { campaign_id: selectedCampaign.id },
      });

      if (error) throw error;

      if (!silent) {
        toast({
          title: "Procesos ejecutados",
          description: `${data.periods_closed} periodos cerrados, ${data.settlements_generated} liquidaciones generadas.`,
        });
      }

      if (data.periods_closed > 0) {
        await loadPeriods(selectedCampaign.id);
      }

      return true;
    } catch (err: any) {
      if (!silent) toast({ title: "Error", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setRunningSystem(false);
    }
  };

  const closeCampaign = async () => {
    if (!selectedCampaign) return;
    setClosingCampaign(true);
    const { error } = await supabase
      .from("campaigns")
      .update({
        status: "closed",
        is_active: false,
        closed_at: new Date().toISOString(),
        close_reason: closeReason || null,
      })
      .eq("id", selectedCampaign.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Campaña cerrada" });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === selectedCampaign.id
            ? { ...c, status: "closed", is_active: false, closed_at: new Date().toISOString(), close_reason: closeReason || null }
            : c
        )
      );
    }
    setClosingCampaign(false);
    setCloseDialog(false);
  };

  const toggleCity = async (city: City) => {
    const { error } = await supabase.from("cities").update({ is_active: !city.is_active }).eq("id", city.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { reloadCities(); toast({ title: "Actualizado" }); }
  };

  const saveGeminiKey = async () => {
    setSavingKey(true);
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      await supabase.from("app_settings").delete().eq("key", "gemini_api_key");
      setGeminiKeyExists(false); setGeminiKey("");
      toast({ title: "API Key eliminada" });
    } else {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "gemini_api_key", value: trimmed, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { setGeminiKeyExists(true); toast({ title: "Guardado" }); }
    }
    setSavingKey(false);
  };

  // Bolivia week info
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const boliviaNow = new Date(utcNow + boliviaOffset * 60000);

  // Period status helpers
  const openPeriods = periods.filter((p) => p.status === "open");
  const closedPeriods = periods.filter((p) => p.status === "closed");
  const currentPeriod = openPeriods[0];
  const lastClosed = closedPeriods[closedPeriods.length - 1];
  const lastSettlement = [...periods].reverse().find((p) => p.settlement_generated_at);
  const lastReport = [...periods].reverse().find((p) => p.report_sent_at);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const fmtD = (d: string) => format(new Date(d), "d MMM yyyy", { locale: es });

  const statusBadge = (s: string) => {
    if (s === "active") return <Badge variant="default">Activa</Badge>;
    if (s === "closed") return <Badge variant="secondary">Cerrada</Badge>;
    return <Badge variant="outline">Borrador</Badge>;
  };

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
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">Periodicidad de cierre, procesos del sistema y ajustes generales</p>
      </div>

      {/* Campaign Selector */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Campaña</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar campaña" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.status === "active" ? "Activa" : c.status === "closed" ? "Cerrada" : "Borrador"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCampaign && (
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                {statusBadge(selectedCampaign.status)}
                <span className="text-xs text-muted-foreground">
                  {fmtD(selectedCampaign.start_date)} — {fmtD(selectedCampaign.end_date)}
                </span>
                {selectedCampaign.status === "active" && (
                  <Button variant="destructive" size="sm" onClick={() => setCloseDialog(true)}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cerrar
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCampaign && (
        <>
          {/* Period Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Settings className="h-4 w-4 text-primary" />
                Periodicidad de Cierre / Liquidación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Modo de periodo</Label>
                  <Select value={periodMode} onValueChange={setPeriodMode}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Semanal (7 días)</SelectItem>
                      <SelectItem value="BIWEEKLY">Quincenal (14 días)</SelectItem>
                      <SelectItem value="MONTHLY">Mensual (30 días)</SelectItem>
                      <SelectItem value="CUSTOM_DAYS">Personalizado (N días)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {periodMode === "CUSTOM_DAYS" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cada N días</Label>
                    <Input type="number" min={1} max={365} value={customDays} onChange={(e) => setCustomDays(parseInt(e.target.value) || 7)} className="text-sm" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha ancla</Label>
                  <Input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hora de cierre (Bolivia)</Label>
                  <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={reportOnClose} onCheckedChange={setReportOnClose} id="report-on-close" />
                <Label htmlFor="report-on-close" className="text-xs">Generar y enviar reporte al cerrar periodo</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveConfig} disabled={savingConfig} variant="outline" size="sm">
                  {savingConfig ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Guardar Config
                </Button>
                <Button onClick={generatePeriods} disabled={generatingPeriods} variant="premium" size="sm">
                  {generatingPeriods ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calendar className="h-4 w-4 mr-1" />}
                  Generar Periodos
                </Button>
              </div>
              {periods.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {periods.length} periodos totales · {openPeriods.length} abiertos · {closedPeriods.length} cerrados
                </p>
              )}
            </CardContent>
          </Card>

          {/* System Status Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Clock className="h-4 w-4 text-primary" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Periodo Actual</p>
                  {currentPeriod ? (
                    <p className="font-medium text-sm mt-1">
                      #{currentPeriod.period_number}: {fmtD(currentPeriod.period_start)} — {fmtD(currentPeriod.period_end)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Sin periodos abiertos</p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Último Cierre</p>
                  {lastClosed ? (
                    <p className="font-medium text-sm mt-1">
                      #{lastClosed.period_number} · {lastClosed.closed_at ? format(new Date(lastClosed.closed_at), "d MMM HH:mm", { locale: es }) : "—"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Último Reporte</p>
                  {lastReport?.report_sent_at ? (
                    <p className="font-medium text-sm mt-1">
                      #{lastReport.period_number} · {format(new Date(lastReport.report_sent_at), "d MMM HH:mm", { locale: es })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Bolivia ahora: {format(boliviaNow, "EEEE d 'de' MMMM, HH:mm", { locale: es })} (BOT UTC-4)
              </div>
              <Button
                onClick={() => runSystemProcesses(false)}
                disabled={runningSystem || selectedCampaign.status !== "active"}
                variant="premium"
              >
                {runningSystem ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                Ejecutar Procesos del Sistema
              </Button>
              {selectedCampaign.status !== "active" && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  La campaña no está activa. Los procesos están deshabilitados.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Periods List */}
          {periods.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Periodos ({periods.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {periods.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                        p.status === "open"
                          ? "bg-success/5 border-success/20"
                          : "bg-muted/20 border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{p.period_number}</span>
                        <span className="font-medium">{fmtD(p.period_start)} — {fmtD(p.period_end)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.settlement_generated_at && (
                          <Badge variant="outline" className="text-[9px]">Liquidado</Badge>
                        )}
                        {p.report_sent_at && (
                          <Badge variant="outline" className="text-[9px]">Reportado</Badge>
                        )}
                        <Badge variant={p.status === "open" ? "default" : "secondary"} className="text-[10px]">
                          {p.status === "open" ? "Abierto" : "Cerrado"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

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
                <Switch checked={city.is_active} onCheckedChange={() => toggleCity(city)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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

      {/* Close Campaign Dialog */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cerrar Campaña</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esto bloqueará el registro de nuevas ventas. Los periodos abiertos se cerrarán automáticamente.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Razón (opcional)</Label>
              <Input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Fin de temporada..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={closeCampaign} disabled={closingCampaign}>
              {closingCampaign && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
