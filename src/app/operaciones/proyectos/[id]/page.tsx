"use client";

import { useState, use } from "react";
import { Building2, User, Mail, Phone, ExternalLink, Calendar, Banknote, ListChecks, AlertCircle, Clock, AlertTriangle, Briefcase, Users, Scale, FileText, LayoutDashboard, Target } from "lucide-react";
import { useLayoutStore } from "@/store/use-layout-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CancelProjectModal } from "@/components/operaciones/proyectos/cancel-project-modal";
import { FinishProjectModal } from "@/components/operaciones/proyectos/finish-project-modal";
import { ProjectStatus } from "@/components/operaciones/proyectos/project-card";
// Dynamic Project Profile View

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg 
          key={i}
          xmlns="http://www.w3.org/2000/svg" 
          width="16" height="16" 
          viewBox="0 0 24 24" 
          fill={i < score ? "currentColor" : "none"} 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
          className={i < score ? "text-amber-400" : "text-muted-foreground/30"}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

import { useEffect } from "react";
import { format } from "date-fns";
import { getProjects, updateProject } from "@/actions/proyectos";
import { getReferrers } from "@/actions/referidores";
import { getLeads } from "@/actions/leads";
import { toast } from "sonner";

export default function ProjectProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [project, setProject] = useState<any>({
    id: "",
    companyName: "Cargando proyecto...",
    status: "Activo" as ProjectStatus,
    kickoffDate: "-",
    endDate: "-",
    daysWorked: 0,
    daysOverdue: 0,
    totalAmount: 0,
    totalToCollect: 0,
    laborCost: 0,
    stratuxNetMargin: 0,
    collectedAmount: 0,
    pendingCollection: 0,
    paymentsTotal: 0,
    moneyLostDueToDelay: 0,
    uncollectedMoney: 0,
    cancellationReason: "",
    clientContactName: "-",
    clientEmail: "-",
    clientPhone: "-",
    referrerName: "Directo",
    referrerType: "-",
    workersCount: 1,
    scale: "-",
    projectType: "-",
    notes: "-",
    proposal: {
      id: "PR-",
      chosenVersionId: "V1",
      versions: [
        {
          id: "V1",
          versionName: "Versión 1",
          presentationDate: "-",
          acceptedDate: "-",
          quoteTotal: 0,
          paymentType: "50% / 50%",
          billingFrequency: "N/A",
          licenseScope: "Propiedad Total",
          featuresIncluded: [],
          outOfScope: [],
          date9010: "-",
          projectType: "-",
          workersCount: 1,
          scale: "-",
          isContinuation: false,
          contactDates: [],
          financials: {
            laborCost: 0,
            stratuxCommission: 0,
            referrerCommission: 0,
            taxes: 0,
            thirdPartyLicenses: 0
          }
        }
      ]
    },
    lead: {
      id: "-",
      rating: 3,
      contactName: "No registrado",
      sector: "N/A",
      whatsapp: "No registrado",
      email: "No registrado",
      businessProblems: "Información importada desde base de datos."
    }
  });

  const safeFormatDate = (val?: string | null) => {
    if (!val || val === "-") return "-";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return format(d, "dd/MM/yyyy");
    } catch {
      return val;
    }
  };

  useEffect(() => {
    Promise.all([getProjects(), getReferrers(), getLeads()]).then(([projects, referrers, leads]) => {
      const found = projects.find((p) => p.id === unwrappedParams.id);
      if (found) {
        const matchedRef = found.referrerId ? referrers.find((r) => r.id === found.referrerId) : null;
        const refName = matchedRef 
          ? `${matchedRef.name}${matchedRef.nickname ? ` (${matchedRef.nickname})` : ''}` 
          : (found.referrerId || "Directo");

        const matchedLead = found.leadId ? leads.find((l) => l.id === found.leadId) : null;
        const leadContactName = matchedLead
          ? `${matchedLead.firstName || ""} ${matchedLead.lastName || ""}`.trim() || matchedLead.contactName || "No registrado"
          : (found as any).contactName || "No registrado";

        const baseId = found.originalProposalId || found.id.replace(/-V\d+$/i, "");
        const related = projects.filter(p => 
          p.id === unwrappedParams.id || 
          p.originalProposalId === unwrappedParams.id ||
          p.originalProposalId === baseId ||
          p.id.replace(/-V\d+$/i, "") === baseId ||
          (found.leadId && p.leadId === found.leadId)
        );

        const versionsList = (related.length > 0 ? related : [found])
          .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return (a.versionNumber || 0) - (b.versionNumber || 0);
          })
          .map((p, idx) => {
            const vNum = p.versionNumber || (p.id.match(/-V(\d+)$/i) ? parseInt(p.id.match(/-V(\d+)$/i)![1], 10) : (idx + 1));
            const vCode = `V${vNum}`;
            const pTaxes = Math.max(0, (p.totalAmount || 0) - (p.finalStratuxAmount || 0));

            return {
              id: vCode,
              versionName: `Versión ${vNum}`,
              presentationDate: safeFormatDate(p.createdAt),
              acceptedDate: safeFormatDate(p.approvalDate || p.createdAt),
              quoteTotal: p.totalAmount || 0,
              paymentType: p.paymentType || "50% / 50%",
              billingFrequency: "N/A",
              licenseScope: "Propiedad Total",
              featuresIncluded: [],
              outOfScope: [],
              date9010: safeFormatDate(p.date9010),
              projectType: p.projectType || "-",
              workersCount: p.workersCount || 1,
              scale: p.scale || "-",
              isContinuation: !!p.originalProposalId,
              contactDates: [safeFormatDate(p.createdAt)],
              financials: {
                laborCost: p.laborCost || 0,
                stratuxCommission: p.stratuxCommission || 0,
                referrerCommission: p.referrerCommission || 0,
                taxes: pTaxes,
                thirdPartyLicenses: p.licensesAmount || 0
              }
            };
          });

        const activeVCode = `V${found.versionNumber || (found.id.match(/-V(\d+)$/i) ? parseInt(found.id.match(/-V(\d+)$/i)![1], 10) : 1)}`;
        setActiveVersionId(activeVCode);

        let calculatedDaysWorked = 0;
        if (found.kickoffDate) {
          const startDate = new Date(found.kickoffDate);
          const endDate = found.realEndDate ? new Date(found.realEndDate) : new Date();
          const diffMs = endDate.getTime() - startDate.getTime();
          calculatedDaysWorked = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        const foundAny = found as any;

        setProject({
          id: found.id,
          companyName: found.companyName || found.projectName || "Proyecto sin nombre",
          status: (found.status as ProjectStatus) || "Activo",
          kickoffDate: safeFormatDate(found.kickoffDate || found.createdAt),
          endDate: safeFormatDate(found.realEndDate || found.expectedEndDate),
          daysWorked: foundAny.metrics?.daysWorked ?? calculatedDaysWorked,
          daysOverdue: found.daysOverdue ?? foundAny.metrics?.daysOverdue ?? 0,
          totalAmount: found.totalAmount || 0,
          totalToCollect: foundAny.metrics?.pendingToCollect ?? (found.totalAmount || 0),
          laborCost: found.laborCost || 0,
          stratuxNetMargin: found.stratuxCommission || 0,
          collectedAmount: 0,
          pendingCollection: foundAny.metrics?.pendingToCollect ?? (found.totalAmount || 0),
          paymentsTotal: 0,
          moneyLostDueToDelay: found.metrics?.moneyLostDueToDelay || 0,
          uncollectedMoney: found.metrics?.uncollectedMoney || (found.totalAmount || 0),
          cancellationReason: found.cancellationReason || "Sin motivo especificado.",
          clientContactName: leadContactName,
          clientEmail: matchedLead?.email || found.email || "-",
          clientPhone: matchedLead?.whatsapp || found.whatsapp || "-",
          referrerName: refName,
          referrerType: matchedRef ? "Referidor Registrado" : (found.referrerId ? "ID Referidor" : "Directo"),
          workersCount: found.workersCount || 1,
          scale: found.scale || "-",
          projectType: found.projectType || "-",
          notes: "-",
          proposal: {
            id: found.originalProposalId || found.id,
            chosenVersionId: activeVCode,
            versions: versionsList
          },
          lead: {
            id: found.leadId || "-",
            rating: matchedLead?.leadRating || found.rating || 3,
            contactName: leadContactName,
            sector: matchedLead?.rubro || found.rubro || "N/A",
            whatsapp: matchedLead?.whatsapp || found.whatsapp || "No registrado",
            email: matchedLead?.email || found.email || "No registrado",
            businessProblems: matchedLead?.businessProblems || "Información importada desde base de datos."
          }
        });
      } else {
        setProject((prev: any) => ({ ...prev, companyName: "Proyecto No Encontrado" }));
      }
    });
  }, [unwrappedParams.id]);

  const isSidebarCollapsed = useLayoutStore((state) => state.isSidebarCollapsed);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  
  const defaultTab = project.proposal.chosenVersionId || project.proposal.versions[0].id;
  const [activeVersionId, setActiveVersionId] = useState(defaultTab);

  const currentStatus = project.status;
  const isActivo = currentStatus === "Activo";
  const isFinalizado = currentStatus === "Finalizado";
  const isCancelado = currentStatus === "Cancelado";
  
  const statusColor = 
    isActivo ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
    isFinalizado ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
    "bg-red-500/10 text-red-500 border-red-500/20";

  const renderFinancialBlock = (fin: any) => {
    const laborCost = Number(fin?.laborCost) || 0;
    const stratuxCommission = Number(fin?.stratuxCommission) || 0;
    const referrerCommission = Number(fin?.referrerCommission) || 0;
    const taxes = Number(fin?.taxes) || 0;
    const thirdPartyLicenses = Number(fin?.thirdPartyLicenses) || 0;

    const runningStratux = laborCost + stratuxCommission;
    const runningReferrer = runningStratux + referrerCommission;
    const runningTaxes = runningReferrer + taxes;
    const runningLicenses = runningTaxes + thirdPartyLicenses;
    
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary" />
          Desglose Cotización
        </h4>
        
        <div className="bg-muted/30 rounded-lg p-4 space-y-5 border border-border/50">
          <div className="grid grid-cols-2 text-sm gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Mano de Obra</span>
              <span className="font-medium text-foreground">Bs. {laborCost.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monto Base</span>
              <span className="font-bold text-foreground">Bs. {laborCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 text-sm gap-4 border-l-2 border-primary/20 pl-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Comisión Stratux</span>
              <span className="font-medium text-foreground">Bs. {stratuxCommission.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total con comisión Stratux</span>
              <span className="font-bold text-foreground">Bs. {runningStratux.toLocaleString()}</span>
            </div>
          </div>

          {referrerCommission > 0 && (
            <div className="grid grid-cols-2 text-sm gap-4 border-l-2 border-emerald-500/30 pl-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Comisión Referidor</span>
                <span className="font-medium text-foreground">Bs. {referrerCommission.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total con referidor</span>
                <span className="font-bold text-foreground">Bs. {runningReferrer.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 text-sm gap-4 border-l-2 border-amber-500/30 pl-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Impuestos retenidos</span>
              <span className="font-medium text-foreground">Bs. {taxes.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total con impuestos</span>
              <span className="font-bold text-foreground">Bs. {runningTaxes.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 text-sm gap-4 border-l-2 border-blue-500/30 pl-4 pt-2 border-t border-border">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground flex items-center gap-1">
                Licencias de Terceros 
              </span>
              <span className="font-medium text-foreground">Bs. {thirdPartyLicenses.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total con licencias</span>
              <span className="font-bold text-foreground">Bs. {runningLicenses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const chosenVersion = project.proposal?.versions?.find((v: any) => v.id === project.proposal?.chosenVersionId) || project.proposal?.versions?.[0] || {};
  const paymentType = chosenVersion?.paymentType || "50% / 50%";
  const showCollectAction = paymentType === "Mensual" || paymentType === "Diferido";

  const handleConfirmCancel = async (reason: string) => {
    if (!project.id) return;
    await updateProject(project.id, {
      status: "Cancelado",
      cancellationDate: new Date().toISOString(),
      cancellationReason: reason,
    });
    setProject((prev: any) => ({
      ...prev,
      status: "Cancelado",
      cancellationReason: reason,
    }));
    toast.info("Proyecto cancelado", { description: reason });
    setCancelModalOpen(false);
  };

  const handleConfirmFinish = async () => {
    if (!project.id) return;
    await updateProject(project.id, {
      status: "Finalizado",
      realEndDate: new Date().toISOString(),
    });
    setProject((prev: any) => ({
      ...prev,
      status: "Finalizado",
      endDate: safeFormatDate(new Date().toISOString()),
    }));
    toast.success("Proyecto finalizado", { description: "Marcado como finalizado con éxito." });
    setFinishModalOpen(false);
  };

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <main className={`flex-1 p-6 max-w-5xl mx-auto w-full space-y-10 ${isActivo ? 'pb-28' : 'pb-6'}`}>
        
        {/* TITULO PRINCIPAL Y BADGE DE ESTADO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              Proyecto: {project.companyName}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="font-mono text-muted-foreground bg-muted/30">
                {project.id}
              </Badge>
              <Badge variant="outline" className={statusColor}>
                {currentStatus}
              </Badge>
            </div>
          </div>
        </div>

        {/* BLOQUE 1: DATOS DEL PROYECTO (MÉTRICAS AISLADAS) */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground/80 flex items-center gap-2 border-b border-border pb-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            1. Datos del Proyecto
          </h2>
          
          <div className={`grid grid-cols-2 gap-4 ${isCancelado ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-5'}`}>
            {/* Datos Base Obligatorios (Independientes del Estado) */}
            <Card className="shadow-sm">
              <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Inicio</span>
                <span className="font-bold text-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary"/> {project.kickoffDate}</span>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Fin / Entrega</span>
                <span className="font-bold text-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary"/> {project.endDate}</span>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Días Trab.</span>
                <span className="font-bold text-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary"/> {project.daysWorked}</span>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                <span className="text-xs font-semibold text-primary uppercase">Total (Bs)</span>
                <span className="font-bold text-primary flex items-center gap-1"><Banknote className="w-3.5 h-3.5"/> {(project.totalAmount || 0).toLocaleString()}</span>
              </CardContent>
            </Card>

            {/* Reglas de Aislamiento para ACTIVO */}
            {isActivo && (
              <Card className="shadow-sm border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                  <span className="text-xs font-semibold text-emerald-600 uppercase">Total por Cobrar</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1"><Banknote className="w-3.5 h-3.5"/> {(project.totalToCollect ?? project.totalAmount ?? 0).toLocaleString()}</span>
                </CardContent>
              </Card>
            )}

            {/* Reglas de Aislamiento para FINALIZADO */}
            {isFinalizado && (
              <Card className="shadow-sm border-destructive/20 bg-destructive/5">
                <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                  <span className="text-xs font-semibold text-destructive uppercase tracking-tighter">Pérdida por plazo</span>
                  <span className="font-bold text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5"/> 
                    {(project.moneyLostDueToDelay || 0).toLocaleString()}
                  </span>
                </CardContent>
              </Card>
            )}

            {/* Reglas de Aislamiento para CANCELADO */}
            {isCancelado && (
              <>
                <Card className="shadow-sm border-destructive/20 bg-destructive/5">
                  <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                    <span className="text-xs font-semibold text-destructive uppercase tracking-tighter">Pérdida por plazo</span>
                    <span className="font-bold text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5"/> 
                      {(project.moneyLostDueToDelay || 0).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-destructive/30 bg-destructive/10">
                  <CardContent className="p-4 flex flex-col items-start justify-center gap-1">
                    <span className="text-xs font-semibold text-destructive uppercase tracking-tighter">Dinero no cobrado</span>
                    <span className="font-bold text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5"/> 
                      {(project.uncollectedMoney ?? project.totalAmount ?? 0).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* NUEVO BLOQUE CUALITATIVO PARA PROYECTOS CANCELADOS */}
          {isCancelado && (
            <div className="mt-4 p-6 bg-red-500/5 border border-red-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-red-700/90 uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Sobre la cancelación de este proyecto
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {project.cancellationReason || "Sin motivo especificado."}
              </p>
            </div>
          )}
        </section>

        {/* BLOQUE 2: DATOS DE LA PROPUESTA */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground/80 flex items-center gap-2 border-b border-border pb-2">
            <FileText className="w-5 h-5 text-primary" />
            2. Datos de la Propuesta
          </h2>
          
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-sm">Origen:</span>
                <Badge variant="outline" className="font-mono bg-background text-foreground text-sm">
                  {project.proposal?.id || "-"}
                </Badge>
              </div>

              {/* SELECTOR DE VERSIONES */}
              {(project.proposal?.versions?.length || 0) > 1 && (
                <Tabs value={activeVersionId} onValueChange={setActiveVersionId} className="w-full sm:w-auto">
                  <TabsList className="grid grid-cols-2 w-full sm:w-[200px]">
                    {project.proposal.versions.map((v: any) => (
                      <TabsTrigger key={v.id} value={v.id} className="font-mono">
                        {v.id}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            </CardHeader>
            
            <CardContent className="p-0">
              {(project.proposal?.versions || []).map((version: any) => {
                const isChosen = version.id === (project.proposal?.chosenVersionId || project.proposal?.versions?.[0]?.id);
                
                return (
                  <div 
                    key={version.id} 
                    className={activeVersionId === version.id ? "block p-6 animate-in fade-in duration-300" : "hidden"}
                  >
                    <div className="flex justify-end mb-6">
                       {isChosen ? (
                         <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 shadow-sm flex items-center gap-1.5 uppercase tracking-wide text-xs">
                           <Target className="w-3.5 h-3.5" /> Versión Escogida
                         </Badge>
                       ) : (
                         <Badge variant="secondary" className="text-muted-foreground font-medium px-3 py-1">
                           Versión Descartada
                         </Badge>
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Sub-sección A: Presentación */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          Datos de Presentación
                        </h4>
                        
                        <div className="bg-muted/10 rounded-lg p-4 border border-border/50 space-y-3">
                          <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2">
                            <span className="text-muted-foreground">Reunión 90/10</span>
                            <span className="font-medium text-foreground">{version.date9010 || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2">
                            <span className="text-muted-foreground">Tipo de proyecto</span>
                            <span className="font-medium text-foreground">{version.projectType || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2">
                            <span className="text-muted-foreground">N° Trabajadores</span>
                            <span className="font-medium text-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {version.workersCount || 1}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2">
                            <span className="text-muted-foreground">Escala</span>
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary uppercase font-bold">{version.scale || "-"}</Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2">
                            <span className="text-muted-foreground">Tipo de cobro</span>
                            <span className="font-medium text-foreground">{version.paymentType || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2">
                            <span className="text-muted-foreground">Continuación</span>
                            <span className="font-medium text-foreground">{version.isContinuation ? "Sí" : "No"}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2">
                            <span className="text-muted-foreground">Referidor</span>
                            <span className="font-medium text-foreground">{project.referrerName || "-"}</span>
                          </div>
                          
                          {/* Desglose de Contactos Dinámico */}
                          <div className="flex flex-col text-sm pt-2">
                            <span className="text-muted-foreground font-semibold mb-1">
                              Contactos: <span className="text-foreground">{version.contactDates?.length || 0}</span>
                            </span>
                            <span className="text-muted-foreground text-xs leading-relaxed">
                              Fechas: <span className="font-medium text-foreground">{version.contactDates?.length ? version.contactDates.join(", ") : "-"}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sub-sección B: Cotización */}
                      {renderFinancialBlock(version?.financials)}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* BLOQUE 3: DATOS DEL LEAD */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground/80 flex items-center gap-2 border-b border-border pb-2">
            <User className="w-5 h-5 text-primary" />
            3. Datos del Lead (Origen)
          </h2>

          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono bg-background text-foreground text-sm">
                  {project.lead?.id || "-"}
                </Badge>
              </div>
              <StarRating score={project.lead?.rating || 3} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-3">
                {/* Identidad */}
                <div className="p-6 border-b md:border-b-0 md:border-r border-border bg-card">
                  <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">
                    Contacto Principal
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-1">Nombre</span>
                      <span className="font-medium text-foreground">{project.lead?.contactName || "No registrado"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-1">Rubro</span>
                      <span className="font-medium text-foreground">{project.lead?.sector || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> WhatsApp</span>
                      <span className="font-medium text-foreground">{project.lead?.whatsapp || "-"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</span>
                      <span className="font-medium text-foreground break-all">{project.lead?.email || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Problemas Empresariales */}
                <div className="p-6 col-span-1 md:col-span-2 bg-amber-500/5">
                  <h4 className="text-sm font-semibold text-amber-700/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Problemas Empresariales
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {project.lead?.businessProblems || "Información importada desde base de datos."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </main>

      {/* STICKY FOOTER / DOWN BAR CONDICIONAL: Solo si Activo */}
      {isActivo && (
        <footer className={`fixed bottom-0 right-0 z-30 bg-card border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 left-0 ${isSidebarCollapsed ? 'md:left-20' : 'md:left-64'}`}>
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between sm:justify-end gap-4">
            <Button onClick={() => setCancelModalOpen(true)} variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto">
              Cancelar Proyecto
            </Button>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {showCollectAction && (
                <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 w-full sm:w-auto shadow-sm">
                  Cobrar {paymentType}
                </Button>
              )}
              <Button onClick={() => setFinishModalOpen(true)} className="w-full sm:w-auto shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white">
                Finalizar Proyecto
              </Button>
            </div>
          </div>
        </footer>
      )}

      <CancelProjectModal 
        isOpen={cancelModalOpen} 
        onClose={() => setCancelModalOpen(false)} 
        projectName={project.companyName} 
        onConfirm={handleConfirmCancel} 
      />
      <FinishProjectModal 
        isOpen={finishModalOpen} 
        onClose={() => setFinishModalOpen(false)} 
        projectName={project.companyName} 
        onConfirm={handleConfirmFinish} 
      />
    </div>
  );
}
