import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
  const { user, roles } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorCity, setVendorCity] = useState<string | null>(null);

  const isAdmin = roles.includes("admin") || roles.includes("supervisor");

  // Get vendor's city
  useEffect(() => {
    if (!user || isAdmin) return;
    supabase.from("vendors").select("city").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setVendorCity(data.city);
    });
  }, [user, isAdmin]);

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

  // For vendors: only show their city. For admins: show all.
  const filteredRanking = !isAdmin && vendorCity
    ? ranking.filter((r) => r.city === vendorCity)
    : ranking;

  const top3 = filteredRanking.slice(0, 3);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Ranking
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {!isAdmin && vendorCity
              ? `Clasificación en ${vendorCity}`
              : "Clasificación por puntos"}
          </p>
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Campaña" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 cards */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {top3.map((entry, i) => {
                const p = podiumIcons[i];
                return (
                  <Card key={entry.vendor_id} className={`border ${p.bg} hover:shadow-md transition-shadow`}>
                    <CardContent className="p-4 sm:p-5 flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                      <p.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${p.color} shrink-0`} />
                      <div className="flex-1 sm:flex-none min-w-0">
                        <p className="text-base sm:text-lg font-bold font-display">#{i + 1} {entry.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{entry.store_name} — {entry.city}</p>
                        <div className="flex sm:justify-center gap-3 text-xs sm:text-sm mt-1 sm:pt-1">
                          <span className="text-primary font-bold">{entry.total_points} pts</span>
                          <span>Bs {entry.total_bonus_bs}</span>
                          <span>{entry.total_units} uds</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Ranking list */}
          <Card>
            <CardContent className="p-0">
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Tienda</TableHead>
                      {isAdmin && <TableHead>Ciudad</TableHead>}
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
                        {isAdmin && <TableCell><Badge variant="outline" className="text-[11px]">{entry.city}</Badge></TableCell>}
                        <TableCell className="text-right font-bold text-primary">{entry.total_points}</TableCell>
                        <TableCell className="text-right">Bs {entry.total_bonus_bs}</TableCell>
                        <TableCell className="text-right">{entry.total_units}</TableCell>
                      </TableRow>
                    ))}
                    {filteredRanking.length === 0 && (
                      <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-12">Sin datos</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {filteredRanking.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 text-sm">Sin datos</p>
                ) : filteredRanking.map((entry, i) => (
                  <div key={entry.vendor_id} className="p-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-primary w-6 text-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.store_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{entry.total_points} pts</p>
                      <p className="text-xs text-muted-foreground">Bs {entry.total_bonus_bs}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
