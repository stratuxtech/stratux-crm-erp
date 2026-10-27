'use client';

import { useProposalStore, ScaleType, PaymentType } from '@/store/use-proposal-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getReferrers } from '@/actions/referidores';
import { Referrer } from '@/types/database';
import { 
  getComputedScale, 
  calculatePricingQuote, 
  getTaxBreakdownDescription, 
  SCALE_RULES 
} from '@/lib/pricing-calculator';
import { useScaleStore } from '@/store/use-scale-store';

export function Step3Quote() {
  const { 
    hasLaborCost, laborCost, 
    hasReferral, referralId, 
    hasTaxes, taxPercentage, 
    thirdPartyLicenses, 
    paymentType, deferredPaymentsCount,
    updateQuote 
  } = useProposalStore();

  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const { scaleRules, config, loadConfig } = useScaleStore();

  useEffect(() => {
    loadConfig();
    getReferrers().then(data => setReferrers(data));
  }, []);

  const laborCostToUse = hasLaborCost ? Math.max(0, Number(laborCost) || 0) : 0;
  const computedScale = getComputedScale(laborCostToUse, scaleRules);
  const previousScaleRef = useRef<ScaleType>(computedScale);

  // Sync computed scale and suggested taxes to store only when scale actually changes
  useEffect(() => {
    const prevScale = previousScaleRef.current;
    if (prevScale !== computedScale) {
      previousScaleRef.current = computedScale;
      const defaultTaxForScale = scaleRules[computedScale].defaultTax;
      updateQuote({ 
        scale: computedScale,
        taxPercentage: defaultTaxForScale 
      });
    }
  }, [computedScale, updateQuote, scaleRules]);

  // Centralized Math calculations
  const quote = calculatePricingQuote({
    laborCost: laborCostToUse,
    hasLaborCost,
    hasReferral,
    hasTaxes,
    taxPercentage,
    thirdPartyLicenses,
    customRules: scaleRules,
  });

  const taxExplanation = getTaxBreakdownDescription(computedScale, scaleRules, config.baseTaxPercent);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Form Fields */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-heading">Variables de Cotización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Mano de Obra */}
            <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasLaborCost" className="text-base font-semibold">Mano de Obra</Label>
                <Switch 
                  id="hasLaborCost" 
                  checked={hasLaborCost} 
                  onCheckedChange={(c) => updateQuote({ hasLaborCost: c })} 
                />
              </div>
              {hasLaborCost && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="laborCost">Costo Mano de Obra (Bs)</Label>
                    <Input 
                      id="laborCost"
                      type="number"
                      min="0"
                      value={laborCost === 0 ? '' : laborCost}
                      onChange={(e) => updateQuote({ laborCost: Number(e.target.value) || 0 })}
                      placeholder="Ej. 2500"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Escala del Proyecto</Label>
                    <div className="h-10 px-3 py-2 border border-border rounded-md bg-muted flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        Escala {computedScale}
                      </span>
                      <span className="text-xs text-muted-foreground">Auto-calculado</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Referidor */}
            <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasReferral" className="text-base font-semibold">Comisión Referidor</Label>
                <Switch 
                  id="hasReferral" 
                  checked={hasReferral} 
                  onCheckedChange={(c) => {
                    updateQuote({ 
                      hasReferral: c,
                      referralId: c ? (referralId && referralId !== 'ninguno' ? referralId : (referrers[0]?.id || null)) : null
                    });
                  }} 
                />
              </div>
              {hasReferral && (
                <div className="pt-2">
                  <Label className={cn((!referralId || referralId === 'ninguno') && "text-destructive font-semibold")}>
                    Seleccione Referidor *
                  </Label>
                  <Select 
                    value={referralId && referralId !== 'ninguno' ? referralId : ''} 
                    onValueChange={(val) => updateQuote({ referralId: val })}
                  >
                    <SelectTrigger className={cn("w-full mt-2", (!referralId || referralId === 'ninguno') && "border-destructive ring-1 ring-destructive/30")}>
                      <SelectValue placeholder={referrers.length === 0 ? "No hay referidores registrados" : "Selecciona un referidor registrado *"} />
                    </SelectTrigger>
                    <SelectContent>
                      {referrers.map((ref) => (
                        <SelectItem key={ref.id} value={ref.id}>
                          {ref.name || ref.id} {ref.nickname ? `(${ref.nickname})` : `(${ref.id})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!referralId || referralId === 'ninguno') && (
                    <p className="text-xs text-destructive mt-1.5 font-medium">
                      ⚠️ Es obligatorio seleccionar un referidor registrado para continuar.
                    </p>
                  )}
                  {referrers.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      No hay referidores registrados en el directorio. Primero registra uno en el directorio de referidores.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Impuestos */}
            <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasTaxes" className="text-base font-semibold">Incluir Impuestos</Label>
                <Switch 
                  id="hasTaxes" 
                  checked={hasTaxes} 
                  onCheckedChange={(c) => {
                    updateQuote({ 
                      hasTaxes: c,
                      taxPercentage: c ? scaleRules[computedScale].defaultTax : taxPercentage
                    });
                  }} 
                />
              </div>
              {hasTaxes && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="taxes">Porcentaje Impuestos (%)</Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      Sugerido: {scaleRules[computedScale].defaultTax}%
                    </span>
                  </div>
                  <Input 
                    id="taxes"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxPercentage}
                    onChange={(e) => updateQuote({ taxPercentage: Number(e.target.value) || 0 })}
                    className="w-full"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/60">
                    <span>💡</span>
                    <span><strong>Desglose:</strong> {taxExplanation}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Otros (Licencias y Pagos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className={cn("space-y-2", paymentType === 'Diferido en X meses' ? "col-span-1" : "col-span-1 sm:col-span-2")}>
                <Label>Tipo de Cobro</Label>
                <Select value={paymentType} onValueChange={(val) => updateQuote({ paymentType: val as PaymentType })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50%/50%">50% Inicio / 50% Final</SelectItem>
                    <SelectItem value="Diferido en X meses">Diferido en cuotas</SelectItem>
                    <SelectItem value="Mensual indefinido">Mensual indefinido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentType === 'Diferido en X meses' && (
                <div className="space-y-2 col-span-1 animate-in fade-in slide-in-from-left-2">
                  <Label htmlFor="paymentsCount">Cantidad de Pagos</Label>
                  <Input 
                    id="paymentsCount"
                    type="number"
                    min="2"
                    value={deferredPaymentsCount}
                    onChange={(e) => updateQuote({ deferredPaymentsCount: Number(e.target.value) || 2 })}
                    className="w-full"
                  />
                </div>
              )}

              <div className="space-y-2 col-span-1 sm:col-span-2">
                <Label htmlFor="licenses">Licencias de Terceros Anual (Bs)</Label>
                <Input 
                  id="licenses"
                  type="number"
                  min="0"
                  value={thirdPartyLicenses === 0 ? '' : thirdPartyLicenses}
                  onChange={(e) => updateQuote({ thirdPartyLicenses: Number(e.target.value) || 0 })}
                  placeholder="Ej. 500"
                  className="w-full"
                />
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Live Math Output */}
      <div className="lg:col-span-1">
        <Card className="border-border bg-card shadow-lg sticky top-24">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <CardTitle className="text-lg font-heading">Simulación en Vivo</CardTitle>
            <CardDescription>Escala detectada: <strong>{computedScale}</strong> (Mano de obra: Bs. {laborCostToUse.toLocaleString()})</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            {/* Desglose Unitario */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Precio Unitario</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Mano de Obra:</span>
                <span className="font-medium text-foreground">Bs. {quote.laborCostToUse.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Comisión Stratux ({(quote.rule.stratux * 100)}%):</span>
                <span className="font-medium text-foreground">Bs. {quote.stratuxCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Comisión Referidor ({(quote.rule.ref * 100)}%):</span>
                <span className="font-medium text-foreground">Bs. {quote.referralCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Impuestos ({hasTaxes ? `${taxPercentage}%` : '0%'}):</span>
                <span className="font-medium text-foreground">Bs. {quote.taxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Licencias de Terceros:</span>
                <span className="font-medium text-foreground">Bs. {quote.thirdPartyLicenses.toFixed(2)}</span>
              </div>
            </div>

            {/* Desglose Acumulado */}
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Precio Acumulado</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">+ Stratux:</span>
                <span className="font-medium text-foreground">Bs. {quote.montoStratux.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">+ Referidor:</span>
                <span className="font-medium text-foreground">Bs. {quote.montoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">+ Impuestos (Bruto):</span>
                <span className="font-medium text-foreground">Bs. {quote.montoBruto.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Totales Grandes */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total sin Licencias de Terceros</span>
                <span className="text-2xl font-heading font-bold text-foreground">Bs. {quote.totalSinLicencias.toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col gap-1 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Precio Final Total</span>
                <span className="text-4xl font-heading font-bold text-primary">Bs. {quote.finalPrice.toFixed(2)}</span>
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-muted/20 border-t border-border py-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Nota:</strong> Las licencias de terceros no ingresan a Stratux sino que se abonan directamente a proveedores externos.
            </p>
          </CardFooter>
        </Card>
      </div>
      
    </div>
  );
}
