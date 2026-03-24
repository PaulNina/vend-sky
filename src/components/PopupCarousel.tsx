import { useEffect, useState, useCallback } from "react";
import { apiGetPublic } from "@/lib/api";
import { uploadUrl } from "@/lib/api";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Popup {
  id: number;
  titulo?: string;
  imagenUrl: string;
  orden: number;
}

const SESSION_KEY = "popups_shown";

export default function PopupCarousel() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per browser session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    apiGetPublic<Popup[]>("/public/popups")
      .then((data) => {
        if (data && data.length > 0) {
          setPopups(data);
          setVisible(true);
        }
      })
      .catch(() => {
        // Silently ignore — popups are non-critical
      });
  }, []);

  const close = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? popups.length - 1 : c - 1));
  }, [popups.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c === popups.length - 1 ? 0 : c + 1));
  }, [popups.length]);

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, close]);

  if (!visible || popups.length === 0) return null;

  const popup = popups[current];

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={close}
    >
      <div
        className="relative max-w-2xl w-full mx-4 rounded-2xl overflow-hidden shadow-2xl bg-black animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <img
          src={uploadUrl(popup.imagenUrl)}
          alt={popup.titulo || "Popup"}
          className="w-full object-contain max-h-[75vh]"
          draggable={false}
        />

        {/* Title overlay */}
        {popup.titulo && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4">
            <p className="text-white font-semibold text-lg">{popup.titulo}</p>
          </div>
        )}

        {/* Navigation arrows (only when multiple) */}
        {popups.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {popups.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current ? "bg-white scale-125" : "bg-white/50"
                  }`}
                  aria-label={`Ir al popup ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
