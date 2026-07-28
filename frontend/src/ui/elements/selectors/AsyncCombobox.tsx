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
   * Status text shown when a settled search matched nothing — a domain
   * message (e.g. the patient picker's "No matching patients"). Passed through
   * to the Combobox; defaults there to "No matching items".
   */
  noResultsMessage?: string;
  /**
   * Status text shown while nothing has been typed — the type-to-search
   * prompt of a picker whose `fetchPage` returns nothing for the empty query.
   * Passed through to the Combobox, where it defaults to `noResultsMessage`.
   */
  emptyQueryMessage?: string;
  /**
   * An action row pinned under the options (e.g. the patient picker's "Create
   * patient" entry). Handed the typed text as an ACCESSOR, not a value —
   * server-mode callers usually show theirs only once a search has been made,
   * and gating inside the slot (a `<Show>`) keeps the row itself stable
   * instead of rebuilding it on every keystroke.
   */
  listboxFooter?: (query: () => string) => JSX.Element;
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
  // the typed query OR IS the controlled `value` prop: the latter guarantees a
  // controlled selection's label never blanks — e.g. when the parent advances
  // the value externally ("OK & next" steps to a new item) while the input
  // still holds the previous item's text as a stale, non-matching query. We
  // still drop an unmatched seed that ISN'T the current value, so a free-text
  // search doesn't sort a stale seed above real matches or mask "no matches".
  //
  // isControlledValue MUST check props.value (not the derived value() getter):
  // when a caller only passes `selected` (no separate `value` id — e.g.
  // PatientSearch), value() is DEFINED as itemToValue(selected), so comparing
  // against it is a tautology — the seed would pin to the top of every search
  // regardless of what's typed, masking real matches (found via prescriptions'
  // "changing the patient" — typing a new patient's name kept showing the
  // CURRENTLY-selected one as the first, always-clickable option).
  //
  // The seed CAN be a label-only fallback: some callers fill its non-label
  // fields — e.g. availableUnits — with placeholder zeros when the real values
  // aren't known until the item's own page is fetched (others pass a fully
  // populated seed — e.g. ItemSearch reseeds the option the user just picked). So
  // once `base()` has fetched a real row for this key, that row must WIN over the
  // seed rather than being replaced by it — otherwise a stub's placeholder fields
  // (e.g. "0 Units") permanently shadow the real, freshly-fetched data for as
  // long as the item stays the controlled selection (#549).
  const items = (): T[] => {
    const seed = props.selected;
    if (!seed) return base();
    const key = props.itemToValue(seed);
    const rest = base().filter(i => props.itemToValue(i) !== key);
    const real = base().find(i => props.itemToValue(i) === key);
    if (real) return [real, ...rest];
    const needle = query().toLocaleLowerCase();
    const seedMatches =
      !needle || props.itemToString(seed).toLocaleLowerCase().includes(needle);
    const isControlledValue = props.value !== undefined && props.value === key;
    if (!seedMatches && !isControlledValue) return base();
    return [seed, ...rest];
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
      emptyQueryMessage={props.emptyQueryMessage}
      listboxFooter={props.listboxFooter?.(query)}
      items={items()}
      loading={loading()}
      loadingMore={search.loadingMore()}
      value={value()}
      itemToString={props.itemToString}
      itemToValue={props.itemToValue}
      itemDisabled={props.itemDisabled}
      renderItem={props.renderItem}
      // Kobalte fires onInputChange whenever the combobox's controlled
      // selection changes — not only when the user types. Its resetInputValue
      // effect resyncs the input text to match a NEW selected/value prop
      // (e.g. the stocktake line-edit modal opening on a row sets ItemSearch's
      // value/selectedItem to that row's item), and that resync itself goes
      // through onInputChange. Left unguarded, this fires a genuine
      // itemsWithStock search for the row's own label on every row-click open
      // — nobody typed anything. Guard: a next value that exactly matches the
      // CURRENTLY selected item's label is that resync, not a keystroke —
      // skip it. A real edit (even retyping the same text one keystroke at a
      // time) still goes through query(), which the resync bypasses entirely
      // (Kobalte sets the whole string in one call), so this can't mask a
      // genuine search for text that happens to equal the selected label.
      onInputChange={next => {
        const selected = props.selected;
        const isSelectedLabelEcho =
          selected !== undefined &&
          next === props.itemToString(selected) &&
          next !== query();
        if (isSelectedLabelEcho) return;
        setQuery(next);
        search.setSearch(next);
      }}
      onOpenChange={open => open && search.ensure()}
      onReachEnd={() => search.loadMore()}
      onChange={item => props.onSelect(item)}
    />
  );
};
