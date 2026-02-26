import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, ShieldCheck, BarChart3, Tv } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">SKYWORTH</h1>
          <p className="text-[10px] text-muted-foreground">Bono Vendedor El Sueño del Hincha</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/login">Ingresar</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Crear cuenta</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center space-y-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30">
            <Tv className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Campaña activa</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Gana bonos por cada <span className="text-primary">venta SKYWORTH</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Registra tus ventas semanales, acumula puntos y recibe bonos en efectivo. 
            ¡El Sueño del Hincha te premia por vender!
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link to="/register">Crear cuenta de vendedor</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Ya tengo cuenta</Link>
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mt-12">
          {[
            { icon: Trophy, title: "Ranking en vivo", desc: "Compite con vendedores de todo el país" },
            { icon: BarChart3, title: "Bonos semanales", desc: "Cada venta aprobada suma puntos y Bs" },
            { icon: ShieldCheck, title: "Validación automática", desc: "Seriales verificados al instante" },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-lg border border-border bg-card text-left space-y-2">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border p-4 text-center text-xs text-muted-foreground">
        © 2026 SKYWORTH Bolivia. Todos los derechos reservados.
      </footer>
    </div>
  );
}
