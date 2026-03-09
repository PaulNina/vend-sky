import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, BarChart3, TrendingUp, CalendarIcon, Filter, Users, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { exportToExcel, exportMultiSheet, buildSummaryRows } from "@/lib/exportExcel";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

interface Campaign { id: string; name: string; start_date: string; end_date: string; }

interface WeekRow {
  week_start: string; week_end: string;
  total_units: number; approved_units: number; pending_units: number; rejected_units: number; observed_units: number;
  total_bonus_bs: number; total_points: number;
}

interface CityRow {
  city: string; vendor_count: number; total_units: number;
  approved_units: number; total_bonus_bs: number; total_points: number;
}

interface ProductRow {
  product_name: string; model_code: string; total_units: number; total_bonus_bs: number;
}

interface VendorRow {
  vendor_id: string; full_name: string; store_name: string; city: string;
  total_units: number; approved_units: number; rejected_units: number; observed_units: number; pending_units: number;
  bonus_bs: number; points: number; approval_rate: number;
}

interface DailyRow {
  date: string; total: number; approved: number; pending: number; rejected: number; observed: number; bonus_bs: number;
}

interface SerialRow {
  product_name: string; model_code: string; total: number; used: number; available: number; blocked: number; usage_pct: number;
}

type QuickRange = "all" | "week" | "month" | "year" | "custom";

