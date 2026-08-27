import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch, reportPermissionDenied } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { hasPermission } from '../../../store/storeContext';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { OkButton } from '../../../ui/elements/buttons/StandardButtons';
import { HStack } from '../../../ui/layout/Stack/HStack';
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
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { CloseIcon, PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '../../../typeHelpers';
import {
  SupplierReturns,
  UpdateSupplierReturnColour,
  type SupplierReturnsVariables,
  type SupplierReturnsResult,
} from './supplierReturns.generated';
import { SupplierReturnPreferences } from '../preferences.generated';
import { createFilters, type ReturnsFilter } from './listFilters';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import { DeleteReturnsAction } from '../../../domain/invoice';
import { NewReturnModal } from './NewReturnModal';
import { ExportSupplierReturnsAction } from './actions/ExportSupplierReturnsAction';
import { deleteReturn } from '../detail/returnUpdate';
import {
  deleteRestoresStock,
  statusLabel,
  isReturnDisabled,
} from '../detail/returnStatus';

// The supplier-returns list (spec/supplier-returns/ui-surface.md S1): the
// standard list screen over the invoices query pinned to SUPPLIER_RETURN.
// Columns Name (+ colour swatch) / Status / Number / Created date / Comment /
// Reference; filters name + status; default sort created date, newest first;
// bulk Delete on selection. "New return" opens the supplier selection (S2) —
// gated by the disable-manual-returns preference (a UI-only affordance gate)
// and the supplier-return mutate permission.

type ReturnRow = Extract<
  SupplierReturnsResult['invoices'],
  { __typename: 'InvoiceConnector' }
>['nodes'][number];

type SortKey = NonNullable<SupplierReturnsVariables['sort']>[number]['key'];

type ReturnsListState = {
  filter: ReturnsFilter;
  /**
   * Typed per-custom-field filter values → the dynamicFilter AST at query
   * time.
   */
  cf?: CustomFieldFilterState;
  sort?: SupplierReturnsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: created date, newest first (ui-surface S1; matches the running
// app).
const DEFAULT_STATE: ReturnsListState = {
  filter: {},
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Status → chip colour token (tokens.css --status-*); label via the shared
// translated map. Text + style, never colour alone. Keyed by the GENERATED
// status union (partial: the union also carries statuses a supplier return
// never reaches), so a typo'd or dropped key is a compile error.
const STATUS_COLOURS: Partial<Record<ReturnRow['status'], string>> = {
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

const SupplierReturnsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ReturnsListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);
  // The disable-manual-returns notice: shown instead of the supplier selection
  // when the store preference is on (rules § preference & permission gates).
  const [disabledNoticeOpen, setDisabledNoticeOpen] = createSignal(false);

  const tableConfig = createTableConfig({
    tableId: 'supplier-returns',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: { comment: false, theirReference: false },
      },
    },
  });

  // Custom-field definitions for the supplier_return scope — shared scope-keyed
  // cache, read non-suspending. Empty ⇒ no custom-field columns/filters.
  const cfReader = customFieldDefinitions('supplier_return');
  const cfDefs = () => cfReader.noSuspense();
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));
  const onCustomFieldChange = (cf: CustomFieldFilterState) => {
    setQuery({ ...query(), cf, offset: 0 });
    setSelectedIds([]);
  };

  // GraphQL variables from URL state. The type pin lives in the QUERY's
  // top-level `type` argument, which both selects the permission and overwrites
  // `filter.type` server-side — so the list can never escape the vertical, and
  // a filter pin here would be silently discarded
  // (spec/supplier-returns/contract.md § list & lookups).
  const variables = createMemo<SupplierReturnsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
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
        SupplierReturns,
        JSON.parse(serialised) as SupplierReturnsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.invoices.__typename === 'InvoiceConnector'
        ? result.data.invoices
        : undefined;
    }
  );

  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // A bulk delete of the last page's rows leaves the offset past the new end
  // (src/list/clampPageOffset.ts, issue #1117).
  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  // The store preferences this list keys off: fetched once per store.
  const [prefs] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(SupplierReturnPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  // NON-suspending read (kdd/solid-reactivity-pitfalls § no remounts on
  // interaction): the status chip reads the options lazily as it renders, so a
  // still-pending preference must never suspend this screen's boundary —
  // `.latest` alone would, on its first pending read, tearing down the open
  // chip. Unresolved = no restriction (and manual returns ENABLED — the common
  // case; flashing the notice would be the wrong direction).
  const loadedPrefs = () => gated(prefs);
  const manualReturnsDisabled = () =>
    loadedPrefs()?.disableManualReturns ?? false;

  // Built once per mount (stable identity — FilterBar never remounts a chip);
  // the accessor is read lazily per render, so the status options narrow in
  // place when the invoice-status-options preference resolves (rules
  // § preference gates).
  const filters = createFilters(
    () => loadedPrefs()?.invoiceStatusOptions ?? []
  );

  const onNewReturn = () => {
    // Preference gate first (rules § preference & permission gates): with
    // manual returns disabled the notice shows even to a user lacking the
    // permission.
    if (manualReturnsDisabled()) {
      setDisabledNoticeOpen(true);
      return;
    }
    // Then the standing permission mirror (validation § permission gating):
    // creating requires SUPPLIER_RETURN_MUTATE. Lacking it, the global
    // permission-denied modal shows at once — never a toast, and no supplier
    // picker opens. The server enforces the same resource on the write
    // regardless.
    if (!hasPermission('SUPPLIER_RETURN_MUTATE')) {
      reportPermissionDenied(['SupplierReturnMutate']);
      return;
    }
    setCreateOpen(true);
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the two controls that trigger it; each carries
  // `shortcut={ALT_N}` for its badge.
  //
  // Never disabled, because the control never is: `onNewReturn` owns the
  // preference and permission gates and reports each in its own way (a notice,
  // or the global permission-denied modal).
  createAddAction({
    name: 'button.new-return',
    run: onNewReturn,
  });

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

  // Whether deleting the selection brings issued stock back, which the bulk
  // delete's confirmation says (rules § deleting an issued return restores its
  // stock). Not a gate — it only picks the copy. Both halves have to hold for
  // there to be stock the delete would actually return: the status must admit it
  // (deleteRestoresStock — PICKED alone: NEW issued nothing, and SHIPPED onwards
  // is refused outright), and the row must have lines, since only lines issued
  // anything.
  //
  // Reads the CURRENT page's rows, since status and line count come from them:
  // a selection carried across a page change is still deleted in full (the
  // delete works from the ids), but a stock-bearing row left behind on another
  // page cannot raise the notice. The inbound list has the same shape.
  const selectionRestoresStock = () =>
    rows().some(
      row =>
        selectedIds().includes(row.id) &&
        deleteRestoresStock(row.status) &&
        row.lines.totalCount > 0
    );

  const openRow = (row: ReturnRow) =>
    navigate(`/${params.storeId}/replenishment/supplier-return/${row.id}`);

  // The Name cell's swatch setter (ui-surface S1): header-level colour save,
  // then re-query so the row reflects it. Disabled (dot only) on rows the
  // store can no longer edit (Shipped) — the same standing gate as everything
  // else.
  const setColour = async (row: ReturnRow, colour: string) => {
    // No typed-error branch to read: `UpdateSupplierReturnResponse` is
    // `InvoiceNode` alone (contract § header saves), so every rejection arrives
    // as a graphqlError and the global modal has already shown it — unlike the
    // customer-returns twin, whose union carries an error member.
    const result = await graphqlFetch(UpdateSupplierReturnColour, {
      storeId: params.storeId,
      id: row.id,
      colour,
    });
    if (result.kind === 'success') void refetch();
  };

  const columns = (): Column<ReturnRow, SortKey>[] => [
    {
      c: { key: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: () => t('label.name'),
      ...getCellDefinition('otherPartyName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
      cell: info => {
        const row = info.row.original;
        return (
          <HStack gap="sm">
            {/* Swatch editable only while the row is editable (rules
                § editability — the same standing gate as everything else);
                read-only (Shipped) rows show the dot alone. */}
            <Show
              when={!isReturnDisabled(row)}
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
      c: { key: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      cell: info => (
        <StatusChip {...statusMeta(info.getValue<ReturnRow['status']>())} />
      ),
      meta: { headerPosition: 'badge' },
      // Status is a page-rendered cell type (no preset — it needs a
      // status→colour map), so the column carries its own width
      // (ui/docs/CELL_TYPES.md § cell-type inventory).
      size: remToPx(7.5),
      maxSize: remToPx(9.375),
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: () => t('label.number'),
      ...getCellDefinition('invoiceNumber'),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      // Shared comment cell — indicator + popover (ui-surface S1 col 5); the
      // column is not sortable (only Name / Status / Number / Created are).
      ...getCellDefinition('comment'),
    },
    {
      c: { key: 'theirReference' },
      header: () => t('label.reference'),
      ...getCellDefinition('theirReference', { wrapLines: 2 }),
    },
    // Configured custom-field columns — not sortable; value chosen by kind.
    ...customFieldColumns<ReturnRow, SortKey>(
      cfDefs(),
      row => row.customFields
    ),
  ];

  const crumbs = () => [{ label: t('supplier-return') }];

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
              data-testid="new-return-button"
              onClick={onNewReturn}
            >
              {t('button.new-return')}
            </Button>
            {/* Export CSV / Excel (ui-surface S1): every return matching the
                active filter, across all pages. */}
            <ExportSupplierReturnsAction
              storeId={params.storeId}
              filter={() => variables().filter}
            />
          </HeaderButtons>
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
            {/* The shared returns bulk delete (domain/invoice): one
                deleteSupplierReturn per selected id, since there is no batch
                mutation. Deleting a PICKED return RESTORES its stock — the
                server deletes each stock-out line, which returns the packs to
                the stock line (rules § deleting an issued return restores its
                stock). The confirmation says so: stock moving is worth
                stating, even when it moves back. */}
            <DeleteReturnsAction
              storeId={params.storeId}
              selectedIds={selectedIds}
              deleteOne={deleteReturn}
              stockNotice={{
                applies: selectionRestoresStock,
                message: t('messages.delete-restores-issued-stock'),
                testId: 'delete-restores-stock',
              }}
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
        // The filter bar lives in the TABLE's own toolbar, never the page
        // header (ui-standards/tables.md § toolbar — binding for every table).
        // Filter state stays page-owned / URL-backed; the table only places it.
        filters={
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
        }
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // Rows the store can no longer edit (Shipped and beyond) take the
        // disabled state — ui-surface S1.
        rowState={row => (isReturnDisabled(row) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-supplier-returns')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
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
        configIsDefault={tableConfig.isConfigDefault()}
        // Central-server admins (EDIT_CENTRAL_DATA) can promote their layout to
        // the install-wide default; everyone else gets no action.
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        // Pagination renders as an overlay INSIDE the table, not in a page
        // footer band — consistent with the stocktakes list (kdd/table-state).
        // State stays page-owned / URL-backed.
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
      <NewReturnModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
      {/* The manual-returns-disabled notice: an info-only dialog in place of the
          create flow while the store preference is on. Mounted only while open
          (kdd/action-modal) — a closed-but-mounted Dialog leaves its shared
          `dialog-button-ok` id in the DOM. */}
      <Show when={disabledNoticeOpen()}>
        <Dialog
          open
          onClose={() => setDisabledNoticeOpen(false)}
          title={t('button.new-return')}
          description={t('messages.manual-returns-preferences-disabled')}
          actions={
            <OkButton
              data-testid="dialog-button-ok"
              onClick={() => setDisabledNoticeOpen(false)}
            />
          }
        />
      </Show>
    </Page>
  );
};

export default SupplierReturnsList;
