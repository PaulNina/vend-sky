import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Package, Trophy, Clock, XCircle, AlertCircle, DollarSign } from "lucide-react";

interface VendorStats {
  approved: number;
  pending: number;
  rejected: number;
  bonusBs: number;
  points: number;
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState("");
  const [stats, setStats] = useState<VendorStats>({ approved: 0, bonusBs: 0, points: 0, pending: 0, rejected: 0 });

  useEffect(() => {
    if (!user) return;
    apiGet<VendorStats>("/vendor/stats")
      .then((data) => {
        setStats({
          approved: data.approved ?? 0,
          bonusBs: data.bonusBs ?? 0,
          points: data.points ?? 0,
          pending: data.pending ?? 0,
          rejected: data.rejected ?? 0,
        });
      })
      .catch(() => {});
  }, [user]);

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
    { label: "Aprobadas", value: String(stats.approved), icon: Package, color: "text-success" },
    { label: "Bono", value: `Bs ${stats.bonusBs.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Puntos", value: String(stats.points), icon: Trophy, color: "text-warning" },
    { label: "Pendientes", value: String(stats.pending), icon: AlertCircle, color: "text-muted-foreground" },
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

      {/* Stats */}
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
    </div>
  );
}
