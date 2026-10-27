"use server";

import { db } from "@/lib/db";
import { Referrer, ReferrerSchema } from "@/types/database";
import { revalidatePath } from "next/cache";
import { fetchSheet, appendRowToSheet, formatReferrerForSheet } from "@/lib/google-sheets";

/**
 * Parse date string from Google Sheets (DD/MM/YY, DD/MM/YYYY, or ISO YYYY-MM-DD)
 */
function parseSheetDate(dateStr?: string | null): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const trimmed = dateStr.trim();

  // 1. Format with dashes (ISO YYYY-MM-DD or full ISO string)
  if (trimmed.includes("-")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 2. Format with slashes (DD/MM/YY or DD/MM/YYYY)
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (year < 100) year += 2000;

    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

function parseNumber(numStr?: string): number | null {
  if (!numStr) return null;
  const cleaned = numStr.replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function getReferrers(forceSync = false): Promise<Referrer[]> {
  try {
    let referrers = await db.referrers.findMany();
    if (referrers.length === 0 || forceSync) {
      await syncReferrers();
      referrers = await db.referrers.findMany();
    }
    return referrers;
  } catch (error) {
    console.error("Error fetching referrers:", error);
    return [];
  }
}

export async function syncReferrers() {
  try {
    const rows = await fetchSheet("referidores");

    const referrers: Referrer[] = rows
      .filter((row) => row["ID Referidor"]?.trim() || row["Nombre"]?.trim())
      .map((row, index) => {
        const id = row["ID Referidor"]?.trim() || `REF-${(index + 1).toString().padStart(4, "0")}`;
        const name = row["Nombre"]?.trim() || "Referidor Sin Nombre";
        const nickname = row["Apodo"]?.trim() || undefined;
        const joinDate = parseSheetDate(row["Fecha de Ingreso"]) || new Date().toISOString();
        const whatsapp = row["WhatsApp"]?.trim() || undefined;
        const email = row["Correo"]?.trim() || undefined;
        const projectsCount = parseNumber(row["Proyectos"]) || 0;
        const totalEarned = parseNumber(row["Total Ganado"]) || 0;

        return {
          id,
          name,
          nickname,
          joinDate,
          whatsapp,
          email,
          projectsCount,
          totalEarned,
          commissionRate: 10,
          contactInfo: whatsapp || email || undefined,
        };
      });

    await db.referrers.overwrite(referrers);
    return { success: true, message: `${referrers.length} referidores sincronizados desde Google Sheets` };
  } catch (error) {
    console.error("Error syncing referrers:", error);
    return { success: false, message: "Error al sincronizar referidores desde Google Sheets" };
  }
}

export async function addReferrer(data: Partial<Referrer>) {
  try {
    // Generate next sequential ID based on existing referrers
    const existing = await getReferrers();
    let nextNum = existing.length + 1;
    existing.forEach((r) => {
      const match = r.id.match(/REF-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });
    const id = data.id || `REF-${nextNum.toString().padStart(4, "0")}`;

    const newReferrer = ReferrerSchema.parse({
      id,
      name: data.name || "Nuevo Referidor",
      joinDate: new Date().toISOString(),
      projectsCount: 0,
      totalEarned: 0,
      ...data
    });

    // 1. Guardar localmente
    await db.referrers.append(newReferrer);

    // 2. Enviar directamente a Google Sheets por Webhook
    const sheetData = formatReferrerForSheet(newReferrer);
    const sheetRes = await appendRowToSheet("referidores", sheetData);
    if (!sheetRes.success) {
      console.warn("No se pudo enviar referidor al Webhook de Google Sheets:", sheetRes.error);
    }

    revalidatePath("/directorio/referidores");
    return { success: true, referrer: newReferrer, sheetSync: sheetRes.success };
  } catch (error: any) {
    console.error("Error adding referrer:", error);
    return { success: false, error: error.message || "Validation failed" };
  }
}

export async function updateReferrer(id: string, data: Partial<Referrer>) {
  try {
    const existingList = await db.referrers.findMany();
    const existing = existingList.find((r) => r.id === id);
    if (!existing) {
      return { success: false, error: "Referidor no encontrado" };
    }

    const updated = ReferrerSchema.parse({
      ...existing,
      ...data,
      id,
    });

    await db.referrers.update(id, updated);

    // Sync updated row to Google Sheets via webhook if available
    const sheetData = formatReferrerForSheet(updated);
    const sheetRes = await appendRowToSheet("referidores", sheetData);
    if (!sheetRes.success) {
      console.warn("No se pudo sincronizar actualización con Google Sheets:", sheetRes.error);
    }

    revalidatePath("/directorio/referidores");
    return { success: true, referrer: updated };
  } catch (error: any) {
    console.error("Error updating referrer:", error);
    return { success: false, error: error.message || "Error al actualizar referidor" };
  }
}

export async function deleteReferrer(id: string) {
  try {
    await db.referrers.delete(id);
    revalidatePath("/directorio/referidores");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting referrer:", error);
    return { success: false, error: error.message || "Error al eliminar referidor" };
  }
}

