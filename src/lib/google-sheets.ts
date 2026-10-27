/**
 * Fetches CSV data from a public Google Sheets spreadsheet.
 * Uses the gviz/tq endpoint with CSV output — no API key required.
 */

const SHEETS: Record<string, string> = {
  leads: "1fabqpmEqfBZWqAXD1LlzMD8jYwfT_DDceEF4V9rCSWU",
  proyectos: "1nXv4OsFzAA2w0lfwEZe82V3OQKhjGlecEHU4RMmnTTU",
  finanzas: "12TafT1FrvDDVGbhoTULKeHmI-YtnTfRW8HpAf4ZQ9Uc",
  referidores: "1GQo4o8mMT6F3UqXTc0ktRWcp5XwuBzo8_zPXGNpB9Q4",
  feedback: "1KG_nfhiEHxea7AHGQk-YE3lu0sN8xSjscKTWMthWK6g",
};

/**
 * Parse a CSV string into an array of string arrays.
 * Handles quoted fields with commas and escaped quotes.
 */
function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  const lines = csv.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          row.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Fetches a Google Sheet as CSV and returns an array of row objects
 * keyed by the header row.
 */
export async function fetchSheet(
  sheetKey: keyof typeof SHEETS,
  sheetName?: string
): Promise<Record<string, string>[]> {
  const id = SHEETS[sheetKey];
  if (!id) throw new Error(`Unknown sheet key: ${sheetKey}`);

  let url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1`;
  if (sheetName) {
    url += `&sheet=${encodeURIComponent(sheetName)}`;
  }

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet "${sheetKey}": ${response.statusText}`);
  }

  const csv = await response.text();
  const rows = parseCSV(csv);

  if (rows.length < 2) return []; // Only header or empty

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      const val = row[i] ?? "";
      obj[header] = val;
      const trimmed = header.trim();
      if (trimmed) {
        obj[trimmed] = val;
      }
      // If first column, also provide id and ID
      if (i === 0) {
        obj["id"] = val;
        obj["ID"] = val;
      }
    });
    return obj;
  });
}

/**
 * Sends row data to Google Sheets via an Apps Script Webhook with automatic retries.
 */
