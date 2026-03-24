import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Trophy } from "lucide-react";

interface Campaign {
  id: number;
  nombre: string;
}

interface RankingEntry {
  rank: number;
  vendorId: number;
  fullName: string;
  city: string;
  storeName?: string;
  totalPoints: number;
  totalBonusBs: number;
  totalUnits: number;
}

export default function RankingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    apiGet<Campaign[]>("/campaigns").then((data) => {
      setCampaigns(data || []);
      if (data?.length) setSelectedCampaign(String(data[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    setLoading(true);
    const params = new URLSearchParams({ campanaId: selectedCampaign });
    if (selectedCity !== "all") params.set("city", selectedCity);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    
    apiGet<RankingEntry[]>(`/ranking?${params}`)
      .then((data) => {
        setRanking(data || []);
        const uniqueCities = [...new Set((data || []).map((r) => r.city).filter(Boolean))];
        setCities(uniqueCities);
      })
      .catch(() => setRanking([]))
      .finally(() => setLoading(false));
  }, [selectedCampaign, selectedCity, startDate, endDate]);

  const rankIcon = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return String(i + 1);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Ranking
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Clasificación de vendedores</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[180px] text-xs sm:text-sm"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[150px] text-xs sm:text-sm"><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input 
              type="date" 
              className="w-[130px] text-xs sm:text-sm h-9" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
            <span className="text-muted-foreground text-sm">-</span>
            <Input 
              type="date" 
              className="w-[130px] text-xs sm:text-sm h-9" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {ranking.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">Sin datos de ranking</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Tienda</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead className="text-right">Bono Bs</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r, i) => (
                    <TableRow key={r.vendorId} className={i < 3 ? "bg-primary/5" : ""}>
                      <TableCell className="font-bold text-base">{rankIcon(i)}</TableCell>
                      <TableCell className="font-medium">{r.fullName}</TableCell>
                      <TableCell><Badge variant="outline">{r.city}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.storeName || "—"}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{r.totalPoints}</TableCell>
                      <TableCell className="text-right">Bs {Number(r.totalBonusBs).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{r.totalUnits}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
