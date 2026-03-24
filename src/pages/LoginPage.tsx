import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">SKYWORTH</h1>
          <p className="text-sm text-muted-foreground">Bono Vendedor El Sueño del Hincha</p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingresar
              </Button>
              <div className="text-center mt-4">
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline transition-all">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 SKYWORTH Bolivia. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
