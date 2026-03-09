import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LayoutDashboard, Package, Trophy, Clock, XCircle, AlertCircle,
  AlertTriangle, DollarSign, Target, CheckCircle2, Banknote, CalendarDays,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Campaign {
  id: string; name: string; subtitle?: string | null; slug?: string | null;
  start_date: string; end_date: string; close_time_local?: string;
}
interface EnrolledCampaign extends Campaign { enrolled_at: string; status: string; }
interface CampaignPeriod {
  id: string; period_number: number; period_start: string; period_end: string;
  status: string; closed_at: string | null; settlement_generated_at: string | null;
}
interface CommissionPayment {
  id: string; period_start: string; period_end: string;
  units: number; amount_bs: number; status: string;
  paid_at: string | null; payment_note: string | null;
  period_id: string | null;
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState("");
  const [currentPeriodStats, setCurrentPeriodStats] = useState({ approved: 0, bonusBs: 0, points: 0, pending: 0, rejected: 0, observed: 0 });
  const [totalStats, setTotalStats] = useState({ approved: 0, bonusBs: 0, points: 0, pending: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [enrolledCampaigns, setEnrolledCampaigns] = useState<EnrolledCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<CampaignPeriod | null>(null);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);

  // Cache vendor id
  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setVendorId(data.id);
    });
  }, [user]);

  // Load campaigns & enrollments
  useEffect(() => {
    if (!vendorId) return;
    const loadCampaigns = async () => {
      const { data: activeCampaigns } = await supabase
        .from("campaigns")
        .select("id, name, subtitle, slug, start_date, end_date, close_time_local")
        .eq("is_active", true).eq("status", "active")
        .order("created_at", { ascending: false });

      const { data: enrollments } = await supabase
        .from("vendor_campaign_enrollments")
        .select("campaign_id, enrolled_at, status, campaigns(id, name, subtitle, slug, start_date, end_date, close_time_local)")
        .eq("vendor_id", vendorId).eq("status", "active");

      if (enrollments) {
        const enrolled = enrollments
          .map(e => ({ ...e.campaigns, enrolled_at: e.enrolled_at, status: e.status } as EnrolledCampaign))
          .filter(c => c.id);
        setEnrolledCampaigns(enrolled);
        setCampaigns(enrolled);
        if (enrolled.length > 0 && !selectedCampaign) setSelectedCampaign(enrolled[0].id);
      }

      if (activeCampaigns && enrollments) {
        const enrolledIds = new Set(enrollments.map(e => e.campaign_id));
        setAvailableCampaigns(activeCampaigns.filter(c => !enrolledIds.has(c.id)));
      }
    };
    loadCampaigns();
  }, [vendorId]);

  // Load current period for selected campaign
  useEffect(() => {
    if (!selectedCampaign) return;
    const loadPeriod = async () => {
      // Get Bolivia date
      const now = new Date();
      const boliviaNow = new Date(now.getTime() - 4 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60000);
      const todayStr = boliviaNow.toISOString().split("T")[0];

      // Find current open period (today falls within period_start..period_end)
      const { data: periods } = await supabase
        .from("campaign_periods")
        .select("*")
        .eq("campaign_id", selectedCampaign)
        .eq("status", "open")
        .lte("period_start", todayStr)
        .gte("period_end", todayStr)
        .order("period_number", { ascending: true })
        .limit(1);

      if (periods && periods.length > 0) {
        setCurrentPeriod(periods[0] as CampaignPeriod);
      } else {
        // Fallback: first open period
        const { data: fallback } = await supabase
          .from("campaign_periods")
          .select("*")
          .eq("campaign_id", selectedCampaign)
          .eq("status", "open")
          .order("period_number", { ascending: true })
          .limit(1);
        setCurrentPeriod(fallback && fallback.length > 0 ? fallback[0] as CampaignPeriod : null);
      }
    };
    loadPeriod();
  }, [selectedCampaign]);

  // Load current period stats + total campaign stats
  useEffect(() => {
    if (!vendorId || !selectedCampaign) return;

    const loadStats = async () => {
      // Total campaign stats
      const { data: allApproved } = await supabase
        .from("sales")
        .select("bonus_bs, points")
        .eq("vendor_id", vendorId)
        .eq("campaign_id", selectedCampaign)
        .eq("status", "approved");

      const totalApproved = allApproved || [];
      setTotalStats({
        approved: totalApproved.length,
        bonusBs: totalApproved.reduce((s, r) => s + Number(r.bonus_bs), 0),
        points: totalApproved.reduce((s, r) => s + r.points, 0),
        pending: 0,
      });

      // Current period stats
      if (currentPeriod) {
        const baseQ = (status: string) =>
          supabase.from("sales")
            .select("id", { head: true, count: "exact" })
            .eq("vendor_id", vendorId)
            .eq("campaign_id", selectedCampaign)
            .gte("sale_date", currentPeriod.period_start)
            .lte("sale_date", currentPeriod.period_end)
            .eq("status", status as any);

        const [approvedRes, pendingRes, rejectedRes, observedRes, periodSales] = await Promise.all([
          baseQ("approved"),
          baseQ("pending"),
          baseQ("rejected"),
          baseQ("observed"),
          supabase.from("sales")
            .select("bonus_bs, points")
            .eq("vendor_id", vendorId)
            .eq("campaign_id", selectedCampaign)
            .gte("sale_date", currentPeriod.period_start)
            .lte("sale_date", currentPeriod.period_end)
            .eq("status", "approved"),
        ]);

        const periodApproved = periodSales.data || [];
        setCurrentPeriodStats({
          approved: approvedRes.count || 0,
          bonusBs: periodApproved.reduce((s, r) => s + Number(r.bonus_bs), 0),
          points: periodApproved.reduce((s, r) => s + r.points, 0),
          pending: pendingRes.count || 0,
          rejected: rejectedRes.count || 0,
          observed: observedRes.count || 0,
        });
      }
    };
    loadStats();
  }, [vendorId, selectedCampaign, currentPeriod]);

  // Load commission payments (max 1 month back)
  useEffect(() => {
    if (!vendorId || !selectedCampaign) return;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split("T")[0];
    supabase
      .from("commission_payments")
      .select("id, period_start, period_end, units, amount_bs, status, paid_at, payment_note, period_id")
      .eq("vendor_id", vendorId)
      .eq("campaign_id", selectedCampaign)
      .gte("period_end", oneMonthAgoStr)
      .order("period_start", { ascending: false })
      .then(({ data }) => setPayments((data || []) as CommissionPayment[]));
  }, [vendorId, selectedCampaign]);

  // Countdown to current period end
  useEffect(() => {
    if (!currentPeriod) { setCountdown("Sin periodo activo"); return; }

    const camp = campaigns.find(c => c.id === selectedCampaign);
    const closeTime = camp?.close_time_local || "23:59";
    const [closeH, closeM] = closeTime.split(":").map(Number);

    const updateCountdown = () => {
      const now = new Date();
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
      const boliviaNow = new Date(utcNow - 4 * 60 * 60 * 1000);

      const [y, m, d] = currentPeriod.period_end.split("-").map(Number);
      const target = new Date(y, m - 1, d, closeH, closeM, 59, 0);
      // target is Bolivia time; boliviaNow is also Bolivia time
      const diff = target.getTime() - boliviaNow.getTime();
      if (diff <= 0) { setCountdown("Periodo cerrado"); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${days}d ${hours}h ${mins}m ${secs}s`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentPeriod, selectedCampaign, campaigns]);

  const handleEnroll = async (campaignId: string) => {
    if (!vendorId) return;
    setEnrolling(campaignId);
    const { error } = await supabase.from("vendor_campaign_enrollments").insert({ vendor_id: vendorId, campaign_id: campaignId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setEnrolling(null); return; }
    toast({ title: "¡Inscrito!", description: "Te has inscrito exitosamente en la campaña" });
    setEnrolling(null);
    window.location.reload();
  };

  const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const paidTotal = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount_bs), 0);
  const pendingPayTotal = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount_bs), 0);

  const periodStatCards = [
    { label: "Aprobadas", value: String(currentPeriodStats.approved), icon: Package, color: "text-success" },
    { label: "Bono Periodo", value: `Bs ${currentPeriodStats.bonusBs.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Puntos", value: String(currentPeriodStats.points), icon: Trophy, color: "text-warning" },
    { label: "Pendientes", value: String(currentPeriodStats.pending), icon: AlertCircle, color: "text-muted-foreground" },
    ...(currentPeriodStats.observed > 0 ? [{ label: "Observadas", value: String(currentPeriodStats.observed), icon: AlertTriangle, color: "text-orange-500" }] : []),
    ...(currentPeriodStats.rejected > 0 ? [{ label: "Rechazadas", value: String(currentPeriodStats.rejected), icon: XCircle, color: "text-destructive" }] : []),
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

      {/* Current Period Info + Countdown */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-card to-primary/5">
        <CardContent className="py-3 sm:py-4 px-4 sm:px-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            {currentPeriod ? (
              <>
                <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                  Periodo {currentPeriod.period_number} · {fmtDate(currentPeriod.period_start)} — {fmtDate(currentPeriod.period_end)}
                </p>
                <p className="text-base sm:text-lg font-bold font-mono text-primary mt-0.5">{countdown}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay periodo activo en este momento</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Period Stats */}
      {currentPeriod && (
        <>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold font-display">Semana Vigente (Periodo {currentPeriod.period_number})</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {periodStatCards.map((stat) => (
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
        </>
      )}

      {/* Total Campaign Summary */}
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-warning" />
        <h2 className="text-sm font-semibold font-display">Acumulado Total de Campaña</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="py-2.5 px-3">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ventas Aprobadas</p>
            <p className="text-lg font-bold font-display mt-0.5">{totalStats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bono Total</p>
            <p className="text-lg font-bold font-display mt-0.5 text-primary">Bs {totalStats.bonusBs.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Puntos Total</p>
            <p className="text-lg font-bold font-display mt-0.5 text-warning">{totalStats.points}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3">
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Pagado</p>
            <p className="text-lg font-bold font-display mt-0.5 text-success">Bs {paidTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Payments */}
      {payments.length > 0 && (
        <Card>
          <CardContent className="py-4 px-4 sm:px-6 space-y-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-success" />
              <h3 className="font-semibold font-display text-sm sm:text-base">Mis Pagos</h3>
              {pendingPayTotal > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-auto">Bs {pendingPayTotal.toLocaleString()} por cobrar</Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Periodo</TableHead>
                    <TableHead className="text-xs text-right">Uds</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Fecha Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{fmtDate(p.period_start)} — {fmtDate(p.period_end)}</TableCell>
                      <TableCell className="text-xs text-right">{p.units}</TableCell>
                      <TableCell className="text-xs text-right font-medium">Bs {Number(p.amount_bs).toLocaleString()}</TableCell>
                      <TableCell>
                        {p.status === "paid" ? (
                          <Badge variant="default" className="text-[9px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Pagado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.paid_at ? fmtDate(p.paid_at.split("T")[0]) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Welcome info */}
      <Card>
        <CardContent className="py-4 sm:py-5 px-4 sm:px-6">
          <h3 className="font-semibold font-display text-sm sm:text-base mb-2">Bienvenido al Programa Bono Vendedor</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Registra tus ventas dentro del periodo vigente antes de la hora de cierre.
            Cada venta aprobada acumula puntos y bonos en Bs según el producto vendido.
          </p>
        </CardContent>
      </Card>

      {/* Available Campaigns (only non-enrolled) */}
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
