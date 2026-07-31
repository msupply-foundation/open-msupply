import { createEffect, createSignal, on, onMount, splitProps } from 'solid-js';
import { locale } from '../../../intl/intl';
import { TextField, type TextFieldProps } from './TextField';
import { useInTableCell } from '../table/inTableCell';
import {
  displayString,
  editString,
  finalizeText,
  isIncomplete,
  processInput,
  stepValue,
  textRepresents,
  type NumberFieldConstraints,
} from './numberFieldLogic';
import styles from './NumberField.module.css';

/**
 * The server API's max safe integer (old OMS NumUtils.MAX_SAFE_API_INTEGER) —
 * the default bound in both directions.
 */
export const MAX_SAFE_API_INTEGER = 999_999_999;

export interface NumberFieldProps extends Omit<
  TextFieldProps,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onInput'
  | 'onKeyDown'
  | 'onBlur'
  | 'onFocus'
  | 'min'
  | 'max'
  | 'step'
  | 'inputmode'
> {
  /** The number itself — parent-owned; `undefined` = empty field. */
  value?: number;
  /**
   * Fired with every committed value — on each keystroke that forms a
   * complete number (already rounded to `decimalLimit` and clamped to
   * `min`/`max`), with `undefined` when the field is cleared, and on
   * blur/Enter after canonicalising. Parents MUST handle `undefined`.
   */
  onChange?: (value: number | undefined) => void;
  /**
   * Fired after a commit whose typed number the constraints changed —
   * rounded to `decimalLimit` (pasted over-precision) or clamped to
   * `min`/`max` — with what was entered and what was applied. Consumers that
   * must REPORT an adjusted entry rather than silently bound it (e.g. the
   * allocation editors' AC-AL13 banner) hook this; arrow-stepping and
   * programmatic value changes never fire it.
   */
  onClamped?: (entered: number, applied: number) => void;
  /** Lower bound. Default 0 — or -MAX_SAFE_API_INTEGER with `allowNegative`. */
  min?: number;
  /** Upper bound. Default MAX_SAFE_API_INTEGER. */
  max?: number;
  /** Shorthand for "negatives allowed" without picking a specific `min`. */
  allowNegative?: boolean;
  /** Max decimal places; 0 (default) = integers only. */
  decimalLimit?: number;
  /** Pad the blurred display to at least this many decimals ("1" → "1.00"). */
  decimalMin?: number;
  /** Arrow-key increment. Default 1. */
  step?: number;
  /** Shift+arrow multiplies `step` by this. Default 10. */
  multiplier?: number;
  /**
   * Plain `String(value)` display — no grouping/locale digits. For numbers
   * where grouping is noise (years). Still a number: leading zeros collapse
   * on blur ("000564" → 564) — digit strings where they're meaningful (item
   * codes, barcodes) belong in a TextField, not here.
   */
  noFormatting?: boolean;
  /** Seed when `value` starts undefined; committed to the parent on mount. */
  defaultValue?: number;
}

