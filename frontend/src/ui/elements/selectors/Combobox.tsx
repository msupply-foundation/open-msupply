import {
  children,
  createEffect,
  createMemo,
  createSignal,
  on,
  Show,
  type JSX,
} from 'solid-js';
import * as KCombobox from '@kobalte/core/combobox';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from '../../icons';
import { t, tPlural } from '../../../intl';
import { usePortalMount } from '../../utils/portalMount';
import type { FocusTarget } from '../../utils/createFocusTarget';
import { keepPopupOpenOnInsideContent } from './dismissInsideGuard';
import { visibleOptions, type VisibleOptions } from './comboboxLogic';
import styles from './Combobox.module.css';

// Server-mode infinite scroll: fetch the next page once the listbox is scrolled
// to within this many px of the bottom (a small lead so the next page is on its
// way before the user hits the very end).
const NEXT_PAGE_THRESHOLD_PX = 100;

/*
 * Client mode: how many matching options are MOUNTED at once (see
 * `visibleOptions`). Every option is a live component — Kobalte's ListboxItem
 * plus the caller's `renderItem` — so mount cost is linear in the number shown,
 * and Kobalte does not virtualise.
 *
 * Measured on a Lenovo tablet (2026-08-04): a whole-store location picker
 * mounted ~5,000 options and blocked the main thread for 30 SECONDS on one tap
 * — 21s building the option trees, then 9s of floating-ui measuring the
 * resulting 43,000-node popup, every measurement a forced layout. The work is
 * wasted either way: this is a type-to-search field, and nobody scrolls past
 * the first screenful.
 *
 * 100 is chosen to be far past what anyone scrolls while staying cheap to
 * mount. The cap applies to MATCHES, not to the head of `items`, so typing
 * still reaches an option four thousand rows down; when it bites, the listbox
 * says so rather than silently ending the list. A caller with a genuinely
 * scroll-through list can raise it via `maxVisibleOptions`.
 */
const DEFAULT_MAX_VISIBLE_OPTIONS = 100;

