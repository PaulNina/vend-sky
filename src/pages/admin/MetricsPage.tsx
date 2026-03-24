import { useState, useEffect, useMemo } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, BarChart3, TrendingUp, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToExcel } from "@/lib/exportExcel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Campaign { id: number; nombre: string; fechaInicio: string; fechaFin: string; }

interface MetricsData {
  totalVentas: number;
  ventasAprobadas: number;
  ventasPendientes: number;
  ventasRechazadas: number;
  totalBonusBs: number;
  totalPuntos: number;
  totalVendedores: number;
  ventasPorCiudad: { ciudad: string; total: number; aprobadas: number; pendientes: number; rechazadas: number; bonusBs: number }[];
  ventasPorProducto: { productoNombre: string; productoModelo: string; total: number; bonusBs: number }[];
  ventasPorTipo: { tipo: string; total: number; bonusBs: number }[];
}

export default function MetricsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
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
    apiGet<MetricsData>(`/admin/dashboard?campanaId=${selectedCampaign}`)
      .then((data) => { setMetrics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedCampaign]);

  const activeCampaign = campaigns.find((c) => String(c.id) === selectedCampaign);
  const cityData = metrics?.ventasPorCiudad || [];
  const productData = metrics?.ventasPorProducto || [];

  const statusPieData = metrics ? [
    { name: "Aprobadas", value: metrics.ventasAprobadas, color: "hsl(142, 76%, 36%)" },
    { name: "Pendientes", value: metrics.ventasPendientes, color: "hsl(43, 96%, 56%)" },
    { name: "Rechazadas", value: metrics.ventasRechazadas, color: "hsl(0, 72%, 51%)" },
  ].filter((d) => d.value > 0) : [];

  const exportCity = () => exportToExcel(cityData.map((c) => ({ Ciudad: c.ciudad, Total: c.total, Aprobadas: c.aprobadas, "Bono Bs": c.bonusBs })), "metricas_ciudad");
  const exportProducts = () => exportToExcel(productData.map((p) => ({ Producto: p.productoNombre, Modelo: p.productoModelo, Unidades: p.total, "Bono Bs": p.bonusBs })), "metricas_producto");
  const exportTypes = () => exportToExcel(metrics?.ventasPorTipo?.map((t) => ({ Categoría: t.tipo, Ventas: t.total, "Bono Bs": t.bonusBs })) || [], "metricas_categorias");

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />Métricas & Reportes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Estadísticas por ciudad y producto</p>
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Campaña" /></SelectTrigger>
          <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {activeCampaign && (
        <Card className="border-primary/20 bg-gradient-to-r from-card to-primary/5">
          <CardContent className="py-3 px-5 flex flex-wrap items-center gap-4 text-sm">
            <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaña</span><p className="font-semibold font-display">{activeCampaign.nombre}</p></div>
            <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Período</span><p className="font-medium">{activeCampaign.fechaInicio} → {activeCampaign.fechaFin}</p></div>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 px-4"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Total Ventas</p><p className="text-xl font-bold font-display mt-0.5">{metrics.totalVentas}</p></CardContent></Card>
          <Card><CardContent className="py-3 px-4"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Aprobadas</p><p className="text-xl font-bold font-display mt-0.5 text-success">{metrics.ventasAprobadas}</p></CardContent></Card>
          <Card><CardContent className="py-3 px-4"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Total</p><p className="text-xl font-bold font-display mt-0.5">Bs {metrics.totalBonusBs?.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="py-3 px-4"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ciudades</p><p className="text-xl font-bold font-display mt-0.5">{cityData.length}</p></CardContent></Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="city">Por Ciudad</TabsTrigger>
            <TabsTrigger value="types">Por Categoría</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ventas por Ciudad</CardTitle></CardHeader>
                <CardContent>
                  {cityData.length === 0 ? <p className="text-center text-muted-foreground py-8">Sin datos</p> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={cityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 18%)" />
                        <XAxis type="number" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                        <YAxis dataKey="ciudad" type="category" width={100} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
                        <Bar dataKey="aprobadas" name="Aprobadas" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución de Estados</CardTitle></CardHeader>
                <CardContent>
                  {statusPieData.length === 0 ? <p className="text-center text-muted-foreground py-8">Sin datos</p> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name">
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
          </TabsContent>

          <TabsContent value="city" className="mt-4 space-y-4">
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={exportCity}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button></div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Ciudad</TableHead><TableHead className="text-right">Total Uds</TableHead><TableHead className="text-right">Aprobadas</TableHead><TableHead className="text-right">Bono Bs</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cityData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">Sin datos</TableCell></TableRow> :
                    cityData.map((c) => (
                      <TableRow key={c.ciudad}>
                        <TableCell><Badge variant="outline" className="text-[11px]">{c.ciudad}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{c.total}</TableCell>
                        <TableCell className="text-right text-success font-medium">{c.aprobadas}</TableCell>
                        <TableCell className="text-right">Bs {c.bonusBs?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="types" className="mt-4 space-y-4">
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={exportTypes}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-display tracking-tight">Distribución por Categoría</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={metrics.ventasPorTipo} 
                        cx="50%" cy="50%" 
                        innerRadius={60} outerRadius={90} 
                        dataKey="total" nameKey="tipo"
                        paddingAngle={5}
                      >
                        {metrics.ventasPorTipo.map((_, i) => (
                          <Cell key={i} fill={[`hsl(var(--primary))`, `hsl(var(--secondary))`, `hsl(var(--accent))`, `hsl(var(--muted))`, `hsl(150, 70%, 40%)`][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(216, 50%, 12%)", border: "1px solid hsl(150, 30%, 18%)", borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Ventas</TableHead><TableHead className="text-right">Bono Bs</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {metrics.ventasPorTipo.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Sin datos</TableCell></TableRow> :
                        metrics.ventasPorTipo.map((t) => (
                          <TableRow key={t.tipo}>
                            <TableCell className="font-medium">{t.tipo}</TableCell>
                            <TableCell className="text-right font-bold">{t.total}</TableCell>
                            <TableCell className="text-right text-success">Bs {t.bonusBs.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-4 space-y-4">
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={exportProducts}><Download className="h-4 w-4 mr-1.5" />Exportar Excel</Button></div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Producto</TableHead><TableHead>Modelo</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Bono Bs</TableHead></TableRow></TableHeader>
                <TableBody>
                  {productData.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Sin datos</TableCell></TableRow> :
                    productData.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.productoNombre}</TableCell>
                        <TableCell className="font-mono text-xs">{p.productoModelo}</TableCell>
                        <TableCell className="text-right font-bold">{p.total}</TableCell>
                        <TableCell className="text-right">Bs {p.bonusBs?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
