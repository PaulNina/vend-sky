import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Package, Trophy, Clock, XCircle, AlertCircle, AlertTriangle, DollarSign, Target, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Campaign { id: string; name: string; subtitle?: string | null; slug?: string | null; start_date: string; end_date: string; }
interface EnrolledCampaign extends Campaign { enrolled_at: string; status: string; }

export default function VendorDashboard() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState("");
  const [stats, setStats] = useState({ approved: 0, bonusBs: 0, points: 0, pending: 0, rejected: 0, observed: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [enrolledCampaigns, setEnrolledCampaigns] = useState<EnrolledCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadCampaigns = async () => {
      const { data: vendor } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
      if (!vendor) return;

      // Get active campaigns
      const { data: activeCampaigns } = await supabase.from("campaigns").select("id, name, subtitle, slug, start_date, end_date").eq("is_active", true).eq("status", "active").order("created_at", { ascending: false });
      
      // Get enrolled campaigns
      const { data: enrollments } = await supabase.from("vendor_campaign_enrollments").select("campaign_id, enrolled_at, status, campaigns(id, name, subtitle, slug, start_date, end_date)").eq("vendor_id", vendor.id).eq("status", "active");
      
      if (enrollments) {
        const enrolled = enrollments.map(e => ({ ...e.campaigns, enrolled_at: e.enrolled_at, status: e.status } as EnrolledCampaign)).filter(c => c.id);
        setEnrolledCampaigns(enrolled);
        
        // Set campaigns for dropdown (only enrolled ones)
        setCampaigns(enrolled);
        if (enrolled.length > 0) setSelectedCampaign(enrolled[0].id);
      }

      // Get available campaigns (not enrolled)
      if (activeCampaigns && enrollments) {
        const enrolledIds = enrollments.map(e => e.campaign_id);
        const available = activeCampaigns.filter(c => !enrolledIds.includes(c.id));
        setAvailableCampaigns(available);
      }
    };
    loadCampaigns();
  }, [user]);

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
          observed: sales.filter(s => s.status === 'observed').length,
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

  const handleEnroll = async (campaignId: string) => {
    if (!user) return;
    setEnrolling(campaignId);
    const { data: vendor } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
    if (!vendor) { toast({ title: "Error", description: "Perfil de vendedor no encontrado", variant: "destructive" }); setEnrolling(null); return; }
    
    const { error } = await supabase.from("vendor_campaign_enrollments").insert({ vendor_id: vendor.id, campaign_id: campaignId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setEnrolling(null); return; }
    
    toast({ title: "¡Inscrito!", description: "Te has inscrito exitosamente en la campaña" });
    setEnrolling(null);
    window.location.reload();
  };

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const statCards = [
    { label: "Aprobadas", value: String(stats.approved), icon: Package, color: "text-success" },
    { label: "Bono", value: `Bs ${stats.bonusBs.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Puntos", value: String(stats.points), icon: Trophy, color: "text-warning" },
    { label: "Pendientes", value: String(stats.pending), icon: AlertCircle, color: "text-muted-foreground" },
    ...(stats.observed > 0 ? [{ label: "Observadas", value: String(stats.observed), icon: AlertTriangle, color: "text-orange-500" }] : []),
    { label: "Rechazados", value: String(stats.rejected), icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Mi Panel
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Resumen de tu actividad</p>
        </div>
        {campaigns.length > 1 && (
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Campaña" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Countdown card */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-card to-primary/5">
        <CardContent className="py-3 sm:py-4 px-4 sm:px-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Cierre Semanal</p>
            <p className="text-base sm:text-lg font-bold font-mono text-primary mt-0.5">{countdown}</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats - 2 cols on mobile, 3 on sm, 5 on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:border-primary/20 transition-all duration-200">
            <CardContent className="py-2.5 sm:py-3 px-3 sm:px-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                  <stat.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold font-display">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Welcome info */}
      <Card>
        <CardContent className="py-4 sm:py-5 px-4 sm:px-6">
          <h3 className="font-semibold font-display text-sm sm:text-base mb-2">Bienvenido al Programa Bono Vendedor</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Registra tus ventas semanales antes del cierre del domingo a las 23:59 (hora Bolivia).
            Cada venta aprobada acumula puntos y bonos en Bs según el producto vendido.
          </p>
        </CardContent>
      </Card>

      {/* Available Campaigns */}
      {availableCampaigns.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="py-4 sm:py-5 px-4 sm:px-6 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold font-display text-sm sm:text-base">Campañas Disponibles</h3>
            </div>
            <div className="grid gap-3">
              {availableCampaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-3 px-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm">{campaign.name}</h4>
                      {campaign.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{campaign.subtitle}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{fmtDate(campaign.start_date)} — {fmtDate(campaign.end_date)}</p>
                    </div>
                    <Button size="sm" onClick={() => handleEnroll(campaign.id)} disabled={enrolling === campaign.id} className="shrink-0">
                      {enrolling === campaign.id ? "..." : "Inscribirme"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
