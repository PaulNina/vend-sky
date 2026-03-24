import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, DollarSign, Users, Clock, CheckCircle2, XCircle, Percent, Activity, ArrowUpRight, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { useCities } from "@/hooks/useCities";
import { formatTimeAgoBolivia } from "@/lib/utils";

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

interface DashboardStats {
  totalVentas: number;
  ventasAprobadas: number;
  ventasPendientes: number;
  ventasRechazadas: number;
  totalBonusBs: number;
  totalPuntos: number;
  totalVendedores: number;
  ventasPorCiudad?: { ciudad: string; total: number; aprobadas: number; pendientes: number; rechazadas: number; bonusBs: number }[];
}

interface Campaign { id: number; nombre: string; }

interface RecentSale {
  id: number;
  vendorName?: string;
  productModel?: string;
  productSize?: string;
  ciudad: string;
  estado: string;
  createdAt: string;
}

interface RankingEntry {
  vendorId: number;
  fullName: string;
  city: string;
  storeName?: string;
  totalPoints: number;
  totalBonusBs: number;
  totalUnits: number;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { cities } = useCities();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Campaign[]>("/campaigns").then((data) => {
      setCampaigns(data || []);
      if (data?.length) setSelectedCampaign(String(data[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);
    
    const params = new URLSearchParams();
    params.set("campanaId", selectedCampaign);
    if (cityFilter !== "all") params.set("ciudad", cityFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const q = params.toString();

    Promise.all([
      apiGet<DashboardStats>(`/admin/dashboard?${q}`),
      apiGet<PageResponse<RecentSale> | RecentSale[]>(`/sales?sortBy=createdAt&sortDir=desc&size=8`),
      apiGet<RankingEntry[]>(`/ranking?campanaId=${selectedCampaign}`),
    ]).then(([s, r, rank]) => {
      setStats(s);
      
      const salesData = Array.isArray(r) ? r : (r && r.content ? r.content : []);
      setRecentSales(salesData);
      
      setRanking(rank || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedCampaign, cityFilter, startDate, endDate]);

  const approvalRate = stats && stats.totalVentas > 0
    ? Math.round((stats.ventasAprobadas / stats.totalVentas) * 100)
    : 0;

  const statusPieData = stats ? [
    { name: "Aprobadas", value: stats.ventasAprobadas, color: "hsl(152, 60%, 42%)" },
    { name: "Pendientes", value: stats.ventasPendientes, color: "hsl(43, 96%, 56%)" },
    { name: "Rechazadas", value: stats.ventasRechazadas, color: "hsl(0, 72%, 51%)" },
  ].filter((d) => d.value > 0) : [];



  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight">Dashboard Gerencial</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Vista general del programa</p>
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[200px] sm:w-[240px] text-xs sm:text-sm"><SelectValue placeholder="Campaña" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex-1 min-w-[200px]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 mb-1 block">Ciudad</span>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full text-xs sm:text-sm bg-background"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 mb-1 block">Desde</span>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-full text-xs sm:text-sm bg-background h-10" 
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 mb-1 block">Hasta</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="w-full text-xs sm:text-sm bg-background h-10" 
          />
        </div>
        {(cityFilter !== "all" || startDate || endDate) && (
          <div className="flex items-end ml-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setCityFilter("all"); setStartDate(""); setEndDate(""); }}
              className="h-10 text-xs"
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="hover:border-primary/20 transition-all">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ventas</p>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-3.5 w-3.5 text-primary" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1">{stats.totalVentas}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stats.ventasAprobadas} aprobadas · {stats.ventasPendientes} pendientes</p>
              </CardContent>
            </Card>
            <Card className="hover:border-success/20 transition-all">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Aprobado</p>
                  <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center"><DollarSign className="h-3.5 w-3.5 text-success" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1 text-success">Bs {Number(stats.totalBonusBs).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalPuntos?.toLocaleString()} puntos</p>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/20 transition-all">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Tasa Aprobación</p>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Percent className="h-3.5 w-3.5 text-primary" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1">{approvalRate}%</p>
              </CardContent>
            </Card>
            <Card className="hover:border-warning/30 transition-all cursor-pointer group" onClick={() => navigate("/admin/revisiones")}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Por Revisar</p>
                  <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors"><Clock className="h-3.5 w-3.5 text-warning" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display mt-1 text-warning">{stats.ventasPendientes}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 group-hover:text-primary transition-colors">
                  Ir a revisiones <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="py-2 px-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4 text-success" /></div>
              <div><p className="text-lg sm:text-xl font-bold font-display">{stats.ventasAprobadas}</p><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Aprobadas</p></div>
            </CardContent></Card>
            <Card><CardContent className="py-2 px-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"><XCircle className="h-4 w-4 text-destructive" /></div>
              <div><p className="text-lg sm:text-xl font-bold font-display">{stats.ventasRechazadas}</p><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Rechazadas</p></div>
            </CardContent></Card>
            <Card><CardContent className="py-2 px-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-4 w-4 text-primary" /></div>
              <div><p className="text-lg sm:text-xl font-bold font-display">{stats.totalVendedores}</p><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Vendedores</p></div>
            </CardContent></Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* City chart */}
            {stats.ventasPorCiudad && stats.ventasPorCiudad.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base">Ventas por Ciudad</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                    <BarChart data={stats.ventasPorCiudad}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                      <XAxis dataKey="ciudad" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: isMobile ? 10 : 12 }} />
                      <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 12 }} hide={isMobile} />
                      <Tooltip contentStyle={{ background: "hsl(220, 25%, 11%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      <Bar dataKey="aprobadas" name="Aprobadas" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pendientes" name="Pendientes" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rechazadas" name="Rechazadas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent activity */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Actividad Reciente</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentSales.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Sin actividad</p>
                  ) : recentSales.map((s) => (
                    <div key={s.id} className="px-4 py-2.5 flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.estado === "APROBADA" ? "bg-success" : s.estado === "RECHAZADA" ? "bg-destructive" : "bg-warning"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{s.vendorName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.productModel} {s.productSize || ''} · {s.ciudad}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgoBolivia(s.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Pie + Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base">Estados</CardTitle></CardHeader>
              <CardContent>
                {statusPieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={isMobile ? 40 : 60} outerRadius={isMobile ? 70 : 100} dataKey="value" nameKey="name">
                        {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(220, 25%, 11%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                      <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top vendors */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Top Vendedores</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                      <TableHead className="text-right">Uds</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.slice(0, 8).map((r, i) => (
                      <TableRow key={r.vendorId}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-medium text-sm">{r.fullName}</TableCell>
                        <TableCell><Badge variant="outline">{r.city}</Badge></TableCell>
                        <TableCell className="text-right font-bold text-primary">{r.totalPoints}</TableCell>
                        <TableCell className="text-right">{r.totalUnits}</TableCell>
                      </TableRow>
                    ))}
                    {ranking.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">Sin datos</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-12">Sin datos disponibles</p>
      )}
    </div>
  );
}
