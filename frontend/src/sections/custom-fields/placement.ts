import type { LocaleKey } from '../../intl';
import type {
  CustomFieldScopeConfigResult,
  UpdateCustomFieldScopesVariables,
} from './customFieldConfig.generated';

// The placement axis and the pending-change buffer (spec/custom-fields rules §
// placement, § choosing and saving a placement). Pure and node-testable: no
// SolidJS, no i18n, no DOM — the screen owns rendering, this owns the rules.
//
// Types come from codegen, never remapped (kdd/type-safety).

/** One definition as the configuration read returns it. */
export type ConfigRow =
  CustomFieldScopeConfigResult['centralServer']['customField']['customFieldScopeConfig']['nodes'][number];

/**
 * The display-mode vocabulary, including the server's unrecognised catch-all.
 */
export type DisplayMode = NonNullable<ConfigRow['displayMode']>;

/**
 * The modes a client may SEND. `OTHER` is excluded deliberately: the server
 * accepts it and silently coerces it to `VISIBLE`, so sending it would write a
 * different value than the one sent (contract.md wire trap). Excluding it from
 * the pending-change type makes that unrepresentable rather than merely
 * discouraged.
 */
export type SettableDisplayMode = Exclude<DisplayMode, 'OTHER'>;

/** The pending set: definition id → the mode it would be saved as. */
export type PendingChanges = Readonly<Record<string, SettableDisplayMode>>;

type UpdateInput = UpdateCustomFieldScopesVariables['input']['updates'][number];

/**
 * The rows a configuration response lists, in the order it returned them.
 *
 * The per-scope configured rank lives on the server's scope row and reaches the
 * client as RESPONSE ORDER only — there is no order field — so this preserves
 * it and never re-ranks (contract § definitions are configuration). It also
 * never filters: this read is the one that KEEPS hidden placements
 * (OMS-REG-CF-02.3), and retired / unrecognised definitions are already
 * excluded server-side (.7), so anything the client dropped or re-sorted here
 * would be a defect, not a policy.
 */
export const configRows = (nodes: readonly ConfigRow[]): ConfigRow[] => [
  ...nodes,
];

/**
 * A row's saved mode. `displayMode` is nullable in the schema because it is
 * populated only when the read names a single scope — the configuration read
 * always does, so null is unreachable here; treated as shown for the same
 * reason the server treats an unrecognised mode as non-hidden.
 */
export const savedMode = (row: ConfigRow): DisplayMode =>
  row.displayMode ?? 'VISIBLE';

/**
 * The mode a row would be saved as right now: its pending change, else saved.
 */
export const currentMode = (
  row: ConfigRow,
  pending: PendingChanges
): DisplayMode => pending[row.id] ?? savedMode(row);

// The axis is ORDERED — Hidden → Visible → Prominent — not two independent
// flags (rules § placement). The two checkboxes are two views of the one mode.

/** Visible is ticked for any shown field, promoted or not. */
export const visibleChecked = (mode: DisplayMode): boolean => mode !== 'HIDDEN';

/** Prominent is ticked only for a promoted field. */
export const prominentChecked = (mode: DisplayMode): boolean =>
  mode === 'PROMINENT';

/**
 * Whether the Prominent cell offers a control at all. An out-of-sight field has
 * nothing to promote, so its cell is EMPTY — not an unticked box (ui-surface
 * S1 § columns).
 */
export const offersPromotion = (mode: DisplayMode): boolean =>
  mode !== 'HIDDEN';

/**
 * Ticking / unticking Visible.
 *
 * Unticking takes the field out of sight, whatever it was — a field can never
 * be promoted and out of sight at once. Re-ticking returns it as plain
 * VISIBLE: the earlier promotion is NOT remembered (OMS-REG-CF-02.17,
 * screen-confirmed and captured as-is — spec README flags whether it should be
 * as a product call).
 */
export const withVisible = (
  mode: DisplayMode,
  checked: boolean
): SettableDisplayMode => {
  if (!checked) return 'HIDDEN';
  return mode === 'PROMINENT' ? 'PROMINENT' : 'VISIBLE';
};

/**
 * Ticking / unticking Prominent on a shown field: promote, or return it to
 * plain shown. Only offered while the field is shown ({@link
 * offersPromotion}), so this never has to invent a mode for an out-of-sight
 * row.
 */
export const withProminent = (checked: boolean): SettableDisplayMode =>
  checked ? 'PROMINENT' : 'VISIBLE';

/**
 * Record a placement choice in the pending set.
 *
 * Changes are BUFFERED, and a round trip leaves nothing to save: choosing the
 * mode a row already holds DROPS its pending entry rather than storing a no-op
 * (rules § choosing and saving; OMS-REG-CF-02.6). An unrecognised saved mode
 * compares unequal to every settable mode, so re-choosing "shown" on such a row
 * stays pending — saving it is what resolves it to plain VISIBLE.
 */
export const applyChoice = (
  pending: PendingChanges,
  row: ConfigRow,
  mode: SettableDisplayMode
): PendingChanges => {
  const next = { ...pending };
  if (mode === savedMode(row)) delete next[row.id];
  else next[row.id] = mode;
  return next;
};

/** Nothing pending ⇒ nothing to save (Save is disabled). */
export const hasPendingChanges = (pending: PendingChanges): boolean =>
  Object.keys(pending).length > 0;

/**
 * The update list for a save: only the placements that actually changed, and
 * only ones belonging to the rows currently listed for this scope — a save
 * covers ONE scope, so no other scope's placement can ride along
 * (OMS-REG-CF-02.10).
 */
export const pendingUpdates = (
  rows: readonly ConfigRow[],
  pending: PendingChanges
): UpdateInput[] =>
  rows
    .filter(row => pending[row.id] !== undefined)
    .map(row => ({ customFieldId: row.id, displayMode: pending[row.id] }));

/**
 * The value type as a label key (ui-surface S1 § value-type labels). REAL
 * reads as "Number" — the one label that does not echo its type's name. A
 * value type this build cannot type at all falls back to Text rather than
 * rendering blank; unreachable while the generated union is exhaustive,
 * reachable the day a newer central introduces one.
 */
export const valueTypeLabelKey = (
  valueType: ConfigRow['valueType']
): LocaleKey => {
  switch (valueType) {
    case 'TEXT':
      return 'label.custom-field-type-text';
    case 'INTEGER':
      return 'label.custom-field-type-integer';
    case 'REAL':
      return 'label.custom-field-type-real';
    case 'DATE':
      return 'label.custom-field-type-date';
    case 'BOOLEAN':
      return 'label.custom-field-type-boolean';
    case 'OPTION':
      return 'label.custom-field-type-option';
  }
  return 'label.custom-field-type-text';
};
