import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Package, Trophy, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function VendorDashboard() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Calculate next Sunday 23:59:59 Bolivia time (UTC-4)
      const boliviaOffset = -4 * 60;
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
      const boliviaNow = new Date(utcNow + boliviaOffset * 60000);
      
      const dayOfWeek = boliviaNow.getDay(); // 0=Sun
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

  const stats = [
    { label: "Unidades Aprobadas", value: "0", icon: Package, color: "text-success" },
    { label: "Bono Bs Aprobado", value: "Bs 0", icon: LayoutDashboard, color: "text-primary" },
    { label: "Puntos Acumulados", value: "0", icon: Trophy, color: "text-warning" },
    { label: "Pendientes", value: "0", icon: Clock, color: "text-muted-foreground" },
    { label: "Rechazados", value: "0", icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mi Panel</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu actividad como vendedor</p>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
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
            Registra tus ventas semanales antes del cierre del domingo. Cada venta aprobada acumula puntos y bonos en Bs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
