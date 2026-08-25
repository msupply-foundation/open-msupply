import { CustomFieldNodeValueType } from '@common/types';

/**
 * Minimal structural shape of a customFields definition needed to render a
 * value. The generated `CustomFieldFragment` (per-record-kind: name, item, …)
 * is structurally assignable to this, so these helpers are shared across all
 * record kinds rather than duplicated per kind.
 */
export interface CustomFieldOptionLike {
  id: string;
  name: string;
  /** Parent option id for hierarchical OPTIONs (e.g. name category 1); null/absent for flat. */
  parentOptionId?: string | null;
  /**
   * Set when the option has been deleted. The server returns deleted options
   * deliberately — a stored value is only ever an option id, so dropping them
   * would make every record still holding one render a raw id instead of a
   * name. So they stay **resolvable but not offerable**: see `withoutDeleted`.
   */
  deletedDatetime?: string | null;
}

export interface CustomFieldDefinitionLike {
  valueType: CustomFieldNodeValueType;
  options: CustomFieldOptionLike[];
}

/**
 * Drop deleted options — everything a user could *choose* is built from this,
 * while `resolveOptionValue` deliberately reads the unfiltered list so an
 * already-stored deleted value still renders its name. Deleting an option
 * therefore stops it being picked without stranding the records that hold it.
 *
 * A deleted parent leaves its children in place: they become orphans, and the
 * hierarchy walkers below already treat an option whose parent is absent as a
 * root.
 */
const withoutDeleted = (
  definition: CustomFieldDefinitionLike
): CustomFieldDefinitionLike => ({
  ...definition,
  options: definition.options.filter(o => !o.deletedDatetime),
});

/**
 * The options a value may actually be set to: the **leaves** of the option
 * hierarchy — those not referenced as any other option's `parentOptionId`.
 *
 * For flat dimensions (no parents anywhere) every option is a leaf. For
 * hierarchical OPTIONs (e.g. name category 1, with level1 → level2 → leaf) only
 * the deepest level is selectable, matching what mSupply stores on the record.
 */
export const getSelectableOptions = (
  definition: CustomFieldDefinitionLike
): CustomFieldOptionLike[] => {
  const live = withoutDeleted(definition);
  const parentIds = new Set(
    live.options.map(o => o.parentOptionId).filter((id): id is string => !!id)
  );
  return live.options.filter(o => !parentIds.has(o.id));
};

export interface HierarchicalOption extends CustomFieldOptionLike {
  /** 0 for roots, +1 per level — drives indentation. */
  depth: number;
  /** A leaf (no children). Parents render as bold group levels; whether they
   * are also pickable is the consuming control's call (filters allow it, the
   * edit input doesn't — records store leaf ids). */
  isLeaf: boolean;
}

/** Group options by parent id (orphans — parent not present — count as
 * roots, keyed under `undefined`). Shared by the hierarchy walkers below. */
const getChildrenByParent = (
  definition: CustomFieldDefinitionLike
): Map<string | undefined, CustomFieldOptionLike[]> => {
  const ids = new Set(definition.options.map(o => o.id));
  const childrenByParent = new Map<
    string | undefined,
    CustomFieldOptionLike[]
  >();
  for (const option of definition.options) {
    const parent =
      option.parentOptionId && ids.has(option.parentOptionId)
        ? option.parentOptionId
        : undefined;
    const siblings = childrenByParent.get(parent) ?? [];
    siblings.push(option);
    childrenByParent.set(parent, siblings);
  }
  return childrenByParent;
};

/**
 * Flatten the option hierarchy into display order (depth-first pre-order), each
 * option tagged with its `depth` and whether it's a leaf. Parent levels are
 * included so the dropdown can render the tree with indentation. Flat
 * dimensions (no parents) come back as a depth-0 list of leaves. Orphans
 * (parent not present) are treated as roots; a `seen` guard makes it safe
 * against cyclic parent references.
 *
 * Deleted options are excluded — this feeds selection surfaces (the edit
 * picker, the list's option filter). The edit control re-adds the record's own
 * current value when it isn't in this list, which is what keeps a deleted value
 * visible on the record that holds it without offering it to anyone else.
 */
