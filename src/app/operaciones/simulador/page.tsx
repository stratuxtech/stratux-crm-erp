'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useProposalStore, ScaleType, PaymentType } from '@/store/use-proposal-store';
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

export default function SimulatorPage() {
  const router = useRouter();
  const { updateQuote, updateDetails } = useProposalStore();

  // Local State
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [hasReferral, setHasReferral] = useState<boolean>(false);
  const [referralId, setReferralId] = useState<string>('ninguno');
  const { scaleRules, config, loadConfig } = useScaleStore();

  useEffect(() => {
    loadConfig();
    getReferrers().then(data => setReferrers(data));
  }, [loadConfig]);

  const computedScale = getComputedScale(laborCost, scaleRules);
  const [hasTaxes, setHasTaxes] = useState<boolean>(false);
  const [taxPercentage, setTaxPercentage] = useState<number>(scaleRules.XP.defaultTax);
  const previousScaleRef = useRef<ScaleType>(computedScale);

  const [hasThirdPartyLicenses, setHasThirdPartyLicenses] = useState<boolean>(false);
  const [thirdPartyLicenses, setThirdPartyLicenses] = useState<number>(0);

  const [paymentType, setPaymentType] = useState<PaymentType>('50%/50%');
  const [deferredPaymentsCount, setDeferredPaymentsCount] = useState<number>(2);

  // Automatically update suggested tax percentage when scale changes
  useEffect(() => {
    const prevScale = previousScaleRef.current;
    if (prevScale !== computedScale) {
      previousScaleRef.current = computedScale;
      setTaxPercentage(scaleRules[computedScale].defaultTax);
    }
  }, [computedScale, scaleRules]);

  const handleClear = () => {
    setLaborCost(0);
    setHasReferral(false);
    setReferralId('ninguno');
    setHasTaxes(false);
    setTaxPercentage(scaleRules.XP.defaultTax);
    setHasThirdPartyLicenses(false);
    setThirdPartyLicenses(0);
    setPaymentType('50%/50%');
    setDeferredPaymentsCount(2);
  };

  const handleCreateProposal = () => {
    if (laborCost <= 0) {
      alert('El costo de la mano de obra debe ser mayor a 0.');
      return;
    }

    if (hasReferral && (!referralId || referralId === 'ninguno')) {
      alert('Es obligatorio seleccionar un referidor registrado para aplicar la comisión comercial.');
      return;
    }

    // Guardar en estado global
    updateQuote({
      hasLaborCost: true,
      laborCost,
      scale: computedScale,
      hasReferral,
      referralId: hasReferral && referralId !== 'ninguno' ? referralId : null,
      hasTaxes,
      taxPercentage: hasTaxes ? taxPercentage : 0,
      thirdPartyLicenses: hasThirdPartyLicenses ? thirdPartyLicenses : 0,
      paymentType,
      deferredPaymentsCount,
    });
    
    // Configurar flag
    updateDetails({ fromSimulator: true });

    // Saltar al wizard
    router.push('/operaciones/propuestas/crear');
  };

  const formatBs = (value: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Math simulation (en vivo) using centralized calculator
  const quote = calculatePricingQuote({
    laborCost,
    hasLaborCost: true,
    hasReferral,
    hasTaxes,
    taxPercentage,
    thirdPartyLicenses: hasThirdPartyLicenses ? thirdPartyLicenses : 0,
    customRules: scaleRules,
  });

  const taxExplanation = getTaxBreakdownDescription(computedScale, scaleRules, config.baseTaxPercent);

  return (
    <div className="min-h-screen py-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      
      {/* Top Bar Contextual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-bold text-foreground">Simulador de Cotizaciones</h1>
        </div>
        <Button variant="outline" onClick={handleClear} className="w-full md:w-auto">
          Limpiar campos
        </Button>
      </div>

      {/* Grid de dos columnas con espacio respirable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Columna Izquierda: Formulario */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-heading">Variables de Cotización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Costo Mano de Obra (Sin toggle) */}
              <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="laborCost">Costo de la mano de obra (Bs)</Label>
                    <Input 
                      id="laborCost"
                      type="number"
                      min="0"
                      step="any"
                      value={laborCost === 0 ? '' : laborCost}
                      onChange={(e) => setLaborCost(Number(e.target.value) || 0)}
                      placeholder="Ej. 15000"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Escala de proyecto</Label>
                    <div className="h-10 px-3 py-2 border border-border rounded-md bg-muted flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        Escala {computedScale}
                      </span>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                        Auto-calculada
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referidor (Con toggle) */}
              <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hasReferral" className="text-base font-semibold cursor-pointer">Aplica Comisión de Referidor</Label>
                  <Switch 
                    id="hasReferral" 
                    checked={hasReferral} 
                    onCheckedChange={(c) => {
                      setHasReferral(c);
                      if (c && (!referralId || referralId === 'ninguno') && referrers.length > 0) {
                        setReferralId(referrers[0].id);
                      }
                    }} 
                  />
                </div>
                {hasReferral && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label className={cn((!referralId || referralId === 'ninguno') && "text-destructive font-semibold")}>
                      Seleccione Referidor *
                    </Label>
                    <Select value={referralId && referralId !== 'ninguno' ? referralId : ''} onValueChange={(val) => setReferralId(val || '')}>
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
                        ⚠️ Es obligatorio seleccionar un referidor registrado para aplicar la comisión comercial.
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

              {/* Impuestos (Con toggle) */}
              <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hasTaxes" className="text-base font-semibold cursor-pointer">Incluir Impuestos</Label>
                  <Switch 
                    id="hasTaxes" 
                    checked={hasTaxes} 
                    onCheckedChange={(c) => {
                      setHasTaxes(c);
                      if (c) setTaxPercentage(scaleRules[computedScale].defaultTax);
                    }} 
                  />
                </div>
                {hasTaxes && (
                  <div className="pt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="taxPercentage">Porcentaje de impuestos (%)</Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        Sugerido: {scaleRules[computedScale].defaultTax}%
                      </span>
                    </div>
                    <Input 
                      id="taxPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(Number(e.target.value) || 0)}
                      className="w-full"
                    />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/60">
                      <span>💡</span>
                      <span><strong>Desglose:</strong> {taxExplanation}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Licencias de terceros (Con toggle) */}
              <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hasThirdPartyLicenses" className="text-base font-semibold cursor-pointer">Incluir Licencias de Terceros</Label>
                  <Switch 
                    id="hasThirdPartyLicenses" 
                    checked={hasThirdPartyLicenses} 
                    onCheckedChange={setHasThirdPartyLicenses} 
                  />
                </div>
                {hasThirdPartyLicenses && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="thirdPartyLicenses">Total de licencias por un año (Bs)</Label>
                    <Input 
                      id="thirdPartyLicenses"
                      type="number"
                      min="0"
                      step="any"
                      value={thirdPartyLicenses === 0 ? '' : thirdPartyLicenses}
                      onChange={(e) => setThirdPartyLicenses(Number(e.target.value) || 0)}
                      placeholder="Ej. 1200"
                      className="w-full mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Tipo de Cobro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border w-full">
                <div className={cn("space-y-2", paymentType === 'Diferido en X meses' ? "col-span-1" : "col-span-1 sm:col-span-2")}>
                  <Label>Tipo de cobro</Label>
                  <Select value={paymentType} onValueChange={(val) => setPaymentType(val as PaymentType)}>
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
                    <Label htmlFor="paymentsCount">Cantidad de cuotas</Label>
                    <Input 
                      id="paymentsCount"
                      type="number"
                      min="2"
                      value={deferredPaymentsCount}
                      onChange={(e) => setDeferredPaymentsCount(Number(e.target.value) || 2)}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Desglose Matemático En Vivo */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-lg sticky top-8 h-fit flex flex-col">
            <CardHeader className="bg-primary/5 border-b border-border pb-4">
              <CardTitle className="text-lg font-heading text-primary">Desglose de Cotización</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 flex-grow">
              
              <div className="space-y-6">
                
                {/* Mano de obra (Base) */}
                <div className="flex items-center justify-between text-sm py-2">
                  <span className="text-muted-foreground font-medium">Costo de la mano de obra (Base):</span>
                  <span className="font-bold text-foreground">{formatBs(quote.laborCostToUse)}</span>
                </div>

                {/* Stratux */}
                <div className="grid grid-cols-2 gap-4 border-l-2 border-primary/20 pl-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Comisión Stratux ({(quote.rule.stratux * 100)}%)</span>
                    <span className="font-medium">{formatBs(quote.stratuxCommission)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total con comisión Stratux</span>
                    <span className="font-bold">{formatBs(quote.montoStratux)}</span>
                  </div>
                </div>

                {/* Referidor */}
                <div className="grid grid-cols-2 gap-4 border-l-2 border-emerald-500/30 pl-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-emerald-600 uppercase tracking-wider">Comisión Referidor ({(quote.rule.ref * 100)}%)</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">{hasReferral ? formatBs(quote.referralCommission) : formatBs(0)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Total con comisión Referidor</span>
                    <span className="font-bold">{formatBs(quote.montoTotal)}</span>
                  </div>
                </div>

                {/* Impuestos */}
                <div className="grid grid-cols-2 gap-4 border-l-2 border-amber-500/30 pl-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-amber-600 uppercase tracking-wider">Impuestos ({hasTaxes ? `${taxPercentage}%` : '0%'})</span>
                    <span className="font-medium text-amber-700 dark:text-amber-400">{hasTaxes ? formatBs(quote.taxes) : formatBs(0)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Total con impuestos</span>
                    <span className="font-bold">{formatBs(quote.montoBruto)}</span>
                  </div>
                </div>

                {/* Licencias */}
                <div className="grid grid-cols-2 gap-4 border-l-2 border-blue-500/30 pl-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-blue-600 uppercase tracking-wider">Licencias de terceros</span>
                    <span className="font-medium text-blue-700 dark:text-blue-400">{hasThirdPartyLicenses ? formatBs(quote.thirdPartyLicenses) : formatBs(0)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-xs text-blue-600 uppercase tracking-wider font-semibold">Total con licencias</span>
                    <span className="font-bold">{formatBs(quote.finalPrice)}</span>
                  </div>
                </div>

              </div>
              
            </CardContent>

            <CardFooter className="flex flex-col items-start bg-muted/10 border-t border-border pt-6 pb-6 gap-6">
              
              <div className="flex flex-col gap-2 w-full text-right">
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Monto final del proyecto</span>
                <span className="text-5xl font-heading font-bold text-primary break-all">
                  {formatBs(quote.totalSinLicencias)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                  Sin licencias de terceros
                </span>
              </div>

              <div className="w-full p-4 bg-muted/40 rounded-md border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed text-justify">
                  <strong>Nota:</strong> Las licencias de terceros no se agregan al monto final del proyecto ya que no es dinero que entra a Stratux.
                </p>
              </div>

            </CardFooter>
          </Card>
        </div>
        
      </div>

      {/* Down Bar Fijo */}
      <div className="fixed bottom-0 left-0 right-0 h-20 border-t border-border bg-card flex items-center justify-end px-4 sm:px-8 z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <Button 
          onClick={handleCreateProposal} 
          size="lg" 
          className="w-full sm:w-64 font-semibold shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Crear propuesta
        </Button>
      </div>

    </div>
  );
}
