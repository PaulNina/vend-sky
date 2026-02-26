import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Lock } from "lucide-react";
import { useCities } from "@/hooks/useCities";

function useRegistrationStatus() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("name, registration_enabled, registration_open_at, registration_close_at, require_vendor_approval")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!campaign) {
        setAllowed(false);
        setMessage("No hay campañas activas en este momento.");
        return;
      }

      setCampaignName(campaign.name);
      setRequireApproval(campaign.require_vendor_approval ?? false);
      const now = new Date();

      if (campaign.registration_open_at && new Date(campaign.registration_open_at) > now) {
        setAllowed(false);
        const openDate = new Date(campaign.registration_open_at).toLocaleString("es-BO", { dateStyle: "long", timeStyle: "short" });
        setMessage(`El registro abre el ${openDate}.`);
        return;
      }

      if (campaign.registration_close_at && new Date(campaign.registration_close_at) <= now) {
        setAllowed(false);
        setMessage("El periodo de registro ha finalizado.");
        return;
      }

      if (!campaign.registration_enabled) {
        setAllowed(false);
        setMessage("El registro de vendedores está temporalmente cerrado.");
        return;
      }

      setAllowed(true);
    };
    check();
  }, []);

  return { allowed, campaignName, message, requireApproval };
}

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const { cityNames: CITIES } = useCities();
  const { allowed, campaignName, message, requireApproval } = useRegistrationStatus();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [storeName, setStoreName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (authLoading) return null;
  // Only redirect if user is logged in AND not in success state (to avoid race condition)
  if (user && !success) return <Navigate to="/v" replace />;

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-bold">
              {requireApproval ? "¡Registro enviado!" : "¡Registro exitoso!"}
            </h2>
            <p className="text-muted-foreground">
              {requireApproval
                ? "Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos cuando tu cuenta esté activa."
                : "Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión."}
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Ir a Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration closed screen
  if (allowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Registro no disponible</h2>
            {campaignName && <p className="text-sm font-medium text-primary">{campaignName}</p>}
            <p className="text-muted-foreground">{message}</p>
            <Button asChild variant="outline">
              <Link to="/login">Ir a Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Still loading status
  if (allowed === null) {
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
      // Check if email already exists in vendors (cloned base)
      const { data: existingVendor } = await supabase
        .from("vendors")
        .select("id, user_id, email")
        .eq("email", email)
        .maybeSingle();

      if (existingVendor && existingVendor.user_id) {
        toast({ title: "Correo ya registrado", description: "Este correo ya está en uso. Usa 'Ingresar' o recupera tu contraseña.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (phone) {
        const { data: phoneVendor } = await supabase
          .from("vendors")
          .select("id")
          .eq("phone", phone)
          .maybeSingle();

        if (phoneVendor) {
          toast({ title: "Teléfono duplicado", description: "Este número de teléfono ya está registrado con otro vendedor.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      const userId = authData.user.id;

      if (existingVendor && !existingVendor.user_id) {
        await supabase
          .from("vendors")
          .update({
            user_id: userId,
            full_name: fullName,
            phone,
            city,
            store_name: storeName || null,
            pending_approval: requireApproval,
            is_active: !requireApproval,
          })
          .eq("id", existingVendor.id);
      } else {
        await supabase.from("vendors").insert({
          user_id: userId,
          full_name: fullName,
          email,
          phone: phone || null,
          city,
          store_name: storeName || null,
          pending_approval: requireApproval,
          is_active: !requireApproval,
        });
      }

      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "vendedor" as any,
        city,
      });

      if (requireApproval) {
        await supabase.auth.signOut();
      }
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
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre de tienda</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mi Tienda (opcional)" />
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
