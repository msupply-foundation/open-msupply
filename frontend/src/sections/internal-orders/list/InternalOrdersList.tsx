import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Button } from '../../../ui/elements/buttons/Button';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_N } from '../../../ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '../../../typeHelpers';
import {
  InternalOrders,
  UpdateInternalOrderColour,
  type InternalOrderRowFragment,
  type InternalOrdersVariables,
} from './internalOrders.generated';
import { InternalOrderListContext } from './listContext.generated';
import { filterFields, type InternalOrderFilter } from './listFilters';
import {
  approvalStatusLabel,
  isRowEditable,
  statusColour,
  statusLabel,
} from './internalOrderStatus';
import {
  DeleteInternalOrdersAction,
  ExportInternalOrdersAction,
} from './actions';
import { CreateInternalOrderModal } from './create/CreateInternalOrderModal';
import { StocktakeWarningDialog } from './create/StocktakeWarningDialog';
import { recentStocktakeIsInsufficient } from './create/createInternalOrder';

// The internal-orders list view (spec/internal-orders S1). An internal order is
// a REQUEST requisition; `type` is pinned to REQUEST on every read. Mirrors the
// stocktakes / inbound-shipments reference lists: URL-backed
// filter/sort/pagination, the shared DataTable, an inline supplier colour-tag
// edit, and a selection footer with a Draft-only bulk delete. Data goes through
// the single never-throwing query method; the resource is keyed on the
// SERIALISED variables so an empty filter chip doesn't reflash the list
// (kdd/solid-reactivity-pitfalls). The page owns no CSS.

type Row = InternalOrderRowFragment;

// Sortable columns are typed to the generated sort-field union, so a column can
// only ever name a real sort key (kdd/type-safety).
type SortKey = NonNullable<InternalOrdersVariables['sort']>[number]['key'];