export async function appendRowToSheet(
  sheetKey: keyof typeof SHEETS,
  rowObject: Record<string, any>,
  subSheet?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = process.env[`GOOGLE_SHEETS_${sheetKey.toUpperCase()}_WEBHOOK_URL`] || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      return { success: false, error: `GOOGLE_SHEETS_${sheetKey.toUpperCase()}_WEBHOOK_URL no está configurado en .env.local` };
    }

    let retries = 2;
    let lastError: any = null;

    while (retries >= 0) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            sheet: sheetKey,
            subSheet: subSheet || (sheetKey === "finanzas" ? "Cobros" : sheetKey),
            data: rowObject,
          }),
        });

        if (!response.ok) {
          throw new Error(`El Webhook respondió con código ${response.status}`);
        }

        return { success: true };
      } catch (err: any) {
        lastError = err;
        retries--;
        if (retries >= 0) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    throw lastError || new Error("Error de conexión con el Webhook de Google Sheets");
  } catch (error: any) {
    console.error(`Error al escribir en Google Sheet ${sheetKey}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Maps a Project object into the exact column headers of Google Sheets "PROPUESTAS / PROYECTOS".
 * Includes both exact sheet headers (with trailing spaces) and clean trimmed headers
 * so that Google Apps Script always finds the corresponding column.
 */
export function formatProjectForSheet(project: any): Record<string, string> {
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const id = project.id || "";
  const leadId = project.leadId || "";
  const originalProposalId = project.originalProposalId || "";
  const companyName = project.companyName || "";
  const projectName = project.projectName || "";
  const date9010 = formatDate(project.date9010);
  const is9010 = project.date9010 ? "SI" : "NO";
  const datePres = formatDate(project.createdAt);
  const isPres = project.presentationDone ? "SI" : "NO";
  const projectType = Array.isArray(project.projectType) ? project.projectType.join(", ") : (project.projectType || "Web");
  const workersCount = (project.workersCount ?? 1).toString();
  const taxesIncluded = project.taxesIncluded ? "SI" : "NO";
  const paymentType = project.paymentType || "50% / 50%";
  const laborCost = (project.laborCost ?? "").toString();
  const scale = project.scale || "";
  const stratuxCommission = (project.stratuxCommission ?? "").toString();
  const referrerId = project.referrerId || "";
  const referrerCommission = (project.referrerCommission ?? "").toString();
  const totalBeforeTaxes = (project.finalStratuxAmount || 0).toString();
  const taxPercentage = project.taxPercentage ? `${project.taxPercentage}%` : "";
  const finalStratuxAmount = (project.finalStratuxAmount ?? "").toString();
  const licensesAmount = (project.licensesAmount ?? "0").toString();
  const finalAmountPlusLicenses = (project.totalAmount || project.finalAmountPlusLicenses || 0).toString();
  const contacts = project.contactName || project.whatsapp || project.email || "";
  const status = project.status || "Propuesta";
  const approvalDate = formatDate(project.approvalDate);
  const kickoffDate = formatDate(project.kickoffDate);
  const expectedEndDate = formatDate(project.expectedEndDate);
  const realEndDate = formatDate(project.realEndDate);
  const daysOverdue = (project.daysOverdue ?? 0).toString();
  const maintenance = "";
  const cancellationDate = formatDate(project.cancellationDate);
  const cancellationReason = project.cancellationReason || "";

  return {
    // Exact column headers in Google Sheets "PROPUESTAS / PROYECTOS":
    "  ": id,
    "ID Lead ": leadId,
    "ID Propuesta Original ": originalProposalId,
    "Empresa ": companyName,
    "Nombre del proyecto ": projectName,
    "Fecha 90/10 ": date9010,
    "90/10 realizado ": is9010,
    "Fecha Presentacion ": datePres,
    "Presentacion realizada ": isPres,
    "Tipo de Proyecto ": projectType,
    "Numero Trabajadores ": workersCount,
    "Impuestos Incluidos ": taxesIncluded,
    "Tipo de cobro ": paymentType,
    "Costo Mano de Obra ": laborCost,
    "Escala de Proyecto ": scale,
    "Comisión Stratux ": stratuxCommission,
    "ID Referidor ": referrerId,
    "Comisión Referidor ": referrerCommission,
    "Total antes de impuestos ": totalBeforeTaxes,
    "Porcentaje impuestos ": taxPercentage,
    "Monto final Stratux ": finalStratuxAmount,
    "Licencias de Terceros anual Bs ": licensesAmount,
    "Monto Final más Licencias ": finalAmountPlusLicenses,
    "Contactos ": contacts,
    "Estado del proyecto ": status,
    "Fecha aprobacion del proyecto ": approvalDate,
    "Fecha inicio del proyecto ": kickoffDate,
    "Fecha Ideal final de proyecto ": expectedEndDate,
    "Fecha real final de proyecto ": realEndDate,
    "Días fuera de plazo del proyecto ": daysOverdue,
    "Mantenimiento o Administracion ": maintenance,
    "Fecha cancelacion ": cancellationDate,
    "Motivo de cancelación ": cancellationReason,

    // Trimmed headers for flexible matching:
    "ID": id,
    "id": id,
    " ": id,
    "": id,
    "ID Lead": leadId,
    "ID Propuesta Original": originalProposalId,
    "Empresa": companyName,
    "Nombre del proyecto": projectName,
    "Fecha 90/10": date9010,
    "90/10 realizado": is9010,
    "Fecha Presentacion": datePres,
    "Presentacion realizada": isPres,
    "Tipo de Proyecto": projectType,
    "Numero Trabajadores": workersCount,
    "Impuestos Incluidos": taxesIncluded,
    "Tipo de cobro": paymentType,
    "Costo Mano de Obra": laborCost,
    "Escala de Proyecto": scale,
    "Comisión Stratux": stratuxCommission,
    "ID Referidor": referrerId,
    "Comisión Referidor": referrerCommission,
    "Total antes de impuestos": totalBeforeTaxes,
    "Porcentaje impuestos": taxPercentage,
    "Monto final Stratux": finalStratuxAmount,
    "Licencias de Terceros anual Bs": licensesAmount,
    "Monto Final más Licencias": finalAmountPlusLicenses,
    "Contactos": contacts,
    "Estado del proyecto": status,
    "Fecha aprobacion del proyecto": approvalDate,
    "Fecha inicio del proyecto": kickoffDate,
    "Fecha Ideal final de proyecto": expectedEndDate,
    "Fecha real final de proyecto": realEndDate,
    "Días fuera de plazo del proyecto": daysOverdue,
    "Mantenimiento o Administracion": maintenance,
    "Fecha cancelacion": cancellationDate,
    "Motivo de cancelación": cancellationReason,
  };
}

/**
 * Maps a Referrer object into the exact column headers of Google Sheets "REFERIDORES".
 */
export function formatReferrerForSheet(referrer: any): Record<string, string> {
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const id = referrer.id || "";
  const name = referrer.name || "";
  const nickname = referrer.nickname || "";
  const joinDate = formatDate(referrer.joinDate || new Date().toISOString());
  const whatsapp = referrer.whatsapp || "";
  const email = referrer.email || "";
  const projectsCount = (referrer.projectsCount ?? 0).toString();
  const totalEarned = (referrer.totalEarned ?? 0).toString();

  return {
    "ID Referidor": id,
    "Nombre": name,
    "Apodo": nickname,
    "Fecha de Ingreso": joinDate,
    "WhatsApp": whatsapp,
    "Correo": email,
    "Proyectos": projectsCount,
    "Total Ganado": totalEarned,

    // Aliases for flexible matching in Google Apps Script
    "ID": id,
    "id": id,
    "name": name,
    "nombre": name,
    "apodo": nickname,
    "telefono": whatsapp,
    "whatsapp": whatsapp,
    "email": email,
    "correo": email,
  };
}

/**
 * Maps a Lead object into the exact column headers of Google Sheets "REGISTRO DE LEADS".
 */
export function formatLeadForSheet(lead: any): Record<string, string> {
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear().toString().slice(-2); // e.g. 26
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const id = lead.id || "";
  const leadDate = formatDate(lead.leadDate || lead.createdAt || new Date().toISOString());
  const firstName = lead.firstName || "";
  const lastName = lead.lastName || "";
  const companyName = lead.companyName || "";
  const rubro = lead.rubro || "";
  const whatsapp = lead.whatsapp || "";
  const email = lead.email || "";
  const budget = lead.budget !== undefined && lead.budget !== null
    ? (typeof lead.budget === "number" ? `$${lead.budget.toLocaleString("en-US")}` : lead.budget.toString())
    : "";
  const businessProblems = lead.businessProblems || "";
  const leadRating = (lead.leadRating ?? lead.rating ?? 3).toString();

  return {
    "ID Lead": id,
    "Fecha Lead": leadDate,
    "Nombre": firstName,
    "Apellido": lastName,
    "Empresa": companyName,
    "Rubro": rubro,
    "WhatsApp": whatsapp,
    "Correo Electrónico": email,
    "Presupuesto": budget,
    "Problemas Empresariales": businessProblems,
    "Calificacion Lead": leadRating,

    // Aliases for flexible matching in Google Apps Script
    "id": id,
    "ID": id,
    "idlead": id,
    "fecha": leadDate,
    "nombre": firstName,
    "apellido": lastName,
    "empresa": companyName,
    "rubro": rubro,
    "telefono": whatsapp,
    "whatsapp": whatsapp,
    "email": email,
    "correo": email,
    "correo electronico": email,
    "correo electrónico": email,
    "presupuesto": budget,
    "budget": budget,
    "problemas": businessProblems,
    "problemas empresariales": businessProblems,
    "rating": leadRating,
    "score": leadRating,
    "calificacion": leadRating,
    "calificación": leadRating,
    "calificacion lead": leadRating,
    "calificación lead": leadRating,
  };
}

/**
 * Maps a Collection object into the exact column headers of Google Sheets "Cobros".
 */
export function formatCollectionForSheet(collection: any): Record<string, string> {
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const id = collection.id || "";
  const projectId = collection.projectId || "";
  const date = formatDate(collection.date || collection.createdAt || new Date().toISOString());
  const method = collection.method || "Transferencia Bancaria";
  const concept = collection.concept || "";
  const grossAmount = (collection.grossAmount ?? 0).toString();
  const scale = collection.scale || "XP";
  const taxPercentage = (collection.taxPercentage ?? 0).toString();
  const postTaxAmount = (collection.postTaxAmount ?? collection.grossAmount ?? 0).toString();
  const referrerId = collection.referrerId || "";
  const referrerCommission = (collection.referrerCommission ?? 0).toString();
  const stratuxCommission = (collection.stratuxCommission ?? 0).toString();
  const laborCost = (collection.laborCost ?? 0).toString();
  const netAmount = (collection.netAmount ?? collection.stratuxCommission ?? 0).toString();

  return {
    "ID Cobro": id,
    "ID Proyecto": projectId,
    "Fecha": date,
    "Metodo de cobro": method,
    "Concepto": concept,
    "Monto Bruto": grossAmount,
    "Escala": scale,
    "% Impuestos": taxPercentage,
    "Total post Impuestos": postTaxAmount,
    "ID Referidor": referrerId,
    "Comisión Referidor": referrerCommission,
    "Comisión Stratux": stratuxCommission,
    "Costo Mano de Obra": laborCost,
    "Monto Final Stratux": netAmount,

    // Aliases for flexible matching in Apps Script
    "id": id,
    "ID": id,
    "projectId": projectId,
    "proyectoId": projectId,
    "date": date,
    "fecha": date,
    "method": method,
    "metodoCobro": method,
    "concept": concept,
    "grossAmount": grossAmount,
    "montoBruto": grossAmount,
    "scale": scale,
    "taxPercentage": taxPercentage,
    "postTaxAmount": postTaxAmount,
    "referrerId": referrerId,
    "referrerCommission": referrerCommission,
    "stratuxCommission": stratuxCommission,
    "laborCost": laborCost,
    "netAmount": netAmount,
  };
}

/**
 * Maps a Payment object into the exact column headers of Google Sheets "Pagos".
 */
export function formatPaymentForSheet(payment: any): Record<string, string> {
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const id = payment.id || "";
  const date = formatDate(payment.date || payment.createdAt || new Date().toISOString());
  const category = payment.category || "General";
  const concept = payment.concept || "";
  const receiverName = payment.receiverName || "Proveedor";
  const method = payment.method || "Transferencia Bancaria";
  const amount = (payment.amount ?? 0).toString();
  const referrerId = payment.referrerId || "";
  const referrerNotified = payment.referrerNotified ? "SI" : "NO";

  return {
    "ID Pago": id,
    "Fecha": date,
    "Categoría": category,
    "Concepto": concept,
    "Proveedor": receiverName,
    "Método de pago": method,
    "Monto": amount,
    "ID Referidor": referrerId,
    "Referidor Notificado": referrerNotified,

    // Aliases for flexible matching in Apps Script
    "id": id,
    "ID": id,
    "date": date,
    "fecha": date,
    "category": category,
    "categoria": category,
    "concept": concept,
    "receiverName": receiverName,
    "proveedor": receiverName,
    "method": method,
    "metodoPago": method,
    "amount": amount,
    "monto": amount,
    "referrerId": referrerId,
  };
}

/**
 * Maps Cashflow data into the exact column headers of Google Sheets "Flujo Mensual".
 */
export function formatCashflowForSheet(item: { month: string; income: number; expenses: number; net: number }): Record<string, string> {
  return {
    "Mes": item.month,
    "Ingresos Brutos": item.income.toString(),
    "Egresos Totales": item.expenses.toString(),
    "Balance Neto": item.net.toString(),
  };
}

/**
 * Maps a Feedback object into the exact column headers of Google Sheets "FEEDBACK CLIENTES".
 */
export function formatFeedbackForSheet(feedback: any): Record<string, string> {
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const id = feedback.id || "";
  const projectId = feedback.projectId || "";
  const customerId = feedback.customerId || feedback.clientId || "";
  const customerName = feedback.customerName || feedback.name || "";
  const date = formatDate(feedback.date || new Date().toISOString());
  const csat = feedback.csat !== undefined && feedback.csat !== null ? feedback.csat.toString() : "";
  const nps = feedback.nps !== undefined && feedback.nps !== null ? feedback.nps.toString() : "";
  const ces = feedback.ces !== undefined && feedback.ces !== null ? feedback.ces.toString() : "";
  const productQuality = feedback.productQuality !== undefined && feedback.productQuality !== null ? feedback.productQuality.toString() : "";
  const customerService = feedback.customerService !== undefined && feedback.customerService !== null ? feedback.customerService.toString() : "";
  const responseTime = feedback.responseTime !== undefined && feedback.responseTime !== null ? feedback.responseTime.toString() : "";
  const easeOfUse = feedback.easeOfUse !== undefined && feedback.easeOfUse !== null ? feedback.easeOfUse.toString() : "";
  const valueForPrice = feedback.valueForPrice !== undefined && feedback.valueForPrice !== null ? feedback.valueForPrice.toString() : "";
  const openComment = feedback.openComment || feedback.comment || "";

  return {
    "ID feedback": id,
    "ID Proyecto": projectId,
    "ID cliente": customerId,
    "Nombre": customerName,
    "Fecha": date,
    "CSAT (1-5)": csat,
    "NPS (1-10)": nps,
    "CES (1-5)": ces,
    "Calidad Producto (1-5)": productQuality,
    "Servicio Cliente (1-5)": customerService,
    "Tiempo Respuesta (1-5)": responseTime,
    "Facilidad Uso (1-5)": easeOfUse,
    "Valor Precio (1-5)": valueForPrice,
    "Comentario abierto": openComment,

    // Aliases for flexible matching in Apps Script
    "id": id,
    "ID": id,
    "idFeedback": id,
    "projectId": projectId,
    "idProyecto": projectId,
    "customerId": customerId,
    "idCliente": customerId,
    "customerName": customerName,
    "name": customerName,
    "date": date,
    "fecha": date,
    "csat": csat,
    "nps": nps,
    "ces": ces,
    "productQuality": productQuality,
    "customerService": customerService,
    "responseTime": responseTime,
    "easeOfUse": easeOfUse,
    "valueForPrice": valueForPrice,
    "openComment": openComment,
    "comment": openComment,
  };
}

