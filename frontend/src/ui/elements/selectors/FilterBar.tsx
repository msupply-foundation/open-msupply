import { For, Show, createContext, createSignal, useContext } from 'solid-js';
import type { JSX } from 'solid-js';
import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  FilterIcon,
  SearchIcon,
} from '../../icons';
import { t } from '../../../intl';
import { createDebounced } from '../../utils/createDebounced';
import {
  createFocusTargets,
  type FocusTarget,
} from '../../utils/createFocusTarget';
import { NumberField } from '../inputs/NumberField';
import { BareCheckbox } from '../inputs/BareCheckbox';
import { DateRangeField } from '../inputs/DateRangeField';
import {
  utcBoundsFromLocalDays,
  utcToLocalDay,
} from '../inputs/dateTimeConvert';
import { DateTimeField } from '../inputs/DateTimeField';
import { Combobox } from './Combobox';
import {
  activeFilters,
  availableFilters,
  showsClearAll,
} from './filterBarLogic';
import styles from './FilterBar.module.css';

/*
 * A filter, generic over a list page's GraphQL filter object type `F`.
 *
 * Each entry reads the one key it owns out of `filter()` and writes it back
 * via `setPartialFilter`, keeping the value in the GraphQL-native shape
 * (kdd/type-safety: `F` flows through unchanged, no flat value model, no
 * mapper). It renders only its control — composed from the styled
 * `FilterTextInput` / `FilterSelect` below — and FilterBar wraps that in the
 * chip chrome (label + remove) and owns the add menu.
 *
 * `filter` is an ACCESSOR, not the value: `render` is called once when the
 * chip mounts, and the control reads `filter()` reactively for its own value.
 * Passing the value directly would make the render call re-run on every filter
 * edit, remounting the control (and closing an open Kobalte menu) —
 * kdd/state-management: no remounts.
 *
 * `render` is explicit JSX per field (kdd/explicit-composition): click-through
 * traceable, and a new control kind (a date range, a lookup) is just a
 * different component inside `render`, not a new case in a config-driven
 * switch here.
 */
export type Filter<F> = {
  key: keyof F & string;
  /**
   * Chip / menu label. An ACCESSOR, not a string, so the filter array can be a
   * stable module const (built once, identities never churn — <For> reuses
   * rows) while the label still re-translates on a locale switch when read in
   * JSX.
   */
  label: () => string;
  render: (props: {
    filter: () => F;
    setFilter: (next: F) => void;
    /**
     * Merge a patch into the filter — the common case, since a field writes
     * only its own key.
     */
    setPartialFilter: (patch: Partial<F>) => void;
    /** `filter-input-<key>` (e2e/TESTIDS.md) — pass to the control so the id
     *  lands on the actual input, where the deterministic suites expect it. */
    testId: string;
    /**
     * This chip's focus destination (kdd/focus-targets) — where FilterBar
     * hands the caret when this filter is just added.
     *
     * ONLY for a render composing a control from outside FilterBar (a domain
     * picker, the labelled Checkbox): the Filter* controls below claim the
     * chip's target from context themselves, so a render made of those writes
     * no focus wiring at all.
     */
    focusTarget: FocusTarget;
  }) => JSX.Element;
};

/**
 * A filter definition WITHOUT its key — the key is supplied by the map
 * position in `constructFilters`, so it isn't repeated in the value.
 * (`Filter<F>` minus `key`.)
 */
export type FilterDef<F> = Omit<Filter<F>, 'key'>;

/**
 * Builds a list page's Filters from an EXHAUSTIVE, keyed map of definitions.
 *
 * `defs` is a `Record` over EVERY key of the filter object `F`: each key maps
 * to a `FilterDef` to expose that filter, or `null` to dismiss it (not
 * user-facing). Because the parameter type requires all of `F`'s keys, codegen
 * adding a filter to `F` breaks compilation here until the new key is given a
 * def or a `null` — nothing is exposed or forgotten by accident, and this
 * single map is BOTH the definitions and the completeness proof (no parallel
 * switch, no separate key list). Definitions are emitted in the map's key
 * order (the toolbar's display order) with the `null` ones dropped, and the
 * owning key is stitched back onto each surviving def to yield the
 * ready-to-render `Filter<F>[]`.
 */
// Trailing comma on <F,> disambiguates the generic from a JSX tag in this .tsx
// file.
export const constructFilters = <F,>(defs: {
  [K in keyof F & string]: FilterDef<F> | null;
}): Filter<F>[] =>
  (Object.entries(defs) as [keyof F & string, FilterDef<F> | null][])
    .filter(
      (entry): entry is [keyof F & string, FilterDef<F>] => entry[1] !== null
    )
    .map(([key, def]) => ({ key, ...def }));

