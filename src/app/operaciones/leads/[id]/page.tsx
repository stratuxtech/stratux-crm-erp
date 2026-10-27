"use client";

import React from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  User, 
  Briefcase, 
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Network
} from "lucide-react";

import { useLayoutStore } from "@/store/use-layout-store";
import { useProposalStore } from "@/store/use-proposal-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { useEffect, useState, use } from "react";
import { getLeads } from "@/actions/leads";
import { getProjects } from "@/actions/proyectos";
import { Lead } from "@/types/database";

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

export default function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const isSidebarCollapsed = useLayoutStore((state) => state.isSidebarCollapsed);
  const { setLeadId, updateDetails } = useProposalStore();
  const router = useRouter();
  const [lead, setLead] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([getLeads(), getProjects()]).then(([leads, projects]) => {
      const found = leads.find((l) => l.id === unwrappedParams.id);
      if (found) {
        const matchedProject = projects.find(p => p.leadId === found.id || p.companyName === found.companyName);

        setLead({
          id: found.id,
          companyName: found.companyName || "Sin Empresa",
          contactName: [found.firstName, found.lastName].filter(Boolean).join(" ") || found.contactName || "N/A",
          whatsapp: found.whatsapp || "N/A",
          email: found.email || "N/A",
          sector: found.rubro || "N/A",
          origin: found.source || "Google Sheets",
          budget: found.budget ? `$${found.budget.toLocaleString()}` : "No especificado",
          rating: found.leadRating || 3,
          businessProblems: found.businessProblems || "Sin observaciones registradas.",
          initialContactDate: found.leadDate ? new Date(found.leadDate) : null,
          meeting9010Date: matchedProject?.date9010 ? new Date(matchedProject.date9010) : null,
          presentationDate: matchedProject?.createdAt ? new Date(matchedProject.createdAt) : null
        });
      } else {
        setLead({
          id: unwrappedParams.id,
          companyName: "Lead no encontrado",
          contactName: "N/A",
          whatsapp: "N/A",
          email: "N/A",
          sector: "N/A",
          origin: "N/A",
          budget: "N/A",
          rating: 3,
          businessProblems: "No existe información para el ID especificado.",
          initialContactDate: null,
          meeting9010Date: null,
          presentationDate: null
        });
      }
    });
  }, [unwrappedParams.id]);

  const handleCreateProposal = () => {
    if (!lead) return;
    setLeadId(lead.id);
    updateDetails({ leadName: lead.companyName });
    router.push('/operaciones/propuestas/crear');
  };

  return (
    <div className="flex flex-col bg-background">
      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT PANEL: DATOS DE IDENTIDAD */}
          <section className="space-y-6">
            <Card className="border-border bg-card shadow-sm h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-primary" />
                      {lead?.companyName || "Cargando..."}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium mt-1 flex gap-2 items-center">
                      <Badge variant="secondary">{lead?.id}</Badge>
                      <Badge variant="outline">{lead?.sector}</Badge>
                    </CardDescription>
                  </div>
                  {lead && <StarRating score={lead.rating || 3} />}
                </div>
              </CardHeader>
              <Separator className="bg-border" />
              <CardContent className="pt-6 space-y-8 flex-1">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Datos de Contacto
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs mb-1">Nombre Completo</span>
                        <span className="font-medium text-foreground">{lead?.contactName}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> WhatsApp</span>
                        <span className="font-medium text-foreground">{lead?.whatsapp}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Correo Electrónico</span>
                        <span className="font-medium text-foreground">{lead?.email}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs mb-1">Presupuesto Estimado</span>
                          <span className="font-bold text-foreground">{lead?.budget}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs mb-1 flex items-center gap-1"><Network className="w-3 h-3"/> Origen</span>
                          <span className="font-medium text-foreground">{lead?.origin}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* RIGHT PANEL: DATOS CUALITATIVOS Y OPERATIVOS */}
          <section className="space-y-6">
            <Card className="border-border bg-card shadow-sm h-full flex flex-col">
              <CardContent className="p-6 space-y-8 flex-1 flex flex-col">
                
                {/* Bloque Cualitativo (El más importante) */}
                <div className="flex-1 space-y-4">
                  <h4 className="text-lg font-bold text-orange-500 flex items-center gap-2 mb-2 border-b border-border pb-2">
                    <AlertCircle className="w-5 h-5" />
                    Problemas Empresariales
                  </h4>
                  <div className="bg-orange-500/10 p-5 rounded-lg border border-orange-500/20">
                    <p className="text-base text-orange-400 leading-relaxed font-medium">
                      {lead?.businessProblems}
                    </p>
                  </div>
                </div>

                {/* Bloque de Fechas Clave */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Fechas Clave
                  </h4>
                  <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg text-sm text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs">Contacto Inicial</span>
                      <span className="font-medium text-foreground">{lead?.initialContactDate ? format(lead.initialContactDate, "dd/MM/yyyy") : "N/A"}</span>
                    </div>
                    <div className="flex flex-col gap-1 border-x border-border">
                      <span className="text-muted-foreground text-xs">Reunión 90/10</span>
                      <span className="font-medium text-foreground">{lead?.meeting9010Date ? format(lead.meeting9010Date, "dd/MM/yyyy") : "Pendiente"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs">Presentación</span>
                      <span className="font-medium text-foreground">{lead?.presentationDate ? format(lead.presentationDate, "dd/MM/yyyy") : "Pendiente"}</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </section>

        </div>
      </main>

      {/* STICKY FOOTER / DOWN BAR */}
      <footer className={`fixed bottom-0 right-0 z-30 bg-card border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 left-0 ${isSidebarCollapsed ? 'md:left-20' : 'md:left-64'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between sm:justify-end gap-4">
          <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto">
            Descartar Lead
          </Button>
          <Button onClick={handleCreateProposal} className="w-full sm:w-auto shadow-sm">
            Crear Propuesta
          </Button>
        </div>
      </footer>
    </div>
  );
}
