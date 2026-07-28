import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t, tPlural } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  getCommentCell,
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { CloseIcon, PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import {
  OutboundShipments,
  type OutboundShipmentsVariables,
  type OutboundShipmentsResult,
} from './outboundShipments.generated';
import { UpdateOutboundShipment } from '../detail/outboundDetail.generated';
import { filterFields, type OutboundFilter } from './listFilters';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import { isEditable, statusColour, statusLabel } from '../outboundStatus';
import { CustomerSearchModal } from './CustomerSearchModal';
import {
  DeleteShipmentsAction,
  DuplicateShipmentAction,
  ExportShipmentsAction,
} from './actions';

// The outbound-shipments list view (spec/outbound-shipments S1 +
// ui-standards/list-views): the standard list screen — filters (customer /
// status / number / reference / created / shipped), bulk delete + make-a-copy,
// CSV export, read-only rows de-emphasised. Composition mirrors the reference
// list (StocktakesList): URL-backed state, serialised resource source, library
// components only, no CSS.

const DEFAULT_PAGE_SIZE = 20;

type ShipmentRow = OutboundShipmentsResult['invoices']['nodes'][number];

type SortKey = NonNullable<OutboundShipmentsVariables['sort']>[number]['key'];

type OutboundListState = {
  filter: OutboundFilter;
  /** Typed per-custom-field filter values → the dynamicFilter AST at query time. */
  cf?: CustomFieldFilterState;
  sort?: OutboundShipmentsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: Number, descending (spec S1 § columns).
const DEFAULT_STATE: OutboundListState = {
  filter: {},
  sort: [{ key: 'invoiceNumber', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const OutboundShipmentsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } =
    useUrlQueryState<OutboundListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);

  // Column config per breakpoint (kdd/table-state). Narrow viewports default
  // to card view and hide the columns the spec marks hidden-by-default
  // (Name keeps showing — it's the card's primary text).
  const tableConfig = createTableConfig({
    tableId: 'outbound-shipments',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: {
          theirReference: false,
          totalAfterTax: false,
        },
      },
    },
  });

  // Custom-field definitions for the outbound_shipment scope — shared scope-keyed
  // cache, read non-suspending. Empty ⇒ no custom-field columns/filters.
  const cfReader = customFieldDefinitions('outbound_shipment');
  const cfDefs = () => cfReader.noSuspense();
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));
  const onCustomFieldChange = (cf: CustomFieldFilterState) => {
    setQuery({ ...query(), cf, offset: 0 });
    setSelectedIds([]);
  };

  // GraphQL variables from URL state; the type filter is PINNED here — it is
  // not part of the user-facing filter state (contract.md § the list).
  const variables = createMemo<OutboundShipmentsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      type: { equalTo: 'OUTBOUND_SHIPMENT' },
      // Custom-field filters become the dynamicFilter AST (undefined = no-op).
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf),
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Serialised resource source (kdd/solid-reactivity-pitfalls): equal query
  // content → no refetch; reads via `.latest` never suspend the section.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const vars = JSON.parse(serialised) as OutboundShipmentsVariables;
      const result = await graphqlFetch(OutboundShipments, vars);
      if (result.kind !== 'success') return undefined;
      // The offset rides with the data so a PAGE JUMP can blank the stale
      // page below.
      return { offset: vars.page?.offset ?? 0, invoices: result.data.invoices };
    }
  );

  // Keep the previous rows through filter/sort refetches (no flash —
  // kdd/state-management), but BLANK them on a page jump: a pager click must
  // never show the old page's rows as if they were the new page's (the shared
  // suites read the first row right after the click), and the DataTable's
  // spinner takes over until the page lands.
  const rows = () => {
    const latest = data.latest;
    if (!latest) return [];
    return latest.offset === query().offset ? latest.invoices.nodes : [];
  };
  const totalCount = () => data.latest?.invoices.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Single-key server sort (AC-L2 — the resolver honours only the last key, so
  // exactly one is ever sent).
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (filter: OutboundFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: ShipmentRow) =>
    navigate(`/${params.storeId}/distribution/outbound-shipment/${row.id}`);

  // The row's colour swatch, editable in place while the shipment is editable
  // (spec S1 column 1 — same gate as all edits). Saved via
  // updateOutboundShipment; the list refetches so the row reflects it.
  const setRowColour = async (row: ShipmentRow, colour: string) => {
    const result = await graphqlFetch(UpdateOutboundShipment, {
      storeId: params.storeId,
      input: { id: row.id, colour },
    });
    if (result.kind === 'success') void refetch();
  };

  const selectedRows = () =>
    rows()
      .filter(row => selectedIds().includes(row.id))
      .map(row => ({ id: row.id, status: row.status }));

  const columns = (): Column<ShipmentRow, SortKey>[] => [
    {
      // Customer name + the shipment's colour swatch (editable in place while
      // editable; a read-only dot otherwise).
      c: { key: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: () => t('label.name'),
      meta: { headerPosition: 'primary', wrapLines: 2 },
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
              when={isEditable(row.status)}
              fallback={<ColourTagDot colour={row.colour ?? null} />}
            >
              <ColourTagPicker
                colour={row.colour ?? null}
                variant="row"
                onSelect={colour => void setRowColour(row, colour)}
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
        const status = info.getValue<ShipmentRow['status']>();
        return (
          <StatusChip
            label={statusLabel(status)}
            colour={statusColour(status)}
          />
        );
      },
      meta: { headerPosition: 'badge' },
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: () => t('label.number'),
      ...getNumberCell(),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getDateCell(),
    },
    {
      // Reference is not sortable (ui-surface S1 columns table).
      c: { key: 'theirReference' },
      header: () => t('label.reference'),
    },
    {
      // Comment is the shared comment cell (bubble + hover popover, as the
      // inbound list renders it) — not sortable (ui-surface S1).
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCommentCell(),
    },
    {
      // Shipment total after tax (nested under pricing) — an accessor column.
      c: {
        accessor: row => row.pricing.totalAfterTax,
        id: 'totalAfterTax',
      },
      header: () => t('label.total'),
      ...getCurrencyCell(),
    },
    // Configured custom-field columns — not sortable; value chosen by kind.
    ...customFieldColumns<ShipmentRow, SortKey>(
      cfDefs(),
      row => row.customFields
    ),
  ];

  const crumbs = () => [
    { label: t('distribution') },
    { label: t('outbound-shipments') },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              data-testid="new-shipment-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('button.new-shipment')}
            </Button>
            <ExportShipmentsAction
              storeId={params.storeId}
              filter={() => variables().filter}
            />
          </HeaderButtons>
          <Toolbar>
            <FilterBar
              filters={filterFields()}
              filter={query().filter}
              onChange={onFilterChange}
              extra={{
                filters: cfFilters(),
                filter: query().cf ?? {},
                onChange: onCustomFieldChange,
              }}
            />
          </Toolbar>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {tPlural('label.items-selected', selectedIds().length)}
            </strong>
            <DeleteShipmentsAction
              storeId={params.storeId}
              selectedRows={selectedRows}
              onDeleted={onDeleted}
            />
            {/* Make a copy — single selection only (spec S1 bulk actions). */}
            <Show when={selectedIds().length === 1}>
              <DuplicateShipmentAction
                shipmentId={() => selectedIds()[0]!}
                number={() =>
                  rows().find(r => r.id === selectedIds()[0])?.invoiceNumber ??
                  0
                }
                customerName={() =>
                  rows().find(r => r.id === selectedIds()[0])?.otherPartyName ??
                  ''
                }
              />
            </Show>
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
        rowKey={row => row.id}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // Read-only rows (SHIPPED+) take the disabled state (AC-L3); they
        // stay clickable — row click still opens the detail.
        rowState={row => (!isEditable(row.status) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-outbound-shipments')}
        empty={
          <Button
            variant="ghost"
            data-testid="nothing-here-create-button"
            onClick={() => setCreateOpen(true)}
          >
            {t('button.create-a-new-one')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        // Pagination renders as an overlay INSIDE the table (bottom-inline-end),
        // matching the stocktakes list (kdd/table-state). State stays
        // page-owned / URL-backed.
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
      <CustomerSearchModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
    </Page>
  );
};

export default OutboundShipmentsList;