/**
 * A second, independent filter group hosted in the SAME bar — its own typed
 * state and change handler. Used for filters whose state isn't the wire filter
 * `F`: custom-field filters carry a per-key typed value map that the page
 * expands to `dynamicFilter` (kdd/page-composition — a UI filter vocabulary
 * that maps onto the wire, like the items stock lens). FilterBar stays generic
 * and knows nothing about custom fields; the domain builds this group's
 * `filters` with its own typed controls.
 */
export interface FilterGroup<C extends object> {
  filters: Filter<C>[];
  filter: C;
  onChange: (filter: C) => void;
}

interface FilterBarProps<
  F extends object,
  C extends object = Record<string, never>,
> {
  /** The filters a user can add — drives the add-filter menu and the chips. */
  filters: Filter<F>[];
  /** Controlled filter object — the caller's generated GraphQL filter shape. */
  filter: F;
  onChange: (filter: F) => void;
  /**
   * Optional second group rendered in the same menu + chip row (e.g. custom
   * fields). Omit for a single-group bar.
   */
  extra?: FilterGroup<C>;
}

// One group's add/remove/reset over a controlled filter object. Kept as
// accessors so a chip's control reads `filter()` live (no remount on edit —
// kdd/state-management). `null` marks an added-but-empty chip; the page strips
// nulls before querying.
interface GroupOps<G extends object> {
  active: () => Filter<G>[];
  available: () => Filter<G>[];
  /** Does this group put the bar's "Clear all" on screen? */
  showsClearAll: () => boolean;
  add: (f: Filter<G>) => void;
  remove: (f: Filter<G>) => void;
  reset: () => void;
  renderProps: (f: Filter<G>) => {
    filter: () => G;
    setFilter: (next: G) => void;
    setPartialFilter: (patch: Partial<G>) => void;
    testId: string;
    focusTarget: FocusTarget;
  };
}

const groupOps = <G extends object>(
  filters: () => Filter<G>[],
  filter: () => G,
  onChange: (g: G) => void,
  focusTarget: (key: string) => FocusTarget
): GroupOps<G> => {
  const without = (key: keyof G & string): G => {
    const { [key]: _omit, ...rest } = filter();
    return rest as G; // erase the omitted optional key; the value is a filter object
  };
  return {
    active: () => activeFilters(filters(), filter()),
    available: () => availableFilters(filters(), filter()),
    showsClearAll: () => showsClearAll(filters(), filter()),
    add: f => onChange({ ...filter(), [f.key]: null }),
    remove: f => onChange(without(f.key)),
    // Drops every key, a seeded default filter's included — "Clear all" takes
    // every chip off the bar (#563), leaving just the add-filter trigger.
    reset: () => {
      let next = filter();
      for (const f of filters()) {
        const { [f.key]: _o, ...rest } = next;
        next = rest as G;
      }
      onChange(next);
    },
    renderProps: f => ({
      filter,
      setFilter: onChange,
      setPartialFilter: patch => onChange({ ...filter(), ...patch }),
      testId: `filter-input-${f.key}`,
      focusTarget: focusTarget(f.key),
    }),
  };
};

/*
 * Filter bar — the current app's FilterMenu pattern (Solid port of the RnD
 * prototype's FilterBar, Radix DropdownMenu → Kobalte): an "Add filter"
 * dropdown lists the addable fields; picking one adds a chip beside it holding
 * that field's control.
 *
 * State model (see kdd/page-composition): the caller's filter object IS the
 * state, in GraphQL-native shape. A chip is shown iff its key is PRESENT on
 * the filter (present-as-`null` = added but empty) — no exceptions, so a
 * screen's DEFAULT filters are simply keys seeded present-as-null in its
 * default state, and are removable and clearable like any other (#563;
 * filterBarLogic.ts holds these rules). Adding writes `null`, removing deletes
 * the key, editing goes through the field's own control via setPartialFilter.
 * Chip visibility therefore lives in the (URL-backed) filter, so a restored
 * state re-opens its chips — no local presentation signal to seed. The page
 * strips null/empty keys before querying (stripEmpty).
 */
// A menu entry, types erased at the render edge so one dropdown lists both
// groups' addable filters.
type MenuItem = { key: string; label: () => string; onAdd: () => void };

export const FilterBar = <
  F extends object,
  C extends object = Record<string, never>,
