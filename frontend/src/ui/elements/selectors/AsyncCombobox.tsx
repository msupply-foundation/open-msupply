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
  /** Hint text shown below the input (below the error, when both). Passed
   * through to the Combobox. */
  helperText?: string;
  /** Whether the selection can be cleared (default true). */
  clearable?: boolean;
  class?: string;
  /** `data-testid` for the text input (locale-stable test hook). */
  inputTestId?: string;
  /**
   * Status text shown when the settled option list is empty — a domain hint
   * (e.g. the patient picker's "Start typing to search"). Passed through to the
   * Combobox; defaults there to "No matching items".
   */
  noResultsMessage?: string;
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
 *
 * Stale-options window: between a keystroke and its (debounced) refetch
 * landing, the held rows answer the PREVIOUS query. They're shown
 * client-filtered against the current text (see `base`) so every visible
 * option always matches what's typed — without this, scanner-speed input
 * (code + immediate Enter) commits the old list's first item (#318).
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
  // doesn't match, and the interim filter below knows what to match against.
  const [query, setQuery] = createSignal('');

  // The rows the widget may show. While the server's answer is current
  // (`!pending`), that's the fetched page as-is. While the typed text is AHEAD
  // of the server — debounce window + request latency — the held rows belong to
  // the PREVIOUS query and are client-filtered against the current text
  // (case-insensitive substring on itemToString, approximating the server
  // filter), so a scanner-speed type-and-Enter can never commit an option that
  // doesn't match what was typed (#318). The interim list is only as good as
  // the held page (~one page of the old query), which is fine: when the real
  // page-0 response lands, `pending` drops and it replaces this wholesale.
  const base = (): T[] => {
    if (!search.pending()) return search.items();
    const needle = query().toLocaleLowerCase();
    if (!needle) return search.items();
    return search
      .items()
      .filter(i => props.itemToString(i).toLocaleLowerCase().includes(needle));
  };

  // The caller's selected node leads the list (deduped) so a controlled value
  // resolves even before its page is fetched. We seed it when it either matches
  // the typed query OR IS the controlled selection: the latter guarantees a
  // controlled selection's label never blanks — e.g. when the parent advances
  // the value externally ("OK & next" steps to a new item) while the input
  // still holds the previous item's text as a stale, non-matching query. We
  // still drop an unmatched seed that ISN'T the current value, so a free-text
  // search doesn't sort a stale seed above real matches or mask "no matches".
  const items = (): T[] => {
    const seed = props.selected;
    if (!seed) return base();
    const key = props.itemToValue(seed);
    const needle = query().toLocaleLowerCase();
    const seedMatches =
      !needle || props.itemToString(seed).toLocaleLowerCase().includes(needle);
    const isControlledValue = value() === key;
    if (!seedMatches && !isControlledValue) return base();
    return [seed, ...base().filter(i => props.itemToValue(i) !== key)];
  };

  const value = () =>
    props.value ??
    (props.selected ? props.itemToValue(props.selected) : undefined);

  // What `loading` means to the Combobox: "show a Loading row instead of the
  // list". With the interim filter above there's usually something sensible to
  // show while a fetch is pending, so we only signal loading when the filtered
  // interim list is EMPTY — blanking a non-empty interim list would reintroduce
  // the list-blink the filter exists to avoid. While pending with nothing to
  // show, loading (not "no matches") is the honest state: the in-flight page-0
  // fetch — or the one the debounce is about to fire — can still produce rows.
  const loading = () => search.pending() && items().length === 0;

  return (
    <Combobox<T>
      label={props.label}
      hideLabel={props.hideLabel}
      class={props.class}
      disabled={props.disabled}
      error={props.error}
      helperText={props.helperText}
      clearable={props.clearable}
      placeholder={props.placeholder}
      inputTestId={props.inputTestId}
      noResultsMessage={props.noResultsMessage}
      items={items()}
      loading={loading()}
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
