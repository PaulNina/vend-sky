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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Loader2, Package, ShieldCheck, BarChart3, Users, Calendar,
  Clock, Brain, ArrowRight, MapPin, Key, Eye, EyeOff, Save, Mail, Zap,
  Play, AlertTriangle, CheckCircle2, Settings, XCircle, Download, Database, HardDrive, Globe,
  Activity, Server, RefreshCw, Wifi, WifiOff, HardDriveDownload
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCities, type City } from "@/hooks/useCities";
import CityGroupsSection from "@/components/admin/CityGroupsSection";
import LandingConfigSection from "@/components/admin/LandingConfigSection";
import * as XLSX from "xlsx";

// --- Backup helpers ---

const BACKUP_TABLES = [
  { key: "campaigns", label: "Campañas" },
  { key: "campaign_periods", label: "Periodos de Campaña" },
  { key: "products", label: "Productos" },
  { key: "serials", label: "Seriales" },
  { key: "vendors", label: "Vendedores" },
  { key: "vendor_campaign_enrollments", label: "Inscripciones de Vendedor" },
  { key: "sales", label: "Ventas" },
  { key: "sale_attachments", label: "Adjuntos de Venta" },
  { key: "reviews", label: "Revisiones" },
  { key: "commission_payments", label: "Pagos de Comisión" },
  { key: "cities", label: "Ciudades" },
  { key: "city_groups", label: "Grupos de Ciudad" },
  { key: "city_group_members", label: "Miembros de Grupo" },
  { key: "report_recipients", label: "Destinatarios de Reporte" },
  { key: "restricted_serials", label: "Seriales Restringidos" },
  { key: "user_profiles", label: "Perfiles de Usuario" },
  { key: "user_roles", label: "Roles de Usuario" },
  { key: "app_settings", label: "Configuración" },
  { key: "email_templates", label: "Plantillas de Email" },
  { key: "notifications", label: "Notificaciones" },
  { key: "admin_audit_logs", label: "Logs de Auditoría" },
  { key: "supervisor_audits", label: "Auditorías de Supervisor" },
  { key: "vendor_blocks", label: "Bloqueos de Vendedor" },
  { key: "vendor_store_history", label: "Historial de Tienda" },
] as const;

type BackupTableKey = typeof BACKUP_TABLES[number]["key"];

