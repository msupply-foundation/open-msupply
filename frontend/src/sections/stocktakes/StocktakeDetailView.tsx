import { createEffect, createMemo, createResource, createSignal, on, Show, Suspense } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../ui/elements/buttons/Button';
import { CloseIcon } from '../../ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
  sharedOrMultiple,
} from '../../ui/elements/table/DataTable';
import { getDateCell, getNumberCell } from '../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../api/createTableConfig';
import { StocktakeDetail, type StocktakeDetailResult } from './stocktakeDetail.generated';
import {
  StocktakeLineEditModal,
  type LineEditCommit,
  type StocktakeLineEditItem,
} from './StocktakeLineEditModal';

// The stocktake detail view — the page a stocktake create / a list row-click lands on. The page
// shell (breadcrumb back to the list + a title) plus the stocktake's lines in the DataTable
// (front-end sorted, optionally grouped by item, selectable). Clicking a row opens the line-edit
// modal for that ITEM (all its batches); a save reflects in place with NO refetch — the mutation
// returns the same StocktakeLine fragment, spliced straight back into the rows.
//
// A finalised or locked stocktake is read-only (matches OMS isStocktakeDisabled): row-click is
// disabled. Stocktake-level edits (status change, on-hold, description) are deferred.

type StocktakeNode = Extract<StocktakeDetailResult['stocktake'], { __typename: 'StocktakeNode' }>;
type Line = StocktakeNode['lines']['nodes'][number];

// A finalised or on-hold (locked) stocktake can't be edited (OMS isStocktakeDisabled).
const isDisabled = (node: StocktakeNode) => node.status !== 'NEW' || node.isLocked;

// The line fields the table can sort by (client-side). `code` reads the nested item.code.
type SortKey = 'code' | 'itemName' | 'batch' | 'expiryDate' | 'snapshotNumberOfPacks' | 'countedNumberOfPacks';

// A stable, comparable value per sort key. Strings compare case-insensitively; pack counts are
// numbers (null sorts as -1 so uncounted lines group together). Explicit rather than a generic
// accessor map (kdd/explicit-composition).
const sortValue = (line: Line, key: SortKey): string | number => {
  switch (key) {
    case 'code':
      return line.item.code.toLowerCase();
    case 'itemName':
      return line.itemName.toLowerCase();
    case 'batch':
      return (line.batch ?? '').toLowerCase();
    case 'expiryDate':
      return line.expiryDate ?? '';
    case 'snapshotNumberOfPacks':
      return line.snapshotNumberOfPacks ?? -1;
    case 'countedNumberOfPacks':
      return line.countedNumberOfPacks ?? -1;
  }
};

