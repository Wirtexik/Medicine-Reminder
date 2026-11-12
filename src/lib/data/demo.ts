import { shiftDay } from "../dates";
import type { AppData, DateKey, Intake, Medication, TimeSlot } from "../domain/types";

/*
  DANE PRZYKŁADOWE (syntetyczne). Służą do pracy nad interfejsem, dopóki
  aplikacja nie jest połączona z Supabase. Nazwy leków są realne, dawkowania
  i stany są zmyślone. Do zastąpienia danymi użytkownika.
*/

export const DEFAULT_SLOTS: TimeSlot[] = [
  { id: "s-przed-sniadaniem", name: "Przed śniadaniem", sortOrder: 1, reminderTime: "12:00" },
  { id: "s-po-sniadaniu", name: "Po śniadaniu", sortOrder: 2, reminderTime: "12:00" },
  { id: "s-przed-obiadem", name: "Przed obiadem", sortOrder: 3, reminderTime: "17:00" },
  { id: "s-po-obiedzie", name: "Po obiedzie", sortOrder: 4, reminderTime: "17:00" },
  { id: "s-przed-kolacja", name: "Przed kolacją", sortOrder: 5, reminderTime: "23:00" },
  { id: "s-po-kolacji", name: "Po kolacji", sortOrder: 6, reminderTime: "23:00" },
  { id: "s-na-noc", name: "Na noc", sortOrder: 7, reminderTime: "23:00" },
];

