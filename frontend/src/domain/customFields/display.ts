import { formatNumber } from '../../intl/formatNumber';
import { localisedDate } from '../../intl/formatDateTime';
import { t } from '../../intl';
import {
  customFieldValue,
  inConfiguredOrder,
  multiOptionIds,
  resolveOptionName,
  topMostIds,
  type ParsedCustomField,
} from './parse';

// Two renderings of the same stored value, because a table CELL and a read-only
// FIELD have opposite empty conventions:
//   • customFieldDisplayString — for a list COLUMN. Empty renders BLANK; a dash
//     in a cell reads as data (ui-standards § tables).
//   • customFieldFormText — for a labelled FIELD on a read tab. Empty renders a
//     DASH; blank space beside a label reads as a rendering fault, and the
//     reader can't tell "no value" from "failed to load".
// Keep both in step: a new value type needs a rendering in each.

// A field's stored value as a DISPLAY STRING, chosen by kind
// (spec/ui-standards/ custom-fields › value types) — used by list columns.
// Localises numbers and dates; resolves an option id to its name. boolean and
// unsupported are handled richer/absent by their surfaces, so here a boolean is
// a plain check mark and unsupported is blank. Imports i18n, so it is NOT in
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
    case 'multiOption': {
      // The TOP-MOST stored ids only: a stored parent stands for its subtree,
      // so it reads as the parent — the shorter true statement, and one that
      // doesn't rewrite itself when an option is added beneath it. Configured
      // order, comma-joined, as the value would be read aloud.
      const ids = multiOptionIds(value);
      const names = inConfiguredOrder(
        field.def.options,
        topMostIds(field.def.options, ids)
      ).map(id => resolveOptionName(field.def, id));
      return names.join(', ');
    }
    case 'text':
      return String(value);
    case 'unsupported':
      return '';
  }
};

/** What an empty read-only field shows — see the note above. */
export const EMPTY_FIELD_VALUE = '—';

/**
 * A field's stored value as the text of a read-only LABELLED VALUE (the read
 * tab's single column). Unset — or a value type this client can't render —
 * shows the empty mark. A boolean reads as Yes/No, which is what a
 * never-editable flag should say: a disabled checkbox cannot distinguish
 * "false" from "not set", and this does.
 */
export const customFieldFormText = (
  field: ParsedCustomField,
  raw: unknown
): string => {
  const value = customFieldValue(raw, field.def.key);
  if (value == null || value === '') return EMPTY_FIELD_VALUE;
  if (field.kind === 'boolean')
    return value ? t('messages.yes') : t('messages.no');
  return customFieldDisplayString(field, raw) || EMPTY_FIELD_VALUE;
};
