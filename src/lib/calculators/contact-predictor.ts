import { differenceInDays, addDays, isBefore, startOfDay } from "date-fns";

export interface ContactPredictorInput {
  contactDates: Date[];
  currentDate?: Date;
}

export interface ContactPrediction {
  nextContactDate: Date | null;
  daysUntilNext: number | null;
  status: "SUGGESTED" | "OVERDUE" | "NO_CONTACTS";
}

export function predictNextContact({ contactDates, currentDate = new Date() }: ContactPredictorInput): ContactPrediction {
  if (!contactDates || contactDates.length === 0) {
    return {
      nextContactDate: null,
      daysUntilNext: null,
      status: "NO_CONTACTS",
    };
  }

  // Sort dates ascending to get the latest one safely
  const sortedDates = [...contactDates].sort((a, b) => a.getTime() - b.getTime());
  const lastContactDate = sortedDates[sortedDates.length - 1];
  
  const daysToAdd = contactDates.length < 5 ? 3 : 7;
  const nextContactDate = addDays(lastContactDate, daysToAdd);
  
  const normalizedCurrent = startOfDay(currentDate);
  const normalizedNext = startOfDay(nextContactDate);

  const isOverdue = isBefore(normalizedNext, normalizedCurrent);
  const daysUntilNext = differenceInDays(normalizedNext, normalizedCurrent);

  return {
    nextContactDate,
    daysUntilNext,
    status: isOverdue ? "OVERDUE" : "SUGGESTED",
  };
}