interface ComboboxProps<T> {
  label: string;
  /** The full option set; filtered locally as the user types. */
  items: T[];
  /**
   * The plain-text label of an item — used for the input, filtering and a11y.
   */
  itemToString: (item: T) => string;
  /**
   * Unique string key per item (list identity + form value). Defaults to
   * itemToString — override when labels can collide.
   */
  itemToValue?: (item: T) => string;
  /**
   * Controlled selection: the itemToValue key of the currently-selected item
   * (or undefined for none). Pass it to keep the input in sync with external
   * state — e.g. an editable cell showing a line's saved location. Omit for an
   * uncontrolled combobox (the create/filter forms), where the selection lives
   * only in the widget and is reported via onChange.
   */
  value?: string;
  /**
   * Fallback for the selected item when `value`'s key isn't present in `items`
   * — e.g. a server-fed combobox whose selection came from outside its current
   * result page. Without it the selection can't be resolved to a label and the
   * field shows blank. Used only when `items` has no match for `value`.
   */
  selectedItem?: T;
  onChange?: (item: T | null) => void;
  /** Rich per-option rendering; defaults to the plain itemToString label. */
  renderItem?: (item: T) => JSX.Element;
  /**
   * Override the default locale-aware substring filter. Per-item predicate
   * (Kobalte's model), unlike the prototype's whole-list filter.
   */
  filter?: (item: T, input: string) => boolean;
  /**
   * Client mode: how many MATCHING options to mount at once (default 100 —
   * see DEFAULT_MAX_VISIBLE_OPTIONS for why there is a cap at all). Beyond the
   * cap the listbox shows a "keep typing to narrow" row reporting the total, so
   * the list never just stops without saying why. Raise it for a list meant to
   * be scrolled end-to-end rather than searched; `Infinity` mounts everything
   * (the pre-cap behaviour). Ignored in server mode, where the caller pages.
   */
  maxVisibleOptions?: number;
  /**
   * Per-option disabled predicate — the option is listed (visible for context,
   * rendered dimmed) but not selectable, e.g. an on-hold customer. Maps to
   * Kobalte's optionDisabled, which exposes it as aria-disabled on the option.
   */
  itemDisabled?: (item: T) => boolean;
  placeholder?: string;
  helperText?: string;
  /**
   * Error message — presence switches the control to the error state (red
   * border/glow +
   *  aria-invalid), shown with an alert icon below the field. Mirrors
   *  TextField's `error`.
   */
  error?: string;
  /**
   * `data-testid` for the error message (locale-stable test hook,
   * e2e/TESTIDS.md) — mirrors TextField's `errorTestId`.
   */
  errorTestId?: string;
  /**
   * Marks the field required: an asterisk on the label (TextField's marker, so
   * a lookup and a text field read alike) plus `aria-required` on the input.
   * Indication only — the gating stays with the form's own confirm rule.
   */
  required?: boolean;
  /**
   * `data-testid` for the text `<input>` itself (locale-stable test hook,
   * e2e/TESTIDS.md) — the input is internal to the Kobalte composition, so it
   * can't take a pass-through attribute.
   */
  inputTestId?: string;
  /**
   * A `createFocusTarget()` handle bound to the text `<input>`, so an owner can
   * focus this picker after an action (dialog open, "Save & next", clearing
   * back to the search). The input is internal to the Kobalte composition, so
   * a plain `ref` can't reach it — this is the supported way in.
   */
  focusTarget?: FocusTarget;
  /**
   * Replace the option list with a "Loading…" row (and suppress "no matches").
   * Pass it only when there's nothing sensible to show: a server-mode caller
   * holding rows it can still present (e.g. AsyncCombobox's client-filtered
   * interim list while a refetch is pending) keeps this false so the list isn't
   * blanked mid-keystroke.
   */
  loading?: boolean;
  /**
   * The status text shown when a settled search matched nothing (server mode's
   * "no matches" state). Defaults to `control.search.no-results-label` ("No
   * results") — or, for a client-mode list whose `items` is empty, to
   * `label.no-options` ("No options"), since nothing typed there could match. A
   * caller overrides both — already translated — with a domain-specific
   * message, e.g. the patient picker's "No matching patients".
   */
  noResultsMessage?: string;
  /**
   * The status text shown when the list is empty and NOTHING has been typed —
   * the type-to-search prompt of a picker that doesn't list its whole set
   * unqueried (e.g. the patient picker's "Start typing to search"). Defaults to
   * `noResultsMessage`, so a caller with one message for both states keeps its
   * current behaviour. Split them wherever a search can settle with no match:
   * telling someone who has typed a name to start typing withholds the only
   * fact that matters — the record isn't there (patients D68).
   */
  emptyQueryMessage?: string;
  disabled?: boolean;
  /**
   * Whether a committed selection can be cleared (the clear button). Default
   * true; pass false for a field that must always hold a value — e.g. an
   * outbound shipment's customer, changeable but never emptied.
   */
  clearable?: boolean;
  // --- Server mode ------------------------------------------------------
  // Passing `onInputChange` switches the combobox to SERVER mode: the caller
  // owns filtering (it (re)fetches `items` from the input), so the built-in
  // client-side substring filter is turned off (Kobalte shows `items` as-is)
  // and the "no matches" copy keys off an empty `items` rather than a local
  // filter. Whole-list callers (Location/Reason) pass none of these and behave
  // exactly as before.
  /**
   * Called with the current input text as the user types (server-mode filter
   * trigger). Its presence enables server mode.
   */
  onInputChange?: (value: string) => void;
  /**
   * Server mode: called when the listbox scrolls near the bottom — fetch the
   * next page and append to `items`. No-op unless there are more pages.
   */
  onReachEnd?: () => void;
  /**
   * Server mode: a NEXT-page fetch is in flight — shows a spinner row at the
   * end of the list (distinct from `loading`, which blanks the list for a
   * fresh first-page fetch).
   */
  loadingMore?: boolean;
  /**
   * Called when the listbox opens or closes (Kobalte's onOpenChange) — lets a
   * server-mode caller arm a deferred first fetch on first open.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Visually hide the label (kept for a11y) — for use inside a FieldRow that
   * shows it.
   */
  hideLabel?: boolean;
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the field. Kept outside the label element so it
   * isn't part of the control's accessible name. Ignored under `hideLabel`.
   * As TextField.
   */
  labelInfo?: JSX.Element;
  /**
   * An interactive control at the inline-end of the field — TextField's
   * `endAction` contract, mirrored here (ui-standards sanctions a trailing
   * icon-button in a field). It sits beside the clear and toggle buttons, at
   * control height, so unlike `labelInfo` it costs the LABEL row nothing: a
   * field cluster laying its members out on one row (HeaderToolbar's FormRow,
   * which top-aligns them) keeps every control on the same line, where extra
   * label-row content would wrap the label at narrow widths and drop this one
   * field's control below its siblings.
   */
  endAction?: JSX.Element;
  /**
   * Content pinned at the TOP of the open listbox popup, above the options — a
   * sticky in-dropdown header for controls that scope the list (e.g. the
   * location picker's fullness filter). Interacting with it keeps the popup
   * open (it lives inside the popup's own content, so the outside-dismiss
   * guard ignores it). Omit for a plain combobox.
   */
  listboxHeader?: JSX.Element;
  /**
   * Content pinned at the BOTTOM of the open listbox popup, under the
   * options — an action on the search rather than a result (e.g. the patient
   * picker's "Create patient" entry). Like `listboxHeader` it lives inside the
   * popup's own content, so interacting with it doesn't dismiss the popup.
   * Omit for a plain combobox.
   */
  listboxFooter?: JSX.Element;
  /**
   * By default the popup matches the trigger's width (Kobalte `sameWidth`).
   * Pass `false` to let it size to its content instead — never narrower than
   * the trigger, capped so it stays readable and never runs past the viewport
   * — for pickers whose option text (e.g. a location's `code + name`) can
   * outrun a narrow field.
   */
  matchTriggerWidth?: boolean;
  /**
   * Max-width cap, TextField's vocabulary: `compact` (10rem), `short` (25rem),
   * `long` (37.5rem — the default, since option text is often long) or `full`
   * to fill the container. Set it to sit level with the text fields it's
   * stacked among, whose own default is `short`.
   */
  width?: 'compact' | 'short' | 'long' | 'full';
  /**
   * Control size. 'default' is the form-field size; 'small' is the compact
   * variant for dense contexts (e.g. cards). Matches the shared input size
   * scale (see --input-height*).
   */
  size?: 'default' | 'small';
  class?: string;
  /**
   * De-box the control (no border / background) for embedding in a filter chip
   * / pill (FilterBar's FilterCombobox), so it reads on the tinted pill like
   * the other chip editors rather than as a nested input box.
   */
  borderless?: boolean;
}

