import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Package, DollarSign, Users, TrendingUp, Clock, CheckCircle2, XCircle, Percent, Activity, ArrowUpRight, ArrowDownRight, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

type PeriodType = "day" | "week" | "month" | "year" | "all";

interface CityData {
  city: string;
  total_units: number;
  total_bonus_bs: number;
  total_points: number;
  pending_units: number;
  approved_units: number;
  rejected_units: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  model_code: string;
  city: string;
  total_units: number;
  total_bonus_bs: number;
}

interface RankingEntry {
  vendor_id: string;
  full_name: string;
  city: string;
  store_name: string;
  total_points: number;
  total_bonus_bs: number;
  total_units: number;
}

interface Campaign {
  id: string;
  name: string;
}

interface RecentSale {
  id: string;
  serial: string;
  sale_date: string;
  city: string;
  status: string;
  created_at: string;
  vendors: { full_name: string } | null;
  products: { name: string } | null;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [period, setPeriod] = useState<PeriodType>("all");
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ date: string; units: number; bonus: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorCount, setVendorCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);

  useEffect(() => {
    supabase.from("campaigns").select("id, name").eq("is_active", true).then(({ data }) => {
      if (data && data.length > 0) {
        setCampaigns(data);
        setSelectedCampaign(data[0].id);
      }
    });
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true).then(({ count }) => setVendorCount(count || 0));
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("pending_approval", true).then(({ count }) => setPendingApprovals(count || 0));
    
    // Recent sales
    supabase.from("sales")
      .select("id, serial, sale_date, city, status, created_at, vendors(full_name), products(name)")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setRecentSales((data as any) || []));

    // Pending sales count
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("status", "pending").then(({ count }) => setPendingSalesCount(count || 0));
  }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "day": { const today = format(now, "yyyy-MM-dd"); return { start: today, end: today }; }
      case "week": return { start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"), end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd") };
      case "month": return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
      case "year": return { start: format(startOfYear(now), "yyyy-MM-dd"), end: format(endOfYear(now), "yyyy-MM-dd") };
      default: return { start: null, end: null };
    }
  }, [period]);

  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);

    const params: any = { _campaign_id: selectedCampaign };
    if (dateRange.start) params._start_date = dateRange.start;
    if (dateRange.end) params._end_date = dateRange.end;

    let trendQuery = supabase
      .from("sales")
      .select("sale_date, bonus_bs")
      .eq("campaign_id", selectedCampaign)
      .eq("status", "approved");

    const trendStart = dateRange.start || format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const trendEnd = dateRange.end || format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    trendQuery = trendQuery.gte("sale_date", trendStart).lte("sale_date", trendEnd);

    Promise.all([
      supabase.rpc("get_sales_by_city", params),
      supabase.rpc("get_top_products", { ...params, _limit: 10 }),
      supabase.rpc("get_campaign_ranking", { _campaign_id: selectedCampaign }),
      trendQuery,
    ]).then(([cityRes, prodRes, rankRes, trendRes]) => {
      setCityData((cityRes.data as CityData[]) || []);
      setTopProducts((prodRes.data as TopProduct[]) || []);
      setRanking((rankRes.data as RankingEntry[]) || []);

      const trendMap: Record<string, { units: number; bonus: number }> = {};
      (trendRes.data || []).forEach((s: any) => {
        if (!trendMap[s.sale_date]) trendMap[s.sale_date] = { units: 0, bonus: 0 };
        trendMap[s.sale_date].units += 1;
        trendMap[s.sale_date].bonus += Number(s.bonus_bs);
      });
      const trendArr = Object.entries(trendMap)
        .map(([date, vals]) => ({ date: format(new Date(date + "T12:00:00"), "dd MMM", { locale: es }), ...vals }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setDailyTrend(trendArr);

      setLoading(false);
    });
  }, [selectedCampaign, dateRange]);

  const totals = useMemo(() => {
    return cityData.reduce(
      (acc, c) => ({
        units: acc.units + Number(c.total_units),
        bonus: acc.bonus + Number(c.total_bonus_bs),
        points: acc.points + Number(c.total_points),
        pending: acc.pending + Number(c.pending_units),
        approved: acc.approved + Number(c.approved_units),
        rejected: acc.rejected + Number(c.rejected_units),
      }),
      { units: 0, bonus: 0, points: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [cityData]);

  const approvalRate = totals.units > 0 ? Math.round((totals.approved / totals.units) * 100) : 0;

  const statusPieData = [
    { name: "Aprobadas", value: totals.approved, color: "hsl(152, 60%, 42%)" },
    { name: "Pendientes", value: totals.pending, color: "hsl(43, 96%, 56%)" },
    { name: "Rechazadas", value: totals.rejected, color: "hsl(0, 72%, 51%)" },
  ].filter((d) => d.value > 0);

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
  const fmtTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH}h`;
    return format(date, "dd/MM HH:mm");
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight">Dashboard Gerencial</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Vista general del programa
            {pendingApprovals > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">{pendingApprovals} solicitudes</Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[120px] sm:w-[140px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo</SelectItem>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[160px] sm:w-[220px] text-xs sm:text-sm"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Main KPI cards - 2x2 on mobile, 4 cols on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total sales */}
            <Card className="hover:border-primary/20 transition-all">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ventas</p>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1">{totals.units}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{totals.approved} aprobadas · {totals.pending} pendientes</p>
              </CardContent>
            </Card>

            {/* Bono total */}
            <Card className="hover:border-success/20 transition-all">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Aprobado</p>
                  <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5 text-success" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1 text-success">Bs {totals.bonus.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{totals.points.toLocaleString()} puntos</p>
              </CardContent>
            </Card>

            {/* Approval rate */}
            <Card className="hover:border-primary/20 transition-all">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Tasa Aprobación</p>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Percent className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1">{approvalRate}%</p>
                <Progress value={approvalRate} className="h-1.5 mt-2" />
              </CardContent>
            </Card>

            {/* Pending reviews - clickable */}
            <Card
              className="hover:border-warning/30 transition-all cursor-pointer group"
              onClick={() => navigate("/admin/revisiones")}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Por Revisar</p>
                  <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                    <Clock className="h-3.5 w-3.5 text-warning" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1 text-warning">{pendingSalesCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 group-hover:text-primary transition-colors">
                  Ir a revisiones <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-2 px-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold font-display">{totals.approved}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Aprobadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-2 px-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold font-display">{totals.rejected}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Rechazadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-2 px-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold font-display">{vendorCount}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Vendedores</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Sales by city */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Ventas por Ciudad</CardTitle>
              </CardHeader>
              <CardContent>
                {cityData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                    <BarChart data={cityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                      <XAxis dataKey="city" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: isMobile ? 10 : 12 }} />
                      <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 12 }} hide={isMobile} />
                      <Tooltip contentStyle={{ background: "hsl(220, 25%, 11%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      <Bar dataKey="approved_units" name="Aprobadas" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending_units" name="Pendientes" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejected_units" name="Rechazadas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentSales.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Sin actividad</p>
                  ) : recentSales.map((s) => (
                    <div key={s.id} className="px-4 py-2.5 flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        s.status === "approved" ? "bg-success" : s.status === "rejected" ? "bg-destructive" : "bg-warning"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{s.vendors?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.products?.name} · {s.city}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend + Pie row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Daily trend */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Tendencia {period === "all" ? "(semana actual)" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTrend.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Sin datos en el periodo</p>
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                    <AreaChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="gradUnits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradBonus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: isMobile ? 10 : 12 }} />
                      <YAxis yAxisId="left" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 12 }} hide={isMobile} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 12 }} hide={isMobile} />
                      <Tooltip contentStyle={{ background: "hsl(220, 25%, 11%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      {!isMobile && <Legend />}
                      <Area yAxisId="left" type="monotone" dataKey="units" name="Unidades" stroke="hsl(152, 60%, 42%)" strokeWidth={2} fill="url(#gradUnits)" />
                      <Area yAxisId="right" type="monotone" dataKey="bonus" name="Bono Bs" stroke="hsl(43, 96%, 56%)" strokeWidth={2} fill="url(#gradBonus)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status distribution pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Estados</CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={isMobile ? 40 : 60} outerRadius={isMobile ? 70 : 100} dataKey="value" nameKey="name" label={!isMobile ? ({ name, value }: any) => `${name}: ${value}` : false}>
                        {statusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(220, 25%, 11%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bono by city horizontal bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">Bono Aprobado por Ciudad (Bs)</CardTitle>
            </CardHeader>
            <CardContent>
              {cityData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                  <BarChart data={cityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis type="number" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 12 }} hide={isMobile} />
                    <YAxis dataKey="city" type="category" width={isMobile ? 60 : 120} tick={{ fill: "hsl(215, 15%, 50%)", fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip
                      formatter={(value: number) => [`Bs ${value.toLocaleString()}`, "Bono"]}
                      contentStyle={{ background: "hsl(220, 25%, 11%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }}
                    />
                    <Bar dataKey="total_bonus_bs" name="Bono Bs" fill="hsl(43, 96%, 56%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Top Products & Ranking */}
          <Tabs defaultValue="products">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="products" className="text-xs sm:text-sm">Top Productos</TabsTrigger>
              <TabsTrigger value="ranking" className="text-xs sm:text-sm">Ranking Vendedores</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {isMobile ? (
                    <div className="divide-y divide-border">
                      {topProducts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">Sin datos</p>
                      ) : topProducts.map((p, i) => (
                        <div key={`${p.product_id}-${p.city}`} className="p-3 flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{p.product_name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.model_code} · {p.city}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold">{p.total_units} uds</p>
                            <p className="text-[10px] text-muted-foreground">Bs {Number(p.total_bonus_bs).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Ciudad</TableHead>
                          <TableHead className="text-right">Unidades</TableHead>
                          <TableHead className="text-right">Bono Bs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin datos</TableCell>
                          </TableRow>
                        ) : topProducts.map((p, i) => (
                          <TableRow key={`${p.product_id}-${p.city}`}>
                            <TableCell className="font-bold">{i + 1}</TableCell>
                            <TableCell className="font-medium">{p.product_name}</TableCell>
                            <TableCell className="text-sm font-mono">{p.model_code}</TableCell>
                            <TableCell><Badge variant="outline">{p.city}</Badge></TableCell>
                            <TableCell className="text-right font-bold">{p.total_units}</TableCell>
                            <TableCell className="text-right">Bs {Number(p.total_bonus_bs).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ranking" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {isMobile ? (
                    <div className="divide-y divide-border">
                      {ranking.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">Sin datos</p>
                      ) : ranking.map((r, i) => (
                        <div key={r.vendor_id} className="p-3 flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{r.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{r.store_name || "—"} · {r.city}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-primary">{r.total_points} pts</p>
                            <p className="text-[10px] text-muted-foreground">{r.total_units} uds · Bs {Number(r.total_bonus_bs).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Vendedor</TableHead>
                          <TableHead>Tienda</TableHead>
                          <TableHead>Ciudad</TableHead>
                          <TableHead className="text-right">Puntos</TableHead>
                          <TableHead className="text-right">Bs</TableHead>
                          <TableHead className="text-right">Uds</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranking.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin datos</TableCell>
                          </TableRow>
                        ) : ranking.map((r, i) => (
                          <TableRow key={r.vendor_id}>
                            <TableCell className="font-bold">{i + 1}</TableCell>
                            <TableCell className="font-medium">{r.full_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.store_name || "—"}</TableCell>
                            <TableCell><Badge variant="outline">{r.city}</Badge></TableCell>
                            <TableCell className="text-right font-bold text-primary">{r.total_points}</TableCell>
                            <TableCell className="text-right">Bs {Number(r.total_bonus_bs).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{r.total_units}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