/*
 * Numeric input (old OMS NumericTextInput, rebuilt) — a TextField with the
 * numeric machinery around it; all chrome (label / helper / error / required /
 * width / aria) is TextField's. The inner input is always type="text" +
 * inputmode: type="number" can't do locale separators and is the documented
 * source of the old component's early bugs
 * (https://stackoverflow.blog/2022/12/26/why-the-number-input-is-the-worst-input/).
 *
 * The contract (logic lives in numberFieldLogic.ts, pure and unit-tested):
 *
 * - The parent owns `value` (a number, or undefined = empty); this component
 *   owns `text`, the string in the DOM. While typing, text is user-owned:
 *   every input event is gated (locale-aware: digits, one leading minus when
 *   negatives are allowed, one locale decimal separator, decimalLimit
 *   enforced); rejected input is restored imperatively — Solid won't rewrite
 *   the DOM when the signal didn't change (see kdd/solid-reactivity-pitfalls).
 *
 * - COMMITS ARE EAGER: each keystroke that forms a complete number fires
 *   onChange immediately, so the parent is never stale when a save is
 *   triggered from inside the field (Enter, Cmd+S, or clicking Save — and
 *   Solid signals being synchronous, even the blur→click ordering is safe).
 *   Incomplete text ("-", "1.") commits nothing; clearing commits undefined.
 *
 * - Committed values are always valid — rounded to decimalLimit and clamped
 *   to min/max — but the TEXT is never rewritten to the clamped value while
 *   typing (old OMS clamped the display mid-entry: typing "5" toward "50"
 *   with min=10 became "10" under your fingers — the issue-5990 complaint).
 *
 * - Blur canonicalises: parse → round → clamp → commit if changed → display
 *   the formatted string (grouping separators, decimalMin padding). Enter
 *   commits-and-leaves: it blurs the field, which runs that same path.
 *   While focused the text is the "edit form" — locale digits and decimal
 *   separator but no grouping, so the caret never fights separators (the old
 *   component reformatted mid-typing and the caret jumped; we format only at
 *   the boundaries). Focus switches to edit form and selects all.
 *
 * - External `value` changes update the text (unless the user is mid-entry on
 *   an incomplete string, or the change is just our own commit echoing back).
 */
