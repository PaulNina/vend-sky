import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, Share, MoreVertical, PlusSquare, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) setIsInstalled(true);

    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
        <h1 className="text-2xl font-bold font-display text-foreground">¡App instalada!</h1>
        <p className="text-muted-foreground">Ya puedes acceder desde el ícono en tu pantalla de inicio.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <Smartphone className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-2xl font-bold font-display text-foreground">Instalar App</h1>
        <p className="text-muted-foreground text-sm">
          Instala Bono Vendedores en tu celular para acceder rápidamente sin abrir el navegador.
        </p>
      </div>

      {/* Direct install button for Android/Chrome */}
      {deferredPrompt && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-4">
            <Button onClick={handleInstall} variant="premium" size="lg" className="w-full">
              <Download className="h-5 w-5 mr-2" />
              Instalar ahora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Android instructions */}
      {(platform === "android" || platform === "desktop") && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">🤖</span> Android (Chrome)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
              <p>Toca el menú <MoreVertical className="inline h-4 w-4" /> (tres puntos) en la esquina superior derecha de Chrome</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
              <p>Selecciona <strong className="text-foreground">"Instalar aplicación"</strong> o <strong className="text-foreground">"Agregar a pantalla de inicio"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
              <p>Confirma tocando <strong className="text-foreground">"Instalar"</strong></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* iOS instructions */}
      {(platform === "ios" || platform === "desktop") && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">🍎</span> iPhone / iPad (Safari)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
              <p>Toca el botón <Share className="inline h-4 w-4" /> <strong className="text-foreground">Compartir</strong> en la barra inferior de Safari</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
              <p>Desplázate y toca <PlusSquare className="inline h-4 w-4" /> <strong className="text-foreground">"Agregar a la pantalla de inicio"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
              <p>Toca <strong className="text-foreground">"Agregar"</strong> en la esquina superior derecha</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
