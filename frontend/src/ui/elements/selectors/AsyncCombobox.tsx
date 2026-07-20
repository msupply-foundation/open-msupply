import { type JSX } from 'solid-js';
import { Combobox } from './Combobox';
import {
  createPaginatedSearch,
  type Page,
} from '../../utils/createPaginatedSearch';

export interface AsyncComboboxProps<T> {
  label: string;
  /**
   * Fetch one page of options: server-filtered by `search`, at `offset` into the
   * full result set. Returns the page (rows + grand total) or undefined on a
   * failed fetch. The caller owns the query; this component owns the
   * fetch/accumulate/paging loop and the widget.
   */
  fetchPage: (search: string, offset: number) => Promise<Page<T> | undefined>;
  /** The plain-text label of an item — the input text + a11y name. */
  itemToString: (item: T) => string;
  /** Unique string key per item (selection identity + form value). */
  itemToValue: (item: T) => string;
  /** Rich per-option rendering; defaults to the plain itemToString label. */
  renderItem?: (item: T) => JSX.Element;
  /**
   * The controlled selection key (an itemToValue). Use for a picker whose
   * current value is already among the loaded page; pair with `selectedItem`
   * when the value may not be loaded (see below).
   */
  value?: string;
  /**
   * The resolved item for a controlled `value` whose row may not be on the
   * loaded page (a paged search only loads a page at a time). Passed straight to
   * the Combobox so the selection's label renders and stays visible during a
   * fetch. Omit for a fresh picker with no pre-set value.
   */
  selectedItem?: T;
  /** The picked item, or null when the selection is cleared. */
  onSelect: (item: T | null) => void;
  placeholder?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  class?: string;
  /** `data-testid` for the text input (locale-stable test hook). */
  inputTestId?: string;
}

/*
 * A server-side-filtered, infinite-scroll combobox: the shared Combobox wired to
 * the paginated-search loop (createPaginatedSearch). Typing refetches from the
 * backend (the caller's `fetchPage`), scrolling near the bottom loads the next
 * page, and a controlled `value` (+ optional `selectedItem`) shows the current
 * selection even before/without loading its page.
 *
 * This is the generic engine the domain search selectors are built on
 * (ItemSearch, NameSearch, …): each supplies a `fetchPage` (its query) + row
 * rendering and holds no combobox/pagination plumbing of its own. The Combobox
 * itself stays the client-mode (whole-list) primitive; this is its async twin.
 */
export const AsyncCombobox = <T,>(
  props: AsyncComboboxProps<T>
): JSX.Element => {
  // Created ONCE (not in a memo) so its signals/effects/debounce keep a stable
  // owner and the accumulated pages survive re-renders. The fetcher is read per
  // call, so later changes to the caller's closure (e.g. exclusions) are picked
  // up without recreating the primitive.
  const search = createPaginatedSearch<T>({
    fetchPage: (value, offset) => props.fetchPage(value, offset),
  });

  return (
    <Combobox<T>
      label={props.label}
      hideLabel={props.hideLabel}
      class={props.class}
      disabled={props.disabled}
      placeholder={props.placeholder}
      inputTestId={props.inputTestId}
      items={search.items()}
      loading={search.loading()}
      loadingMore={search.loadingMore()}
      value={props.value}
      selectedItem={props.selectedItem}
      itemToString={props.itemToString}
      itemToValue={props.itemToValue}
      renderItem={props.renderItem}
      onInputChange={value => search.setSearch(value)}
      onReachEnd={() => search.loadMore()}
      onChange={item => props.onSelect(item)}
    />
  );
};
