/*
 * Host-owned LAZY component wrappers (spec/plugins/sdk-contract.md § code
 * splitting & lazy loading): the heavy components a plugin surface needs —
 * the data table, the date picker — without their weight landing in the SDK's
 * eager entry chunk. The implementation stays a host chunk, shared by the host
 * and every plugin, and loads on first render.
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
import type { DateFieldProps } from '../ui/elements/inputs/DateField';

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

/**
 * The host's calendar-date input (typed entry + corvu calendar popover), as a
 * lazy wrapper — the sanctioned date field; a controlled `value` on a native
 * `<input type="date">` destroys mid-edit segments (kdd/solid-reactivity-
 * pitfalls § binding gotchas) and MUST NOT be used instead.
 */
export const DateField: Component<DateFieldProps> = lazy(() =>
  import('../ui/elements/inputs/DateField').then(m => ({
    default: m.DateField,
  }))
);
