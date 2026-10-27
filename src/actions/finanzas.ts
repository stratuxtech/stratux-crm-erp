"use server";

import { db } from "@/lib/db";
import { Payment, Collection, PaymentSchema, CollectionSchema } from "@/types/database";
import { revalidatePath } from "next/cache";
import { 
  fetchSheet, 
  appendRowToSheet, 
  formatCollectionForSheet, 
  formatPaymentForSheet 
} from "@/lib/google-sheets";

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

export async function syncFinanzas(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch Cobros
    const cobrosRows = await fetchSheet("finanzas", "Cobros").catch(() => []);
    const collections: Collection[] = cobrosRows
      .filter((row) => row["ID Cobro"]?.trim() || row["Concepto"]?.trim() || row["Monto Bruto"]?.trim())
      .map((row, index) => {
        const id = row["ID Cobro"]?.trim() || `CB-${(index + 1).toString().padStart(4, "0")}`;
        const projectId = row["ID Proyecto"]?.trim() || "PR-0001";
        const date = parseSheetDate(row["Fecha"]) || new Date().toISOString();
        const method = row["Metodo de cobro"]?.trim() || "Transferencia Bancaria";
        const concept = row["Concepto"]?.trim() || "Cobro de proyecto";
        const grossAmount = parseNumber(row["Monto Bruto"]) || 0;
        const scale = row["Escala"]?.trim() || "XP";
        const taxPercentage = parseNumber(row["% Impuestos"]) || 0;
        const postTaxAmount = parseNumber(row["Total post Impuestos"]) || (grossAmount - (grossAmount * taxPercentage / 100));
        const referrerId = row["ID Referidor"]?.trim() || undefined;
        const referrerCommission = parseNumber(row["Comisión Referidor"]) || 0;
        const stratuxCommission = parseNumber(row["Comisión Stratux"]) || 0;
        const laborCost = parseNumber(row["Costo Mano de Obra"]) || 0;
        const netAmount = parseNumber(row["Monto Final Stratux"]) || stratuxCommission;

        return {
          id,
          projectId,
          date,
          method,
          concept,
          grossAmount,
          taxPercentage,
          postTaxAmount,
          referrerId,
          referrerCommission,
          stratuxCommission,
          laborCost,
          netAmount,
          scale,
          createdAt: date,
        };
      });

    // 2. Fetch Pagos
    const pagosRows = await fetchSheet("finanzas", "Pagos").catch(() => []);
    const payments: Payment[] = pagosRows
      .filter((row) => row["ID Pago"]?.trim() || row["Concepto"]?.trim() || row["Monto"]?.trim())
      .map((row, index) => {
        const id = row["ID Pago"]?.trim() || `PG-${(index + 1).toString().padStart(4, "0")}`;
        const date = parseSheetDate(row["Fecha"]) || new Date().toISOString();
        const category = row["Categoría"]?.trim() || "General";
        const concept = row["Concepto"]?.trim() || "Pago operativo";
        const receiverName = row["Proveedor"]?.trim() || "Proveedor";
        const method = row["Método de pago"]?.trim() || "Transferencia Bancaria";
        const amount = parseNumber(row["Monto"]) || 0;
        const referrerId = row["ID Referidor"]?.trim() || undefined;
        const referrerNotified = (row["Referidor Notificado"]?.trim().toLowerCase() === "si");
        const projectId = row["ID Proyecto"]?.trim() || undefined;

        return {
          id,
          date,
          category,
          concept,
          receiverName,
          method,
          amount,
          referrerId,
          referrerNotified,
          projectId,
          createdAt: date,
        };
      });

    await db.collections.overwrite(collections);
    await db.payments.overwrite(payments);

    return { 
      success: true, 
      message: `${collections.length} cobros y ${payments.length} pagos sincronizados desde Google Sheets` 
    };
  } catch (error: any) {
    console.error("Error syncing finanzas:", error);
    return { success: false, message: "Error al sincronizar finanzas desde Google Sheets: " + error.message };
  }
}

export async function getPayments(forceSync = false): Promise<Payment[]> {
  try {
    let payments = await db.payments.findMany();
    if (payments.length === 0 || forceSync) {
      await syncFinanzas();
      payments = await db.payments.findMany();
    }
    return payments;
  } catch (error) {
    console.error("Error fetching payments", error);
    return [];
  }
}

export async function getCollections(forceSync = false): Promise<Collection[]> {
  try {
    let collections = await db.collections.findMany();
    if (collections.length === 0 || forceSync) {
      await syncFinanzas();
      collections = await db.collections.findMany();
    }
    return collections;
  } catch (error) {
    console.error("Error fetching collections", error);
    return [];
  }
}

