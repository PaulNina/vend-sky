import heic2any from "heic2any";

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Optimiza y comprime una fotografía para almacenamiento y transferencia ágil.
 * - Detecta automáticamente archivos HEIC / HEIF (fotos nativas de Apple / iPhone) y las transcodifica a JPEG.
 * - Usa URL.createObjectURL en lugar de base64 para evitar cuelgues de memoria en navegadores móviles (iOS Safari).
 * - Escala en canvas HTML5 a resolución óptima (máx 1600px) para conservar total nitidez en etiquetas, seriales y sellos.
 * - Comprime la imagen en formato JPEG (calidad 75-80%), reduciendo fotos de 10-15MB a ~250-450KB.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.75 } = options;

  return new Promise((resolve) => {
    let finished = false;
    const safeResolve = (resFile: File) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(resFile);
    };

    // Temporizador de rescate: si el navegador o canvas demora más de 8s, continuar inmediatamente
    const timer = setTimeout(() => {
      console.warn("Tiempo límite de compresión excedido (8s), usando archivo tal como viene.");
      safeResolve(file);
    }, 8000);

    const cleanFilename = (originalName: string): string => {
      if (/\.(heic|heif)$/i.test(originalName)) {
        return originalName.replace(/\.(heic|heif)$/i, ".jpg");
      }
      if (!/\.jpg$/i.test(originalName) && !/\.jpeg$/i.test(originalName)) {
        return originalName.replace(/\.[^.]+$/, ".jpg");
      }
      return originalName;
    };

    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name);

    const processBlob = (blob: Blob) => {
      let objectUrl = "";
      try {
        objectUrl = URL.createObjectURL(blob);
      } catch (err) {
        console.warn("No se pudo crear objectUrl:", err);
        safeResolve(new File([blob], cleanFilename(file.name), { type: "image/jpeg" }));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Redimensionar proporcionalmente manteniendo aspecto
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            safeResolve(new File([blob], cleanFilename(file.name), { type: "image/jpeg" }));
            return;
          }

          // Dibujar sobre canvas
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(objectUrl);

          canvas.toBlob(
            (compressedBlob) => {
              if (compressedBlob) {
                safeResolve(
                  new File([compressedBlob], cleanFilename(file.name), {
                    type: "image/jpeg",
                  })
                );
              } else {
                safeResolve(new File([blob], cleanFilename(file.name), { type: "image/jpeg" }));
              }
            },
            "image/jpeg",
            quality
          );
        } catch (e) {
          console.error("Error al procesar canvas:", e);
          URL.revokeObjectURL(objectUrl);
          safeResolve(new File([blob], cleanFilename(file.name), { type: "image/jpeg" }));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.warn("No se pudo cargar la imagen para redimensionar, guardando blob estándar.");
        safeResolve(new File([blob], cleanFilename(file.name), { type: "image/jpeg" }));
      };

      img.src = objectUrl;
    };

    if (isHeic) {
      heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })
        .then((converted) => {
          const resultBlob = Array.isArray(converted) ? converted[0] : converted;
          processBlob(resultBlob);
        })
        .catch((err) => {
          console.warn("No se pudo convertir HEIC con heic2any, procesando directamente:", err);
          processBlob(file);
        });
    } else {
      processBlob(file);
    }
  });
}

