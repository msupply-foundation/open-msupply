import { For, Show, createSignal } from 'solid-js';
import type { JSX } from 'solid-js';
import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from '../../icons';
import { t } from '../../../intl';
import { createDebounced } from '../../utils/createDebounced';
import { NumberField } from '../inputs/NumberField';
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
  add: (f: Filter<G>) => void;
  remove: (f: Filter<G>) => void;
  reset: () => void;
  renderProps: (f: Filter<G>) => {
    filter: () => G;
    setFilter: (next: G) => void;
    setPartialFilter: (patch: Partial<G>) => void;
    testId: string;
  };
}

const groupOps = <G extends object>(
  filters: () => Filter<G>[],
  filter: () => G,
  onChange: (g: G) => void
): GroupOps<G> => {
  const isActive = (f: Filter<G>) => f.key in filter();
  const without = (key: keyof G & string): G => {
    const { [key]: _omit, ...rest } = filter();
    return rest as G; // erase the omitted optional key; the value is a filter object
  };
  return {
    active: () => filters().filter(isActive),
    available: () => filters().filter(f => !isActive(f)),
    add: f => onChange({ ...filter(), [f.key]: null }),
    remove: f => onChange(without(f.key)),
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
    }),
  };
};

/*
 * Filter bar — the current app's FilterMenu pattern (Solid port of the RnD
 * prototype's FilterBar, Radix DropdownMenu → Kobalte): a "Filters" dropdown
 * lists the addable fields; picking one adds a chip beside it holding that
 * field's control.
 *
 * State model (see kdd/page-composition): the caller's filter object IS the
 * state, in GraphQL-native shape. A chip is shown iff its key is PRESENT on
 * the filter (present-as-`null` = added but empty). Adding writes `null`,
 * removing deletes the key, editing goes through the field's own control via
 * setPartialFilter. Chip visibility therefore lives in the (URL-backed)
 * filter, so a restored state re-opens its chips — no local presentation
 * signal to seed. The page strips null/empty keys before querying
 * (stripEmpty).
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
  // Read props live inside accessors so a chip's control tracks its own value
  // and <For> reuses chip rows across edits (kdd/state-management: no remounts).
  const main = groupOps<F>(
    () => props.filters,
    () => props.filter,
    props.onChange
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
          e.onChange
        )
      : undefined;
  };

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

  const anyActive = () =>
    main.active().length > 0 || (extraOps()?.active().length ?? 0) > 0;

  const resetAll = () => {
    main.reset();
    extraOps()?.reset();
  };

  return (
    <div class={styles.bar}>
      <FiltersMenu
        available={menuItems()}
        onReset={anyActive() ? resetAll : undefined}
      />

      <For each={main.active()}>
        {f => (
          <FilterChip label={f.label()} onRemove={() => main.remove(f)}>
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
            extra().onChange
          );
          return (
            <For each={ex.active()}>
              {f => (
                <FilterChip label={f.label()} onRemove={() => ex.remove(f)}>
                  {f.render(ex.renderProps(f))}
                </FilterChip>
              )}
            </For>
          );
        }}
      </Show>
    </div>
  );
};

// Chip chrome: label + the field's control + a remove button.
const FilterChip = (props: {
  label: string;
  onRemove: () => void;
  children: JSX.Element;
}) => (
  <div class={styles.chip}>
    <span class={styles.chipLabel}>{props.label}</span>
    {props.children}
    <button
      type="button"
      class={styles.remove}
      aria-label={t('label.clear-filter-detail', { name: props.label })}
      onClick={props.onRemove}
    >
      <CloseIcon />
    </button>
  </div>
);

const FiltersMenu = (props: {
  available: MenuItem[];
  onReset?: () => void;
}) => (
  <DropdownMenu.Root placement="bottom-start" gutter={4}>
    <DropdownMenu.Trigger class={styles.trigger} data-testid="filters-menu">
      <span>{t('label.filters')}</span>
      <ChevronDownIcon class={styles.triggerChevron} />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={styles.content}>
        <For each={props.available}>
          {item => (
            <DropdownMenu.Item
              class={styles.item}
              data-testid={`filter-option-${item.key}`}
              onSelect={item.onAdd}
            >
              <span class={styles.itemLabel}>{item.label()}</span>
            </DropdownMenu.Item>
          )}
        </For>
        <Show when={props.onReset && props.available.length > 0}>
          <DropdownMenu.Separator class={styles.separator} />
        </Show>
        <Show when={props.onReset}>
          <DropdownMenu.Item
            class={styles.item}
            onSelect={() => props.onReset?.()}
          >
            <span class={styles.itemLabel}>
              {t('label.remove-all-filters')}
            </span>
          </DropdownMenu.Item>
        </Show>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

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
  /** `data-testid` for the input (FilterBar's render supplies `filter-input-<key>`). */
  testId?: string;
  /** Delay before onInput fires (default 300ms); 0 = every keystroke (client-side sets). */
  debounceMs?: number;
}) => {
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
 * NumberField owns its own field chrome (border, focus ring, compact width),
 * so — unlike the bordered chip box FilterTextInput sits in — this renders the
 * field bare; the FilterBar chip still supplies the label + remove around it.
 * `decimalLimit` defaults to 0 (an integer filter — stocktake number, pack
 * count); pass a limit for decimal filters.
 */
export const FilterNumberInput = (props: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  label: string;
  /** `data-testid` for the input (FilterBar's render supplies `filter-input-<key>`). */
  testId?: string;
  /** Max decimal places; 0 (default) = integers only. */
  decimalLimit?: number;
  /** Lower bound (default 0). */
  min?: number;
  /** Upper bound. */
  max?: number;
}) => (
  <NumberField
    label={props.label}
    hideLabel
    size="small"
    data-testid={props.testId}
    placeholder={props.placeholder}
    decimalLimit={props.decimalLimit}
    min={props.min}
    max={props.max}
    value={props.value}
    onChange={props.onChange}
  />
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
  /** `data-testid` for the trigger (FilterBar's render supplies `filter-input-<key>`). */
  testId?: string;
}) => {
  const current = () => props.options.find(o => o.value === props.value);
  return (
    <DropdownMenu.Root placement="bottom-start" gutter={4}>
      <DropdownMenu.Trigger
        class={styles.enumTrigger}
        data-testid={props.testId}
        aria-label={props.label}
      >
        <span>{current()?.label ?? ''}</span>
        <ChevronDownIcon class={styles.triggerChevron} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class={styles.content}>
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
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

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
  /** `data-testid` for the trigger (FilterBar's render supplies `filter-input-<key>`). */
  testId?: string;
}) => {
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
        aria-label={props.label}
      >
        <span>{summary()}</span>
        <ChevronDownIcon class={styles.triggerChevron} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class={styles.content}>
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
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

/**
 * A date filter — a native date input behind the calendar icon, sharing the
 * text-filter chrome. Value is an ISO `yyyy-mm-dd` string (native date input's
 * format); '' clears it. Used for "before"/"after" bounds inside a filter's
 * render.
 */
export const FilterDate = (props: {
  value: string;
  onInput: (value: string) => void;
  label: string;
  /** `data-testid` for the input (FilterBar's render supplies `filter-input-<key>`). */
  testId?: string;
}) => (
  <span class={styles.textFilter}>
    <span class={styles.textFilterIcon}>
      <CalendarIcon />
    </span>
    <input
      class={styles.input}
      type="date"
      data-testid={props.testId}
      value={props.value}
      aria-label={props.label}
      onInput={e => props.onInput(e.currentTarget.value)}
    />
  </span>
);
