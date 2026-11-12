import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import type { DateKey } from "./domain/types";

export const TIME_ZONE = "Europe/Warsaw";

/** Dzisiejsza data w Warszawie. */
export function todayKey(now: Date = new Date()): DateKey {
  return format(new TZDate(now, TIME_ZONE), "yyyy-MM-dd");
}

/** Bieżąca godzina w Warszawie jako HH:mm. */
export function nowTime(now: Date = new Date()): string {
  return format(new TZDate(now, TIME_ZONE), "HH:mm");
}

export function shiftDay(key: DateKey, days: number): DateKey {
  return format(addDays(parseISO(key), days), "yyyy-MM-dd");
}

export function dayDiff(a: DateKey, b: DateKey): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b));
}

export function weekdayName(key: DateKey): string {
  return format(parseISO(key), "EEEE", { locale: pl });
}

/** „12 listopada” */
export function longDate(key: DateKey): string {
  return format(parseISO(key), "d MMMM", { locale: pl });
}

/** „12.11” */
export function shortDate(key: DateKey): string {
  return format(parseISO(key), "dd.MM");
}

export function monthTitle(key: DateKey): string {
  return format(parseISO(key), "LLLL yyyy", { locale: pl });
}

/** Miesiąc daty jako „yyyy-MM”. */
export function monthOf(key: DateKey): string {
  return key.slice(0, 7);
}

export function shiftMonth(month: string, months: number): string {
  return format(addMonths(parseISO(`${month}-01`), months), "yyyy-MM");
}

/** Pierwszy i ostatni dzień miesiąca „yyyy-MM”. */
export function monthRange(month: string): [DateKey, DateKey] {
  const first = parseISO(`${month}-01`);
  return [format(first, "yyyy-MM-dd"), format(endOfMonth(first), "yyyy-MM-dd")];
}