export const NumberField = (props: NumberFieldProps) => {
  const [local, rest] = splitProps(props, [
    'value',
    'onChange',
    'onClamped',
    'min',
    'max',
    'allowNegative',
    'decimalLimit',
    'decimalMin',
    'step',
    'multiplier',
    'noFormatting',
    'defaultValue',
    'width',
    'class',
  ]);

  const constraints = (): NumberFieldConstraints => ({
    min: local.min ?? (local.allowNegative ? -MAX_SAFE_API_INTEGER : 0),
    max: local.max ?? MAX_SAFE_API_INTEGER,
    decimalLimit: local.decimalLimit ?? 0,
    decimalMin: local.decimalMin,
    noFormatting: local.noFormatting,
  });

  /*
   * Whether this field sits in a table cell (KB-S2 — see inTableCell.ts). Read
   * ONCE at setup, not reactively: a field does not migrate in or out of a cell,
   * and the value is the same for every field the table renders.
   */
  const inTableCell = useInTableCell();

  const [text, setText] = createSignal(
    displayString(local.value ?? local.defaultValue, constraints(), locale())
  );
  const [focused, setFocused] = createSignal(false);
  // Not rendered from — plain variables, no signals needed.
  let dirty = false;
  let lastCommitted: { value: number | undefined } | undefined;

  const commit = (value: number | undefined) => {
    lastCommitted = { value };
    if (value !== local.value) local.onChange?.(value);
  };

  // After the commit (so onChange's state lands first), report an entry the
  // constraints adjusted. Repeat keystrokes past a bound re-fire — the entered
  // figure changes ("900" → "9000") even while the committed value holds.
  const reportClamped = (result: {
    value: number | undefined;
    adjustedFrom?: number;
  }) => {
    if (result.adjustedFrom != null && result.value != null)
      local.onClamped?.(result.adjustedFrom, result.value);
  };

  onMount(() => {
    if (local.value === undefined && local.defaultValue !== undefined) {
      commit(stepValue(local.defaultValue, 0, constraints()));
    }
  });

  // Parent → display sync: an external value change rewrites the text —
  // except when it's our own commit echoing back (the user's uncanonicalised
  // text must survive until blur), or the user is mid-entry on an incomplete
  // string.
  createEffect(
    on(
      () => local.value,
      value => {
        const loc = locale();
        if (lastCommitted && value === lastCommitted.value) return;
        if (textRepresents(text(), value, loc)) return;
        if (focused() && isIncomplete(text(), loc)) return;
        setText(
          focused()
            ? editString(value, constraints(), loc)
            : displayString(value, constraints(), loc)
        );
      }
    )
  );

  // A locale or constraint change ALWAYS reformats — no semantic guard: the
  // old text often parses to the same value under the new symbols ("12.50" →
  // 12,50 in fr, "1 000" → ١٬٠٠٠ in ar), and a decimalLimit/decimalMin change
  // (CurrencyField switching USD → JPY) changes the canonical rendering of an
  // unchanged value. Deferred: the signal's initial text already used the
  // current locale and constraints.
  const constraintsKey = () => {
    const c = constraints();
    return `${c.min}|${c.max}|${c.decimalLimit}|${c.decimalMin}|${c.noFormatting}`;
  };
  createEffect(
    on(
      [locale, constraintsKey],
      ([loc]) =>
        setText(
          focused()
            ? editString(local.value, constraints(), loc)
            : displayString(local.value, constraints(), loc)
        ),
      { defer: true }
    )
  );

  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const el = e.currentTarget;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    const result = processInput(raw, constraints(), locale());
    if (!result.accepted) {
      // Rejected: the text signal didn't change, so Solid won't touch the
      // DOM — put the previous value (and the caret) back ourselves.
      el.value = text();
      const pos = Math.max(0, caret - (raw.length - text().length));
      el.setSelectionRange(pos, pos);
      return;
    }
    dirty = true;
    const modified = result.text !== raw;
    setText(result.text);
    if (modified) {
      el.value = result.text;
      const pos = Math.min(
        result.text.length,
        Math.max(0, caret - (raw.length - result.text.length))
      );
      el.setSelectionRange(pos, pos);
    }
    if (result.commit) {
      commit(result.commit.value);
      reportClamped(result.commit);
    }
  };

  const finalize = () => {
    dirty = false;
    const result = finalizeText(text(), constraints(), locale());
    setText(result.text);
    commit(result.value);
    reportClamped(result);
  };

  const handleKeyDown = (
    e: KeyboardEvent & { currentTarget: HTMLInputElement }
  ) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      /*
       * KB-S2: "A numeric field INSIDE A TABLE CELL instead lets arrow keys move
       * the text cursor, and MUST NOT step the value or move the row focus."
       *
       * So in a cell we neither step nor preventDefault: the caret moves on the
       * UA's own default action. `stopPropagation` stays, which is KB-N2 from the
       * field's side — "arrow keys inside a table's input belong to the field" —
       * and is what will keep a row-navigation rung from seeing the key when one
       * exists (it does not today; see kdd/keyboard-layer).
       */
      if (inTableCell) {
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const amount =
        (local.step ?? 1) *
        (e.shiftKey ? (local.multiplier ?? 10) : 1) *
        (e.key === 'ArrowUp' ? 1 : -1);
      const base = finalizeText(text(), constraints(), locale()).value;
      const next = stepValue(base ?? local.value, amount, constraints());
      dirty = true;
      setText(editString(next, constraints(), locale()));
      commit(next);
      return;
    }
    // Enter = "I'm done": leave the field — blur runs the commit-and-
    // canonicalise path synchronously, before any Enter-triggered submit
    // handler reads the value.
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  const handleFocus = (e: FocusEvent & { currentTarget: HTMLInputElement }) => {
    setFocused(true);
    setText(editString(local.value, constraints(), locale()));
    e.currentTarget.select();
  };

  const handleBlur = () => {
    setFocused(false);
    if (dirty) finalize();
    // Untouched: just restore the display form focus stripped (grouping).
    else setText(displayString(local.value, constraints(), locale()));
  };

  // No minus key on mobile numeric/decimal keypads — negative-capable fields
  // get the full keyboard.
  const inputMode = () =>
    constraints().min < 0
      ? 'text'
      : constraints().decimalLimit > 0
        ? 'decimal'
        : 'numeric';

  return (
    <TextField
      {...rest}
      class={local.class ? `${styles.numeric} ${local.class}` : styles.numeric}
      // Numbers are short: default to the compact width cap (old OMS's
      // numeric input defaulted narrow too, at 75px). Overridable per field.
      width={local.width ?? 'compact'}
      type="text"
      inputmode={inputMode()}
      autocomplete="off"
      value={text()}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};
