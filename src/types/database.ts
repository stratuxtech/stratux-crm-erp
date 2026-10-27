import { z } from "zod";

// Función helper para hacer los campos seguros
const safeField = <T extends z.ZodTypeAny>(schema: T) => 
  schema.optional().nullable().catch(null);

// --- REFERIDORES ---
export const ReferrerSchema = z.object({
  id: z.string(), // ID Referidor
  name: z.string(), // Nombre
  nickname: safeField(z.string()), // Apodo
  joinDate: safeField(z.string()), // Fecha de Ingreso
  whatsapp: safeField(z.string()), // WhatsApp
  email: safeField(z.string()), // Correo
  projectsCount: safeField(z.number()), // Proyectos
  totalEarned: safeField(z.number()), // Total Ganado
  
  // Backwards compatibility for UI
  commissionRate: safeField(z.number()),
  contactInfo: safeField(z.string()),
});
export type Referrer = z.infer<typeof ReferrerSchema>;

// --- LEADS ---
export const LeadSchema = z.object({
  id: z.string(), // ID Lead
  leadDate: safeField(z.string()), // Fecha Lead
  firstName: safeField(z.string()), // Nombre
  lastName: safeField(z.string()), // Apellido
  companyName: z.string(), // Empresa
  rubro: safeField(z.string()), // Rubro
  whatsapp: safeField(z.string()), // WhatsApp
  email: safeField(z.string()), // Correo
  budget: safeField(z.number()), // Presupuesto
  businessProblems: safeField(z.string()), // Problemas Empresariales
  leadRating: safeField(z.number()), // Calificacion Lead
  
  // Backwards compatibility for UI
  status: safeField(z.string()),
  createdAt: safeField(z.string()),
  contactName: safeField(z.string()),
  source: safeField(z.string()),
});
export type Lead = z.infer<typeof LeadSchema>;

// --- PROPUESTAS / PROYECTOS ---
export const ProjectSchema = z.object({
  id: z.string(), // ID Propuesta (also ID Proyecto)
  leadId: safeField(z.string()), // ID Lead
  companyName: z.string(), // Empresa
  projectName: safeField(z.string()), // Nombre proyecto
  originalProposalId: safeField(z.string()), // ID Propuesta Base para iteraciones
  versionNumber: safeField(z.number()), // Número de versión (1, 2, 3...)
  version: safeField(z.string()), // Código de versión (V1, V2, etc.)
  date9010: safeField(z.string()), // Fecha 90/10
  presentationDone: safeField(z.boolean()), // Presentacion realizada
  projectType: safeField(z.string()), // Tipo de Proyecto
  workersCount: safeField(z.number()), // Numero Trabajadores
  taxesIncluded: safeField(z.boolean()), // Impuestos Incluidos
  paymentType: safeField(z.string()), // Tipo de cobro
  laborCost: safeField(z.number()), // Costo Mano de Obra
  scale: safeField(z.enum(["XP", "P", "M", "L", "XL", "XXL", "S"])), // Escala de Proyecto
  stratuxCommission: safeField(z.number()), // Comisión Stratux
  referrerId: safeField(z.string()), // ID Referidor
  referrerCommission: safeField(z.number()), // Comisión Referidor
  taxPercentage: safeField(z.number()), // Porcentaje impuestos
  finalStratuxAmount: safeField(z.number()), // Monto final Stratux
  licensesAmount: safeField(z.number()), // Licencias
  finalAmountPlusLicenses: safeField(z.number()), // Monto Final más Licencias
  status: safeField(z.string()), // Estado del proyecto
  
  // Fechas (aprobacion, inicio, fin ideal, fin real, cancelacion)
  approvalDate: safeField(z.string()),
  kickoffDate: safeField(z.string()), // inicio
  expectedEndDate: safeField(z.string()), // fin ideal
  realEndDate: safeField(z.string()), // fin real
  cancellationDate: safeField(z.string()), // cancelacion
  
  daysOverdue: safeField(z.number()), // Días fuera de plazo
  cancellationReason: safeField(z.string()), // Motivo cancelación
  
  // Backwards compatibility for UI
  rating: safeField(z.number()),
  totalAmount: safeField(z.number()),
  metrics: safeField(z.object({
    moneyLostDueToDelay: safeField(z.number()),
    uncollectedMoney: safeField(z.number()),
  })),
  rubro: safeField(z.string()),
  whatsapp: safeField(z.string()),
  email: safeField(z.string()),
  createdAt: safeField(z.string()),
});
export type Project = z.infer<typeof ProjectSchema>;

// --- FINANZAS (Cobros) ---
export const CollectionSchema = z.object({
  id: z.string(), // ID Cobro
  projectId: safeField(z.string()), // ID Proyecto
  date: safeField(z.string()), // Fecha
  method: safeField(z.string()), // Metodo cobro
  concept: safeField(z.string()), // Concepto
  grossAmount: safeField(z.number()), // Monto Bruto
  taxPercentage: safeField(z.number()), // % Impuestos
  postTaxAmount: safeField(z.number()), // Total post Impuestos
  referrerId: safeField(z.string()), // ID Referidor
  referrerCommission: safeField(z.number()), // Comisión Referidor
  stratuxCommission: safeField(z.number()), // Comisión Stratux
  laborCost: safeField(z.number()), // Costo Mano Obra
  netAmount: safeField(z.number()), // Monto Final Stratux (Net Amount)
  
  // Backwards compatibility for UI
  scale: safeField(z.string()),
  createdAt: safeField(z.string()),
});
export type Collection = z.infer<typeof CollectionSchema>;

// --- FINANZAS (Pagos) ---
export const PaymentSchema = z.object({
  id: z.string(), // ID Pago
  date: safeField(z.string()), // Fecha
  category: safeField(z.string()), // Categoría
  concept: safeField(z.string()), // Concepto
  receiverName: safeField(z.string()), // Proveedor
  method: safeField(z.string()), // Método pago
  amount: safeField(z.number()), // Monto
  referrerId: safeField(z.string()), // ID Referidor
  referrerNotified: safeField(z.boolean()), // Referidor Notificado
  
  // Backwards compatibility for UI
  remainingCashflow: safeField(z.number()),
  projectId: safeField(z.string()),
  createdAt: safeField(z.string()),
});
export type Payment = z.infer<typeof PaymentSchema>;

// --- FEEDBACK CLIENTES ---
export const FeedbackSchema = z.object({
  id: z.string(), // ID feedback
  projectId: safeField(z.string()), // ID Proyecto
  customerId: safeField(z.string()), // ID cliente
  customerName: safeField(z.string()), // Nombre
  date: safeField(z.string()), // Fecha
  csat: safeField(z.number()), // CSAT
  nps: safeField(z.number()), // NPS
  ces: safeField(z.number()), // CES
  productQuality: safeField(z.number()), // Calidad Producto
  customerService: safeField(z.number()), // Servicio Cliente
  responseTime: safeField(z.number()), // Tiempo Respuesta
  easeOfUse: safeField(z.number()), // Facilidad Uso
  valueForPrice: safeField(z.number()), // Valor Precio
  openComment: safeField(z.string()), // Comentario abierto
});
export type Feedback = z.infer<typeof FeedbackSchema>;

// --- DB ROOT SCHEMA ---
export const DatabaseSchema = z.object({
  referrers: z.array(ReferrerSchema).default([]),
  leads: z.array(LeadSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  payments: z.array(PaymentSchema).default([]),
  collections: z.array(CollectionSchema).default([]),
  feedback: z.array(FeedbackSchema).default([]),
});
export type Database = z.infer<typeof DatabaseSchema>;
