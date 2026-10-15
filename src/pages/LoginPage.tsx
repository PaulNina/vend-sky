import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowRight, BarChart3, Globe2, KeyRound, Mail, ShieldCheck, Sparkles, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";

interface AuthResponse {
  token: string;
  role: string;
  name: string;
  userId: number;
  vendorId?: number;
}

export default function LoginPage() {
  const { user, loading: authLoading, roles, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) {
    if (roles.includes("admin")) return <Navigate to="/admin" replace />;
    if (roles.includes("supervisor")) return <Navigate to="/admin/auditoria" replace />;
    if (roles.includes("revisor_ciudad")) return <Navigate to="/admin/revisiones" replace />;
    if (roles.includes("operador_bandeo")) return <Navigate to="/v/bandeo-ruleta" replace />;
    return <Navigate to="/v" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost<AuthResponse>("/auth/login", { email, password });
      signIn(data.token, data.role, data.name, data.userId, data.vendorId);
      // Redirect based on role
      if (data.role === "ADMIN") navigate("/admin", { replace: true });
      else if (data.role === "REVIEWER") navigate("/admin/revisiones", { replace: true });
      else if (data.role === "OPERADOR_BANDEO") navigate("/v/bandeo-ruleta", { replace: true });
      else navigate("/v", { replace: true });
    } catch (err: unknown) {
      const error = err as Error;
      toast({
        title: "Error de acceso",
        description: error.message || "Credenciales incorrectas.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <main className="login-stage relative grid min-h-screen overflow-hidden lg:grid-cols-[1.08fr_.92fr]">
      <div className="login-grid pointer-events-none absolute inset-0" />

      <section className="relative hidden min-h-screen flex-col justify-between border-r border-white/[.06] p-10 lg:flex xl:p-14">
        <div>
          <SkyworthLogo tone="white" className="w-44" />
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(46,113,247,.95)]" />
            <p className="text-[9px] font-bold uppercase tracking-[.22em] text-slate-400">Bolivia · Incentivos</p>
          </div>
        </div>

        <div className="max-w-2xl pb-10">
          <div className="mb-7 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Plataforma comercial
          </div>
          <h1 className="max-w-xl font-display text-5xl font-bold leading-[.98] tracking-[-.055em] text-white xl:text-6xl">
            Cada venta cuenta.<br />
            <span className="text-slate-400">Cada logro se ve.</span>
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-slate-400">
            Controla campañas, valida ventas y sigue el rendimiento nacional desde una sola vista operativa.
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { icon: BarChart3, title: "Métricas", text: "Decisiones en tiempo real" },
              { icon: ShieldCheck, title: "Control", text: "Validación trazable" },
              { icon: Globe2, title: "Cobertura", text: "Operación nacional" },
            ].map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-2xl border border-white/[.065] bg-white/[.025] p-4 backdrop-blur-sm">
                <div className="mb-5 flex items-center justify-between">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[8px] text-slate-500">0{index + 1}</span>
                </div>
                <p className="text-xs font-bold text-slate-200">{title}</p>
                <p className="mt-1 text-[9px] leading-4 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[9px] uppercase tracking-[.16em] text-slate-400">© 2026 Skyworth Bolivia · Sistema autorizado</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 lg:hidden">
            <SkyworthLogo tone="white" className="w-36" />
            <p className="mt-2 text-[9px] uppercase tracking-[.18em] text-slate-400">Bolivia · Incentivos</p>
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> Conexión segura
            </div>
            <h2 className="font-display text-3xl font-bold tracking-[-.04em] text-white sm:text-4xl">Bienvenido de nuevo</h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">Ingresa a tu espacio según el rol que tienes asignado.</p>
          </div>

          <div className="rounded-[22px] border border-white/[.075] bg-[#11151b]/90 p-5 shadow-[0_35px_100px_-55px_rgba(0,0,0,1)] backdrop-blur-xl sm:p-7">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input id="email" type="email" placeholder="nombre@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="admin-control h-12 rounded-xl pl-10 text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">Contraseña</Label>
                  <Link to="/forgot-password" className="text-[10px] font-semibold text-primary/80 transition-colors hover:text-primary">¿La olvidaste?</Link>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="admin-control h-12 rounded-xl px-10 text-sm" />
                  <button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="gradient-brand shadow-brand group h-12 w-full rounded-xl border-0 font-bold text-white hover:brightness-110" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ingresar al sistema <ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
              </Button>

              <div className="pt-3 border-t border-white/5 flex flex-col items-center gap-1.5 text-center">
                <Link to="/registro-tienda" className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium hover:underline text-xs">
                  <Store className="h-3.5 w-3.5" /> ¿Dueño de Tienda? Registra o reclama tu tienda aquí
                </Link>
                <Link to="/register" className="text-slate-400 hover:text-white transition-colors text-xs">
                  ¿Vendedor nuevo? Regístrate aquí
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[.14em] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Acceso monitoreado y protegido
          </div>
        </div>
      </section>
    </main>
  );
}