export default function MetricsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [weeklyData, setWeeklyData] = useState<WeekRow[]>([]);
  const [cityData, setCityData] = useState<CityRow[]>([]);
  const [productData, setProductData] = useState<ProductRow[]>([]);
  const [vendorData, setVendorData] = useState<VendorRow[]>([]);
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [serialData, setSerialData] = useState<SerialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledCount, setEnrolledCount] = useState(0);

  // Date range state
  const [quickRange, setQuickRange] = useState<QuickRange>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // City filter state
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("campaigns").select("id, name, start_date, end_date").order("created_at", { ascending: false }).then(({ data }) => {
      if (data && data.length > 0) { setCampaigns(data); setSelectedCampaign(data[0].id); }
    });
  }, []);

  // Compute effective date range
  const effectiveDates = useMemo(() => {
    const now = new Date();
    switch (quickRange) {
      case "week": return { start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"), end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd") };
      case "month": return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
      case "year": return { start: format(startOfYear(now), "yyyy-MM-dd"), end: format(endOfYear(now), "yyyy-MM-dd") };
      case "custom": return {
        start: dateFrom ? format(dateFrom, "yyyy-MM-dd") : null,
        end: dateTo ? format(dateTo, "yyyy-MM-dd") : null,
      };
      default: return { start: null, end: null };
    }
  }, [quickRange, dateFrom, dateTo]);

  // Load available cities
  useEffect(() => {
    supabase.from("cities").select("name").eq("is_active", true).order("display_order").then(({ data }) => {
      setAvailableCities(data?.map(c => c.name) || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);
    loadMetrics();
  }, [selectedCampaign, effectiveDates, selectedCity]);

  const loadMetrics = async () => {
    // Load enrollment count (filtered by city if selected)
    let enrollQuery = supabase.from("vendor_campaign_enrollments").select("id, vendors!inner(city)", { count: "exact", head: true }).eq("campaign_id", selectedCampaign).eq("status", "active");
    if (selectedCity !== "all") enrollQuery = enrollQuery.eq("vendors.city", selectedCity);
    enrollQuery.then(({ count }) => setEnrolledCount(count || 0));

    // Load vendors for this campaign (via enrollments)
    const vendorMap = new Map<string, { full_name: string; store_name: string; city: string }>();
    {
      let from = 0;
      const batchSize = 1000;
      while (true) {
        let q = supabase
          .from("vendor_campaign_enrollments")
          .select("vendor_id, vendors!inner(full_name, store_name, city)")
          .eq("campaign_id", selectedCampaign)
          .eq("status", "active")
          .range(from, from + batchSize - 1);
        if (selectedCity !== "all") q = q.eq("vendors.city", selectedCity);
        const { data: batch } = await q;
        if (!batch || batch.length === 0) break;
        for (const e of batch) {
          const v = e.vendors as any;
          vendorMap.set(e.vendor_id, { full_name: v?.full_name || "", store_name: v?.store_name || "", city: v?.city || "" });
        }
        if (batch.length < batchSize) break;
        from += batchSize;
      }
    }

    // Batch-load all sales
    let allSales: any[] = [];
    const batchSize = 1000;
    let from = 0;
    while (true) {
      let q = supabase
        .from("sales")
        .select("week_start, week_end, status, bonus_bs, points, city, vendor_id, product_id, sale_date, products(name, model_code)")
        .eq("campaign_id", selectedCampaign)
        .order("week_start", { ascending: true })
        .range(from, from + batchSize - 1);

      if (effectiveDates.start) q = q.gte("sale_date", effectiveDates.start);
      if (effectiveDates.end) q = q.lte("sale_date", effectiveDates.end);
      if (selectedCity !== "all") q = q.eq("city", selectedCity);

      const { data: batch } = await q;
      if (!batch || batch.length === 0) break;
      allSales = allSales.concat(batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    const sales = allSales;
    if (sales.length === 0) {
      setWeeklyData([]); setCityData([]); setProductData([]);
      // Still show vendors with 0 sales
      const emptyVendors: VendorRow[] = Array.from(vendorMap.entries()).map(([vid, v]) => ({
        vendor_id: vid, full_name: v.full_name, store_name: v.store_name, city: v.city,
        total_units: 0, approved_units: 0, rejected_units: 0, observed_units: 0, pending_units: 0,
        bonus_bs: 0, points: 0, approval_rate: 0,
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));
      setVendorData(emptyVendors);
      setDailyData([]);
      setLoading(false);
      return;
    }

    // Weekly aggregation
    const weekMap = new Map<string, WeekRow>();
    for (const s of sales) {
      const key = s.week_start;
      const row = weekMap.get(key) || { week_start: s.week_start, week_end: s.week_end, total_units: 0, approved_units: 0, pending_units: 0, rejected_units: 0, observed_units: 0, total_bonus_bs: 0, total_points: 0 };
      row.total_units++;
      if (s.status === "approved") { row.approved_units++; row.total_bonus_bs += Number(s.bonus_bs); row.total_points += Number(s.points); }
      else if (s.status === "pending") { row.pending_units++; }
      else if (s.status === "rejected") { row.rejected_units++; }
      else if (s.status === "observed") { row.observed_units++; }
      weekMap.set(key, row);
    }
    setWeeklyData(Array.from(weekMap.values()));

    // City aggregation
    const cityMap = new Map<string, CityRow & { vendors: Set<string> }>();
    for (const s of sales) {
      const row = cityMap.get(s.city) || { city: s.city, vendor_count: 0, total_units: 0, approved_units: 0, total_bonus_bs: 0, total_points: 0, vendors: new Set<string>() };
      row.total_units++; row.vendors.add(s.vendor_id);
      if (s.status === "approved") { row.approved_units++; row.total_bonus_bs += Number(s.bonus_bs); row.total_points += Number(s.points); }
      cityMap.set(s.city, row);
    }
    setCityData(Array.from(cityMap.values()).map((r) => ({
      city: r.city, vendor_count: r.vendors.size, total_units: r.total_units, approved_units: r.approved_units, total_bonus_bs: r.total_bonus_bs, total_points: r.total_points,
    })).sort((a, b) => b.total_units - a.total_units));

    // Product aggregation
    const prodMap = new Map<string, ProductRow>();
    for (const s of sales) {
      if (s.status !== "approved") continue;
      const pName = (s.products as any)?.name || "—";
      const pCode = (s.products as any)?.model_code || "";
      const key = s.product_id;
      const row = prodMap.get(key) || { product_name: pName, model_code: pCode, total_units: 0, total_bonus_bs: 0 };
      row.total_units++;
      row.total_bonus_bs += Number(s.bonus_bs);
      prodMap.set(key, row);
    }
    setProductData(Array.from(prodMap.values()).sort((a, b) => b.total_units - a.total_units));

    // Vendor aggregation (include all enrolled vendors with 0s)
    const vendorAgg = new Map<string, VendorRow>();
    for (const [vid, v] of vendorMap) {
      vendorAgg.set(vid, {
        vendor_id: vid, full_name: v.full_name, store_name: v.store_name, city: v.city,
        total_units: 0, approved_units: 0, rejected_units: 0, observed_units: 0, pending_units: 0,
        bonus_bs: 0, points: 0, approval_rate: 0,
      });
    }
    for (const s of sales) {
      const existing = vendorAgg.get(s.vendor_id);
      const row = existing || {
        vendor_id: s.vendor_id, full_name: vendorMap.get(s.vendor_id)?.full_name || s.vendor_id.substring(0, 8),
        store_name: vendorMap.get(s.vendor_id)?.store_name || "", city: s.city,
        total_units: 0, approved_units: 0, rejected_units: 0, observed_units: 0, pending_units: 0,
        bonus_bs: 0, points: 0, approval_rate: 0,
      };
      row.total_units++;
      if (s.status === "approved") { row.approved_units++; row.bonus_bs += Number(s.bonus_bs); row.points += Number(s.points); }
      else if (s.status === "rejected") { row.rejected_units++; }
      else if (s.status === "observed") { row.observed_units++; }
      else if (s.status === "pending") { row.pending_units++; }
      vendorAgg.set(s.vendor_id, row);
    }
    const vendorRows = Array.from(vendorAgg.values()).map(v => ({
      ...v,
      approval_rate: v.total_units > 0 ? Math.round((v.approved_units / v.total_units) * 100) : 0,
    })).sort((a, b) => b.approved_units - a.approved_units || b.points - a.points);
    setVendorData(vendorRows);

    // Daily aggregation
    const dayMap = new Map<string, DailyRow>();
    for (const s of sales) {
      const key = s.sale_date;
      const row = dayMap.get(key) || { date: key, total: 0, approved: 0, pending: 0, rejected: 0, observed: 0, bonus_bs: 0 };
      row.total++;
      if (s.status === "approved") { row.approved++; row.bonus_bs += Number(s.bonus_bs); }
      else if (s.status === "pending") { row.pending++; }
      else if (s.status === "rejected") { row.rejected++; }
      else if (s.status === "observed") { row.observed++; }
      dayMap.set(key, row);
    }
    setDailyData(Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)));

    setLoading(false);
  };

  // Load serials data separately (not filtered by date)
  useEffect(() => {
    if (!selectedCampaign) return;
    loadSerials();
  }, [selectedCampaign]);

  const loadSerials = async () => {
    // Load products
    const { data: products } = await supabase.from("products").select("id, name, model_code").eq("is_active", true);
    if (!products) { setSerialData([]); return; }

    // Count serials per product grouped by status using pagination
    const serialCounts = new Map<string, { total: number; used: number; available: number; blocked: number }>();

    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from("serials")
        .select("product_id, status")
        .range(from, from + batchSize - 1);
      if (!batch || batch.length === 0) break;
      for (const s of batch) {
        const pid = s.product_id || "__none__";
        const row = serialCounts.get(pid) || { total: 0, used: 0, available: 0, blocked: 0 };
        row.total++;
        if (s.status === "used") row.used++;
        else if (s.status === "available") row.available++;
        else if (s.status === "blocked") row.blocked++;
        serialCounts.set(pid, row);
      }
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    const rows: SerialRow[] = products
      .map(p => {
        const counts = serialCounts.get(p.id) || { total: 0, used: 0, available: 0, blocked: 0 };
        return {
          product_name: p.name,
          model_code: p.model_code,
          total: counts.total,
          used: counts.used,
          available: counts.available,
          blocked: counts.blocked,
          usage_pct: counts.total > 0 ? Math.round((counts.used / counts.total) * 100) : 0,
        };
      })
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total);

    setSerialData(rows);
  };

  const weeklyWithAccum = useMemo(() => {
    let accumUnits = 0, accumBs = 0;
    return weeklyData.map((w, i) => { accumUnits += w.approved_units; accumBs += w.total_bonus_bs; return { ...w, weekNum: i + 1, accumUnits, accumBs }; });
  }, [weeklyData]);

  const weeklyTotals = useMemo(() => weeklyData.reduce(
    (acc, w) => ({ units: acc.units + w.total_units, approved: acc.approved + w.approved_units, pending: acc.pending + w.pending_units, rejected: acc.rejected + w.rejected_units, observed: acc.observed + w.observed_units, bs: acc.bs + w.total_bonus_bs, pts: acc.pts + w.total_points }),
    { units: 0, approved: 0, pending: 0, rejected: 0, observed: 0, bs: 0, pts: 0 }
  ), [weeklyData]);

  const cityTotals = useMemo(() => cityData.reduce(
    (acc, c) => ({ vendors: acc.vendors + c.vendor_count, units: acc.units + c.total_units, approved: acc.approved + c.approved_units, bs: acc.bs + c.total_bonus_bs, pts: acc.pts + c.total_points }),
    { vendors: 0, units: 0, approved: 0, bs: 0, pts: 0 }
  ), [cityData]);

  const vendorTotals = useMemo(() => vendorData.reduce(
    (acc, v) => ({ total: acc.total + v.total_units, approved: acc.approved + v.approved_units, bs: acc.bs + v.bonus_bs, pts: acc.pts + v.points }),
    { total: 0, approved: 0, bs: 0, pts: 0 }
  ), [vendorData]);

  const serialTotals = useMemo(() => serialData.reduce(
    (acc, s) => ({ total: acc.total + s.total, used: acc.used + s.used, available: acc.available + s.available, blocked: acc.blocked + s.blocked }),
    { total: 0, used: 0, available: 0, blocked: 0 }
  ), [serialData]);

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaign);

  const statusPieData = [
    { name: "Aprobadas", value: weeklyTotals.approved, color: "hsl(142, 76%, 36%)" },
    { name: "Pendientes", value: weeklyTotals.pending, color: "hsl(43, 96%, 56%)" },
    { name: "Rechazadas", value: weeklyTotals.rejected, color: "hsl(0, 72%, 51%)" },
    { name: "Observadas", value: weeklyTotals.observed, color: "hsl(25, 95%, 53%)" },
  ].filter((d) => d.value > 0);

  const exportWeekly = () => {
    exportToExcel(weeklyWithAccum.map((w) => ({
      Semana: w.weekNum, Inicio: w.week_start, Fin: w.week_end, Total: w.total_units, Aprobadas: w.approved_units,
      Pendientes: w.pending_units, Rechazadas: w.rejected_units, Observadas: w.observed_units, "Bono Bs": w.total_bonus_bs, Puntos: w.total_points,
      "Acum. Uds": w.accumUnits, "Acum. Bs": w.accumBs,
    })), "metricas_semanal");
  };

  const exportCity = () => {
    exportToExcel(cityData.map((c) => ({
      Ciudad: c.city, Vendedores: c.vendor_count, Total: c.total_units, Aprobadas: c.approved_units,
      "Bono Bs": c.total_bonus_bs, Puntos: c.total_points,
    })), "metricas_ciudad");
  };

  const exportVendors = () => {
    exportToExcel(vendorData.map((v, i) => ({
      "#": i + 1, Vendedor: v.full_name, Tienda: v.store_name, Ciudad: v.city,
      Total: v.total_units, Aprobadas: v.approved_units, Pendientes: v.pending_units,
      Rechazadas: v.rejected_units, Observadas: v.observed_units,
      "% Aprob.": `${v.approval_rate}%`, "Bono Bs": v.bonus_bs, Puntos: v.points,
    })), "metricas_vendedores");
  };

  const exportDaily = () => {
    exportToExcel(dailyData.map((d) => ({
      Fecha: d.date, Total: d.total, Aprobadas: d.approved, Pendientes: d.pending,
      Rechazadas: d.rejected, Observadas: d.observed, "Bono Bs": d.bonus_bs,
    })), "metricas_diario");
  };

  const exportSerials = () => {
    exportToExcel(serialData.map((s, i) => ({
      "#": i + 1, Producto: s.product_name, Modelo: s.model_code,
      "Total Seriales": s.total, Usados: s.used, Disponibles: s.available, Bloqueados: s.blocked,
      "% Uso": `${s.usage_pct}%`,
    })), "metricas_seriales");
  };

  const exportFullReport = () => {
    const campaignName = activeCampaign?.name || "campaña";
    const dateStr = new Date().toISOString().split("T")[0];

    const summaryData = buildSummaryRows([
      { label: "Campaña", value: campaignName },
      { label: "Período", value: activeCampaign ? `${activeCampaign.start_date} → ${activeCampaign.end_date}` : "" },
      { label: "Fecha de reporte", value: dateStr },
      { label: "", value: "" },
      { label: "Total Ventas", value: weeklyTotals.units },
      { label: "Aprobadas", value: weeklyTotals.approved },
      { label: "Pendientes", value: weeklyTotals.pending },
      { label: "Rechazadas", value: weeklyTotals.rejected },
      { label: "Observadas", value: weeklyTotals.observed },
      { label: "", value: "" },
      { label: "Bono Total (Bs)", value: weeklyTotals.bs },
      { label: "Puntos Totales", value: weeklyTotals.pts },
      { label: "Semanas activas", value: weeklyData.length },
      { label: "Ciudades", value: cityData.length },
      { label: "Vendedores participantes", value: cityTotals.vendors },
      { label: "Inscritos activos", value: enrolledCount },
      { label: "", value: "" },
      { label: "Total Seriales", value: serialTotals.total },
      { label: "Seriales Usados", value: serialTotals.used },
      { label: "Seriales Disponibles", value: serialTotals.available },
    ]);

    const weeklySheet = weeklyWithAccum.map((w) => ({
      "#": w.weekNum, "Inicio": w.week_start, "Fin": w.week_end, "Total": w.total_units,
      "Aprobadas": w.approved_units, "Pendientes": w.pending_units, "Rechazadas": w.rejected_units,
      "Observadas": w.observed_units, "Bono Bs": w.total_bonus_bs, "Puntos": w.total_points,
      "Acum. Uds": w.accumUnits, "Acum. Bs": w.accumBs,
    }));

    const citySheet = cityData.map((c) => ({
      "Ciudad": c.city, "Vendedores": c.vendor_count, "Total Ventas": c.total_units,
      "Aprobadas": c.approved_units, "Bono Bs": c.total_bonus_bs, "Puntos": c.total_points,
      "% Aprobación": c.total_units > 0 ? `${Math.round((c.approved_units / c.total_units) * 100)}%` : "0%",
    }));

    const productSheet = productData.map((p, i) => ({
      "#": i + 1, "Producto": p.product_name, "Modelo": p.model_code, "Unidades": p.total_units,
      "Bono Bs": p.total_bonus_bs,
      "% del Total": weeklyTotals.approved > 0 ? `${Math.round((p.total_units / weeklyTotals.approved) * 100)}%` : "0%",
    }));

    const vendorSheet = vendorData.map((v, i) => ({
      "#": i + 1, "Vendedor": v.full_name, "Tienda": v.store_name, "Ciudad": v.city,
      "Total": v.total_units, "Aprobadas": v.approved_units, "Pendientes": v.pending_units,
      "Rechazadas": v.rejected_units, "Observadas": v.observed_units,
      "% Aprob.": `${v.approval_rate}%`, "Bono Bs": v.bonus_bs, "Puntos": v.points,
    }));

    const dailySheet = dailyData.map((d) => ({
      "Fecha": d.date, "Total": d.total, "Aprobadas": d.approved, "Pendientes": d.pending,
      "Rechazadas": d.rejected, "Observadas": d.observed, "Bono Bs": d.bonus_bs,
    }));

    const serialSheet = serialData.map((s, i) => ({
      "#": i + 1, "Producto": s.product_name, "Modelo": s.model_code,
      "Total Seriales": s.total, "Usados": s.used, "Disponibles": s.available, "Bloqueados": s.blocked,
      "% Uso": `${s.usage_pct}%`,
    }));

    exportMultiSheet(
      [
        { name: "Resumen", data: summaryData },
        { name: "Por Semana", data: weeklySheet },
        { name: "Por Ciudad", data: citySheet },
        { name: "Por Producto", data: productSheet },
        { name: "Vendedores", data: vendorSheet },
        { name: "Tendencia Diaria", data: dailySheet },
        { name: "Seriales", data: serialSheet },
      ],
      `reporte_gerencial_${campaignName.replace(/\s+/g, "_")}_${dateStr}`
    );
  };

  const clearDateRange = () => { setDateFrom(undefined); setDateTo(undefined); setQuickRange("all"); };
  const clearFilters = () => { clearDateRange(); setSelectedCity("all"); };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Métricas & Reportes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Desglose semanal, por ciudad y reportes gerenciales</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="premium" size="sm" onClick={exportFullReport}>
            <Download className="h-4 w-4 mr-1.5" />Reporte Gerencial
          </Button>
        </div>
      </div>

      {/* Campaign info bar */}
      {activeCampaign && (
        <Card className="border-primary/20 bg-gradient-to-r from-card to-primary/5">
          <CardContent className="py-3 px-5 flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaña</span>
              <p className="font-semibold font-display">{activeCampaign.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Período</span>
              <p className="font-medium">{activeCampaign.start_date} → {activeCampaign.end_date}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters: City + Date range */}
      <Card>
        <CardContent className="py-3 px-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ciudad:</span>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Todas las ciudades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCity !== "all" && (
              <Badge variant="secondary" className="text-xs">{selectedCity}</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período:</span>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { value: "all", label: "Todo" },
                { value: "week", label: "Esta semana" },
                { value: "month", label: "Este mes" },
                { value: "year", label: "Este año" },
              ] as { value: QuickRange; label: string }[]).map((opt) => (
                <Button
                  key={opt.value}
                  variant={quickRange === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setQuickRange(opt.value); setDateFrom(undefined); setDateTo(undefined); }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1.5", dateFrom && "border-primary text-primary")}>
                    <CalendarIcon className="h-3 w-3" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setQuickRange("custom"); }} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1.5", dateTo && "border-primary text-primary")}>
                    <CalendarIcon className="h-3 w-3" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setQuickRange("custom"); }} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo || quickRange !== "all" || selectedCity !== "all") && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>Limpiar todo</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Total Ventas</p>
            <p className="text-xl font-bold font-display mt-0.5">{weeklyTotals.units}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-success/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Aprobadas</p>
            <p className="text-xl font-bold font-display mt-0.5 text-success">{weeklyTotals.approved}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Total</p>
            <p className="text-xl font-bold font-display mt-0.5">Bs {weeklyTotals.bs.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Vendedores</p>
            <p className="text-xl font-bold font-display mt-0.5">{cityTotals.vendors}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Users className="h-3 w-3" />Inscritos</p>
            <p className="text-xl font-bold font-display mt-0.5">{enrolledCount}</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1"><TrendingUp className="h-3 w-3" />Semanas</p>
            <p className="text-xl font-bold font-display mt-0.5">{weeklyData.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="city">Por Ciudad</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="vendors">Vendedores</TabsTrigger>
            <TabsTrigger value="daily">Tendencia Diaria</TabsTrigger>
            <TabsTrigger value="serials">Seriales</TabsTrigger>
          </TabsList>

          {/* Overview tab with charts */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* City bar chart */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ventas por Ciudad (Aprobadas)</CardTitle></CardHeader>
                <CardContent>
                  {cityData.length === 0 ? <p className="text-center text-muted-foreground py-8">Sin datos</p> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={cityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 18%)" />
                        <XAxis type="number" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                        <YAxis dataKey="city" type="category" width={100} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                        <Bar dataKey="approved_units" name="Aprobadas" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Status pie */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución de Estados</CardTitle></CardHeader>
                <CardContent>
                  {statusPieData.length === 0 ? <p className="text-center text-muted-foreground py-8">Sin datos</p> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                          {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bono by city */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bono por Ciudad (Bs)</CardTitle></CardHeader>
              <CardContent>
                {cityData.length === 0 ? <p className="text-center text-muted-foreground py-8">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={cityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 18%)" />
                      <XAxis dataKey="city" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`Bs ${v.toLocaleString()}`, "Bono"]} contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      <Bar dataKey="total_bonus_bs" name="Bono Bs" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top 5 products table */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Top Productos (Aprobados)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead><TableHead>Producto</TableHead><TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Bono Bs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productData.slice(0, 5).map((p, i) => (
                      <TableRow key={p.model_code}>
                        <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.product_name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.model_code}</TableCell>
                        <TableCell className="text-right font-bold">{p.total_units}</TableCell>
                        <TableCell className="text-right">Bs {p.total_bonus_bs.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {productData.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly tab */}
          <TabsContent value="weekly" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportWeekly}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sem.</TableHead><TableHead>Período</TableHead>
                      <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Aprob.</TableHead>
                      <TableHead className="text-right">Pend.</TableHead><TableHead className="text-right">Rech.</TableHead>
                      <TableHead className="text-right">Bs</TableHead><TableHead className="text-right">Pts</TableHead>
                      <TableHead className="text-right">Acum. Uds</TableHead><TableHead className="text-right">Acum. Bs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyWithAccum.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">Sin datos para esta campaña</TableCell></TableRow>
                    ) : weeklyWithAccum.map((w) => (
                      <TableRow key={w.week_start}>
                        <TableCell className="font-bold text-primary">{w.weekNum}</TableCell>
                        <TableCell className="text-sm">{w.week_start} → {w.week_end}</TableCell>
                        <TableCell className="text-right font-medium">{w.total_units}</TableCell>
                        <TableCell className="text-right text-success font-medium">{w.approved_units}</TableCell>
                        <TableCell className="text-right text-warning">{w.pending_units}</TableCell>
                        <TableCell className="text-right text-destructive">{w.rejected_units}</TableCell>
                        <TableCell className="text-right">Bs {w.total_bonus_bs.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{w.total_points}</TableCell>
                        <TableCell className="text-right font-bold">{w.accumUnits}</TableCell>
                        <TableCell className="text-right font-bold">Bs {w.accumBs.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {weeklyWithAccum.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={2} className="font-bold font-display">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">{weeklyTotals.units}</TableCell>
                        <TableCell className="text-right font-bold text-success">{weeklyTotals.approved}</TableCell>
                        <TableCell className="text-right font-bold text-warning">{weeklyTotals.pending}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">{weeklyTotals.rejected}</TableCell>
                        <TableCell className="text-right font-bold">Bs {weeklyTotals.bs.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{weeklyTotals.pts}</TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* City tab */}
          <TabsContent value="city" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportCity}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ciudad</TableHead><TableHead className="text-right">Vendedores</TableHead>
                      <TableHead className="text-right">Total Uds</TableHead><TableHead className="text-right">Aprobadas</TableHead>
                      <TableHead className="text-right">Bono Bs</TableHead><TableHead className="text-right">Puntos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cityData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Sin datos</TableCell></TableRow>
                    ) : cityData.map((c) => (
                      <TableRow key={c.city}>
                        <TableCell><Badge variant="outline" className="text-[11px]">{c.city}</Badge></TableCell>
                        <TableCell className="text-right">{c.vendor_count}</TableCell>
                        <TableCell className="text-right font-medium">{c.total_units}</TableCell>
                        <TableCell className="text-right text-success font-medium">{c.approved_units}</TableCell>
                        <TableCell className="text-right">Bs {c.total_bonus_bs.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{c.total_points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {cityData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell className="font-bold font-display">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">{cityTotals.vendors}</TableCell>
                        <TableCell className="text-right font-bold">{cityTotals.units}</TableCell>
                        <TableCell className="text-right font-bold text-success">{cityTotals.approved}</TableCell>
                        <TableCell className="text-right font-bold">Bs {cityTotals.bs.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{cityTotals.pts}</TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products tab */}
          <TabsContent value="products" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead><TableHead>Producto</TableHead><TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Bono Bs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productData.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Sin datos</TableCell></TableRow>
                    ) : productData.map((p, i) => (
                      <TableRow key={p.model_code}>
                        <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.product_name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.model_code}</TableCell>
                        <TableCell className="text-right font-bold">{p.total_units}</TableCell>
                        <TableCell className="text-right">Bs {p.total_bonus_bs.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {productData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="font-bold font-display">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">{productData.reduce((a, p) => a + p.total_units, 0)}</TableCell>
                        <TableCell className="text-right font-bold">Bs {productData.reduce((a, p) => a + p.total_bonus_bs, 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors tab */}
          <TabsContent value="vendors" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{vendorData.length} vendedores</p>
              <Button variant="outline" size="sm" onClick={exportVendors}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Tienda</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Aprob.</TableHead>
                      <TableHead className="text-right">% Aprob.</TableHead>
                      <TableHead className="text-right">Bono Bs</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorData.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">Sin vendedores inscritos</TableCell></TableRow>
                    ) : vendorData.map((v, i) => (
                      <TableRow key={v.vendor_id}>
                        <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                        <TableCell className="font-medium">{v.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.store_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[11px]">{v.city}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{v.total_units}</TableCell>
                        <TableCell className="text-right text-success font-medium">{v.approved_units}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={v.approval_rate >= 80 ? "default" : v.approval_rate >= 50 ? "secondary" : "outline"} className="text-[11px]">
                            {v.approval_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">Bs {v.bonus_bs.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{v.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {vendorData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={4} className="font-bold font-display">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">{vendorTotals.total}</TableCell>
                        <TableCell className="text-right font-bold text-success">{vendorTotals.approved}</TableCell>
                        <TableCell className="text-right font-bold">
                          {vendorTotals.total > 0 ? `${Math.round((vendorTotals.approved / vendorTotals.total) * 100)}%` : "0%"}
                        </TableCell>
                        <TableCell className="text-right font-bold">Bs {vendorTotals.bs.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{vendorTotals.pts}</TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily trend tab */}
          <TabsContent value="daily" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportDaily}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button>
            </div>

            {/* Line chart */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ventas Aprobadas por Día</CardTitle></CardHeader>
              <CardContent>
                {dailyData.length === 0 ? <p className="text-center text-muted-foreground py-8">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 18%)" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      <Legend />
                      <Line type="monotone" dataKey="approved" name="Aprobadas" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="total" name="Total" stroke="hsl(215, 20%, 55%)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Daily table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Aprob.</TableHead>
                      <TableHead className="text-right">Pend.</TableHead>
                      <TableHead className="text-right">Rech.</TableHead>
                      <TableHead className="text-right">Obs.</TableHead>
                      <TableHead className="text-right">Bono Bs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyData.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Sin datos</TableCell></TableRow>
                    ) : dailyData.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell className="font-medium">{d.date}</TableCell>
                        <TableCell className="text-right font-medium">{d.total}</TableCell>
                        <TableCell className="text-right text-success">{d.approved}</TableCell>
                        <TableCell className="text-right text-warning">{d.pending}</TableCell>
                        <TableCell className="text-right text-destructive">{d.rejected}</TableCell>
                        <TableCell className="text-right">{d.observed}</TableCell>
                        <TableCell className="text-right">Bs {d.bonus_bs.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {dailyData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell className="font-bold font-display">TOTAL ({dailyData.length} días)</TableCell>
                        <TableCell className="text-right font-bold">{dailyData.reduce((a, d) => a + d.total, 0)}</TableCell>
                        <TableCell className="text-right font-bold text-success">{dailyData.reduce((a, d) => a + d.approved, 0)}</TableCell>
                        <TableCell className="text-right font-bold text-warning">{dailyData.reduce((a, d) => a + d.pending, 0)}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">{dailyData.reduce((a, d) => a + d.rejected, 0)}</TableCell>
                        <TableCell className="text-right font-bold">{dailyData.reduce((a, d) => a + d.observed, 0)}</TableCell>
                        <TableCell className="text-right font-bold">Bs {dailyData.reduce((a, d) => a + d.bonus_bs, 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Serials tab */}
          <TabsContent value="serials" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{serialTotals.total.toLocaleString()} seriales totales · {serialTotals.used.toLocaleString()} usados · {serialTotals.available.toLocaleString()} disponibles</span>
              </div>
              <Button variant="outline" size="sm" onClick={exportSerials}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button>
            </div>

            {/* Overall usage bar */}
            <Card>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Utilización General</span>
                  <span className="text-sm font-bold text-primary">
                    {serialTotals.total > 0 ? `${Math.round((serialTotals.used / serialTotals.total) * 100)}%` : "0%"}
                  </span>
                </div>
                <Progress value={serialTotals.total > 0 ? (serialTotals.used / serialTotals.total) * 100 : 0} className="h-3" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Usados</TableHead>
                      <TableHead className="text-right">Disponibles</TableHead>
                      <TableHead className="text-right">Bloqueados</TableHead>
                      <TableHead className="w-[140px]">% Uso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serialData.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Sin seriales importados</TableCell></TableRow>
                    ) : serialData.map((s, i) => (
                      <TableRow key={s.model_code}>
                        <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.product_name}</TableCell>
                        <TableCell className="font-mono text-xs">{s.model_code}</TableCell>
                        <TableCell className="text-right font-medium">{s.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-success">{s.used.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{s.available.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive">{s.blocked.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={s.usage_pct} className="h-2 flex-1" />
                            <span className="text-xs font-medium w-10 text-right">{s.usage_pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {serialData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="font-bold font-display">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">{serialTotals.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-success">{serialTotals.used.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{serialTotals.available.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">{serialTotals.blocked.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="text-xs font-bold">
                            {serialTotals.total > 0 ? `${Math.round((serialTotals.used / serialTotals.total) * 100)}%` : "0%"}
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
