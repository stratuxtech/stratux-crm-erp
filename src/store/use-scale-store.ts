"use client";

import { create } from "zustand";
import { ScaleConfigData, DEFAULT_SCALE_CONFIG } from "@/types/scales";
import { getScaleConfig, updateScaleConfig, resetScaleConfig } from "@/actions/escalas";
import { ScaleType, ScaleRule, SCALE_RULES } from "@/lib/pricing-calculator";

function buildScaleRules(config: ScaleConfigData): Record<ScaleType, ScaleRule> {
  const rules = config.rules || DEFAULT_SCALE_CONFIG.rules;
  const baseTax = config.baseTaxPercent || 22;

  const transform = (id: ScaleType): ScaleRule => {
    const r = rules[id] || DEFAULT_SCALE_CONFIG.rules[id];
    return {
      maxCost: r.maxCost,
      stratux: r.stratuxPercent / 100,
      ref: r.refPercent / 100,
      billingFee: r.billingFeePercent / 100,
      defaultTax: r.defaultTax || Number((baseTax + r.billingFeePercent).toFixed(2)),
    };
  };

  return {
    XP: transform("XP"),
    P: transform("P"),
    M: transform("M"),
    L: transform("L"),
    XL: transform("XL"),
    XXL: transform("XXL"),
  };
}

interface ScaleStoreState {
  config: ScaleConfigData;
  scaleRules: Record<ScaleType, ScaleRule>;
  isLoading: boolean;
  loadConfig: () => Promise<void>;
  saveConfig: (newConfig: Partial<ScaleConfigData>) => Promise<{ success: boolean; error?: string }>;
  resetToDefault: () => Promise<boolean>;
  getScaleRules: () => Record<ScaleType, ScaleRule>;
}

export const useScaleStore = create<ScaleStoreState>((set, get) => ({
  config: DEFAULT_SCALE_CONFIG,
  scaleRules: buildScaleRules(DEFAULT_SCALE_CONFIG),
  isLoading: false,

  loadConfig: async () => {
    try {
      set({ isLoading: true });
      const data = await getScaleConfig();
      set({ 
        config: data, 
        scaleRules: buildScaleRules(data), 
        isLoading: false 
      });
    } catch (e) {
      console.error("Failed to load scale config:", e);
      set({ isLoading: false });
    }
  },

  saveConfig: async (newConfig: Partial<ScaleConfigData>) => {
    try {
      const res = await updateScaleConfig(newConfig);
      if (res.success && res.config) {
        set({ 
          config: res.config, 
          scaleRules: buildScaleRules(res.config) 
        });
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  resetToDefault: async () => {
    try {
      const res = await resetScaleConfig();
      if (res.success && res.config) {
        set({ 
          config: res.config, 
          scaleRules: buildScaleRules(res.config) 
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  getScaleRules: (): Record<ScaleType, ScaleRule> => {
    return get().scaleRules;
  },
}));