export function buildDemoData(today: DateKey): AppData {
  const d = (n: number) => shiftDay(today, n);

  const medications: Medication[] = [
    {
      id: "m-euthyrox",
      name: "Euthyrox",
      form: "tablet",
      description: "Na czczo, popić wodą. Śniadanie najwcześniej po 30 minutach.",
      lowStockDays: null,
      isArchived: false,
      packages: [
        { id: "p-euthyrox-50", strengthValue: 50, strengthUnit: "µg", unitLabel: "tabl.", packageSize: 100, stock: 63 },
      ],
      periods: [
        {
          id: "pr-euthyrox-1",
          validFrom: d(-60),
          validTo: null,
          doses: [{ id: "d-euthyrox", slotId: "s-przed-sniadaniem", exactTime: null, sortOrder: 1, parts: [{ packageId: "p-euthyrox-50", quantity: 1 }] }],
        },
      ],
    },
    {
      id: "m-prednizon",
      name: "Prednizon",
      form: "tablet",
      description: "Dawka zmniejszana stopniowo. Przyjmować po posiłku.",
      lowStockDays: null,
      isArchived: false,
      packages: [
        { id: "p-prednizon-20", strengthValue: 20, strengthUnit: "mg", unitLabel: "tabl.", packageSize: 20, stock: 14 },
        { id: "p-prednizon-10", strengthValue: 10, strengthUnit: "mg", unitLabel: "tabl.", packageSize: 20, stock: 4 },
      ],
      periods: [
        {
          id: "pr-prednizon-1",
          validFrom: d(-10),
          validTo: d(5),
          doses: [
            {
              id: "d-prednizon-30",
              slotId: "s-po-sniadaniu",
              exactTime: null,
              sortOrder: 2,
              parts: [
                { packageId: "p-prednizon-20", quantity: 1 },
                { packageId: "p-prednizon-10", quantity: 1 },
              ],
            },
          ],
        },
        {
          id: "pr-prednizon-2",
          validFrom: d(6),
          validTo: null,
          doses: [{ id: "d-prednizon-20", slotId: "s-po-sniadaniu", exactTime: null, sortOrder: 2, parts: [{ packageId: "p-prednizon-20", quantity: 1 }] }],
        },
      ],
    },
    {
      id: "m-ramipril",
      name: "Ramipril",
      form: "capsule",
      description: "",
      lowStockDays: null,
      isArchived: false,
      packages: [{ id: "p-ramipril-5", strengthValue: 5, strengthUnit: "mg", unitLabel: "kaps.", packageSize: 28, stock: 26 }],
      periods: [
        {
          id: "pr-ramipril-1",
          validFrom: d(-60),
          validTo: null,
          doses: [{ id: "d-ramipril", slotId: "s-po-sniadaniu", exactTime: null, sortOrder: 1, parts: [{ packageId: "p-ramipril-5", quantity: 1 }] }],
        },
      ],
    },
    {
      id: "m-metformina",
      name: "Metformina",
      form: "tablet",
      description: "W trakcie posiłku lub tuż po nim.",
      lowStockDays: 10,
      isArchived: false,
      packages: [{ id: "p-metformina-500", strengthValue: 500, strengthUnit: "mg", unitLabel: "tabl.", packageSize: 60, stock: 82 }],
      periods: [
        {
          id: "pr-metformina-1",
          validFrom: d(-60),
          validTo: null,
          doses: [
            { id: "d-metformina-r", slotId: "s-po-sniadaniu", exactTime: null, sortOrder: 3, parts: [{ packageId: "p-metformina-500", quantity: 1 }] },
            { id: "d-metformina-o", slotId: "s-po-obiedzie", exactTime: "14:00", sortOrder: 1, parts: [{ packageId: "p-metformina-500", quantity: 1 }] },
            { id: "d-metformina-k", slotId: "s-po-kolacji", exactTime: null, sortOrder: 1, parts: [{ packageId: "p-metformina-500", quantity: 1 }] },
          ],
        },
      ],
    },
    {
      id: "m-atorwastatyna",
      name: "Atorwastatyna",
      form: "tablet",
      description: "",
      lowStockDays: null,
      isArchived: false,
      packages: [{ id: "p-atorwa-20", strengthValue: 20, strengthUnit: "mg", unitLabel: "tabl.", packageSize: 30, stock: 41 }],
      periods: [
        {
          id: "pr-atorwa-1",
          validFrom: d(-60),
          validTo: null,
          doses: [{ id: "d-atorwa", slotId: "s-na-noc", exactTime: null, sortOrder: 1, parts: [{ packageId: "p-atorwa-20", quantity: 1 }] }],
        },
      ],
    },
    {
      id: "m-timolol",
      name: "Timolol",
      form: "drops",
      description: "Po jednej kropli do każdego oka. Butelkę wyrzucić 4 tygodnie po otwarciu.",
      lowStockDays: null,
      isArchived: false,
      packages: [{ id: "p-timolol", strengthValue: 1, strengthUnit: "krople", unitLabel: "krople", packageSize: 100, stock: 58 }],
      periods: [
        {
          id: "pr-timolol-1",
          validFrom: d(-60),
          validTo: null,
          doses: [{ id: "d-timolol", slotId: "s-na-noc", exactTime: null, sortOrder: 2, parts: [{ packageId: "p-timolol", quantity: 2 }] }],
        },
      ],
    },
  ];

  // Historia: od początku okresów, z kilkoma pominięciami. Dziś: tylko Euthyrox.
  const allDoses = [
    "d-euthyrox",
    "d-prednizon-30",
    "d-ramipril",
    "d-metformina-r",
    "d-metformina-o",
    "d-metformina-k",
    "d-atorwa",
    "d-timolol",
  ];
  const skipped: Record<number, string[] | "all"> = {
    [-1]: ["d-metformina-k", "d-timolol"],
    [-4]: ["d-metformina-o"],
    [-7]: "all",
    [-9]: ["d-atorwa", "d-timolol", "d-metformina-k"],
  };
  const intakes: Intake[] = [];
  for (let n = -60; n <= -1; n++) {
    const skip = skipped[n];
    if (skip === "all") continue;
    for (const doseId of allDoses) {
      if (doseId === "d-prednizon-30" && n < -10) continue;
      if (skip?.includes(doseId)) continue;
      intakes.push({ doseId, date: d(n) });
    }
  }
  intakes.push({ doseId: "d-euthyrox", date: today });

  return { slots: DEFAULT_SLOTS, medications, intakes, defaultLowStockDays: 7 };
}
