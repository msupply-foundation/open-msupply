/**
 * The NumberField state machine, as pure functions (no DOM, no signals) so the
 * tricky behaviour is unit-testable in vitest's node environment. The
 * component (NumberField.tsx) only wires these to events.
 *
 * The model (see the component header for the full contract):
 * - `processInput` runs on every input event over the whole prospective text:
 *   normalise → gate → (repair) → optionally commit. Committed values are
 *   always valid (rounded + clamped); the *text* is never rewritten to the
 *   clamped value mid-typing — canonicalising the display is `finalizeText`'s
 *   job (blur/Enter).
 * - "Incomplete" text ("-", "1.", "") is accepted as text but commits nothing
 *   (except clearing, which commits undefined immediately).
 * - All locale awareness comes from getNumberSymbols/parseNumber/formatNumber
 *   in src/intl — the same layer the coming Currency field will use.
 */
import {
  formatNumber,
  getNumberSymbols,
  parseNumber,
  type NumberSymbols,
} from '../../../intl/formatNumber';
import type { SupportedLocale } from '../../../intl/locales';

export type NumberFieldConstraints = {
  min: number;
  max: number;
  /** Max decimal places typeable/committed; 0 = integers. */
  decimalLimit: number;
  /** Pad the blurred display to at least this many decimals ("1" → "1.00"). */
  decimalMin?: number;
  /** Plain `String(value)` display — no grouping, no locale digits. */
  noFormatting?: boolean;
};

export type ProcessedInput =
  { accepted: false } | { accepted: true; text: string; commit?: CommitResult };

/**
 * A committed value plus, when the round/clamp CHANGED what the text parsed
 * to, the number the user actually entered — how the component detects an
 * adjusted entry (its `onClamped`). Absent whenever the entry committed
 * as typed.
 */
export type CommitResult = { value: number | undefined; adjustedFrom?: number };

// Matches Latin, Arabic-Indic and extended-Arabic digits — the three digit
// systems our locales produce (LOCALE_META numberLocale: Arabic-Indic for
// Arabic, extended-Arabic for Dari and Pashto; parseNumber converts both back).
const DIGIT = '[0-9٠-٩۰-۹]';
const HAS_DIGIT = new RegExp(DIGIT);

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Bidi control marks that Intl formatting (ar) can embed around signs/digits;
// they must never survive into the editable text.
const BIDI_MARKS = /[\u061C\u200E\u200F\u200B]/g;

/**
 * Reduce a raw input string to candidate numeric text: drop whitespace,
 * grouping separators and bidi marks; normalise minus variants to ASCII `-`;
 * alias `.` to the locale decimal separator (numpads emit `.` regardless of
 * locale). The alias is skipped where the locale groups with `.` (Spanish,
 * Portuguese) — there a typed `.` is a grouping separator and has already been
 * dropped above; treating it as a decimal point would silently read "1.234" as
 * one-point-two-three-four.
 */
const normalize = (raw: string, symbols: NumberSymbols): string => {
  let s = raw.replace(BIDI_MARKS, '').replace(/\s/g, '');
  s = s.split(symbols.group).join('');
  const minus = symbols.minusSign.replace(BIDI_MARKS, '');
  if (minus && minus !== '-') s = s.split(minus).join('-');
  s = s.split('−').join('-'); // typographic minus
  if (symbols.decimal !== '.' && symbols.group !== '.')
    s = s.split('.').join(symbols.decimal);
  return s;
};

const gateRegex = (
  o: NumberFieldConstraints,
  symbols: NumberSymbols
): RegExp => {
  const sign = o.min < 0 ? '-?' : '';
  const frac =
    o.decimalLimit > 0
      ? `(?:${escapeRegex(symbols.decimal)}${DIGIT}{0,${o.decimalLimit}})?`
      : '';
  return new RegExp(`^${sign}${DIGIT}*${frac}$`);
};

/** Valid-so-far text that doesn't yet parse to a committable number. */
export const isIncompleteText = (
  text: string,
  symbols: NumberSymbols
): boolean =>
  text !== '' && (!HAS_DIGIT.test(text) || text.endsWith(symbols.decimal));

const roundDp = (value: number, dp: number): number => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};

// Round + clamp + squash -0: every value handed to onChange passes through
// here, so the parent always holds a legal value even mid-typing.
const commitValue = (parsed: number, o: NumberFieldConstraints): number => {
  const v = Math.min(Math.max(roundDp(parsed, o.decimalLimit), o.min), o.max);
  return v === 0 ? 0 : v;
};