const StocktakeDetailView: Component = () => {
  const params = useParams<{ storeId: string; stocktakeId: string }>();
  const navigate = useNavigate();
  const [sort, setSort] = createSignal<SortState<SortKey>>({ key: 'itemName', desc: false });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Column config (order/sizing/visibility) + the row-grouping choice (config.groupBy) persist
  // per user/store for this table (kdd/table-state). Grouping by item collapses an item's batches.
  const tableConfig = createTableConfig({ tableId: 'stocktake-detail' });
  // The item being edited (undefined = modal closed). Row-click sets it; the modal edits all of
  // that item's lines and reports a commit we splice back in.
  const [editItem, setEditItem] = createSignal<StocktakeLineEditItem | undefined>();

  // Fetch the stocktake. A NodeError (e.g. bad id) is promoted to the global unexpected-error
  // modal via mapSuccessToError, so it never reaches the view — we only narrow to the node.
  const [data] = createResource(
    () => ({ storeId: params.storeId, stocktakeId: params.stocktakeId }),
    async (variables) => {
      const result = await graphqlFetch(StocktakeDetail, variables, {
        mapSuccessToError: (d) =>
          d.stocktake.__typename === 'NodeError' ? d.stocktake.error.description : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.stocktake.__typename === 'StocktakeNode' ? result.data.stocktake : undefined;
    },
  );

  // Lines live in a LOCAL signal (seeded from the fetch) so a line-edit save reflects in place
  // with no refetch: applyCommit splices the returned nodes straight in (kdd/state-management).
  const [rows, setRows] = createSignal<Line[]>([]);
  createEffect(on(data, (node) => setRows(node?.lines.nodes ?? [])));

  // Front-end sort (no pagination — the whole stocktake loads). A createMemo re-derives the
  // ordered rows when key/direction or the underlying rows change; the DataTable is display-only
  // about order (manualSorting) — it renders exactly these rows and reports header clicks via onSort.
  const sortedRows = createMemo<Line[]>(() => {
    const { key, desc } = sort();
    const dir = desc ? -1 : 1;
    return [...rows()].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  });

  // Header click: TanStack computed the next direction; just record it.
  const onSort = (key: SortKey, desc: boolean) => setSort({ key, desc });

  // Row click → edit that line's ITEM (all its batches). The modal reads editItemLines below.
  const openRow = (line: Line) =>
    setEditItem({ id: line.item.id, code: line.item.code, name: line.itemName });
  const editItemLines = createMemo<Line[]>(() => {
    const item = editItem();
    return item ? rows().filter((line) => line.item.id === item.id) : [];
  });

  // Reflect a save in place (no refetch): drop deleted ids, replace updated lines by id, append
  // inserted lines — all the SAME StocktakeLine fragment, so no remapping. sortedRows re-derives.
  const applyCommit = (commit: LineEditCommit) => {
    setRows((current) => {
      const deleted = new Set(commit.deletedIds);
      const updatedById = new Map(commit.updated.map((line) => [line.id, line]));
      const next = current
        .filter((line) => !deleted.has(line.id))
        .map((line) => updatedById.get(line.id) ?? line);
      return [...next, ...commit.inserted];
    });
  };

  // Crumbs are an accessor so t() re-translates on locale change; the middle crumb links back
  // to the list, the last crumb is the current page (rendered as the page <h1>).
  const crumbs = (node: StocktakeNode) => [
    { label: t('nav.inventory') },
    {
      label: t('nav.inventory.stocktakes'),
      onClick: () => navigate(`/${params.storeId}/inventory/stocktakes`),
    },
    { label: t('stocktake.detail.title', { number: node.stocktakeNumber }) },
  ];

  const columns = (): Column<Line, SortKey>[] => [
    {
      // Item code is nested (row.item.code) — no top-level key — so it's an accessor column.
      // This is the GROUP-BY column (see rowGroup): item codes are unique, so grouping by the
      // code groups by item identity, with no getGroupingValue mapping needed.
      c: { accessor: (line) => line.item.code, id: 'code' },
      sortKey: 'code',
      header: t('stocktake.column.item-code'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: t('stocktake.column.item-name'),
      meta: { card: { region: 'primary' } },
      // Grouped parent → the shared name (all a code's rows are the same item), so the group
      // shows both its code (the group key) and its name.
      aggregationFn: sharedOrMultiple,
    },
    {
      c: { key: 'batch' },
      sortKey: 'batch',
      header: t('stocktake.column.batch'),
      aggregationFn: sharedOrMultiple,
    },
    {
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: t('stocktake.column.expiry'),
      ...getDateCell(),
    },
    {
      c: { key: 'snapshotNumberOfPacks' },
      sortKey: 'snapshotNumberOfPacks',
      header: t('stocktake.column.snapshot'),
      ...getNumberCell(),
    },
    {
      c: { key: 'countedNumberOfPacks' },
      sortKey: 'countedNumberOfPacks',
      header: t('stocktake.column.counted'),
      ...getNumberCell(),
      meta: { align: 'right', card: { region: 'badge' } },
    },
  ];

  return (
    <Suspense>
      <Show when={data()} keyed>
        {(node) => (
          <Page
            fillBody
            header={
              <Header>
                <Breadcrumb crumbs={crumbs(node)} />
              </Header>
            }
            contentFooter={
              // Selection action bar — appears while lines are selected. When grouped, ticking a
              // group's checkbox selects all its batches (leaf lines). Actions on the selection
              // (delete, adjust, …) are deferred with the rest of editing; for now it shows the
              // count + Clear.
              <Show when={selectedIds().length > 0}>
                <ContentFooter>
                  <strong>{t('stocktake.selected', { count: selectedIds().length })}</strong>
                  <ContentFooterActions>
                    <Button
                      variant="secondary"
                      icon={<CloseIcon />}
                      onClick={() => setSelectedIds([])}
                    >
                      {t('common.clear')}
                    </Button>
                  </ContentFooterActions>
                </ContentFooter>
              </Show>
            }
          >
            <DataTable
              columns={columns()}
              rows={sortedRows()}
              rowKey={(line) => line.id}
              sort={sort()}
              onSort={onSort}
              // Row click edits that item's lines — unless the stocktake is finalised/locked.
              onRowClick={isDisabled(node) ? undefined : openRow}
              emptyMessage={t('stocktake.detail.empty')}
              // Row grouping: a toolbar toggle "group by item" (grouped by the code column — codes
              // are unique, so this groups by item identity). An item's batches collapse under one
              // expandable parent that aggregates their columns (snapshot/counted sum; name/batch
              // shared-or-[multiple]; expiry the date variant). The on/off state persists via
              // config.groupBy.
              rowGroup={{ columnId: 'code', labelKey: 'stocktake.column.item-name' }}
              enableSelection
              selectedIds={selectedIds()}
              onSelectionChange={setSelectedIds}
              config={tableConfig.config()}
              setConfig={tableConfig.setConfig}
            />
            <StocktakeLineEditModal
              open={editItem() != null}
              onClose={() => setEditItem(undefined)}
              storeId={params.storeId}
              stocktakeId={node.id}
              item={editItem()}
              lines={editItemLines()}
              onCommitted={applyCommit}
            />
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default StocktakeDetailView;
