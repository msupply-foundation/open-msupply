import type { CustomFieldDefinitionsResult } from './names.generated';

// The v2 custom-field surface (spec/names): the JSON boundary + the
// column/filter derivation. Kept framework-free so AC-N18 (columns) and AC-N19
// (dynamicFilter) are unit-testable. Definitions come from the consumed
// `customFields` read, scoped per role (customer/supplier); values live in the
// per-name `NameNode.customFields` JSON object.

export type CustomFieldDef =
  CustomFieldDefinitionsResult['customFields']['nodes'][number];

// The customFields JSON scalar is typed `unknown` by codegen (the honest type
// for arbitrary JSON). At runtime the server sends a JSON OBJECT, which the
// transport deserialises to an object on the response — but a JSON string is
// also accepted. This is the single documented boundary that narrows the raw
// value to a plain record.
export const parseCustomFields = (raw: unknown): Record<string, unknown> => {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
};

// One custom field's display value for a row/tab (AC-N18 columns, AC-N24 tab).
// Blank when the name has no value for that key.
export const customFieldValue = (raw: unknown, key: string): string => {
  const value = parseCustomFields(raw)[key];
  if (value == null || value === '') return '';
  return String(value);
};

// A custom field's read-only display for the detail tab (AC-N24), chosen by the
// field's value type — mirrors the current app's per-value-type rendering:
//   • BOOLEAN → a checkbox state,
//   • OPTION  → the stored option id + the option's NAME resolved via the
//     definition's `options` (contract › record detail); the tab shows it in a
//     disabled dropdown (the read-only counterpart of the option picker),
//   • every other type → the value as text (blank when unset).
export type CustomFieldDisplay =
  | { kind: 'boolean'; checked: boolean }
  | { kind: 'option'; id: string; name: string }
  | { kind: 'text'; text: string };

export const customFieldDisplay = (
  def: CustomFieldDef,
  raw: unknown
): CustomFieldDisplay => {
  const value = parseCustomFields(raw)[def.key];
  if (def.valueType === 'BOOLEAN') {
    return { kind: 'boolean', checked: Boolean(value) };
  }
  if (def.valueType === 'OPTION') {
    // Stored value is the option id; resolve it to the option's name (falling
    // back to the raw id if it can't be resolved). Unset ⇒ blank id + name.
    const id = value == null ? '' : String(value);
    const option = def.options.find(o => o.id === value);
    return { kind: 'option', id, name: option?.name ?? id };
  }
  return {
    kind: 'text',
    text: value == null || value === '' ? '' : String(value),
  };
};

// The dynamicFilter AST (contract › filtering & search): a JSON AST of property
// conditions over custom-field keys, ANDed. Shape mirrors the server's, e.g.
// { "And": [{ "CustomField": { "key": "k", "filter": { "Text": { "Like": "abc" } } } }] }.
type CustomFieldCondition = {
  CustomField: { key: string; filter: { Text: { Like: string } } };
};
export type DynamicFilterAst = { And: CustomFieldCondition[] };

// Build the dynamicFilter AST from the raw per-key filter values (the list's
// custom-field filter chips). Empty values are dropped; when nothing remains,
// returns undefined so the query carries no dynamicFilter at all (a no-op —
// AC-N19: a role with none configured / no active filter narrows nothing).
export const buildDynamicFilter = (
  cf: Record<string, string | null | undefined> | undefined
): DynamicFilterAst | undefined => {
  if (!cf) return undefined;
  const conditions: CustomFieldCondition[] = Object.entries(cf)
    .filter(
      (entry): entry is [string, string] =>
        entry[1] != null && entry[1].trim() !== ''
    )
    .map(([key, value]) => ({
      CustomField: { key, filter: { Text: { Like: value } } },
    }));
  return conditions.length > 0 ? { And: conditions } : undefined;
};

// The custom-field definitions to surface as columns/filters for a role are
// exactly those the read returns that aren't HIDDEN on that scope (AC-N18/N19:
// "exactly the fields configured for the role"). The read is already scoped, so
// this only drops any explicit HIDDEN entries.
export const visibleCustomFields = (
  defs: CustomFieldDef[] | undefined
): CustomFieldDef[] => (defs ?? []).filter(def => def.displayMode !== 'HIDDEN');
