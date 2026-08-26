import { createMemo, createResource, createSignal, Show } from 'solid-js';
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
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
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
import { HStack } from '../../../ui/layout/Stack/HStack';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { inboundShipmentPreferences } from '../../../store/storeContext';
import {
  InboundShipments,
  type InboundRowFragment,
  type InboundShipmentsVariables,
} from './inboundShipments.generated';
import { updateInboundShipment } from '../detail/inboundShipmentUpdate';
import {
  filterFields,
  inboundQueryInputs,
  type InboundListFilter,
} from './listFilters';
import { CreateInboundShipmentModal } from './CreateInboundShipmentModal';
import {
  DeleteInboundShipmentsAction,
  ExportInboundShipmentsAction,
} from './actions';
import { DuplicateInboundShipmentAction } from '../detail/actions/DuplicateInboundShipmentAction';
import {
  deleteRemovesStock,
  isEditable,
  statusColour,
  statusLabel,
  supplierIsStore,
} from '../detail/inboundShipmentStatus';
import {
  heldInboundQueryScopes,
  inboundShipmentHref,
  scopeOf,
} from '../inboundShipmentScope';
import type { InboundSelection } from './deleteInboundShipments';
import { linkedOrderOf } from '../linkedOrder';
import { SupplierKindIcon } from '../SupplierKindIcon';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import { RecordLink } from '../../../ui/elements/typography/RecordLink';

// The inbound-shipments list view (spec S1). Mirrors the stocktakes reference
// list: URL-backed filter/sort/pagination, the shared DataTable, a selection
// footer with bulk delete + make-a-copy. Data goes through the single
// never-throwing query method; the resource is keyed on the SERIALISED
// variables so an empty filter chip doesn't reflash the list
// (kdd/solid-reactivity-pitfalls).

type Row = InboundRowFragment;
type SortKey = NonNullable<InboundShipmentsVariables['sort']>[number]['key'];

