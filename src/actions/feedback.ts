"use server";

import { db } from "@/lib/db";
import { Feedback, FeedbackSchema } from "@/types/database";
import { fetchSheet, appendRowToSheet, formatFeedbackForSheet } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";

function parseSheetDate(dateStr?: string | null): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const trimmed = dateStr.trim();

  if (trimmed.includes("-")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

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

export async function syncFeedback(): Promise<{ success: boolean; message: string }> {
  try {
    const rows = await fetchSheet("feedback");

    const feedbacks: Feedback[] = rows
      .filter((row) => row["ID feedback"]?.trim() || row["Nombre"]?.trim() || row["Comentario abierto"]?.trim())
      .map((row, index) => {
        const id = row["ID feedback"]?.trim() || `FB-${(index + 1).toString().padStart(4, "0")}`;
        const projectId = row["ID Proyecto"]?.trim() || undefined;
        const customerId = row["ID cliente"]?.trim() || undefined;
        const customerName = row["Nombre"]?.trim() || "Cliente";
        const date = parseSheetDate(row["Fecha"]) || new Date().toISOString();
        const csat = parseNumber(row["CSAT (1-5)"]);
        const nps = parseNumber(row["NPS (1-10)"]);
        const ces = parseNumber(row["CES (1-5)"]);
        const productQuality = parseNumber(row["Calidad Producto (1-5)"]);
        const customerService = parseNumber(row["Servicio Cliente (1-5)"]);
        const responseTime = parseNumber(row["Tiempo Respuesta (1-5)"]);
        const easeOfUse = parseNumber(row["Facilidad Uso (1-5)"]);
        const valueForPrice = parseNumber(row["Valor Precio (1-5)"]);
        const openComment = row["Comentario abierto"]?.trim() || "";

        return {
          id,
          projectId,
          customerId,
          customerName,
          date,
          csat,
          nps,
          ces,
          productQuality,
          customerService,
          responseTime,
          easeOfUse,
          valueForPrice,
          openComment,
        };
      });

    await db.feedback.overwrite(feedbacks);
    return { success: true, message: `${feedbacks.length} registros de feedback sincronizados desde Google Sheets` };
  } catch (error: any) {
    console.error("Error syncing feedback:", error);
    return { success: false, message: "Error al sincronizar feedback desde Google Sheets: " + error.message };
  }
}

export async function getFeedback(forceSync = false): Promise<Feedback[]> {
  try {
    let list = await db.feedback.findMany();
    if (list.length === 0 || forceSync) {
      await syncFeedback();
      list = await db.feedback.findMany();
    }
    return list;
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return [];
  }
}

/**
 * Registra una nueva evaluación de feedback tanto en la base local como en Google Sheets vía Webhook.
 */
export async function createFeedback(
  data: Omit<Feedback, "id"> & { id?: string }
): Promise<{ success: boolean; feedback?: Feedback; error?: string }> {
  try {
    const [existingFeedback, allProjects, allLeads] = await Promise.all([
      db.feedback.findMany(),
      db.projects.findMany(),
      db.leads.findMany(),
    ]);

    const id = data.id || `FB-${(existingFeedback.length + 1).toString().padStart(4, "0")}`;

    // Validación estricta: No se permite registrar feedback sin ID de Proyecto ni ID de Cliente
    let resolvedProjectId = data.projectId?.trim() || "";
    let resolvedCustomerId = data.customerId?.trim() || "";
    const cleanCustomerName = (data.customerName || "").trim().toLowerCase();

    // 1. Intentar resolver desde proyectos
    if (resolvedProjectId) {
      const matchProj = allProjects.find(p => p.id.toLowerCase() === resolvedProjectId.toLowerCase());
      if (matchProj && !resolvedCustomerId) {
        resolvedCustomerId = matchProj.leadId || "";
      }
    } else if (cleanCustomerName) {
      const matchProj = allProjects.find(p => (p.companyName || "").toLowerCase().includes(cleanCustomerName));
      if (matchProj) {
        resolvedProjectId = matchProj.id;
        resolvedCustomerId = matchProj.leadId || "";
      }
    }

    // 2. Intentar resolver customerId desde Leads si aún está vacío
    if (!resolvedCustomerId && cleanCustomerName) {
      const matchLead = allLeads.find(l => (l.companyName || "").toLowerCase().includes(cleanCustomerName) || (l.contactName || "").toLowerCase().includes(cleanCustomerName));
      if (matchLead) {
        resolvedCustomerId = matchLead.id;
      }
    }

    // 3. Validación obligatoria
    if (!resolvedProjectId) {
      return { success: false, error: "El ID de Proyecto es obligatorio para registrar feedback." };
    }
    if (!resolvedCustomerId) {
      return { success: false, error: "El ID de Cliente es obligatorio para registrar feedback." };
    }

    const newFeedback: Feedback = {
      ...data,
      id,
      projectId: resolvedProjectId,
      customerId: resolvedCustomerId,
      date: data.date || new Date().toISOString(),
    };

    // 1. Guardar en base de datos local
    await db.feedback.append(newFeedback);

    // 2. Enviar a Google Sheets a través del Webhook
    const rowObject = formatFeedbackForSheet(newFeedback);
    const sheetResult = await appendRowToSheet("feedback", rowObject);

    if (!sheetResult.success) {
      console.warn("Feedback guardado localmente pero falló la sincronización con Google Sheets:", sheetResult.error);
    }

    try {
      revalidatePath("/dashboard/cx");
      revalidatePath("/dashboard/negocio");
      revalidatePath("/finanzas/resumen");
    } catch {}

    return {
      success: true,
      feedback: newFeedback,
    };
  } catch (error: any) {
    console.error("Error al crear feedback:", error);
    return { success: false, error: error.message || "Error al procesar el feedback" };
  }
}

