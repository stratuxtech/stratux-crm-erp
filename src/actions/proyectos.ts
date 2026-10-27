"use server";

import { db } from "@/lib/db";
import { Project, ProjectSchema } from "@/types/database";
import { revalidatePath } from "next/cache";
import { fetchSheet, appendRowToSheet, formatProjectForSheet } from "@/lib/google-sheets";
import { getComputedScale } from "@/lib/pricing-calculator";

/**
 * Parse date string from Google Sheets (DD/MM/YY or DD/M/YY or DD/MM/YYYY)
 */
function parseSheetDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (year < 100) year += 2000;

  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseNumber(numStr?: string): number | null {
  if (!numStr) return null;
  const cleaned = numStr.replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function getProjects(): Promise<Project[]> {
  try {
    const projects = await db.projects.findMany();
    return projects;
  } catch (error) {
    console.error("Error fetching projects", error);
    return [];
  }
}

export async function syncProjects() {
  try {
    const rows = await fetchSheet("proyectos");

    const sheetProjects: Project[] = rows
      .filter((row) => {
        const id = (row["id"] || row["ID"] || row[""] || row[" "] || row["  "] || Object.values(row)[0] || "").trim();
        const empresa = (row["Empresa"] || row["Empresa "] || "").trim();
        return id.startsWith("PR-") || empresa.length > 0;
      })
      .map((row, index) => {
        const id = (row["id"] || row["ID"] || row[""] || row[" "] || row["  "] || Object.values(row)[0] || `PR-${(index + 1).toString().padStart(4, "0")}`).trim();
        const date9010 = parseSheetDate(row["Fecha 90/10"] || row["Fecha 90/10 "]);
        const presentationDate = parseSheetDate(row["Fecha Presentacion"] || row["Fecha Presentacion "]);
        const kickoffDate = parseSheetDate(row["Fecha inicio del proyecto"] || row["Fecha inicio del proyecto "]) || parseSheetDate(row["Fecha aprobacion del proyecto"] || row["Fecha aprobacion del proyecto "]) || presentationDate || date9010;
        const expectedEndDate = parseSheetDate(row["Fecha Ideal final de proyecto"] || row["Fecha Ideal final de proyecto "]);
        const realEndDate = parseSheetDate(row["Fecha real final de proyecto"] || row["Fecha real final de proyecto "]);
        const rawStatus = (row["Estado del proyecto"] || row["Estado del proyecto "] || "En Proceso").trim();
        
        let status = "Activo";
        if (rawStatus.toLowerCase().includes("aceptado") || rawStatus.toLowerCase().includes("finalizado") || rawStatus.toLowerCase().includes("activo")) {
          status = "Activo";
        } else if (rawStatus.toLowerCase().includes("rechazado") || rawStatus.toLowerCase().includes("cancelado") || rawStatus.toLowerCase().includes("baja")) {
          status = "Cancelado";
        } else if (rawStatus.toLowerCase().includes("propuesta") || rawStatus.toLowerCase().includes("pendiente")) {
          status = "Propuesta";
        }

        const totalAmount = parseNumber(row["Monto Final más Licencias"] || row["Monto Final más Licencias "]) || parseNumber(row["Monto final Stratux"] || row["Monto final Stratux "]) || parseNumber(row["Total antes de impuestos"] || row["Total antes de impuestos "]) || 0;
        const laborCost = parseNumber(row["Costo Mano de Obra"] || row["Costo Mano de Obra "]) || 0;
        const stratuxCommission = parseNumber(row["Comisión Stratux"] || row["Comisión Stratux "]) || (totalAmount - laborCost);
        const rawScale = (row["Escala de Proyecto"] || row["Escala de Proyecto "])?.trim();
        const scale = rawScale || getComputedScale(laborCost);

        const isPresDone = (row["Presentacion realizada"] || row["Presentacion realizada "])?.toLowerCase().includes("si") || false;
        const isTaxes = (row["Impuestos Incluidos"] || row["Impuestos Incluidos "])?.toLowerCase().includes("si") || false;

        return {
          id,
          leadId: (row["ID Lead"] || row["ID Lead "])?.trim() || undefined,
          originalProposalId: (row["ID Propuesta Original"] || row["ID Propuesta Original "])?.trim() || undefined,
          companyName: (row["Empresa"] || row["Empresa "])?.trim() || "Empresa Sin Nombre",
          projectName: (row["Nombre del proyecto"] || row["Nombre del proyecto "])?.trim() || undefined,
          date9010: date9010 || undefined,
          presentationDone: isPresDone,
          projectType: (row["Tipo de Proyecto"] || row["Tipo de Proyecto "])?.trim() || "Web",
          workersCount: parseNumber(row["Numero Trabajadores"] || row["Numero Trabajadores "]) || 1,
          taxesIncluded: isTaxes,
          paymentType: (row["Tipo de cobro"] || row["Tipo de cobro "])?.trim() || "50% / 50%",
          laborCost: laborCost || undefined,
          scale: scale as any,
          stratuxCommission: stratuxCommission || undefined,
          referrerId: (row["ID Referidor"] || row["ID Referidor "])?.trim() || undefined,
          referrerCommission: parseNumber(row["Comisión Referidor"] || row["Comisión Referidor "]) || undefined,
          taxPercentage: parseNumber(row["Porcentaje impuestos"] || row["Porcentaje impuestos "]) || undefined,
          finalStratuxAmount: parseNumber(row["Monto final Stratux"] || row["Monto final Stratux "]) || undefined,
          licensesAmount: parseNumber(row["Licencias de Terceros anual Bs"] || row["Licencias de Terceros anual Bs "]) || undefined,
          finalAmountPlusLicenses: totalAmount || undefined,
          status,
          kickoffDate: kickoffDate || undefined,
          expectedEndDate: expectedEndDate || undefined,
          realEndDate: realEndDate || undefined,
          totalAmount: totalAmount || undefined,
          createdAt: presentationDate || date9010 || kickoffDate || new Date().toISOString(),
          rubro: undefined,
          rating: 4,
          daysOverdue: parseNumber(row["Días fuera de plazo del proyecto"] || row["Días fuera de plazo del proyecto "]) || 0,
        };
      });

    // Google Sheets es la fuente única de verdad: si está vacío, el explorador queda vacío
    await db.projects.overwrite(sheetProjects);
    revalidatePath("/operaciones/proyectos");
    revalidatePath("/operaciones/propuestas");
    return { success: true, count: sheetProjects.length, message: `${sheetProjects.length} proyectos sincronizados desde Google Sheets` };
  } catch (error) {
    console.error("Error syncing projects:", error);
    return { success: false, message: "Error al sincronizar proyectos desde Google Sheets" };
  }
}

export async function addProject(data: Partial<Project>) {
  try {
    const newProject = ProjectSchema.parse({
      id: data.id || `PR-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
      createdAt: new Date().toISOString(),
      status: data.status || "Propuesta",
      ...data
    });
    
    // 1. Enviar primero a Google Sheets y ESPERAR confirmación obligatoria (200 OK)
    const sheetRes = await appendRowToSheet("proyectos", formatProjectForSheet(newProject));
    if (!sheetRes.success) {
      console.error("Fallo al escribir en Google Sheets:", sheetRes.error);
      return { 
        success: false, 
        error: sheetRes.error || "No se pudo sincronizar con Google Sheets. Verifica la conexión." 
      };
    }

    // 2. SOLO tras confirmación exitosa de Google Sheets se inyecta en la base de datos local
    await db.projects.append(newProject);

    revalidatePath("/operaciones/proyectos");
    revalidatePath("/operaciones/propuestas");
    return { success: true, project: newProject };
  } catch (error: any) {
    console.error("Error adding project", error);
    return { success: false, error: error.message || "Error al validar la propuesta" };
  }
}

export async function updateProject(id: string, data: Partial<Project>) {
  try {
    const allProjects = await db.projects.findMany();
    const existing = allProjects.find(p => p.id === id);
    if (!existing) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    const updated = { ...existing, ...data };

    // 1. Enviar primero a Google Sheets y esperar confirmación
    const sheetRes = await appendRowToSheet("proyectos", formatProjectForSheet(updated));
    if (!sheetRes.success) {
      return { success: false, error: sheetRes.error || "Error al actualizar en Google Sheets" };
    }

    // 2. Actualizar localmente
    await db.projects.update(id, data);

    revalidatePath("/operaciones/proyectos");
    revalidatePath("/operaciones/propuestas");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating project", error);
    return { success: false, error: error.message || "Error al actualizar proyecto" };
  }
}

export async function deleteProject(id: string) {
  try {
    const all = await db.projects.findMany();
    const filtered = all.filter(p => p.id !== id);
    await db.projects.overwrite(filtered);

    revalidatePath("/operaciones/proyectos");
    revalidatePath("/operaciones/propuestas");
    return { success: true };
  } catch (error) {
    console.error("Error deleting project", error);
    return { success: false, error: "Error al eliminar proyecto" };
  }
}

export async function approveProposal(id: string, kickoffDate?: string, expectedEndDate?: string) {
  try {
    const nowIso = new Date().toISOString();
    const allProjects = await db.projects.findMany();
    const targetProject = allProjects.find(p => p.id === id);
    if (!targetProject) {
      return { success: false, error: "Propuesta no encontrada" };
    }
    const baseId = targetProject.originalProposalId || id.replace(/-V\d+$/i, "");

    const updateData: Partial<Project> = {
      status: "Activo",
      approvalDate: nowIso,
      kickoffDate: kickoffDate || targetProject.kickoffDate || nowIso,
      expectedEndDate: expectedEndDate || targetProject.expectedEndDate || undefined,
    };

    const updatedProject = { ...targetProject, ...updateData };

    // 1. Escribir a Google Sheets y esperar confirmación obligatoria
    const sheetRes = await appendRowToSheet("proyectos", formatProjectForSheet(updatedProject));
    if (!sheetRes.success) {
      return { success: false, error: sheetRes.error || "No se pudo actualizar el estado en Google Sheets" };
    }

    // 2. Actualizar estado local tras éxito
    await db.projects.update(id, updateData);

    // Actualizar versiones hermanas a versión previa
    const relatedVersions = allProjects.filter(p => 
      p.id !== id && 
      (p.originalProposalId === baseId || p.originalProposalId === id || p.id === baseId || p.id.replace(/-V\d+$/i, "") === baseId || (targetProject.leadId && p.leadId === targetProject.leadId))
    );

    for (const v of relatedVersions) {
      await db.projects.update(v.id, { status: "Aprobado (Versión previa)" });
    }

    revalidatePath("/operaciones/proyectos");
    revalidatePath("/operaciones/propuestas");
    return { success: true };
  } catch (error: any) {
    console.error("Error approving proposal", error);
    return { success: false, error: error.message || "Error al dar de alta el proyecto" };
  }
}

export async function declineProposal(id: string, reason?: string) {
  try {
    const allProjects = await db.projects.findMany();
    const targetProject = allProjects.find(p => p.id === id);
    if (!targetProject) {
      return { success: false, error: "Propuesta no encontrada" };
    }
    const baseId = targetProject.originalProposalId || id.replace(/-V\d+$/i, "");

    const updateData: Partial<Project> = {
      status: "Declinada",
      cancellationDate: new Date().toISOString(),
      cancellationReason: reason || "Propuesta declinada",
    };

    const relatedVersions = allProjects.filter(p => 
      p.id === id || 
      p.originalProposalId === baseId || 
      p.id === baseId || 
      p.id.replace(/-V\d+$/i, "") === baseId || 
      (targetProject.leadId && p.leadId === targetProject.leadId && (!p.status || p.status === "Propuesta"))
    );

    for (const v of relatedVersions) {
      const updated = { ...v, ...updateData };
      try {
        await appendRowToSheet("proyectos", formatProjectForSheet(updated));
      } catch (sheetErr) {
        console.warn("Could not sync decline to sheet:", sheetErr);
      }
      await db.projects.update(v.id, updateData);
    }

    revalidatePath("/operaciones/propuestas");
    revalidatePath("/operaciones/proyectos");
    return { success: true };
  } catch (error: any) {
    console.error("Error declining proposal", error);
    return { success: false, error: error.message || "Error al declinar propuesta" };
  }
}

