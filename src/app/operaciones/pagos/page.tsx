"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLayoutStore } from "@/store/use-layout-store";
import { CreditCard, Calendar, Filter, User, Building2, Tag, CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { getPayments } from "@/actions/finanzas";
import { Payment } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";

export default function PagosPage() {
  const router = useRouter();
  const { lastSyncTime } = useLayoutStore();
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    };
  });

  const [dbPayments, setDbPayments] = useState<Payment[]>([]);

  useEffect(() => {
    getPayments().then(data => {
      setDbPayments(data);
    });
  }, [lastSyncTime]);

  const paymentsByMonth = dbPayments.reduce((acc, payment) => {
    const dateObj = payment.date ? new Date(payment.date) : (payment.createdAt ? new Date(payment.createdAt) : new Date());
    const month = format(dateObj, "MMMM yyyy", { locale: es });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    
    if (!acc[capitalizedMonth]) {
      acc[capitalizedMonth] = [];
    }
    
    acc[capitalizedMonth].push({
      id: payment.id || "N/A",
      receiverName: payment.receiverName || "Desconocido",
      concept: payment.concept || "Sin concepto",
      date: format(dateObj, "dd/MM/yyyy"),
      method: payment.method || "No especificado",
      amount: payment.amount || 0,
      category: payment.category || "General",
      remainingCashflow: payment.remainingCashflow || 0,
      referrerId: payment.referrerId || null,
      referrerNotified: payment.referrerNotified || false
    });
    
    return acc;
  }, {} as Record<string, any[]>);

  const groups = Object.keys(paymentsByMonth).map(month => ({
    month,
    items: paymentsByMonth[month]
  }));

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 pb-12">

        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-destructive" />
              Pagos (Egresos & Pasivos)
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DateRangePicker date={date} setDate={setDate} />
          </div>
        </div>

        {/* TIMELINE DE PAGOS */}
        <div className="space-y-10">
          {groups.map((group, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-lg text-foreground/80 whitespace-nowrap">
                  {group.month}
                </h3>
                <Separator className="flex-1" />
              </div>

              <div className="flex flex-col gap-4">
                {group.items.map((item) => {
                  const isTaxPayment = item.category.toLowerCase().includes("impuesto");
                  const isReferralPayment = item.category.toLowerCase().includes("referid");

                  return (
                    <Card key={item.id} className="w-full hover:border-destructive/40 transition-colors shadow-sm overflow-hidden flex flex-col">
                      {/* A. NIVEL PRINCIPAL (MAIN ROW) */}
                      <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card">

                        {/* Izquierda: Contexto */}
                        <div className="w-full md:w-1/3 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs bg-muted/30 text-muted-foreground">
                              {item.id}
                            </Badge>
                            {isTaxPayment && (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] uppercase font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Facturación Tercerizada
                              </Badge>
                            )}
                          </div>
                          <span className="font-bold text-foreground text-base truncate flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.receiverName}</span>
                          </span>
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
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-md">
                              {item.method}
                            </span>
                          </div>
                        </div>

                        {/* Derecha: Financiero */}
                        <div className="w-full md:w-1/3 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-2">
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {item.category}
                          </Badge>
                          <span className="text-xl font-bold text-destructive flex items-center gap-1.5 whitespace-nowrap">
                            - Bs. {item.amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* B. NIVEL SECUNDARIO (SUB-ROW) */}
                      {item.referrerId && (
                        <div className="bg-muted/30 px-4 py-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-foreground/80">
                            <span className="text-muted-foreground">Pago automático a referidor:</span>
                            <span className="font-mono font-semibold">{item.referrerId}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            {item.referrerNotified ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Notificado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                <Circle className="w-3 h-3" />
                                Pendiente Notificación
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <EmptyState
              icon={CreditCard}
              title="No hay egresos ni pasivos registrados"
              description="Los pagos se crean automáticamente con cada cobro (retención impositiva para tercerizador y comisiones de referidores), o manualmente para costos de equipo y licencias."
              actionLabel="Registrar Pago Manual"
              actionHref="/operaciones/pagos/crear"
              secondaryLabel="Ver Resumen de Finanzas"
              onSecondaryAction={() => router.push("/finanzas/resumen")}
              size="lg"
            />
          )}
        </div>
      </main>
    </div>
  );
}
