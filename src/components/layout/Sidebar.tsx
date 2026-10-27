"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutStore } from "@/store/use-layout-store";
import { 
  FileText, Calculator, Files, Briefcase, PieChart, ArrowDownCircle, ArrowUpCircle, 
  ListOrdered, ListTodo, Users, BarChart4, LineChart, ChevronLeft, ChevronRight,
  Sliders, UserCog, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScaleConfigModal } from "@/components/config/scale-config-modal";
import { UserManagementModal } from "@/components/config/user-management-modal";
import { getCurrentUser, logoutAction } from "@/actions/auth";
import { SafeUser } from "@/types/auth";

const navigationGroups = [
  {
    title: "Operaciones",
    items: [
      { name: "Crear Propuesta", href: "/operaciones/propuestas/crear", icon: FileText },
      { name: "Simulador", href: "/operaciones/simulador", icon: Calculator },
      { name: "Ver Propuestas", href: "/operaciones/propuestas", icon: Files },
      { name: "Ver Proyectos", href: "/operaciones/proyectos", icon: Briefcase },
    ]
  },
  {
    title: "Finanzas",
    items: [
      { name: "Resumen Finanzas", href: "/finanzas/resumen", icon: PieChart },
      { name: "Crear Cobro", href: "/operaciones/cobros/crear", icon: ArrowDownCircle },
      { name: "Crear Pago", href: "/operaciones/pagos/crear", icon: ArrowUpCircle },
      { name: "Ver Cobros", href: "/operaciones/cobros", icon: ListOrdered },
      { name: "Ver Pagos", href: "/operaciones/pagos", icon: ListTodo },
    ]
  },
  {
    title: "Directorio e Inteligencia",
    items: [
      { name: "Referidores", href: "/directorio/referidores", icon: Users },
      { name: "Clientes", href: "/directorio/clientes", icon: Users },
      { name: "Business Dashboard", href: "/dashboard/negocio", icon: BarChart4 },
      { name: "CX Dashboard", href: "/dashboard/cx", icon: LineChart },
    ]
  }
];

const allNavigationHrefs = navigationGroups.flatMap((group) => group.items.map((item) => item.href));

function isRouteActive(itemHref: string, currentPath: string) {
  if (currentPath === itemHref) return true;

  if (currentPath.startsWith(itemHref + "/")) {
    const hasMoreSpecificMatch = allNavigationHrefs.some(
      (otherHref) =>
        otherHref !== itemHref &&
        otherHref.length > itemHref.length &&
        (currentPath === otherHref || currentPath.startsWith(otherHref + "/"))
    );
    return !hasMoreSpecificMatch;
  }

  return false;
}

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, toggleMobileSidebar } = useLayoutStore();
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setCurrentUser(u));
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleMobileSidebar}
        />
      )}
      
      <aside className={cn(
        "h-screen border-r border-border bg-card flex flex-col fixed left-0 top-0 overflow-y-auto overflow-x-visible z-50 transition-all duration-300 md:translate-x-0",
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "md:w-20 w-64" : "w-64"
      )}>
        {/* Header con Logo */}
        <div className="h-16 flex items-center justify-center px-4 relative border-b border-border shrink-0">
          {!isSidebarCollapsed ? (
            <Link href="/" className="flex items-center justify-center w-full">
              <Image 
                src="/logo.png" 
                alt="Stratux CRM/ERP" 
                width={140} 
                height={40} 
                className="object-contain" 
                priority
              />
            </Link>
          ) : (
            <Link href="/" className="flex items-center justify-center w-full">
              <Image 
                src="/logo-small.png" 
                alt="Stratux" 
                width={36} 
                height={36} 
                className="object-contain" 
                priority
              />
            </Link>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-card shadow-sm z-50 hover:bg-muted"
            onClick={toggleSidebar}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>

        {/* Grupos de Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              {!isSidebarCollapsed && (
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isRouteActive(item.href, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isSidebarCollapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                        isSidebarCollapsed ? "justify-center p-2" : "px-2 py-2",
                        isActive 
                          ? "bg-primary/10 text-primary font-semibold" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!isSidebarCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Sección de Configuración (Después de CX Dashboard) */}
          <div>
            {!isSidebarCollapsed && (
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Configuración
              </h3>
            )}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsConfigOpen(true)}
                title={isSidebarCollapsed ? "Configurar Escalas" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
                  isSidebarCollapsed ? "justify-center p-2" : "px-2 py-2 text-left"
                )}
              >
                <Sliders className="w-5 h-5 flex-shrink-0 text-primary" />
                {!isSidebarCollapsed && <span>Configurar Escalas</span>}
              </button>

              <button
                type="button"
                onClick={() => setIsUserModalOpen(true)}
                title={isSidebarCollapsed ? "Usuarios" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
                  isSidebarCollapsed ? "justify-center p-2" : "px-2 py-2 text-left"
                )}
              >
                <UserCog className="w-5 h-5 flex-shrink-0 text-sky-400" />
                {!isSidebarCollapsed && <span>Usuarios</span>}
              </button>
            </div>
          </div>
        </nav>

        {/* Footer del Sidebar: Perfil del Usuario & Botón Salir */}
        <div className="p-3 border-t border-border bg-card/60 shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : (currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "A")}
                </div>
                <div className="flex flex-col text-left min-w-0 flex-1">
                  <span className="text-xs font-semibold leading-tight text-foreground truncate" title={currentUser?.name || currentUser?.email || "Admin"}>
                    {currentUser?.name || currentUser?.email || "Administrador"}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                    ADMIN
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutAction()}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div 
                className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary"
                title={currentUser?.name || currentUser?.email || "Admin"}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutAction()}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Modales de Configuración */}
      <ScaleConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
      />

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}
