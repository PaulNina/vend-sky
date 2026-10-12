import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, DollarSign, Users, Clock, CheckCircle2, XCircle, Percent, Activity, ArrowUpRight, TrendingUp, RefreshCw, Trophy, MapPinned, Orbit, Building2, AlertCircle, Layers, Gift } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, ComposedChart, Area, Line } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { useCities } from "@/hooks/useCities";
import { formatTimeAgoBolivia } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const formatChartDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), "dd MMM", { locale: es });
  } catch {
    return dateStr;
  }
};

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
  ventasObservadas?: number;
  ventasRechazadas: number;
  ventasAnuladas?: number;
  totalBonusBs: number;
  totalBonusPendienteBs?: number;
  totalBonusPagadoBs?: number;
  totalPuntos: number;
  totalVendedores: number;
  totalTiendas?: number;
  lotesLiquidacion?: {
    total: number;
    pendientes: number;
    pagados: number;
  };
  clienteFinal?: {
    totalRegistros: number;
    totalTickets: number;
  };
  ventasPorCiudad?: { ciudad: string; total: number; aprobadas: number; pendientes: number; observadas?: number; rechazadas: number; bonusBs: number }[];
  ventasPorTipo?: { tipo: string; total: number; bonusBs: number }[];
  ventasPorDia?: { fecha: string; total: number; aprobadas: number; pendientes: number; observadas?: number; rechazadas: number }[];
  topProductos?: { model: string; count: number }[];
  seriales?: { total: number; available: number; used: number };
}

