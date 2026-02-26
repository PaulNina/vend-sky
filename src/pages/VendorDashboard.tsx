import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Package, Trophy, Clock, XCircle, AlertCircle, DollarSign } from "lucide-react";

interface Campaign { id: string; name: string; }

export default function VendorDashboard() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState("");
  const [stats, setStats] = useState({ approved: 0, bonusBs: 0, points: 0, pending: 0, rejected: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  useEffect(() => {
    supabase.from("campaigns").select("id, name").eq("is_active", true).then(({ data }) => {
      if (data && data.length > 0) { setCampaigns(data); setSelectedCampaign(data[0].id); }
    });
  }, []);

  useEffect(() => {
    if (!user || !selectedCampaign) return;
    const loadStats = async () => {
      const { data: vendor } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
      if (!vendor) return;
      const { data: sales } = await supabase.from("sales").select("status, points, bonus_bs").eq("vendor_id", vendor.id).eq("campaign_id", selectedCampaign);
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
      if (diff <= 0) { setCountdown("Cierre completado"); return; }
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
    { label: "Bono Aprobado", value: `Bs ${stats.bonusBs.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Puntos Acumulados", value: String(stats.points), icon: Trophy, color: "text-warning" },
    { label: "Pendientes", value: String(stats.pending), icon: AlertCircle, color: "text-muted-foreground" },
    { label: "Rechazados", value: String(stats.rejected), icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Mi Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Resumen de tu actividad como vendedor</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Countdown card */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-card to-primary/5">
        <CardContent className="py-4 px-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold shrink-0">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Cierre Semanal (Dom 23:59 BOT)</p>
            <p className="text-lg font-bold font-mono text-primary mt-0.5">{countdown}</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:border-primary/20 transition-all duration-200">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold font-display">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Welcome info */}
      <Card>
        <CardContent className="py-5 px-6">
          <h3 className="font-semibold font-display text-base mb-2">Bienvenido al Programa Bono Vendedor</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Registra tus ventas semanales antes del cierre del domingo a las 23:59 (hora Bolivia).
            Cada venta aprobada acumula puntos y bonos en Bs según el producto vendido.
            Revisa el ranking para ver tu posición entre los demás vendedores.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
