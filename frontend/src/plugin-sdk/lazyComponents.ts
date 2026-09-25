/*
 * Host-owned LAZY component wrappers (spec/plugins/sdk-contract.md § code
 * splitting & lazy loading): the heavy components a plugin surface needs —
 * the data table, the date picker, the form library — without their weight
 * landing in the SDK's eager entry chunk. The implementation stays a host
 * chunk, shared by the host and every plugin, and loads on first render.
 *
 * A lazy SDK component MUST render inside a `<Suspense>` boundary. A plugin
 * PAGE gets one for free — the host wraps every plugin page route in Suspense
 * (sdk-contract § pages & navigation) — but per kdd/solid-reactivity-pitfalls
 * these must render from the surface's FIRST paint, never first mounted by a
 * later interaction, which would suspend an already-open screen and remount it.
 */
import { lazy } from 'solid-js';
import type { Component, JSX } from 'solid-js';
import type { DataTableProps } from '../ui/elements/table/DataTable';
import type {
  FilterBarProps,
  FilterDateRangeProps,
  FilterSelectProps,
  FilterTextInputProps,
} from '../ui/elements/selectors/FilterBar';
import type {
  CheckboxInputProps,
  DateInputProps,
  DateTimeInputProps,
  FieldGroupProps,
  NumberInputProps,
  SelectInputProps,
  TextAreaInputProps,
  TextInputProps,
} from '../domain/documentForm/fields';
import type {
  BooleanPath,
  EnumPath,
  NumberPath,
  TextPath,
} from '../domain/documentForm/paths';

const LazyDataTable = lazy(() =>
  import('../ui/elements/table/DataTable').then(m => ({
    // Solid's `lazy` takes a concrete Component, so the generic parameters are
    // pinned here and restored on the export below — the one place the
    // type-erasing cast pair lives.
    default: m.DataTable as Component<DataTableProps<unknown, string, string>>,
  }))
);

/**
 * The host's TanStack-driven data table (sorting, column resizing with
 * double-press auto-fit, pagination, selection, card view, full screen), as a
 * lazy wrapper — a screen's own row set is a DataTable, however few rows it
 * holds (spec/ui-standards/components.md § tables). Rows arrive pre-sorted and
 * pre-paged: the caller owns sort/filter/pagination STATE, the table owns the
 * chrome. See DataTableProps for the contract.
 */
export const DataTable = LazyDataTable as unknown as <
  T,
  K extends string,
  G extends string = never,
>(
  props: DataTableProps<T, K, G>
) => JSX.Element;

/*
 * The filter bar family (spec/ui-standards/components.md § Filter bar): the
 * ONE filter surface — an "Add filter" menu plus typed chips — rendered in a
 * DataTable's `filters` slot, with the styled controls a chip's `render`
 * composes. All four resolve from one host module, so they arrive as one
 * chunk. A chip control first MOUNTS when its chip first shows, so a filter a
 * screen offers should be SEEDED present-as-null in its default filter state —
 * that mounts the control at first paint (inside the page's Suspense) instead
 * of suspending the open screen on the first "Add filter" click.
 */

const LazyFilterBar = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterBar as Component<FilterBarProps<object>>,
  }))
);

/** The host filter bar: "Add filter" menu → typed chips over the caller's own
 * filter object (a key present-as-null is an added-but-empty chip). */
export const FilterBar = LazyFilterBar as unknown as <
  F extends object,
  C extends object = Record<string, never>,
>(
  props: FilterBarProps<F, C>
) => JSX.Element;

/** A chip's search-style text control (debounced; `debounceMs: 0` for
 * client-side sets). */
export const FilterTextInput: Component<FilterTextInputProps> = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterTextInput,
  }))
);

const LazyFilterSelect = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterSelect as Component<FilterSelectProps<string>>,
  }))
);

/** A chip's discrete-choice control — applies immediately, no debounce. */
export const FilterSelect = LazyFilterSelect as unknown as <V extends string>(
  props: FilterSelectProps<V>
) => JSX.Element;

