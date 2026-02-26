import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToExcel } from "@/lib/exportExcel";

interface Campaign {
  id: string;
  name: string;
}

interface WeekRow {
  week_start: string;
  week_end: string;
  total_units: number;
  approved_units: number;
  pending_units: number;
  rejected_units: number;
  total_bonus_bs: number;
  total_points: number;
}

interface CityRow {
  city: string;
  vendor_count: number;
  total_units: number;
  approved_units: number;
  total_bonus_bs: number;
  total_points: number;
}

export default function MetricsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [weeklyData, setWeeklyData] = useState<WeekRow[]>([]);
  const [cityData, setCityData] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("campaigns").select("id, name").order("created_at", { ascending: false }).then(({ data }) => {
      if (data && data.length > 0) {
        setCampaigns(data);
        setSelectedCampaign(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);
    loadMetrics();
  }, [selectedCampaign]);

  const loadMetrics = async () => {
    // Fetch raw sales for the campaign and aggregate by week and city
    const { data: sales } = await supabase
      .from("sales")
      .select("week_start, week_end, status, bonus_bs, points, city, vendor_id")
      .eq("campaign_id", selectedCampaign)
      .order("week_start", { ascending: true });

    if (!sales) {
      setWeeklyData([]);
      setCityData([]);
      setLoading(false);
      return;
    }

    // Weekly aggregation
    const weekMap = new Map<string, WeekRow>();
    for (const s of sales) {
      const key = s.week_start;
      const row = weekMap.get(key) || {
        week_start: s.week_start,
        week_end: s.week_end,
        total_units: 0,
        approved_units: 0,
        pending_units: 0,
        rejected_units: 0,
        total_bonus_bs: 0,
        total_points: 0,
      };
      row.total_units++;
      if (s.status === "approved") {
        row.approved_units++;
        row.total_bonus_bs += Number(s.bonus_bs);
        row.total_points += Number(s.points);
      } else if (s.status === "pending") {
        row.pending_units++;
      } else if (s.status === "rejected") {
        row.rejected_units++;
      }
      weekMap.set(key, row);
    }
    setWeeklyData(Array.from(weekMap.values()));

    // City aggregation with unique vendor count
    const cityMap = new Map<string, CityRow & { vendors: Set<string> }>();
    for (const s of sales) {
      const row = cityMap.get(s.city) || {
        city: s.city,
        vendor_count: 0,
        total_units: 0,
        approved_units: 0,
        total_bonus_bs: 0,
        total_points: 0,
        vendors: new Set<string>(),
      };
      row.total_units++;
      row.vendors.add(s.vendor_id);
      if (s.status === "approved") {
        row.approved_units++;
        row.total_bonus_bs += Number(s.bonus_bs);
        row.total_points += Number(s.points);
      }
      cityMap.set(s.city, row);
    }
    const cityArr: CityRow[] = Array.from(cityMap.values()).map((r) => ({
      city: r.city,
      vendor_count: r.vendors.size,
      total_units: r.total_units,
      approved_units: r.approved_units,
      total_bonus_bs: r.total_bonus_bs,
      total_points: r.total_points,
    }));
    cityArr.sort((a, b) => b.total_units - a.total_units);
    setCityData(cityArr);
    setLoading(false);
  };

  // Accumulated weekly data
  const weeklyWithAccum = useMemo(() => {
    let accumUnits = 0;
    let accumBs = 0;
    return weeklyData.map((w, i) => {
      accumUnits += w.approved_units;
      accumBs += w.total_bonus_bs;
      return { ...w, weekNum: i + 1, accumUnits, accumBs };
    });
  }, [weeklyData]);

  const weeklyTotals = useMemo(() => {
    return weeklyData.reduce(
      (acc, w) => ({
        units: acc.units + w.total_units,
        approved: acc.approved + w.approved_units,
        pending: acc.pending + w.pending_units,
        rejected: acc.rejected + w.rejected_units,
        bs: acc.bs + w.total_bonus_bs,
        pts: acc.pts + w.total_points,
      }),
      { units: 0, approved: 0, pending: 0, rejected: 0, bs: 0, pts: 0 }
    );
  }, [weeklyData]);

  const cityTotals = useMemo(() => {
    return cityData.reduce(
      (acc, c) => ({
        vendors: acc.vendors + c.vendor_count,
        units: acc.units + c.total_units,
        approved: acc.approved + c.approved_units,
        bs: acc.bs + c.total_bonus_bs,
        pts: acc.pts + c.total_points,
      }),
      { vendors: 0, units: 0, approved: 0, bs: 0, pts: 0 }
    );
  }, [cityData]);

  const exportWeekly = () => {
    exportToExcel(
      weeklyWithAccum.map((w) => ({
        Semana: w.weekNum,
        Inicio: w.week_start,
        Fin: w.week_end,
        Total: w.total_units,
        Aprobadas: w.approved_units,
        Pendientes: w.pending_units,
        Rechazadas: w.rejected_units,
        "Bono Bs": w.total_bonus_bs,
        Puntos: w.total_points,
        "Acum. Uds": w.accumUnits,
        "Acum. Bs": w.accumBs,
      })),
      "metricas_semanal"
    );
  };

  const exportCity = () => {
    exportToExcel(
      cityData.map((c) => ({
        Ciudad: c.city,
        Vendedores: c.vendor_count,
        Total: c.total_units,
        Aprobadas: c.approved_units,
        "Bono Bs": c.total_bonus_bs,
        Puntos: c.total_points,
      })),
      "metricas_ciudad"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="text-sm text-muted-foreground">Desglose semanal y por ciudad</p>
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Campaña" />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="city">Por Ciudad</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportWeekly}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sem.</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Aprob.</TableHead>
                      <TableHead className="text-right">Pend.</TableHead>
                      <TableHead className="text-right">Rech.</TableHead>
                      <TableHead className="text-right">Bs</TableHead>
                      <TableHead className="text-right">Pts</TableHead>
                      <TableHead className="text-right">Acum. Uds</TableHead>
                      <TableHead className="text-right">Acum. Bs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyWithAccum.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          Sin datos para esta campaña
                        </TableCell>
                      </TableRow>
                    ) : (
                      weeklyWithAccum.map((w) => (
                        <TableRow key={w.week_start}>
                          <TableCell className="font-bold">{w.weekNum}</TableCell>
                          <TableCell className="text-sm">
                            {w.week_start} → {w.week_end}
                          </TableCell>
                          <TableCell className="text-right font-medium">{w.total_units}</TableCell>
                          <TableCell className="text-right text-success">{w.approved_units}</TableCell>
                          <TableCell className="text-right text-warning">{w.pending_units}</TableCell>
                          <TableCell className="text-right text-destructive">{w.rejected_units}</TableCell>
                          <TableCell className="text-right">Bs {w.total_bonus_bs.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{w.total_points}</TableCell>
                          <TableCell className="text-right font-bold">{w.accumUnits}</TableCell>
                          <TableCell className="text-right font-bold">Bs {w.accumBs.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {weeklyWithAccum.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold">TOTAL</TableCell>
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

          <TabsContent value="city" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportCity}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ciudad</TableHead>
                      <TableHead className="text-right">Vendedores</TableHead>
                      <TableHead className="text-right">Total Uds</TableHead>
                      <TableHead className="text-right">Aprobadas</TableHead>
                      <TableHead className="text-right">Bono Bs</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cityData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Sin datos para esta campaña
                        </TableCell>
                      </TableRow>
                    ) : (
                      cityData.map((c) => (
                        <TableRow key={c.city}>
                          <TableCell>
                            <Badge variant="outline">{c.city}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{c.vendor_count}</TableCell>
                          <TableCell className="text-right font-medium">{c.total_units}</TableCell>
                          <TableCell className="text-right text-success">{c.approved_units}</TableCell>
                          <TableCell className="text-right">Bs {c.total_bonus_bs.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{c.total_points}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {cityData.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-bold">TOTAL</TableCell>
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
        </Tabs>
      )}
    </div>
  );
}
