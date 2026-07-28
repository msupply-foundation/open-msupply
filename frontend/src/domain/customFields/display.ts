import { formatNumber } from '../../intl/formatNumber';
import { localisedDate } from '../../intl/formatDateTime';
import {
  customFieldValue,
  resolveOptionName,
  type ParsedCustomField,
} from './parse';

// A field's stored value as a DISPLAY STRING, chosen by kind (spec/ui-standards/
// custom-fields › value types) — used by list columns and the read tab's scalar
// rows. Localises numbers and dates; resolves an option id to its name. boolean
// and unsupported are handled richer/absent by their surfaces, so here a boolean
// is a plain check mark and unsupported is blank. Imports i18n, so it is NOT in
// the pure parser.
export const customFieldDisplayString = (
  field: ParsedCustomField,
  raw: unknown
): string => {
  const value = customFieldValue(raw, field.def.key);
  if (value == null || value === '') return '';
  switch (field.kind) {
    case 'boolean':
      return value ? '✓' : '';
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? formatNumber(n) : '';
    }
    case 'date':
      return localisedDate(String(value));
    case 'option':
      return resolveOptionName(field.def, String(value));
    case 'text':
      return String(value);
    case 'unsupported':
      return '';
  }
};
