"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Rocket, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface ApproveProposalModalData {
  id: string;
  rawId?: string;
  companyName: string;
  projectName?: string;
  estimatedKickoffDate?: string | Date;
  estimatedEndDate?: string | Date;
  scale?: string;
  amount?: number;
}

interface ApproveProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ApproveProposalModalData | null;
  onConfirm: (id: string, kickoffDate: string, expectedEndDate: string) => Promise<void> | void;
  isLoading?: boolean;
}

export function ApproveProposalModal({
  isOpen,
  onClose,
  proposal,
  onConfirm,
  isLoading = false,
}: ApproveProposalModalProps) {
  const [kickoffDate, setKickoffDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (proposal) {
      const initialKickoff = proposal.estimatedKickoffDate
        ? new Date(proposal.estimatedKickoffDate)
        : new Date();
      
      const initialEnd = proposal.estimatedEndDate
        ? new Date(proposal.estimatedEndDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

      setKickoffDate(initialKickoff);
      setEndDate(initialEnd);
    }
  }, [proposal]);

  if (!proposal) return null;

  const originalKickoffStr = proposal.estimatedKickoffDate
    ? format(new Date(proposal.estimatedKickoffDate), "d 'de' MMMM, yyyy", { locale: es })
    : "Sin fecha previa";

  const originalEndStr = proposal.estimatedEndDate
    ? format(new Date(proposal.estimatedEndDate), "d 'de' MMMM, yyyy", { locale: es })
    : "Sin fecha previa";

  const daysDuration = kickoffDate && endDate ? differenceInDays(endDate, kickoffDate) : null;

  const handleConfirm = () => {
    if (!kickoffDate || !endDate) return;
    const targetId = proposal.rawId || proposal.id;
    onConfirm(targetId, kickoffDate.toISOString(), endDate.toISOString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] border-emerald-500/20 p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-500 font-semibold">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Rocket className="w-5 h-5 text-emerald-500" />
              </div>
              <DialogTitle className="text-xl font-heading font-bold text-foreground">
                Dar de alta el Proyecto
              </DialogTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs border-border/80">
              {proposal.id}
            </Badge>
          </div>
          
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Antes de comenzar el proyecto <strong className="text-foreground">{proposal.companyName}</strong>, ¿estas fechas siguen vigentes?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Revisión Fecha de Inicio */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Fecha de Inicio del Proyecto
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Estimada: <strong className="text-foreground">{originalKickoffStr}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 bg-background",
                        !kickoffDate && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {kickoffDate ? (
                    <span className="font-medium text-foreground">
                      {format(kickoffDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  ) : (
                    <span>Selecciona fecha de inicio</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={kickoffDate}
                    onSelect={setKickoffDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Revisión Fecha Fin */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Fecha de Finalización (Ideal)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Estimada: <strong className="text-foreground">{originalEndStr}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 bg-background",
                        !endDate && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {endDate ? (
                    <span className="font-medium text-foreground">
                      {format(endDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  ) : (
                    <span>Selecciona fecha de finalización</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Resumen de Duración */}
          {daysDuration !== null && (
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border text-xs",
              daysDuration > 0
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            )}>
              <div className="flex items-center gap-2">
                {daysDuration > 0 ? (
                  <Clock className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {daysDuration > 0
                    ? `Duración proyectada: ${daysDuration} días (~${Math.round(daysDuration / 7)} semanas)`
                    : "La fecha de fin debe ser posterior a la fecha de inicio."}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={isLoading || !kickoffDate || !endDate || (daysDuration !== null && daysDuration <= 0)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
          >
            <Rocket className="w-4 h-4 mr-2" />
            {isLoading ? "Iniciando..." : "Iniciar Proyecto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
