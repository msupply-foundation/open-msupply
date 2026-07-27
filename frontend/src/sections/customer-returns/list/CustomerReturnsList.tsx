import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch, reportPermissionDenied } from '../../../api/graphql';
import { hasPermission } from '../../../store/storeContext';
import { t } from '../../../intl';
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
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { CheckIcon, CloseIcon, PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import {
  CustomerReturns,
  UpdateCustomerReturnColour,
  type CustomerReturnsVariables,
  type CustomerReturnsResult,
} from './customerReturns.generated';
import { CustomerReturnPreferences } from '../preferences.generated';
import { createFilters, type ReturnsFilter } from './listFilters';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import { NewReturnModal } from './NewReturnModal';
import { DeleteReturnsAction } from './actions/DeleteReturnsAction';
import { ExportCustomerReturnsAction } from './actions/ExportCustomerReturnsAction';
import { statusLabel, isReturnDisabled } from '../detail/returnStatus';

// The customer-returns list (spec/customer-returns/ui-surface.md S1): the
// standard list screen over the invoices query pinned to CUSTOMER_RETURN.
// Columns Name (+ colour swatch) / Status / Number / Created date / Comment /
// Reference; filters name + status; default sort created date, newest first
// (AC-L1/L2); bulk Delete on selection (AC-D1). "New return" opens the customer
// selection (S2) — gated by the disable-manual-returns preference, which is a
// UI-only affordance gate (AC-C3).

const DEFAULT_PAGE_SIZE = 20;

type ReturnRow = Extract<
  CustomerReturnsResult['invoices'],
  { __typename: 'InvoiceConnector' }
>['nodes'][number];

type SortKey = NonNullable<CustomerReturnsVariables['sort']>[number]['key'];

type ReturnsListState = {
  filter: ReturnsFilter;
  /** Typed per-custom-field filter values → the dynamicFilter AST at query time. */
  cf?: CustomFieldFilterState;
  sort?: CustomerReturnsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: created date, newest first (AC-L2; matches the running app).
const DEFAULT_STATE: ReturnsListState = {
  filter: {},
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Status → chip colour token (tokens.css --status-*); label via the shared
// translated map. Text + style, never colour alone.
const STATUS_COLOURS: Record<string, string> = {
  NEW: 'var(--status-new)',
  PICKED: 'var(--status-picked)',
  SHIPPED: 'var(--status-shipped)',
  DELIVERED: 'var(--status-delivered)',
  RECEIVED: 'var(--status-received)',
  VERIFIED: 'var(--status-verified)',
};

const statusMeta = (status: ReturnRow['status']) => ({
  label: statusLabel(status),
  colour: STATUS_COLOURS[status] ?? 'var(--status-new)',
});

const CustomerReturnsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ReturnsListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);
  // The disable-manual-returns notice (AC-C3): shown instead of the customer
  // selection when the store preference is on.
  const [disabledNoticeOpen, setDisabledNoticeOpen] = createSignal(false);

  const tableConfig = createTableConfig({
    tableId: 'customer-returns',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: { comment: false, theirReference: false },
      },
    },
  });

  // Custom-field definitions for the customer_return scope — shared scope-keyed
  // cache, read non-suspending. Empty ⇒ no custom-field columns/filters.
  const cfReader = customFieldDefinitions('customer_return');
  const cfDefs = () => cfReader.noSuspense();
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));
  const onCustomFieldChange = (cf: CustomFieldFilterState) => {
    setQuery({ ...query(), cf, offset: 0 });
    setSelectedIds([]);
  };

  // GraphQL variables from URL state. The type pin lives HERE (not in the URL
  // filter) so the list can never escape the vertical
  // (spec/customer-returns/contract.md § list & lookups).
  const variables = createMemo<CustomerReturnsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      type: { equalTo: 'CUSTOMER_RETURN' },
      // Custom-field filters become the dynamicFilter AST (undefined = no-op).
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf),
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Serialised-source resource (kdd/solid-reactivity-pitfalls): identical query
  // content never refetches; reads below use `.latest` so nothing suspends the
  // section boundary.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        CustomerReturns,
        JSON.parse(serialised) as CustomerReturnsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.invoices.__typename === 'InvoiceConnector'
        ? result.data.invoices
        : undefined;
    }
  );

  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // The store preferences this list keys off (AC-C3): fetched once per store.
  // `.latest` + undefined-tolerant read — while unresolved, treat manual
  // returns as ENABLED (the common case; flashing the notice would be the
  // wrong direction).
  const [prefs] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(CustomerReturnPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  const manualReturnsDisabled = () =>
    prefs.latest?.disableManualReturns ?? false;

  // Built once per mount (stable identity — FilterBar never remounts a chip);
  // the accessor is read lazily per render, so the status options narrow in
  // place when the invoice-status-options preference resolves (rules
  // § preference gates).
  const filters = createFilters(() => prefs.latest?.invoiceStatusOptions ?? []);

  const onNewReturn = () => {
    // Preference gate first (rules § preference & permission gates): with manual
    // returns disabled the notice shows even to a user lacking the permission.
    if (manualReturnsDisabled()) {
      setDisabledNoticeOpen(true);
      return;
    }
    // Then the standing permission mirror (validation § permission gating):
    // creating requires CUSTOMER_RETURN_MUTATE. Lacking it, the global
    // permission-denied modal shows at once — never a toast, and no customer
    // picker opens. The server enforces the same resource on the write regardless.
    if (!hasPermission('CUSTOMER_RETURN_MUTATE')) {
      reportPermissionDenied(['CustomerReturnMutate']);
      return;
    }
    setCreateOpen(true);
  };

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: ReturnsFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  // Id + status for the bulk delete's client-side pre-check (the outbound
  // list's shape).
  const selectedRows = () =>
    rows()
      .filter(row => selectedIds().includes(row.id))
      .map(row => ({ id: row.id, status: row.status }));

  const openRow = (row: ReturnRow) =>
    navigate(`/${params.storeId}/distribution/customer-return/${row.id}`);

  // The Name cell's swatch setter (ui-surface S1): header-level colour save,
  // then re-query so the row reflects it. Disabled (dot only) on rows the
  // store can no longer edit — the same standing gate as everything else.
  const setColour = async (row: ReturnRow, colour: string) => {
    const result = await graphqlFetch(
      UpdateCustomerReturnColour,
      { storeId: params.storeId, id: row.id, colour },
      {
        mapSuccessToError: d =>
          d.updateCustomerReturn.__typename === 'UpdateCustomerReturnError'
            ? d.updateCustomerReturn.error.description
            : undefined,
      }
    );
    if (result.kind === 'success') void refetch();
  };

  const columns = (): Column<ReturnRow, SortKey>[] => [
    {
      c: { key: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: t('label.name'),
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
            {/* Swatch editable only while the row is editable (rules
                § editability — the same standing gate as everything else);
                read-only rows show the dot alone. */}
            <Show
              when={!isReturnDisabled(row)}
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
      header: t('label.status'),
      cell: info => (
        <StatusChip {...statusMeta(info.getValue<ReturnRow['status']>())} />
      ),
      meta: { headerPosition: 'badge' },
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: t('label.number'),
      ...getNumberCell(),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'comment' },
      header: t('label.comment'),
      // Shared comment cell — indicator + popover (ui-surface S1 col 5); the
      // column is not sortable (only Name / Status / Number / Created are).
      ...getCommentCell(),
    },
    {
      c: { key: 'theirReference' },
      header: t('label.reference'),
      meta: { wrapLines: 2 },
    },
    // Configured custom-field columns — not sortable; value chosen by kind.
    ...customFieldColumns<ReturnRow, SortKey>(
      cfDefs(),
      row => row.customFields
    ),
  ];

  const crumbs = () => [
    { label: t('distribution') },
    { label: t('customer-returns') },
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
              data-testid="new-return-button"
              onClick={onNewReturn}
            >
              {t('button.new-return')}
            </Button>
            {/* Export CSV / Excel (ui-surface S1, AC-L4): every return matching
                the active filter, across all pages. */}
            <ExportCustomerReturnsAction
              storeId={params.storeId}
              filter={() => variables().filter}
            />
          </HeaderButtons>
          <Toolbar>
            <FilterBar
              filters={filters}
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
        // The page's one contextual footer band: the selection action bar while
        // rows are selected, otherwise nothing — pagination renders as an
        // overlay INSIDE the DataTable (see the `pagination` prop below),
        // matching the stocktakes list / stocktake detail (kdd/table-state).
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeleteReturnsAction
              storeId={params.storeId}
              selectedRows={selectedRows}
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
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // Rows the store can no longer edit (VERIFIED; transfer rows still
        // in the sender's hands) take the disabled state — ui-surface S1.
        rowState={row => (isReturnDisabled(row) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-customer-returns')}
        empty={
          <Button
            icon={<PlusCircleIcon />}
            data-testid="nothing-here-create-button"
            onClick={onNewReturn}
          >
            {t('button.create-a-new-one')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        // Pagination renders as an overlay INSIDE the table, not in a page
        // footer band — consistent with the stocktakes list (kdd/table-state).
        // State stays page-owned / URL-backed.
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
      <NewReturnModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
      {/* The manual-returns-disabled notice (AC-C3): an info-only dialog in
          place of the create flow while the store preference is on. */}
      <Dialog
        open={disabledNoticeOpen()}
        onClose={() => setDisabledNoticeOpen(false)}
        title={t('button.new-return')}
        description={t('messages.manual-returns-preferences-disabled')}
        actions={
          <Button
            variant="secondary"
            icon={<CheckIcon />}
            onClick={() => setDisabledNoticeOpen(false)}
          >
            {t('button.ok')}
          </Button>
        }
      />
    </Page>
  );
};

export default CustomerReturnsList;
