import type { CustomFieldDefinitionsResult } from './names.generated';

// The v2 custom-field surface (spec/names): the JSON boundary + the
// column/filter derivation. Kept framework-free so AC-N18 (columns) and AC-N19
// (dynamicFilter) are unit-testable. Definitions come from the consumed
// `customFields` read, scoped per role (customer/supplier); values live in the
// per-name `NameNode.customFields` JSON object.

export type CustomFieldDef =
  CustomFieldDefinitionsResult['customFields']['nodes'][number];

// The customFields JSON scalar is typed `string | null` by codegen (the plugin
// maps unknown scalars to string), but the server sends a JSON OBJECT, which the
// transport deserialises to an object on the response. Accept both — an object
// (the real runtime case) or a JSON string — and normalise to a plain record.
// This is the single documented boundary for the mistyped JSON scalar.
export const parseCustomFields = (
  raw: string | null | undefined
): Record<string, unknown> => {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

// One custom field's display value for a row/tab (AC-N18 columns, AC-N24 tab).
// Blank when the name has no value for that key.
export const customFieldValue = (
  raw: string | null | undefined,
  key: string
): string => {
  const value = parseCustomFields(raw)[key];
  if (value == null || value === '') return '';
  return String(value);
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
