"use client";

import { useState, useEffect } from "react";
import { ProjectCard, ProjectStatus } from "@/components/operaciones/proyectos/project-card";
import { CancelProjectModal } from "@/components/operaciones/proyectos/cancel-project-modal";
import { FinishProjectModal } from "@/components/operaciones/proyectos/finish-project-modal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckCircle2 } from "lucide-react";
import { getProjects, updateProject } from "@/actions/proyectos";
import { getCollections } from "@/actions/finanzas";
import { Project, Collection } from "@/types/database";
import { useLayoutStore } from "@/store/use-layout-store";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

export default function ProyectosPage() {
  const { lastSyncTime } = useLayoutStore();
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    };
  });
  
  const [activeTab, setActiveTab] = useState<ProjectStatus>("Activo");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [dbProjects, setDbProjects] = useState<Project[]>([]);
  const [dbCollections, setDbCollections] = useState<Collection[]>([]);

  const loadData = () => {
    Promise.all([getProjects(), getCollections()]).then(([projects, collections]) => {
      setDbProjects(projects);
      setDbCollections(collections);
    });
  };

  useEffect(() => {
    loadData();
  }, [lastSyncTime]);

  const handleCancelProject = (id: string, projectName: string) => {
    setSelectedProjectId(id);
    setSelectedProjectName(projectName);
    setCancelModalOpen(true);
  };

  const handleFinishProject = (id: string, projectName: string) => {
    setSelectedProjectId(id);
    setSelectedProjectName(projectName);
    setFinishModalOpen(true);
  };

  const confirmCancel = async (reason: string) => {
    if (!selectedProjectId) return;
    await updateProject(selectedProjectId, {
      status: "Cancelado",
      cancellationDate: new Date().toISOString(),
      cancellationReason: reason,
    });
    toast.info("Proyecto cancelado", { description: reason });
    setCancelModalOpen(false);
    loadData();
  };

  const confirmFinish = async () => {
    if (!selectedProjectId) return;
    await updateProject(selectedProjectId, {
      status: "Finalizado",
      realEndDate: new Date().toISOString(),
    });
    toast.success("Proyecto finalizado", { description: "Marcado como finalizado con éxito." });
    setFinishModalOpen(false);
    loadData();
  };

  // Graceful degradation and grouping by month with LIVE COMPUTED METRICS
  const projectsByMonth = dbProjects.reduce((acc, project) => {
    // Only show approved projects (Activo, Finalizado, Cancelado)
    if (project.status === "Propuesta") return acc;

    const dateObj = project.kickoffDate ? new Date(project.kickoffDate) : (project.createdAt ? new Date(project.createdAt) : new Date());
    const month = format(dateObj, "MMMM yyyy", { locale: es });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    if (!acc[capitalizedMonth]) {
      acc[capitalizedMonth] = [];
    }
    
    // Live calculation of financial & time metrics
    const collectionsForProject = dbCollections.filter(c => c.projectId === project.id);
    const totalCollected = collectionsForProject.reduce((sum, c) => sum + (c.grossAmount || 0), 0);
    const projectTotal = project.totalAmount || project.finalAmountPlusLicenses || 0;
    const pendingToCollect = Math.max(0, projectTotal - totalCollected);

    const now = new Date();
    const kickoff = project.kickoffDate ? new Date(project.kickoffDate) : now;
    const expectedEnd = project.expectedEndDate ? new Date(project.expectedEndDate) : now;
    const realEnd = project.realEndDate ? new Date(project.realEndDate) : now;

    const daysWorked = Math.max(0, Math.floor(((project.status === "Finalizado" ? realEnd : now).getTime() - kickoff.getTime()) / (1000 * 60 * 60 * 24)));
    const daysOverdue = (now > expectedEnd && project.status === "Activo") 
      ? Math.floor((now.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24)) 
      : (project.daysOverdue || 0);

    acc[capitalizedMonth].push({
      id: project.id || "N/A",
      leadId: project.leadId || "N/A",
      companyName: project.companyName || project.projectName || "Sin Nombre",
      rating: project.rating || 4,
      scale: project.scale || "XP",
      kickoffDate: kickoff,
      expectedEndDate: expectedEnd,
      totalAmount: projectTotal,
      status: (project.status as ProjectStatus) || "Activo",
      metrics: {
        daysWorked,
        daysOverdue,
        pendingToCollect,
        uncollectedMoney: pendingToCollect,
      }
    });
    
    return acc;
  }, {} as Record<string, any[]>);

  const renderProjectsCarousel = (status: ProjectStatus) => {
    const groups = Object.keys(projectsByMonth).map(month => ({
      month,
      projects: projectsByMonth[month]
    }));

    return (
      <div className="space-y-12">
        {groups.map((group) => {
          const filteredProjects = group.projects.filter(p => p.status === status);
          if (filteredProjects.length === 0) return null;

          return (
            <section key={group.month}>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {group.month}
                </h2>
                <Badge variant="secondary" className="font-mono text-muted-foreground">{filteredProjects.length}</Badge>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Carousel 
                opts={{ align: "start", dragFree: true }} 
                className="w-full max-w-full relative" 
              >
                <CarouselContent className="-ml-4 py-2">
                  {filteredProjects.map((project) => (
                    <CarouselItem key={project.id} className="pl-4 basis-[90%] sm:basis-[380px] lg:basis-[420px]">
                      <ProjectCard 
                        {...project}
                        onCancel={() => handleCancelProject(project.id, project.companyName)}
                        onFinish={() => handleFinishProject(project.id, project.companyName)}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </section>
          );
        })}

        {groups.every(g => g.projects.filter(p => p.status === status).length === 0) && (
          <EmptyState
            icon={status === "Activo" ? FolderKanban : CheckCircle2}
            title={
              status === "Activo" 
                ? "No hay proyectos activos en ejecución" 
                : status === "Finalizado" 
                  ? "No hay proyectos finalizados" 
                  : "No hay proyectos cancelados"
            }
            description={
              status === "Activo"
                ? "Los proyectos en curso se originan a partir de propuestas aprobadas. Revisa las propuestas pendientes para dar de alta un proyecto."
                : status === "Finalizado"
                  ? "Los proyectos entregados satisfactoriamente y con balance cerrado se listarán en esta sección."
                  : "No se registran cancelaciones de proyectos en este período."
            }
            actionLabel={status === "Activo" ? "Explorar Propuestas" : undefined}
            actionHref={status === "Activo" ? "/operaciones/propuestas" : undefined}
            size="lg"
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      
      {/* Top Bar Contextual Local */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Ver Proyectos</h1>
        </div>
        
        <div className="w-full md:w-64">
          <DateRangePicker date={date} setDate={setDate} />
        </div>
      </div>

      {/* TABS DE ESTADO */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ProjectStatus)} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 mb-8 h-12 bg-muted/50 p-1">
          <TabsTrigger value="Activo" className="text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">Activos</TabsTrigger>
          <TabsTrigger value="Finalizado" className="text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">Finalizados</TabsTrigger>
          <TabsTrigger value="Cancelado" className="text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">Cancelados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="Activo" className="mt-0 outline-none">
          {renderProjectsCarousel("Activo")}
        </TabsContent>
        
        <TabsContent value="Finalizado" className="mt-0 outline-none">
          {renderProjectsCarousel("Finalizado")}
        </TabsContent>
        
        <TabsContent value="Cancelado" className="mt-0 outline-none">
          {renderProjectsCarousel("Cancelado")}
        </TabsContent>
      </Tabs>

      {/* MODALES */}
      <CancelProjectModal 
        isOpen={cancelModalOpen} 
        onClose={() => setCancelModalOpen(false)} 
        projectName={selectedProjectName}
        onConfirm={confirmCancel}
      />
      
      <FinishProjectModal
        isOpen={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        projectName={selectedProjectName}
        onConfirm={confirmFinish}
      />
    </div>
  );
}
