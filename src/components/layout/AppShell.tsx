"use client";

import { usePathname } from "next/navigation";
import { useLayoutStore } from "@/store/use-layout-store";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useLayoutStore();

  const isAuthPage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/recuperar-contrasena") ||
    pathname?.startsWith("/restablecer-contrasena") ||
    pathname?.startsWith("/invitacion");

  if (isAuthPage) {
    return <main className="w-full min-h-screen bg-background">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ml-0 min-w-0 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <TopBar />
        <main className="flex-1 p-4 md:p-6 pb-24 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </>
  );
}