async function fetchAllRows(table: string): Promise<Record<string, any>[]> {
  const PAGE_SIZE = 1000;
  let allRows: Record<string, any>[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await (supabase.from(table as any) as any)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Error en ${table}: ${error.message}`);
    const rows = data || [];
    allRows = allRows.concat(rows);
    hasMore = rows.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allRows;
}

async function fetchTableCount(table: string): Promise<number> {
  const { count, error } = await (supabase.from(table as any) as any)
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count || 0;
}

// --- Interfaces ---

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

  // Backup state
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  // System health state
  const [healthChecks, setHealthChecks] = useState<{
    database: "loading" | "ok" | "error";
    auth: "loading" | "ok" | "error";
    storage: "loading" | "ok" | "error";
    edgeFunctions: "loading" | "ok" | "error";
  }>({ database: "loading", auth: "loading", storage: "loading", edgeFunctions: "loading" });
  const [systemStats, setSystemStats] = useState<{
    totalUsers: number;
    totalSales: number;
    totalSerials: number;
    pendingReviews: number;
    lastAuditLog: string | null;
  }>({ totalUsers: 0, totalSales: 0, totalSerials: 0, pendingReviews: 0, lastAuditLog: null });
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Reset state
  const [resetDialog, setResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  // Email config state
  const [emailProvider, setEmailProvider] = useState<"resend" | "smtp">("resend");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  // Period config form
  const [periodMode, setPeriodMode] = useState("WEEKLY");
  const [customDays, setCustomDays] = useState<number>(14);
  const [anchorDate, setAnchorDate] = useState("");
  const [closeTime, setCloseTime] = useState("23:59");
  const [reportOnClose, setReportOnClose] = useState(true);

  // Feature flags
  const [enableCampaignCompare, setEnableCampaignCompare] = useState(true);
  const [savingCampaignCompare, setSavingCampaignCompare] = useState(false);
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [
      campRes,
      prodCount,
      serialCount,
      vendorCount,
      recipientCount,
      settingRes,
      compareSettingRes,
      emailSettingsRes,
    ] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("serials").select("id", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("report_recipients").select("id", { count: "exact", head: true }),
      supabase.from("app_settings").select("value").eq("key", "gemini_api_key").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "enable_campaign_compare").maybeSingle(),
      supabase.from("app_settings").select("key, value").in("key", [
        "email_provider",
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_password",
        "smtp_from_email",
        "smtp_secure",
      ]),
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

    if (compareSettingRes.data?.value != null) {
      setEnableCampaignCompare(compareSettingRes.data.value === "true");
    }
    // Load email settings
    const emailMap: Record<string, string> = {};
    for (const s of emailSettingsRes.data || []) {
      emailMap[s.key] = s.value;
    }
    if (emailMap["email_provider"]) setEmailProvider(emailMap["email_provider"] as "resend" | "smtp");
    if (emailMap["smtp_host"]) setSmtpHost(emailMap["smtp_host"]);
    if (emailMap["smtp_port"]) setSmtpPort(emailMap["smtp_port"]);
    if (emailMap["smtp_user"]) setSmtpUser(emailMap["smtp_user"]);
    if (emailMap["smtp_password"]) setSmtpPassword(emailMap["smtp_password"]);
    if (emailMap["smtp_from_email"]) setSmtpFromEmail(emailMap["smtp_from_email"]);
    if (emailMap["smtp_secure"] !== undefined) setSmtpSecure(emailMap["smtp_secure"] === "true");

    const active = camps.find((c) => c.status === "active") || camps[0];
    if (active) {
      setSelectedCampaignId(active.id);
      syncConfigForm(active);
    }
    setLoading(false);
  };

  const saveEnableCampaignCompare = async (next: boolean) => {
    setEnableCampaignCompare(next);
    setSavingCampaignCompare(true);

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "enable_campaign_compare", value: String(next), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    if (error) {
      setEnableCampaignCompare((prev) => !prev);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }

    setSavingCampaignCompare(false);
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

    const newPeriods: { period_number: number; period_start: string; period_end: string }[] = [];
    let cursor = new Date(anchor);
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

    await supabase
      .from("campaign_periods")
      .delete()
      .eq("campaign_id", selectedCampaign.id)
      .eq("status", "open");

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

  // --- Email config functions ---

  const saveEmailConfig = async () => {
    setSavingEmail(true);
    const settings = [
      { key: "email_provider", value: emailProvider },
      { key: "smtp_host", value: smtpHost },
      { key: "smtp_port", value: smtpPort },
      { key: "smtp_user", value: smtpUser },
      { key: "smtp_password", value: smtpPassword },
      { key: "smtp_from_email", value: smtpFromEmail },
      { key: "smtp_secure", value: smtpSecure ? "true" : "false" },
    ];

    for (const s of settings) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: s.key, value: s.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSavingEmail(false);
        return;
      }
    }
    toast({ title: "Configuración de email guardada" });
    setSavingEmail(false);
  };

  const sendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      toast({ title: "Ingresa un email de prueba", variant: "destructive" });
      return;
    }
    setTestingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: [testEmailAddress.trim()],
          subject: "Prueba de correo - Bono Vendedor SKYWORTH",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#c8a45a;">✅ Correo de prueba exitoso</h2>
            <p>Si puedes leer este mensaje, la configuración de correo electrónico está funcionando correctamente.</p>
            <p style="color:#999;font-size:12px;margin-top:20px;">Proveedor: ${emailProvider.toUpperCase()}</p>
            <p style="color:#999;font-size:12px;">— Equipo Skyworth</p>
          </div>`,
          from_name: "Skyworth Bonos",
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Email de prueba enviado", description: `Enviado a ${testEmailAddress} vía ${data.provider?.toUpperCase() || emailProvider.toUpperCase()}` });
      } else {
        toast({ title: "Error al enviar", description: "Verifica la configuración del proveedor.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setTestingEmail(false);
  };

  // --- Backup functions ---

  const loadTableCounts = async () => {
    setLoadingCounts(true);
    const results: Record<string, number> = {};
    // Fetch counts in parallel batches of 6
    for (let i = 0; i < BACKUP_TABLES.length; i += 6) {
      const batch = BACKUP_TABLES.slice(i, i + 6);
      const batchResults = await Promise.all(
        batch.map((t) => fetchTableCount(t.key))
      );
      batch.forEach((t, idx) => {
        results[t.key] = batchResults[idx];
      });
    }
    setTableCounts(results);
    setLoadingCounts(false);
  };

  const exportSingleTable = async (tableKey: string, label: string) => {
    setExportingTable(tableKey);
    try {
      const rows = await fetchAllRows(tableKey);
      if (rows.length === 0) {
        toast({ title: "Sin datos", description: `La tabla ${label} está vacía.` });
        return;
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31));
      XLSX.writeFile(wb, `backup_${tableKey}_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Exportado", description: `${rows.length} registros de ${label}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setExportingTable(null);
    }
  };

  // --- System health functions ---
  const runHealthChecks = async () => {
    setLoadingHealth(true);
    setHealthChecks({ database: "loading", auth: "loading", storage: "loading", edgeFunctions: "loading" });

    // Database check
    const dbCheck = supabase.from("app_settings").select("key", { count: "exact", head: true }).limit(1);
    
    // Auth check
    const authCheck = supabase.auth.getSession();
    
    // Storage check (try to list buckets - will fail gracefully if no access)
    const storageCheck = supabase.storage.listBuckets();

    // Edge function check - we intentionally pass an invalid campaign_id
    // If we get a 404 with "Campaign not found", it means the function IS working
    // (it validated input and responded correctly). Only network/deploy failures are errors.
    const edgeCheck = supabase.functions.invoke("run-system-processes", {
      body: { dry_run: true, campaign_id: "00000000-0000-0000-0000-000000000000" },
    }).then((res) => {
      // Function responded - check if it's a business logic error (OK) vs deployment error
      if (res.error) {
        const errMsg = res.error.message || "";
        // "Campaign not found" means function is deployed and working correctly
        if (errMsg.includes("Campaign not found") || errMsg.includes("404")) {
          return { ok: true };
        }
        // Connection errors, 500s, etc. = real problems
        return { ok: false, error: res.error };
      }
      return { ok: true };
    }).catch(() => ({ ok: false, error: { message: "Edge function unavailable" } }));

    const [dbRes, authRes, storageRes, edgeRes] = await Promise.all([dbCheck, authCheck, storageCheck, edgeCheck]);

    setHealthChecks({
      database: dbRes.error ? "error" : "ok",
      auth: authRes.error ? "error" : "ok",
      storage: storageRes.error ? "error" : "ok",
      edgeFunctions: (edgeRes as any).ok ? "ok" : "error",
    });

    // Load system stats
    const [usersCount, salesCount, serialsCount, pendingCount, lastAudit] = await Promise.all([
      supabase.from("user_profiles").select("*", { count: "exact", head: true }),
      supabase.from("sales").select("*", { count: "exact", head: true }),
      supabase.from("serials").select("*", { count: "exact", head: true }),
      supabase.from("sales").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("admin_audit_logs").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);

    setSystemStats({
      totalUsers: usersCount.count || 0,
      totalSales: salesCount.count || 0,
      totalSerials: serialsCount.count || 0,
      pendingReviews: pendingCount.count || 0,
      lastAuditLog: lastAudit.data?.[0]?.created_at || null,
    });

    setLoadingHealth(false);
  };

  const exportAllTables = async () => {
    setExportingAll(true);
    try {
      const wb = XLSX.utils.book_new();
      let totalRows = 0;

      for (const table of BACKUP_TABLES) {
        try {
          const rows = await fetchAllRows(table.key);
          const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ "sin_datos": "" }]);
          XLSX.utils.book_append_sheet(wb, ws, table.label.substring(0, 31));
          totalRows += rows.length;
        } catch (err: any) {
          // Add error sheet
          const ws = XLSX.utils.json_to_sheet([{ error: err.message }]);
          XLSX.utils.book_append_sheet(wb, ws, table.label.substring(0, 31));
        }
      }

      XLSX.writeFile(wb, `backup_completo_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Backup completo", description: `${totalRows.toLocaleString()} registros exportados en ${BACKUP_TABLES.length} tablas.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setExportingAll(false);
    }
  };

  // --- Reset system function ---
  const executeReset = async () => {
    if (resetConfirmText !== "RESET TOTAL") {
      toast({ title: "Texto de confirmación incorrecto", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Sesión expirada");

      const { data, error } = await supabase.functions.invoke("reset-system", {
        headers: { Authorization: `Bearer ${token}` },
        body: { confirm_text: "RESET TOTAL" },
      });

      if (error) throw error;

      toast({
        title: "✅ Sistema reiniciado",
        description: "Todos los datos transaccionales han sido eliminados.",
      });
      setResetDialog(false);
      setResetConfirmText("");
      loadData();
      runHealthChecks();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setResetting(false);
  };

  // Bolivia week info
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const boliviaNow = new Date(utcNow + boliviaOffset * 60000);

  // Period status helpers
  const openPeriods = periods.filter((p) => p.status === "open");
  const closedPeriods2 = periods.filter((p) => p.status === "closed");
  const currentPeriod = openPeriods[0];
  const lastClosed = closedPeriods2[closedPeriods2.length - 1];
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

  const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">Periodicidad de cierre, procesos del sistema y ajustes generales</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="general" className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Landing
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-1.5" onClick={() => { if (Object.keys(tableCounts).length === 0) loadTableCounts(); }}>
            <HardDrive className="h-3.5 w-3.5" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1.5" onClick={() => { if (!loadingHealth && healthChecks.database === "loading") runHealthChecks(); }}>
            <Activity className="h-3.5 w-3.5" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8 mt-6">
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

          {/* Feature flags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Zap className="h-4 w-4 text-primary" />
                Funcionalidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Comparador de Campañas</p>
                  <p className="text-xs text-muted-foreground">
                    Muestra/oculta la opción “Comparar Campañas” en el panel de administración.
                  </p>
                </div>
                <Switch
                  id="enable-campaign-compare"
                  checked={enableCampaignCompare}
                  onCheckedChange={saveEnableCampaignCompare}
                  disabled={savingCampaignCompare}
                />
              </div>
              {savingCampaignCompare && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </p>
              )}
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
                      {periods.length} periodos totales · {openPeriods.length} abiertos · {closedPeriods2.length} cerrados
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Bolivia: {format(boliviaNow, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => runSystemProcesses(false)}
                      disabled={runningSystem || selectedCampaign.status !== "active"}
                    >
                      {runningSystem ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                      Ejecutar manualmente
                    </Button>
                  </div>
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
        </TabsContent>

        {/* Landing Page Tab */}
        <TabsContent value="landing" className="space-y-6 mt-6">
          <LandingConfigSection />
        </TabsContent>

        {/* Email Configuration Tab */}
        <TabsContent value="email" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Mail className="h-4 w-4 text-primary" />
                Proveedor de Correo Electrónico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-muted-foreground">
                Configura cómo se envían los correos del sistema (reportes, notificaciones de pago, etc.).
                Puedes usar <strong>Resend</strong> (API Key configurada como secreto del servidor) o un servidor <strong>SMTP</strong> propio.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs">Proveedor</Label>
                <Select value={emailProvider} onValueChange={(v) => setEmailProvider(v as "resend" | "smtp")}>
                  <SelectTrigger className="text-sm max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend (API)</SelectItem>
                    <SelectItem value="smtp">SMTP (Servidor propio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {emailProvider === "resend" && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Resend usa la API Key configurada como secreto del servidor (<code className="text-[10px] bg-muted px-1 py-0.5 rounded">RESEND_API_KEY</code>).
                    Para cambiarla, contacta al administrador del servidor.
                  </p>
                  <Badge variant="outline" className="text-success border-success/40 bg-success/5">
                    API Key configurada en servidor
                  </Badge>
                </div>
              )}

              {emailProvider === "smtp" && (
                <div className="space-y-4 rounded-lg border border-border/50 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Servidor SMTP</Label>
                      <Input
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Puerto</Label>
                      <Input
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Usuario</Label>
                      <Input
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="usuario@dominio.com"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contraseña</Label>
                      <div className="relative">
                        <Input
                          type={showSmtpPassword ? "text" : "password"}
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          placeholder="••••••••"
                          className="text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email remitente</Label>
                      <Input
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        placeholder="noreply@empresa.com"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} id="smtp-secure" />
                      <Label htmlFor="smtp-secure" className="text-xs">TLS / SSL</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={saveEmailConfig} disabled={savingEmail} variant="premium" size="sm">
                  {savingEmail ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Zap className="h-4 w-4 text-primary" />
                Enviar Correo de Prueba
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Envía un correo de prueba para verificar que la configuración del proveedor es correcta.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="text-sm max-w-xs"
                />
                <Button onClick={sendTestEmail} disabled={testingEmail} variant="outline" size="sm">
                  {testingEmail ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                  Enviar Prueba
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6 mt-6">
          {/* Backup Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Database className="h-4 w-4 text-primary" />
                Backup del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exporta todos los datos del sistema en un archivo Excel con una hoja por cada tabla.
                Las tablas con muchos registros se descargan con paginación automática.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={exportAllTables} disabled={exportingAll} variant="premium" size="default">
                  {exportingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {exportingAll ? "Exportando..." : "Exportar Todo"}
                </Button>
                <Button onClick={loadTableCounts} disabled={loadingCounts} variant="outline" size="sm">
                  {loadingCounts ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-1" />}
                  Actualizar conteos
                </Button>
                {totalRecords > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalRecords.toLocaleString()} registros totales
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BACKUP_TABLES.map((table) => {
              const count = tableCounts[table.key];
              const isExporting = exportingTable === table.key;
              return (
                <Card key={table.key} className="hover:border-primary/20 transition-colors">
                  <CardContent className="py-3.5 px-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{table.label}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{table.key}</p>
                      {count !== undefined && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {count.toLocaleString()} registros
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => exportSingleTable(table.key, table.label)}
                      disabled={isExporting || exportingAll}
                    >
                      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6 mt-6">
          {/* Health Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Activity className="h-4 w-4 text-primary" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Diagnóstico de los servicios principales del sistema.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "database", label: "Base de Datos", icon: Database },
                  { key: "auth", label: "Autenticación", icon: ShieldCheck },
                  { key: "storage", label: "Almacenamiento", icon: HardDriveDownload },
                  { key: "edgeFunctions", label: "Funciones", icon: Server },
                ].map((service) => {
                  const status = healthChecks[service.key as keyof typeof healthChecks];
                  return (
                    <div
                      key={service.key}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        status === "ok"
                          ? "bg-success/5 border-success/30"
                          : status === "error"
                          ? "bg-destructive/5 border-destructive/30"
                          : "bg-muted/20 border-border/50"
                      }`}
                    >
                      <service.icon
                        className={`h-6 w-6 mx-auto mb-2 ${
                          status === "ok"
                            ? "text-success"
                            : status === "error"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      />
                      <p className="text-xs font-medium">{service.label}</p>
                      <div className="mt-1">
                        {status === "loading" ? (
                          <Badge variant="outline" className="text-[10px]">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Verificando
                          </Badge>
                        ) : status === "ok" ? (
                          <Badge variant="outline" className="text-[10px] text-success border-success/40 bg-success/10">
                            <Wifi className="h-3 w-3 mr-1" />
                            Conectado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 bg-destructive/10">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button onClick={runHealthChecks} disabled={loadingHealth} variant="outline" size="sm">
                {loadingHealth ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Verificar Conexiones
              </Button>
            </CardContent>
          </Card>

          {/* System Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <BarChart3 className="h-4 w-4 text-primary" />
                Estadísticas del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-2xl font-bold text-primary">{systemStats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Usuarios Registrados</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-2xl font-bold text-primary">{systemStats.totalSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ventas Totales</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-2xl font-bold text-primary">{systemStats.totalSerials.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Seriales en Sistema</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-2xl font-bold text-primary">{systemStats.pendingReviews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Revisiones Pendientes</p>
                </div>
              </div>
              {systemStats.lastAuditLog && (
                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Última acción de auditoría: {format(new Date(systemStats.lastAuditLog), "d MMM yyyy, HH:mm", { locale: es })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Server className="h-4 w-4 text-primary" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Versión de la Aplicación</span>
                  <Badge variant="outline">1.0.0</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Entorno</span>
                  <Badge variant="secondary">Producción</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Zona Horaria</span>
                  <span className="font-mono text-xs">America/La_Paz (UTC-4)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Tablas en Backup</span>
                  <span className="font-mono text-xs">{BACKUP_TABLES.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Hora del Servidor (Bolivia)</span>
                  <span className="font-mono text-xs">{format(boliviaNow, "d MMM yyyy, HH:mm:ss", { locale: es })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reset System */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-display text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Zona de Peligro — Reiniciar Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Elimina <strong>todos los datos transaccionales</strong> del sistema: ventas, revisiones, comisiones,
                auditorías, inscripciones, notificaciones y bloqueos. Los seriales se reinician a "disponible".
                Las campañas se reactivan. <strong>Vendedores, productos, seriales y configuración se conservan.</strong>
              </p>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs text-destructive font-medium">⚠️ Esta acción es irreversible. Se recomienda hacer un backup completo antes de continuar.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setResetConfirmText(""); setResetDialog(true); }}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Reiniciar Sistema a Cero
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Reset System Dialog */}
      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-destructive">⚠️ Reiniciar Sistema a Cero</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta acción eliminará permanentemente todos los datos transaccionales:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Todas las ventas y adjuntos</li>
              <li>Todas las revisiones y auditorías</li>
              <li>Todos los pagos de comisión</li>
              <li>Todas las inscripciones de vendedores</li>
              <li>Todas las notificaciones</li>
              <li>Todos los bloqueos e historial de tiendas</li>
              <li>Todos los periodos de campaña</li>
              <li>Los seriales se reiniciarán a "disponible"</li>
              <li>Las campañas se reactivarán</li>
            </ul>
            <div className="space-y-1.5">
              <Label className="text-xs">Escribe <strong>RESET TOTAL</strong> para confirmar:</Label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET TOTAL"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={executeReset}
              disabled={resetting || resetConfirmText !== "RESET TOTAL"}
            >
              {resetting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reiniciar Todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
