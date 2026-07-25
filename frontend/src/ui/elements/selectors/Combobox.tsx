import {
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
import { usePortalMount } from '../../utils/portalMount';
import { keepPopupOpenOnInsideContent } from './dismissInsideGuard';
import styles from './Combobox.module.css';

// Server-mode infinite scroll: fetch the next page once the listbox is scrolled
// to within this many px of the bottom (a small lead so the next page is on its
// way before the user hits the very end).
const NEXT_PAGE_THRESHOLD_PX = 100;

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
   * `data-testid` for the text `<input>` itself (locale-stable test hook,
   * e2e/TESTIDS.md) — the input is internal to the Kobalte composition, so it
   * can't take a pass-through attribute.
   */
  inputTestId?: string;
  /**
   * Replace the option list with a "Loading…" row (and suppress "no matches").
   * Pass it only when there's nothing sensible to show: a server-mode caller
   * holding rows it can still present (e.g. AsyncCombobox's client-filtered
   * interim list while a refetch is pending) keeps this false so the list isn't
   * blanked mid-keystroke.
   */
  loading?: boolean;
  /**
   * The status text shown when the settled option list is empty (server mode's
   * "no matches" state). Defaults to "No matching items"; a caller overrides it
   * for a domain-specific hint — e.g. the patient picker's "Start typing to
   * search", which doubles as its type-to-search prompt.
   */
  noResultsMessage?: string;
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
   * Content pinned at the TOP of the open listbox popup, above the options — a
   * sticky in-dropdown header for controls that scope the list (e.g. the
   * location picker's fullness filter). Interacting with it keeps the popup open
   * (it lives inside the popup's own content, so the outside-dismiss guard
   * ignores it). Omit for a plain combobox.
   */
  listboxHeader?: JSX.Element;
  /**
   * By default the popup matches the trigger's width (Kobalte `sameWidth`). Pass
   * `false` to let it size to its content instead — never narrower than the
   * trigger, capped so it stays readable and never runs past the viewport — for
   * pickers whose option text (e.g. a location's `code + name`) can outrun a
   * narrow field.
   */
  matchTriggerWidth?: boolean;
  class?: string;
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

  // Server mode: the caller drives filtering via onInputChange (it refetches
  // `items`), so we disable Kobalte's client-side filter and let it show every
  // item we pass. See the prop docs.
  const serverMode = () => props.onInputChange !== undefined;

  const keyOf = (item: T) => (props.itemToValue ?? props.itemToString)(item);

  // Controlled selection: keep the internal `selected` item in sync with
  // `value` (resolve the key against the current items). `value === undefined`
  // means "no selection" → clear `selected` (so a caller that resets its value
  // — e.g. after saving, or when its bound field is cleared — empties the
  // input, rather than the input keeping the stale item). When the key isn't in
  // `items` (a server-fed selection from outside the current result page), fall
  // back to `selectedItem` if the caller supplied it. Guarded by
  // `on([value, items], ...)` so it only reacts to those two, not the user's
  // own pick — tracking `items` too (not just `value`) matters for a
  // non-suspending resource: a picker that mounts with `value` already set
  // (e.g. a detail screen loaded with a clinician already attached) resolves
  // against an empty `items` on the first run, and without `items` in the
  // dependency list the lookup would never re-run once the resource's fetch
  // actually lands — leaving the field permanently blank.
  //
  // Async/server pickers whose current selection may not be in the loaded page
  // keep it visible by seeding it into `items` themselves (see AsyncCombobox) —
  // the resolution here is a plain lookup against whatever `items` holds.
  createEffect(
    on([() => props.value, () => props.items], ([value, items]) => {
      const inItems =
        value === undefined
          ? null
          : (items.find(item => keyOf(item) === value) ?? null);
      const fallback =
        value !== undefined &&
        props.selectedItem &&
        keyOf(props.selectedItem) === value
          ? props.selectedItem
          : null;
      const match = inItems ?? fallback;
      if (match !== selected()) setSelected(() => match);
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

  // Server mode: the caller already filtered, so "no matches" = an empty list
  // (once loading settles). Client mode: nothing passes the local filter.
  const noMatches = createMemo(() =>
    serverMode()
      ? props.items.length === 0
      : props.items.every(item => !matches(item, filterText()))
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    props.onInputChange?.(value);
  };

  const handleChange = (item: T | null) => {
    setSelected(() => item);
    props.onChange?.(item);
  };

  // The options Kobalte sees. Kobalte can only DISPLAY a selected value that is
  // present in its options collection, so when `selectedItem` is the current
  // value but isn't in `items` (a selection from outside the loaded page), we
  // prepend it — otherwise the field would show blank. While loading we show no
  // options EXCEPT that pinned selected item (so the label survives a refetch).
  const options = createMemo<T[]>(() => {
    const base = props.loading ? [] : props.items;
    const sel = props.selectedItem;
    if (sel && props.value !== undefined && keyOf(sel) === props.value) {
      const present = base.some(item => keyOf(item) === props.value);
      if (!present) return [sel, ...base];
    }
    return base;
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

  return (
    <KCombobox.Root<T>
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      options={options()}
      optionValue={item => (props.itemToValue ?? props.itemToString)(item as T)}
      optionTextValue={item => props.itemToString(item as T)}
      optionLabel={item => props.itemToString(item as T)}
      optionDisabled={
        props.itemDisabled ? item => props.itemDisabled!(item as T) : undefined
      }
      // Server mode disables the client filter (the caller refetches `items`);
      // client mode keeps the local substring/predicate filter.
      defaultFilter={
        serverMode() ? () => true : item => matches(item as T, filterText())
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
        <KCombobox.Label class={styles.label}>{props.label}</KCombobox.Label>
      </Show>
      <KCombobox.Control
        class={styles.control}
        data-error={props.error ? '' : undefined}
      >
        <span class={styles.searchIcon} aria-hidden="true">
          <SearchIcon />
        </span>
        <KCombobox.Input
          ref={inputEl}
          class={styles.input}
          data-testid={props.inputTestId}
          aria-label={props.hideLabel ? props.label : undefined}
          aria-invalid={props.error ? 'true' : undefined}
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
          <Show when={props.listboxHeader}>
            <div class={styles.listboxHeader}>{props.listboxHeader}</div>
          </Show>
          <Show when={props.loading}>
            <div class={styles.status}>Loading…</div>
          </Show>
          <Show when={!props.loading && noMatches()}>
            <div class={styles.status}>
              {props.noResultsMessage ?? 'No matching items'}
            </div>
          </Show>
          {/* The listbox owns the scroll; in server mode onScroll fetches the
              next page near the bottom (see onListboxScroll). */}
          <KCombobox.Listbox
            class={styles.listbox}
            onScroll={serverMode() ? onListboxScroll : undefined}
          />
          {/* Server mode: a trailing "loading more" row shown under the list
              while the next page is in flight. */}
          <Show when={props.loadingMore}>
            <div class={styles.status}>Loading…</div>
          </Show>
        </KCombobox.Content>
      </KCombobox.Portal>
    </KCombobox.Root>
  );
};
