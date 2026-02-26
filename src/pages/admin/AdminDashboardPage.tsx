import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, DollarSign, Users, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { es } from "date-fns/locale";

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

const CHART_COLORS = [
  "hsl(43, 96%, 56%)",   // primary/gold
  "hsl(142, 76%, 36%)",  // success/green
  "hsl(0, 72%, 51%)",    // destructive/red
  "hsl(215, 20%, 55%)",  // muted
  "hsl(150, 30%, 40%)",  // teal
  "hsl(280, 60%, 50%)",  // purple
  "hsl(200, 80%, 50%)",  // blue
  "hsl(30, 90%, 55%)",   // orange
  "hsl(340, 70%, 50%)",  // pink
  "hsl(60, 70%, 45%)",   // olive
];

export default function AdminDashboardPage() {
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

  // Load campaigns
  useEffect(() => {
    supabase.from("campaigns").select("id, name").eq("is_active", true).then(({ data }) => {
      if (data && data.length > 0) {
        setCampaigns(data);
        setSelectedCampaign(data[0].id);
      }
    });
    // Vendor counts
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true).then(({ count }) => setVendorCount(count || 0));
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("pending_approval", true).then(({ count }) => setPendingApprovals(count || 0));
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

  // Load data when campaign or period changes
  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);

    const params: any = { _campaign_id: selectedCampaign };
    if (dateRange.start) params._start_date = dateRange.start;
    if (dateRange.end) params._end_date = dateRange.end;

    // Build daily trend query
    let trendQuery = supabase
      .from("sales")
      .select("sale_date, bonus_bs")
      .eq("campaign_id", selectedCampaign)
      .eq("status", "approved");

    // For daily trend, use current week if "all", otherwise use the selected range
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

      // Aggregate trend by date
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

  const statCards = [
    { label: "Ventas Totales", value: String(totals.units), icon: Package, color: "text-primary" },
    { label: "Bono Aprobado (Bs)", value: `Bs ${totals.bonus.toLocaleString()}`, icon: DollarSign, color: "text-success" },
    { label: "Aprobadas", value: String(totals.approved), icon: CheckCircle2, color: "text-success" },
    { label: "Pendientes", value: String(totals.pending), icon: Clock, color: "text-warning" },
    { label: "Rechazadas", value: String(totals.rejected), icon: XCircle, color: "text-destructive" },
    { label: "Vendedores Activos", value: String(vendorCount), icon: Users, color: "text-primary" },
  ];

  // Pie data for status distribution
  const statusPieData = [
    { name: "Aprobadas", value: totals.approved, color: "hsl(142, 76%, 36%)" },
    { name: "Pendientes", value: totals.pending, color: "hsl(43, 96%, 56%)" },
    { name: "Rechazadas", value: totals.rejected, color: "hsl(0, 72%, 51%)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Gerencial</h1>
          <p className="text-sm text-muted-foreground">
            Vista general del programa Bono Vendedor
            {pendingApprovals > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingApprovals} solicitudes pendientes</Badge>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo</SelectItem>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Campaña" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales by city - units */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ventas por Ciudad (Unidades)</CardTitle>
              </CardHeader>
              <CardContent>
                {cityData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 18%)" />
                      <XAxis dataKey="city" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }}
                      />
                      <Bar dataKey="approved_units" name="Aprobadas" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending_units" name="Pendientes" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejected_units" name="Rechazadas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribución de Estados</CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                        {statusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily trend line chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tendencia Diaria de Ventas Aprobadas {period === "all" ? "(semana actual)" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyTrend.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin datos en el periodo</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 18%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="units" name="Unidades" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="bonus" name="Bono Bs" stroke="hsl(43, 96%, 56%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sales by city - Bs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bono Aprobado por Ciudad (Bs)</CardTitle>
            </CardHeader>
            <CardContent>
              {cityData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={cityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 18%)" />
                    <XAxis type="number" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                    <YAxis dataKey="city" type="category" width={120} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [`Bs ${value.toLocaleString()}`, "Bono"]}
                      contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }}
                    />
                    <Bar dataKey="total_bonus_bs" name="Bono Bs" fill="hsl(43, 96%, 56%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Top Products & Ranking */}
          <Tabs defaultValue="products">
            <TabsList>
              <TabsTrigger value="products">Top Productos</TabsTrigger>
              <TabsTrigger value="ranking">Ranking Vendedores</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-4">
              <Card>
                <CardContent className="p-0">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ranking" className="mt-4">
              <Card>
                <CardContent className="p-0">
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