interface Campaign { 
  id: number; 
  nombre: string; 
  activo?: boolean;
  registroHabilitado?: boolean;
}

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

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface ReportTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function ReportTooltip({ active, payload, label }: ReportTooltipProps) {
  if (!active || !payload?.length) return null;
  const seriesColors: Record<string, string> = {
    total: "#2e71f7",
    aprobadas: "#34d399",
    pendientes: "#fbbf24",
    rechazadas: "#fb7185",
  };

  return (
    <div className="report-tooltip">
      <p className="report-tooltip-label">{label || "Detalle"}</p>
      <div className="mt-2 space-y-1.5">
        {payload.filter((entry) => entry.value !== undefined).map((entry, index) => (
          <div key={`${entry.dataKey}-${index}`} className="flex min-w-[150px] items-center justify-between gap-5 text-[11px]">
            <span className="flex items-center gap-2 text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seriesColors[String(entry.dataKey)] || entry.color || "#2e71f7" }} />
              {entry.name}
            </span>
            <strong className="font-display text-slate-100">{Number(entry.value).toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Bar3DProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}

function Bar3DShape({ x = 0, y = 0, width = 0, height = 0, fill = "#2e71f7" }: Bar3DProps) {
  if (height <= 0 || width <= 0) return null;
  const depth = Math.max(3, Math.min(7, width * 0.2));
  const frontWidth = Math.max(1, width - depth);
  const frontY = y + depth;
  const frontHeight = Math.max(1, height - depth);

  return (
    <g className="report-bar-3d">
      <rect x={x} y={frontY} width={frontWidth} height={frontHeight} rx={3} fill={fill} />
      <polygon
        points={`${x + frontWidth},${frontY} ${x + width},${y} ${x + width},${y + frontHeight} ${x + frontWidth},${y + height}`}
        fill="rgba(0,0,0,.34)"
      />
      <polygon
        points={`${x},${frontY} ${x + depth},${y} ${x + width},${y} ${x + frontWidth},${frontY}`}
        fill="rgba(255,255,255,.22)"
      />
      <line x1={x + 1} y1={frontY + 1} x2={x + frontWidth - 1} y2={frontY + 1} stroke="rgba(255,255,255,.18)" />
    </g>
  );
}

interface ReportHeaderProps {
  index: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

function ReportHeader({ index, title, description, icon, children }: ReportHeaderProps) {
  return (
    <CardHeader className="report-header">
      <div className="flex min-w-0 items-start gap-3">
        <div className="report-icon">{icon}</div>
        <div className="min-w-0">
          <p className="report-index">{index}</p>
          <CardTitle className="mt-1 font-display text-[15px] font-semibold tracking-tight text-white">{title}</CardTitle>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </CardHeader>
  );
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
      const list = (data || []).filter((c) => c.activo || c.registroHabilitado);
      setCampaigns(list);
      const active = list.find(c => c.activo);
      if (active) {
        setSelectedCampaign(String(active.id));
      } else if (list.length) {
        setSelectedCampaign(String(list[0].id));
      }
    }).catch(() => {});
  }, []);

  const fetchDashboardData = useCallback(() => {
    if (!selectedCampaign) return;
    setLoading(true);
    
    const dashboardParams = new URLSearchParams();
    dashboardParams.set("campanaId", selectedCampaign);
    if (cityFilter !== "all") dashboardParams.set("ciudad", cityFilter);
    if (startDate) dashboardParams.set("startDate", startDate);
    if (endDate) dashboardParams.set("endDate", endDate);

    const otherParams = new URLSearchParams();
    otherParams.set("campanaId", selectedCampaign);
    if (cityFilter !== "all") otherParams.set("city", cityFilter);
    if (startDate) otherParams.set("startDate", startDate);
    if (endDate) otherParams.set("endDate", endDate);

    Promise.all([
      apiGet<DashboardStats>(`/admin/dashboard?${dashboardParams.toString()}`),
      apiGet<PageResponse<RecentSale> | RecentSale[]>(`/sales?sortBy=createdAt&sortDir=desc&size=8&${otherParams.toString()}`),
      apiGet<PageResponse<RankingEntry>>(`/ranking?size=8&${otherParams.toString()}`),
    ]).then(([s, r, rank]) => {
      setStats(s);
      
      const salesData = Array.isArray(r) ? r : (r && r.content ? r.content : []);
      setRecentSales(salesData);
      
      const rankData = rank?.content ?? (Array.isArray(rank) ? rank : []);
      setRanking(rankData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedCampaign, cityFilter, startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const navigateWithFilters = (path: string, extraParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    if (selectedCampaign) params.set("campanaId", selectedCampaign);
    if (cityFilter && cityFilter !== "all") params.set("ciudad", cityFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
    navigate(`${path}?${params.toString()}`);
  };

  const approvalRate = stats && stats.totalVentas > 0
    ? Math.round((stats.ventasAprobadas / stats.totalVentas) * 100)
    : 0;

  const statusPieData = stats ? [
    { name: "Aprobadas", value: stats.ventasAprobadas, color: "#10b981", depth: "#065f46" },
    { name: "Pendientes", value: stats.ventasPendientes, color: "#fbbf24", depth: "#92400e" },
    { name: "Observadas", value: stats.ventasObservadas || 0, color: "#f59e0b", depth: "#b45309" },
    { name: "Rechazadas", value: stats.ventasRechazadas, color: "#ef4444", depth: "#991b1b" },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="space-y-5 sm:space-y-7 max-w-[1480px] mx-auto">
      {/* Header */}
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 pb-1">
        <div>
          <p className="admin-eyebrow mb-2">Inteligencia comercial / tiempo real</p>
          <h1 className="text-2xl sm:text-4xl font-bold font-display tracking-[-.035em] text-white flex items-center gap-3">
            Dashboard <span className="text-slate-500 font-normal">Gerencial</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl">Pulso comercial, rendimiento de vendedores y estado operativo del programa de incentivos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchDashboardData} className="admin-control border-white/10 hover:bg-white/5 text-white h-11 w-11 rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="admin-control w-[220px] sm:w-[280px] text-xs sm:text-sm text-white h-11 rounded-xl"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)} className="focus:bg-white/5 focus:text-white text-xs">{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="admin-panel flex flex-col md:flex-row gap-3 p-3.5 rounded-2xl items-end">
        <div className="w-full md:flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Filtrar por Ciudad</span>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="admin-control w-full text-xs text-white h-10 rounded-lg"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="all" className="focus:bg-white/5 focus:text-white text-xs">Todas las ciudades</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={c.nombre} className="focus:bg-white/5 focus:text-white text-xs">{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Desde Fecha</span>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="admin-control w-full text-xs h-10 text-white focus:border-primary focus:ring-0 [color-scheme:dark] rounded-lg"
          />
        </div>
        <div className="w-full md:flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Hasta Fecha</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="admin-control w-full text-xs h-10 text-white focus:border-primary focus:ring-0 [color-scheme:dark] rounded-lg"
          />
        </div>
        {(cityFilter !== "all" || startDate || endDate) && (
          <div className="w-full md:w-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setCityFilter("all"); setStartDate(""); setEndDate(""); }}
              className="h-10 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full md:w-auto"
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : stats ? (
        <>
          {/* KPI Cards (All Clickable Drill-Downs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 text-white">
            <Card 
              className="admin-kpi glass-card rounded-2xl transition-all duration-300 cursor-pointer group hover-glow-primary" 
              style={{"--kpi-glow":"rgba(46,113,247,.2)"} as React.CSSProperties}
              onClick={() => navigateWithFilters("/admin/revisiones")}
              title="Ver todas las ventas de la campaña"
            >
              <CardContent className="py-5 px-5">
                <div className="flex items-center justify-between">
                  <div><span className="admin-kpi-index">01 / VOLUMEN</span><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Total Ventas</p></div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><Package className="h-4 w-4 text-primary" /></div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold font-display mt-4 text-white tracking-tight">{stats.totalVentas}</p>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{stats.ventasAprobadas} aprobadas • {stats.ventasPendientes} pendientes</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>

            <Card 
              className="admin-kpi glass-card rounded-2xl transition-all duration-300 cursor-pointer group hover-glow-success" 
              style={{"--kpi-glow":"rgba(16,185,129,.16)"} as React.CSSProperties}
              onClick={() => navigateWithFilters("/admin/pagos")}
              title="Ver reporte de comisiones y pagos"
            >
              <CardContent className="py-5 px-5">
                <div className="flex items-center justify-between">
                  <div><span className="admin-kpi-index">02 / INVERSIÓN</span><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Bono Liquidado</p></div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors"><DollarSign className="h-4 w-4 text-emerald-400" /></div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold font-display mt-4 text-emerald-400 tracking-tight">Bs {Number(stats.totalBonusBs).toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Pagado: Bs {Number(stats.totalBonusPagadoBs || 0).toLocaleString()} • Pend: Bs {Number(stats.totalBonusPendienteBs || 0).toLocaleString()}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>

            <Card className="admin-kpi glass-card rounded-2xl transition-all duration-300">
              <CardContent className="py-5 px-5">
                <div className="flex items-center justify-between">
                  <div><span className="admin-kpi-index">03 / CALIDAD</span><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Tasa Aprobación</p></div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Percent className="h-4 w-4 text-primary" /></div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold font-display mt-4 text-white tracking-tight">{approvalRate}<span className="text-lg text-primary">%</span></p>
                <div className="h-1 rounded-full bg-white/[.06] mt-3 overflow-hidden"><div className="h-full rounded-full bg-primary" style={{width: `${approvalRate}%`}} /></div>
                <p className="text-[10px] text-slate-400 mt-1">{stats.ventasAprobadas} ventas verificadas y aprobadas</p>
              </CardContent>
            </Card>

            <Card 
              className="admin-kpi glass-card rounded-2xl transition-all duration-300 cursor-pointer group hover-glow-primary" 
              style={{"--kpi-glow":"rgba(251,191,36,.18)"} as React.CSSProperties} 
              onClick={() => navigateWithFilters("/admin/revisiones", { estado: "PENDIENTE" })}
              title="Ver ventas pendientes de revisión"
            >
              <CardContent className="py-5 px-5">
                <div className="flex items-center justify-between">
                  <div><span className="admin-kpi-index">04 / COLA</span><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Por Revisar</p></div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors"><Clock className="h-4 w-4 text-amber-500" /></div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold font-display mt-4 text-amber-400 tracking-tight">{stats.ventasPendientes}</p>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{stats.ventasObservadas || 0} observadas pendientes</span>
                  <span className="text-primary flex items-center gap-0.5 text-[10px]">Revisar <ArrowUpRight className="h-3 w-3" /></span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary stats strip (with interactive drill-downs) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-white">
            <Card 
              className="glass-card border-white/5 shadow-md hover-glow-success transition-all duration-300 cursor-pointer group"
              onClick={() => navigateWithFilters("/admin/revisiones", { estado: "APROBADA" })}
              title="Filtrar ventas Aprobadas"
            >
              <CardContent className="py-2.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
                <div className="min-w-0">
                  <p className="text-base font-bold font-display text-white">{stats.ventasAprobadas}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold truncate">Aprobadas</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="glass-card border-white/5 shadow-md hover:border-amber-500/30 transition-all duration-300 cursor-pointer group"
              onClick={() => navigateWithFilters("/admin/revisiones", { estado: "OBSERVADA" })}
              title="Filtrar ventas Observadas en subsanación"
            >
              <CardContent className="py-2.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><AlertCircle className="h-4 w-4 text-amber-400" /></div>
                <div className="min-w-0">
                  <p className="text-base font-bold font-display text-amber-400">{stats.ventasObservadas || 0}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold truncate">Observadas</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="glass-card border-white/5 shadow-md hover-glow-destructive transition-all duration-300 cursor-pointer group"
              onClick={() => navigateWithFilters("/admin/revisiones", { estado: "RECHAZADA" })}
              title="Filtrar ventas Rechazadas"
            >
              <CardContent className="py-2.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0"><XCircle className="h-4 w-4 text-red-400" /></div>
                <div className="min-w-0">
                  <p className="text-base font-bold font-display text-white">{stats.ventasRechazadas}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold truncate">Rechazadas</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="glass-card border-white/5 shadow-md hover-glow-primary transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/admin/vendedores")}
              title="Administrar Vendedores"
            >
              <CardContent className="py-2.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-4 w-4 text-primary" /></div>
                <div className="min-w-0">
                  <p className="text-base font-bold font-display text-white">{stats.totalVendedores}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold truncate">Vendedores</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="glass-card border-white/5 shadow-md hover-glow-primary transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/admin/tiendas")}
              title="Administrar Tiendas y Puntos de Venta"
            >
              <CardContent className="py-2.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-purple-400" /></div>
                <div className="min-w-0">
                  <p className="text-base font-bold font-display text-white">{stats.totalTiendas || 0}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold truncate">Tiendas</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="glass-card border-white/5 shadow-md hover-glow-primary transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/admin/pagos")}
              title="Ir a Lotes de Liquidación"
            >
              <CardContent className="py-2.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0"><Layers className="h-4 w-4 text-cyan-400" /></div>
                <div className="min-w-0">
                  <p className="text-base font-bold font-display text-white">{stats.lotesLiquidacion?.total || 0}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold truncate">Lotes Cierre</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* City chart */}
            {stats.ventasPorCiudad && stats.ventasPorCiudad.length > 0 && (
              <Card className="report-card lg:col-span-2">
                <ReportHeader
                  index="REPORTE 01 / TERRITORIO"
                  title="Ventas por ciudad"
                  description="Comparativa tridimensional del estado de validación por plaza."
                  icon={<MapPinned className="h-4 w-4" />}
                >
                  <div className="report-legend">
                    <span><i className="bg-emerald-400" />Aprobadas</span>
                    <span><i className="bg-amber-400" />Pendientes</span>
                    <span><i className="bg-orange-500" />Observadas</span>
                    <span><i className="bg-red-400" />Rechazadas</span>
                  </div>
                </ReportHeader>
                <CardContent className="report-stage px-2 pb-3 pt-5 sm:px-5">
                  <div className="report-floor" />
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                    <BarChart 
                      data={stats.ventasPorCiudad} 
                      barGap={isMobile ? 1 : 3} 
                      barCategoryGap={isMobile ? "18%" : "28%"} 
                      margin={{ top: 18, right: 12, left: isMobile ? -24 : -8, bottom: 0 }}
                      onClick={(data) => {
                        if (data && data.activeLabel) {
                          navigateWithFilters("/admin/revisiones", { ciudad: String(data.activeLabel) });
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <defs>
                        <linearGradient id="approved3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#42e2aa" /><stop offset="100%" stopColor="#087a58" /></linearGradient>
                        <linearGradient id="pending3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffd65a" /><stop offset="100%" stopColor="#c87906" /></linearGradient>
                        <linearGradient id="observed3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" /><stop offset="100%" stopColor="#c2410c" /></linearGradient>
                        <linearGradient id="rejected3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b77" /><stop offset="100%" stopColor="#b91c34" /></linearGradient>
                        <filter id="barGlow" x="-50%" y="-20%" width="200%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#000000" floodOpacity=".48" /></filter>
                      </defs>
                      <CartesianGrid strokeDasharray="2 7" stroke="rgba(148,163,184,0.11)" vertical={false} />
                      <XAxis dataKey="ciudad" tick={{ fill: "#7d899a", fontSize: isMobile ? 9 : 10, fontWeight: 600 }} axisLine={{ stroke: "rgba(255,255,255,.08)" }} tickLine={false} />
                      <YAxis tick={{ fill: "#687587", fontSize: 10 }} hide={isMobile} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "rgba(46,113,247,.04)" }} content={<ReportTooltip />} />
                      <Bar dataKey="aprobadas" name="Aprobadas" fill="url(#approved3d)" shape={<Bar3DShape />} filter="url(#barGlow)" maxBarSize={isMobile ? 13 : 24}>
                        <LabelList dataKey="aprobadas" position="top" fill="#9aa6b5" fontSize={9} formatter={(v: number) => v > 0 ? v : ""} />
                      </Bar>
                      <Bar dataKey="pendientes" name="Pendientes" fill="url(#pending3d)" shape={<Bar3DShape />} filter="url(#barGlow)" maxBarSize={isMobile ? 13 : 24}>
                        <LabelList dataKey="pendientes" position="top" fill="#9aa6b5" fontSize={9} formatter={(v: number) => v > 0 ? v : ""} />
                      </Bar>
                      <Bar dataKey="observadas" name="Observadas" fill="url(#observed3d)" shape={<Bar3DShape />} filter="url(#barGlow)" maxBarSize={isMobile ? 13 : 24}>
                        <LabelList dataKey="observadas" position="top" fill="#9aa6b5" fontSize={9} formatter={(v: number) => v > 0 ? v : ""} />
                      </Bar>
                      <Bar dataKey="rechazadas" name="Rechazadas" fill="url(#rejected3d)" shape={<Bar3DShape />} filter="url(#barGlow)" maxBarSize={isMobile ? 13 : 24}>
                        <LabelList dataKey="rechazadas" position="top" fill="#9aa6b5" fontSize={9} formatter={(v: number) => v > 0 ? v : ""} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent activity */}
            <Card className="report-card text-white">
              <ReportHeader index="SEÑAL / EN VIVO" title="Actividad reciente" description="Últimos movimientos registrados." icon={<Activity className="h-4 w-4" />}>
                <span className="report-live"><i /> En vivo</span>
              </ReportHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {recentSales.length === 0 ? (
                    <p className="text-center text-slate-550 py-12 text-xs">Sin actividad reciente</p>
                  ) : recentSales.map((s) => (
                    <div key={s.id} className="px-4 py-3 flex items-start gap-2.5 hover:bg-white/5 transition-all duration-150">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.estado === "APROBADA" ? "bg-emerald-500 animate-pulse" : s.estado === "RECHAZADA" ? "bg-red-500" : "bg-amber-500 animate-pulse"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{s.vendorName}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.productModel} {s.productSize || ''}" • {s.ciudad}</p>
                      </div>
                      <span className="text-[9px] text-slate-500 shrink-0 font-mono">{formatTimeAgoBolivia(s.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Sales Chart */}
          {stats.ventasPorDia && stats.ventasPorDia.length > 0 && (
            <Card className="report-card text-white">
              <ReportHeader
                index="REPORTE 02 / TENDENCIA"
                title="Ritmo de ventas"
                description="Evolución temporal de registros y decisiones de validación."
                icon={<TrendingUp className="h-4 w-4" />}
              >
                <div className="report-legend">
                  <span><i className="bg-primary" />Total</span>
                  <span><i className="bg-emerald-400" />Aprobadas</span>
                  <span><i className="bg-amber-400" />Pendientes</span>
                  <span><i className="bg-red-400" />Rechazadas</span>
                </div>
              </ReportHeader>
              <CardContent className="report-stage px-2 pb-3 pt-5 sm:px-5">
                <div className="report-glow-orb" />
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                  <ComposedChart data={stats.ventasPorDia.map(d => ({ ...d, fechaFormatted: formatChartDate(d.fecha) }))} margin={{ top: 14, right: 12, left: isMobile ? -24 : -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2e71f7" stopOpacity=".38" /><stop offset="78%" stopColor="#2e71f7" stopOpacity=".03" /><stop offset="100%" stopColor="#2e71f7" stopOpacity="0" /></linearGradient>
                      <filter id="lineGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    </defs>
                    <CartesianGrid strokeDasharray="2 7" stroke="rgba(148,163,184,0.1)" vertical={false} />
                    <XAxis dataKey="fechaFormatted" tick={{ fill: "#7d899a", fontSize: isMobile ? 9 : 10, fontWeight: 600 }} axisLine={{ stroke: "rgba(255,255,255,.08)" }} tickLine={false} />
                    <YAxis tick={{ fill: "#687587", fontSize: 10 }} hide={isMobile} axisLine={false} tickLine={false} />
                    <Tooltip content={<ReportTooltip />} cursor={{ stroke: "rgba(46,113,247,.4)", strokeDasharray: "3 4" }} />
                    <Area type="monotone" dataKey="total" name="Total" fill="url(#totalArea)" stroke="#2e71f7" strokeWidth={2.5} filter="url(#lineGlow)" activeDot={{ r: 5, fill: "#2e71f7", stroke: "#0a0d11", strokeWidth: 3 }} />
                    <Line type="monotone" dataKey="aprobadas" name="Aprobadas" stroke="#34d399" strokeWidth={1.7} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="pendientes" name="Pendientes" stroke="#fbbf24" strokeWidth={1.7} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="rechazadas" name="Rechazadas" stroke="#fb7185" strokeWidth={1.7} dot={false} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Status Pie + Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 text-white">
            <Card className="report-card">
              <ReportHeader index="REPORTE 03 / CALIDAD" title="Estados de validación" description="Distribución general del flujo." icon={<Orbit className="h-4 w-4" />} />
              <CardContent className="relative px-3 pb-4 pt-2">
                {statusPieData.length === 0 ? (
                  <p className="text-center text-slate-500 py-12 text-xs">Sin datos para graficar</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={isMobile ? 190 : 235}>
                      <PieChart className="report-donut-3d">
                      <defs>
                        <filter id="donutShadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity=".62" /></filter>
                      </defs>
                      <Pie data={statusPieData} cx="50%" cy="53%" innerRadius={isMobile ? 42 : 58} outerRadius={isMobile ? 72 : 92} dataKey="value" nameKey="name" paddingAngle={3} stroke="none">
                        {statusPieData.map((entry, i) => <Cell key={`depth-${i}`} fill={entry.depth} />)}
                      </Pie>
                      <Pie data={statusPieData} cx="50%" cy="47%" innerRadius={isMobile ? 42 : 58} outerRadius={isMobile ? 72 : 92} dataKey="value" nameKey="name" paddingAngle={3} cornerRadius={5} stroke="rgba(255,255,255,.12)" strokeWidth={1} filter="url(#donutShadow)">
                        {statusPieData.map((entry, i) => <Cell key={`top-${i}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<ReportTooltip />} />
                      <text x="50%" y="43%" textAnchor="middle" dominantBaseline="middle" fill="#f8fafc" className="font-display" fontSize={isMobile ? 22 : 28} fontWeight="700">{stats.totalVentas}</text>
                      <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="8" fontWeight="700" letterSpacing="1.5">VENTAS</text>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5">
                      {statusPieData.map((entry) => (
                        <div key={entry.name} className="rounded-lg border border-white/[.055] bg-white/[.02] px-2 py-2 text-center">
                          <span className="mx-auto mb-1 block h-1 w-4 rounded-full" style={{ backgroundColor: entry.color }} />
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{entry.name}</p>
                          <p className="mt-0.5 font-display text-sm font-bold text-slate-200">{entry.value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top vendors */}
            <Card className="report-card admin-data-card lg:col-span-2">
              <ReportHeader index="REPORTE 04 / DESEMPEÑO" title="Top vendedores" description="Rendimiento acumulado de la campaña seleccionada." icon={<Trophy className="h-4 w-4" />} />
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                      <TableHead className="text-xs text-muted-foreground w-12">#</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground">Bono</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground">Unidades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.slice(0, 8).map((r, i) => (
                      <TableRow key={r.vendorId} className={`transition-all duration-150 hover:bg-white/5 border-white/5 ${i === 0 ? "report-rank-leader" : ""}`}>
                        <TableCell className="font-bold text-xs"><span className={`report-rank-badge report-rank-${i + 1}`}>{i + 1}</span></TableCell>
                        <TableCell className="font-semibold text-sm text-white">{r.fullName}</TableCell>
                        <TableCell><Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] text-slate-350">{r.city}</Badge></TableCell>
                        <TableCell className="text-right font-bold text-primary font-display text-sm">Bs {r.totalBonusBs?.toLocaleString() ?? 0}</TableCell>
                        <TableCell className="text-right text-white font-semibold text-sm">{r.totalUnits}</TableCell>
                      </TableRow>
                    ))}
                    {ranking.length === 0 && (
                      <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="text-center text-slate-550 py-12 text-xs">Sin datos disponibles</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p className="text-center text-slate-500 py-16 text-xs">Sin datos disponibles en esta campaña</p>
      )}
    </div>
  );
}
