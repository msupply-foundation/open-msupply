import { createMemo, createResource, createSignal, Show, Suspense } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { DataTable, type Column, type SortState } from '../../ui/elements/table/DataTable';
import { getDateCell, getNumberCell } from '../../ui/elements/table/tableHelpers';
import { StocktakeDetail, type StocktakeDetailResult } from './stocktakeDetail.generated';
import { StocktakeLineCardModal } from './StocktakeLineCardModal';

// The stocktake detail view — the page a stocktake create / a list row-click lands on. The page
// shell (breadcrumb back to the list + a title) plus a BASIC, front-end-sorted table of the
// stocktake's lines (our DataTable). Clicking a row opens a READ-ONLY card-display modal for
// that item's lines, demonstrating the DataTable's grouped card view.
//
// Deliberately basic — line EDITING (the batchStocktake mutation, the on-row edit modal with a
// draft store + editable cells, the no-refetch splice-back) is deferred to a later branch; here
// everything is display-only.

type StocktakeNode = Extract<StocktakeDetailResult['stocktake'], { __typename: 'StocktakeNode' }>;
type Line = StocktakeNode['lines']['nodes'][number];

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
  // The item whose lines the card modal shows (null = closed). We snapshot the item id on click
  // and derive its lines below, so a re-sort behind the open modal doesn't change its contents.
  const [openItemId, setOpenItemId] = createSignal<string | null>(null);

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

  const lines = (): Line[] => data()?.lines.nodes ?? [];

  // Front-end sort (no pagination — the whole stocktake loads). A createMemo re-derives the
  // ordered rows when key/direction change; the DataTable is display-only about order
  // (manualSorting) — it renders exactly these rows and reports header clicks via onSort.
  const sortedRows = createMemo<Line[]>(() => {
    const { key, desc } = sort();
    const dir = desc ? -1 : 1;
    return [...lines()].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  });

  // Header click: TanStack computed the next direction; just record it.
  const onSort = (key: SortKey, desc: boolean) => setSort({ key, desc });

  // Row click → open the card modal for that line's ITEM (all its batches).
  const openItem = (line: Line) => setOpenItemId(line.item.id);
  const openLines = (): Line[] => {
    const id = openItemId();
    return id ? lines().filter((line) => line.item.id === id) : [];
  };
  const openItemName = (): string | undefined =>
    openLines()[0]?.itemName ?? undefined;

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
      c: { accessor: (line) => line.item.code, id: 'code' },
      sortKey: 'code',
      header: t('stocktake.column.item-code'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: t('stocktake.column.item-name'),
      meta: { card: { region: 'primary' } },
    },
    { c: { key: 'batch' }, sortKey: 'batch', header: t('stocktake.column.batch') },
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
          >
            <DataTable
              columns={columns()}
              rows={sortedRows()}
              rowKey={(line) => line.id}
              sort={sort()}
              onSort={onSort}
              onRowClick={openItem}
              emptyMessage={t('stocktake.detail.empty')}
            />
            <StocktakeLineCardModal
              open={openItemId() != null}
              onClose={() => setOpenItemId(null)}
              itemName={openItemName()}
              lines={openLines()}
            />
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default StocktakeDetailView;
