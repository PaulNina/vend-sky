import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCities } from "@/hooks/useCities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";

interface RankingEntry {
  vendor_id: string; full_name: string; city: string; store_name: string;
  total_points: number; total_bonus_bs: number; total_units: number;
}
interface Campaign { id: string; name: string; }

const podiumIcons = [
  { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  { icon: Medal, color: "text-gray-300", bg: "bg-gray-300/10 border-gray-300/30" },
  { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10 border-amber-600/30" },
];

export default function RankingPage() {
  const { cityNames: ALL_CITIES } = useCities();
  const cities = ["Todas", ...ALL_CITIES];
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("Todas");

  useEffect(() => {
    supabase.from("campaigns").select("id, name").eq("is_active", true).then(({ data }) => {
      if (data && data.length > 0) { setCampaigns(data); setSelectedCampaign(data[0].id); }
    });
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);
    supabase.rpc("get_campaign_ranking", { _campaign_id: selectedCampaign }).then(({ data }) => {
      setRanking(data || []); setLoading(false);
    });
  }, [selectedCampaign]);

  const filteredRanking = cityFilter === "Todas" ? ranking : ranking.filter((r) => r.city === cityFilter);
  const top3 = filteredRanking.slice(0, 3);
  const cityGroups = ALL_CITIES.map((city) => ({ city, entries: ranking.filter((r) => r.city === city) })).filter((g) => g.entries.length > 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Ranking
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Clasificación de vendedores por puntos</p>
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Campaña" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="top3">Top 3</TabsTrigger>
            <TabsTrigger value="ciudad">Por Ciudad</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            {/* City filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {cities.map((city) => (
                <Badge
                  key={city}
                  variant={cityFilter === city ? "default" : "outline"}
                  className="cursor-pointer text-[11px] transition-colors"
                  onClick={() => setCityFilter(city)}
                >
                  {city} ({city === "Todas" ? ranking.length : ranking.filter((r) => r.city === city).length})
                </Badge>
              ))}
            </div>

            {/* Top 3 cards */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {top3.map((entry, i) => {
                  const p = podiumIcons[i];
                  return (
                    <Card key={entry.vendor_id} className={`border ${p.bg} hover:shadow-md transition-shadow`}>
                      <CardContent className="p-5 text-center space-y-2">
                        <p.icon className={`h-8 w-8 mx-auto ${p.color}`} />
                        <p className="text-lg font-bold font-display">#{i + 1}</p>
                        <p className="font-semibold">{entry.full_name}</p>
                        <p className="text-xs text-muted-foreground">{entry.store_name} — {entry.city}</p>
                        <div className="flex justify-center gap-4 text-sm pt-1">
                          <span className="text-primary font-bold">{entry.total_points} pts</span>
                          <span>Bs {entry.total_bonus_bs}</span>
                          <span>{entry.total_units} uds</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full table */}
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
                    {filteredRanking.map((entry, i) => (
                      <TableRow key={entry.vendor_id}>
                        <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                        <TableCell className="font-medium">{entry.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.store_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[11px]">{entry.city}</Badge></TableCell>
                        <TableCell className="text-right font-bold text-primary">{entry.total_points}</TableCell>
                        <TableCell className="text-right">Bs {entry.total_bonus_bs}</TableCell>
                        <TableCell className="text-right">{entry.total_units}</TableCell>
                      </TableRow>
                    ))}
                    {filteredRanking.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Sin datos para esta campaña</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top3" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {top3.map((entry, i) => {
                const p = podiumIcons[i];
                return (
                  <Card key={entry.vendor_id} className={`border-2 ${p.bg} hover:shadow-lg transition-shadow`}>
                    <CardContent className="p-6 text-center space-y-3">
                      <p.icon className={`h-12 w-12 mx-auto ${p.color}`} />
                      <p className="text-3xl font-bold font-display">#{i + 1}</p>
                      <p className="text-xl font-semibold">{entry.full_name}</p>
                      <p className="text-sm text-muted-foreground">{entry.store_name}</p>
                      <Badge variant="outline" className="text-[11px]">{entry.city}</Badge>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div>
                          <p className="text-2xl font-bold text-primary font-display">{entry.total_points}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Puntos</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold font-display">Bs {entry.total_bonus_bs}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Bono</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold font-display">{entry.total_units}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Unidades</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="ciudad" className="mt-4 space-y-6">
            {cityGroups.map(({ city, entries }) => (
              <Card key={city}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    {city}
                    <Badge variant="secondary" className="text-[10px]">{entries.length} vendedores</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Tienda</TableHead>
                        <TableHead className="text-right">Puntos</TableHead>
                        <TableHead className="text-right">Bs</TableHead>
                        <TableHead className="text-right">Uds</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, i) => (
                        <TableRow key={entry.vendor_id}>
                          <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                          <TableCell className="font-medium">{entry.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.store_name}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{entry.total_points}</TableCell>
                          <TableCell className="text-right">Bs {entry.total_bonus_bs}</TableCell>
                          <TableCell className="text-right">{entry.total_units}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
