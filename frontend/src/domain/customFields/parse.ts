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
// when deselecting: removing a node also deselects its ancestors, since a
// parent is only "fully selected" while every descendant is (spec › option
// fields).
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

// ── MULTI_OPTION: a set of option ids, stored minimally ──────────────────────
//
// A MULTI_OPTION value is a JSON ARRAY of option ids in which a PARENT STANDS
// FOR ITS WHOLE SUBTREE (spec › option fields). The picker works in the
// expanded set (every ticked node, so the checkboxes are literal), storage
// keeps the minimal covering set (all children ticked → just the parent), and
// these four pure functions are the only places that know the difference:
//
//   stored ──expandStoredToSelection──▶ ticked set
//   ticked set ──collapseSelectionToStored──▶ stored
//
// Ids that resolve to no current option (deleted, or from a newer central) have
// no parent here, so they survive every step as top-level values rather than
// being dropped.

// One MULTI_OPTION stored value → the ids it holds. The shape is an array of
// strings and nothing else: a bare string (what a field retyped from OPTION
// leaves behind) or a mixed array is not a value of this field and reads as
// empty, matching the server's write-side check.
export const multiOptionIds = (value: unknown): string[] =>
  Array.isArray(value) && value.every(entry => typeof entry === 'string')
    ? (value as string[])
    : [];

// The TOP-MOST ids of a set: those whose parent isn't also in it. What a
// minimal value already is, and what a non-minimal one displays as — a stored
// parent renders as the parent, never as its enumerated children.
export const topMostIds = (
  options: CustomFieldOption[],
  ids: readonly string[]
): string[] => {
  const set = new Set(ids);
  const parentOf = new Map(options.map(o => [o.id, o.parentOptionId]));
  return [...set].filter(id => {
    const parent = parentOf.get(id);
    return !parent || !set.has(parent);
  });
};

// Ids in the definition's configured (depth-first) order, so a value reads the
// same wherever it is rendered. Ids the definition doesn't know keep their
// given order, after the known ones.
export const inConfiguredOrder = (
  options: CustomFieldOption[],
  ids: readonly string[]
): string[] => {
  const rank = new Map(
    orderOptionsHierarchically(options).map((o, index) => [o.option.id, index])
  );
  const known = ids.filter(id => rank.has(id));
  const unknown = ids.filter(id => !rank.has(id));
  known.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  return [...known, ...unknown];
};

// Stored (minimal) → the set the picker ticks: each stored id plus everything
// beneath it.
export const expandStoredToSelection = (
  options: CustomFieldOption[],
  stored: readonly string[]
): string[] => {
  const out = new Set<string>();
  for (const id of stored)
    for (const descendant of optionAndDescendantIds(options, id))
      out.add(descendant);
  return [...out];
};

// The ticked set → what to store: the minimal covering set, in configured
// order. Ticking every child of a parent stores the PARENT (the picker ticks
// the parent too, so this is what the user sees), and a partially ticked
// parent stores its ticked children.
export const collapseSelectionToStored = (
  options: CustomFieldOption[],
  selected: readonly string[]
): string[] => inConfiguredOrder(options, topMostIds(options, selected));

// The shared TICK RULE, used by the editor and by the list filter so the two
// can never drift: selection is a DIFF over the previous set, so ticking or
// unticking one option doesn't re-lock the rest. Adding a node selects its
// whole subtree; removing one clears its subtree AND its ancestors — a parent
// is only selected while every descendant is.
export const applyOptionToggle = (
  options: CustomFieldOption[],
  previous: readonly string[],
  next: readonly string[]
): string[] => {
  const before = new Set(previous);
  const after = new Set(next);
  for (const added of next.filter(id => !before.has(id)))
    for (const descendant of optionAndDescendantIds(options, added))
      after.add(descendant);
  for (const removed of [...before].filter(id => !after.has(id))) {
    for (const descendant of optionAndDescendantIds(options, removed))
      after.delete(descendant);
    for (const ancestor of ancestorIds(options, removed))
      after.delete(ancestor);
  }
  return [...after];
};

// The ids a MULTI_OPTION filter asks the server about: the chosen set expanded
// BOTH ways. Downward because a record may store a child of what was chosen;
// upward because a record storing a parent MINIMALLY holds each of its
// children, so filtering on a child must still find it. Overlap against this
// set is the whole hierarchy question — the server walks no tree.
export const filterQueryIds = (
  options: CustomFieldOption[],
  chosen: readonly string[]
): string[] => {
  const out = new Set<string>();
  for (const id of chosen) {
    for (const descendant of optionAndDescendantIds(options, id))
      out.add(descendant);
    for (const ancestor of ancestorIds(options, id)) out.add(ancestor);
  }
  return [...out];
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
  | { kind: 'multiOption'; def: CustomFieldDef; options: OrderedOption[] }
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
    case 'MULTI_OPTION':
      return {
        kind: 'multiOption',
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
// promoted to the detail toolbar and NOT repeated in the tab (spec ›
// placement). A read-only surface has no toolbar, so it passes `promote: false`
// to show every shown field in the tab.
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

// The tab's two-column split (spec/ui-standards/custom-fields › the tab), shared
// by the read-only and editable tabs so they lay out identically. The fields are
// RUNTIME DATA, so the split can't name particular fields: the first half goes
// down column one and the rest down column two, which means reading down column
// one then column two preserves the configured order. The taller half LEADS, so
// an odd count puts the extra field in column one rather than leaving column two
// longer than the one beside it.
export const splitIntoColumns = <T>(fields: T[]): [T[], T[]] => {
  const split = Math.ceil(fields.length / 2);
  return [fields.slice(0, split), fields.slice(split)];
};

// The single JSON-scalar boundary: `customFields` is typed `unknown` by codegen
// (honest for arbitrary JSON). At runtime the server sends a JSON object (a
// JSON string is also accepted). Narrow it to a plain record here, once.
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
