import { createResource, Show, Suspense } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
} from '../../ui/elements/table/tableHelpers';
import {
  StocktakeDetail,
  type StocktakeDetailResult,
} from './stocktakeDetail.generated';

// The stocktake detail view — the page a stocktake create / a list row-click lands on. For
// now it's the page shell (breadcrumb back to the list + a title) plus a BASIC table of the
// stocktake's lines (our DataTable, display only). Ported from andrei-17-card-view, minus —
// deliberately, for later — grouping, the no-refetch batch-reflection of edits, the on-row
// line-edit modal, and per-user column config on this table.

type StocktakeNode = Extract<
  StocktakeDetailResult['stocktake'],
  { __typename: 'StocktakeNode' }
>;
type Line = StocktakeNode['lines']['nodes'][number];

// The basic table is display-only for now (front-end sort/grouping deferred), but Column<T,K>
// needs a real string K for the cell helpers' sortKey type to resolve — so K is the line
// fields, even though no `sort`/`onSort` is wired yet.
type SortKey =
  | 'item'
  | 'itemName'
  | 'batch'
  | 'expiryDate'
  | 'snapshotNumberOfPacks'
  | 'countedNumberOfPacks';

const StocktakeDetailView: Component = () => {
  const params = useParams<{ storeId: string; stocktakeId: string }>();
  const navigate = useNavigate();

  // Fetch the stocktake. A NodeError (e.g. bad id) is promoted to the global unexpected-error
  // modal via mapSuccessToError, so it never reaches the view — we only narrow to the node.
  const [data] = createResource(
    () => ({ storeId: params.storeId, stocktakeId: params.stocktakeId }),
    async variables => {
      const result = await graphqlFetch(StocktakeDetail, variables, {
        mapSuccessToError: d =>
          d.stocktake.__typename === 'NodeError'
            ? d.stocktake.error.description
            : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.stocktake.__typename === 'StocktakeNode'
        ? result.data.stocktake
        : undefined;
    }
  );

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
      accessorKey: 'item',
      header: t('stocktake.column.item-code'),
      cell: info => info.row.original.item.code,
    },
    { accessorKey: 'itemName', header: t('stocktake.column.item-name') },
    { accessorKey: 'batch', header: t('stocktake.column.batch') },
    {
      accessorKey: 'expiryDate',
      header: t('stocktake.column.expiry'),
      ...getDateCell(),
    },
    {
      accessorKey: 'snapshotNumberOfPacks',
      header: t('stocktake.column.snapshot'),
      ...getNumberCell(),
    },
    {
      accessorKey: 'countedNumberOfPacks',
      header: t('stocktake.column.counted'),
      ...getNumberCell(),
    },
  ];

  return (
    <Suspense>
      <Show when={data()} keyed>
        {node => (
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
              rows={node.lines.nodes}
              rowKey={line => line.id}
              emptyMessage={t('stocktake.detail.empty')}
            />
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default StocktakeDetailView;
