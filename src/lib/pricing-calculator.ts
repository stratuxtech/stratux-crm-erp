export type ScaleType = 'XP' | 'P' | 'M' | 'L' | 'XL' | 'XXL';

export interface ScaleRule {
  maxCost: number;
  stratux: number;      // e.g. 0.30 for 30%
  ref: number;          // e.g. 0.09 for 9%
  billingFee: number;   // e.g. 0.05 for 5%
  defaultTax: number;   // e.g. 27 for 27% (22% base + 5% billing)
}

export const BASE_TAX_PERCENT = 22;

export const SCALE_RULES: Record<ScaleType, ScaleRule> = {
  XP: {
    maxCost: 3000,
    stratux: 0.30,
    ref: 0.09,
    billingFee: 0.05,
    defaultTax: 27,
  },
  P: {
    maxCost: 7000,
    stratux: 0.25,
    ref: 0.07,
    billingFee: 0.04,
    defaultTax: 26,
  },
  M: {
    maxCost: 20000,
    stratux: 0.15,
    ref: 0.05,
    billingFee: 0.035,
    defaultTax: 25.5,
  },
  L: {
    maxCost: 40000,
    stratux: 0.10,
    ref: 0.03,
    billingFee: 0.0275,
    defaultTax: 24.75,
  },
  XL: {
    maxCost: 60000,
    stratux: 0.08,
    ref: 0.025,
    billingFee: 0.02,
    defaultTax: 24,
  },
  XXL: {
    maxCost: Infinity,
    stratux: 0.05,
    ref: 0.015,
    billingFee: 0.018,
    defaultTax: 23.8,
  },
};

/**
 * Computes the project scale based on the labor cost.
 */
export function getComputedScale(cost: number, customRules?: Record<ScaleType, ScaleRule>): ScaleType {
  const rules = customRules || SCALE_RULES;
  const safeCost = Math.max(0, Number(cost) || 0);
  if (safeCost <= rules.XP.maxCost) return 'XP';
  if (safeCost <= rules.P.maxCost) return 'P';
  if (safeCost <= rules.M.maxCost) return 'M';
  if (safeCost <= rules.L.maxCost) return 'L';
  if (safeCost <= rules.XL.maxCost) return 'XL';
  return 'XXL';
}

/**
 * Returns formatted descriptive breakdown for taxes in UI.
 * e.g. "22% base + 5% comisión por facturación tercerizada"
 */
export function getTaxBreakdownDescription(scale: ScaleType, customRules?: Record<ScaleType, ScaleRule>, baseTax: number = BASE_TAX_PERCENT): string {
  const rules = customRules || SCALE_RULES;
  const rule = rules[scale] || rules.XP;
  const billingPercentFormatted = (rule.billingFee * 100).toLocaleString('es-BO', {
    maximumFractionDigits: 2,
  });
  return `${baseTax}% base + ${billingPercentFormatted}% comisión por facturación tercerizada`;
}

export interface PricingInput {
  laborCost: number;
  hasLaborCost?: boolean;
  hasReferral?: boolean;
  hasTaxes?: boolean;
  taxPercentage?: number;
  thirdPartyLicenses?: number;
  customRules?: Record<ScaleType, ScaleRule>;
}

export interface PricingBreakdown {
  scale: ScaleType;
  rule: ScaleRule;
  laborCostToUse: number;
  laborCost: number;
  stratuxCommission: number;
  montoStratux: number;        // Acumulado 1
  referralCommission: number;
  referrerCommission: number;
  montoTotal: number;          // Acumulado 2
  taxes: number;
  taxPercentage: number;
  montoBruto: number;          // Acumulado 3
  thirdPartyLicenses: number;
  finalPrice: number;          // Total de cara al cliente
  totalSinLicencias: number;
  defaultTaxPercentage: number;
  billingFeePercentage: number;
}

/**
 * Single source of truth for the financial formula across Stratux OS.
 */
export function calculatePricingQuote(input: PricingInput): PricingBreakdown {
  const rules = input.customRules || SCALE_RULES;
  const laborCostToUse = input.hasLaborCost !== false ? Math.max(0, Number(input.laborCost) || 0) : 0;
  const scale = getComputedScale(laborCostToUse, rules);
  const rule = rules[scale];

  // 1. Margen Stratux
  const stratuxCommission = laborCostToUse * rule.stratux;
  const montoStratux = laborCostToUse + stratuxCommission;

  // 2. Comisión Referidor
  const referralCommission = input.hasReferral ? (montoStratux * rule.ref) : 0;
  const montoTotal = montoStratux + referralCommission;

  // 3. Impuestos consolidados
  const taxPct = input.hasTaxes ? (input.taxPercentage ?? rule.defaultTax) : 0;
  const taxes = input.hasTaxes ? (montoTotal * (taxPct / 100)) : 0;
  const montoBruto = montoTotal + taxes;

  // 4. Licencias de Terceros
  const thirdPartyLicenses = Math.max(0, Number(input.thirdPartyLicenses) || 0);
  const finalPrice = montoBruto + thirdPartyLicenses;

  return {
    scale,
    rule,
    laborCostToUse,
    laborCost: laborCostToUse,
    stratuxCommission,
    montoStratux,
    referralCommission,
    referrerCommission: referralCommission,
    montoTotal,
    taxes,
    taxPercentage: taxPct,
    montoBruto,
    thirdPartyLicenses,
    finalPrice,
    totalSinLicencias: montoBruto,
    defaultTaxPercentage: rule.defaultTax,
    billingFeePercentage: rule.billingFee * 100,
  };
}