export async function addPayment(data: Partial<Payment>) {
  try {
    const existing = await getPayments();
    let nextNum = existing.length + 1;
    existing.forEach((p) => {
      const match = p.id.match(/PG-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });

    const newPayment = PaymentSchema.parse({
      id: data.id || `PG-${nextNum.toString().padStart(4, "0")}`,
      createdAt: data.createdAt || new Date().toISOString(),
      date: data.date || new Date().toISOString(),
      category: data.category || "General",
      concept: data.concept || "Pago operativo",
      receiverName: data.receiverName || "Proveedor",
      method: data.method || "Transferencia Bancaria",
      amount: data.amount || 0,
      referrerId: data.referrerId || undefined,
      referrerNotified: data.referrerNotified || false,
      projectId: data.projectId || undefined,
    });

    // 1. Guardar localmente
    await db.payments.append(newPayment);

    // 2. Enviar a Google Sheets vía Webhook (Hoja Pagos)
    const sheetData = formatPaymentForSheet(newPayment);
    const sheetRes = await appendRowToSheet("finanzas", sheetData, "Pagos");
    if (!sheetRes.success) {
      console.warn("No se pudo enviar pago a Google Sheets:", sheetRes.error);
    }

    revalidatePath("/operaciones/pagos");
    revalidatePath("/finanzas/resumen");
    revalidatePath("/dashboard/negocio");
    return { success: true, payment: newPayment, sheetSync: sheetRes.success };
  } catch (error) {
    console.error("Error adding payment", error);
    return { success: false, error: "Validation failed" };
  }
}

export async function addCollection(data: Partial<Collection>) {
  try {
    const grossAmount = Math.max(0, Number(data.grossAmount) || 0);
    const taxPercentage = Math.max(0, Number(data.taxPercentage) || 0);
    const taxAmount = grossAmount * (taxPercentage / 100);
    const postTaxAmount = grossAmount - taxAmount;
    const referrerCommission = Math.max(0, Number(data.referrerCommission) || 0);
    const laborCost = Math.max(0, Number(data.laborCost) || 0);
    const stratuxCommission = data.stratuxCommission ?? Math.max(0, postTaxAmount - referrerCommission - laborCost);
    const netAmount = data.netAmount ?? stratuxCommission;

    const existingCollections = await getCollections();
    let nextNum = existingCollections.length + 1;
    existingCollections.forEach((c) => {
      const match = c.id.match(/CB-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });

    const newCollection = CollectionSchema.parse({
      id: data.id || `CB-${nextNum.toString().padStart(4, "0")}`,
      createdAt: data.createdAt || new Date().toISOString(),
      projectId: data.projectId || "PR-0001",
      date: data.date || new Date().toISOString(),
      method: data.method || "Transferencia Bancaria",
      concept: data.concept || "Cobro de proyecto",
      grossAmount,
      taxPercentage,
      postTaxAmount,
      referrerId: data.referrerId || undefined,
      referrerCommission,
      stratuxCommission,
      laborCost,
      netAmount,
      scale: data.scale || "XP",
    });

    // 1. Guardar cobro localmente
    await db.collections.append(newCollection);

    // 2. Enviar cobro a Google Sheets (Hoja Cobros)
    const collectionSheetData = formatCollectionForSheet(newCollection);
    const collectionRes = await appendRowToSheet("finanzas", collectionSheetData, "Cobros");
    if (!collectionRes.success) {
      console.warn("No se pudo enviar cobro a Google Sheets:", collectionRes.error);
    }

    // --- ATOMIC DUAL TRANSACTION (Desfragmentación de pasivos en Pagos) ---
    
    // Egreso 1: Retención de Impuestos (Facturación tercerizada / SIN)
    if (taxAmount > 0) {
      const existingPayments = await getPayments();
      let nextPayNum = existingPayments.length + 1;
      existingPayments.forEach((p) => {
        const match = p.id.match(/PG-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextPayNum) nextPayNum = num + 1;
        }
      });

      const taxPayment = PaymentSchema.parse({
        id: `PG-${nextPayNum.toString().padStart(4, "0")}`,
        date: newCollection.date,
        category: "Impuestos",
        concept: `Retención impuestos (${taxPercentage}% - Facturación tercerizada) - ${newCollection.concept}`,
        receiverName: "Tercerizador de Facturación / SIN",
        method: newCollection.method,
        amount: taxAmount,
        projectId: newCollection.projectId,
        createdAt: new Date().toISOString(),
      });

      await db.payments.append(taxPayment);
      const taxSheetData = formatPaymentForSheet(taxPayment);
      await appendRowToSheet("finanzas", taxSheetData, "Pagos");
    }

    // Egreso 2: Comisión de Referidor
    if (referrerCommission > 0 && data.referrerId) {
      const existingPayments = await getPayments();
      let nextPayNum = existingPayments.length + 1;
      existingPayments.forEach((p) => {
        const match = p.id.match(/PG-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextPayNum) nextPayNum = num + 1;
        }
      });

      const refPayment = PaymentSchema.parse({
        id: `PG-${nextPayNum.toString().padStart(4, "0")}`,
        date: newCollection.date,
        category: "Comisión Referidor",
        concept: `Comisión referidor (${data.referrerId}) - ${newCollection.concept}`,
        receiverName: data.referrerId,
        method: newCollection.method,
        amount: referrerCommission,
        referrerId: data.referrerId,
        referrerNotified: false,
        projectId: newCollection.projectId,
        createdAt: new Date().toISOString(),
      });

      await db.payments.append(refPayment);
      const refSheetData = formatPaymentForSheet(refPayment);
      await appendRowToSheet("finanzas", refSheetData, "Pagos");
    }

    revalidatePath("/operaciones/cobros");
    revalidatePath("/operaciones/pagos");
    revalidatePath("/finanzas/resumen");
    revalidatePath("/dashboard/negocio");

    return { 
      success: true, 
      collection: newCollection, 
      sheetSync: collectionRes.success 
    };
  } catch (error) {
    console.error("Error adding collection with dual transactions:", error);
    return { success: false, error: "Validation failed" };
  }
}
