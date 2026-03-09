import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Users, UserCheck, TrendingUp, Building2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface EnrollmentData {
  vendor_id: string;
  vendor_name: string;
  city: string;
  store_name: string | null;
  campaign_id: string;
  campaign_name: string;
  enrolled_at: string;
  status: string;
}

interface CityStats {
  city: string;
  total_vendors: number;
  enrolled: number;
  rate: number;
}

export default function EnrollmentReportPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [totalVendors, setTotalVendors] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCampaign]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, status")
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  const loadData = async () => {
    setLoading(true);

    // Get total active vendors
    const { count: vendorCount } = await supabase
      .from("vendors")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    setTotalVendors(vendorCount || 0);

    // Get enrollments with vendor and campaign data
    let query = supabase
      .from("vendor_campaign_enrollments")
      .select(`
        vendor_id,
        campaign_id,
        enrolled_at,
        status,
        vendors!inner(full_name, city, store_name),
        campaigns!inner(name)
      `)
      .order("enrolled_at", { ascending: false });

    if (selectedCampaign !== "all") {
      query = query.eq("campaign_id", selectedCampaign);
    }

    const { data: enrollmentData } = await query;

    const mapped: EnrollmentData[] = (enrollmentData || []).map((e: any) => ({
      vendor_id: e.vendor_id,
      vendor_name: e.vendors.full_name,
      city: e.vendors.city,
      store_name: e.vendors.store_name,
      campaign_id: e.campaign_id,
      campaign_name: e.campaigns.name,
      enrolled_at: e.enrolled_at,
      status: e.status,
    }));
    setEnrollments(mapped);

    // Calculate city stats
    if (selectedCampaign !== "all") {
      const { data: vendorsByCity } = await supabase
        .from("vendors")
        .select("city")
        .eq("is_active", true);

      const cityVendorCount: Record<string, number> = {};
      (vendorsByCity || []).forEach((v: any) => {
        cityVendorCount[v.city] = (cityVendorCount[v.city] || 0) + 1;
      });

      const enrolledByCity: Record<string, number> = {};
      mapped.filter(e => e.status === "active").forEach((e) => {
        enrolledByCity[e.city] = (enrolledByCity[e.city] || 0) + 1;
      });

      const stats: CityStats[] = Object.keys(cityVendorCount).map((city) => ({
        city,
        total_vendors: cityVendorCount[city],
        enrolled: enrolledByCity[city] || 0,
        rate: Math.round(((enrolledByCity[city] || 0) / cityVendorCount[city]) * 100),
      })).sort((a, b) => b.rate - a.rate);

      setCityStats(stats);
    } else {
      setCityStats([]);
    }

    setLoading(false);
  };

  const summary = useMemo(() => {
    const activeEnrollments = enrollments.filter(e => e.status === "active");
    const uniqueVendors = new Set(activeEnrollments.map(e => e.vendor_id)).size;
    const rate = totalVendors > 0 ? Math.round((uniqueVendors / totalVendors) * 100) : 0;
    return { total: activeEnrollments.length, uniqueVendors, rate };
  }, [enrollments, totalVendors]);

  const handleExport = () => {
    if (enrollments.length === 0) {
      toast({ title: "Sin datos", description: "No hay inscripciones para exportar", variant: "destructive" });
      return;
    }

    const data = enrollments.map((e) => ({
      Vendedor: e.vendor_name,
      Ciudad: e.city,
      Tienda: e.store_name || "—",
      Campaña: e.campaign_name,
      "Fecha Inscripción": format(new Date(e.enrolled_at), "dd/MM/yyyy HH:mm", { locale: es }),
      Estado: e.status === "active" ? "Activa" : "Inactiva",
    }));

    const campaignName = selectedCampaign === "all" 
      ? "todas" 
      : campaigns.find(c => c.id === selectedCampaign)?.name || "campaña";

    exportToExcel(data, `inscripciones_${campaignName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}`);
    toast({ title: "Exportado", description: `${data.length} registros exportados a Excel` });
  };

  const handleExportCityStats = () => {
    if (cityStats.length === 0) return;

    const data = cityStats.map((s) => ({
      Ciudad: s.city,
      "Total Vendedores": s.total_vendors,
      Inscritos: s.enrolled,
      "Tasa Adopción (%)": s.rate,
    }));

    const campaignName = campaigns.find(c => c.id === selectedCampaign)?.name || "campaña";
    exportToExcel(data, `adopcion_por_ciudad_${campaignName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}`);
    toast({ title: "Exportado" });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Reporte de Inscripciones
          </h1>
          <p className="text-sm text-muted-foreground">Estadísticas de adopción por campaña y ciudad</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Campaña" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las campañas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} disabled={loading || enrollments.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" />
              <span>Vendedores Activos</span>
            </div>
            <p className="text-2xl font-bold">{totalVendors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Inscripciones</span>
            </div>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>Vendedores Únicos</span>
            </div>
            <p className="text-2xl font-bold">{summary.uniqueVendors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Tasa Adopción</span>
            </div>
            <p className="text-2xl font-bold">{summary.rate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* City Stats (when campaign selected) */}
      {selectedCampaign !== "all" && cityStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-display">Adopción por Ciudad</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCityStats}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Exportar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cityStats.map((s) => (
                <div key={s.city} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{s.city}</span>
                    <span className="text-muted-foreground">
                      {s.enrolled}/{s.total_vendors} ({s.rate}%)
                    </span>
                  </div>
                  <Progress value={s.rate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Detalle de Inscripciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No hay inscripciones registradas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Tienda</TableHead>
                  {selectedCampaign === "all" && <TableHead>Campaña</TableHead>}
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.slice(0, 100).map((e, idx) => (
                  <TableRow key={`${e.vendor_id}-${e.campaign_id}-${idx}`}>
                    <TableCell className="font-medium">{e.vendor_name}</TableCell>
                    <TableCell>{e.city}</TableCell>
                    <TableCell className="text-muted-foreground">{e.store_name || "—"}</TableCell>
                    {selectedCampaign === "all" && (
                      <TableCell className="text-sm">{e.campaign_name}</TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(e.enrolled_at), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.status === "active" ? "default" : "secondary"}>
                        {e.status === "active" ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {enrollments.length > 100 && (
            <div className="text-center py-3 text-xs text-muted-foreground border-t">
              Mostrando 100 de {enrollments.length} registros. Exporta a Excel para ver todos.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
