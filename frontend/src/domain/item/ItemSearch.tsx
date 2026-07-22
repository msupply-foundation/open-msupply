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
   * Item ids to hide from the results. Optional — omit to show every item (e.g.
   * the stocktake line editor now shows all items, even ones already counted,
   * and loads that item's existing lines when picked).
   */
  excludeItemIds?: string[];
  /**
   * The currently-selected item's id (controlled). Shows that item as the
   * value while still allowing a new search — e.g. the picked item stays in
   * the picker after selection so it can be swapped for another.
   */
  value?: string;
  /**
   * The selected item's label fields, for when `value` is an item that ISN'T in
   * the search's own paginated results (e.g. an item the stocktake editor opened
   * from a row, not from a search). Without it the combobox can't resolve the id
   * to a label and shows blank. Only code/name are needed to render the label.
   */
  selectedItem?: { id: string; code: string; name: string };
  /** The picked item, or null when the selection is cleared. */
  onSelect: (item: ItemOption | null) => void;
  placeholder?: string;
  hideLabel?: boolean;
  /** Read-only: show the selected item but don't allow searching/changing it. */
  disabled?: boolean;
  error?: string;
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
  // item added via "OK & next") is picked up on the next fetch. excludeItemIds
  // is optional (the stocktake editor shows all items) → default to [].
  const fetchPage = itemPageFetcher(
    props.storeId,
    () => props.excludeItemIds ?? [],
    PAGE_SIZE
  );

  return (
    <AsyncCombobox<ItemOption>
      label={props.label}
      hideLabel={props.hideLabel}
      disabled={props.disabled}
      error={props.error}
      class={props.class}
      placeholder={props.placeholder}
      // Every ItemSearch IS the contract's item search — the fixed id is
      // stamped here (like ConfirmDialog's confirmation-modal), not per call
      // site (e2e/TESTIDS.md).
      inputTestId="item-search-input"
      fetchPage={fetchPage}
      value={props.value}
      // Fallback so the field shows a label when `value` is an item that isn't
      // in the current search results (opened from outside the search). Only
      // code/name feed the label; the dropdown-only fields get safe defaults.
      selected={
        props.selectedItem
          ? {
              id: props.selectedItem.id,
              code: props.selectedItem.code,
              name: props.selectedItem.name,
              unitName: null,
              totalUnits: 0,
              // Label-only fallback: the dropdown-only fields get safe defaults
              // (the real values arrive with the item's own search page).
              isVaccine: false,
              doses: 0,
              defaultPackSize: 1,
              defaultSellPricePerPack: 0,
            }
          : undefined
      }
      itemToString={item => `${item.code} - ${item.name}`}
      itemToValue={item => item.id}
      renderItem={renderRow}
      onSelect={item => props.onSelect(item)}
    />
  );
};
