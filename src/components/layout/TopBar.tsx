"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, RefreshCw, Wifi, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayoutStore } from "@/store/use-layout-store";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { syncLeads } from "@/actions/leads";
import { syncProjects } from "@/actions/proyectos";
import { syncReferrers } from "@/actions/referidores";
import { syncFinanzas } from "@/actions/finanzas";
import { syncFeedback } from "@/actions/feedback";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobileSidebar, triggerSync, lastSyncTime } = useLayoutStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTimeLabel, setSyncTimeLabel] = useState<string>("");
  const [minutesSinceSync, setMinutesSinceSync] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      if (lastSyncTime) {
        try {
          const syncDate = new Date(lastSyncTime);
          setSyncTimeLabel(format(syncDate, "HH:mm", { locale: es }));
          const diffMinutes = Math.floor((Date.now() - syncDate.getTime()) / (1000 * 60));
          setMinutesSinceSync(Math.max(0, diffMinutes));
        } catch {
          setSyncTimeLabel("");
          setMinutesSinceSync(0);
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [lastSyncTime]);
  
  // Basic breadcrumb generation
  const paths = pathname.split('/').filter(Boolean);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const [leadsRes, projectsRes, referrersRes, finanzasRes, feedbackRes] = await Promise.all([
        syncLeads(),
        syncProjects(),
        syncReferrers(),
        syncFinanzas(),
        syncFeedback()
      ]);

      const allSuccess = leadsRes.success || projectsRes.success || referrersRes.success || finanzasRes.success || feedbackRes.success;
      if (allSuccess) {
        toast.success("Datos sincronizados exitosamente desde Google Sheets", {
          description: "Leads, proyectos, referidores, finanzas y feedback actualizados."
        });
        triggerSync();
        router.refresh();
      } else {
        toast.error("Hubo un problema al sincronizar con Google Sheets");
      }
    } catch (error) {
      console.error("Error synchronizing data:", error);
      toast.error("Error al actualizar datos desde Google Sheets");
    } finally {
      setIsSyncing(false);
    }
  };

  // Semáforo de actualización:
  // < 15 min -> Verde
  // >= 15 min y < 30 min -> Naranja/Ámbar
  // >= 30 min -> Rojo
  let statusColorClasses = "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20";
  let dotColorClass = "bg-emerald-500";

  if (isSyncing) {
    statusColorClasses = "text-amber-500 bg-amber-500/10 border border-amber-500/20 animate-pulse";
    dotColorClass = "bg-amber-500 animate-ping";
  } else if (minutesSinceSync >= 30) {
    statusColorClasses = "text-rose-500 bg-rose-500/10 border border-rose-500/20";
    dotColorClass = "bg-rose-500";
  } else if (minutesSinceSync >= 15) {
    statusColorClasses = "text-amber-500 bg-amber-500/10 border border-amber-500/20";
    dotColorClass = "bg-amber-500";
  }

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={toggleMobileSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden sm:flex items-center text-sm text-muted-foreground">
          <span className="capitalize">Inicio</span>
          {paths.map((path, index) => (
            <div key={path} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className={`capitalize ${index === paths.length - 1 ? "text-foreground font-medium" : ""}`}>
                {path.replace(/-/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Semáforo de Sincronización */}
        <div 
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${statusColorClasses}`}
          title={mounted && lastSyncTime ? `Última sincronización: ${new Date(lastSyncTime).toLocaleString("es-ES")} (${minutesSinceSync} min)` : "Sincronizado"}
          suppressHydrationWarning
        >
          <span className={`w-2 h-2 rounded-full ${dotColorClass}`} />
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span suppressHydrationWarning>
            {isSyncing 
              ? "Sincronizando..." 
              : mounted && syncTimeLabel 
                ? `Actualizado: ${syncTimeLabel}` 
                : "Sincronizado"}
          </span>
        </div>

        {/* Botón Actualizar Datos */}
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 font-semibold shadow-xs"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "ACTUALIZANDO..." : "ACTUALIZAR DATOS"}
        </Button>
      </div>
    </header>
  );
}
