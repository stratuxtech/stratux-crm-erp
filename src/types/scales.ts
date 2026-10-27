export type ScaleId = "XP" | "P" | "M" | "L" | "XL" | "XXL";

export interface ScaleRuleItem {
  id: ScaleId;
  name: string;
  minCost: number;
  maxCost: number;
  stratuxPercent: number;     // e.g. 30
  refPercent: number;         // e.g. 9
  billingFeePercent: number;  // e.g. 5
  defaultTax: number;         // e.g. 27
}

export interface ScaleConfigData {
  baseTaxPercent: number;
  updatedAt: string;
  rules: Record<ScaleId, ScaleRuleItem>;
}

export const DEFAULT_SCALE_CONFIG: ScaleConfigData = {
  baseTaxPercent: 22,
  updatedAt: "2026-09-15T00:00:00.000Z",
  rules: {
    XP: {
      id: "XP",
      name: "Escala XP",
      minCost: 0,
      maxCost: 3000,
      stratuxPercent: 30,
      refPercent: 9,
      billingFeePercent: 5,
      defaultTax: 27,
    },
    P: {
      id: "P",
      name: "Escala P",
      minCost: 3001,
      maxCost: 7000,
      stratuxPercent: 25,
      refPercent: 7,
      billingFeePercent: 4,
      defaultTax: 26,
    },
    M: {
      id: "M",
      name: "Escala M",
      minCost: 7001,
      maxCost: 20000,
      stratuxPercent: 15,
      refPercent: 5,
      billingFeePercent: 3.5,
      defaultTax: 25.5,
    },
    L: {
      id: "L",
      name: "Escala L",
      minCost: 20001,
      maxCost: 40000,
      stratuxPercent: 10,
      refPercent: 3,
      billingFeePercent: 2.75,
      defaultTax: 24.75,
    },
    XL: {
      id: "XL",
      name: "Escala XL",
      minCost: 40001,
      maxCost: 60000,
      stratuxPercent: 8,
      refPercent: 2.5,
      billingFeePercent: 2,
      defaultTax: 24,
    },
    XXL: {
      id: "XXL",
      name: "Escala XXL",
      minCost: 60001,
      maxCost: 999999999,
      stratuxPercent: 5,
      refPercent: 1.5,
      billingFeePercent: 1.8,
      defaultTax: 23.8,
    },
  },
};
