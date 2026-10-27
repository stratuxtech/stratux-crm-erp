"use server";

import { db } from "@/lib/db";
import { Lead, LeadSchema } from "@/types/database";
import { fetchSheet, appendRowToSheet, formatLeadForSheet } from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";

/**
 * Parse a date string from Google Sheets (DD/MM/YY or DD/M/YY or DD/MM/YYYY) into ISO format.
 */
function parseSheetDate(dateStr?: string | null): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  // Convert 2-digit year to 4-digit (25 -> 2025, 26 -> 2026)
  if (year < 100) year += 2000;

  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseNumber(numStr?: string | null): number | null {
  if (!numStr) return null;
  const cleaned = numStr.toString().replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function getLeads(forceSync = false): Promise<Lead[]> {
  try {
    let leads = await db.leads.findMany();
    if (leads.length === 0 || forceSync) {
      await syncLeads();
      leads = await db.leads.findMany();
    }
    return leads;
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

/**
 * Sync leads from Google Sheets.
 * Downloads the "Registro de Leads" sheet as CSV and replaces leads.json.
 */
export async function syncLeads() {
  try {
    const rows = await fetchSheet("leads");

    const leads: Lead[] = rows
      .filter((row) => (row["ID Lead"] || row["ID"] || row["Empresa"])?.trim()) // skip empty rows
      .map((row, index) => {
        const id = (row["ID Lead"] || row["ID"] || `L-${(index + 1).toString().padStart(3, "0")}`).trim();
        const firstName = row["Nombre"]?.trim() || undefined;
        const lastName = row["Apellido"]?.trim() || undefined;
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

        return {
          id,
          leadDate: parseSheetDate(row["Fecha Lead"] || row["Fecha"]) ?? undefined,
          firstName,
          lastName,
          companyName: row["Empresa"]?.trim() || "Sin Empresa",
          rubro: row["Rubro"]?.trim() || undefined,
          whatsapp: row["WhatsApp"]?.trim() || undefined,
          email: (row["Correo Electrónico"] || row["Correo Electronico"] || row["Correo"] || row["Email"])?.trim() || undefined,
          budget: parseNumber(row["Presupuesto"] || row["Budget"]) ?? undefined,
          businessProblems: (row["Problemas Empresariales"] || row["Problemas"])?.trim() || undefined,
          leadRating: parseNumber(row["Calificacion Lead"] || row["Calificación Lead"] || row["Rating"]) ?? 3,
          status: "Nuevo",
          createdAt: parseSheetDate(row["Fecha Lead"]) ?? new Date().toISOString(),
          contactName: fullName || undefined,
          source: "Google Sheets",
        };
      });

    // Overwrite leads.json with real data from Google Sheets
    await db.leads.overwrite(leads);

    revalidatePath("/directorio/clientes");
    revalidatePath("/operaciones/propuestas/crear");
    revalidatePath("/dashboard/negocio");

    return { success: true, count: leads.length, message: `${leads.length} leads sincronizados desde Google Sheets` };
  } catch (error) {
    console.error("Error syncing leads:", error);
    return { success: false, count: 0, message: "Error al sincronizar leads desde Google Sheets" };
  }
}

/**
 * Registers a new Lead:
 * 1. Generates the sequential L-XXX ID
 * 2. Writes directly to Google Sheets via Webhook
 * 3. Saves locally in database
 */
export async function addLead(data: Partial<Lead>) {
  try {
    const existing = await getLeads();
    let nextNum = existing.length + 1;
    existing.forEach((l) => {
      const match = l.id.match(/L-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });

    const id = data.id || `L-${nextNum.toString().padStart(3, "0")}`;
    const nowIso = new Date().toISOString();
    const firstName = data.firstName?.trim() || "";
    const lastName = data.lastName?.trim() || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || data.contactName || "Contacto Principal";

    const newLead = LeadSchema.parse({
      id,
      leadDate: data.leadDate || nowIso,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      companyName: data.companyName?.trim() || "Empresa Sin Nombre",
      rubro: data.rubro?.trim() || "General",
      whatsapp: data.whatsapp?.trim() || "",
      email: data.email?.trim() || "",
      budget: data.budget ? Number(data.budget) : undefined,
      businessProblems: data.businessProblems?.trim() || "Sin observaciones registradas.",
      leadRating: data.leadRating ? Number(data.leadRating) : 3,
      status: data.status || "Nuevo",
      createdAt: nowIso,
      contactName: fullName,
      source: data.source || "CRM Directo",
    });

    // 1. Escribir primero a Google Sheets a través del Webhook
    const sheetRes = await appendRowToSheet("leads", formatLeadForSheet(newLead));
    if (!sheetRes.success) {
      console.warn("No se pudo escribir en Google Sheets Webhook de Leads:", sheetRes.error);
    }

    // 2. Guardar en la base de datos local
    await db.leads.append(newLead);

    try {
      revalidatePath("/directorio/clientes");
      revalidatePath("/operaciones/propuestas/crear");
      revalidatePath("/dashboard/negocio");
    } catch {}

    return { 
      success: true, 
      lead: newLead, 
      sheetSaved: sheetRes.success,
      warning: sheetRes.success ? undefined : "Guardado localmente. Pendiente sincronización con Google Sheets." 
    };
  } catch (error: any) {
    console.error("Error al registrar lead:", error);
    return { success: false, error: error.message || "Error al registrar el lead" };
  }
}
