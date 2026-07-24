import type { CustomFieldDefinitionsResult } from './customFields.generated';

// The custom-field interpreter's PARSER (spec/ui-standards/custom-fields;
// kdd/report-argument-forms). Pure and node-testable: it normalises the closed,
// server-owned value-type vocabulary into a discriminated `ParsedCustomField`
// union, which the render surfaces (view / input / filter) each switch over —
// one explicit Switch per surface, never a config-table renderer
// (kdd/explicit-composition). No SolidJS, no i18n, no DOM.

export type CustomFieldDef =
  CustomFieldDefinitionsResult['customFields']['nodes'][number];

export type CustomFieldOption = CustomFieldDef['options'][number];

// Options ordered depth-first (parents before children) with a depth, so a
// picker/column can indent the hierarchy (spec › option fields). Orphans (a
// parentOptionId resolving to nothing here) are treated as roots — nothing is
// dropped.
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

// An option id plus the ids of all its descendants — a filter on a parent
// matches its children (spec › option fields; the Option.In condition).
export const optionAndDescendantIds = (
  options: CustomFieldOption[],
  id: string
): string[] => {
  const childrenOf = new Map<string, CustomFieldOption[]>();
  for (const o of options) {
    if (!o.parentOptionId) continue;
    const siblings = childrenOf.get(o.parentOptionId) ?? [];
    siblings.push(o);
    childrenOf.set(o.parentOptionId, siblings);
  }
  const out: string[] = [];
  const walk = (current: string) => {
    out.push(current);
    for (const child of childrenOf.get(current) ?? []) walk(child.id);
  };
  walk(id);
  return out;
};

// The id's ancestor chain (its parent, grandparent, …), nearest first. Used
// when deselecting: removing a node also deselects its ancestors, since a parent
// is only "fully selected" while every descendant is (spec › option fields).
export const ancestorIds = (
  options: CustomFieldOption[],
  id: string
): string[] => {
  const parentOf = new Map(options.map(o => [o.id, o.parentOptionId]));
  const out: string[] = [];
  const seen = new Set<string>([id]);
  let current = parentOf.get(id) ?? null;
  while (current && parentOf.has(current) && !seen.has(current)) {
    out.push(current);
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return out;
};

export const resolveOptionName = (def: CustomFieldDef, id: string): string =>
  def.options.find(o => o.id === id)?.name ?? id;

// The interpreter's NORMAL FORM: the closed value-type vocabulary as a
// discriminated union. `unsupported` is the designed degradation path (a mode a
// newer server adds) — surfaces render it disabled with its label, never crash
// (kdd/report-argument-forms).
export type ParsedCustomField =
  | { kind: 'text'; def: CustomFieldDef }
  | { kind: 'number'; def: CustomFieldDef; integer: boolean }
  | { kind: 'date'; def: CustomFieldDef }
  | { kind: 'boolean'; def: CustomFieldDef }
  | { kind: 'option'; def: CustomFieldDef; options: OrderedOption[] }
  | { kind: 'unsupported'; def: CustomFieldDef; rawType: string };

export const parseCustomField = (def: CustomFieldDef): ParsedCustomField => {
  switch (def.valueType) {
    case 'TEXT':
      return { kind: 'text', def };
    case 'INTEGER':
      return { kind: 'number', def, integer: true };
    case 'REAL':
      return { kind: 'number', def, integer: false };
    case 'DATE':
      return { kind: 'date', def };
    case 'BOOLEAN':
      return { kind: 'boolean', def };
    case 'OPTION':
      return {
        kind: 'option',
        def,
        options: orderOptionsHierarchically(def.options),
      };
    default:
      // Unreachable for the current enum; the forward-compat degrade path.
      return { kind: 'unsupported', def, rawType: String(def.valueType) };
  }
};

// A field the deployment shows on the scope: not HIDDEN, and a display mode we
// understand (OTHER/null from a newer server is treated as not-shown). The read
// is already scope-filtered server-side; this drops the non-shown ones.
export const isShown = (def: CustomFieldDef): boolean =>
  def.displayMode === 'VISIBLE' || def.displayMode === 'PROMINENT';

export const shownCustomFields = (
  defs: CustomFieldDef[] | undefined
): CustomFieldDef[] => (defs ?? []).filter(isShown);

// Split shown fields by where they render: VISIBLE → the tab; PROMINENT →
// promoted to the detail toolbar and NOT repeated in the tab (spec › placement).
// A read-only surface has no toolbar, so it passes `promote: false` to show
// every shown field in the tab.
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
    tab: shown.filter(d => d.displayMode !== 'PROMINENT'),
    prominent: shown.filter(d => d.displayMode === 'PROMINENT'),
  };
};

// The single JSON-scalar boundary: `customFields` is typed `unknown` by codegen
// (honest for arbitrary JSON). At runtime the server sends a JSON object (a JSON
// string is also accepted). Narrow it to a plain record here, once.
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

// One field's raw stored value (undefined when unset), by key.
export const customFieldValue = (raw: unknown, key: string): unknown =>
  parseCustomFields(raw)[key];
