import { createResource, type JSX } from 'solid-js';
import { gated } from '../../api/gated';
import { t } from '../../intl';
import { Select } from '../../ui/elements/selectors/Select';
import { fetchItemPrograms, type ItemProgram } from './itemProgramsResource';

export interface ProgramSelectProps {
  /** The store, for the per-item program fetch. */
  storeId: string;
  /** The item whose programs are offered. */
  itemId: string;
  /** The currently-selected program id (undefined = none). */
  programId?: string;
  /**
   * Fires with the chosen program (the full node, so callers can store id+name
   * for display), or null when the field is cleared.
   */
  onChange: (program: ItemProgram | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  /**
   * `data-testid` for the trigger button (locale-stable test hook,
   * e2e/TESTIDS.md).
   */
  testId?: string;
  /** Control size — 'small' for dense contexts (a batch-grid cell). */
  size?: 'default' | 'small';
  /** Max-width cap — forwarded to the Select, opt-in (default `full`). */
  width?: 'compact' | 'short' | 'long' | 'full';
}

/*
 * The reusable program picker — a plain Select over the programs configured for
 * one item in the store. Unlike campaigns (one app-wide cache) programs are
 * narrowed BY ITEM, so they're fetched per item: the resource re-runs whenever
 * the edited item changes. A short, item-narrowed list, so there is nothing to
 * search. Sits beside {@link ActivitySelect}: program and activity are
 * independent choices on a line, each written to its own wire field.
 */
export const ProgramSelect = (props: ProgramSelectProps): JSX.Element => {
  const [programs] = createResource(
    () => ({ storeId: props.storeId, itemId: props.itemId }),
    ({ storeId, itemId }) => fetchItemPrograms(storeId, itemId)
  );
  // Read programs WITHOUT ever suspending. This picker renders inside the
  // already-open line-edit modal, itself under the detail view's <Suspense>
  // boundary — so suspending here would collapse that boundary and remount the
  // whole page subtree, which detaches the open <dialog>: it loses the top
  // layer (no backdrop, background not inert), so the modal looks broken on the
  // Other tab (kdd/solid-reactivity-pitfalls › No remounts on interaction,
  // rule 1). The first-pending-read case matters here, since this per-item
  // resource first fetches when the Other tab mounts.
  const programList = (): ItemProgram[] => gated(programs) ?? [];

  // Nothing to pick: an item with no programs configured for this store leaves
  // the field disabled rather than opening on an empty list. Gated on the fetch
  // having settled, so the control doesn't flicker disabled→enabled while the
  // first per-item read is in flight — and on the field being EMPTY, since a
  // line that carries a program must keep its clear affordance.
  const noPrograms = (): boolean =>
    !programs.loading && programList().length === 0 && !props.programId;

  return (
    <Select
      label={props.label}
      hideLabel={props.hideLabel}
      size={props.size}
      width={props.width}
      disabled={props.disabled || noPrograms()}
      testId={props.testId}
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
