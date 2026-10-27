'use client';

import { useState, useEffect } from 'react';
import { useProposalStore } from '@/store/use-proposal-store';
import { useLayoutStore } from '@/store/use-layout-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Loader2, Users, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getLeads, syncLeads } from '@/actions/leads';
import { getProjects } from '@/actions/proyectos';
import { Lead } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface UILead {
  id: string;
  empresa: string;
  fecha: string;
  contacto: string;
  rubro: string;
  whatsapp: string;
  email: string;
  problema: string;
  score: number;
}

interface LeadsGroup {
  month: string;
  leads: UILead[];
}

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

function LeadCard({
  lead,
  onSelect
}: {
  lead: UILead;
  onSelect: (leadId: string, companyName: string) => void;
}) {
  return (
    <Card className="hover:border-primary/50 transition-colors h-full flex flex-col justify-between">
      <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-heading font-bold text-lg text-foreground line-clamp-1">{lead.empresa}</h3>
            <div className="flex items-center text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < lead.score ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
                    }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p><span className="text-foreground font-medium">Rubro:</span> {lead.rubro}</p>
            <p><span className="text-foreground font-medium">Contacto:</span> {lead.contacto}</p>
            <p><span className="text-foreground font-medium">WhatsApp:</span> {lead.whatsapp}</p>
            <p><span className="text-foreground font-medium">Email:</span> {lead.email}</p>
          </div>

          <div className="mt-3 p-2.5 rounded bg-muted/40 text-xs">
            <span className="font-semibold text-foreground block mb-1">Problema detectado:</span>
            <p className="text-muted-foreground line-clamp-2">{lead.problema}</p>
          </div>
        </div>

        <Button
          onClick={() => onSelect(lead.id, lead.empresa)}
          className="w-full font-semibold"
          size="sm"
        >
          Crear Propuesta
        </Button>
      </CardContent>
    </Card>
  );
}

export function Step1Lead({ onNext }: { onNext?: () => void }) {
  const { leadId, setLeadId, updateDetails } = useProposalStore();
  const { lastSyncTime, triggerSync } = useLayoutStore();
  const router = useRouter();
  const [leadsByMonth, setLeadsByMonth] = useState<LeadsGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchLeads = async () => {
    try {
      const [data, projects] = await Promise.all([getLeads(), getProjects()]);

      // Leads that already have a proposal or project (not cancelled)
      const leadsWithProposals = new Set(
        projects
          .filter(p => p.status !== "Cancelado")
          .map(p => p.leadId)
          .filter(Boolean)
      );

      // Only show leads without an active proposal/project
      const availableLeads = data.filter(lead => !leadsWithProposals.has(lead.id));

      // Transform and group by month
      const grouped = availableLeads.reduce((acc, lead: Lead) => {
        const dateObj = lead.leadDate || lead.createdAt ? new Date(lead.leadDate || lead.createdAt!) : new Date();
        const month = format(dateObj, "MMMM yyyy", { locale: es });
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

        if (!acc[capitalizedMonth]) {
          acc[capitalizedMonth] = [];
        }

        acc[capitalizedMonth].push({
          id: lead.id,
          empresa: lead.companyName || "Sin Empresa",
          fecha: format(dateObj, "EEEE d 'de' MMMM 'del' yyyy", { locale: es }),
          contacto: lead.firstName ? `${lead.firstName} ${lead.lastName || ''}` : lead.contactName || "Sin Contacto",
          rubro: lead.rubro || "General",
          whatsapp: lead.whatsapp || "Sin dato",
          email: lead.email || "Sin correo",
          problema: lead.businessProblems || "No especificado",
          score: lead.leadRating || 3
        });

        return acc;
      }, {} as Record<string, UILead[]>);

      const monthsArray: LeadsGroup[] = Object.keys(grouped).map(month => ({
        month,
        leads: grouped[month]
      }));

      setLeadsByMonth(monthsArray);
    } catch (error) {
      console.error("Failed to load leads", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [lastSyncTime]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await syncLeads();
      if (res.success) {
        toast.success("Sincronización completada", { description: `${res.count} leads cargados.` });
        triggerSync();
      } else {
        toast.info("Sin registros en Sheets", { description: "La hoja de cálculo está vacía o no tiene leads nuevos." });
      }
    } catch (e) {
      toast.error("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelect = (id: string, empresa: string) => {
    setLeadId(id);
    updateDetails({ leadName: empresa });
    onNext?.(); // Automatically advance on select
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-48 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando prospectos comerciales...</p>
      </div>
    );
  }

  if (leadsByMonth.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <EmptyState
          icon={Users}
          title="No hay leads registrados en el sistema"
          description="Para cotizar y emitir una propuesta, debes seleccionar un lead de la base de datos comercial. Puedes sincronizar los datos con Google Sheets o registrar clientes en el directorio."
          actionLabel={isSyncing ? "Sincronizando..." : "Sincronizar con Google Sheets"}
          onAction={handleSync}
          secondaryLabel="Ver Directorio de Clientes"
          onSecondaryAction={() => router.push("/directorio/clientes")}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">

      {leadsByMonth.map((group) => (
        <div key={group.month}>
          <h2 className="text-xl font-heading font-bold text-foreground/80 mb-6 border-b border-border pb-2">
            {group.month}
          </h2>

          <Carousel
            opts={{
              align: "start",
              dragFree: true
            }}
            className="w-full max-w-full"
          >
            <CarouselContent className="-ml-4">
              {group.leads.map((lead: UILead) => (
                <CarouselItem key={lead.id} className="pl-4 basis-[85%] sm:basis-[350px] lg:basis-[400px]">
                  <Card
                    className={`h-full flex flex-col transition-all hover:border-primary/50 overflow-hidden ${leadId === lead.id ? 'border-primary ring-1 ring-primary shadow-md bg-primary/5' : 'bg-card'
                      }`}
                  >
                    {/* Cabecera */}
                    <div className="flex justify-between items-center bg-muted/30 px-5 py-3 border-b border-border">
                      <h3 className="font-heading font-bold text-lg text-foreground truncate mr-2">{lead.empresa}</h3>
                      <StarRating score={lead.score} />
                    </div>

                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="grid grid-cols-1 gap-4 mb-4">
                        {/* Datos compactos */}
                        <div className="text-sm space-y-1">
                          <div className="text-muted-foreground font-medium mb-2">{lead.fecha}</div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">Contacto:</span>
                            <span>{lead.contacto}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">Rubro:</span>
                            <span>{lead.rubro}</span>
                          </div>
                        </div>

                        <div className="h-px bg-border my-1" />

                        {/* Contacto compacto */}
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">WhatsApp:</span>
                            <span>{lead.whatsapp}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">Email:</span>
                            <span className="truncate max-w-[200px]">{lead.email}</span>
                          </div>
                        </div>

                        <div className="h-px bg-border my-1" />

                        {/* Problema detectado */}
                        <div className="text-sm">
                          <span className="font-semibold text-foreground block mb-1">Problema detectado:</span>
                          <p className="text-muted-foreground text-xs line-clamp-3">
                            {lead.problema}
                          </p>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/operaciones/leads/${lead.id}`);
                          }}
                        >
                          Ver
                        </Button>
                        <Button onClick={() => handleSelect(lead.id, lead.empresa)} variant={leadId === lead.id ? "default" : "secondary"}>
                          Seleccionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      ))}
    </div>
  );
}
