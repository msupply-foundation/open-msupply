import { createMemo, createResource, type JSX } from 'solid-js';
import { gated } from '../../api/gated';
import { t } from '../../intl';
import { Select } from '../../ui/elements/selectors/Select';
import {
  fetchSharedItemPrograms,
  type ItemProgram,
} from './itemProgramsResource';

export interface ProgramSelectProps {
  /** The store, for the per-item program fetch. */
  storeId: string;
  /**
   * The items the field must suit. ONE for a line's own program; SEVERAL for a
   * bulk edit over a selection, where the single pick lands on all of them and
   * so only what they share can be offered. Repeats (several batches of one
   * item) count once.
   */
  itemIds: readonly string[];
  /** The currently-selected program id (undefined = none). */
  programId?: string;
  /**
   * Fires with the chosen program (the full node, so callers can store id+name
   * for display), or null when the field is cleared.
   */
  onChange: (program: ItemProgram | null) => void;
  /**
   * Field label (required for a11y). Defaults to the field's own name —
   * every caller wants `label.program`; pass one only to rename it.
   */
  label?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  /**
   * `data-testid` for the field (locale-stable test hook, e2e/TESTIDS.md).
   * Named as {@link ActivitySelect}'s and every other domain lookup's, so the
   * two fields a caller renders side by side take the SAME prop — it lands on
   * this one's trigger button rather than an input, which is the primitive's
   * business, not the caller's.
   */
  inputTestId?: string;
  /** Control size — 'small' for dense contexts (a batch-grid cell). */
  size?: 'default' | 'small';
  /** Max-width cap — forwarded to the Select, opt-in (default `full`). */
  width?: 'compact' | 'short' | 'long' | 'full';
}

/*
 * The reusable program picker — a plain Select over the programs configured for
 * the edited item(s) in the store. Unlike campaigns (one app-wide cache)
 * programs are narrowed BY ITEM, so they're fetched per item: the resource
 * re-runs whenever the items change. A short, item-narrowed list, so there is
 * nothing to search. Sits beside {@link ActivitySelect}: program and activity
 * are independent choices on a line, each written to its own wire field.
 *
 * ONE component for the line's field and the bulk edit of a selection, since
 * they ask the same question of a different number of items — the bulk case is
 * the plural of the single one, not a second control.
 */
export const ProgramSelect = (props: ProgramSelectProps): JSX.Element => {
  // Distinct and ordered, so the resource re-fetches when the ITEMS change and
  // not when a caller rebuilds the array it passed. `equals` keeps the previous
  // value — and so the previous reference — whenever the set is unchanged.
  const items = createMemo(() => [...new Set(props.itemIds)].sort(), [], {
    equals: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]),
  });

  const [programs] = createResource(
    () => ({ storeId: props.storeId, itemIds: items() }),
    ({ storeId, itemIds }) => fetchSharedItemPrograms(storeId, itemIds)
  );
  // Read programs WITHOUT ever suspending. This picker renders inside the
  // already-open line-edit modal, itself under the detail view's <Suspense>
  // boundary — so suspending here would collapse that boundary and remount the
  // whole page subtree, which detaches the open <dialog>: it loses the top
  // layer (no backdrop, background not inert), so the modal looks broken on the
  // Other tab (kdd/solid-reactivity-pitfalls › No remounts on interaction,
  // rule 1). The first-pending-read case matters here, since this per-item
  // resource first fetches when the Other tab mounts.
  const programList = (): ItemProgram[] => gated(programs)?.programs ?? [];

  // Nothing to pick: an item with no programs configured for this store leaves
  // the field disabled rather than opening on an empty list. Gated on the fetch
  // having settled, so the control doesn't flicker disabled→enabled while the
  // first per-item read is in flight — and on the field being EMPTY, since a
  // line that carries a program must keep its clear affordance.
  const noPrograms = (): boolean =>
    !programs.loading && programList().length === 0 && !props.programId;

  // Why a SELECTION's list is shorter than the user expected. Only a selection
  // can be narrowed — asked of one item the list is simply that item's, and a
  // line's dense grid cell has no room for a caption it would never need.
  const narrowing = (): string | undefined => {
    const result = gated(programs);
    if (items().length < 2 || !result) return undefined;
    if (result.programs.length === 0) return t('messages.no-shared-programs');
    return result.narrowed ? t('messages.programs-shared-only') : undefined;
  };

  return (
    <Select
      label={props.label ?? t('label.program')}
      hideLabel={props.hideLabel}
      size={props.size}
      width={props.width}
      disabled={props.disabled || noPrograms()}
      testId={props.inputTestId}
      helperText={narrowing()}
      // An OPTIONAL pick clears through the ✕, as every other optional lookup
      // does (ui-standards › controls: clearability follows optionality) —
      // never through a None row in the list. Empty reads as "None" in the
      // placeholder's grey.
      clearable
      onClear={() => props.onChange(null)}
      placeholder={t('label.none')}
      value={props.programId}
      options={programList().map(p => ({ value: p.id, label: p.name }))}
      onValueChange={v =>
        props.onChange(programList().find(p => p.id === v) ?? null)
      }
    />
  );
};
