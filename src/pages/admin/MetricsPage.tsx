import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, BarChart3, TrendingUp, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToExcel } from "@/lib/exportExcel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Campaign { 
  id: number; 
  nombre: string; 
  fechaInicio: string; 
  fechaFin: string; 
  activo?: boolean;
  registroHabilitado?: boolean;
}

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
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Métricas & Reportes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Estadísticas de ventas por ciudad y por producto</p>
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[220px] bg-black/20 border-white/10 text-white h-10 text-xs"><SelectValue placeholder="Seleccionar Campaña" /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">{campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)} className="focus:bg-white/5 focus:text-white text-xs">{c.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {activeCampaign && (
        <Card className="glass-card border-primary/20 bg-gradient-to-r from-slate-900/40 via-primary/5 to-slate-900/40 hover-glow-primary transition-all duration-300">
          <CardContent className="py-3.5 px-5 flex flex-wrap items-center gap-6 text-xs text-white">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Campaña Activa</span>
              <p className="font-bold font-display text-white text-sm mt-0.5">{activeCampaign.nombre}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Período de Validez</span>
              <p className="font-medium text-slate-300 mt-0.5">{activeCampaign.fechaInicio} — {activeCampaign.fechaFin}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-white">
          <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 hover-glow-primary transition-all duration-300">
            <CardContent className="py-3.5 px-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Ventas</p>
              <p className="text-xl font-bold font-display mt-1 text-white">{metrics.totalVentas}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 hover-glow-success transition-all duration-300">
            <CardContent className="py-3.5 px-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Aprobadas</p>
              <p className="text-xl font-bold font-display mt-1 text-emerald-450">{metrics.ventasAprobadas}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 hover-glow-primary transition-all duration-300">
            <CardContent className="py-3.5 px-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Bono Total</p>
              <p className="text-xl font-bold font-display mt-1 text-primary">Bs {metrics.totalBonusBs?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/5 shadow-xl hover:border-white/10 hover-glow-primary transition-all duration-300">
            <CardContent className="py-3.5 px-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Ciudades</p>
              <p className="text-xl font-bold font-display mt-1 text-white">{cityData.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        metrics && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-black/40 border border-white/5 p-1 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
                Vista General
              </TabsTrigger>
              <TabsTrigger value="city" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
                Por Ciudad
              </TabsTrigger>
              <TabsTrigger value="types" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
                Por Categoría
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-white/5 data-[state=active]:text-white focus:ring-0">
                Productos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-6 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card border-white/5 text-white shadow-xl hover:border-white/10 transition-all duration-300">
                  <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-display text-white font-semibold">Ventas por Ciudad</CardTitle></CardHeader>
                  <CardContent className="pt-4">
                    {cityData.length === 0 ? <p className="text-center text-slate-500 py-8 text-xs">Sin datos disponibles</p> : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={cityData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <YAxis dataKey="ciudad" type="category" width={100} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f8fafc" }} />
                          <Bar dataKey="aprobadas" name="Aprobadas" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/5 text-white shadow-xl hover:border-white/10 transition-all duration-300">
                  <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-display text-white font-semibold">Distribución de Estados</CardTitle></CardHeader>
                  <CardContent className="pt-4">
                    {statusPieData.length === 0 ? <p className="text-center text-slate-500 py-8 text-xs">Sin datos disponibles</p> : (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name">
                            {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f8fafc" }} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="city" className="mt-4 space-y-4 outline-none">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={exportCity} className="border-white/10 hover:bg-white/5 text-white text-xs">
                  <Download className="h-4 w-4 mr-1.5" />Exportar Excel
                </Button>
              </div>
              <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                        <TableHead className="text-xs text-muted-foreground">Ciudad</TableHead>
                        <TableHead className="text-right text-xs text-muted-foreground">Total Uds</TableHead>
                        <TableHead className="text-right text-xs text-muted-foreground">Aprobadas</TableHead>
                        <TableHead className="text-right text-xs text-muted-foreground">Bono Bs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cityData.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={4} className="text-center text-slate-500 py-12 text-xs">Sin datos registrados</TableCell>
                        </TableRow>
                      ) : (
                        cityData.map((c) => (
                          <TableRow key={c.ciudad} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                            <TableCell><Badge variant="outline" className="text-[10px] border-white/10 text-slate-300 bg-white/5">{c.ciudad}</Badge></TableCell>
                            <TableCell className="text-right font-semibold text-white text-sm">{c.total}</TableCell>
                            <TableCell className="text-right text-emerald-450 font-semibold text-sm">{c.aprobadas}</TableCell>
                            <TableCell className="text-right text-white font-semibold text-sm">Bs {c.bonusBs?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="types" className="mt-4 space-y-4 outline-none">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={exportTypes} className="border-white/10 hover:bg-white/5 text-white text-xs">
                  <Download className="h-4 w-4 mr-1.5" />Exportar Excel
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card border-white/5 text-white shadow-xl hover:border-white/10 transition-all duration-300">
                  <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-display text-white font-semibold">Distribución por Categoría</CardTitle></CardHeader>
                  <CardContent className="pt-4">
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
                            <Cell key={i} fill={["#fbbf24", "#3b82f6", "#ec4899", "#6b7280", "#10b981"][i % 5]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                          <TableHead className="text-xs text-muted-foreground">Categoría</TableHead>
                          <TableHead className="text-right text-xs text-muted-foreground">Ventas</TableHead>
                          <TableHead className="text-right text-xs text-muted-foreground">Bono Bs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.ventasPorTipo.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={3} className="text-center py-8 text-slate-500 text-xs">Sin datos registrados</TableCell>
                          </TableRow>
                        ) : (
                          metrics.ventasPorTipo.map((t) => (
                            <TableRow key={t.tipo} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                              <TableCell className="font-semibold text-white text-sm">{t.tipo}</TableCell>
                              <TableCell className="text-right font-bold text-white text-sm">{t.total}</TableCell>
                              <TableCell className="text-right text-emerald-450 font-semibold text-sm">Bs {t.bonusBs.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-4 space-y-4 outline-none">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={exportProducts} className="border-white/10 hover:bg-white/5 text-white text-xs">
                  <Download className="h-4 w-4 mr-1.5" />Exportar Excel
                </Button>
              </div>
              <Card className="glass-card border-white/5 overflow-hidden shadow-xl hover:border-white/10 transition-all duration-300">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-white/5 bg-white/5">
                        <TableHead className="w-[60px] text-xs text-muted-foreground">#</TableHead>
                        <TableHead className="text-xs text-muted-foreground">Producto</TableHead>
                        <TableHead className="text-xs text-muted-foreground">Modelo</TableHead>
                        <TableHead className="text-right text-xs text-muted-foreground">Unidades</TableHead>
                        <TableHead className="text-right text-xs text-muted-foreground">Bono Bs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productData.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={5} className="text-center text-slate-500 py-12 text-xs">Sin datos registrados</TableCell>
                        </TableRow>
                      ) : (
                        productData.map((p, i) => (
                          <TableRow key={i} className="transition-all duration-150 hover:bg-white/5 border-white/5">
                            <TableCell className="font-bold text-primary text-xs">{i + 1}</TableCell>
                            <TableCell className="font-semibold text-white text-sm">{p.productoNombre}</TableCell>
                            <TableCell className="font-mono text-xs text-slate-400">{p.productoModelo}</TableCell>
                            <TableCell className="text-right font-bold text-white text-sm">{p.total}</TableCell>
                            <TableCell className="text-right text-white font-semibold text-sm">Bs {p.bonusBs?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )
      )}
    </div>
  );
}
