import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Download, CheckCircle2, QrCode, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { exportToExcel } from "@/lib/exportExcel";
import { useIsMobile } from "@/hooks/use-mobile";

interface Campaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface CampaignPeriod {
  id: string;
  period_number: number;
  period_start: string;
  period_end: string;
  status: string;
}

interface CommissionRow {
  id: string;
  vendor_id: string;
  full_name: string;
  city: string;
  store_name: string | null;
  units: number;
  amount_bs: number;
  status: string;
  paid_at: string | null;
  payment_proof_url: string | null;
  payment_note: string | null;
  qr_url: string | null;
  qr_expires_at: string | null;
}

interface WeekBreakdown {
  week_num: number;
  start: string;
  end: string;
  units: number;
  amount_bs: number;
  cumulative: number;
}

function fmtBs(n: number) {
  return Math.round(n).toLocaleString("es-BO");
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function CommissionsPage() {
  const isMobile = useIsMobile();
  const { cityNames } = useCities();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignPeriods, setCampaignPeriods] = useState<CampaignPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("custom");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [showZero, setShowZero] = useState(false);
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [weeklyData, setWeeklyData] = useState<Record<string, WeekBreakdown[]>>({});
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  // Pay dialog
  const [payDialog, setPayDialog] = useState(false);
  const [payingRow, setPayingRow] = useState<CommissionRow | null>(null);
  const [payNote, setPayNote] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);
  const [paying, setPaying] = useState(false);

  // QR dialog
  const [qrDialog, setQrDialog] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("campaigns")
      .select("id, name, start_date, end_date, status")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        setCampaigns((data as Campaign[]) || []);
        if (data && data.length > 0) {
          setSelectedCampaign(data[0].id);
          setPeriodStart(data[0].start_date);
          setPeriodEnd(data[0].end_date);
        }
      });
  }, []);

  // Load periods when campaign changes
  useEffect(() => {
    const c = campaigns.find((x) => x.id === selectedCampaign);
    if (c) {
      setPeriodStart(c.start_date);
      setPeriodEnd(c.end_date);
      setSelectedPeriodId("custom");
      // Load campaign periods
      supabase
        .from("campaign_periods")
        .select("id, period_number, period_start, period_end, status")
        .eq("campaign_id", c.id)
        .order("period_number", { ascending: true })
        .then(({ data }) => {
          setCampaignPeriods((data as CampaignPeriod[]) || []);
        });
    }
  }, [selectedCampaign, campaigns]);

  const campaignData = campaigns.find((c) => c.id === selectedCampaign);

  const loadData = useCallback(async () => {
    if (!selectedCampaign || !periodStart || !periodEnd) return;
    setLoading(true);

    // Fetch commission_payments joined with vendor info
    let query = supabase
      .from("commission_payments")
      .select("id, vendor_id, units, amount_bs, status, paid_at, payment_proof_url, payment_note, vendors(full_name, city, store_name, qr_url, qr_expires_at)")
      .eq("campaign_id", selectedCampaign)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd);

    if (selectedCity !== "all") {
      query = query.eq("vendors.city", selectedCity);
    }
    if (statusFilter === "pending" || statusFilter === "paid") {
      query = query.eq("status", statusFilter as "pending" | "paid");
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const mapped: CommissionRow[] = (data || [])
      .filter((r: any) => r.vendors) // filter out null joins when city filter
      .map((r: any) => ({
        id: r.id,
        vendor_id: r.vendor_id,
        full_name: r.vendors.full_name,
        city: r.vendors.city,
        store_name: r.vendors.store_name,
        units: r.units,
        amount_bs: r.amount_bs,
        status: r.status,
        paid_at: r.paid_at,
        payment_proof_url: r.payment_proof_url,
        payment_note: r.payment_note,
        qr_url: r.vendors.qr_url,
        qr_expires_at: r.vendors.qr_expires_at,
      }));

    const filtered = showZero ? mapped : mapped.filter((r) => r.units > 0);
    setRows(filtered);
    setLoading(false);
  }, [selectedCampaign, periodStart, periodEnd, selectedCity, statusFilter, showZero]);

  const handleGenerate = async () => {
    if (!selectedCampaign || !periodStart || !periodEnd) {
      toast({ title: "Error", description: "Selecciona campaña y periodo.", variant: "destructive" });
      return;
    }
    // Clamp period to campaign range
    if (campaignData) {
      if (periodStart < campaignData.start_date || periodEnd > campaignData.end_date) {
        toast({ title: "Aviso", description: "El periodo fue ajustado al rango de la campaña.", variant: "default" });
        if (periodStart < campaignData.start_date) setPeriodStart(campaignData.start_date);
        if (periodEnd > campaignData.end_date) setPeriodEnd(campaignData.end_date);
      }
    }

    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-settlement", {
      body: {
        campaign_id: selectedCampaign,
        period_start: periodStart,
        period_end: periodEnd,
        city: selectedCity !== "all" ? selectedCity : null,
        period_id: selectedPeriodId !== "custom" ? selectedPeriodId : null,
      },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Liquidación generada", description: `${data.upserted} registros procesados, ${data.skipped} ya pagados.` });
      loadData();
    }
    setGenerating(false);
  };

  const handleExport = () => {
    const exportData = rows.map((r) => ({
      Vendedor: r.full_name,
      Ciudad: r.city,
      Tienda: r.store_name || "",
      "Unidades Aprobadas": r.units,
      "Comisión Bs": Math.round(r.amount_bs),
      Estado: r.status === "paid" ? "Pagado" : "Pendiente",
      "Fecha Pago": r.paid_at ? new Date(r.paid_at).toLocaleDateString("es-BO") : "",
    }));
    exportToExcel(exportData, `comisiones_${periodStart}_${periodEnd}`);
  };

  const openPay = (row: CommissionRow) => {
    setPayingRow(row);
    setPayNote("");
    setPayFile(null);
    setPayDialog(true);
  };

  const handlePay = async () => {
    if (!payingRow) return;
    setPaying(true);
    try {
      let proofUrl: string | null = null;
      if (payFile) {
        const ext = payFile.name.split(".").pop();
        const path = `${payingRow.vendor_id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("payment-proofs").upload(path, payFile);
        if (uploadErr) throw uploadErr;
        proofUrl = path;
      }

      const { error } = await supabase
        .from("commission_payments")
        .update({
          status: "paid" as any,
          paid_at: new Date().toISOString(),
          paid_by: (await supabase.auth.getUser()).data.user?.id,
          payment_proof_url: proofUrl,
          payment_note: payNote || null,
        })
        .eq("id", payingRow.id);

      if (error) throw error;

      // Send notification to vendor
      const campaign = campaigns.find((c) => c.id === selectedCampaign);
      supabase.functions.invoke("notify-payment", {
        body: {
          commission_payment_id: payingRow.id,
          vendor_id: payingRow.vendor_id,
          vendor_name: payingRow.full_name,
          campaign_name: campaign?.name || "",
          period_start: periodStart,
          period_end: periodEnd,
          amount_bs: payingRow.amount_bs,
        },
      }).catch((e) => console.error("Notify error:", e));

      toast({ title: "Pago registrado", description: `${payingRow.full_name} marcado como pagado.` });
      setPayDialog(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const openQr = async (row: CommissionRow) => {
    if (!row.qr_url) return;
    setQrLoading(true);
    setQrDialog(true);
    // Get signed URL for private bucket
    const { data } = await supabase.storage.from("vendor-qr").createSignedUrl(row.qr_url, 300);
    setQrUrl(data?.signedUrl || null);
    setQrLoading(false);
  };

  // Weekly breakdown computation
  const loadWeeklyBreakdown = async (vendorId: string) => {
    if (weeklyData[vendorId]) {
      setExpandedVendor(expandedVendor === vendorId ? null : vendorId);
      return;
    }

    const { data: sales } = await supabase
      .from("sales")
      .select("sale_date, bonus_bs")
      .eq("campaign_id", selectedCampaign)
      .eq("vendor_id", vendorId)
      .eq("status", "approved")
      .gte("sale_date", periodStart)
      .lte("sale_date", periodEnd)
      .order("sale_date");

    if (!sales || sales.length === 0) {
      setWeeklyData((prev) => ({ ...prev, [vendorId]: [] }));
      setExpandedVendor(vendorId);
      return;
    }

    // Generate week buckets from periodStart to periodEnd (Mon-Sun)
    const weeks: { start: string; end: string }[] = [];
    const ps = new Date(periodStart + "T12:00:00-04:00");
    const pe = new Date(periodEnd + "T12:00:00-04:00");
    // Find first Monday >= periodStart
    let cursor = new Date(ps);
    const day = cursor.getDay();
    const diffToMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    if (diffToMonday > 0 && day !== 1) cursor.setDate(cursor.getDate() + diffToMonday);
    // If periodStart is before that Monday, add partial week
    if (ps < cursor) {
      const partialEnd = new Date(cursor);
      partialEnd.setDate(partialEnd.getDate() - 1);
      weeks.push({ start: periodStart, end: partialEnd.toISOString().split("T")[0] });
    }
    while (cursor <= pe) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const endStr = weekEnd > pe ? periodEnd : weekEnd.toISOString().split("T")[0];
      weeks.push({ start: cursor.toISOString().split("T")[0], end: endStr });
      cursor.setDate(cursor.getDate() + 7);
    }

    let cumulative = 0;
    const breakdown: WeekBreakdown[] = weeks.map((w, i) => {
      const weekSales = sales.filter((s) => s.sale_date >= w.start && s.sale_date <= w.end);
      const units = weekSales.length;
      const amount = weekSales.reduce((sum, s) => sum + (Number(s.bonus_bs) || 0), 0);
      cumulative += amount;
      return { week_num: i + 1, start: w.start, end: w.end, units, amount_bs: Math.round(amount), cumulative: Math.round(cumulative) };
    });

    setWeeklyData((prev) => ({ ...prev, [vendorId]: breakdown }));
    setExpandedVendor(vendorId);
  };

  const qrStatus = (row: CommissionRow) => {
    if (!row.qr_url) return null;
    if (!row.qr_expires_at) return "vigente";
    return new Date(row.qr_expires_at) > new Date() ? "vigente" : "vencido";
  };

  const totalUnits = rows.reduce((s, r) => s + r.units, 0);
  const totalBs = rows.reduce((s, r) => s + r.amount_bs, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Comisiones / Pagos
          </h1>
          <p className="text-sm text-muted-foreground">Liquidación y seguimiento de pagos a vendedores</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaña *</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Periodo</Label>
              <Select value={selectedPeriodId} onValueChange={(v) => {
                setSelectedPeriodId(v);
                if (v !== "custom") {
                  const p = campaignPeriods.find((p) => p.id === v);
                  if (p) { setPeriodStart(p.period_start); setPeriodEnd(p.period_end); }
                }
              }}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Rango personalizado</SelectItem>
                  {campaignPeriods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.period_number} ({fmtDate(p.period_start)} — {fmtDate(p.period_end)}) {p.status === "closed" ? "✓" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ciudad</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cityNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setSelectedPeriodId("custom"); }} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setSelectedPeriodId("custom"); }} className="text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estado pago</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-sm w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <Switch checked={showZero} onCheckedChange={setShowZero} id="show-zero" />
              <Label htmlFor="show-zero" className="text-xs">Mostrar con 0</Label>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <Switch checked={showWeekly} onCheckedChange={setShowWeekly} id="show-weekly" />
              <Label htmlFor="show-weekly" className="text-xs">Desglose semanal</Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={generating} variant="premium">
              {generating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Generar Liquidación
            </Button>
            <Button onClick={loadData} disabled={loading} variant="outline">
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Consultar
            </Button>
            <Button onClick={handleExport} variant="outline" disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
          </div>
          {campaignData && (periodStart < campaignData.start_date || periodEnd > campaignData.end_date) && (
            <p className="text-xs text-warning">⚠ El periodo excede el rango de campaña ({fmtDate(campaignData.start_date)} — {fmtDate(campaignData.end_date)})</p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Vendedores</p><p className="text-2xl font-bold font-display">{rows.length}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Unidades</p><p className="text-2xl font-bold font-display">{totalUnits}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Bs</p><p className="text-2xl font-bold font-display text-primary">Bs {fmtBs(totalBs)}</p></CardContent></Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              Genera una liquidación o consulta un periodo con datos.
            </div>
          ) : isMobile ? (
            /* Mobile card layout */
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">{r.city} · {r.store_name || "—"}</p>
                    </div>
                    <Badge variant={r.status === "paid" ? "default" : "secondary"}>
                      {r.status === "paid" ? "Pagado" : "Pendiente"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{r.units} uds</span>
                    <span className="font-bold text-primary">Bs {fmtBs(r.amount_bs)}</span>
                  </div>
                  <div className="flex gap-2">
                    {r.status === "pending" && r.units > 0 && (
                      <Button size="sm" variant="outline" onClick={() => openPay(r)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pagar
                      </Button>
                    )}
                    {r.qr_url && (
                      <Button size="sm" variant="ghost" onClick={() => openQr(r)}>
                        <QrCode className="h-3.5 w-3.5 mr-1" /> QR
                      </Button>
                    )}
                    {showWeekly && (
                      <Button size="sm" variant="ghost" onClick={() => loadWeeklyBreakdown(r.vendor_id)}>
                        {expandedVendor === r.vendor_id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                  {showWeekly && expandedVendor === r.vendor_id && weeklyData[r.vendor_id] && (
                    <div className="mt-2 bg-muted/30 rounded-md p-2 text-xs space-y-1">
                      {weeklyData[r.vendor_id].length === 0 ? (
                        <p className="text-muted-foreground">Sin ventas en este periodo</p>
                      ) : weeklyData[r.vendor_id].map((w) => (
                        <div key={w.week_num} className="flex justify-between">
                          <span>S{w.week_num} ({fmtDate(w.start)}–{fmtDate(w.end)})</span>
                          <span>{w.units} uds · Bs {fmtBs(w.amount_bs)} · Acum: Bs {fmtBs(w.cumulative)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Desktop table */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Tienda</TableHead>
                  <TableHead className="text-right">Uds</TableHead>
                  <TableHead className="text-right">Comisión Bs</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <>
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.city}</TableCell>
                      <TableCell>{r.store_name || "—"}</TableCell>
                      <TableCell className="text-right">{r.units}</TableCell>
                      <TableCell className="text-right font-bold">Bs {fmtBs(r.amount_bs)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "paid" ? "default" : "secondary"}>
                          {r.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                        {r.paid_at && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.paid_at).toLocaleDateString("es-BO")}</p>}
                      </TableCell>
                      <TableCell>
                        {r.qr_url ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openQr(r)}>
                            <QrCode className="h-3.5 w-3.5 mr-1" />
                            <Badge variant={qrStatus(r) === "vigente" ? "default" : "destructive"} className="text-[9px] px-1">
                              {qrStatus(r) === "vigente" ? "OK" : "Venc."}
                            </Badge>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status === "pending" && r.units > 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPay(r)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pagar
                            </Button>
                          )}
                          {r.payment_proof_url && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                              const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(r.payment_proof_url!, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                            }}>
                              Comprobante
                            </Button>
                          )}
                          {showWeekly && (
                            <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => loadWeeklyBreakdown(r.vendor_id)}>
                              {expandedVendor === r.vendor_id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {showWeekly && expandedVendor === r.vendor_id && weeklyData[r.vendor_id] && (
                      <TableRow key={`${r.id}-weekly`} className="bg-muted/20">
                        <TableCell colSpan={8} className="py-2 px-6">
                          {weeklyData[r.vendor_id].length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin ventas en este periodo</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left py-1">#Sem</th>
                                  <th className="text-left py-1">Rango</th>
                                  <th className="text-right py-1">Uds</th>
                                  <th className="text-right py-1">Bs</th>
                                  <th className="text-right py-1">Acumulado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {weeklyData[r.vendor_id].map((w) => (
                                  <tr key={w.week_num}>
                                    <td className="py-0.5">S{w.week_num}</td>
                                    <td className="py-0.5">{fmtDate(w.start)} — {fmtDate(w.end)}</td>
                                    <td className="text-right py-0.5">{w.units}</td>
                                    <td className="text-right py-0.5">Bs {fmtBs(w.amount_bs)}</td>
                                    <td className="text-right py-0.5 font-medium">Bs {fmtBs(w.cumulative)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Marcar como pagado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm"><strong>{payingRow?.full_name}</strong></p>
              <p className="text-xs text-muted-foreground">{payingRow?.city} · {payingRow?.store_name || "—"}</p>
              <p className="text-lg font-bold text-primary mt-2">Bs {fmtBs(payingRow?.amount_bs || 0)}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comprobante de pago</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setPayFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nota (opcional)</Label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Transferencia #..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={paying}>
              {paying && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialog} onOpenChange={setQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR de Cobro</DialogTitle></DialogHeader>
          {qrLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : qrUrl ? (
            <img src={qrUrl} alt="QR de cobro" className="w-full rounded-lg" />
          ) : (
            <p className="text-sm text-muted-foreground text-center p-4">No se pudo cargar el QR</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
