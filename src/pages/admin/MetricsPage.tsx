import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, BarChart3, TrendingUp, CalendarIcon, Filter, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { exportToExcel, exportMultiSheet, buildSummaryRows } from "@/lib/exportExcel";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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

type QuickRange = "all" | "week" | "month" | "year" | "custom";

export default function MetricsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [weeklyData, setWeeklyData] = useState<WeekRow[]>([]);
  const [cityData, setCityData] = useState<CityRow[]>([]);
  const [productData, setProductData] = useState<ProductRow[]>([]);
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

    // Batch-load all sales to avoid 1000-row limit
    let allSales: any[] = [];
    const batchSize = 1000;
    let from = 0;
    while (true) {
      let q = supabase
        .from("sales")
        .select("week_start, week_end, status, bonus_bs, points, city, vendor_id, product_id, products(name, model_code)")
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
    if (sales.length === 0) { setWeeklyData([]); setCityData([]); setProductData([]); setLoading(false); return; }

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

    setLoading(false);
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

  const exportFullReport = () => {
    // Export a comprehensive report with all tabs as sheets... using single sheet with all data
    const reportRows = [
      { Sección: "RESUMEN GENERAL", Dato: "Campaña", Valor: activeCampaign?.name || "" },
      { Sección: "", Dato: "Período", Valor: activeCampaign ? `${activeCampaign.start_date} → ${activeCampaign.end_date}` : "" },
      { Sección: "", Dato: "Total Ventas", Valor: weeklyTotals.units },
      { Sección: "", Dato: "Aprobadas", Valor: weeklyTotals.approved },
      { Sección: "", Dato: "Pendientes", Valor: weeklyTotals.pending },
      { Sección: "", Dato: "Rechazadas", Valor: weeklyTotals.rejected },
      { Sección: "", Dato: "Bono Total (Bs)", Valor: weeklyTotals.bs },
      { Sección: "", Dato: "Puntos Totales", Valor: weeklyTotals.pts },
      { Sección: "", Dato: "Semanas activas", Valor: weeklyData.length },
      { Sección: "", Dato: "Ciudades", Valor: cityData.length },
      { Sección: "", Dato: "Vendedores participantes", Valor: cityTotals.vendors },
      { Sección: "", Dato: "", Valor: "" },
      ...weeklyWithAccum.map((w) => ({
        Sección: `SEMANA ${w.weekNum}`, Dato: `${w.week_start} → ${w.week_end}`,
        Valor: `${w.approved_units} aprob. / ${w.total_units} total — Bs ${w.total_bonus_bs.toLocaleString()}`,
      })),
      { Sección: "", Dato: "", Valor: "" },
      ...cityData.map((c) => ({
        Sección: "POR CIUDAD", Dato: c.city,
        Valor: `${c.approved_units} aprob. / ${c.total_units} total — Bs ${c.total_bonus_bs.toLocaleString()} — ${c.vendor_count} vendedores`,
      })),
      { Sección: "", Dato: "", Valor: "" },
      ...productData.map((p) => ({
        Sección: "POR PRODUCTO", Dato: `${p.product_name} (${p.model_code})`,
        Valor: `${p.total_units} uds — Bs ${p.total_bonus_bs.toLocaleString()}`,
      })),
    ];
    exportToExcel(reportRows, `reporte_gerencial_${activeCampaign?.name || "campaña"}`);
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
          <TabsList>
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="city">Por Ciudad</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
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
        </Tabs>
      )}
    </div>
  );
}
