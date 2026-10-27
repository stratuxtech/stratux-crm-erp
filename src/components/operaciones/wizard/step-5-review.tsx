'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProposalStore } from '@/store/use-proposal-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, Layers } from 'lucide-react';
import { calculatePricingQuote } from '@/lib/pricing-calculator';
import { useScaleStore } from '@/store/use-scale-store';
import { getReferrers } from '@/actions/referidores';
import { Referrer } from '@/types/database';

export function Step5Review() {
  const store = useProposalStore();
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const { getScaleRules } = useScaleStore();

  useEffect(() => {
    getReferrers().then(data => setReferrers(data));
  }, []);

  const matchedRef = store.referralId ? referrers.find(r => r.id === store.referralId) : null;
  const referrerDisplayName = matchedRef 
    ? `${matchedRef.name}${matchedRef.nickname ? ` (${matchedRef.nickname})` : ''}` 
    : (store.referralId || 'Referidor');

  const formatDate = (date: Date | null, hasDate: boolean = true) => {
    if (!hasDate || !date) return 'No definida';
    return format(date, "PPP", { locale: es });
  };

  const formatCurrency = (val: number) => `Bs. ${val.toFixed(2)}`;

  // Centralized Math calculation
  const quote = calculatePricingQuote({
    laborCost: store.laborCost,
    hasLaborCost: store.hasLaborCost,
    hasReferral: store.hasReferral,
    hasTaxes: store.hasTaxes,
    taxPercentage: store.taxPercentage,
    thirdPartyLicenses: store.thirdPartyLicenses,
    customRules: getScaleRules(),
  });

  const versionTag = store.isIteration ? `Versión V${store.versionNumber || 2}` : "Versión V1";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BLOQUE IZQUIERDO: Datos de la Presentación */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4 border-b border-border bg-muted/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Datos de la Presentación y Técnicos
              </CardTitle>
              <Badge variant="secondary" className="font-semibold text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                <Layers className="w-3.5 h-3.5" />
                {versionTag}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-sm">
            
            <div className="space-y-4">
              <div className="flex flex-col mb-4 bg-muted/20 p-4 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Nombre del Proyecto:</span>
                <span className="font-heading font-bold text-foreground text-xl">{store.projectName || 'Sin nombre'}</span>
                <div className="text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{store.leadName}</span>
                  <span>•</span>
                  <span>ID: {store.leadId}</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Tipo de Proyecto:</span>
                <span className="font-medium text-foreground">{Array.isArray(store.projectType) ? store.projectType.join(', ') : store.projectType || 'No definido'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Número de Trabajadores:</span>
                <span className="font-medium text-foreground">{store.workersCount}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Escala de Proyecto:</span>
                <span className="font-semibold text-primary">Escala {quote.scale}</span>
              </div>

              {store.isIteration && (
                <div className="flex flex-col border-b border-border/50 pb-2 gap-1 mt-4">
                  <span className="text-muted-foreground font-semibold">Continuación de Propuesta:</span>
                  <span className="font-medium text-foreground bg-amber-500/10 text-amber-600 p-2 rounded-md border border-amber-500/20">
                    Este proyecto es una iteración de la propuesta base: <strong>{store.originalProposalId}</strong>
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-border/50 pb-2 mt-4">
                <span className="text-muted-foreground">Inicio del Proyecto:</span>
                <span className="font-medium text-foreground">{formatDate(store.startDate, store.hasStartDate)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Fin del Proyecto:</span>
                <span className="font-medium text-foreground">{formatDate(store.expectedEndDate, store.hasExpectedEndDate)}</span>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* BLOQUE DERECHO: Datos de la Cotización */}
        <Card className="border-border bg-card shadow-lg border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>
          <CardHeader className="pb-4 border-b border-border bg-primary/5">
            <CardTitle className="text-lg font-heading flex items-center gap-2 text-primary">
              <DollarSign className="w-5 h-5" />
              Datos de la Cotización
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-sm">
            
            {/* Flujo de caja escalonado */}
            <div className="space-y-4">
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mano de Obra:</span>
                <span className="font-medium text-foreground">{formatCurrency(quote.laborCostToUse)}</span>
              </div>

              <div className="flex flex-col gap-1 border-l-2 border-primary/20 pl-3 ml-1">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Comisión Stratux ({(quote.rule.stratux * 100)}%):</span>
                  <span>{formatCurrency(quote.stratuxCommission)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total con comisión Stratux:</span>
                  <span className="font-bold text-foreground">{formatCurrency(quote.montoStratux)}</span>
                </div>
              </div>

              {store.hasReferral && (
                <div className="flex flex-col gap-1 border-l-2 border-emerald-500/30 pl-3 ml-1 mt-2">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Comisión Referidor ({(quote.rule.ref * 100)}% - {referrerDisplayName}):</span>
                    <span>{formatCurrency(quote.referralCommission)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total con comisión Referidor:</span>
                    <span className="font-bold text-foreground">{formatCurrency(quote.montoTotal)}</span>
                  </div>
                </div>
              )}

              {store.hasTaxes && (
                <div className="flex flex-col gap-1 border-l-2 border-amber-500/30 pl-3 ml-1 mt-2">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Impuestos Retenidos ({store.taxPercentage}%):</span>
                    <span>{formatCurrency(quote.taxes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total con impuestos:</span>
                    <span className="font-bold text-foreground">{formatCurrency(quote.montoBruto)}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1 border-l-2 border-blue-500/30 pl-3 ml-1 mt-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Licencias de Terceros:</span>
                  <span>{formatCurrency(quote.thirdPartyLicenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total con licencias de terceros:</span>
                  <span className="font-bold text-foreground">{formatCurrency(quote.finalPrice)}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 mt-2 border-t border-border">
                <span className="text-muted-foreground font-semibold">Tipo de Cobro:</span>
                <span className="font-bold text-foreground">
                  {store.paymentType} {store.paymentType === 'Diferido en X meses' ? `(${store.deferredPaymentsCount} cuotas)` : ''}
                </span>
              </div>

            </div>

            {/* Note & Final Price */}
            <div className="pt-4 border-t border-border mt-6 space-y-4">
              <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-border">
                <strong>Nota:</strong> Las licencias de terceros no se agregan al monto final del proyecto ya que no es dinero que entra a Stratux.
              </p>

              <div className="flex flex-col gap-1 items-end pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sin licencias de terceros
                </span>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Monto Final del Proyecto</span>
                <span className="text-5xl font-heading font-bold text-primary mt-1">{formatCurrency(quote.totalSinLicencias)}</span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