/*
 * Autocomplete / combobox — Kobalte Combobox (headless). THE widget principle
 * #2 says to buy rather than build: a text input wired to a filtered listbox.
 * It's the one selector that's genuinely dangerous to hand-roll — the WAI-ARIA
 * combobox pattern is `aria-activedescendant` virtual focus (the input keeps
 * DOM focus while a *separate* option is "active"), result announcements for
 * screen readers, and typeahead + arrow / Enter / Escape semantics. Kobalte's
 * Combobox is the Solid analogue of the prototype's Downshift pick, and buys a
 * couple of things Downshift left to us: the popup is portaled with
 * collision-aware, trigger-width placement (the prototype deferred that to "a
 * Radix Popover later"), and filtering is built in (we pass the predicate).
 * We still own all markup + CSS.
 *
 * Clearing: the clear button clears a committed selection; stray typed text is
 * already handled by Kobalte itself (Escape clears it, blur reverts it).
 */
export const Combobox = <T,>(props: ComboboxProps<T>) => {
  const [selected, setSelected] = createSignal<T | null>(null);
  const [inputValue, setInputValue] = createSignal('');
  let inputEl: HTMLInputElement | undefined;
  let contentEl: HTMLElement | undefined;
  // Whether the mouseup now in flight is the one that focused the input — see
  // the Input's onMouseDown/onMouseUp.
  let selectOnMouseUp = false;

  // Server mode: the caller drives filtering via onInputChange (it refetches
  // `items`), so we disable Kobalte's client-side filter and let it show every
  // item we pass. See the prop docs.
  // Longer than a listbox-full: below this the whole list is visible at once,
  // so scanning it is faster than typing at it. Deliberately a rule off the
  // data rather than a prop — a picker shouldn't have to remember to say how
  // many things it holds.
  const SEARCHABLE_MIN_ITEMS = 10;

  // The largest option count this picker has ever offered, LATCHED — never the
  // current one. Two reasons. A server-backed list narrows as the user types,
  // and the icon must not blink off the moment a query matches a single row.
  // And AsyncCombobox defers its first fetch until the first open, so the count
  // starts at zero and only becomes knowable later.
  //
  // Consequence, accepted deliberately: a server-backed picker shows no
  // magnifier until it has been opened once. Better to withhold the cue than to
  // assert "this list is worth typing at" about a list we have never seen —
  // which is what a blanket exemption for server mode did, putting a search
  // icon on a Manufacturer field holding exactly one name.
  const [mostOptions, setMostOptions] = createSignal(0);
  createEffect(() =>
    setMostOptions(seen => Math.max(seen, props.items.length))
  );
  const worthSearching = () => mostOptions() >= SEARCHABLE_MIN_ITEMS;

  const serverMode = () => props.onInputChange !== undefined;

  const keyOf = (item: T) => (props.itemToValue ?? props.itemToString)(item);

  // Controlled selection: `value` OWNS the selection — `items` only resolves it
  // to an item so the field can show a label. So `value === undefined` means
  // "no selection" → clear `selected` (a caller that resets its value — after
  // saving, or when its bound field is cleared — empties the input rather than
  // keeping the stale item), and a key is resolved against, in order: the
  // current `items`, the caller's `selectedItem` (a server-fed selection from
  // outside the current result page), then the selection ALREADY resolved.
  //
  // That last fallback is what keeps a seeded lookup typeable. In server mode
  // `items` holds the rows matching what the user is TYPING, which the current
  // selection usually is not — so resolving against `items` alone dropped the
  // selection on the first keystroke, and Kobalte answers a cleared selection
  // by resetting the input text (resetInputValue → setInputValue('')). That
  // empty value came back as onInputChange(''), which reset the query, which
  // re-seeded the selection, which reset the input to the selection's label:
  // every keystroke bounced back to the record's current party and no other
  // party could ever be searched for (exploratory 2026-07-30, CRN-F2).
  //
  // The comparison is by KEY, never by object identity, and the set is GUARDED
  // by it: re-setting `selected` to the selection it already holds is not a
  // no-op. Kobalte owns the input's text and resyncs it from its selection
  // whenever its selectedKeys signal RE-EMITS (its
  // `on(selectedKeys, resetInputValue)`), so a redundant re-set mid-typing
  // wrote the selected item's label back over the keystroke — a field holding a
  // selection could not be retyped over at all (you could not change a
  // prescription's patient — #801). Callers legitimately mint the seed inline
  // (`selected={{ id, name }}`) or from a getter, so a FRESH object arrives on
  // every reactive read and an identity test would re-set on every pass. Same
  // key means same selection: the label is keyed too, and a dropdown row always
  // comes from `items`, so holding on to the object we already have goes
  // nowhere stale.
  //
  // Guarded by `on([value, items], ...)` so it only reacts to those two, not
  // the user's own pick — tracking `items` too matters for a non-suspending
  // resource: a picker that mounts with `value` already set (e.g. a detail
  // screen loaded with a clinician already attached) resolves against an empty
  // `items` on the first run, and without `items` in the dependency list the
  // lookup would never re-run once the resource's fetch lands — leaving the
  // field permanently blank.
  createEffect(
    on([() => props.value, () => props.items], ([value, items]) => {
      const current = selected();
      const resolved =
        value === undefined
          ? undefined
          : (items.find(item => keyOf(item) === value) ??
            (props.selectedItem && keyOf(props.selectedItem) === value
              ? props.selectedItem
              : undefined) ??
            (current && keyOf(current) === value ? current : undefined));
      if (!resolved) {
        if (current !== null) setSelected(null);
      } else if (!current || keyOf(current) !== value) {
        setSelected(() => resolved);
      }
    })
  );
  // Inside a Dialog, mount the listbox into the dialog element (top layer +
  // non-inert); outside one this is undefined and Kobalte's default <body>
  // portal is used.
  const portalMount = usePortalMount();

  const matches = (item: T, input: string) =>
    props.filter
      ? props.filter(item, input)
      : props
          .itemToString(item)
          .toLocaleLowerCase()
          .includes(input.toLocaleLowerCase());

  // The input text ONLY filters while it's something the user typed: when it
  // just mirrors the committed selection's label, reopening the popup shows
  // the FULL list (matching the platform autocompletes users expect — and the
  // shared e2e suites, whose pickers reopen to browse all options).
  const filterText = () => {
    const current = selected();
    const input = inputValue();
    return current && input === props.itemToString(current) ? '' : input;
  };

  /*
   * Client mode: the matching options, capped at maxVisibleOptions, plus the
   * total that matched (see comboboxLogic for the filter-then-cap ordering, and
   * DEFAULT_MAX_VISIBLE_OPTIONS for why there's a cap).
   *
   * Filtering HERE, as well as in Kobalte's `defaultFilter` below (which
   * re-applies the same predicate to the capped list, harmlessly), is what lets
   * the cap count matches rather than raw rows. Server mode never caps — the
   * caller has already filtered and pages the rest in.
   */
  const shown = createMemo<VisibleOptions<T>>(() => {
    if (serverMode()) return { items: props.items, total: props.items.length };
    const text = filterText();
    return visibleOptions(
      props.items,
      item => matches(item, text),
      props.maxVisibleOptions ?? DEFAULT_MAX_VISIBLE_OPTIONS
    );
  });

  // How many matches the cap is holding back — 0 when it isn't biting. Drives
  // the notice under the options, so a truncated list always says so.
  const hiddenMatchCount = () => {
    if (serverMode() || props.loading) return 0;
    const { items, total } = shown();
    return total - items.length;
  };

  // Server mode: the caller already filtered, so "no matches" = an empty list
  // (once loading settles). Client mode: nothing passed the local filter.
  const noMatches = createMemo(() =>
    serverMode() ? props.items.length === 0 : shown().total === 0
  );

  // A client-mode list holding NO options at all — a third empty state, and
  // the only one where searching is beside the point: the caller passed an
  // empty `items`, so neither "No results" nor "Start typing" is true, and
  // both invite the user to keep typing at a list that was never populated
  // (#906 — an option custom field configured with zero options). Server mode
  // is excluded: there an empty `items` means the fetch hasn't landed or hasn't
  // matched, which the two messages below already describe correctly.
  const noOptionsAtAll = () => !serverMode() && props.items.length === 0;

  // The empty-list copy splits in three (see emptyQueryMessage): nothing typed
  // is a prompt, a settled search with no rows is an answer, and no options at
  // all is neither. A caller's own message always wins — only the DEFAULT
  // varies — so a picker that supplies its own copy is unaffected.
  const emptyMessage = () => {
    const fromCaller =
      filterText().trim() === ''
        ? (props.emptyQueryMessage ?? props.noResultsMessage)
        : props.noResultsMessage;
    return (
      fromCaller ??
      (noOptionsAtAll()
        ? t('label.no-options')
        : t('control.search.no-results-label'))
    );
  };

  // Resolved once per change and read twice below (test + render).
  const footer = children(() => props.listboxFooter);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    props.onInputChange?.(value);
  };

  const handleChange = (item: T | null) => {
    setSelected(() => item);
    props.onChange?.(item);
  };

  // The pinned selection. Kobalte resolves a selected value against its options
  // collection — that's where it reads the label from, and a key missing from
  // it blanks the input — so whenever `items` doesn't hold the resolved
  // selection we put it in the collection ourselves: a selection from outside
  // the loaded page, or (server mode) one that simply isn't a match for what
  // the user is typing.
  //
  // A pin is in the collection for RESOLUTION, not for display: in server mode
  // it is filtered back out of the listbox (see defaultFilter), so searching
  // for a different party is never masked by the current one sitting above the
  // real matches (#549).
  const pinned = createMemo<T | undefined>(() => {
    const sel = selected();
    if (!sel) return undefined;
    const base = props.loading ? [] : props.items;
    return base.some(item => keyOf(item) === keyOf(sel)) ? undefined : sel;
  });
  const pinnedKey = () => {
    const pin = pinned();
    return pin ? keyOf(pin) : undefined;
  };

  // The options Kobalte sees: the caller's rows (client mode: matching and
  // capped — see visibleOptions) plus the pin above. While loading we show no
  // options EXCEPT that pin (so the label survives a refetch). The pin is added
  // after the cap, never subject to it: it is in the collection so the current
  // selection RESOLVES to a label, and capping it out would blank the field.
  const options = createMemo<T[]>(() => {
    const base = props.loading ? [] : shown().items;
    const pin = pinned();
    return pin ? [pin, ...base] : base;
  });

  // Server-mode infinite scroll: when the listbox is scrolled near its bottom,
  // ask the caller for the next page. The listbox owns the scroll (`.listbox`
  // is overflow:auto), so a plain onScroll on it suffices — no observer, no
  // sentinel. The caller's onReachEnd is a no-op when there are no more pages
  // or a fetch is already in flight, so firing per scroll event is safe.
  const onListboxScroll = (event: Event) => {
    const el = event.currentTarget as HTMLElement;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight <
      NEXT_PAGE_THRESHOLD_PX
    )
      props.onReachEnd?.();
  };

  // The label element itself (text + required asterisk). A local component so
  // it renders fresh in either branch (bare, or beside labelInfo) — reusing
  // one JSX node across both would try to mount it in two places. As
  // TextField.
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const labelInfo = children(() => props.labelInfo);
  const endAction = children(() => props.endAction);
  const listboxHeader = children(() => props.listboxHeader);
  const Label = () => (
    <KCombobox.Label class={styles.label}>
      {props.label}
      <Show when={props.required}>
        <span class={styles.required} aria-hidden="true">
          *
        </span>
      </Show>
    </KCombobox.Label>
  );

  return (
    <KCombobox.Root<T>
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      data-width={props.width}
      data-size={props.size ?? 'default'}
      data-borderless={props.borderless ? '' : undefined}
      options={options()}
      optionValue={item => (props.itemToValue ?? props.itemToString)(item as T)}
      optionTextValue={item => props.itemToString(item as T)}
      optionLabel={item => props.itemToString(item as T)}
      optionDisabled={
        props.itemDisabled ? item => props.itemDisabled!(item as T) : undefined
      }
      // Server mode disables the client filter (the caller refetches `items`) —
      // except for the pin, which is in the collection only so the selection
      // resolves and must not show up among the typed query's results (see
      // `pinned`). Client mode keeps the local substring/predicate filter.
      defaultFilter={
        serverMode()
          ? item => keyOf(item as T) !== pinnedKey()
          : item => matches(item as T, filterText())
      }
      value={selected()}
      onChange={handleChange}
      onInputChange={handleInputChange}
      onOpenChange={open => props.onOpenChange?.(open)}
      // Popup width: match the trigger by default; opt out to size-to-content
      // (bounded by .contentGrow below). See matchTriggerWidth.
      sameWidth={props.matchTriggerWidth ?? true}
      allowsEmptyCollection
      // Open the listbox as soon as the input is focused/clicked (not only once
      // the user types) — the options appear on interaction, matching the
      // platform autocompletes users expect. Reopening a committed selection
      // still shows the full list (see filterText).
      triggerMode="focus"
      disabled={props.disabled}
      placeholder={props.placeholder}
      itemComponent={itemProps => (
        <KCombobox.Item item={itemProps.item} class={styles.item}>
          {props.renderItem
            ? props.renderItem(itemProps.item.rawValue)
            : props.itemToString(itemProps.item.rawValue)}
        </KCombobox.Item>
      )}
    >
      {/* hideLabel names the input via aria-label instead of a visually-hidden
          label element — same accessible name, no duplicate text node beside
          the label the surrounding layout (a FieldRow) already shows (a hidden
          twin trips strict text-locator matches in the shared e2e suites). */}
      <Show when={!props.hideLabel}>
        <Show when={labelInfo()} fallback={<Label />}>
          {/* labelInfo sits OUTSIDE the label element, as a sibling: nested in
              it its accessible name would leak into the input's (the
              name-from-label computation concatenates descendant controls). */}
          <span class={styles.labelRow}>
            <Label />
            {labelInfo()}
          </span>
        </Show>
      </Show>
      <KCombobox.Control
        class={styles.control}
        data-error={props.error ? '' : undefined}
      >
        {/* The magnifier's job is to say the list is worth TYPING at — the one
            thing the chevron alone doesn't convey, since a plain Select looks
            identical without it. So it renders only where that's true: while
            the field is EMPTY (once a selection is committed the cue is spent
            and the value needs the width — a labelled picker was spending ~45%
            of its box on chrome), and only for a list long enough that
            filtering beats scanning. On a handful of options the icon is
            signage for something nobody needs to do. Server-driven lists come
            in a page at a time, so they always qualify. */}
        <Show when={selected() === null && worthSearching()}>
          <span class={styles.searchIcon} aria-hidden="true">
            <SearchIcon />
          </span>
        </Show>
        <KCombobox.Input
          // Both the local ref (the clear button restores focus here) and the
          // caller's focus handle bind to the same input.
          ref={(el: HTMLInputElement) => {
            inputEl = el;
            props.focusTarget?.ref(el);
          }}
          class={styles.input}
          data-testid={props.inputTestId}
          aria-label={props.hideLabel ? props.label : undefined}
          aria-invalid={props.error ? 'true' : undefined}
          aria-required={props.required ? 'true' : undefined}
          // Focusing a field that already shows a committed selection SELECTS
          // its text, so the first keystroke REPLACES the old value instead of
          // being appended to it — the platform autocomplete behaviour (and the
          // current app's, via MUI's selectOnFocus). Without it, changing a
          // committed value means manually clearing the text first, which on a
          // field with no clear affordance (e.g. a prescription's patient —
          // always present, never emptied) reads as "I can't change this".
          onFocus={(
            event: FocusEvent & { currentTarget: HTMLInputElement }
          ) => {
            if (selected() !== null) event.currentTarget.select();
          }}
          // The FOCUSING click needs the same treatment: a mouse press lands
          // its own caret after focus runs, collapsing the selection the
          // handler above just made. So re-select on the mouseup that focused
          // the field — and only that one, judged before focus moves. A click
          // in an ALREADY-focused field keeps its natural caret placement, so
          // editing part of the text by hand still works.
          onMouseDown={() => {
            selectOnMouseUp = document.activeElement !== inputEl;
          }}
          onMouseUp={(
            event: MouseEvent & { currentTarget: HTMLInputElement }
          ) => {
            if (selectOnMouseUp && selected() !== null)
              event.currentTarget.select();
            selectOnMouseUp = false;
          }}
        />
        <Show when={(props.clearable ?? true) && selected() !== null}>
          <button
            type="button"
            class={styles.clear}
            disabled={props.disabled}
            aria-label="Clear selection"
            onClick={() => {
              handleChange(null);
              inputEl?.focus();
            }}
          >
            <CloseIcon />
          </button>
        </Show>
        <KCombobox.Trigger class={styles.toggle} aria-label="Toggle options">
          <KCombobox.Icon class={styles.toggleIcon}>
            <ChevronDownIcon />
          </KCombobox.Icon>
        </KCombobox.Trigger>
        <Show when={endAction()}>
          <span class={styles.endAction}>{endAction()}</span>
        </Show>
      </KCombobox.Control>
      {/* Error message (with an alert icon) takes precedence over helperText — mirrors
          TextField. Nothing is conveyed by colour alone (icon + text). */}
      <Show
        when={props.error}
        fallback={
          <Show when={props.helperText}>
            <KCombobox.Description class={styles.helper}>
              {props.helperText}
            </KCombobox.Description>
          </Show>
        }
      >
        <KCombobox.Description
          class={styles.error}
          data-testid={props.errorTestId}
        >
          <AlertTriangleIcon class={styles.errorIcon} />
          {props.error}
        </KCombobox.Description>
      </Show>
      <KCombobox.Portal mount={portalMount?.()}>
        <KCombobox.Content
          ref={contentEl}
          class={
            props.matchTriggerWidth === false
              ? `${styles.content} ${styles.contentGrow}`
              : styles.content
          }
          // Keep the listbox open only when a pointerdown lands inside this
          // popup's own content — Kobalte otherwise dismisses an option click
          // before it commits when the popup is mounted in a dialog (see
          // dismissInsideGuard). Any click outside the listbox — blank space,
          // another field — still closes it.
          onInteractOutside={keepPopupOpenOnInsideContent(() => contentEl)}
        >
          {/* Sticky in-dropdown header (e.g. the location fullness filter). Sits
              above the options and stays put while the list scrolls. Rendered
              inside the popup content so interacting with it doesn't dismiss. */}
          <Show when={listboxHeader()}>
            <div class={styles.listboxHeader}>{listboxHeader()}</div>
          </Show>
          <Show when={props.loading}>
            <div class={styles.status}>{t('loading')}</div>
          </Show>
          <Show when={!props.loading && noMatches()}>
            <div class={styles.status}>{emptyMessage()}</div>
          </Show>
          {/* The listbox owns the scroll; in server mode onScroll fetches the
              next page near the bottom (see onListboxScroll). */}
          <KCombobox.Listbox
            class={styles.listbox}
            onScroll={serverMode() ? onListboxScroll : undefined}
          />
          {/* The cap is biting (see DEFAULT_MAX_VISIBLE_OPTIONS): say so, with
              the number withheld, so the list is never seen to just stop —
              "no more locations" and "too many to show" must not look alike. */}
          <Show when={hiddenMatchCount() > 0}>
            <div class={styles.status}>
              {tPlural('control.search.more-matches', hiddenMatchCount())}
            </div>
          </Show>
          {/* Server mode: a trailing "loading more" row shown under the list
              while the next page is in flight. */}
          <Show when={props.loadingMore}>
            <div class={styles.status}>{t('loading')}</div>
          </Show>
          {/* Action row under the options (e.g. "Create patient"). Last, so it
              never displaces a result the user is reaching for. Resolved
              through `children()`: an element prop read twice — once to test,
              once to render — is otherwise built twice
              (kdd/solid-reactivity-pitfalls §3). */}
          <Show when={footer()}>
            <div class={styles.listboxFooter}>{footer()}</div>
          </Show>
        </KCombobox.Content>
      </KCombobox.Portal>
    </KCombobox.Root>
  );
};
