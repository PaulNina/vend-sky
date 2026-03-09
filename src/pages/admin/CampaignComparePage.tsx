import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, GitCompare, TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Campaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface CampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  total_sales: number;
  approved_sales: number;
  pending_sales: number;
  rejected_sales: number;
  observed_sales: number;
  total_bonus_bs: number;
  total_points: number;
  unique_vendors: number;
  enrolled_vendors: number;
  approval_rate: number;
  avg_bonus_per_vendor: number;
  start_date: string;
  end_date: string;
  duration_days: number;
}

export default function CampaignComparePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  const [compareEnabled, setCompareEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "enable_campaign_compare")
        .maybeSingle();

      if (!mounted) return;
      if (error || data?.value == null) {
        setCompareEnabled(true);
        return;
      }

      setCompareEnabled(data.value === "true");
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (compareEnabled !== true) return;
    loadCampaigns();
  }, [compareEnabled]);

  useEffect(() => {
    if (compareEnabled !== true) return;
    if (selectedCampaigns.length > 0) {
      loadMetrics();
    }
  }, [selectedCampaigns, compareEnabled]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, start_date, end_date, status")
      .order("created_at", { ascending: false })
      .limit(20);
    setCampaigns(data || []);
  };

  const loadMetrics = async () => {
    if (selectedCampaigns.length === 0) return;
    setLoading(true);

    const metricsData: CampaignMetrics[] = [];

    for (const campaignId of selectedCampaigns) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) continue;

      // Get sales data
      const { data: sales } = await supabase
        .from("sales")
        .select("status, bonus_bs, points, vendor_id")
        .eq("campaign_id", campaignId);

      // Get enrollments
      const { count: enrolledCount } = await supabase
        .from("vendor_campaign_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "active");

      const totalSales = sales?.length || 0;
      const approvedSales = sales?.filter(s => s.status === "approved").length || 0;
      const pendingSales = sales?.filter(s => s.status === "pending").length || 0;
      const rejectedSales = sales?.filter(s => s.status === "rejected").length || 0;
      const observedSales = sales?.filter(s => s.status === "observed").length || 0;
      const totalBonus = sales?.filter(s => s.status === "approved").reduce((sum, s) => sum + (s.bonus_bs || 0), 0) || 0;
      const totalPoints = sales?.filter(s => s.status === "approved").reduce((sum, s) => sum + (s.points || 0), 0) || 0;
      const uniqueVendors = new Set(sales?.filter(s => s.status === "approved").map(s => s.vendor_id)).size;
      const approvalRate = totalSales > 0 ? Math.round((approvedSales / totalSales) * 100) : 0;
      const avgBonus = uniqueVendors > 0 ? Math.round(totalBonus / uniqueVendors) : 0;

      const start = new Date(campaign.start_date);
      const end = new Date(campaign.end_date);
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      metricsData.push({
        campaign_id: campaignId,
        campaign_name: campaign.name,
        total_sales: totalSales,
        approved_sales: approvedSales,
        pending_sales: pendingSales,
        rejected_sales: rejectedSales,
        observed_sales: observedSales,
        total_bonus_bs: totalBonus,
        total_points: totalPoints,
        unique_vendors: uniqueVendors,
        enrolled_vendors: enrolledCount || 0,
        approval_rate: approvalRate,
        avg_bonus_per_vendor: avgBonus,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        duration_days: durationDays,
      });
    }

    setMetrics(metricsData);
    setLoading(false);
  };

  const handleCampaignSelect = (value: string, slot: number) => {
    const newSelection = [...selectedCampaigns];
    newSelection[slot] = value;
    setSelectedCampaigns(newSelection.filter(Boolean));
  };

  const handleExport = () => {
    if (metrics.length === 0) {
      toast({ title: "Sin datos", description: "Selecciona campañas para comparar", variant: "destructive" });
      return;
    }

    const data = metrics.map((m) => ({
      Campaña: m.campaign_name,
      "Inicio": format(new Date(m.start_date), "dd/MM/yyyy", { locale: es }),
      "Fin": format(new Date(m.end_date), "dd/MM/yyyy", { locale: es }),
      "Duración (días)": m.duration_days,
      "Vendedores Inscritos": m.enrolled_vendors,
      "Vendedores Activos": m.unique_vendors,
      "Ventas Totales": m.total_sales,
      "Aprobadas": m.approved_sales,
      "Pendientes": m.pending_sales,
      "Rechazadas": m.rejected_sales,
      "Observadas": m.observed_sales,
      "Tasa Aprobación (%)": m.approval_rate,
      "Bonos Totales (Bs)": m.total_bonus_bs,
      "Puntos Totales": m.total_points,
      "Promedio Bono/Vendedor (Bs)": m.avg_bonus_per_vendor,
    }));

    exportToExcel(data, `comparacion_campañas_${format(new Date(), "yyyyMMdd")}`);
    toast({ title: "Exportado", description: `${data.length} campañas comparadas` });
  };

  const chartData = metrics.map(m => ({
    name: m.campaign_name.length > 20 ? m.campaign_name.substring(0, 20) + "..." : m.campaign_name,
    "Aprobadas": m.approved_sales,
    "Pendientes": m.pending_sales,
    "Rechazadas": m.rejected_sales,
    "Observadas": m.observed_sales,
  }));

  const bonusChartData = metrics.map(m => ({
    name: m.campaign_name.length > 20 ? m.campaign_name.substring(0, 20) + "..." : m.campaign_name,
    "Bonos Totales": m.total_bonus_bs,
    "Promedio/Vendedor": m.avg_bonus_per_vendor,
  }));

  if (compareEnabled === null) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (compareEnabled === false) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground text-sm">
          El comparador de campañas está deshabilitado desde Configuración.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-primary" />
            Comparador de Campañas
          </h1>
          <p className="text-sm text-muted-foreground">Analiza el rendimiento lado a lado</p>
        </div>
        <Button onClick={handleExport} disabled={loading || metrics.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          Excel
        </Button>
      </div>

      {/* Campaign Selectors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Selecciona campañas (hasta 3)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Campaña {slot + 1}</label>
                <Select
                  value={selectedCampaigns[slot] || ""}
                  onValueChange={(value) => handleCampaignSelect(value, slot)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Selecciona campaña ${slot + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns
                      .filter(c => !selectedCampaigns.includes(c.id) || selectedCampaigns[slot] === c.id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : metrics.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            Selecciona al menos una campaña para comparar métricas
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.map((m) => (
              <Card key={m.campaign_id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-display leading-tight">{m.campaign_name}</CardTitle>
                    <Badge variant={m.approval_rate >= 80 ? "default" : m.approval_rate >= 60 ? "secondary" : "destructive"}>
                      {m.approval_rate}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.start_date), "dd MMM", { locale: es })} - {format(new Date(m.end_date), "dd MMM yyyy", { locale: es })}
                    <span className="ml-1">({m.duration_days}d)</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Vendors */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>Vendedores</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Inscritos</p>
                        <p className="text-lg font-bold">{m.enrolled_vendors}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Activos</p>
                        <p className="text-lg font-bold text-primary">{m.unique_vendors}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sales */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      <span>Ventas</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">{m.total_sales}</p>
                      </div>
                      <div>
                        <p className="text-xs text-chart-2">Aprobadas</p>
                        <p className="text-lg font-bold text-chart-2">{m.approved_sales}</p>
                      </div>
                      <div>
                        <p className="text-xs text-chart-3">Pendientes</p>
                        <p className="text-lg font-bold text-chart-3">{m.pending_sales}</p>
                      </div>
                    </div>
                  </div>

                  {/* Money */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Bonificaciones</span>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-xl font-bold text-primary">Bs {m.total_bonus_bs.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Promedio/Vendedor</p>
                        <p className="text-base font-semibold">Bs {m.avg_bonus_per_vendor.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Indicator */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Puntos Totales:</span>
                      <span className="font-bold">{m.total_points.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          {metrics.length >= 2 && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-display">Comparación de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Aprobadas" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="Pendientes" fill="hsl(var(--chart-3))" />
                      <Bar dataKey="Rechazadas" fill="hsl(var(--chart-4))" />
                      <Bar dataKey="Observadas" fill="hsl(25, 95%, 53%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-display">Comparación de Bonificaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bonusChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Bonos Totales" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="Promedio/Vendedor" fill="hsl(var(--chart-5))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
