import type { Modifier } from "@dnd-kit/core";

/** Przeciąganie tylko w pionie (bez dodatkowej paczki @dnd-kit/modifiers). */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
