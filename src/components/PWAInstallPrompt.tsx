import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    // Don't clear deferredPrompt — allow re-triggering if user changes mind
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        backgroundColor: "#1a1a2e",
        border: "1px solid #3b3b6b",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        color: "#fff",
        maxWidth: "calc(100vw - 2rem)",
        width: "360px",
      }}
    >
      <img
        src="/pwa-512.png"
        alt="App icon"
        style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
          Instalar app
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#aaa" }}>
          Acceso rápido desde tu pantalla de inicio
        </p>
      </div>
      <button
        onClick={handleInstall}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          backgroundColor: "#4f46e5",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          padding: "0.4rem 0.75rem",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.85rem",
          flexShrink: 0,
        }}
      >
        <Download size={14} />
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: "none",
          border: "none",
          color: "#aaa",
          cursor: "pointer",
          padding: "0.25rem",
          flexShrink: 0,
        }}
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default PWAInstallPrompt;
