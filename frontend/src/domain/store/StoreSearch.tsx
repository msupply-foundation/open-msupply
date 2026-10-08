import type { JSX } from 'solid-js';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { storePageFetcher, type StoreOption } from './storeResource';
import styles from './StoreSearch.module.css';

/*
 * The STORE LOOKUP role (spec/ui-standards/components.md § selects & lookups):
 * the SERVER's stores — not the session's accessible ones — each option
 * showing its code above its store name, ordered by name and searched on
 * code-or-name. Distinct from the shell's store SELECTOR (the active-store
 * affordance) and from the store-selection screen.
 *
 * The registry maps the role to `AsyncCombobox` "by configuration", so this is
 * a thin binding: it supplies the fetcher and the option row, and the library
 * component owns the combobox, the paging loop and the deferred first fetch.
 *
 * It serves both selection shapes the role has:
 *
 * - a VALUE field — pass `selected`, and the picked store stays in the input
 *   (the sync-message create modal's destination);
 * - an ADD command — omit `selected`, and the caller clears by adding the pick
 *   to its own list (the site editor's store assignment).
 */

const renderRow = (store: StoreOption): JSX.Element => (
  <span class={styles.option}>
    {/* Two separately-marked nodes, following the code-or-name option
        convention the other pickers use (e2e/TESTIDS.md). */}
    <span class={styles.code} data-testid="item-option-code">
      {store.code}
    </span>
    <span data-testid="item-option-name">{store.storeName}</span>
  </span>
);

export interface StoreSearchProps {
  label: string;
  /** The picked store, held as the whole node — an async picker has no local
   *  list to resolve a bare id against. Omit for an add-and-clear picker. */
  selected?: StoreOption;
  onSelect: (store: StoreOption | null) => void;
  /** Store ids to withhold, read at fetch time. Omit to exclude nothing — the
   *  active store is then itself offerable. */
  excludeIds?: () => readonly string[];
  disabled?: boolean;
  inputTestId?: string;
}

export const StoreSearch = (props: StoreSearchProps): JSX.Element => (
  <AsyncCombobox<StoreOption>
    label={props.label}
    disabled={props.disabled}
    inputTestId={props.inputTestId ?? 'store-search-input'}
    fetchPage={storePageFetcher(() => props.excludeIds?.() ?? [])}
    // The input shows the store's name; the dropdown row shows code + name.
    itemToString={store => store.storeName}
    itemToValue={store => store.id}
    renderItem={renderRow}
    selected={props.selected}
    onSelect={props.onSelect}
  />
);
