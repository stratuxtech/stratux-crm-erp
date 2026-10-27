"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLayoutStore } from "@/store/use-layout-store";
import { Banknote, Calendar, Filter, ArrowRight, Wallet, Percent, Users, Coins, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { getCollections } from "@/actions/finanzas";
import { Collection } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";

export default function CobrosPage() {
  const { lastSyncTime } = useLayoutStore();
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    };
  });
  
  const [dbCollections, setDbCollections] = useState<Collection[]>([]);

  useEffect(() => {
    getCollections().then(data => {
      setDbCollections(data);
    });
  }, [lastSyncTime]);

  const collectionsByMonth = dbCollections.reduce((acc, collection) => {
    const dateObj = collection.createdAt ? new Date(collection.createdAt) : new Date();
    const month = format(dateObj, "MMMM yyyy", { locale: es });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    
    if (!acc[capitalizedMonth]) {
      acc[capitalizedMonth] = [];
    }
    
    const taxPct = collection.taxPercentage 
      ? (collection.taxPercentage > 1 ? collection.taxPercentage : collection.taxPercentage * 100) 
      : 0;

    // Map with graceful degradation
    acc[capitalizedMonth].push({
      id: collection.id || "N/A",
      projectId: collection.projectId || "N/A",
      scale: collection.scale || "XP",
      concept: collection.concept || "Sin concepto",
      date: format(dateObj, "dd/MM/yyyy"),
      method: collection.method || "No especificado",
      grossAmount: collection.grossAmount || 0,
      taxPercentage: taxPct,
      referrerId: collection.referrerId || null,
      referrerCommission: collection.referrerCommission || 0,
      laborCost: collection.laborCost || 0,
      stratuxCommission: collection.stratuxCommission || 0,
      netAmount: collection.netAmount || 0
    });
    
    return acc;
  }, {} as Record<string, any[]>);

  const groups = Object.keys(collectionsByMonth).map(month => ({
    month,
    items: collectionsByMonth[month]
  }));

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 pb-12">

        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <Banknote className="w-8 h-8 text-emerald-600" />
              Cobros
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/operaciones/cobros/crear">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm font-semibold">
                <PlusCircle className="w-4 h-4" />
                Registrar Cobro
              </Button>
            </Link>
            <DateRangePicker date={date} setDate={setDate} />
          </div>
        </div>

        {/* TIMELINE DE COBROS */}
        <div className="space-y-10">
          {groups.map((group, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-lg text-foreground/80 whitespace-nowrap">
                  {group.month}
                </h3>
                <Separator className="flex-1" />
              </div>

              <div className="flex flex-col gap-5">
                {group.items.map((item) => {
                  const hasTaxes = item.taxPercentage > 0;
                  const taxAmount = item.grossAmount * (item.taxPercentage / 100);
                  const postTaxAmount = item.grossAmount - taxAmount;

                  return (
                    <Card key={item.id} className="w-full hover:border-emerald-500/40 transition-colors shadow-sm overflow-hidden flex flex-col">
                      {/* A. NIVEL PRINCIPAL (MAIN ROW) */}
                      <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card">

                        {/* Izquierda: Contexto */}
                        <div className="w-full md:w-1/3 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs bg-muted/30 text-muted-foreground">
                              {item.id}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-xs bg-primary/5 border-primary/20 text-primary">
                              {item.projectId}
                            </Badge>
                            <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold text-[10px] tracking-widest px-2 uppercase">
                              Escala {item.scale}
                            </Badge>
                          </div>
                        </div>

                        {/* Centro: Operativa */}
                        <div className="w-full md:w-1/3 flex flex-col md:items-center gap-1 border-y md:border-y-0 md:border-x border-border py-2 md:py-0">
                          <span className="text-sm font-semibold text-foreground text-center line-clamp-2">
                            {item.concept}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {item.date}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 bg-muted/50 rounded-md text-foreground">
                              {item.method}
                            </span>
                          </div>
                        </div>

                        {/* Derecha: Monto Final Stratux */}
                        <div className="w-full md:w-1/3 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-1">
                          <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">Ingreso Neto Stratux</span>
                          <span className="text-2xl font-bold text-emerald-600 flex items-center gap-1.5 whitespace-nowrap">
                            + {item.netAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })} <span className="text-sm">Bs</span>
                          </span>
                        </div>
                      </div>

                      {/* B. NIVEL SECUNDARIO (SUB-ROW DESGLOSE) */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/20 px-4 py-3 border-t border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">

                          {/* Paso 1: Monto Bruto */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                              <Wallet className="w-3 h-3" /> Monto Bruto
                            </span>
                            <span className="font-semibold text-foreground text-sm">Bs. {item.grossAmount.toLocaleString()}</span>
                          </div>

                          {/* Paso 2: Impuestos */}
                          <div className="flex flex-col gap-1.5 border-l border-border/50 pl-4">
                            <span className="text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                              <Percent className="w-3 h-3" /> Retención Impuestos ({item.taxPercentage}%)
                            </span>
                            {hasTaxes ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-amber-600 font-medium">- Bs. {taxAmount.toLocaleString()}</span>
                                <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3" /> Post: <span className="font-semibold text-foreground">Bs. {postTaxAmount.toLocaleString()}</span>
                                </span>
                              </div>
                            ) : (
                              <span className="font-semibold text-foreground text-sm">Exento / 0 Bs</span>
                            )}
                          </div>

                          {/* Paso 3: Referidor */}
                          <div className="flex flex-col gap-1.5 border-l border-border/50 pl-4">
                            <span className="text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                              <Users className="w-3 h-3" /> Referidor
                            </span>
                            {item.referrerId ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-muted-foreground">{item.referrerId}</span>
                                <span className="text-destructive font-medium">- Bs. {item.referrerCommission?.toLocaleString()}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">No aplica</span>
                            )}
                          </div>

                          {/* Paso 4: Operativa Stratux */}
                          <div className="flex flex-col gap-1.5 border-l border-border/50 pl-4">
                            <span className="text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                              <Coins className="w-3 h-3" /> Operativa Stratux
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-destructive font-medium">Mano Obra: - Bs. {item.laborCost.toLocaleString()}</span>
                              <span className="text-emerald-600 font-semibold">Margen: + Bs. {item.stratuxCommission.toLocaleString()}</span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <EmptyState
              icon={Banknote}
              title="No hay cobros registrados en el flujo financiero"
              description="Los cobros registrados impactan en tiempo real el ingreso neto de Stratux y desfragmentan automáticamente los egresos por retenciones impositivas y comisiones."
              actionLabel="Registrar Nuevo Cobro"
              actionHref="/operaciones/cobros/crear"
              size="lg"
            />
          )}
        </div>
      </main>
    </div>
  );
}
