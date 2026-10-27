import { create } from 'zustand';

import { ScaleType } from '@/lib/pricing-calculator';
export type { ScaleType };
export type PaymentType = '50%/50%' | 'Diferido en X meses' | 'Mensual indefinido';

export interface ProposalState {
  // Step 1: Lead
  leadId: string | null;
  leadName: string | null;

  // Step 2: Detalles
  projectName: string;
  is9010Completed: boolean;
  date9010: Date | null;
  projectType: string[];
  workersCount: number; // 1, 2, 3
  isIteration: boolean;
  originalProposalId: string | null;
  versionNumber: number;

  // Step 3: Cotización
  hasLaborCost: boolean;
  laborCost: number;
  scale: ScaleType;
  hasReferral: boolean;
  referralId: string | null;
  hasTaxes: boolean;
  taxPercentage: number;
  thirdPartyLicenses: number;
  paymentType: PaymentType;
  deferredPaymentsCount: number;

  // Step 4: Fechas
  presentationDate: Date | null;
  hasStartDate: boolean;
  startDate: Date | null;
  hasExpectedEndDate: boolean;
  expectedEndDate: Date | null;
  fromSimulator: boolean;

  // Acciones
  setLeadId: (id: string | null) => void;
  updateDetails: (details: Partial<ProposalState>) => void;
  updateQuote: (quote: Partial<ProposalState>) => void;
  updateDates: (dates: Partial<ProposalState>) => void;
  reset: () => void;
}

const initialState = {
  leadId: null,
  leadName: null,
  projectName: '',
  is9010Completed: false,
  date9010: null,
  projectType: [],
  workersCount: 1,
  isIteration: false,
  originalProposalId: null,
  versionNumber: 1,
  hasLaborCost: true,
  laborCost: 0,
  scale: 'XP' as ScaleType,
  hasReferral: false,
  referralId: null,
  hasTaxes: true,
  taxPercentage: 27,
  thirdPartyLicenses: 0,
  paymentType: '50%/50%' as PaymentType,
  deferredPaymentsCount: 2,
  presentationDate: null,
  hasStartDate: true,
  startDate: null,
  hasExpectedEndDate: true,
  expectedEndDate: null,
  fromSimulator: false,
};

export const useProposalStore = create<ProposalState>((set) => ({
  ...initialState,
  setLeadId: (id) => set({ leadId: id }),
  updateDetails: (details) => set((state) => ({ ...state, ...details })),
  updateQuote: (quote) => set((state) => ({ ...state, ...quote })),
  updateDates: (dates) => set((state) => ({ ...state, ...dates })),
  reset: () => set(initialState),
}));