// The commit payload: carries the entered number only when the constraints
// adjusted it (`entered` compared against the final committed value — for the
// repair path that's the pre-repair parse, so a stripped sign counts too).
const commitResult = (entered: number, value: number): CommitResult =>
  entered === value ? { value } : { value, adjustedFrom: entered };

/** The blurred display: locale-formatted with grouping and decimal padding. */
export const displayString = (
  value: number | undefined,
  o: NumberFieldConstraints,
  locale: SupportedLocale
): string => {
  if (value === undefined) return '';
  if (o.noFormatting) return String(value);
  return formatNumber(value, {
    locale,
    minimumFractionDigits: o.decimalMin,
    maximumFractionDigits: o.decimalLimit,
  });
};

/**
 * The focused display: locale digits and decimal separator but no grouping
 * and no decimal padding — the caret-friendly form the user edits.
 */
export const editString = (
  value: number | undefined,
  o: NumberFieldConstraints,
  locale: SupportedLocale
): string => {
  if (value === undefined) return '';
  if (o.noFormatting) return String(value);
  return formatNumber(value, {
    locale,
    useGrouping: false,
    maximumFractionDigits: o.decimalLimit,
  });
};

/**
 * Process one input event's raw text. Not accepted → the component restores
 * the previous DOM value. Accepted → `text` is what the field shows; `commit`
 * (when present) is the value for onChange — undefined meaning cleared.
 */
export const processInput = (
  raw: string,
  o: NumberFieldConstraints,
  locale: SupportedLocale
): ProcessedInput => {
  const symbols = getNumberSymbols(locale);
  const text = normalize(raw, symbols);

  if (text === '')
    return { accepted: true, text, commit: { value: undefined } };

  const gate = gateRegex(o, symbols);
  if (gate.test(text)) {
    if (isIncompleteText(text, symbols)) return { accepted: true, text };
    const parsed = parseNumber(text, symbols.decimal);
    if (Number.isNaN(parsed)) return { accepted: true, text };
    return {
      accepted: true,
      text,
      commit: commitResult(parsed, commitValue(parsed, o)),
    };
  }

  // Gate failed — usually a paste ("$1,234.567", "-5" where negatives are
  // banned, over-precise decimals). Try to repair: parse what was given,
  // strip a banned sign, round to the decimal limit, and re-gate the result.
  const parsed = parseNumber(text, symbols.decimal);
  if (Number.isNaN(parsed)) return { accepted: false };
  const signed = o.min >= 0 ? Math.abs(parsed) : parsed;
  const value = roundDp(signed, o.decimalLimit);
  const repaired = editString(value === 0 ? 0 : value, o, locale);
  if (!gate.test(repaired)) return { accepted: false };
  return {
    accepted: true,
    text: repaired,
    commit: commitResult(parsed, commitValue(value, o)),
  };
};

/**
 * Blur/Enter: parse whatever text is present, produce the final (rounded,
 * clamped) value and its canonical display text. Unparseable → cleared.
 */
export const finalizeText = (
  text: string,
  o: NumberFieldConstraints,
  locale: SupportedLocale
): { value: number | undefined; text: string; adjustedFrom?: number } => {
  const symbols = getNumberSymbols(locale);
  const parsed = parseNumber(normalize(text, symbols), symbols.decimal);
  if (Number.isNaN(parsed)) return { value: undefined, text: '' };
  const value = commitValue(parsed, o);
  return {
    value,
    text: displayString(value, o, locale),
    ...(parsed === value ? {} : { adjustedFrom: parsed }),
  };
};

/** Arrow-key stepping: from the current value (or 0/min when empty). */
export const stepValue = (
  current: number | undefined,
  delta: number,
  o: NumberFieldConstraints
): number => commitValue((current ?? Math.max(o.min, 0)) + delta, o);

/** Whether the current text already denotes `value` (sync-effect guard). */
export const textRepresents = (
  text: string,
  value: number | undefined,
  locale: SupportedLocale
): boolean => {
  const symbols = getNumberSymbols(locale);
  const normalized = normalize(text, symbols);
  if (normalized === '') return value === undefined;
  if (value === undefined) return false;
  return parseNumber(normalized, symbols.decimal) === value;
};

/** Exposed for the component's mid-typing sync guard. */
export const isIncomplete = (text: string, locale: SupportedLocale): boolean =>
  isIncompleteText(
    normalize(text, getNumberSymbols(locale)),
    getNumberSymbols(locale)
  );
