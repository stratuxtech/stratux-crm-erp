'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useProposalStore } from '@/store/use-proposal-store';
import { Step1Lead } from './step-1-lead';
import { Step2Details } from './step-2-details';
import { Step3Quote } from './step-3-quote';
import { Step4Dates } from './step-4-dates';
import { Step5Review } from './step-5-review';
import { DownBar } from '@/components/layout/DownBar';
import { addProject, getProjects } from "@/actions/proyectos";
import { getLeads, addLead } from "@/actions/leads";
import { calculatePricingQuote } from '@/lib/pricing-calculator';
import { useLayoutStore } from '@/store/use-layout-store';
import { useScaleStore } from '@/store/use-scale-store';
import { UserRoundPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = [
  { id: 1, title: 'Lead' },
  { id: 2, title: 'Detalles' },
  { id: 3, title: 'Cotización' },
  { id: 4, title: 'Fechas' },
  { id: 5, title: 'Revisión' }
];

export function ProposalWizard() {
  const store = useProposalStore();
  const {
    leadId, leadName, projectName, hasLaborCost, laborCost, presentationDate,
    hasStartDate, startDate, hasExpectedEndDate, expectedEndDate, fromSimulator,
    is9010Completed, date9010, projectType, workersCount, hasReferral, referralId,
    hasTaxes, taxPercentage, thirdPartyLicenses, paymentType, isIteration,
    originalProposalId, versionNumber,
    reset: resetStore
  } = store;

  const [currentStep, setCurrentStep] = useState(leadId ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { triggerSync } = useLayoutStore();

  // Modal para registrar Lead directamente
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    empresa: "",
    nombre: "",
    apellido: "",
    rubro: "",
    whatsapp: "",
    email: "",
    presupuesto: "",
    calificacion: "3",
    problemas: "",
  });

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.empresa.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }

    setIsCreatingLead(true);
    try {
      const res = await addLead({
        companyName: leadForm.empresa.trim(),
        firstName: leadForm.nombre.trim() || undefined,
        lastName: leadForm.apellido.trim() || undefined,
        rubro: leadForm.rubro.trim() || undefined,
        whatsapp: leadForm.whatsapp.trim() || undefined,
        email: leadForm.email.trim() || undefined,
        budget: leadForm.presupuesto ? Number(leadForm.presupuesto) : undefined,
        leadRating: leadForm.calificacion ? Number(leadForm.calificacion) : 3,
        businessProblems: leadForm.problemas.trim() || undefined,
        leadDate: new Date().toISOString(),
      });

      if (res.success && res.lead) {
        toast.success(`Lead ${res.lead.id} registrado con éxito`, {
          description: "Seleccionado automáticamente para la propuesta.",
        });
        setIsLeadModalOpen(false);
        setLeadForm({
          empresa: "",
          nombre: "",
          apellido: "",
          rubro: "",
          whatsapp: "",
          email: "",
          presupuesto: "",
          calificacion: "3",
          problemas: "",
        });
        store.setLeadId(res.lead.id);
        store.updateDetails({ 
          leadName: res.lead.companyName,
          projectName: `Propuesta ${res.lead.companyName}`
        });
        triggerSync();
        setCurrentStep(2); // Avanza directamente al paso 2
      } else {
        toast.error("Error al registrar lead", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error inesperado", { description: err.message });
    } finally {
      setIsCreatingLead(false);
    }
  };

  const paramLeadId = searchParams.get('leadId');
  const paramBaseProposalId = searchParams.get('baseProposalId') || searchParams.get('proposalId');
  const paramVersion = searchParams.get('nextVersion') || searchParams.get('version');

  useEffect(() => {
    if (paramLeadId || paramBaseProposalId) {
      Promise.all([getLeads(), getProjects()]).then(([leads, projects]) => {
        const foundProject = paramBaseProposalId 
          ? projects.find(p => p.id === paramBaseProposalId || p.originalProposalId === paramBaseProposalId)
          : null;
        const targetLeadId = paramLeadId || foundProject?.leadId;
        const foundLead = targetLeadId ? leads.find(l => l.id === targetLeadId) : null;

        if (foundLead || foundProject) {
          const leadCompany = foundLead?.companyName || foundProject?.companyName || "Empresa";
          const baseId = paramBaseProposalId || foundProject?.id || null;
          const nextVer = paramVersion ? Number(paramVersion) : (baseId ? 2 : 1);

          store.setLeadId(targetLeadId || null);
          store.updateDetails({
            leadName: leadCompany,
            projectName: foundProject?.projectName || `Propuesta ${leadCompany}`,
            isIteration: !!baseId,
            originalProposalId: baseId,
            versionNumber: nextVer,
            workersCount: foundProject?.workersCount || 1,
            projectType: Array.isArray(foundProject?.projectType) ? foundProject.projectType : [foundProject?.projectType || "Web"],
          });

          if (foundProject) {
            store.updateQuote({
              laborCost: foundProject.laborCost || 0,
              hasLaborCost: (foundProject.laborCost || 0) > 0,
              hasReferral: !!foundProject.referrerId,
              referralId: foundProject.referrerId || null,
              hasTaxes: (foundProject.taxPercentage || 0) > 0,
              taxPercentage: foundProject.taxPercentage || 27,
              thirdPartyLicenses: foundProject.licensesAmount || 0,
              paymentType: (foundProject.paymentType as any) || "50%/50%",
            });
          }

          setCurrentStep(2);
        }
      });
    }
  }, [paramLeadId, paramBaseProposalId, paramVersion]);

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    };
  });

  const nextStep = () => {
    setCurrentStep((prev) => {
      if (prev === 2 && fromSimulator) return 4;
      return Math.min(prev + 1, 5);
    });
  };

  const prevStep = () => {
    setCurrentStep((prev) => {
      if (prev === 4 && fromSimulator) return 2;
      return Math.max(prev - 1, 1);
    });
  };

  const handleCancel = () => {
    resetStore();
    setCurrentStep(1);
    router.push('/operaciones/propuestas');
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const activeRules = useScaleStore.getState().getScaleRules();
      const quote = calculatePricingQuote({
        laborCost,
        hasLaborCost,
        hasReferral,
        hasTaxes,
        taxPercentage,
        thirdPartyLicenses,
        customRules: activeRules,
      });

      const versionNum = store.isIteration ? (store.versionNumber || 2) : 1;
      const versionCode = `V${versionNum}`;
      
      let finalId = `PR-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
      if (store.isIteration && store.originalProposalId) {
        finalId = `${store.originalProposalId}-${versionCode}`;
      }

      const res = await addProject({
        id: finalId,
        originalProposalId: store.isIteration ? (store.originalProposalId || undefined) : undefined,
        versionNumber: versionNum,
        version: versionCode,
        leadId: leadId || undefined,
        companyName: leadName || projectName || "Empresa Sin Nombre",
        projectName: projectName || undefined,
        date9010: date9010 ? date9010.toISOString() : undefined,
        presentationDone: !!presentationDate,
        projectType: Array.isArray(projectType) ? projectType.join(", ") : projectType || "Web",
        workersCount: workersCount || 1,
        taxesIncluded: hasTaxes,
        paymentType: paymentType || "50%/50%",
        laborCost: quote.laborCostToUse,
        scale: quote.scale,
        stratuxCommission: quote.stratuxCommission,
        referrerId: hasReferral && referralId && referralId !== 'ninguno' ? referralId : undefined,
        referrerCommission: quote.referralCommission,
        taxPercentage: hasTaxes ? taxPercentage : 0,
        finalStratuxAmount: quote.montoStratux,
        licensesAmount: quote.thirdPartyLicenses,
        finalAmountPlusLicenses: quote.finalPrice,
        totalAmount: quote.totalSinLicencias,
        status: "Propuesta",
        kickoffDate: startDate ? startDate.toISOString() : undefined,
        expectedEndDate: expectedEndDate ? expectedEndDate.toISOString() : undefined,
        createdAt: new Date().toISOString(),
      });

      if (!res.success) {
        throw new Error(res.error || "Validation failed");
      }
      
      toast.success(store.isIteration ? `Versión ${versionCode} creada exitosamente` : "Propuesta creada exitosamente", {
        description: `Registrada con escala ${quote.scale} y monto de Bs. ${quote.totalSinLicencias.toFixed(2)}.`,
      });
      resetStore();
      setCurrentStep(1);
      router.push('/operaciones/propuestas');
    } catch (error: any) {
      console.error(error);
      toast.error("Error al guardar propuesta en Google Sheets", {
        description: error?.message || "No se pudo sincronizar con Google Sheets. Verifica la conexión.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return !leadId;
    if (currentStep === 2) return projectName.trim() === '';
    if (currentStep === 3) {
      if (hasLaborCost && laborCost <= 0) return true;
      if (hasReferral && (!referralId || referralId === 'ninguno')) return true;
    }
    if (currentStep === 4) {
      if (!presentationDate) return true;
      if (hasStartDate && !startDate) return true;
      if (hasExpectedEndDate && !expectedEndDate) return true;
    }
    return false;
  };

  return (
    <div className="pb-24">
      {/* Contextual Top Bar - No visual card styling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col text-center md:text-left gap-1">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Crear propuesta</h1>
          <p className="text-muted-foreground font-medium">
            Paso {currentStep}: {STEPS.find(s => s.id === currentStep)?.title}
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-wrap items-center gap-3 justify-center md:justify-end">
          <Button
            onClick={() => setIsLeadModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground font-semibold shadow-sm"
          >
            <UserRoundPlus className="w-4 h-4" />
            + Registrar Lead
          </Button>
          <DateRangePicker date={date} setDate={setDate} />
        </div>
      </div>

      {/* Render Steps */}
      <div className="mt-8">
        {currentStep === 1 && <Step1Lead onNext={nextStep} />}
        {currentStep === 2 && <Step2Details />}
        {currentStep === 3 && <Step3Quote />}
        {currentStep === 4 && <Step4Dates />}
        {currentStep === 5 && <Step5Review />}
      </div>

      {/* Sticky Bottom Bar */}
      <DownBar
        currentStep={currentStep}
        steps={STEPS}
        isNextDisabled={isNextDisabled() || isSubmitting}
        isSaveDisabled={isSubmitting}
        isLoading={isSubmitting}
        onNext={currentStep === 5 ? handleSave : nextStep}
        onPrev={isSubmitting ? undefined : prevStep}
        onSave={handleSave}
        showSave={currentStep === 5}
        showNext={currentStep < 5}
      />

      {/* MODAL PARA REGISTRAR LEAD DIRECTO */}
      <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <UserRoundPlus className="w-5 h-5 text-primary" />
              Registrar Nuevo Lead
            </DialogTitle>
            <DialogDescription>
              Registra un nuevo contacto comercial. Se seleccionará automáticamente para continuar con la cotización de la propuesta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="wiz-lead-empresa" className="text-xs font-semibold">
                  Empresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="wiz-lead-empresa"
                  placeholder="Ej. TechCorp Bolivia"
                  required
                  value={leadForm.empresa}
                  onChange={(e) => setLeadForm({ ...leadForm, empresa: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wiz-lead-nombre" className="text-xs font-semibold">Nombre</Label>
                  <Input
                    id="wiz-lead-nombre"
                    placeholder="Ej. Carlos"
                    value={leadForm.nombre}
                    onChange={(e) => setLeadForm({ ...leadForm, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="wiz-lead-apellido" className="text-xs font-semibold">Apellido</Label>
                  <Input
                    id="wiz-lead-apellido"
                    placeholder="Ej. Mendez"
                    value={leadForm.apellido}
                    onChange={(e) => setLeadForm({ ...leadForm, apellido: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wiz-lead-rubro" className="text-xs font-semibold">Rubro</Label>
                  <Input
                    id="wiz-lead-rubro"
                    placeholder="Ej. Tecnología, Retail..."
                    value={leadForm.rubro}
                    onChange={(e) => setLeadForm({ ...leadForm, rubro: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="wiz-lead-rating" className="text-xs font-semibold">Calificación (1-5)</Label>
                  <Select
                    value={leadForm.calificacion}
                    onValueChange={(val) => setLeadForm({ ...leadForm, calificacion: val || "3" })}
                  >
                    <SelectTrigger id="wiz-lead-rating">
                      <SelectValue placeholder="Calificación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">⭐⭐⭐⭐⭐ (5 - Excelente)</SelectItem>
                      <SelectItem value="4">⭐⭐⭐⭐ (4 - Bueno)</SelectItem>
                      <SelectItem value="3">⭐⭐⭐ (3 - Regular)</SelectItem>
                      <SelectItem value="2">⭐⭐ (2 - Bajo)</SelectItem>
                      <SelectItem value="1">⭐ (1 - Muy bajo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wiz-lead-whatsapp" className="text-xs font-semibold">WhatsApp / Teléfono</Label>
                  <Input
                    id="wiz-lead-whatsapp"
                    placeholder="Ej. 59177712345"
                    value={leadForm.whatsapp}
                    onChange={(e) => setLeadForm({ ...leadForm, whatsapp: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="wiz-lead-email" className="text-xs font-semibold">Correo Electrónico</Label>
                  <Input
                    id="wiz-lead-email"
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="wiz-lead-presupuesto" className="text-xs font-semibold">Presupuesto Estimado ($ USD)</Label>
                <Input
                  id="wiz-lead-presupuesto"
                  type="number"
                  placeholder="Ej. 5000"
                  value={leadForm.presupuesto}
                  onChange={(e) => setLeadForm({ ...leadForm, presupuesto: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="wiz-lead-problemas" className="text-xs font-semibold">Problemas Empresariales / Necesidades</Label>
                <Textarea
                  id="wiz-lead-problemas"
                  rows={3}
                  placeholder="Describe los requerimientos comerciales del cliente..."
                  value={leadForm.problemas}
                  onChange={(e) => setLeadForm({ ...leadForm, problemas: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsLeadModalOpen(false)} disabled={isCreatingLead}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingLead} className="gap-2 bg-primary text-primary-foreground">
                {isCreatingLead && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCreatingLead ? "Guardando Lead..." : "Registrar y Continuar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
