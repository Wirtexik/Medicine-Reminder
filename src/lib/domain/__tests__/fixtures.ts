import type { AppData, DosingPeriod, Intake, MedPackage, Medication, PeriodDose, TimeSlot } from "../types";

export const slots: TimeSlot[] = [
  { id: "rano", name: "Rano", sortOrder: 1, reminderTime: "08:00", isActive: true },
  { id: "poludnie", name: "Południe", sortOrder: 2, reminderTime: "", isActive: true },
  { id: "wieczor", name: "Wieczór", sortOrder: 3, reminderTime: "20:00", isActive: true },
];

export function pkg(id: string, over: Partial<MedPackage> = {}): MedPackage {
  return { id, strengthValue: 10, strengthUnit: "mg", unitLabel: "tabl.", packageSize: 30, stock: 30, ...over };
}

export function dose(id: string, slotId: string, parts: [string, number][], over: Partial<PeriodDose> = {}): PeriodDose {
  return {
    id,
    slotId,
    exactTime: null,
    sortOrder: 0,
    parts: parts.map(([packageId, quantity]) => ({ packageId, quantity })),
    ...over,
  };
}

export function period(id: string, validFrom: string, validTo: string | null, doses: PeriodDose[]): DosingPeriod {
  return { id, validFrom, validTo, doses };
}

export function med(id: string, over: Partial<Medication> = {}): Medication {
  return {
    id,
    name: id,
    form: "tablet",
    description: "",
    lowStockDays: null,
    isArchived: false,
    packages: [],
    periods: [],
    ...over,
  };
}

export function appData(medications: Medication[], intakes: Intake[] = [], defaultLowStockDays = 7): AppData {
  return { slots, medications, intakes, defaultLowStockDays };
}
