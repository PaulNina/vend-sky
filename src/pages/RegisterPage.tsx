import { useState } from "react";
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
import { Loader2, CheckCircle2 } from "lucide-react";
import { useCities } from "@/hooks/useCities";

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const { cityNames: CITIES } = useCities();
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
  if (user) return <Navigate to="/v" replace />;

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-bold">¡Registro enviado!</h2>
            <p className="text-muted-foreground">
              Tu cuenta está pendiente de aprobación por un administrador. 
              Te notificaremos cuando tu cuenta esté activa.
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Ir a Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
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

      // Check phone duplicates
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

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      const userId = authData.user.id;

      if (existingVendor && !existingVendor.user_id) {
        // Link to existing cloned vendor
        await supabase
          .from("vendors")
          .update({
            user_id: userId,
            full_name: fullName,
            phone,
            city,
            store_name: storeName || null,
            pending_approval: true,
            is_active: false,
          })
          .eq("id", existingVendor.id);
      } else {
        // Create new vendor
        await supabase.from("vendors").insert({
          user_id: userId,
          full_name: fullName,
          email,
          phone: phone || null,
          city,
          store_name: storeName || null,
          pending_approval: true,
          is_active: false,
        });
      }

      // Assign vendedor role
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "vendedor" as any,
        city,
      });

      // Sign out so they can't access anything until approved
      await supabase.auth.signOut();
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
