import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '@/ui/elements/buttons/Button';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
  getDateCell,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { CloseIcon, PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { stripEmpty } from '@/typeHelpers';
import { hasPermission } from '@/store/storeContext';
import { reportPermissionDenied } from '@/api/graphql';
import { InsertStockMovement } from './insertStockMovement.generated';
import { StockMovements } from './stockMovements.generated';
import type {
  StockMovementsVariables,
  StockMovementsResult,
} from './stockMovements.generated';
import { filterFields, type StockMovementFilter } from './listFilters';
import { statusLabel } from '../detail/stockMovementStatus';
import { DeleteStockMovementsAction } from './actions';

// The stock-movements list view (spec/stock-movements/ui-surface.md S1) —
// the standard list screen: URL-backed filter/sort/pagination, the shared
// DataTable, and an IMMEDIATE create (no dialog — one action inserts an empty
// movement and navigates straight to its detail).

type MovementRow = StockMovementsResult['stockRelocations']['nodes'][number];

// Sortable columns are typed to the generated sort-field union
// (kdd/type-safety).
type SortKey = NonNullable<StockMovementsVariables['sort']>[number]['key'];

type StockMovementsListState = {
  filter: StockMovementFilter;
  sort?: StockMovementsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: created, newest first (ui-surface S1 § columns). The STATUS
// filter is the DEFAULT chip (ui-surface S1 § filters; D96 — reviewing a
// store's movements starts from "what still needs attention", where the
// number filter's exact match only helps someone who knows the number) —
// seeded present-but-empty (null), FilterBar's "added but empty" marker, so
// the chip shows without constraining the query (stripEmpty drops it from the
// wire).
const DEFAULT_STATE: StockMovementsListState = {
  filter: { status: null },
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Status → chip colour token. NEW/FINALISED take their own tokens; CONFIRMED
// — an intermediate "actioned, not yet executed" stage — takes the allocated
// token, the palette's intermediate-progress tone (no dedicated confirmed
// token exists; tokens are the theme's business, not this screen's).
const STATUS_COLOURS: Record<string, string> = {
  NEW: 'var(--status-new)',
  CONFIRMED: 'var(--status-allocated)',
  FINALISED: 'var(--status-finalised)',
};

const statusMeta = (status: MovementRow['status']) => ({
  label: statusLabel(status),
  colour: STATUS_COLOURS[status] ?? 'var(--status-new)',
});

const StockMovementsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<StockMovementsListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [creating, setCreating] = createSignal(false);

  // Create is IMMEDIATE (ui-surface S1 § creation): no dialog — insert an
  // empty movement (client-supplied id) and open its detail. The button
  // disables while in flight; a failure surfaces through graphqlFetch's
  // global error path (a duplicate client uuid is not a real-world case) and
  // simply re-enables the button. Mutating requires the stock-edit
  // permission (rules § permissions).
  const create = async () => {
    if (creating()) return;
    if (!hasPermission('STOCK_LINE_MUTATE')) {
      reportPermissionDenied(['StockLineMutate']);
      return;
    }
    setCreating(true);
    const id = generateUUID();
    const result = await graphqlFetch(InsertStockMovement, {
      storeId: params.storeId,
      input: { id },
    });
    setCreating(false);
    if (result.kind !== 'success') return;
    navigate(`/${params.storeId}/inventory/stock-movement/${id}`);
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2): declared once by
  // the screen; the header button and the empty-state ghost both trigger it.
  createAddAction({
    name: 'label.new-stock-movement',
    run: () => void create(),
  });

  const tableConfig = createTableConfig({
    tableId: 'stock-movements',
    defaultConfig: {
      compact: {
        // Narrow viewports default to card view (ui-standards § tables); the
        // number leads as the card title so nothing is hidden by default.
        viewMode: 'card',
      },
    },
  });

  const variables = createMemo<StockMovementsVariables>(() => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Resource keyed on the SERIALISED variables; read via `.latest` only —
  // never a suspending read on this screen (kdd/solid-reactivity-pitfalls).
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        StockMovements,
        JSON.parse(serialised) as StockMovementsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.stockRelocations;
    }
  );

  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // ⚠️ Always exactly ONE sort input: the resolver honours only the LAST
  // element of the sort list (contract § list rules wire trap).
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (filter: StockMovementFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: MovementRow) =>
    navigate(`/${params.storeId}/inventory/stock-movement/${row.id}`);

  // Columns per ui-surface S1 § columns, in display order. Accessors so t()
  // re-reads on a language switch.
  const columns = (): Column<MovementRow, SortKey>[] => [
    {
      c: { key: 'stockMovementNumber' },
      sortKey: 'stockMovementNumber',
      header: () => t('label.number'),
      ...getCellDefinition('stockMovementNumber', {
        headerPosition: 'primary',
      }),
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      cell: info => <StatusChip {...statusMeta(info.row.original.status)} />,
      meta: { headerPosition: 'badge' },
    },
    {
      c: { key: 'lineCount' },
      header: () => t('label.lines'),
      ...getNumberCell(),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getDateCell(),
    },
    {
      c: { accessor: row => row.user?.username ?? '', id: 'createdBy' },
      header: () => t('label.created-by'),
    },
    {
      c: { key: 'finalisedDatetime' },
      sortKey: 'finalisedDatetime',
      header: () => t('label.finalised'),
      ...getDateCell(),
    },
  ];

  const crumbs = () => [{ label: t('stock-movement') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              shortcut={ALT_N}
              data-testid="new-stock-movement-button"
              loading={creating()}
              onClick={() => void create()}
            >
              {t('label.new-stock-movement')}
            </Button>
          </HeaderButtons>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeleteStockMovementsAction
              storeId={params.storeId}
              selectedIds={selectedIds}
              onDeleted={onDeleted}
            />
            <ContentFooterActions>
              <Button
                variant="secondary"
                icon={<CloseIcon />}
                onClick={() => setSelectedIds([])}
              >
                {t('label.clear-selection')}
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        emptyMessage={t('messages.no-stock-movements')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            onClick={() => void create()}
          >
            {t('label.new-stock-movement')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
    </Page>
  );
};

export default StockMovementsList;
