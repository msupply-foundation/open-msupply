import type { CSSProperties } from 'react';
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
