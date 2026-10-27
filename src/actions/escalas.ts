"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { ScaleConfigData, ScaleId, DEFAULT_SCALE_CONFIG } from "@/types/scales";

const CONFIG_PATH = path.join(process.cwd(), "src/data/escalas.json");

export async function getScaleConfig(): Promise<ScaleConfigData> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ScaleConfigData;
    if (!parsed || !parsed.rules) return DEFAULT_SCALE_CONFIG;
    return parsed;
  } catch {
    return DEFAULT_SCALE_CONFIG;
  }
}

export async function updateScaleConfig(newConfig: Partial<ScaleConfigData>) {
  try {
    const current = await getScaleConfig();
    const updated: ScaleConfigData = {
      baseTaxPercent: newConfig.baseTaxPercent ?? current.baseTaxPercent ?? 22,
      updatedAt: new Date().toISOString(),
      rules: {
        ...current.rules,
        ...(newConfig.rules || {}),
      },
    };

    // Calculate defaultTax for each rule: baseTaxPercent + billingFeePercent
    (Object.keys(updated.rules) as ScaleId[]).forEach((key) => {
      const rule = updated.rules[key];
      rule.defaultTax = Number((updated.baseTaxPercent + rule.billingFeePercent).toFixed(2));
    });

    await fs.writeFile(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");

    revalidatePath("/operaciones/propuestas/crear");
    revalidatePath("/operaciones/simulador");
    revalidatePath("/operaciones/cobros/crear");
    revalidatePath("/dashboard/negocio");

    return { success: true, config: updated, message: "Escalas comerciales actualizadas correctamente" };
  } catch (error: any) {
    console.error("Error saving scale config:", error);
    return { success: false, error: error.message || "Error al guardar configuración de escalas" };
  }
}

export async function resetScaleConfig() {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_SCALE_CONFIG, null, 2), "utf-8");
    revalidatePath("/operaciones/propuestas/crear");
    revalidatePath("/operaciones/simulador");
    revalidatePath("/operaciones/cobros/crear");
    revalidatePath("/dashboard/negocio");
    return { success: true, config: DEFAULT_SCALE_CONFIG, message: "Valores restablecidos por defecto" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