/** A chip's calendar-day range control (pick-only corvu range; `type: 'date'`
 * passes plain ISO days through as inclusive bounds). */
export const FilterDateRange: Component<FilterDateRangeProps> = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterDateRange,
  }))
);

/*
 * The form component library (kdd/custom-forms/specs.md § Forms in the UI):
 * the fields a plugin form is written with, each bound to the document draft
 * the host hands the form and a path into the document type. All eight come
 * from one host module, which also carries the AJV validator and the host's
 * default forms, so the first form a user opens fetches them as one chunk,
 * shared by the host and every plugin (vite/lazyChunkGuard.ts keeps it out of
 * the eager entry). A form renders its fields at its own first paint, inside
 * the Suspense its mount point provides.
 */
const formLibrary = () => import('../domain/documentForm/formLibrary');

const LazyTextInput = lazy(() =>
  formLibrary().then(m => ({
    default: m.TextInput as Component<TextInputProps<unknown, never>>,
  }))
);
/** A single line of free text at a text path. */
export const TextInput = LazyTextInput as unknown as <
  T,
  P extends TextPath<T>,
>(
  props: TextInputProps<T, P>
) => JSX.Element;

const LazyTextAreaInput = lazy(() =>
  formLibrary().then(m => ({
    default: m.TextAreaInput as Component<TextAreaInputProps<unknown, never>>,
  }))
);
/** Several lines of free text at a text path. */
export const TextAreaInput = LazyTextAreaInput as unknown as <
  T,
  P extends TextPath<T>,
>(
  props: TextAreaInputProps<T, P>
) => JSX.Element;

const LazyNumberInput = lazy(() =>
  formLibrary().then(m => ({
    default: m.NumberInput as Component<NumberInputProps<unknown, never>>,
  }))
);
/** A number at a number path. */
export const NumberInput = LazyNumberInput as unknown as <
  T,
  P extends NumberPath<T>,
>(
  props: NumberInputProps<T, P>
) => JSX.Element;

const LazyDateInput = lazy(() =>
  formLibrary().then(m => ({
    default: m.DateInput as Component<DateInputProps<unknown, never>>,
  }))
);
/** A calendar day, stored as the schema's `format` at the path says. */
export const DateInput = LazyDateInput as unknown as <
  T,
  P extends TextPath<T>,
>(
  props: DateInputProps<T, P>
) => JSX.Element;

const LazyDateTimeInput = lazy(() =>
  formLibrary().then(m => ({
    default: m.DateTimeInput as Component<DateTimeInputProps<unknown, never>>,
  }))
);
/** A date and time of day, stored as an RFC 3339 instant. */
export const DateTimeInput = LazyDateTimeInput as unknown as <
  T,
  P extends TextPath<T>,
>(
  props: DateTimeInputProps<T, P>
) => JSX.Element;

const LazySelectInput = lazy(() =>
  formLibrary().then(m => ({
    default: m.SelectInput as Component<SelectInputProps<unknown, never>>,
  }))
);
/** One value of an enum, with a label for every value the type allows. */
export const SelectInput = LazySelectInput as unknown as <
  T,
  P extends EnumPath<T>,
>(
  props: SelectInputProps<T, P>
) => JSX.Element;

const LazyCheckboxInput = lazy(() =>
  formLibrary().then(m => ({
    default: m.CheckboxInput as Component<CheckboxInputProps<unknown, never>>,
  }))
);
/** A yes/no value at a boolean path. */
export const CheckboxInput = LazyCheckboxInput as unknown as <
  T,
  P extends BooleanPath<T>,
>(
  props: CheckboxInputProps<T, P>
) => JSX.Element;

/** A titled group of fields. */
export const FieldGroup: Component<FieldGroupProps> = lazy(() =>
  formLibrary().then(m => ({ default: m.FieldGroup }))
);
