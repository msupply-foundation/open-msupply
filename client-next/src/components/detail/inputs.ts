import type { ChangeEvent, CSSProperties } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { TFunction } from 'i18next';

// Shared styling for the inline editable cells used in document line tables.
// Mirrors the stocktake grid inputs so every editor looks the same.
export const INPUT_BASE: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '4px 6px',
  border: '1px solid #c4c4c4',
  borderRadius: 4,
  font: 'inherit',
  background: '#fff',
};

const INPUT_DISABLED: CSSProperties = {
  ...INPUT_BASE,
  background: '#f5f5f5',
  color: '#777',
};

export function inputStyle(invalid: boolean, disabled = false): CSSProperties {
  if (disabled) return INPUT_DISABLED;
  return invalid ? { ...INPUT_BASE, borderColor: '#d32f2f' } : INPUT_BASE;
}

// Strip everything except digits and decimal points. Used to keep numeric
// fields numeric as the user types or pastes (letters etc. never appear).
export const sanitizeNumeric = (value: string): string =>
  value.replace(/[^0-9.]/g, '');

/**
 * Wrap a react-hook-form `register(name, opts)` result for a numeric <input>:
 * spread the return AND restrict input to digits/decimal point on every change
 * (typing or paste). e.g. `<input {...numericField(register(name, numeric))} />`.
 */
export function numericField(reg: UseFormRegisterReturn) {
  return {
    ...reg,
    inputMode: 'decimal' as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const cleaned = sanitizeNumeric(e.target.value);
      if (cleaned !== e.target.value) e.target.value = cleaned;
      return reg.onChange(e);
    },
  };
}

// A field is empty (not entered) or a non-negative finite number. Returns a
// translated message for react-hook-form to store; the page surfaces it.
export function makeNonNegativeValidator(t: TFunction) {
  return (raw: string): true | string => {
    if (raw === '') return true;
    const n = Number(raw);
    if (Number.isNaN(n)) return t('error.enter-number');
    if (n < 0) return t('error.non-negative');
    return true;
  };
}
