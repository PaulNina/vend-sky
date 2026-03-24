import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Lock } from "lucide-react";
import { useCities } from "@/hooks/useCities";

interface Campaign {
  id: number;
  nombre: string;
  activo: boolean;
}

interface Tienda {
  id: number;
  nombre: string;
  ciudad: {
    id: number;
    nombre: string;
    departamento?: string;
  };
}

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const { cities, departments } = useCities();
  const [campaignAllowed, setCampaignAllowed] = useState<boolean | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [tiendaId, setTiendaId] = useState("");
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiGet<Campaign>("/campaigns/active")
      .then(() => setCampaignAllowed(true))
      .catch(() => setCampaignAllowed(false));
  }, []);

  useEffect(() => {
    if (!city) {
      setTiendas([]);
      setTiendaId("");
      return;
    }
    setLoadingTiendas(true);
    setTiendaId("");
    apiGet<Tienda[]>(`/tiendas/by-city/${encodeURIComponent(city)}`)
      .then((data) => setTiendas(Array.isArray(data) ? data : []))
      .catch(() => setTiendas([]))
      .finally(() => setLoadingTiendas(false));
  }, [city]);

  if (authLoading) return null;
  if (user && !success) return <Navigate to="/v" replace />;

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-bold">¡Registro exitoso!</h2>
            <p className="text-muted-foreground">Tu cuenta ha sido creada. Un administrador revisará tu solicitud para habilitar tu acceso.</p>
            <Button asChild variant="outline">
              <Link to="/login">Ir a Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (campaignAllowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Registro no disponible</h2>
            <p className="text-muted-foreground">No hay campañas activas en este momento.</p>
            <Button asChild variant="outline">
              <Link to="/login">Ir a Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (campaignAllowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      toast({ title: "Error", description: "Debes aceptar los términos y condiciones.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiPost("/auth/register", {
        nombreCompleto: fullName,
        email,
        password,
        telefono: phone,
        ciudad: city,
        tiendaId: tiendaId ? Number(tiendaId) : null,
      });
      setSuccess(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">SKYWORTH</h1>
          <p className="text-sm text-muted-foreground">Registro de Vendedor</p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Crear cuenta</CardTitle>
            <CardDescription>Completa tus datos para registrarte como vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" minLength={6} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+591 7XXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Ciudad *</Label>
                <Select value={city} onValueChange={setCity} required>
                  <SelectTrigger><SelectValue placeholder="Selecciona tu ciudad" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectGroup key={dept}>
                        <SelectLabel className="text-muted-foreground">{dept}</SelectLabel>
                        {cities.filter((c) => c.departamento === dept).map((c) => (
                          <SelectItem key={c.nombre} value={c.nombre}>{c.nombre}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tienda</Label>
                {loadingTiendas ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando tiendas...</div>
                ) : !city ? (
                  <p className="text-xs text-muted-foreground">Selecciona una ciudad primero.</p>
                ) : tiendas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay tiendas registradas en {city}. El administrador la asignará luego.</p>
                ) : (
                  <Select value={tiendaId} onValueChange={setTiendaId}>
                    <SelectTrigger><SelectValue placeholder="Selecciona tu tienda (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {tiendas.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  Acepto los términos, condiciones y política de privacidad del programa Bono Vendedor SKYWORTH.
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !city}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrarme
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="text-primary hover:underline">Ingresar</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
