// null always means "unknown", never zero.

const AED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});

const AED_EXACT = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT = new Intl.NumberFormat("en-AE", { notation: "compact", maximumFractionDigits: 1 });
const HOURS = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 1 });
const RATE = new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const EMPTY = "—";

export function money(value: number | null | undefined): string {
  return value == null ? EMPTY : AED.format(value);
}

export function moneyExact(value: number | null | undefined): string {
  return value == null ? EMPTY : AED_EXACT.format(value);
}

export function moneyCompact(value: number | null | undefined): string {
  return value == null ? EMPTY : `AED ${COMPACT.format(value)}`;
}

export function hours(value: number | null | undefined): string {
  return value == null ? EMPTY : `${HOURS.format(value)} h`;
}

export function hoursPlain(value: number | null | undefined): string {
  return value == null ? EMPTY : HOURS.format(value);
}

export function rate(value: number | null | undefined): string {
  return value == null ? EMPTY : `AED ${RATE.format(value)}/h`;
}

/** Takes a ratio in 0–1. */
export function percent(value: number | null | undefined, digits = 1): string {
  return value == null ? EMPTY : `${(value * 100).toFixed(digits)}%`;
}

export function signedPercent(value: number | null | undefined, digits = 1): string {
  if (value == null) return EMPTY;
  const formatted = `${(value * 100).toFixed(digits)}%`;
  return value > 0 ? `+${formatted}` : formatted;
}

/** Project names are proposal filenames; the original is kept on the cell title. */
export function projectLabel(name: string): string {
  const cleaned = name
    .replace(/\.(pdf|docx?|xlsx?)$/i, "")
    .replace(/[-_\s]*COMMERCIAL$/i, "")
    .replace(/[-_\s]*\d{6,8}$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return cleaned || name;
}

export function marginTone(value: number | null | undefined): string {
  if (value == null) return "text-muted-foreground";
  if (value < 0) return "text-destructive";
  if (value < 0.15) return "text-amber-600 dark:text-amber-500";
  return "text-foreground";
}