>(
  props: FilterBarProps<F, C>
) => {
  // Every chip's editor, addressed by its FILTER KEY — the same key the filter
  // object is keyed on, never anything DOM-facing (kdd/focus-targets). One
  // registry serves the main and extra groups alike; their keys can't collide,
  // since a chip is shown iff its key is present on its own group's filter.
  const chipEditors = createFocusTargets();
  const chipEditor = (key: string): FocusTarget => ({
    ref: chipEditors.ref(key),
    focus: () => chipEditors.focus(key),
    cancel: chipEditors.cancel,
  });

  // Read props live inside accessors so a chip's control tracks its own value
  // and <For> reuses chip rows across edits (kdd/state-management: no
  // remounts).
  const main = groupOps<F>(
    () => props.filters,
    () => props.filter,
    props.onChange,
    chipEditor
  );
  // Extra-group ops bound to a snapshot of props.extra — fine for the menu /
  // reset / active-count, which recompute reactively; chip controls bind their
  // own live ops inside the <Show> below.
  const extraOps = (): GroupOps<C> | undefined => {
    const e = props.extra;
    return e
      ? groupOps<C>(
          () => e.filters,
          () => e.filter,
          e.onChange,
          chipEditor
        )
      : undefined;
  };

  // Hand a just-added chip's editor the next action (Carl, 2026-07-24): a
  // text/number/date input takes typing focus; a button editor (enum, date
  // range) opens its chooser — the chip instantiates empty, so choosing IS the
  // next step.
  const handOffToChip = (key: string) => {
    const el = chipEditors.get(key);
    if (el instanceof HTMLButtonElement) {
      // Open synchronously, not via the armed request: the chooser takes focus
      // as it opens, and a deferred focus() would then yank it back out to the
      // trigger a frame later.
      el.focus();
      // A Kobalte menu trigger opens on POINTERDOWN (mouse), not on the
      // click event — a synthetic el.click() alone does nothing to it. Our
      // own Popover triggers open on click; they ignore the pointerdown.
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerType: 'mouse',
        })
      );
      el.click();
      return;
    }
    // Typing target — armed, so it also lands on a chip whose editor mounts
    // late, and a key with no editor at all simply never lands.
    chipEditors.focus(key);
  };

  // Both groups' addable filters, type-erased into one menu list.
  const menuItems = (): MenuItem[] => {
    const items: MenuItem[] = main
      .available()
      .map(f => ({ key: f.key, label: f.label, onAdd: () => main.add(f) }));
    const ex = extraOps();
    if (ex)
      for (const f of ex.available())
        items.push({ key: f.key, label: f.label, onAdd: () => ex.add(f) });
    return items;
  };

  const resetAll = () => {
    main.reset();
    extraOps()?.reset();
  };

  return (
    <div class={styles.bar}>
      <FiltersMenu available={menuItems()} focusChip={handOffToChip} />

      <For each={main.active()}>
        {f => (
          <FilterChip
            label={f.label()}
            onRemove={() => main.remove(f)}
            focusTarget={chipEditor(f.key)}
          >
            {f.render(main.renderProps(f))}
          </FilterChip>
        )}
      </For>

      <Show when={props.extra}>
        {extra => {
          // Live ops for the extra group (reads through the <Show> accessor).
          const ex = groupOps<C>(
            () => extra().filters,
            () => extra().filter,
            extra().onChange,
            chipEditor
          );
          return (
            <For each={ex.active()}>
              {f => (
                <FilterChip
                  label={f.label()}
                  onRemove={() => ex.remove(f)}
                  focusTarget={chipEditor(f.key)}
                >
                  {f.render(ex.renderProps(f))}
                </FilterChip>
              )}
            </For>
          );
        }}
      </Show>

      {/* Bar-level "Clear all" (ui-standards § tables → filtering) — a plain
          text button, on screen while either group holds ANY chip, and taking
          them all off (showsClearAll / reset). */}
      <Show when={main.showsClearAll() || extraOps()?.showsClearAll()}>
        <button
          type="button"
          class={styles.clearAll}
          // As on a chip's ✕: taking the caret out of an editor shrinks it and
          // shifts this button mid-press, losing the click.
          onMouseDown={e => e.preventDefault()}
          onClick={resetAll}
        >
          {t('label.clear-all-filters')}
        </button>
      </Show>
    </div>
  );
};

/*
 * The chip's focus destination, offered to whatever control renders inside it
 * (kdd/focus-targets). The controls below claim it themselves, so a filter
 * DEFINITION composing them writes no focus wiring at all and can't forget to
 * — this is the one thing every chip needs and nothing about it varies per
 * field. A definition composing a control from OUTSIDE this file (a domain
 * picker, the labelled Checkbox) binds `props.focusTarget` by hand instead:
 * those components are general, and teaching them about filter chips would be
 * the wrong coupling.
 *
 * Scoped by the chip, not by a key: which chip is a fact of where the control
 * is rendered, so it's the provider's to know. Both FilterBar groups (main and
 * extra) render through the same chip chrome, so both are served.
 */
const ChipFocusContext = createContext<FocusTarget>();

/** The chip's focus destination — `undefined` outside a chip (a bare control on
 *  a toolbar), which is why every claim below is optional-chained. */
const useChipFocus = () => useContext(ChipFocusContext);

/**
 * Marks a subtree as NOT the chip's editor. A chip holding more than one
 * focusable (a From/To range) must say which one the caret lands on: the
 * composite wraps its LATER slots in this, so the first claims the target and
 * the rest see an empty scope. Without it the last-mounted control would win —
 * "To", when entry starts at "From".
 */
