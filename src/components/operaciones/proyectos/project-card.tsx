"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, Banknote, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type ProjectStatus = "Activo" | "Finalizado" | "Cancelado";

export interface ProjectCardProps {
  id: string; // PY-XXXX
  leadId: string; // LD-XXXX
  companyName: string;
  rating: number;
  scale: string;
  kickoffDate: Date;
  expectedEndDate: Date;
  totalAmount: number;
  status: ProjectStatus;
  metrics: {
    daysWorked?: number;
    daysOverdue?: number;
    pendingToCollect?: number;
    moneyLostDueToDelay?: number;
    uncollectedMoney?: number;
  };
  onCancel?: () => void;
  onFinish?: () => void;
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star 
          key={i} 
          className={`w-3.5 h-3.5 ${i < score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} 
        />
      ))}
    </div>
  );
}

export function ProjectCard({ 
  id,
  leadId,
  companyName, 
  rating, 
  scale, 
  kickoffDate, 
  expectedEndDate, 
  totalAmount, 
  status,
  metrics,
  onCancel,
  onFinish
}: ProjectCardProps) {
  const router = useRouter();

  const statusColor = 
    status === "Activo" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
    status === "Finalizado" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
    "bg-red-500/10 text-red-500 border-red-500/20";

  return (
    <Card className={`h-full flex flex-col transition-all hover:border-primary/50 overflow-hidden bg-card border-border shadow-sm group ${status === 'Cancelado' ? 'opacity-80' : ''}`}>
      {/* Cabecera */}
      <div className="flex justify-between items-center bg-muted/30 px-5 py-3 border-b border-border">
        <div className="flex flex-col">
          <h3 className="font-heading font-bold text-lg text-foreground truncate mr-2">{companyName}</h3>
          <StarRating score={rating} />
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary uppercase text-xs font-bold tracking-wider">
          Escala {scale}
        </Badge>
      </div>
      
      <CardContent className="p-5 flex flex-col flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-muted-foreground bg-background">{id}</Badge>
            <Badge variant="outline" className="font-mono text-muted-foreground bg-background">{leadId}</Badge>
          </div>
          <Badge variant="outline" className={statusColor}>{status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Inicio
            </span>
            <span className="font-medium text-foreground">{format(kickoffDate, "dd/MM/yyyy")}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Fin / Entrega
            </span>
            <span className="font-medium text-foreground">{format(expectedEndDate, "dd/MM/yyyy")}</span>
          </div>
        </div>

        <div className="h-px w-full bg-border/50 my-1" />

        {/* METRICS BLOCK CONDICIONAL */}
        <div className="grid grid-cols-1 gap-3 text-sm flex-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total del Proyecto</span>
            <span className="font-bold text-primary">Bs. {totalAmount.toLocaleString()}</span>
          </div>

          {status === "Activo" && (
            <div className="space-y-2 bg-muted/20 p-3 rounded border border-border/50">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Días trabajados</span>
                <span className="font-medium">{metrics.daysWorked || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Días fuera de plazo</span>
                <span className="font-medium text-amber-500">{metrics.daysOverdue || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-muted-foreground font-medium">Falta por cobrar</span>
                <span className="font-bold text-emerald-500">Bs. {metrics.pendingToCollect?.toLocaleString() || 0}</span>
              </div>
            </div>
          )}

          {status === "Finalizado" && (
            <div className="space-y-2 bg-blue-500/5 p-3 rounded border border-blue-500/20">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Días trabajados</span>
                <span className="font-medium">{metrics.daysWorked || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Días fuera de plazo</span>
                <span className="font-medium text-amber-500">{metrics.daysOverdue || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-500/20">
                <span className="text-muted-foreground font-medium flex items-center gap-1">Pérdida por plazo</span>
                <span className="font-bold text-destructive">Bs. {metrics.moneyLostDueToDelay?.toLocaleString() || 0}</span>
              </div>
            </div>
          )}

          {status === "Cancelado" && (
            <div className="space-y-2 bg-red-500/5 p-3 rounded border border-red-500/20">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Pérdida por plazo</span>
                <span className="font-medium text-destructive">Bs. {metrics.moneyLostDueToDelay?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-red-500/20">
                <span className="text-muted-foreground font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Dinero no cobrado</span>
                <span className="font-bold text-destructive">Bs. {metrics.uncollectedMoney?.toLocaleString() || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Acciones */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-auto h-12 items-end">
          {status === "Activo" && onCancel && onFinish && (
            <>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCancel(); }} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                Cancelar
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onFinish(); }} className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10">
                Finalizar
              </Button>
            </>
          )}
          
          <Button 
            size="sm" 
            variant="outline"
            className={status === "Activo" ? "ml-auto" : "w-full"}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/operaciones/proyectos/${id}`);
            }}
          >
            Ver Detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
