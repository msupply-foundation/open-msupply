import { ErrorBoundary } from 'solid-js';
import { t } from '../../../intl';
import type { InternalOrderLineView } from '../../../plugin-sdk/types';
import { pluginIntl } from '../../../plugin-sdk/intl';
import {
  anchorMerge,
  type AnchorDiagnostic,
} from '../../../plugins/anchorMerge';
import { contributionId } from '../../../plugins/PluginSlot';
import type { RegisteredContribution } from '../../../plugins/registry';
import type { Column } from '../../../ui/elements/table/columnTypes';
import {
  getNumberCell,
  getTextCell,
  resolvedId,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';

/*
 * The internal-order line table's PLUGIN COLUMN REGION
 * (spec/internal-orders/ui-surface.md § S8, spec/plugins/sdk-contract.md § the
 * column slot).
 *
 * Ownership splits the standard way: this vertical owns what happens at its
 * region — the published column ids, and how contributed columns merge with
 * them — and the plugins vertical owns how contributions arrive. The ORDER is
 * the shared anchored merge (src/plugins/anchorMerge.ts), so a plugin author
 * meets the same placement rule here as on the dashboard.
 *
 * Pure: the merge takes data and returns columns plus reported degradations.
 * Recording a diagnostic is a write and this runs inside a memo, so the CALLER
 * records (kdd/solid-reactivity-pitfalls).
 */

// ── Published ids (ui-surface § S8) ─────────────────────────────────────────
/**
 * Every line-table column's published id — public API from the moment it is
 * published, and NEVER renamed: these ids key each user's persisted column
 * configuration (visibility, order, pinning, width), so a rename silently
 * discards their saved layout, and they are the anchor targets an installed
 * plugin's columns are placed against.
 *
 * The ids are the table's own column ids, unchanged — the frozen set, not a
 * parallel vocabulary. Preference-gated columns are listed like any other: a
 * gate hiding one does not remove its id, it only leaves it with no rendered
 * position, so a contribution anchored to it falls to the table's end.
 */
export const INTERNAL_ORDER_LINE_COLUMNS = {
  comment: 'comment',
  code: 'code',
  name: 'itemName',
  unit: 'unitName',
  dosesPerUnit: 'dosesPerUnit',
  dps: 'dps',
  available: 'available',
  amc: 'amc',
  mos: 'mos',
  targetStock: 'targetStock',
  targetStockPopulation: 'targetStockPopulation',
  suggested: 'suggested',
  requested: 'requested',
  pricePerUnit: 'pricePerUnit',
  indicativePrice: 'indicativePrice',
  initialSoh: 'initialSoh',
  incoming: 'incoming',
  outgoing: 'outgoing',
  losses: 'losses',
  additions: 'additions',
  shortExpiry: 'shortExpiry',
  daysOutOfStock: 'daysOutOfStock',
  reason: 'reason',
  approvedPacks: 'approvedPacks',
  approvalComment: 'approvalComment',
} as const;

/** Every published line-column id, flattened — the id-stability surface. */
export const publishedLineColumnIds = (): string[] =>
  Object.values(INTERNAL_ORDER_LINE_COLUMNS);

// ── The merge ───────────────────────────────────────────────────────────────

/** A column contribution as the registry hands it over. */
export type LineColumnContribution =
  RegisteredContribution<'internalOrderLine.column'>;

/**
 * The current page's batched column data, as one value.
 *
 * Batch state is part of the merge INPUT rather than something cells read
 * reactively: a `value` column's cell is delivered through the host's own
 * number/text cell, whose resolved value the table caches per row. So the
 * columns are rebuilt when the batch resolves — once per page of rows,
 * never per cell.
 */
export interface LineColumnBatch {
  /** Contribution published id → (line id → that line's loaded entry). */
  data: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
  /** True while any loader for the current page of rows is in flight. */
  loading: boolean;
}

export const EMPTY_LINE_COLUMN_BATCH: LineColumnBatch = {
  data: new Map(),
  loading: false,
};

export interface MergedLineColumns<Row> {
  /**
   * Host and contributed columns in final, deterministic order. The sort-key
   * space is `string`, wider than the host's own key union: a contributed
   * sortable column's key is its namespaced id.
   */
  columns: Column<Row, string>[];
  /** Degradations to record — the caller's, so the merge stays pure. */
  diagnostics: AnchorDiagnostic[];
}

// A contributed `width` is CSS-ish (the SDK contract's `width?: string`); the
// host's column width is a px number (its min-width floor). Only the two units
// that mean anything here are honoured; anything else leaves the host default —
// a column slightly the wrong width is never worth failing a render over.
const parseWidth = (width: string | undefined): number | undefined => {
  if (width === undefined) return undefined;
  const rem = /^([\d.]+)rem$/.exec(width.trim());
  if (rem) return remToPx(Number(rem[1]));
  const px = /^([\d.]+)px$/.exec(width.trim());
  if (px) return Number(px[1]);
  return undefined;
};

/**
 * One contributed column as a host `Column`.
 *
 * Identity is `${pluginCode}.${contributionId}` — namespaced, so two plugins
 * contributing `total` can never collide, and the id a user's persisted column
 * config stores stays that plugin's alone (AC-PLUG-K5).
 */
const toHostColumn = <Row,>(
  contribution: LineColumnContribution,
  id: string,
  toView: (row: Row) => InternalOrderLineView,
  batch: LineColumnBatch
): Column<Row, string> => {
  // Header text resolves through the plugin's own namespace, on every header
  // render — so a locale switch retranslates it like any host header, and a
  // missing key renders the key itself rather than blank (AC-PLUG-I1).
  const intl = pluginIntl(contribution.pluginCode);
  const size = parseWidth(contribution.width);
  const entries = batch.data.get(id);
  const dataFor = (view: InternalOrderLineView) => entries?.get(view.id);

  // `align: 'end'` is the numeric column — right-aligned and
  // locale-formatted by the host's own number cell, so a contributed figure
  // reads identically to a host one (digit grouping, digit system, 2dp cap).
  // RTL follows from the logical value: hence start/end in the contract.
  const fragment =
    contribution.align === 'end' ? getNumberCell<Row>() : getTextCell<Row>();
  const base = {
    header: () => intl.t(contribution.header),
    // `description` rides in the column's meta, where the shared header-tooltip
    // treatment reads it (host columns carry theirs the same way).
    meta: {
      ...fragment.meta,
      ...(contribution.description !== undefined
        ? { description: intl.t(contribution.description) }
        : {}),
    },
    ...(size !== undefined ? { size } : {}),
    // Sortability follows the declaration (AC-PLUG-K7): the sortKey is the
    // column's namespaced id, so the table offers its standard sort control
    // and the view resolves the active key back to this contribution's
    // sortValue (sortLinesByContribution below).
    ...(contribution.sortValue !== undefined ? { sortKey: id } : {}),
  };

  if (contribution.value !== undefined) {
    const value = contribution.value;
    // A throwing value function is contained like a throwing component
    // (AC-PLUG-E1) — the cell goes blank, the table keeps working, and the
    // failure is named ONCE per column build rather than once per row.
    let reported = false;
    return {
      ...fragment,
      ...base,
      c: {
        accessor: row => {
          const view = toView(row);
          try {
            return value(view, dataFor(view));
          } catch (error) {
            if (!reported) {
              reported = true;
              console.error(`[plugins] ${id}: column value failed`, error);
            }
            return '';
          }
        },
        id,
      },
    };
  }

  const Cell = contribution.Component;
  // A Component column is a display column — no accessor, nothing cached, the
  // contribution owns the whole cell — EXCEPT when it declares a sort: the
  // table engine refuses sort on a column with no accessor (getCanSort tests
  // accessorFn, not enableSorting alone), so a sortable one carries its sort
  // value as the accessor. The `cell` below still owns every rendered pixel;
  // the accessor is never displayed. A throwing sortValue is contained like a
  // throwing value function.
  const sortValue = contribution.sortValue;
  let sortReported = false;
  const identity =
    sortValue === undefined
      ? { id }
      : {
          id,
          accessor: (row: Row) => {
            const view = toView(row);
            try {
              return sortValue(view, dataFor(view));
            } catch (error) {
              if (!sortReported) {
                sortReported = true;
                console.error(`[plugins] ${id}: column sortValue failed`, error);
              }
              return '';
            }
          },
        };
  return {
    ...fragment,
    ...base,
    // Its own error boundary keeps a throwing cell to that cell — the row, the
    // column, and the rest of the table keep rendering (AC-PLUG-E1).
    c: identity,
    cell: info => {
      const view = toView(info.row.original);
      return (
        <ErrorBoundary
          fallback={error => {
            console.error(
              `[plugins] ${id}: column cell failed to render`,
              error
            );
            return t('error.plugin-unavailable');
          }}
        >
          <Cell row={view} data={dataFor(view)} isLoading={batch.loading} />
        </ErrorBoundary>
      );
    },
  };
};

/**
 * Merge contributed columns into the line table's host columns.
 *
 * Placement is id-anchored against the published ids: anchor position, then
 * contribution `order`, then contribution `id` — identical on every reload and
 * independent of which bundle loaded first (AC-PLUG-K1). A contribution whose
 * anchor names no RENDERED column — an id that does not exist, or one a
 * preference gate currently hides — is placed at the table's end and reported
 * (AC-PLUG-K2).
 *
 * An empty contribution set returns the host columns unchanged, so a table with
 * no plugins installed is byte-identical to one built without this merge
 * (`OMS-REG-REPL-16.1`).
 */
export const mergeLineColumns = <Row, K extends string>(
  hostColumns: readonly Column<Row, K>[],
  contributions: readonly LineColumnContribution[],
  toView: (row: Row) => InternalOrderLineView,
  batch: LineColumnBatch = EMPTY_LINE_COLUMN_BATCH
): MergedLineColumns<Row> => {
  if (contributions.length === 0)
    return { columns: [...hostColumns], diagnostics: [] };

  const merged = anchorMerge(
    hostColumns.map(column => ({ id: resolvedId(column) ?? '', column })),
    contributions.map(contribution => ({
      id: contributionId(contribution),
      anchor: contribution.anchor,
      order: contribution.order,
      contribution,
    }))
  );

  return {
    columns: merged.entries.map(entry =>
      entry.kind === 'host'
        ? entry.item.column
        : toHostColumn<Row>(
            entry.item.contribution,
            entry.item.id,
            toView,
            batch
          )
    ),
    diagnostics: merged.diagnostics,
  };
};

// ── The contributed sort ────────────────────────────────────────────────────

/**
 * Order rows by a contribution's declared sort value (AC-PLUG-K7,
 * sdk-contract § the column slot): numbers compare numerically, strings by
 * locale, and a `null`/`undefined` value sorts LAST in either direction — the
 * contract's "no value sorts last", which no sentinel can give a
 * direction-flipped comparator. A throwing `sortValue` reads as no value and
 * is named once per sort, like a throwing `value` accessor.
 *
 * Pure, like the merge: rows in, rows out, one decorate pass so `sortValue`
 * runs once per row rather than once per comparison.
 */
export const sortLinesByContribution = <Row,>(
  rows: readonly Row[],
  toView: (row: Row) => InternalOrderLineView,
  contribution: LineColumnContribution,
  entries: ReadonlyMap<string, unknown> | undefined,
  desc: boolean
): Row[] => {
  const sortValue = contribution.sortValue;
  if (sortValue === undefined) return [...rows];
  const id = contributionId(contribution);
  let reported = false;
  const decorated = rows.map(row => {
    const view = toView(row);
    let value: string | number | null;
    try {
      value = sortValue(view, entries?.get(view.id)) ?? null;
    } catch (error) {
      if (!reported) {
        reported = true;
        console.error(`[plugins] ${id}: column sortValue failed`, error);
      }
      value = null;
    }
    return { row, value };
  });
  const dir = desc ? -1 : 1;
  decorated.sort((a, b) => {
    if (a.value === null || b.value === null) {
      if (a.value === b.value) return 0;
      return a.value === null ? 1 : -1;
    }
    if (typeof a.value === 'number' && typeof b.value === 'number') {
      const diff = (a.value - b.value) * dir;
      // Infinity − Infinity is NaN: equal sentinels read as equal.
      return Number.isNaN(diff) ? 0 : diff;
    }
    return String(a.value).localeCompare(String(b.value)) * dir;
  });
  return decorated.map(entry => entry.row);
};