type ListState = {
  filter: InboundListFilter;
  /**
   * Typed per-custom-field filter values → the dynamicFilter AST at query
   * time.
   */
  cf?: CustomFieldFilterState;
  sort?: InboundShipmentsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: shipment number, descending (spec S1).
const DEFAULT_STATE: ListState = {
  filter: {},
  sort: [{ key: 'invoiceNumber', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const InboundShipmentsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  // The create modal: plain manual create, or the from-a-purchase-order flow
  // (offered only when the store's procurement preference is on).
  const [createMode, setCreateMode] = createSignal<
    'manual' | 'fromPurchaseOrder'
  >();
  const prefs = () => inboundShipmentPreferences();

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the three controls that can trigger it (the plain New
  // button, the procurement split button, and the ghost button in the table's
  // empty slot — only two ever render at a time); each carries
  // `shortcut={ALT_N}` for its badge, none owns the action.
  //
  // `run` is the manual create, which is the plain button's action and the
  // split button's default option. The from-a-purchase-order route keeps its
  // own control.
  createAddAction({
    name: 'button.new-shipment',
    run: () => setCreateMode('manual'),
  });

  const tableConfig = createTableConfig({
    tableId: 'inbound-shipments',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: {
          deliveredDatetime: false,
          theirReference: false,
          total: false,
          comment: false,
        },
      },
      base: {
        columnVisibility: {
          deliveredDatetime: false,
          theirReference: false,
          total: false,
        },
      },
    },
  });

  // `type` is the permission scope selector: request exactly the query scopes
  // the user holds. The two inbound scopes are disjoint buckets (plain =
  // manual/transfer, external = PO-linked), so the full set is their union;
  // requesting a scope the user lacks refuses the whole list, so we never ask
  // for one they don't hold (spec/inbound-shipments › contract → permissions).
  // The Type filter narrows this scope + adds a requisitionId filter — both
  // resolved from the client-only `kind` by inboundQueryInputs.
  // Custom-field definitions for the inbound_shipment scope — shared
  // scope-keyed cache, read non-suspending. Empty ⇒ no custom-field
  // columns/filters.
  const cfReader = customFieldDefinitions('inbound_shipment');
  const cfDefs = () => cfReader.noSuspense();
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));

  const variables = () => {
    const { filter, type } = inboundQueryInputs(
      query().filter,
      heldInboundQueryScopes()
    );
    return {
      storeId: params.storeId,
      filter: {
        ...filter,
        // Custom-field filters become the dynamicFilter AST (undefined =
        // no-op).
        dynamicFilter: buildCustomFieldDynamicFilter(query().cf),
      },
      sort: query().sort,
      page: { first: query().first, offset: query().offset },
      type,
    };
  };

  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const vars = JSON.parse(serialised) as InboundShipmentsVariables;
      // No inbound scope held → no access; show the empty state rather than
      // sending a scopeless request (which would fall back to a different,
      // generic permission).
      if (!vars.type || vars.type.length === 0) return undefined;
      const result = await graphqlFetch(InboundShipments, vars);
      if (result.kind !== 'success') return undefined;
      return result.data.invoices.__typename === 'InvoiceConnector'
        ? result.data.invoices
        : undefined;
    }
  );

  const rows = (): Row[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // The selection carries the SCOPE of each shipment alongside its id, because
  // the bulk delete is twinned per scope (issue #1213 — see
  // deleteInboundShipments). A selection survives a page change, outliving the
  // row that carried `purchaseOrderId`, so the scope is read off the row as the
  // id is selected — it was on the page at that moment — and travels with the
  // id until it leaves the selection. ONE signal, not an id list beside a scope
  // map: there is then no invariant to keep, and no id that could reach the
  // wire with a guessed scope.
  const [selection, setSelection] = createSignal<InboundSelection[]>([]);
  const selectedIds = createMemo(() => selection().map(s => s.id));
  const onSelectionChange = (ids: string[]) => {
    const known = new Map(selection().map(s => [s.id, s.scope]));
    setSelection(
      ids.map(id => ({
        id,
        scope:
          known.get(id) ??
          scopeOf(rows().find(r => r.id === id)?.purchaseOrderId),
      }))
    );
  };
  const clearSelection = () => setSelection([]);

  const singleSelectedId = () =>
    selectedIds().length === 1 ? selectedIds()[0] : undefined;

  // Whether deleting the selection reverses a receipt, which the confirmation
  // warns about (rules → deletion). Not a gate — it only picks the copy. Both
  // halves have to hold for there to be stock the delete would actually take:
  // the status must admit it (deleteRemovesStock — Received alone: Shipped and
  // Delivered hold none, Verified is refused outright), and the row must have
  // lines, since stock only ever comes from those.
  //
  // Reads the CURRENT page's rows, since status and line count come from them:
  // a selection carried across a page change is still submitted in full, but a
  // stock-bearing row left behind on another page cannot raise the notice.
  const selectionRemovesStock = () =>
    rows().some(
      r =>
        selectedIds().includes(r.id) &&
        deleteRemovesStock(r.status) &&
        r.lines.totalCount > 0
    );

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  const onFilterChange = (filter: InboundListFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    clearSelection();
  };
  const onCustomFieldChange = (cf: CustomFieldFilterState) => {
    setQuery({ ...query(), cf, offset: 0 });
    clearSelection();
  };

  // Both scopes share one detail route; the row's purchaseOrderId names which
  // scope this shipment is in, and the link carries it so the detail's single
  // read can name the right `type` (see inboundShipmentHref).
  const openRow = (row: Row) =>
    navigate(
      inboundShipmentHref(params.storeId, row.id, scopeOf(row.purchaseOrderId))
    );

  // Inline supplier colour-tag edit (spec S1 column 1: the swatch is editable
  // inline). Submits the colour via the twin-aware update and refetches.
  const setColour = async (row: Row, colour: string | null) => {
    const result = await updateInboundShipment(
      params.storeId,
      row.purchaseOrderId != null,
      { id: row.id, colour }
    );
    if (result.kind === 'saved') void refetch();
  };

  const columns = (): Column<Row, SortKey>[] => [
    {
      // Supplier — colour swatch (editable inline) + kind icon + name (spec S1
      // column 1): a house icon in the PRIMARY colour when the supplier is
      // itself another store in the system (internal), a truck in the SECONDARY
      // colour for an external supplier.
      c: { accessor: row => row.otherPartyName, id: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: () => t('label.supplier'),
      ...getCellDefinition('otherPartyName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
      cell: info => {
        const row = info.row.original;
        return (
          <HStack gap="sm">
            {/* The swatch is editable only while the shipment is (the same
                standing gate as every other edit — rules § editability); a
                read-only row shows the dot alone, per the registry's colour-tag
                row. ColourTagPicker stops its own clicks reaching the row. */}
            <Show
              when={isEditable(row.status)}
              fallback={<ColourTagDot colour={row.colour ?? null} />}
            >
              <ColourTagPicker
                colour={row.colour ?? null}
                variant="row"
                onSelect={colour => void setColour(row, colour)}
              />
            </Show>
            <SupplierKindIcon isStore={supplierIsStore(row)} />
            <span>{row.otherPartyName}</span>
          </HStack>
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
      // Status has no cell-type preset (CELL_TYPES § Status is page-rendered),
      // so the width lives here.
      meta: { headerPosition: 'badge' },
      size: remToPx(7.5),
      maxSize: remToPx(9.375),
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: () => '#',
      ...getCellDefinition('invoiceNumber'),
    },
    {
      // Linked order (spec S1 column 4) — when linked, a link to the order
      // prefixed by kind: PO-<number> for a purchase order, IO-<number> for
      // an internal order; blank otherwise. Toned by kind via the shared
      // RecordLink.
      c: {
        accessor: row => linkedOrderOf(params.storeId, row)?.label ?? '',
        id: 'linkedOrder',
      },
      header: () => t('label.linked-order'),
      // No CELL_DEF key — "PO-011"/"IO-095" is code-like, but the header
      // "Linked order" is the binding constraint, so size it here.
      size: remToPx(9),
      cell: info => {
        const linked = linkedOrderOf(params.storeId, info.row.original);
        return (
          <Show when={linked}>
            {l => (
              // Stop the link's clicks opening the row (it navigates itself).
              <RecordLink
                href={l().href}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                kind={l().kind}
              >
                {l().label}
              </RecordLink>
            )}
          </Show>
        );
      },
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      c: { key: 'deliveredDatetime' },
      sortKey: 'deliveredDatetime',
      header: () => t('label.delivered'),
      ...getCellDefinition('deliveredDatetime'),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
    {
      c: { key: 'theirReference' },
      sortKey: 'theirReference',
      header: () => t('label.reference'),
      ...getCellDefinition('theirReference'),
    },
    {
      c: { accessor: row => row.pricing.totalAfterTax, id: 'total' },
      header: () => t('label.total'),
      ...getCellDefinition('total'),
    },
    // Configured custom-field columns — not sortable; value chosen by kind.
    ...customFieldColumns<Row, SortKey>(cfDefs(), row => row.customFields),
  ];

  const crumbs = () => [{ label: t('inbound-shipment') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            {/* A store with procurement functionality gets a split button
                offering the from-a-purchase-order flow as its second option
                (spec AC-PG3); otherwise a plain New shipment button. */}
            <Show
              when={prefs().useProcurementFunctionality}
              fallback={
                <Button
                  icon={<PlusCircleIcon />}
                  shortcut={ALT_N}
                  data-testid="new-shipment-button"
                  onClick={() => setCreateMode('manual')}
                >
                  {t('button.new-shipment')}
                </Button>
              }
            >
              <SplitButton
                icon={<PlusCircleIcon />}
                testId="new-shipment-button"
                menuLabel={t('button.new-shipment')}
                shortcut={ALT_N}
                options={[
                  { value: 'manual', label: t('button.new-shipment') },
                  {
                    value: 'fromPurchaseOrder',
                    label: t('button.new-external-shipment'),
                  },
                ]}
                onAction={value =>
                  setCreateMode(value as 'manual' | 'fromPurchaseOrder')
                }
              />
            </Show>
            <ExportInboundShipmentsAction
              storeId={params.storeId}
              filter={() => query().filter}
            />
          </HeaderButtons>
        </Header>
      }
    >
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
            extra={{
              filters: cfFilters(),
              filter: query().cf ?? {},
              onChange: onCustomFieldChange,
            }}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        emptyMessage={t('error.no-inbound-shipments')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            onClick={() => setCreateMode('manual')}
          >
            {t('button.create-a-new-one')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={onSelectionChange}
        // The bulk actions for the table's selection footer (the table adds
        // the count + Clear around them, and swaps its pager for the bar
        // while rows are selected).
        selectionActions={
          <>
            {/* Delete — always offered on a selection. Deletability is the
                admissibility of an action, not a standing property of the rows,
                so it is submitted and the server's own reason is surfaced in
                the dialog rather than pre-screened here
                (spec/ui-standards/validation.md § actions; issue #1134). */}
            <DeleteInboundShipmentsAction
              storeId={params.storeId}
              selection={selection}
              removesStock={selectionRemovesStock}
              refetchList={() => void refetch()}
              clearSelection={clearSelection}
            />
            {/* Make a copy — enabled only for a single selection (spec AC-L4);
                shown disabled-with-reason otherwise (M5). Number/supplier come
                from the (only) selected row; when multi-selected the action is
                disabled so the confirm never opens. */}
            <DuplicateInboundShipmentAction
              invoiceId={singleSelectedId() ?? selectedIds()[0] ?? ''}
              number={() =>
                rows().find(r => r.id === selectedIds()[0])?.invoiceNumber ?? 0
              }
              supplierName={() =>
                rows().find(r => r.id === selectedIds()[0])?.otherPartyName ??
                ''
              }
              disabled={!singleSelectedId()}
              title={
                singleSelectedId() ? undefined : t('messages.copy-single-only')
              }
            />
          </>
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
          // The chosen size is remembered for the next visit (D106).
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
      <CreateInboundShipmentModal
        open={createMode() != null}
        mode={createMode() ?? 'manual'}
        onClose={() => setCreateMode(undefined)}
      />
    </Page>
  );
};

export default InboundShipmentsList;