export const NotChipEditor = (props: { children: JSX.Element }) => (
  <ChipFocusContext.Provider value={undefined}>
    {props.children}
  </ChipFocusContext.Provider>
);

// Chip chrome: label + the field's control + the remove ×. The ✕ is the pill's
// one affordance and it means REMOVE (DESIGN_STANDARDS unit 9) — every chip
// carries it, a seeded default filter's included (#563).
const FilterChip = (props: {
  label: string;
  onRemove: () => void;
  focusTarget: FocusTarget;
  children: JSX.Element;
}) => (
  <div class={styles.chip}>
    <span class={styles.chipLabel}>{props.label}:</span>
    {/* props.children is a getter compiled from the caller's JSX, so the
        control is CONSTRUCTED here — under the provider — not at the <For>. */}
    <ChipFocusContext.Provider value={props.focusTarget}>
      {props.children}
    </ChipFocusContext.Provider>
    <button
      type="button"
      class={styles.remove}
      aria-label={t('label.clear-filter-detail', { name: props.label })}
      // Keep the caret where it is while the button is pressed: the editor
      // shrinks to its text when it loses the caret, which slides this button
      // out from under the pointer, and the release then lands elsewhere — no
      // click, so the chip just seemed to collapse instead of going (#563).
      onMouseDown={e => e.preventDefault()}
      onClick={() => props.onRemove()}
    >
      <CloseIcon />
    </button>
  </div>
);

