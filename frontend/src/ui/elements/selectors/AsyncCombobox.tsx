import { createSignal, type JSX } from 'solid-js';
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
   * The controlled selection key (an itemToValue). For a picker controlled by a
   * bare id whose row is already among the loaded page (e.g. a just-picked
   * item). Callers that hold the whole selected node should pass `selected`
   * instead — it also resolves the value.
   */
  value?: string;
  /**
   * The selected node, when the caller already holds it (e.g. a detail toolbar
   * showing the record's current supplier/customer). Seeded into the option
   * list — while it matches the typed query — so a controlled selection's label
   * shows even before its page is fetched. Also supplies the controlled value
   * when `value` isn't given.
   */
  selected?: T;
  /**
   * Per-option disabled predicate — the option is listed but not selectable
   * (e.g. an on-hold party), exposed as aria-disabled.
   */
  itemDisabled?: (item: T) => boolean;
  /** The picked item, or null when the selection is cleared. */
  onSelect: (item: T | null) => void;
  placeholder?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  class?: string;
  /** `data-testid` for the text input (locale-stable test hook). */
  inputTestId?: string;
}

/*
 * A server-side-filtered, infinite-scroll combobox: the shared Combobox wired to
 * the paginated-search loop (createPaginatedSearch). Typing refetches from the
 * backend (the caller's `fetchPage`), scrolling near the bottom loads the next
 * page, and a controlled selection (`value`/`selected`) shows even before its
 * page loads.
 *
 * This is the generic engine the domain search selectors are built on
 * (ItemSearch, NameSearch, …): each supplies a `fetchPage` (its query) + row
 * rendering and holds no combobox/pagination plumbing of its own.
 * The Combobox itself stays the client-mode (whole-list) primitive; this is its
 * async twin.
 *
 * Deferred first fetch: the page waits for the first open (`ensure` via
 * onOpenChange), so a select that mounts with a detail view but is never opened
 * never fetches. A pre-set `selected` still shows its label immediately — it's
 * seeded into the list, and with no fetch on mount there are no options to blank
 * it out.
 */
export const AsyncCombobox = <T,>(
  props: AsyncComboboxProps<T>
): JSX.Element => {
  // Created ONCE so accumulated pages + debounce keep a stable owner. Deferred
  // (`eager: false`): the first page waits for the first open (see onOpenChange).
  const search = createPaginatedSearch<T>({
    fetchPage: (value, offset) => props.fetchPage(value, offset),
    eager: false,
  });

  // What the user has typed — so the seed below drops out of a search it
  // doesn't match.
  const [query, setQuery] = createSignal('');

  // The caller's selected node leads the list (deduped) so a controlled value
  // resolves even before its page is fetched — but only while it matches the
  // typed query (or none is typed): an unmatched seed would sort above real
  // matches and mask the "no matches" row (which keys off an empty list).
  const items = (): T[] => {
    const seed = props.selected;
    if (!seed) return search.items();
    const key = props.itemToValue(seed);
    const needle = query().toLocaleLowerCase();
    const seedMatches =
      !needle || props.itemToString(seed).toLocaleLowerCase().includes(needle);
    if (!seedMatches) return search.items();
    return [seed, ...search.items().filter(i => props.itemToValue(i) !== key)];
  };

  const value = () =>
    props.value ??
    (props.selected ? props.itemToValue(props.selected) : undefined);

  return (
    <Combobox<T>
      label={props.label}
      hideLabel={props.hideLabel}
      class={props.class}
      disabled={props.disabled}
      error={props.error}
      placeholder={props.placeholder}
      inputTestId={props.inputTestId}
      items={items()}
      loading={search.loading()}
      loadingMore={search.loadingMore()}
      value={value()}
      itemToString={props.itemToString}
      itemToValue={props.itemToValue}
      itemDisabled={props.itemDisabled}
      renderItem={props.renderItem}
      onInputChange={next => {
        setQuery(next);
        search.setSearch(next);
      }}
      onOpenChange={open => open && search.ensure()}
      onReachEnd={() => search.loadMore()}
      onChange={item => props.onSelect(item)}
    />
  );
};
