import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Package, Trophy, Clock, XCircle, AlertCircle } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState("");
  const [stats, setStats] = useState({ approved: 0, bonusBs: 0, points: 0, pending: 0, rejected: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  useEffect(() => {
    supabase.from("campaigns").select("id, name").eq("is_active", true).then(({ data }) => {
      if (data && data.length > 0) {
        setCampaigns(data);
        setSelectedCampaign(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!user || !selectedCampaign) return;

    const loadStats = async () => {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!vendor) return;

      const { data: sales } = await supabase
        .from("sales")
        .select("status, points, bonus_bs")
        .eq("vendor_id", vendor.id)
        .eq("campaign_id", selectedCampaign);

      if (sales) {
        setStats({
          approved: sales.filter(s => s.status === 'approved').length,
          bonusBs: sales.filter(s => s.status === 'approved').reduce((sum, s) => sum + Number(s.bonus_bs), 0),
          points: sales.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.points, 0),
          pending: sales.filter(s => s.status === 'pending').length,
          rejected: sales.filter(s => s.status === 'rejected').length,
        });
      }
    };

    loadStats();
  }, [user, selectedCampaign]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const boliviaOffset = -4 * 60;
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
      const boliviaNow = new Date(utcNow + boliviaOffset * 60000);

      const dayOfWeek = boliviaNow.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

      const target = new Date(boliviaNow);
      target.setDate(target.getDate() + daysUntilSunday);
      target.setHours(23, 59, 59, 0);

      const diff = target.getTime() - boliviaNow.getTime();
      if (diff <= 0) {
        setCountdown("Cierre completado");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${days}d ${hours}h ${mins}m ${secs}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Unidades Aprobadas", value: String(stats.approved), icon: Package, color: "text-success" },
    { label: "Bono Bs Aprobado", value: `Bs ${stats.bonusBs}`, icon: LayoutDashboard, color: "text-primary" },
    { label: "Puntos Acumulados", value: String(stats.points), icon: Trophy, color: "text-warning" },
    { label: "Pendientes", value: String(stats.pending), icon: AlertCircle, color: "text-muted-foreground" },
    { label: "Rechazados", value: String(stats.rejected), icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mi Panel</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu actividad como vendedor</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Campaña" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Cierre semanal (Dom 23:59)</p>
                <p className="text-sm font-mono font-bold text-primary">{countdown}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bienvenido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Registra tus ventas semanales antes del cierre del domingo a las 23:59 (hora Bolivia).
            Cada venta aprobada acumula puntos y bonos en Bs según el producto vendido.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
