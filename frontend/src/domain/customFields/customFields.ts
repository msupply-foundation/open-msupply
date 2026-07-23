import type { CustomFieldDefinitionsResult } from './customFields.generated';

// The shared custom-field logic (spec/ui-standards/custom-fields): the JSON
// value boundary, the value-type → display mapping, display-mode partitioning,
// option-hierarchy ordering, and the list dynamicFilter AST. Framework-free so
// every piece is unit-testable and reused identically by the read-only view,
// the editable tab, the prominent toolbar, and the list column/filter builders.
//
// Definitions come from the scoped `customFieldDefinitions` read; values live in
// the record's own `customFields` JSON object, keyed by each definition's `key`.

export type CustomFieldDef =
  CustomFieldDefinitionsResult['customFields']['nodes'][number];

export type CustomFieldOption = CustomFieldDef['options'][number];

// The customFields JSON scalar is typed `unknown` by codegen (the honest type
// for arbitrary JSON). At runtime the server sends a JSON OBJECT, deserialised
// to an object on the response — but a JSON string is also accepted. This is the
// single documented boundary that narrows the raw value to a plain record.
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

// One custom field's raw stored value (or undefined when the record hasn't set
// it), read out of the parsed blob by key.
export const customFieldValue = (raw: unknown, key: string): unknown =>
  parseCustomFields(raw)[key];

// A field the deployment shows on a scope: not HIDDEN, and a mode we understand
// (an OTHER/null mode from a newer server is treated as not-shown). The read is
// already scope-filtered server-side; this drops the explicit non-shown ones.
const isShown = (def: CustomFieldDef): boolean =>
  def.displayMode === 'VISIBLE' || def.displayMode === 'PROMINENT';

// The definitions to surface for a scope at all (columns, filters, the tab +
// toolbar together) — everything not hidden, in the order the read returns.
export const shownCustomFields = (
  defs: CustomFieldDef[] | undefined
): CustomFieldDef[] => (defs ?? []).filter(isShown);

// Split the shown fields by where they render: VISIBLE → the custom-fields tab;
// PROMINENT → promoted to the detail toolbar and NOT repeated in the tab
// (spec › placement). A read-only surface has no toolbar, so it renders every
// shown field in the tab — callers pass `promote: false` for that case.
export interface PartitionedCustomFields {
  tab: CustomFieldDef[];
  prominent: CustomFieldDef[];
}
export const partitionCustomFields = (
  defs: CustomFieldDef[] | undefined,
  promote = true
): PartitionedCustomFields => {
  const shown = shownCustomFields(defs);
  if (!promote) return { tab: shown, prominent: [] };
  return {
    tab: shown.filter(def => def.displayMode !== 'PROMINENT'),
    prominent: shown.filter(def => def.displayMode === 'PROMINENT'),
  };
};

// A field's read-only display, chosen by value type (spec › value types):
//   • BOOLEAN → a checkbox state,
//   • OPTION  → the stored option id + its resolved NAME (falling back to the
//     raw id when it resolves to no current option),
//   • every other type → the value as text (blank when unset).
export type CustomFieldDisplay =
  | { kind: 'boolean'; checked: boolean }
  | { kind: 'option'; id: string; name: string }
  | { kind: 'text'; text: string };

export const customFieldDisplay = (
  def: CustomFieldDef,
  raw: unknown
): CustomFieldDisplay => {
  const value = customFieldValue(raw, def.key);
  if (def.valueType === 'BOOLEAN') {
    return { kind: 'boolean', checked: Boolean(value) };
  }
  if (def.valueType === 'OPTION') {
    const id = value == null ? '' : String(value);
    return { kind: 'option', id, name: resolveOptionName(def, id) };
  }
  return {
    kind: 'text',
    text: value == null || value === '' ? '' : String(value),
  };
};

// Resolve an OPTION field's stored id to its option name; the raw id is the
// fallback when it matches no current option (spec › option fields).
export const resolveOptionName = (def: CustomFieldDef, id: string): string =>
  def.options.find(o => o.id === id)?.name ?? id;

// Options ordered as a depth-first tree (parents before their children) with a
// depth per option, so an editable picker can indent children under their
// parent (spec › option fields — hierarchical). Orphans (a parentOptionId that
// resolves to no option in the set) are treated as roots so nothing is dropped.
export interface OrderedOption {
  option: CustomFieldOption;
  depth: number;
}
export const orderOptionsHierarchically = (
  options: CustomFieldOption[]
): OrderedOption[] => {
  const ids = new Set(options.map(o => o.id));
  const childrenOf = new Map<string | null, CustomFieldOption[]>();
  for (const option of options) {
    const parent =
      option.parentOptionId && ids.has(option.parentOptionId)
        ? option.parentOptionId
        : null;
    const siblings = childrenOf.get(parent) ?? [];
    siblings.push(option);
    childrenOf.set(parent, siblings);
  }
  const ordered: OrderedOption[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const option of childrenOf.get(parent) ?? []) {
      ordered.push({ option, depth });
      walk(option.id, depth + 1);
    }
  };
  walk(null, 0);
  return ordered;
};

// The dynamicFilter AST (spec › lists): a JSON AST of conditions over
// custom-field keys, ANDed, e.g.
//   { "And": [{ "CustomField": { "key": "k", "filter": { "Text": { "Like": "abc" } } } }] }.
type CustomFieldCondition = {
  CustomField: { key: string; filter: { Text: { Like: string } } };
};
export type DynamicFilterAst = { And: CustomFieldCondition[] };

// Build the dynamicFilter AST from the raw per-key filter values (the list's
// custom-field filter chips). Empty values are dropped; when nothing remains,
// returns undefined so the query carries no dynamicFilter at all (a no-op).
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
