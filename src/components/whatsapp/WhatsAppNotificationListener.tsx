import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MensajeWhatsapp } from "@/types/whatsapp";

interface MensajesRecientesResponse {
  ultimoId: number;
  totalNoLeidos: number;
  nuevos: MensajeWhatsapp[];
}

/**
 * Hook para consumir el contador global de mensajes no leídos de WhatsApp
 */
export function useWhatsAppUnreadCount() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ unread: number }>;
      if (customEvent.detail && typeof customEvent.detail.unread === "number") {
        setUnread(customEvent.detail.unread);
      }
    };
    window.addEventListener("skyworth_wa_unread", handler);
    return () => window.removeEventListener("skyworth_wa_unread", handler);
  }, []);

  return unread;
}

/**
 * Sintetizador de sonido suave para notificación (Web Audio API nativo)
 * No requiere descargar archivos de audio externos.
 */
function reproducirSonidoNotificacion() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Tono doble armónico E5 (659Hz) a A5 (880Hz)
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.setValueAtTime(880.0, now + 0.1);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  } catch {
    // Si el navegador bloquea audio antes de la primera interacción del usuario, se ignora silenciosamente.
  }
}

/**
 * Componente que monitorea mensajes entrantes de WhatsApp en segundo plano
 * y lanza notificaciones emergentes (toasts + sonido + notificación de escritorio)
 * en cualquier página de la plataforma donde el usuario se encuentre.
 */
export function WhatsAppNotificationListener() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const ultimoIdRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);
  const isPollingRef = useRef<boolean>(false);

  // Solicitar permiso de notificaciones de escritorio una sola vez si está soportado
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    // Solo admins y supervisores reciben notificaciones de chat de clientes
    const tieneAcceso = roles.includes("admin") || roles.includes("supervisor");
    if (!user || !tieneAcceso) return;

    const poll = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const queryParam = ultimoIdRef.current > 0 ? `?ultimoId=${ultimoIdRef.current}` : "";
        const data = await apiGet<MensajesRecientesResponse>(`/whatsapp/mensajes/recientes${queryParam}`);

        if (data) {
          // Publicar evento global de conteo no leídos para badges
          window.dispatchEvent(
            new CustomEvent("skyworth_wa_unread", {
              detail: { unread: data.totalNoLeidos || 0 },
            })
          );

          // Si es la primera consulta, sincronizamos el cursor sin disparar alertas de mensajes pasados
          if (!initializedRef.current) {
            ultimoIdRef.current = data.ultimoId || 0;
            initializedRef.current = true;
            return;
          }

          // Si hay mensajes nuevos
          if (data.nuevos && data.nuevos.length > 0) {
            ultimoIdRef.current = data.ultimoId || ultimoIdRef.current;

            for (const msg of data.nuevos) {
              const remitente = msg.nombreContacto || msg.fromNumber || "Cliente";
              const numero = msg.fromNumber;
              const textoVista = msg.contenido
                ? msg.contenido.length > 80
                  ? msg.contenido.substring(0, 80) + "..."
                  : msg.contenido
                : "[Fotografía / Documento adjunto]";

              // Reproducir chime sonoro
              reproducirSonidoNotificacion();

              // Si el usuario no está en /admin/whatsapp con esta conversación abierta
              const estaEnMismoChat =
                location.pathname === "/admin/whatsapp" &&
                location.search.includes(numero);

              if (!estaEnMismoChat) {
                // Notificación visual interactiva (Toast flotante)
                toast(`💬 WhatsApp de ${remitente}`, {
                  description: textoVista,
                  duration: 9000,
                  action: {
                    label: "Ver Chat",
                    onClick: () => {
                      navigate(`/admin/whatsapp?numero=${encodeURIComponent(numero)}`);
                    },
                  },
                });

                // Notificación de escritorio nativa del navegador (si la pestaña está en segundo plano)
                if (
                  typeof window !== "undefined" &&
                  "Notification" in window &&
                  Notification.permission === "granted" &&
                  document.hidden
                ) {
                  try {
                    const desktopNotif = new Notification(`💬 WhatsApp: ${remitente}`, {
                      body: textoVista,
                      icon: "/logo_skyworth.jpg",
                    });
                    desktopNotif.onclick = () => {
                      window.focus();
                      navigate(`/admin/whatsapp?numero=${encodeURIComponent(numero)}`);
                    };
                  } catch {
                    // Ignorar error si el SO no permite notificaciones nativas en ese momento
                  }
                }
              }
            }
          } else if (data.ultimoId) {
            ultimoIdRef.current = data.ultimoId;
          }
        }
      } catch (err) {
        // En caso de fallo de red puntual, no interrumpir el ciclo de polling
        console.debug("WhatsApp polling status:", err);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Consulta inicial inmediata
    poll();

    // Polling regular cada 4.5 segundos
    const interval = setInterval(poll, 4500);

    const onCleared = () => {
      poll();
    };
    window.addEventListener("skyworth_wa_unread_cleared", onCleared);

    return () => {
      clearInterval(interval);
      window.removeEventListener("skyworth_wa_unread_cleared", onCleared);
    };
  }, [user, roles, location.pathname, location.search, navigate]);

  return null; // Componente de lógica sin render directo en el layout
}
