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
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { getCellDefinition } from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { PlusCircleIcon, TruckIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import {
  Requisitions,
  UpdateRequisitionColour,
  type RequisitionRowFragment,
  type RequisitionsVariables,
} from './requisitions.generated';
import {
  RequisitionListContext,
  CustomerProgramsGate,
} from './listContext.generated';
import { filterFields, type RequisitionFilter } from './listFilters';
import {
  approvalStatusLabel,
  isRowEditable,
  isRowRestricted,
  statusColour,
  statusLabel,
} from './requisitionStatus';
import {
  DeleteRequisitionsAction,
  ExportRequisitionsAction,
} from './actions';
import { CreateRequisitionModal } from './create/CreateRequisitionModal';
import { CreateOrderAction } from './create/CreateOrderAction';

// The requisitions list view (spec/requisitions S1). A requisition is a
// RESPONSE requisition — an incoming customer order this store fulfils;
// `type` is pinned to RESPONSE on every read. Mirrors the internal-orders
// reference list: URL-backed filter/sort/pagination, the shared DataTable, an
// inline customer colour-tag edit, and a selection footer with a bulk delete
// that is never pre-screened ([D23]). Data goes through the single
// never-throwing query method; the resource is keyed on the SERIALISED
// variables so an empty filter chip doesn't reflash the list
// (kdd/solid-reactivity-pitfalls). The page owns no CSS.

const DEFAULT_PAGE_SIZE = 20;

type Row = RequisitionRowFragment;

// Sortable columns are typed to the generated sort-field union, so a column
// can only ever name a real sort key (kdd/type-safety).
type SortKey = NonNullable<RequisitionsVariables['sort']>[number]['key'];

// URL-backed state. Filter and sort are exactly the generated GraphQL shapes
// (no remapping); pagination is offset + first, carried in the URL so it is
// shareable/restorable.
type ListState = {
  filter: RequisitionFilter;
  sort?: RequisitionsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: created date, newest first (OMS-REG-DIST-05.16). URL-backed,
// so a user's own header click overrides it (and is shareable/restorable).
const DEFAULT_STATE: ListState = {
  filter: {},
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const RequisitionsList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);

  // Column config (order/sizing/pinning/visibility), resolved default →
  // global → user and by breakpoint band (kdd/table-state). On compact
  // (narrow) the list defaults to CARD view and hides the program trio; on
  // base (wide) everything shows. Bands don't share.
  const tableConfig = createTableConfig({
    tableId: 'requisitions',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: {
          programName: false,
          orderType: false,
          period: false,
        },
      },
    },
  });

  // GraphQL variables, derived straight from URL state + the store in the
  // path. `type` is pinned to RESPONSE here (contract › "Requisitions only")
  // — a constant, never part of the URL-backed filter state. stripEmpty drops
  // added-but-empty filter chips so adding an empty chip does not reflash the
  // list.
  const variables = (): RequisitionsVariables => ({
    storeId: params.storeId,
    filter: { ...stripEmpty(query().filter), type: { equalTo: 'RESPONSE' } },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  });

  // Global resource-style fetch (kdd/state-management): the fetcher passes
  // codegen output through the single never-throwing query method. The
  // resource SOURCE is the SERIALISED variables (a stable string), so
  // identical query content never refetches. Reading `.latest` (below) never
  // suspends, so interaction never remounts the table
  // (kdd/solid-reactivity-pitfalls).
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Requisitions,
        JSON.parse(serialised) as RequisitionsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.requisitions;
    }
  );

  const rows = (): Row[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // The store-context gates for the conditional surfaces
  // (OMS-REG-DIST-05.22–.24), fetched once per store, read non-suspending.
  // Safe default OFF while unresolved — a gated column never flashes in
  // before its gate is known. The program-columns gate is the two-step the
  // contract names: the store's customer ids feed
  // hasCustomerProgramRequisitionSettings ([D16]).
  const [context] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(RequisitionListContext, { storeId });
      if (result.kind !== 'success') return undefined;
      const customerNameIds = result.data.names.nodes.map(n => n.id);
      const gate = customerNameIds.length
        ? await graphqlFetch(CustomerProgramsGate, { storeId, customerNameIds })
        : undefined;
      return {
        storePreferences: result.data.storePreferences,
        preferences: result.data.preferences,
        hasCustomerPrograms:
          gate?.kind === 'success'
            ? gate.data.hasCustomerProgramRequisitionSettings
            : false,
      };
    }
  );
  const requiresAuthorisation = () =>
    context.latest?.storePreferences.responseRequisitionRequiresAuthorisation ??
    false;
  const programsModule = () =>
    context.latest?.storePreferences.omProgramModule ?? false;
  const hasPrograms = () => context.latest?.hasCustomerPrograms ?? false;
  const canCreateOrder = () =>
    context.latest?.preferences.canCreateInternalOrderFromARequisition ??
    false;

  // New requisition (spec S1 page actions / OMS-FUN-DIS-03): opens the create
  // modal (S3a). The button waits for the context read — the modal's
  // Program-tab gate (programCapable) must be known before it can open.
  const startCreate = () => setCreateOpen(true);

  const onCreated = (id: string) => {
    setCreateOpen(false);
    navigate(`/${params.storeId}/distribution/customer-requisition/${id}`);
  };

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: RequisitionFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: Row) =>
    navigate(
      `/${params.storeId}/distribution/customer-requisition/${row.id}`
    );

  // Inline customer colour-tag edit (spec S1 col 1 / OMS-REG-DIST-05.27):
  // write the colour through the shared header update and refetch on success.
  // Offered only on editable rows (New, not approval-blocked, customer-store
  // enabled); read-only rows show a dot.
  const setColour = async (row: Row, colour: string) => {
    const result = await graphqlFetch(UpdateRequisitionColour, {
      storeId: params.storeId,
      input: { id: row.id, colour },
    });
    if (
      result.kind === 'success' &&
      result.data.updateResponseRequisition.__typename === 'RequisitionNode'
    )
      void refetch();
  };

  // Columns and crumbs are accessors (not plain arrays): their text comes
  // from t(), which must be read in a reactive scope to re-translate on a
  // language switch. The gated columns (program trio, approval) are added
  // reactively as their store-context gate resolves.
  const columns = (): Column<Row, SortKey>[] => [
    {
      // Name — customer name, carrying the row's colour-tag affordance: the
      // swatch picker on an editable row, a read-only dot otherwise
      // (OMS-REG-DIST-05.21/.27).
      c: { accessor: row => row.otherPartyName, id: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: () => t('label.name'),
      // The text "sink" column: width floor + no growth cap, so it absorbs
      // the slack the narrow columns leave behind.
      ...getCellDefinition('otherPartyName', { headerPosition: 'primary' }),
      cell: info => {
        const row = info.row.original;
        return (
          <span
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Show
              when={isRowEditable(row)}
              fallback={<ColourTagDot colour={row.colour ?? null} />}
            >
              <ColourTagPicker
                colour={row.colour ?? null}
                onSelect={colour => void setColour(row, colour)}
              />
            </Show>
            <span>{row.otherPartyName}</span>
          </span>
        );
      },
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
      header: () => t('label.number'),
      ...getCellDefinition('requisitionNumber'),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      // Shipments — the count of shipments raised against the requisition
      // (spec S1 col 5). Not sortable; the header carries its tooltip.
      c: { accessor: row => row.shipments.totalCount, id: 'shipments' },
      header: () => (
        <span title={t('description.number-of-shipments')}>
          {t('label.shipments')}
        </span>
      ),
      ...getCellDefinition('shipments'),
    },
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCellDefinition('comment'),
    },
    // Program / Order type / Period — only when the store has customer
    // programs configured (OMS-REG-DIST-05.22, [D16]); empty for a
    // non-program requisition.
    ...(hasPrograms()
      ? ([
          {
            c: { key: 'programName' },
            sortKey: 'programName',
            header: () => (
              <span title={t('description.program')}>{t('label.program')}</span>
            ),
            cell: info => info.getValue<Row['programName']>() ?? '',
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
    // Approval status — only when the store requires authorisation of
    // customer requisitions (OMS-REG-DIST-05.23); the row's OWN approval
    // state, None fallback. Not sortable.
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

  // App bar breadcrumbs (spec S1 layout): the Distribution truck icon — the
  // nav group's glyph in the breadcrumb's leading-icon slot — then
  // Requisitions; the group is the icon, not a text crumb.
  const crumbs = () => [{ label: t('customer-requisition') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb icon={<TruckIcon />} crumbs={crumbs()} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              data-testid="new-requisition-button"
              // Disabled until the store context resolves: the modal's
              // Program-tab gate must be decided before it can open.
              disabled={context.loading}
              onClick={startCreate}
            >
              {t('button.new-requisition')}
            </Button>
            {/* Create order — raise an internal order from a requisition;
                only under its store preference (OMS-FUN-DIS-03.16). */}
            <Show when={canCreateOrder()}>
              <CreateOrderAction
                storeId={params.storeId}
                onCreated={id =>
                  navigate(
                    `/${params.storeId}/replenishment/internal-order/${id}`
                  )
                }
              />
            </Show>
            <ExportRequisitionsAction
              storeId={params.storeId}
              filter={() => query().filter}
              includeProgram={hasPrograms}
            />
          </HeaderButtons>
        </Header>
      }
    >
      <CreateRequisitionModal
        storeId={params.storeId}
        open={createOpen()}
        programCapable={hasPrograms()}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering); state stays URL-backed here. The emergency filter rides
        // the programs-module store preference (OMS-REG-DIST-05.24 —
        // confirmed against the running reference app), independent of the
        // program columns' configured-programs gate.
        filters={
          <FilterBar
            filters={filterFields(programsModule())}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        // `data.loading` (non-suspending) drives the table's loading
        // treatment: a centred spinner on first load, a thin bar on refetches
        // (rows kept), so a slow fetch never flashes the empty state.
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // Restricted rows (OMS-REG-DIST-05.21): Finalised and
        // approval-blocked rows render visually read-only.
        rowState={row => (isRowRestricted(row) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-requisitions')}
        // Empty state offers create (OMS-REG-DIST-05.26).
        empty={
          <Button
            variant="ghost"
            data-testid="nothing-here-create-button"
            disabled={context.loading}
            onClick={startCreate}
          >
            {t('button.new-requisition')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // Bulk actions for the selection footer (the table adds the count +
        // Clear). Delete only (spec S1); the selection is never pre-screened
        // — the server's typed rejections surface in the dialog ([D23]).
        selectionActions={
          <DeleteRequisitionsAction
            storeId={params.storeId}
            selectedIds={selectedIds}
            onDeleted={onDeleted}
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
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
    </Page>
  );
};

export default RequisitionsList;
