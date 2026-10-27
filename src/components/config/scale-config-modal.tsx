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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sliders, RefreshCw, Loader2, Info, AlertTriangle, Check } from "lucide-react";
import { useScaleStore } from "@/store/use-scale-store";
import { ScaleId, ScaleRuleItem } from "@/types/scales";
import { toast } from "sonner";

interface ScaleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCALE_ORDER: ScaleId[] = ["XP", "P", "M", "L", "XL", "XXL"];

export function ScaleConfigModal({ isOpen, onClose }: ScaleConfigModalProps) {
  const { config, loadConfig, saveConfig, resetToDefault } = useScaleStore();
  const [localRules, setLocalRules] = useState<Record<ScaleId, ScaleRuleItem>>(config.rules);
  const [baseTax, setBaseTax] = useState<number>(config.baseTaxPercent || 22);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, loadConfig]);

  useEffect(() => {
    setLocalRules(config.rules);
    setBaseTax(config.baseTaxPercent || 22);
  }, [config]);

  const handleFieldChange = (scale: ScaleId, field: keyof ScaleRuleItem, value: number) => {
    setLocalRules((prev) => {
      const updatedRule = { ...prev[scale], [field]: value };
      if (field === "billingFeePercent") {
        updatedRule.defaultTax = Number((baseTax + value).toFixed(2));
      }
      return {
        ...prev,
        [scale]: updatedRule,
      };
    });
  };

  const handleBaseTaxChange = (val: number) => {
    setBaseTax(val);
    setLocalRules((prev) => {
      const updated = { ...prev };
      SCALE_ORDER.forEach((scale) => {
        updated[scale] = {
          ...updated[scale],
          defaultTax: Number((val + updated[scale].billingFeePercent).toFixed(2)),
        };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await saveConfig({
        baseTaxPercent: baseTax,
        rules: localRules,
      });

      if (res.success) {
        toast.success("Configuración de escalas guardada con éxito", {
          description: "Los nuevos proyectos y cotizaciones usarán estas reglas financieras.",
        });
        onClose();
      } else {
        toast.error("Error al guardar configuración", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error inesperado", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("¿Deseas restablecer las escalas a los valores estándar de Stratux?")) return;
    setIsResetting(true);
    try {
      const ok = await resetToDefault();
      if (ok) {
        toast.success("Valores restablecidos a los parámetros originales.");
      } else {
        toast.error("No se pudo restablecer la configuración.");
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto p-6 pr-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sliders className="w-5 h-5" />
            <DialogTitle className="text-xl font-bold">
              Configuración de Escalas y Tramos Comerciales
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajusta los porcentajes de margen Stratux, comisión a referidores y costo de facturación por tramo de mano de obra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* BASE DE IMPUESTO GLOBAL */}
          <div className="p-3.5 bg-muted/40 rounded-lg border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="base-tax" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Base Impositiva Tercerizada (%)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Porcentaje base de retención fiscal (comúnmente 22%). El impuesto default por escala sumará este valor más la comisión por tramo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="base-tax"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={baseTax}
                onChange={(e) => handleBaseTaxChange(Number(e.target.value) || 0)}
                className="w-24 font-bold text-center bg-card"
              />
              <span className="text-sm font-semibold">%</span>
            </div>
          </div>

          {/* LISTA DE ESCALAS */}
          <div className="space-y-4">
            {SCALE_ORDER.map((scaleId) => {
              const rule = localRules[scaleId] || config.rules[scaleId];
              if (!rule) return null;

              const totalTax = Number((baseTax + (rule.billingFeePercent || 0)).toFixed(2));

              return (
                <div
                  key={scaleId}
                  className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold text-sm px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                        {rule.name} ({scaleId})
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {rule.maxCost >= 999999999
                          ? `Más de ${(localRules.XL?.maxCost || 60000).toLocaleString()} Bs`
                          : `Hasta ${rule.maxCost.toLocaleString()} Bs mano de obra`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Impuesto Default:</span>
                      <span className="font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-mono">
                        {totalTax}% ({baseTax}% + {rule.billingFeePercent}%)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    {/* Límite Superior de Costo (para escalas no-XXL) */}
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        {scaleId === "XXL" ? "Mano de Obra Mínima" : "Tope Mano de Obra (Bs)"}
                      </Label>
                      <Input
                        type="number"
                        disabled={scaleId === "XXL"}
                        value={scaleId === "XXL" ? localRules.XL?.maxCost || 60000 : rule.maxCost}
                        onChange={(e) => handleFieldChange(scaleId, "maxCost", Number(e.target.value) || 0)}
                        className="h-8 text-xs font-mono mt-1"
                      />
                    </div>

                    {/* Margen Stratux */}
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Margen Stratux (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={rule.stratuxPercent}
                        onChange={(e) => handleFieldChange(scaleId, "stratuxPercent", Number(e.target.value) || 0)}
                        className="h-8 text-xs font-bold text-primary mt-1"
                      />
                    </div>

                    {/* Comisión Referidor */}
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Comisión Referidor (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={rule.refPercent}
                        onChange={(e) => handleFieldChange(scaleId, "refPercent", Number(e.target.value) || 0)}
                        className="h-8 text-xs font-bold text-foreground mt-1"
                      />
                    </div>

                    {/* Comisión Facturación Tercerizada */}
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Facturación Tercerizada (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={rule.billingFeePercent}
                        onChange={(e) => handleFieldChange(scaleId, "billingFeePercent", Number(e.target.value) || 0)}
                        className="h-8 text-xs font-bold text-amber-600 mt-1"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* NOTA DE INTEGRIDAD HISTÓRICA */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground flex gap-2.5 items-start">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Integridad de datos:</strong> Los proyectos y propuestas ya creados en el historial conservan sus valores originales fijados en su fecha de alta. Los cambios en los tramos aplicarán automáticamente para las nuevas cotizaciones, propuestas y simulaciones.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving || isResetting}
            className="w-full sm:w-auto gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
            Restablecer Valores
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving || isResetting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isResetting}
              className="gap-2 bg-primary text-primary-foreground font-semibold shadow-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando Escalas...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
