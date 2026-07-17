import {
  createEffect,
  createSignal,
  on,
  onMount,
  splitProps,
  untrack,
} from 'solid-js';
import { locale } from '../../../intl/intl';
import { TextField, type TextFieldProps } from './TextField';
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
 * - Blur/Enter canonicalises: parse → round → clamp → commit if changed →
 *   display the formatted string (grouping separators, decimalMin padding).
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
    'min',
    'max',
    'allowNegative',
    'decimalLimit',
    'decimalMin',
    'step',
    'multiplier',
    'noFormatting',
    'defaultValue',
    'class',
  ]);

  const constraints = (): NumberFieldConstraints => ({
    min: local.min ?? (local.allowNegative ? -MAX_SAFE_API_INTEGER : 0),
    max: local.max ?? MAX_SAFE_API_INTEGER,
    decimalLimit: local.decimalLimit ?? 0,
    decimalMin: local.decimalMin,
    noFormatting: local.noFormatting,
  });

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

  onMount(() => {
    if (local.value === undefined && local.defaultValue !== undefined) {
      commit(stepValue(local.defaultValue, 0, constraints()));
    }
  });

  // Parent → display sync: an external value (or locale) change rewrites the
  // text — except when it's our own commit echoing back (the user's
  // uncanonicalised text must survive until blur), or the user is mid-entry
  // on an incomplete string.
  createEffect(
    on([() => local.value, locale], ([value, loc]) =>
      untrack(() => {
        if (lastCommitted && value === lastCommitted.value) return;
        if (textRepresents(text(), value, loc)) return;
        if (focused() && isIncomplete(text(), loc)) return;
        setText(
          focused()
            ? editString(value, constraints(), loc)
            : displayString(value, constraints(), loc)
        );
      })
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
    if (result.commit) commit(result.commit.value);
  };

  const finalize = () => {
    dirty = false;
    const result = finalizeText(text(), constraints(), locale());
    setText(result.text);
    commit(result.value);
  };

  const handleKeyDown = (
    e: KeyboardEvent & { currentTarget: HTMLInputElement }
  ) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
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
    // Canonicalise before any Enter-triggered submit handler reads the value.
    if (e.key === 'Enter') finalize();
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
