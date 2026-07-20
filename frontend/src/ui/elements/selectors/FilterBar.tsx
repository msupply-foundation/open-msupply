import { For, Show } from 'solid-js';
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

interface FilterBarProps<F extends object> {
  /** The filters a user can add — drives the add-filter menu and the chips. */
  filters: Filter<F>[];
  /** Controlled filter object — the caller's generated GraphQL filter shape. */
  filter: F;
  onChange: (filter: F) => void;
}

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
export const FilterBar = <F extends object>(props: FilterBarProps<F>) => {
  // props.filters is a stable module const (its labels are accessors, so it
  // needn't be rebuilt to re-translate) — identities don't churn, so <For>
  // reuses chip rows across filter edits instead of remounting them
  // (kdd/state-management: no remounts). Hence no memo; read props.filters
  // directly.
  const isActive = (f: Filter<F>) => f.key in props.filter;
  const active = () => props.filters.filter(isActive);
  const available = () => props.filters.filter(f => !isActive(f));

  const setFilter = (next: F) => props.onChange(next);
  const setPartialFilter = (patch: Partial<F>) =>
    props.onChange({ ...props.filter, ...patch });

  const addFilter = (f: Filter<F>) =>
    props.onChange({ ...props.filter, [f.key]: null });

  const removeFilter = (f: Filter<F>) => {
    const next = { ...props.filter };
    delete next[f.key];
    props.onChange(next);
  };

  // Clear only the keys this bar manages (delete, don't replace with {}): any
  // programmatic filter key the caller set outside the bar is left intact, and
  // it stays typed as F with no `as`.
  const resetAll = () => {
    const next = { ...props.filter };
    for (const f of props.filters) delete next[f.key];
    props.onChange(next);
  };

  return (
    <div class={styles.bar}>
      <FiltersMenu
        available={available()}
        onAdd={addFilter}
        onReset={active().length > 0 ? resetAll : undefined}
      />

      <For each={active()}>
        {f => (
          <div class={styles.chip}>
            <span class={styles.chipLabel}>{f.label()}</span>
            {f.render({
              filter: () => props.filter,
              setFilter,
              setPartialFilter,
              testId: `filter-input-${f.key}`,
            })}
            <button
              type="button"
              class={styles.remove}
              aria-label={t('label.clear-filter-detail', { name: f.label() })}
              onClick={() => removeFilter(f)}
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </For>
    </div>
  );
};

const FiltersMenu = <F extends object>(props: {
  available: Filter<F>[];
  onAdd: (f: Filter<F>) => void;
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
          {f => (
            <DropdownMenu.Item
              class={styles.item}
              data-testid={`filter-option-${f.key}`}
              onSelect={() => props.onAdd(f)}
            >
              <span class={styles.itemLabel}>{f.label()}</span>
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

/**
 * A search-style text box (no chip chrome — FilterBar draws the label +
 * remove).
 */
export const FilterTextInput = (props: {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  label: string;
  /** `data-testid` for the input (FilterBar's render supplies `filter-input-<key>`). */
  testId?: string;
}) => (
  <span class={styles.textFilter}>
    <span class={styles.textFilterIcon}>
      <SearchIcon />
    </span>
    <input
      class={styles.input}
      type="text"
      data-testid={props.testId}
      value={props.value}
      placeholder={props.placeholder}
      aria-label={props.label}
      onInput={e => props.onInput(e.currentTarget.value)}
    />
  </span>
);

/**
 * A single-select dropdown. Generic over its option-value union `V`, so
 * `onChange` hands back exactly one of the option values (recovered by
 * matching the emitted string against the typed options — no cast, and an
 * unknown value degrades to no change). Include a '' option to offer a "clear"
 * choice.
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
  /** `data-testid` for the trigger (FilterBar's render supplies `filter-input-<key>`). */
  testId?: string;
}) => {
  const summary = () => {
    const chosen = props.options.filter(o => props.values.includes(o.value));
    return chosen.length
      ? chosen.map(o => o.label).join(', ')
      : props.placeholder;
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