export const getHierarchicalOptions = (
  definition: CustomFieldDefinitionLike
): HierarchicalOption[] => {
  const childrenByParent = getChildrenByParent(withoutDeleted(definition));

  const result: HierarchicalOption[] = [];
  const seen = new Set<string>();
  const visit = (option: CustomFieldOptionLike, depth: number) => {
    if (seen.has(option.id)) return; // cycle guard
    seen.add(option.id);
    const children = childrenByParent.get(option.id) ?? [];
    result.push({ ...option, depth, isLeaf: children.length === 0 });
    children.forEach(child => visit(child, depth + 1));
  };
  (childrenByParent.get(undefined) ?? []).forEach(root => visit(root, 0));
  return result;
};

/**
 * The option id plus all its descendant ids (depth-first, cycle-guarded) —
 * used to expand a parent filter selection into the set of ids a record might
 * store. Includes intermediate levels, not just leaves, so values stored at
 * any level under the selection still match. An id with no descendants (or
 * not in the definition at all) comes back as just itself.
 *
 * Deliberately walks the **unfiltered** options: a deleted option can't be
 * picked any more, but records still hold it, so filtering by its parent must
 * keep finding them.
 */
export const getOptionAndDescendantIds = (
  definition: CustomFieldDefinitionLike,
  optionId: string
): string[] => {
  const childrenByParent = getChildrenByParent(definition);

  const result: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return; // cycle guard
    seen.add(id);
    result.push(id);
    (childrenByParent.get(id) ?? []).forEach(child => visit(child.id));
  };
  visit(optionId);
  return result;
};

/**
 * Resolve an OPTION value (an option id, or array of ids) to its display name.
 * An id with no matching option resolves to '' — we show nothing rather than
 * leaking the raw internal id (#12366). This happens for legacy categories
 * deleted in mSupply before the OG→OMS migration: the `transaction_category`
 * record is gone, so no `custom_field_option` ever syncs and the invoice's
 * stored id references nothing. Mirrors OG, which falls back to "None" for an
 * orphaned `category_ID`. Array entries that don't resolve are dropped so a
 * missing id doesn't leave a stray comma.
 *
 * Note this reads `definition.options` **unfiltered**, so a soft-deleted option
 * still resolves to its name — that is precisely why the server returns deleted
 * options. Only an id with no row at all (the legacy case above) comes back
 * empty.
 */
export const resolveOptionValue = (
  definition: CustomFieldDefinitionLike,
  value: unknown
): string => {
  const lookup = (v: unknown): string =>
    definition.options.find(o => o.id === v)?.name ?? '';

  return Array.isArray(value)
    ? value.map(lookup).filter(Boolean).join(', ')
    : lookup(value);
};

/**
 * Format a single customFields value for read-only text display, given its
 * definition. OPTION values resolve option-id → option name; DATE values are
 * localised when parseable; everything else (TEXT, REAL, INTEGER) is
 * stringified. BOOLEAN values are typically rendered as a checkbox by the
 * presenter rather than via this function.
 */
export const formatCustomFieldValue = (
  definition: CustomFieldDefinitionLike,
  value: unknown,
  localisedDate: (date: Date) => string
): string => {
  if (value === null || value === undefined) return '';
  switch (definition.valueType) {
    case CustomFieldNodeValueType.Option:
      return resolveOptionValue(definition, value);
    case CustomFieldNodeValueType.Date: {
      const date = new Date(String(value));
      return isNaN(date.getTime()) ? String(value) : localisedDate(date);
    }
    default:
      return String(value);
  }
};

/**
 * The definitions to render as rows, in the (stable) order the definitions
 * query returns them — only those that actually carry a value on this record.
 * Iterating definitions rather than the value object keeps row order
 * independent of JSON key order. Generic so the caller keeps its richer
 * fragment type.
 */
export const getVisiblePropertyRows = <T extends { key: string }>(
  definitions: T[],
  properties: Record<string, unknown>
): T[] =>
  definitions.filter(d =>
    Object.prototype.hasOwnProperty.call(properties, d.key)
  );
