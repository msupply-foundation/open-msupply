import { type JSX } from 'solid-js';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { formatNumber } from '../../intl/formatNumber';
import { t } from '../../intl';
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
 * Reusable server-side-filtered, infinite-scroll item picker (add-item flow) —
 * a thin binding over the generic AsyncCombobox: it supplies the `items`-query
 * fetcher (excluding `excludeItemIds` server-side) and the option row;
 * AsyncCombobox owns the combobox + pagination.
 */
export const ItemSearch = (props: ItemSearchProps): JSX.Element => {
  // The fetcher reads the exclusions accessor per call, so a later change (an
  // item added via "OK & next") is picked up on the next fetch.
  const fetchPage = itemPageFetcher(
    props.storeId,
    () => props.excludeItemIds,
    PAGE_SIZE
  );

  return (
    <AsyncCombobox<ItemOption>
      label={props.label}
      hideLabel={props.hideLabel}
      class={props.class}
      placeholder={props.placeholder}
      // Every ItemSearch IS the contract's item search — the fixed id is
      // stamped here (like ConfirmDialog's confirmation-modal), not per call
      // site (e2e/TESTIDS.md).
      inputTestId="item-search-input"
      fetchPage={fetchPage}
      value={props.value}
      itemToString={item => `${item.code} - ${item.name}`}
      itemToValue={item => item.id}
      renderItem={renderRow}
      onSelect={item => props.onSelect(item)}
    />
  );
};
