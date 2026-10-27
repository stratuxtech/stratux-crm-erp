"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Building2, 
  Star, 
  Calendar, 
  Users, 
  Mail, 
  Phone,
  MessageCircle,
  Clock, 
  FileText,
  ChevronLeft,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/store/use-layout-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLeads } from "@/actions/leads";
import { getProjects, approveProposal, updateProject } from "@/actions/proyectos";
import { getReferrers } from "@/actions/referidores";
import { Referrer } from "@/types/database";
import { calculatePricingQuote } from "@/lib/pricing-calculator";
import { EmptyState } from "@/components/ui/empty-state";
import { ApproveProposalModal, ApproveProposalModalData } from "@/components/operaciones/propuestas/approve-proposal-modal";

export default function ProposalProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [availableVersions, setAvailableVersions] = useState<any[]>([]);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [leadData, setLeadData] = useState<any>({
    id: unwrappedParams.id,
    companyName: "Propuesta / Lead",
    rating: 3,
    captureDate: new Date(),
    contactName: "N/A",
    sector: "N/A",
    businessProblems: "Sin observaciones registradas.",
    phone: "Sin teléfono",
    email: "Sin correo"
  });

  const [proposalData, setProposalData] = useState<any>({
    id: unwrappedParams.id,
    version: "V1",
    versionNumber: 1,
    projectName: "Propuesta",
    presentationDate: new Date(),
    expectedStartDate: new Date(),
    expectedEndDate: new Date(),
    projectType: ["Web"],
    scale: "XP",
    workersCount: 1,
    paymentType: "50%/50%",
    laborCost: 0,
    stratuxCommission: 0,
    referrerCommission: 0,
    referrerName: "Directo",
    taxPercentage: 27,
    taxes: 0,
    thirdPartyLicenses: 0,
    status: "Propuesta",
  });
  const [notFound, setNotFound] = useState(false);
  const [referrersList, setReferrersList] = useState<Referrer[]>([]);

  const setProjectVersionData = (project: any, refs?: Referrer[]) => {
    const quote = calculatePricingQuote({
      laborCost: project.laborCost || 0,
      hasLaborCost: true,
      hasReferral: !!project.referrerId,
      hasTaxes: (project.taxPercentage || 0) > 0,
      taxPercentage: project.taxPercentage || 27,
      thirdPartyLicenses: project.licensesAmount || 0,
    });

    const verNum = project.versionNumber || (project.id.match(/-V(\d+)$/i) ? parseInt(project.id.match(/-V(\d+)$/i)![1], 10) : 1);
    const verCode = project.version || `V${verNum}`;
    const activeRefs = refs || referrersList;
    const matchedRef = project.referrerId ? activeRefs.find(r => r.id === project.referrerId) : null;
    const refDisplayName = matchedRef 
      ? `${matchedRef.name}${matchedRef.nickname ? ` (${matchedRef.nickname})` : ''}` 
      : (project.referrerId || "Directo");

    setProposalData({
      id: project.id,
      version: verCode,
      versionNumber: verNum,
      projectName: project.projectName || project.companyName || "Propuesta",
      presentationDate: project.presentationDone ? new Date() : new Date(),
      expectedStartDate: project.kickoffDate ? new Date(project.kickoffDate) : new Date(),
      expectedEndDate: project.expectedEndDate ? new Date(project.expectedEndDate) : new Date(),
      projectType: Array.isArray(project.projectType) ? project.projectType : [project.projectType || "Web"],
      scale: quote.scale,
      workersCount: project.workersCount || 1,
      paymentType: project.paymentType || "50%/50%",
      laborCost: quote.laborCost,
      stratuxCommission: quote.stratuxCommission,
      referrerCommission: quote.referralCommission,
      referrerName: refDisplayName,
      taxPercentage: quote.taxPercentage,
      taxes: quote.taxes,
      thirdPartyLicenses: quote.thirdPartyLicenses,
      status: project.status || "Propuesta",
      quoteBreakdown: quote,
    });
  };

  useEffect(() => {
    Promise.all([getProjects(), getLeads(), getReferrers()]).then(([projects, leads, refs]) => {
      setReferrersList(refs);
      const baseId = unwrappedParams.id.replace(/-V\d+$/i, "");
      
      // Find matching projects/proposals
      const targetProject = projects.find(p => p.id === unwrappedParams.id || p.leadId === unwrappedParams.id);
      const targetLead = leads.find(l => l.id === (targetProject?.leadId || unwrappedParams.id));

      if (!targetProject && !targetLead) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Collect all versions belonging to this proposal / lead
      const related = projects.filter(p => 
        p.id === unwrappedParams.id || 
        p.originalProposalId === unwrappedParams.id ||
        p.originalProposalId === baseId ||
        p.id.replace(/-V\d+$/i, "") === baseId ||
        (targetProject?.leadId && p.leadId === targetProject.leadId)
      );
      const parsedVersions = related
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.versionNumber || 0) - (b.versionNumber || 0);
        })
        .map((p, idx) => {
          const vNum = p.versionNumber || (p.id.match(/-V(\d+)$/i) ? parseInt(p.id.match(/-V(\d+)$/i)![1], 10) : (idx + 1));
          const vCode = `V${vNum}`;
          const updatedProject = { ...p, version: vCode, versionNumber: vNum };
          return {
            id: vCode,
            versionNumber: vNum,
            code: p.id,
            project: updatedProject
          };
        });

      setAvailableVersions(parsedVersions);

      if (targetLead) {
        setLeadData({
          id: targetLead.id,
          companyName: targetLead.companyName || targetProject?.companyName || "Lead Sin Nombre",
          rating: targetLead.leadRating || targetProject?.rating || 3,
          captureDate: targetLead.leadDate ? new Date(targetLead.leadDate) : new Date(),
          contactName: [targetLead.firstName, targetLead.lastName].filter(Boolean).join(" ") || targetLead.contactName || "N/A",
          sector: targetLead.rubro || "N/A",
          businessProblems: targetLead.businessProblems || "Sin observaciones.",
          phone: targetLead.whatsapp || "Sin dato",
          email: targetLead.email || "Sin correo"
        });
      }

      if (targetProject) {
        const matchingParsed = parsedVersions.find(v => v.code === targetProject.id);
        setProjectVersionData(matchingParsed ? matchingParsed.project : targetProject, refs);
      } else if (parsedVersions.length > 0) {
        setProjectVersionData(parsedVersions[0].project, refs);
      }

      setLoading(false);
    });
  }, [unwrappedParams.id]);

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <EmptyState
          icon={FileText}
          title="Propuesta o Registro no encontrado"
          description={`No encontramos ninguna propuesta ni prospecto con el identificador "${unwrappedParams.id}".`}
          actionLabel="Volver al Explorador de Propuestas"
          actionHref="/operaciones/propuestas"
          secondaryLabel="Ver Clientes"
          onSecondaryAction={() => router.push("/directorio/clientes")}
          size="lg"
        />
      </div>
    );
  }

  const handleApprove = () => {
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async (id: string, kickoffDate: string, expectedEndDate: string) => {
    try {
      setIsApproving(true);
      const res = await approveProposal(id, kickoffDate, expectedEndDate);
      if (res.success) {
        toast.success("¡Proyecto dado de alta exitosamente!", {
          description: `El proyecto "${proposalData.projectName}" ahora está activo.`,
        });
        setApproveModalOpen(false);
        router.push("/operaciones/proyectos");
      } else {
        toast.error("Error al dar de alta", { description: res.error });
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar alta");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      await updateProject(proposalData.id, { status: "Cancelado" });
      toast.info("Propuesta rechazada", {
        description: "El estado ha cambiado a Cancelado.",
      });
      router.push("/operaciones/propuestas");
    } catch (e) {
      console.error(e);
    }
  };

  const { laborCost, stratuxCommission, referrerCommission, taxes, thirdPartyLicenses, referrerName, quoteBreakdown } = proposalData;
  const runningStratux = laborCost + stratuxCommission;
  const runningReferrer = runningStratux + referrerCommission;
  const runningTaxes = runningReferrer + taxes;
  const totalProjectBs = runningTaxes;

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 pb-28 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Back Nav */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Detalle de Propuesta</h1>
            <p className="text-xs text-muted-foreground">ID: {proposalData.id} • Versión: {proposalData.version || 'V1'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT PANEL: LEAD & CRM */}
          <section className="space-y-6">
            <Card className="border-border bg-card shadow-sm h-full">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-primary" />
                      {leadData.companyName}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium mt-1 flex gap-2 items-center">
                      <Badge variant="secondary">{leadData.id}</Badge>
                      <div className="flex items-center gap-0.5 ml-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < leadData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Captura: {format(leadData.captureDate, "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{leadData.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{leadData.email}</span>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 border border-border rounded-lg">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                    Problemas del Negocio detectados:
                  </span>
                  <p className="text-sm text-foreground">
                    {leadData.businessProblems}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* RIGHT PANEL: PROPOSAL & MATH */}
          <section className="space-y-6">
            <Card className="border-border bg-card shadow-sm h-full flex flex-col">
              <CardHeader className="pb-4 border-b border-border bg-muted/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-heading flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Cotización Matemática
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-bold text-xs bg-background">
                      {proposalData.version || 'V1'}
                    </Badge>
                    <Badge className="bg-primary text-primary-foreground font-bold">
                      Escala {proposalData.scale}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6 flex-1">
                {/* Version Selector Tabs if multiple versions exist */}
                {availableVersions.length > 1 && (
                  <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border overflow-x-auto">
                    <span className="text-xs font-semibold text-muted-foreground ml-1 shrink-0">Versión:</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {availableVersions.map((v) => (
                        <Button
                          key={v.code}
                          variant={proposalData.id === v.code ? "default" : "outline"}
                          size="sm"
                          onClick={() => setProjectVersionData(v.project)}
                          className={cn(
                            "h-7 text-xs font-bold gap-1 px-2.5 transition-all cursor-pointer",
                            proposalData.id === v.code 
                              ? "bg-primary text-primary-foreground shadow-xs" 
                              : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Layers className="w-3 h-3" />
                          <span>{v.id}</span>
                          <span className="text-[10px] opacity-75 font-mono">({v.code})</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-muted/20 p-4 rounded-lg border border-border">
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">Trabajadores</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {proposalData.workersCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">Tipo de Cobro</span>
                    <span className="font-semibold text-foreground">{proposalData.paymentType}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">Inicio Est.</span>
                    <span className="font-semibold text-foreground">{format(proposalData.expectedStartDate, "dd/MM/yy")}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">Fin Est.</span>
                    <span className="font-semibold text-foreground">{format(proposalData.expectedEndDate, "dd/MM/yy")}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desglose Financiero en Bs</h4>
                  
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4 text-sm border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mano de Obra (Base):</span>
                      <span className="font-semibold text-foreground">Bs. {laborCost.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center border-l-2 border-primary/20 pl-3">
                      <span className="text-xs text-muted-foreground">+ Comisión Stratux ({((quoteBreakdown?.rule?.stratux || 0.3) * 100)}%):</span>
                      <span className="font-medium text-foreground">Bs. {stratuxCommission.toFixed(2)}</span>
                    </div>

                    {referrerCommission > 0 && (
                      <div className="flex justify-between items-center border-l-2 border-emerald-500/30 pl-3">
                        <span className="text-xs text-muted-foreground">+ Comisión Referidor {referrerName && referrerName !== "Directo" ? `(${referrerName})` : ""}:</span>
                        <span className="font-medium text-foreground">Bs. {referrerCommission.toFixed(2)}</span>
                      </div>
                    )}

                    {taxes > 0 && (
                      <div className="flex justify-between items-center border-l-2 border-amber-500/30 pl-3">
                        <span className="text-xs text-muted-foreground">+ Impuestos ({proposalData.taxPercentage}%):</span>
                        <span className="font-medium text-foreground">Bs. {taxes.toFixed(2)}</span>
                      </div>
                    )}

                    {thirdPartyLicenses > 0 && (
                      <div className="flex justify-between items-center border-l-2 border-blue-500/30 pl-3">
                        <span className="text-xs text-muted-foreground">+ Licencias Externas:</span>
                        <span className="font-medium text-foreground">Bs. {thirdPartyLicenses.toFixed(2)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center pt-1">
                      <span className="font-heading font-bold text-foreground text-base">Total Proyecto (Sin licencias):</span>
                      <span className="font-heading font-bold text-primary text-2xl">Bs. {totalProjectBs.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-muted/20 border-t border-border flex justify-between items-center">
                <Button variant="outline" onClick={handleReject} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  Rechazar
                </Button>
                <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Dar de alta Proyecto
                </Button>
              </CardFooter>
            </Card>
          </section>

        </div>
      </main>

      {/* Modal de Reconfirmación de Fechas al Dar de Alta */}
      <ApproveProposalModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        proposal={{
          id: proposalData.id,
          companyName: proposalData.projectName || leadData.companyName,
          projectName: proposalData.projectName,
          estimatedKickoffDate: proposalData.expectedStartDate,
          estimatedEndDate: proposalData.expectedEndDate,
          scale: proposalData.scale,
          amount: totalProjectBs
        }}
        onConfirm={handleConfirmApprove}
        isLoading={isApproving}
      />
    </div>
  );
}