// URL-backed state. Filter and sort are exactly the generated GraphQL shapes
// (no remapping); pagination is offset + first, carried in the URL so it is
// shareable/restorable.
type ListState = {
  filter: InternalOrderFilter;
  sort?: InternalOrdersVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: created date, newest first (AC-L3). URL-backed, so a user's own
// header click overrides it (and is shareable/restorable).
const DEFAULT_STATE: ListState = {
  filter: {},
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const InternalOrdersList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Create-flow state: the modal, the recent-stocktake warning gate, and the
  // in-flight stocktake check that decides between them (spec S2 / AC-C5).
  const [createOpen, setCreateOpen] = createSignal(false);
  const [gateOpen, setGateOpen] = createSignal(false);
  const [checking, setChecking] = createSignal(false);

  // Column config (order/sizing/pinning/visibility), resolved default → global
  // → user and by breakpoint band (kdd/table-state). On compact (narrow) the
  // list defaults to CARD view, hides the program trio (spec S1 "hidden by
  // default (narrow)"), and shows the tablet-only Number-of-rows column; on
  // base (wide) that column is hidden. Bands don't share.
  const tableConfig = createTableConfig({
    tableId: 'internal-orders',
    defaultConfig: {
      base: {
        columnVisibility: {
          countRows: false,
        },
      },
      compact: {
        viewMode: 'card',
        columnVisibility: {
          program: false,
          orderType: false,
          period: false,
        },
      },
    },
  });

  // GraphQL variables, derived straight from URL state + the store in the path.
  // `type` is pinned to REQUEST here (contract › "Internal orders only") — a
  // constant, never part of the URL-backed filter state. stripEmpty drops
  // added-but-empty filter chips so adding an empty chip does not reflash the
  // list.
  const variables = (): InternalOrdersVariables => ({
    storeId: params.storeId,
    filter: { ...stripEmpty(query().filter), type: { equalTo: 'REQUEST' } },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  });

  // Global resource-style fetch (kdd/state-management): the fetcher passes
  // codegen output through the single never-throwing query method. The resource
  // SOURCE is the SERIALISED variables (a stable string), so identical query
  // content never refetches. Reading `.latest` (below) never suspends, so
  // interaction never remounts the table (kdd/solid-reactivity-pitfalls).
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        InternalOrders,
        JSON.parse(serialised) as InternalOrdersVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.requisitions;
    }
  );

  const rows = (): Row[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // A bulk delete of the last page's rows leaves the offset past the new end
  // (src/list/clampPageOffset.ts, issue #1117).
  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  // The store-context gates for the conditional columns (AC-L8/L9), fetched
  // once per store, read non-suspending. Safe default OFF while unresolved — a
  // gated column never flashes in before its gate is known.
  const [context] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(InternalOrderListContext, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data;
    }
  );
  const requiresAuthorisation = () =>
    context.latest?.storePreferences.requestRequisitionRequiresAuthorisation ??
    false;
  const hasPrograms = () =>
    (context.latest?.supplierProgramRequisitionSettings.length ?? 0) > 0;
  const warnStocktake = () =>
    context.latest?.preferences.warnWhenMissingRecentStocktake;

  // New order (AC-C1/AC-C5): where the store warns on missing recent
  // stocktakes, evaluate them first — a shortfall diverts through the warning
  // gate; otherwise (and when the preference is off) the create modal opens
  // directly. The New-order button is disabled until the context read resolves,
  // so the gate is always decided before the modal can open.
  const startCreate = async () => {
    const warn = warnStocktake();
    if (!warn?.enabled) {
      setCreateOpen(true);
      return;
    }
    setChecking(true);
    const insufficient = await recentStocktakeIsInsufficient(
      params.storeId,
      warn.maxAge,
      warn.minItems
    );
    setChecking(false);
    if (insufficient) setGateOpen(true);
    else setCreateOpen(true);
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the two controls that trigger it (the header button
  // and the ghost button in the table's empty slot); each carries
  // `shortcut={ALT_N}` for its badge, neither owns the action.
  //
  // Same inertness as both controls: the store context has to resolve before
  // the stocktake-warning gate can be decided, and a check already in flight
  // must not be started twice (AC-KB26's "once activated, the control MUST stop
  // accepting a second activation", which for a key means declining it).
  createAddAction({
    name: 'label.new-internal-order',
    run: () => void startCreate(),
    disabled: () => context.loading || checking(),
  });

  const onCreated = (id: string) => {
    setCreateOpen(false);
    navigate(`/${params.storeId}/replenishment/internal-order/${id}`);
  };

  // Bulk delete is offered only while EVERY selected row is Draft (and its
  // supplier's store enabled) — a deliberate UI narrowing of the server's guard
  // (AC-D3). The button is otherwise disabled with a reason tooltip.
  const selectedRows = () => rows().filter(r => selectedIds().includes(r.id));
  const allSelectedDeletable = () =>
    selectedRows().length > 0 && selectedRows().every(isRowEditable);

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: InternalOrderFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: Row) =>
    navigate(`/${params.storeId}/replenishment/internal-order/${row.id}`);

  // Inline supplier colour-tag edit (spec S1 col 1 / AC-T1): write the colour
  // through the shared header update and refetch on success. Offered only on
  // editable rows (Draft, supplier-store enabled); read-only rows show a dot.
  const setColour = async (row: Row, colour: string) => {
    const result = await graphqlFetch(UpdateInternalOrderColour, {
      storeId: params.storeId,
      input: { id: row.id, colour },
    });
    if (
      result.kind === 'success' &&
      result.data.updateRequestRequisition.__typename === 'RequisitionNode'
    )
      void refetch();
  };

  // Columns and crumbs are accessors (not plain arrays): their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch. The gated columns (program trio, approval) are added reactively as
  // their store-context gate resolves.
  const columns = (): Column<Row, SortKey>[] => [
    {
      // Name — supplier name, carrying the row's colour-tag affordance: the
      // swatch picker on an editable row, a read-only dot otherwise (AC-T1).
      c: { accessor: row => row.otherPartyName, id: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: () => t('label.name'),
      // The text "sink" column: width floor + no growth cap, so it absorbs
      // the slack the narrow columns leave behind.
      ...getCellDefinition('otherPartyName', { headerPosition: 'primary' }),
      cell: info => {
        const row = info.row.original;
        return (
          <HStack gap="sm">
            <Show
              when={isRowEditable(row)}
              fallback={<ColourTagDot colour={row.colour ?? null} />}
            >
              <ColourTagPicker
                colour={row.colour ?? null}
                variant="row"
                onSelect={colour => void setColour(row, colour)}
              />
            </Show>
            <span>{row.otherPartyName}</span>
          </HStack>
        );
      },
    },
    {
      c: { accessor: row => row.theirReference ?? '', id: 'theirReference' },
      sortKey: 'theirReference',
      header: () => t('label.reference'),
      ...getCellDefinition('theirReference'),
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      cell: info => {
        const status = info.getValue<Row['status']>();
        return (
          <StatusChip
            label={statusLabel(status)}
            colour={statusColour(status)}
          />
        );
      },
      // Card view: the status chip is the top-right badge.
      meta: { headerPosition: 'badge' },
      // Status has no cell-type preset (CELL_TYPES § Status is page-rendered),
      // so the width lives here — the same pair the invoice lists use, so the
      // lists' Status columns line up.
      size: remToPx(7.5),
      maxSize: remToPx(9.375),
    },
    {
      c: { key: 'requisitionNumber' },
      sortKey: 'requisitionNumber',
      // Language-neutral '#' for the number column.
      header: () => '#',
      ...getCellDefinition('requisitionNumber'),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      // Number of rows — the order's line count (condensed-tablet only, hidden
      // on base by the table config). Not sortable.
      c: { accessor: row => row.lines.totalCount, id: 'countRows' },
      header: () => t('label.count-rows'),
      ...getCellDefinition('countRows'),
    },
    // Program / Order type / Period — only when the store has supplier programs
    // (AC-L8); empty for a non-program order.
    ...(hasPrograms()
      ? ([
          {
            c: { accessor: row => row.program?.name ?? '', id: 'program' },
            sortKey: 'programName',
            header: () => t('label.program'),
          },
          {
            c: { accessor: row => row.orderType ?? '', id: 'orderType' },
            sortKey: 'orderType',
            header: () => t('label.order-type'),
          },
          {
            c: { accessor: row => row.period?.name ?? '', id: 'period' },
            sortKey: 'periodStartDate',
            header: () => t('label.period'),
          },
        ] satisfies Column<Row, SortKey>[])
      : []),
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
    // Approval status — only when the store requires supplier authorisation
    // (AC-L9); read from the linked response requisition's copy, None fallback.
    // Not sortable.
    ...(requiresAuthorisation()
      ? ([
          {
            c: {
              accessor: row => approvalStatusLabel(row.approvalStatus),
              id: 'approvalStatus',
            },
            header: () => t('label.auth-status'),
          },
        ] satisfies Column<Row, SortKey>[])
      : []),
  ];

  const crumbs = () => [{ label: t('internal-order') }];

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
              data-testid="new-internal-order-button"
              // Disabled until the store context (and so the stocktake-warning
              // gate) is known; busy while the on-click stocktake check runs.
              disabled={context.loading || checking()}
              loading={checking()}
              onClick={() => void startCreate()}
            >
              {t('label.new-internal-order')}
            </Button>
            <ExportInternalOrdersAction
              storeId={params.storeId}
              filter={() => query().filter}
              includeProgram={hasPrograms}
            />
          </HeaderButtons>
        </Header>
      }
    >
      <StocktakeWarningDialog
        open={gateOpen()}
        minItems={warnStocktake()?.minItems ?? 0}
        maxAge={warnStocktake()?.maxAge ?? 0}
        onCancel={() => setGateOpen(false)}
        onContinue={() => {
          setGateOpen(false);
          setCreateOpen(true);
        }}
        onGoToStocktakes={() => {
          setGateOpen(false);
          navigate(`/${params.storeId}/inventory/stocktakes`);
        }}
      />
      <CreateInternalOrderModal
        storeId={params.storeId}
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering); state stays URL-backed here.
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        // `data.loading` (non-suspending) drives the table's loading treatment:
        // a centred spinner on first load, a thin bar on refetches (rows kept),
        // so a slow fetch never flashes the empty state.
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // Restricted rows (Sent/Finalised, or a disabled supplier store) read
        // as read-only via the disabled background tint (AC-L7) — the same
        // rowState the other list views key off their editability gate.
        rowState={row => (isRowEditable(row) ? undefined : 'disabled')}
        emptyMessage={t('error.no-internal-orders')}
        // Empty state offers create (AC-N2).
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            disabled={context.loading || checking()}
            onClick={() => void startCreate()}
          >
            {t('button.create-a-new-one')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // Bulk actions for the selection footer (the table adds the count +
        // Clear). Delete stays clickable; when the selection includes a
        // non-Draft (or disabled-supplier-store) order, the click explains why
        // it can't proceed instead of submitting — never a dead click (AC-D3,
        // ui-standards controls.md § "active-and-explaining").
        selectionActions={
          <DeleteInternalOrdersAction
            storeId={params.storeId}
            selectedIds={selectedIds}
            onDeleted={onDeleted}
            canDelete={allSelectedDeletable}
          />
        }
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
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

export default InternalOrdersList;
