import { useState, useRef, useEffect } from "react";
import { apiGet, apiPostForm, apiPut, apiDelete, uploadUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image, Upload, Trash2, ArrowUp, ArrowDown, GripVertical, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Popup {
  id: number;
  titulo?: string;
  imagenUrl: string;
  activo: boolean;
  orden: number;
}

export default function PopupsConfigSection() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPopups();
  }, []);

  const loadPopups = async () => {
    try {
      const data = await apiGet<Popup[]>("/admin/popups");
      setPopups(data);
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudieron cargar los popups", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "El archivo debe ser una imagen", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("imagen", file);
      // Optional: Add a title later if needed, leaving it empty for now
      
      const newPopup = await apiPostForm<Popup>("/admin/popups", formData);
      setPopups(prev => [...prev, newPopup].sort((a, b) => a.orden - b.orden));
      toast({ title: "Éxito", description: "Popup subido correctamente" });
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Error al subir la imagen", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await apiPut(`/admin/popups/${id}`, { activo: !current });
      setPopups(prev => prev.map(p => p.id === id ? { ...p, activo: !current } : p));
      toast({ title: "Actualizado", description: `Popup ${!current ? 'activado' : 'desactivado'}` });
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
    }
  };

  const deletePopup = async (id: number) => {
    try {
      await apiDelete(`/admin/popups/${id}`);
      setPopups(prev => prev.filter(p => p.id !== id));
      toast({ title: "Eliminado", description: "Popup eliminado correctamente" });
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudo eliminar el popup", variant: "destructive" });
    }
  };

  const movePopup = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === popups.length - 1)
    ) return;

    const newPopups = [...popups];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap the order values
    const tempOrder = newPopups[index].orden;
    newPopups[index].orden = newPopups[targetIndex].orden;
    newPopups[targetIndex].orden = tempOrder;

    // Swap position in array
    const temp = newPopups[index];
    newPopups[index] = newPopups[targetIndex];
    newPopups[targetIndex] = temp;

    setPopups(newPopups);

    // Save changes to backend sequentially
    try {
      await Promise.all([
        apiPut(`/admin/popups/${newPopups[index].id}`, { orden: newPopups[index].orden }),
        apiPut(`/admin/popups/${newPopups[targetIndex].id}`, { orden: newPopups[targetIndex].orden })
      ]);
      toast({ title: "Orden guardado" });
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudo guardar el nuevo orden", variant: "destructive" });
      loadPopups(); // revert on error
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2 font-display">
            <Image className="h-4 w-4 text-primary" />
            Popups de Inicio
          </CardTitle>
          <CardDescription className="text-xs max-w-xl">
            Sube imágenes que aparecerán como popups flotantes cuando los usuarios ingresen a la página principal. Los usuarios verán los popups activos una vez por sesión.
          </CardDescription>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
          <Button 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Subiendo..." : "Subir Imagen"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {popups.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border/50">
            <Image className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay popups configurados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {popups.map((popup, idx) => (
              <div 
                key={popup.id} 
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors group"
              >
                {/* Drag handle (visual only for now, using up/down buttons) */}
                <div className="flex flex-col gap-1 items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={idx === 0}
                    onClick={() => movePopup(idx, 'up')}
                  >
                    <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={idx === popups.length - 1}
                    onClick={() => movePopup(idx, 'down')}
                  >
                    <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>

                {/* Thumbnail */}
                <div className="relative w-24 h-16 rounded-md overflow-hidden bg-black/5 shrink-0 border border-border/50">
                  <img 
                    src={uploadUrl(popup.imagenUrl)} 
                    alt="Popup" 
                    className="w-full h-full object-cover"
                  />
                  {!popup.activo && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[10px] font-semibold bg-background/80 px-1.5 py-0.5 rounded text-muted-foreground">Oculto</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {popup.titulo || `Popup #${popup.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Orden: {popup.orden}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${popup.id}`} className="text-xs sr-only text-muted-foreground">
                      {popup.activo ? "Visible" : "Oculto"}
                    </Label>
                    <Switch
                      id={`active-${popup.id}`}
                      checked={popup.activo}
                      onCheckedChange={() => toggleActive(popup.id, popup.activo)}
                    />
                  </div>

                  <div className="w-px h-6 bg-border/60"></div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este popup?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará el archivo de imagen permanentemente y no podrá deshacerse.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePopup(popup.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
