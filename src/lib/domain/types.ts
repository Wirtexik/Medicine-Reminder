// Model danych zgodny z docs/PROJEKT.md §6 (pola w camelCase).

/** Data kalendarzowa w strefie Europe/Warsaw, format yyyy-MM-dd. */
export type DateKey = string;

export type MedForm = "tablet" | "capsule" | "drops" | "syrup";
export type StrengthUnit = "mg" | "µg" | "ml" | "krople";
export type UnitLabel = "tabl." | "kaps." | "ml" | "krople";

export interface TimeSlot {
  id: string;
  name: string;
  sortOrder: number;
  /** Godzina przypomnienia o nieodhaczonych, HH:mm; "" = bez przypomnienia. */
  reminderTime: string;
  /** Wyłączonej pory nie wybiera się przy nowych dawkach i nie ma z niej przypomnień. */
  isActive: boolean;
}

export interface MedPackage {
  id: string;
  strengthValue: number;
  strengthUnit: StrengthUnit;
  unitLabel: UnitLabel;
  packageSize: number;
  stock: number;
}

export interface DosePart {
  packageId: string;
  quantity: number;
}

export interface PeriodDose {
  id: string;
  slotId: string;
  /** Opcjonalna dokładna godzina, HH:mm. */
  exactTime: string | null;
  sortOrder: number;
  parts: DosePart[];
}

export interface DosingPeriod {
  id: string;
  validFrom: DateKey;
  validTo: DateKey | null;
  doses: PeriodDose[];
}

export interface Medication {
  id: string;
  name: string;
  form: MedForm;
  description: string;
  lowStockDays: number | null;
  isArchived: boolean;
  packages: MedPackage[];
  periods: DosingPeriod[];
}

export interface Intake {
  doseId: string;
  date: DateKey;
}

export interface AppData {
  slots: TimeSlot[];
  medications: Medication[];
  intakes: Intake[];
  defaultLowStockDays: number;
}
