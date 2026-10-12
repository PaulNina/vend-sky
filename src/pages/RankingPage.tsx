import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Trophy, ChevronLeft, ChevronRight } from "lucide-react";

interface Campaign {
  id: number;
  nombre: string;
  activo: boolean;
  registroHabilitado?: boolean;
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

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const PAGE_SIZE = 25;

export default function RankingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    apiGet<Campaign[]>("/campaigns").then((data) => {
      const list = (data || []).filter((c) => c.activo || c.registroHabilitado);
      setCampaigns(list);
      const active = list.find((c) => c.activo);
      if (active) {
        setSelectedCampaign(String(active.id));
      } else {
        setSelectedCampaign("all");
      }
    }).catch(() => {});
  }, []);

  const fetchRanking = useCallback((page: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (selectedCampaign && selectedCampaign !== "all") {
      params.set("campanaId", selectedCampaign);
    }
    if (selectedCity !== "all") params.set("city", selectedCity);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    apiGet<PageResponse<RankingEntry>>(`/ranking?${params}`)
      .then((data) => {
        const entries = data?.content || [];
        setRanking(entries);
        setTotalElements(data?.totalElements || 0);
        setTotalPages(data?.totalPages || 0);

        // Collect cities from first page only
        if (page === 0) {
          const uniqueCities = [...new Set(entries.map((r) => r.city).filter(Boolean))];
          setCities((prev) => {
            const merged = [...new Set([...prev, ...uniqueCities])];
            return merged;
          });
        }
      })
      .catch(() => setRanking([]))
      .finally(() => setLoading(false));
  }, [selectedCampaign, selectedCity, startDate, endDate]);

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setCurrentPage(0);
    fetchRanking(0);
  }, [selectedCampaign, selectedCity, startDate, endDate]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    fetchRanking(page);
  };

  const rankIcon = (globalRank: number) => {
    if (globalRank === 1) return "🥇";
    if (globalRank === 2) return "🥈";
    if (globalRank === 3) return "🥉";
    return String(globalRank);
  };

  const getRowClassName = (rank: number) => {
    const base = "transition-all duration-150 border-white/5 ";
    if (rank === 1) return base + "bg-amber-500/10 border-l-4 border-l-amber-500 hover:bg-amber-500/15";
    if (rank === 2) return base + "bg-slate-300/10 border-l-4 border-l-slate-300 hover:bg-slate-300/15";
    if (rank === 3) return base + "bg-amber-700/10 border-l-4 border-l-amber-700 hover:bg-amber-700/15";
    return base + "hover:bg-white/5";
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Ranking
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Clasificación de vendedores
            {totalElements > 0 && (
              <span className="ml-2 font-medium text-foreground">{totalElements} vendedores</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[180px] text-xs sm:text-sm glass-card border-white/10"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent className="glass-card">
              <SelectItem value="all">Todas las campañas</SelectItem>
              {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre} {c.activo ? "🟢 (Activa)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[150px] text-xs sm:text-sm glass-card border-white/10"><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent className="glass-card">
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              type="date"
              className="w-[130px] text-xs sm:text-sm h-9 glass-card border-white/10"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-muted-foreground text-sm">-</span>
            <Input
              type="date"
              className="w-[130px] text-xs sm:text-sm h-9 glass-card border-white/10"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="glass-card border-white/5 overflow-hidden shadow-xl">
          <CardContent className="p-0">
            {ranking.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">Sin datos de ranking</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/5">
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
                    {ranking.map((r) => (
                      <TableRow key={r.vendorId} className={getRowClassName(r.rank)}>
                        <TableCell className="font-bold text-base">{rankIcon(r.rank)}</TableCell>
                        <TableCell className="font-medium">{r.fullName}</TableCell>
                        <TableCell><Badge variant="outline" className="border-white/10 bg-background/50">{r.city}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.storeName || "—"}</TableCell>
                        <TableCell className="text-right font-bold text-primary font-display">{r.totalPoints}</TableCell>
                        <TableCell className="text-right font-semibold">Bs {Number(r.totalBonusBs).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{r.totalUnits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Página {currentPage + 1} de {totalPages} · {totalElements} vendedores
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const pageNum = Math.max(0, Math.min(currentPage - 2, totalPages - 5)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0 text-xs"
                            onClick={() => goToPage(pageNum)}
                          >
                            {pageNum + 1}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
