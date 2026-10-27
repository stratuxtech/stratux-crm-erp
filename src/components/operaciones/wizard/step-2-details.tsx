'use client';

import { useEffect, useState } from 'react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Layers } from "lucide-react";
import { useProposalStore } from '@/store/use-proposal-store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getProjects } from "@/actions/proyectos";

const PROJECT_TYPES = [
  { value: 'web', label: 'Web' },
  { value: 'automatizacion', label: 'automatización' },
  { value: 'consultoria_ux', label: 'Consultoria UX' },
  { value: 'soporte', label: 'Soporte' },
];

interface ProposalOption {
  id: string; // baseId
  companyName: string;
  projectName: string;
  dateStr: string;
  scale: string;
  amountStr: string;
  versionCount: number;
}

export function Step2Details() {
  const { 
    leadId,
    projectName, 
    is9010Completed, 
    date9010, 
    projectType, 
    workersCount, 
    isIteration, 
    originalProposalId,
    versionNumber,
    updateDetails 
  } = useProposalStore();

  const [availableProposals, setAvailableProposals] = useState<ProposalOption[]>([]);

  useEffect(() => {
    getProjects().then((projects) => {
      const proposals = projects.filter(p => p.status === 'Propuesta' || !p.status || p.status === 'Activo');
      const proposalMap = new Map<string, ProposalOption>();
      
      proposals.forEach(p => {
        const baseId = p.originalProposalId || p.id.replace(/-V\d+$/i, "");
        const allVers = proposals.filter(x => (x.originalProposalId || x.id.replace(/-V\d+$/i, "")) === baseId);
        const count = allVers.length;
        const dateObj = p.createdAt ? new Date(p.createdAt) : new Date();
        const dateStr = format(dateObj, "d 'de' MMM, yyyy", { locale: es });
        const amount = p.totalAmount || p.finalAmountPlusLicenses || 0;
        const amountStr = `Bs. ${Number(amount).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

        if (!proposalMap.has(baseId)) {
          proposalMap.set(baseId, {
            id: baseId,
            companyName: p.companyName || 'Sin Empresa',
            projectName: p.projectName || p.companyName || 'Propuesta',
            dateStr,
            scale: p.scale || 'XP',
            amountStr,
            versionCount: count
          });
        }
      });

      setAvailableProposals(Array.from(proposalMap.values()));
    });
  }, [leadId]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Columna Izquierda: Datos Básicos */}
        <div className="space-y-8">
          <Card className="bg-card">
            <CardContent className="p-6 space-y-6">
              
              {/* Nombre del Proyecto */}
              <div className="space-y-2 w-full">
                <Label htmlFor="projectName">Nombre del Proyecto <span className="text-destructive">*</span></Label>
                <Input 
                  id="projectName" 
                  className="w-full"
                  placeholder="Ej. Implementación Odoo 17 TechCorp" 
                  value={projectName}
                  onChange={(e) => updateDetails({ projectName: e.target.value })}
                />
              </div>

              {/* Tipo de Proyecto */}
              <div className="space-y-4 w-full">
                <Label>Tipo de Proyecto</Label>
                <div className="grid grid-cols-2 gap-4">
                  {PROJECT_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`project-type-${type.value}`} 
                        checked={projectType.includes(type.value)}
                        onCheckedChange={(checked) => {
                          const currentTypes = Array.isArray(projectType) ? projectType : [];
                          if (checked) {
                            updateDetails({ projectType: [...currentTypes, type.value] });
                          } else {
                            updateDetails({ projectType: currentTypes.filter(t => t !== type.value) });
                          }
                        }}
                      />
                      <label 
                        htmlFor={`project-type-${type.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Número de Trabajadores */}
              <div className="space-y-3 w-full">
                <Label>Número de Trabajadores Asignados</Label>
                <RadioGroup 
                  value={workersCount.toString()} 
                  onValueChange={(val) => updateDetails({ workersCount: parseInt(val) })}
                  className="flex flex-row flex-wrap gap-6 w-full"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="w1" />
                    <Label htmlFor="w1" className="font-normal cursor-pointer">1 Trabajador</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="w2" />
                    <Label htmlFor="w2" className="font-normal cursor-pointer">2 Trabajadores</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="w3" />
                    <Label htmlFor="w3" className="font-normal cursor-pointer">3 Trabajadores</Label>
                  </div>
                </RadioGroup>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Condiciones e Iteraciones */}
        <div className="space-y-8">
          
          <Card className="bg-card w-full">
            <CardContent className="p-6 space-y-6">
              {/* Toggle 90/10 */}
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-row items-center justify-between rounded-lg border border-border p-4 w-full">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Discovery 90/10 Realizado</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa si ya se hizo levantamiento de requerimientos con el cliente.
                    </p>
                  </div>
                  <Switch 
                    checked={is9010Completed}
                    onCheckedChange={(checked) => {
                      updateDetails({ is9010Completed: checked });
                      if (!checked) updateDetails({ date9010: null });
                    }}
                  />
                </div>

                {is9010Completed && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 w-full">
                    <Label>Fecha del Discovery 90/10</Label>
                    <Popover>
                      <PopoverTrigger render={<Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date9010 && "text-muted-foreground"
                          )}
                         />}>
  
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date9010 ? format(date9010, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                        
</PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date9010 || undefined}
                          onSelect={(date) => updateDetails({ date9010: date || null })}
                          
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card w-full">
            <CardContent className="p-6 space-y-6">
              {/* Toggle Iteración */}
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-row items-center justify-between rounded-lg border border-border p-4 w-full">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Es Iteración (V2, V3...)</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa si esta propuesta es una nueva versión de una cotización anterior.
                    </p>
                  </div>
                  <Switch 
                    checked={isIteration}
                    onCheckedChange={(checked) => {
                      const firstProp = availableProposals[0];
                      updateDetails({ 
                        isIteration: checked,
                        versionNumber: checked ? ((firstProp?.versionCount || 1) + 1) : 1,
                        originalProposalId: checked ? (originalProposalId || firstProp?.id || null) : null
                      });
                    }}
                  />
                </div>

                {isIteration && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 w-full p-4 rounded-lg bg-muted/20 border border-border">
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Seleccionar Propuesta Base</Label>
                      <Select 
                        value={originalProposalId || ""} 
                        onValueChange={(val) => {
                          const selected = availableProposals.find(p => p.id === val);
                          const nextVer = (selected?.versionCount || 1) + 1;
                          updateDetails({ 
                            originalProposalId: val,
                            versionNumber: nextVer
                          });
                        }}
                      >
                        <SelectTrigger className="w-full h-auto min-h-[48px] py-2 text-left">
                          {(() => {
                            const selected = availableProposals.find(p => p.id === originalProposalId);
                            if (!selected) {
                              return <SelectValue placeholder={availableProposals.length === 0 ? "No hay propuestas base registradas" : "Seleccione propuesta base"} />;
                            }
                            return (
                              <div className="flex flex-col text-left py-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground text-sm">{selected.companyName}</span>
                                  <span className="font-mono text-xs text-primary font-semibold">({selected.id})</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {selected.projectName} • {selected.dateStr} • {selected.amountStr}
                                </span>
                              </div>
                            );
                          })()}
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {availableProposals.map((prop) => (
                            <SelectItem key={prop.id} value={prop.id} className="py-2.5 cursor-pointer">
                              <div className="flex flex-col gap-1 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground text-sm">{prop.companyName}</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{prop.id}</span>
                                  <span className="text-xs font-semibold text-primary">Escala {prop.scale}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{prop.projectName}</span>
                                  <span>•</span>
                                  <span>{prop.dateStr}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{prop.amountStr}</span>
                                  <span>•</span>
                                  <span className="text-primary font-medium">{prop.versionCount} {prop.versionCount === 1 ? 'versión' : 'versiones'}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableProposals.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Aún no existen propuestas en el sistema para usar como base.
                        </p>
                      )}
                    </div>

                    {(() => {
                      const selected = availableProposals.find(p => p.id === originalProposalId);
                      if (!selected) return null;
                      return (
                        <div className="space-y-3 p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                              <Layers className="w-4 h-4 text-primary shrink-0" />
                              <span>Nueva Iteración: <strong className="text-primary">Versión V{versionNumber || 2}</strong></span>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs bg-background">
                              Base: {selected.id}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground pt-2 border-t border-primary/15">
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider font-semibold">Empresa</span>
                              <span className="font-medium text-foreground">{selected.companyName}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider font-semibold">Fecha Base</span>
                              <span className="font-medium text-foreground">{selected.dateStr}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider font-semibold">Monto Anterior</span>
                              <span className="font-medium text-foreground">{selected.amountStr}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider font-semibold">Historial</span>
                              <span className="font-medium text-foreground">{selected.versionCount} {selected.versionCount === 1 ? 'versión' : 'versiones previas'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
