"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { Star, FileText, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getProjects, approveProposal, declineProposal } from "@/actions/proyectos";
import { getLeads } from "@/actions/leads";
import { Project, Lead } from "@/types/database";
import { useLayoutStore } from "@/store/use-layout-store";
import { EmptyState } from "@/components/ui/empty-state";
import { ApproveProposalModal, ApproveProposalModalData } from "@/components/operaciones/propuestas/approve-proposal-modal";

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ProposalCard({
  proposal,
  isDeclined = false,
  onApprove,
  onDecline,
}: {
  proposal: any;
  isDeclined?: boolean;
  onApprove?: (data: ApproveProposalModalData) => void;
  onDecline?: (id: string, name: string) => void;
}) {
  const versions = proposal.versions && proposal.versions.length > 0 ? proposal.versions : [
    {
      id: 'V1',
      versionNumber: 1,
      code: `${proposal.id}-V1`,
      rawId: proposal.id,
      amount: 0,
      scale: proposal.scale || 'XP',
      dateContact: '—',
      date9010: '—',
      datePresentation: '—'
    }
  ];

  const [selectedVersionIndex, setSelectedVersionIndex] = useState(versions.length - 1);
  const currentVersion = versions[selectedVersionIndex] || versions[versions.length - 1];

  return (
    <Card className={cn(
      "w-full h-full flex flex-col transition-colors shadow-sm overflow-hidden",
      isDeclined ? "border-border/60 opacity-90" : "hover:border-primary/40"
    )}>
      <CardContent className="p-0 flex flex-col flex-1">

        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/10">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <Link href={`/operaciones/propuestas/${proposal.id}`} className="hover:underline block">
                <h3 className="font-heading font-bold text-lg text-foreground mb-1 truncate" title={proposal.empresa}>
                  {proposal.empresa}
                </h3>
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">
                  {proposal.rubro}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary font-semibold shrink-0">
                  Escala {currentVersion.scale || proposal.scale}
                </span>
                {isDeclined && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                    Declinada
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-muted-foreground mb-1 block">Score del Lead</span>
              <StarRating score={proposal.score} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block mb-0.5">WhatsApp</span>
              <span className="font-medium text-foreground truncate block">{proposal.whatsapp}</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block mb-0.5">Email</span>
              <span className="font-medium text-foreground truncate block">{proposal.email}</span>
            </div>
          </div>
        </div>

        {/* Version Info with Interactive Version Switcher */}
        <div className="p-5 flex-1 bg-card flex flex-col justify-between space-y-4">
          <div className="w-full space-y-3">
            {/* Version Switcher if multiple versions, or clean single version header */}
            {versions.length > 1 ? (
              <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded-lg border border-border">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground px-1">Versión:</span>
                  {versions.map((v: any, idx: number) => (
                    <button
                      key={v.rawId || `${v.id}-${idx}`}
                      type="button"
                      onClick={() => setSelectedVersionIndex(idx)}
                      className={cn(
                        "px-2 py-0.5 text-xs font-bold rounded transition-all cursor-pointer",
                        selectedVersionIndex === idx
                          ? "bg-primary text-primary-foreground shadow-xs scale-105"
                          : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground border border-border/50"
                      )}
                    >
                      {v.id}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-muted-foreground pr-1 truncate max-w-[130px]" title={currentVersion.code}>
                  {currentVersion.code}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-sm font-semibold text-foreground">
                  Versión {currentVersion.id}
                </span>
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]" title={currentVersion.code}>
                  {currentVersion.code}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Monto</span>
              <span className="text-base font-bold text-foreground">
                Bs. {Number(currentVersion.amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex justify-between items-center">
                <span>Contacto</span>
                <span className="font-medium text-foreground">{currentVersion.dateContact}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Reunión 90/10</span>
                <span className="font-medium text-foreground">{currentVersion.date9010}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Presentación</span>
                <span className="font-medium text-foreground">{currentVersion.datePresentation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-5 border-t border-border bg-muted/10 mt-auto">
          {isDeclined ? (
            /* Solo Ver Detalle para propuestas declinadas */
            <Link href={`/operaciones/propuestas/${proposal.id}`} className="w-full block">
              <Button variant="outline" size="sm" className="w-full">
                Ver detalle
              </Button>
            </Link>
          ) : (
            /* Acciones completas para propuestas activas */
            <div className="grid grid-cols-2 gap-2.5">
              <Link href={`/operaciones/propuestas/${proposal.id}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full truncate">
                  Ver detalle
                </Button>
              </Link>
              <Link
                href={`/operaciones/propuestas/crear?leadId=${proposal.leadId || ''}&baseProposalId=${proposal.id}&nextVersion=${versions.length + 1}`}
                className="w-full"
              >
                <Button variant="outline" size="sm" className="w-full truncate">
                  Nueva versión
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onDecline?.(proposal.id, proposal.empresa)}
                className="col-span-2 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border"
              >
                <XCircle className="w-4 h-4 mr-1.5 text-rose-500" />
                Declinar propuesta
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => onApprove?.({
                  id: proposal.id,
                  rawId: currentVersion.rawId || proposal.id,
                  companyName: proposal.empresa,
                  projectName: currentVersion.projectName || proposal.empresa,
                  estimatedKickoffDate: currentVersion.kickoffDate || currentVersion.createdAt,
                  estimatedEndDate: currentVersion.expectedEndDate,
                  scale: currentVersion.scale,
                  amount: currentVersion.amount
                })}
                className="col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm font-semibold"
              >
                Dar de alta Proyecto
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PropuestasPage() {
  const router = useRouter();
  const { lastSyncTime } = useLayoutStore();
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    };
  });

  const [activeTab, setActiveTab] = useState<"activas" | "declinadas">("activas");
  const [dbProjects, setDbProjects] = useState<Project[]>([]);
  const [dbLeads, setDbLeads] = useState<Lead[]>([]);
  const [visibleMonthsCount, setVisibleMonthsCount] = useState(5);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedProposalToApprove, setSelectedProposalToApprove] = useState<ApproveProposalModalData | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Modal para declinar propuesta
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [proposalToDecline, setProposalToDecline] = useState<{ id: string; name: string } | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);

  const loadData = () => {
    Promise.all([getProjects(), getLeads()]).then(([projects, leads]) => {
      setDbProjects(projects);
      setDbLeads(leads);
    });
  };

  useEffect(() => {
    loadData();
  }, [lastSyncTime]);

  const handleOpenApproveModal = (data: ApproveProposalModalData) => {
    setSelectedProposalToApprove(data);
    setApproveModalOpen(true);
  };

  const handleOpenDeclineModal = (id: string, name: string) => {
    setProposalToDecline({ id, name });
    setDeclineModalOpen(true);
  };

  const handleConfirmDecline = async () => {
    if (!proposalToDecline) return;
    setIsDeclining(true);
    try {
      const res = await declineProposal(proposalToDecline.id);
      if (res.success) {
        toast.success("Propuesta declinada", {
          description: `La propuesta "${proposalToDecline.name}" ha sido movida a Declinadas.`,
        });
        setDeclineModalOpen(false);
        loadData();
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error al declinar propuesta", { description: err.message });
    } finally {
      setIsDeclining(false);
    }
  };

  const handleConfirmApprove = async (id: string, kickoffDate: string, expectedEndDate: string) => {
    try {
      setIsApproving(true);
      const res = await approveProposal(id, kickoffDate, expectedEndDate);
      if (res.success) {
        toast.success("¡Proyecto dado de alta!", {
          description: `El proyecto "${selectedProposalToApprove?.companyName || id}" ha sido activado y movido a Proyectos.`,
        });
        setApproveModalOpen(false);
        loadData();
        router.push("/operaciones/proyectos");
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar alta");
    } finally {
      setIsApproving(false);
    }
  };

  // Agrupador para un conjunto de proyectos
  const buildProposalsByMonth = (projectsList: Project[]) => {
    return projectsList.reduce((acc, project) => {
      const baseId = project.originalProposalId || project.id.replace(/-V\d+$/i, "");
      const matchedLead = dbLeads.find(l => l.id === project.leadId);
      const dateObj = project.createdAt ? new Date(project.createdAt) : new Date();
      const month = format(dateObj, "MMMM yyyy", { locale: es });
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

      if (!acc[capitalizedMonth]) {
        acc[capitalizedMonth] = [];
      }

      const date9010Str = project.date9010 ? format(new Date(project.date9010), "d 'de' MMM", { locale: es }) : "Pendiente";
      const verNum = project.versionNumber || (project.id.match(/-V(\d+)$/i) ? parseInt(project.id.match(/-V(\d+)$/i)![1], 10) : 1);
      const verCode = `V${verNum}`;

      const versionObj = {
        id: verCode,
        versionNumber: verNum,
        explicitVersionNumber: project.versionNumber,
        code: project.id,
        rawId: project.id,
        amount: project.totalAmount || project.finalAmountPlusLicenses || 0,
        scale: project.scale || "XP",
        dateContact: format(dateObj, "EEE d 'de' MMMM", { locale: es }),
        date9010: date9010Str,
        datePresentation: project.presentationDone ? "Realizada" : "Pendiente",
        kickoffDate: project.kickoffDate,
        expectedEndDate: project.expectedEndDate,
        projectName: project.projectName,
        createdAt: project.createdAt || dateObj.toISOString()
      };

      const existingProposal = acc[capitalizedMonth].find(p => p.id === baseId || (project.leadId && p.leadId === project.leadId));

      if (existingProposal) {
        if (!existingProposal.versions.some((v: any) => v.code === project.id)) {
          existingProposal.versions.push(versionObj);
          existingProposal.versions.sort((a: any, b: any) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return (a.versionNumber || 0) - (b.versionNumber || 0);
          });
          existingProposal.versions.forEach((v: any, idx: number) => {
            const vNumber = idx + 1;
            v.versionNumber = vNumber;
            v.id = `V${vNumber}`;
          });
          const latest = existingProposal.versions[existingProposal.versions.length - 1];
          existingProposal.scale = latest.scale;
        }
      } else {
        acc[capitalizedMonth].push({
          id: baseId,
          leadId: project.leadId,
          empresa: project.companyName || matchedLead?.companyName || "Sin Empresa",
          scale: project.scale || "XP",
          score: matchedLead?.leadRating || project.rating || 3,
          rubro: matchedLead?.rubro || project.rubro || project.projectType || "General",
          whatsapp: matchedLead?.whatsapp || project.whatsapp || "Sin dato",
          email: matchedLead?.email || project.email || "Sin correo",
          contactCount: 1,
          versions: [versionObj]
        });
      }

      return acc;
    }, {} as Record<string, any[]>);
  };

  // Filtrado de propuestas
  const activeProposalsList = dbProjects.filter(p => !p.status || p.status === "Propuesta");
  const declinedProposalsList = dbProjects.filter(p => p.status === "Declinada");

  const proposalsByMonth = buildProposalsByMonth(activeTab === "activas" ? activeProposalsList : declinedProposalsList);

  const monthsArray = Object.keys(proposalsByMonth).map(month => ({
    month,
    proposals: proposalsByMonth[month]
  }));

  const visibleMonths = monthsArray.slice(0, visibleMonthsCount);
  const hasMore = visibleMonthsCount < monthsArray.length;

  const handleLoadMore = () => {
    setVisibleMonthsCount(prev => Math.min(prev + 5, monthsArray.length));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header sin subtítulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Explorador de Propuestas
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/operaciones/propuestas/crear">
            <Button variant="default" className="font-semibold shadow-sm">
              Crear Propuesta
            </Button>
          </Link>
          <DateRangePicker date={date} setDate={setDate} />
        </div>
      </div>

      {/* Tabs: Propuestas Activas y Declinadas */}
      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val as "activas" | "declinadas");
        setVisibleMonthsCount(5);
      }} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 mb-8 h-12 bg-muted/50 p-1">
          <TabsTrigger value="activas" className="text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Propuestas Activas ({activeProposalsList.length})
          </TabsTrigger>
          <TabsTrigger value="declinadas" className="text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Declinadas ({declinedProposalsList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0 outline-none space-y-12">
          {visibleMonths.map((group) => (
            <div key={group.month}>
              <Carousel
                opts={{
                  align: "start",
                  dragFree: true
                }}
                className="w-full max-w-full relative"
              >
                <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                  <h2 className="text-xl font-heading font-bold text-foreground/80">
                    {group.month}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">
                      {group.proposals.length} {group.proposals.length === 1 ? 'propuesta' : 'propuestas'}
                    </span>
                    <CarouselPrevious className="static translate-y-0 h-8 w-8 text-muted-foreground hover:text-foreground" />
                    <CarouselNext className="static translate-y-0 h-8 w-8 text-muted-foreground hover:text-foreground" />
                  </div>
                </div>

                <CarouselContent className="-ml-4 py-2">
                  {group.proposals.map((proposal: any) => (
                    <CarouselItem key={proposal.id} className="pl-4 basis-[95%] sm:basis-[380px] lg:basis-[410px]">
                      <ProposalCard 
                        proposal={proposal} 
                        isDeclined={activeTab === "declinadas"}
                        onApprove={handleOpenApproveModal} 
                        onDecline={handleOpenDeclineModal}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          ))}

          {visibleMonths.length === 0 && (
            <EmptyState
              icon={FileText}
              title={activeTab === "activas" ? "No hay propuestas comerciales activas" : "No hay propuestas declinadas"}
              description={activeTab === "activas"
                ? "Las propuestas cotizadas aparecerán aquí agrupadas por mes, listas para revisión o dar de alta como proyectos."
                : "Las propuestas que no avancen y sean marcadas como declinadas se archivarán aquí para su consulta histórica."}
              actionLabel={activeTab === "activas" ? "Crear Nueva Propuesta" : undefined}
              actionHref={activeTab === "activas" ? "/operaciones/propuestas/crear" : undefined}
              size="lg"
            />
          )}

          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button variant="outline" onClick={handleLoadMore}>
                Cargar más meses
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Reconfirmación de Fechas al Dar de Alta */}
      <ApproveProposalModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        proposal={selectedProposalToApprove}
        onConfirm={handleConfirmApprove}
        isLoading={isApproving}
      />

      {/* Modal de Confirmación para Declinar Propuesta */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-500 mb-1">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle className="text-lg font-bold">Declinar Propuesta</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              ¿Estás seguro de que deseas marcar como declinada la propuesta para <strong>{proposalToDecline?.name}</strong>? Se moverá a la pestaña de declinadas y no podrá ser activada como proyecto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" onClick={() => setDeclineModalOpen(false)} disabled={isDeclining}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDecline} 
              disabled={isDeclining}
              className="bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              {isDeclining ? "Declinando..." : "Sí, declinar propuesta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