// The add-filter menu. Lists both groups' addable filters (type-erased to
// MenuItem so one dropdown serves them all) and, on pick, hands focus to the
// new chip's editor instead of the menu's default restore-to-trigger.
const FiltersMenu = (props: {
  available: MenuItem[];
  /** Hand the just-added chip's editor the next action. */
  focusChip: (key: string) => void;
}) => {
  // Picking a field hands focus to the NEW chip's editor instead of the
  // menu's default close-time restore-to-trigger. The hand-off happens IN
  // onCloseAutoFocus — the one moment that's both after the chip mounted
  // and after which nothing else re-takes focus. An Escape/outside
  // dismissal (no pick) keeps the normal restore (keyboard a11y).
  let pickedKey: string | undefined;
  return (
    <DropdownMenu.Root placement="bottom-start" gutter={4}>
      {/* The spec's dashed "Add filter" pill (ui-standards § tables →
          filtering): funnel icon + label, no chevron. Purely additive —
          Clear all lives in the bar. */}
      {/* Disabled once every filter is already added — nothing left to pick,
          so avoid opening an empty popover. */}
      <DropdownMenu.Trigger
        class={styles.trigger}
        data-testid="filters-menu"
        disabled={props.available.length === 0}
      >
        <FilterIcon class={styles.triggerIcon} />
        <span>{t('label.add-filter')}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class={styles.content}
          onCloseAutoFocus={event => {
            if (!pickedKey) return;
            const key = pickedKey;
            pickedKey = undefined;
            event.preventDefault();
            // Kobalte's DropdownMenu refocuses its trigger right after this
            // handler REGARDLESS of preventDefault (hard-coded for any
            // non-outside close). Queue the hand-off one task later so the
            // chip editor wins the exchange.
            setTimeout(() => props.focusChip(key));
          }}
        >
          <For each={props.available}>
            {item => (
              <DropdownMenu.Item
                class={styles.item}
                data-testid={`filter-option-${item.key}`}
                onSelect={() => {
                  pickedKey = item.key;
                  item.onAdd();
                }}
              >
                <span class={styles.itemLabel}>{item.label()}</span>
              </DropdownMenu.Item>
            )}
          </For>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

/*
 * Styled controls a field composes inside its `render`. They are dumb and
 * reusable: value in, change out — no knowledge of any GraphQL shape (the
 * field maps that).
 */

/*
 * A search-style text box (no chip chrome — FilterBar draws the label +
 * remove).
 *
 * Typing here is continuous server-bound input (spec:
 * ui-standards/inputs.md § Server-bound input): `onInput` is debounced so a
 * burst of keystrokes reaches the query (and the URL-persisted filter) once,
 * not once per key. Keystrokes still render immediately — the input shows the
 * pending draft; only `onInput` waits. Enter or blur flushes the draft at
 * once; a draft still pending at unmount is discarded, never applied
 * (flushing there would resurrect a chip the user just removed).
 */
export const FilterTextInput = (props: {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  label: string;
  /**
   * `data-testid` for the input (FilterBar's render supplies
   * `filter-input-<key>`).
   */
  testId?: string;
  /**
   * Delay before onInput fires (default 300ms); 0 = every keystroke
   * (client-side sets).
   */
  debounceMs?: number;
}) => {
  const chipFocus = useChipFocus();
  // undefined = no pending edit → the input shows the committed props.value.
  const [draft, setDraft] = createSignal<string>();
  const shown = () => draft() ?? props.value;

  // Trailing debounce (createDebounced buffers the latest value; flush() on
  // Enter/blur replays it now, cancel-on-cleanup drops a pending draft at
  // unmount so a removed chip is never resurrected).
  const commit = createDebounced((value: string) => {
    if (value !== props.value) props.onInput(value);
    // After onInput, so shown() moves draft → updated prop without flashing
    // the old value.
    setDraft(undefined);
  }, props.debounceMs ?? 300);

  const onInput = (value: string) => {
    if ((props.debounceMs ?? 300) <= 0) return props.onInput(value);
    setDraft(value);
    commit(value);
  };

  const flush = (value: string) => {
    if ((props.debounceMs ?? 300) <= 0) return;
    setDraft(value);
    commit(value);
    commit.flush();
  };

  return (
    <span class={styles.textFilter}>
      <span class={styles.textFilterIcon}>
        <SearchIcon />
      </span>
      <input
        class={styles.input}
        type="text"
        data-testid={props.testId}
        ref={(el: HTMLInputElement) => chipFocus?.ref(el)}
        value={shown()}
        placeholder={props.placeholder}
        aria-label={props.label}
        onInput={e => onInput(e.currentTarget.value)}
        onKeyDown={e => e.key === 'Enter' && flush(e.currentTarget.value)}
        onBlur={e => flush(e.currentTarget.value)}
      />
    </span>
  );
};

/**
 * A numeric filter box — FilterTextInput's number-typed sibling, built on the
 * shared NumberField so the locale-aware gate / eager-valid-commit / paste
 * repair logic isn't re-hand-rolled per filter (the old parseInt + NaN guard a
 * field would otherwise carry). The value is a real `number | undefined`
 * (undefined = the box is empty), so a field maps it straight into its GraphQL
 * operator (`{ equalTo: n }`) with no string parsing.
 *
 * The .bareField wrapper strips NumberField's own frame (token override) so
 * the field sits transparently on the chip pill like the text filter, while
 * keeping the shared component's locale gate / caret safety. Commits are
 * DEBOUNCED like the text filter: NumberField eagerly commits every valid
 * keystroke, and an exact-match filter applied at "12" while typing "1200"
 * matches nothing — the pause lets the whole number land as one change.
 * `decimalLimit` defaults to 0 (an integer filter — stocktake number, pack
 * count); pass a limit for decimal filters.
 */
export const FilterNumberInput = (props: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  label: string;
  /**
   * `data-testid` for the input (FilterBar's render supplies
   * `filter-input-<key>`).
   */
  testId?: string;
  /** Max decimal places; 0 (default) = integers only. */
  decimalLimit?: number;
  /** Lower bound (default 0). */
  min?: number;
  /** Upper bound. */
  max?: number;
}) => {
  const chipFocus = useChipFocus();
  const commit = createDebounced(
    (value: number | undefined) => props.onChange(value),
    300
  );
  return (
    <span class={styles.bareField}>
      <NumberField
        label={props.label}
        hideLabel
        size="small"
        data-testid={props.testId}
        ref={(el: HTMLInputElement) => chipFocus?.ref(el)}
        placeholder={props.placeholder}
        decimalLimit={props.decimalLimit}
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={commit}
      />
    </span>
  );
};

/** A number range as From/To bounds, either side optional — see
 * FilterNumberRange. */
export interface NumberRange {
  from?: number;
  to?: number;
}

/**
 * A number-RANGE filter — FilterNumberInput's dual-box sibling: two
 * NumberFields (From/To) on one chip pill, composed like FilterDateTimeRange
 * (– separator; From takes the chip's focus target). The schema has no
 * number-range operator, so the value is a plain `{ from, to }` pair each
 * vertical maps onto its own wire keys (e.g. min/max months of stock).
 *
 * Commits are DEBOUNCED like FilterNumberInput, through ONE timer over a
 * merged draft — so a From edit still pending when To is typed in rides into
 * the same commit, not overwritten.
 *
 * An inverted pair never commits: the flush emits it ORDERED (swapped) —
 * the range calendar's semantics (corvu swaps an earlier second pick), so
 * entry order doesn't matter. Not NumberField min/max cross-bounds: a
 * reactive bound re-runs its constraint reformat per keystroke, wiping
 * mid-entry text.
 */
export const FilterNumberRange = (props: {
  value: NumberRange;
  onChange: (value: NumberRange) => void;
  fromLabel: string;
  toLabel: string;
  /** `data-testid` stem for the two inputs (FilterBar supplies
   *  `filter-input-<key>`), stamped as `<testId>-from` / `<testId>-to`. */
  testId?: string;
  /** Max decimal places; 0 (default) = integers only. */
  decimalLimit?: number;
  /** Lower bound (default 0). */
  min?: number;
  /** Upper bound. */
  max?: number;
}) => {
  const chipFocus = useChipFocus();
  // The uncommitted pair; undefined = nothing pending.
  let draft: NumberRange | undefined;
  const commit = createDebounced((value: NumberRange) => {
    const { from, to } = value;
    props.onChange(
      from !== undefined && to !== undefined && from > to
        ? { from: to, to: from }
        : value
    );
    draft = undefined;
  }, 300);
  const update = (patch: NumberRange) => {
    draft = { ...(draft ?? props.value), ...patch };
    commit(draft);
  };
  return (
    <span class={`${styles.bareField} ${styles.numberRange}`}>
      <NumberField
        label={props.fromLabel}
        hideLabel
        size="small"
        data-testid={props.testId && `${props.testId}-from`}
        ref={(el: HTMLInputElement) => chipFocus?.ref(el)}
        decimalLimit={props.decimalLimit}
        min={props.min}
        max={props.max}
        value={props.value.from}
        onChange={from => update({ from })}
      />
      <span aria-hidden="true">–</span>
      <NumberField
        label={props.toLabel}
        hideLabel
        size="small"
        data-testid={props.testId && `${props.testId}-to`}
        decimalLimit={props.decimalLimit}
        min={props.min}
        max={props.max}
        value={props.value.to}
        onChange={to => update({ to })}
      />
    </span>
  );
};

/*
 * The empty-list row for the two chip dropdowns (`FilterSelect`,
 * `FilterMultiSelect`). A filter whose option set is EMPTY still opens — the
 * chip is live, so refusing to open would look broken — and an open menu must
 * never be a blank box (#906: an option custom field configured with no
 * options opened one, on every list that offers custom-field filters).
 *
 * The copy is deliberately not search-shaped: unlike Combobox's "No results",
 * nothing the user types can populate this list, so the row states the fact
 * ("No options") and stops. Muted and non-interactive — it is a status, not a
 * choice — so it is a plain div, outside the menu's item collection, and
 * Kobalte's keyboard navigation skips it rather than landing focus on nothing.
 */
const NoOptions = () => (
  <div class={styles.status}>{t('label.no-options')}</div>
);

/**
 * A single-select dropdown. Generic over its option-value union `V`, so
 * `onChange` hands back exactly one of the option values (recovered by
 * matching the emitted string against the typed options — no cast, and an
 * unknown value degrades to no change). Include a '' option to offer a "clear"
 * choice.
 *
 * A discrete choice, so `onChange` applies immediately — no debounce (spec:
 * ui-standards/inputs.md § Server-bound input).
 */
export const FilterSelect = <V extends string>(props: {
  value: V | '';
  options: readonly { value: V | ''; label: string }[];
  onChange: (value: V | '') => void;
  label: string;
  /**
   * `data-testid` for the trigger (FilterBar's render supplies
   * `filter-input-<key>`).
   */
  testId?: string;
}) => {
  const chipFocus = useChipFocus();
  const current = () => props.options.find(o => o.value === props.value);
  return (
    <DropdownMenu.Root placement="bottom-start" gutter={4}>
      <DropdownMenu.Trigger
        class={styles.enumTrigger}
        data-testid={props.testId}
        ref={(el: HTMLButtonElement) => chipFocus?.ref(el)}
        aria-label={props.label}
      >
        <span>{current()?.label ?? ''}</span>
        <ChevronDownIcon class={styles.triggerChevron} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class={styles.content}>
          <Show when={props.options.length > 0} fallback={<NoOptions />}>
            <DropdownMenu.RadioGroup
              value={props.value}
              onChange={emitted => {
                const chosen = props.options.find(o => o.value === emitted);
                if (chosen) props.onChange(chosen.value);
              }}
            >
              <For each={props.options}>
                {option => (
                  <DropdownMenu.RadioItem
                    value={option.value}
                    class={`${styles.item} ${styles.checkboxItem}`}
                    data-testid={
                      option.value ? `filter-option-${option.value}` : undefined
                    }
                    closeOnSelect={false}
                  >
                    <span class={styles.checkbox}>
                      <DropdownMenu.ItemIndicator class={styles.indicator}>
                        <CheckIcon />
                      </DropdownMenu.ItemIndicator>
                    </span>
                    <span class={styles.itemLabel}>{option.label}</span>
                  </DropdownMenu.RadioItem>
                )}
              </For>
            </DropdownMenu.RadioGroup>
          </Show>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

/**
 * A searchable single-select filter — the combobox sibling of `FilterSelect`
 * (a plain, non-searchable dropdown). Wraps the app `Combobox` de-boxed
 * (`borderless`) so it reads on the chip pill like the other editors; for a
 * large, searchable option set (locations, items) where a plain dropdown would
 * be unwieldy. Generic over the option type — the caller supplies the items +
 * `itemToString`/`itemToValue`, exactly as `Combobox` takes them.
 */
export const FilterCombobox = <T,>(props: {
  value?: string;
  items: T[];
  itemToString: (item: T) => string;
  itemToValue: (item: T) => string;
  onChange: (item: T | null) => void;
  label: string;
  placeholder?: string;
  /**
   * `data-testid` for the input (FilterBar's render supplies
   * `filter-input-<key>`).
   */
  testId?: string;
  /** Focus handle for the just-added chip (FilterBar's render supplies it). */
  focusTarget?: FocusTarget;
}) => (
  <Combobox<T>
    label={props.label}
    hideLabel
    size="small"
    borderless
    // No clear button — the chip's own remove (×) clears the filter; a second
    // × inside the control would be redundant (unlike a standalone Combobox).
    clearable={false}
    matchTriggerWidth={false}
    items={props.items}
    itemToString={props.itemToString}
    itemToValue={props.itemToValue}
    value={props.value}
    placeholder={props.placeholder}
    inputTestId={props.testId}
    focusTarget={props.focusTarget}
    onChange={props.onChange}
  />
);

/**
 * A multi-select enum filter — FilterSelect's many-value sibling: the same
 * dropdown chrome, but checkbox items and an "any of" selection array. The
 * trigger shows the selected labels (or the placeholder when none). Options
 * carry `filter-option-<VALUE>` testids (e2e/TESTIDS.md — raw enum value).
 */
export const FilterMultiSelect = <V extends string>(props: {
  values: readonly V[];
  options: readonly { value: V; label: string }[];
  onChange: (values: V[]) => void;
  label: string;
  /** Shown on the trigger while nothing is selected (e.g. "Any"). */
  placeholder: string;
  /**
   * Override the trigger's selected-summary text (default: the chosen labels
   * joined). Use it to collapse a redundant selection — e.g. a hierarchical
   * option filter showing just the parent when its whole subtree is chosen.
   * Called only when something is selected.
   */
  summary?: () => string;
  /**
   * `data-testid` for the trigger (FilterBar's render supplies
   * `filter-input-<key>`).
   */
  testId?: string;
}) => {
  const chipFocus = useChipFocus();
  const summary = () => {
    if (props.values.length === 0) return props.placeholder;
    if (props.summary) return props.summary();
    return props.options
      .filter(o => props.values.includes(o.value))
      .map(o => o.label)
      .join(', ');
  };
  const toggle = (value: V, checked: boolean) => {
    const without = props.values.filter(v => v !== value);
    props.onChange(checked ? [...without, value] : [...without]);
  };
  return (
    <DropdownMenu.Root placement="bottom-start" gutter={4}>
      <DropdownMenu.Trigger
        class={styles.enumTrigger}
        data-testid={props.testId}
        ref={(el: HTMLButtonElement) => chipFocus?.ref(el)}
        aria-label={props.label}
      >
        <span>{summary()}</span>
        <ChevronDownIcon class={styles.triggerChevron} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class={styles.content}>
          <Show when={props.options.length > 0} fallback={<NoOptions />}>
            <For each={props.options}>
              {option => (
                <DropdownMenu.CheckboxItem
                  checked={props.values.includes(option.value)}
                  onChange={checked => toggle(option.value, checked)}
                  class={`${styles.item} ${styles.checkboxItem}`}
                  data-testid={`filter-option-${option.value}`}
                  closeOnSelect={false}
                >
                  <span class={styles.checkbox}>
                    <DropdownMenu.ItemIndicator class={styles.indicator}>
                      <CheckIcon />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  <span class={styles.itemLabel}>{option.label}</span>
                </DropdownMenu.CheckboxItem>
              )}
            </For>
          </Show>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

/**
 * A boolean filter — the OMS boolean chip (e.g. "On hold"): the ONE drawn
 * checkbox (BareCheckbox) sitting directly on the pill. The chip's label
 * names the fact; ticking applies it. A discrete choice, so `onChange`
 * applies immediately — no debounce (spec: ui-standards/inputs.md §
 * Server-bound input). The caller maps checked onto its filter shape
 * (usually `{ key: true }` vs dropping the key / null).
 */
export const FilterCheckbox = (props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** `data-testid` for the input (FilterBar supplies `filter-input-<key>`). */
  testId?: string;
}) => {
  const chipFocus = useChipFocus();
  return (
    <BareCheckbox
      class={styles.checkboxFilter}
      checked={props.checked}
      aria-label={props.label}
      data-testid={props.testId}
      ref={(el: HTMLInputElement) => chipFocus?.ref(el)}
      onChange={event => props.onChange(event.currentTarget.checked)}
    />
  );
};

/** Inclusive range bounds on a filter key (shared by `DatetimeFilterInput`
 *  and `DateFilterInput`). */
interface RangeBounds {
  afterOrEqualTo?: string | null;
  beforeOrEqualTo?: string | null;
}

/**
 * A date-range filter chip. The user picks a calendar-day range; `type` (the
 * target field's wire scalar) drives the conversion — kept here so no vertical
 * hand-rolls it (#456): `dateTime` widens each day to UTC day-start/day-end
 * bounds and reads back to the local day; `date` passes the plain ISO date
 * through. The value is the field's own wire bounds, so a vertical binds its
 * key directly.
 */
export const FilterDateRange = (props: {
  value: RangeBounds | null | undefined;
  onChange: (value: RangeBounds | null) => void;
  /** The target field's wire scalar — governs conversion, not the UI. */
  type: 'date' | 'dateTime';
  label: string;
  /** `data-testid` for the trigger (FilterBar supplies
   *  `filter-input-<key>`). */
  testId?: string;
}) => {
  // The field's ONE focusable is its popover trigger — a button, so a
  // just-added chip OPENS its calendar rather than merely focusing it.
  const chipFocus = useChipFocus();
  const toLocal = (bound: string | null | undefined): string | null =>
    props.type === 'dateTime' ? utcToLocalDay(bound) : (bound ?? null);
  const toWire = (
    start: string | null,
    end: string | null
  ): RangeBounds | null => {
    if (props.type === 'dateTime') return utcBoundsFromLocalDays(start, end);
    return start || end
      ? {
          ...(start ? { afterOrEqualTo: start } : {}),
          ...(end ? { beforeOrEqualTo: end } : {}),
        }
      : null;
  };
  return (
    <span class={styles.bareField}>
      <DateRangeField
        label={props.label}
        hideLabel
        size="small"
        testId={props.testId}
        focusTarget={chipFocus}
        value={{
          start: toLocal(props.value?.afterOrEqualTo),
          end: toLocal(props.value?.beforeOrEqualTo),
        }}
        onChange={({ start, end }) => props.onChange(toWire(start, end))}
      />
    </span>
  );
};

/** A datetime range as UTC ISO instants, either side nullable — see
 * FilterDateTimeRange. */
export interface IsoDateTimeRange {
  start: string | null;
  end: string | null;
}

/**
 * A date-TIME range filter — two independent DateTimeFields (From/To)
 * de-boxed onto the chip pill via .bareField. Unlike FilterDateRange (one
 * corvu range-mode calendar, date-only), there is no shared range primitive
 * that also picks time, so this composes two whole fields rather than
 * extending DateRangeField — the items Ledger tab is the first caller
 * (spec/items/ui-surface.md § Ledger tab: "From date/time" / "To date/time").
 * Value is a `{ start, end }` pair of UTC ISO instants; the caller maps it
 * onto its filter's bounds (e.g. after/beforeOrEqualTo).
 */
export const FilterDateTimeRange = (props: {
  value: IsoDateTimeRange;
  onChange: (value: IsoDateTimeRange) => void;
  fromLabel: string;
  toLabel: string;
  /** `data-testid` stem for the two fields (FilterBar supplies
   *  `filter-input-<key>`), stamped on each field's DATE input as
   *  `<testId>-from` / `<testId>-to`. */
  testId?: string;
}) => {
  // Two whole fields in one chip: From takes the chip's target (entry starts
  // there). The To field simply isn't offered it — it binds a prop, not the
  // context, so there's nothing to block.
  const chipFocus = useChipFocus();
  return (
    <span class={styles.bareField}>
      <DateTimeField
        label={props.fromLabel}
        hideLabel
        size="small"
        testId={props.testId && `${props.testId}-from`}
        focusTarget={chipFocus}
        value={props.value.start}
        onChange={start => props.onChange({ ...props.value, start })}
      />
      <span aria-hidden="true">–</span>
      <DateTimeField
        label={props.toLabel}
        hideLabel
        size="small"
        testId={props.testId && `${props.testId}-to`}
        value={props.value.end}
        onChange={end => props.onChange({ ...props.value, end })}
      />
    </span>
  );
};

/**
 * A date filter — a native date input behind the calendar icon, sharing the
 * text-filter chrome. Value is an ISO `yyyy-mm-dd` string (native date input's
 * format); '' clears it. Used for a SINGLE date bound (the patients list's
 * date-of-birth); ranges use FilterDateRange.
 */
export const FilterDate = (props: {
  value: string;
  onInput: (value: string) => void;
  label: string;
  /**
   * `data-testid` for the input (FilterBar's render supplies
   * `filter-input-<key>`).
   */
  testId?: string;
}) => {
  const chipFocus = useChipFocus();
  return (
    <span class={styles.textFilter}>
      <span class={styles.textFilterIcon}>
        <CalendarIcon />
      </span>
      <input
        class={styles.input}
        type="date"
        data-testid={props.testId}
        ref={(el: HTMLInputElement) => chipFocus?.ref(el)}
        value={props.value}
        aria-label={props.label}
        onInput={e => props.onInput(e.currentTarget.value)}
      />
    </span>
  );
};
