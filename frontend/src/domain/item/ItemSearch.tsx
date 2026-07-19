import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { formatNumber } from '../../intl/formatNumber';
import { t } from '../../intl';
import { createPaginatedSearch } from './createPaginatedSearch';
import { itemPageFetcher, type ItemOption } from './itemResource';
import styles from './ItemSearch.module.css';

const PAGE_SIZE = 30;

export interface ItemSearchProps {
  label: string;
  storeId: string;
  /**
   * Item ids to hide from the results (e.g. items already on the stocktake).
   */
  excludeItemIds: string[];
  /**
   * The currently-selected item's id (controlled). Shows that item as the
   * value while still allowing a new search — e.g. the picked item stays in
   * the picker after selection so it can be swapped for another.
   */
  value?: string;
  /** The picked item, or null when the selection is cleared. */
  onSelect: (item: ItemOption | null) => void;
  placeholder?: string;
  hideLabel?: boolean;
  /** Passed through to the underlying combobox field (sizing/placement). */
  class?: string;
}

// One option row: "code - name" at the inline-start, "{total} {unit}" at the
// end (unit falls back to the generic "units" when the item has no unit name).
// Code and name are separately-marked nodes (e2e/TESTIDS.md item-option-code /
// -name) so the suites can read either regardless of the datafile's format.
const renderRow = (item: ItemOption): JSX.Element => (
  <span class={styles.row}>
    <span class={styles.label}>
      <span data-testid="item-option-code">{item.code}</span>
      {' - '}
      <span data-testid="item-option-name">{item.name}</span>
    </span>
    <span class={styles.total}>
      {formatNumber(item.totalUnits)} {item.unitName ?? t('label.unit-plural')}
    </span>
  </span>
);

/**
 * Reusable server-side-filtered, infinite-scroll item picker (add-item flow).
 * Wraps the shared Combobox in server mode — typing refetches from the backend
 * (filtered by code/name), scrolling to the bottom loads the next page — over
 * the paginated `items` query. Excludes `excludeItemIds` server-side so items
 * already in the caller's context aren't offered.
 *
 * Domain-level (not a ui/ element) because it's bound to the item query; it
 * follows the domain-selector pattern (LocationSelect/ReasonSelect wrap
 * Combobox) but server-fed rather than whole-list — see
 * [[createPaginatedSearch]].
 */
export const ItemSearch = (props: ItemSearchProps): JSX.Element => {
  // Created ONCE (not in a memo) so its signals/effects/debounce keep a stable
  // owner and the accumulated pages survive re-renders. The fetcher reads the
  // exclusions accessor per call, so a later change (an item added via "OK &
  // next") is picked up on the next fetch without recreating the primitive.
  const search = createPaginatedSearch<ItemOption>({
    fetchPage: itemPageFetcher(
      props.storeId,
      () => props.excludeItemIds,
      PAGE_SIZE
    ),
  });

  return (
    <Combobox<ItemOption>
      label={props.label}
      hideLabel={props.hideLabel}
      class={props.class}
      placeholder={props.placeholder}
      // Every ItemSearch IS the contract's item search — the fixed id is
      // stamped here (like ConfirmDialog's confirmation-modal), not per call
      // site (e2e/TESTIDS.md).
      inputTestId="item-search-input"
      items={search.items()}
      loading={search.loading()}
      loadingMore={search.loadingMore()}
      value={props.value}
      itemToString={item => `${item.code} - ${item.name}`}
      itemToValue={item => item.id}
      renderItem={renderRow}
      onInputChange={value => search.setSearch(value)}
      onReachEnd={() => search.loadMore()}
      onChange={item => props.onSelect(item)}
    />
  );
};
