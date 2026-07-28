import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { A, useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
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
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { HomeIcon, PlusCircleIcon, TruckIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
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
  statusColour,
  statusLabel,
  supplierIsStore,
} from '../detail/inboundShipmentStatus';
import { heldInboundQueryScopes } from '../inboundShipmentScope';
import { linkedOrderOf } from '../linkedOrder';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import linkStyles from '../linkedOrder.module.css';

// The inbound-shipments list view (spec S1). Mirrors the stocktakes reference
// list: URL-backed filter/sort/pagination, the shared DataTable, a selection
// footer with bulk delete + make-a-copy. Data goes through the single
// never-throwing query method; the resource is keyed on the SERIALISED
// variables so an empty filter chip doesn't reflash the list
// (kdd/solid-reactivity-pitfalls).

const DEFAULT_PAGE_SIZE = 20;

type Row = InboundRowFragment;
type SortKey = NonNullable<InboundShipmentsVariables['sort']>[number]['key'];

type ListState = {
  filter: InboundListFilter;
  /** Typed per-custom-field filter values → the dynamicFilter AST at query time. */
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
  const { query, setQuery } = useUrlQueryState<ListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The create modal: plain manual create, or the from-a-purchase-order flow
  // (offered only when the store's procurement preference is on).
  const [createMode, setCreateMode] = createSignal<
    'manual' | 'fromPurchaseOrder'
  >();
  const prefs = () => inboundShipmentPreferences();

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
  // Custom-field definitions for the inbound_shipment scope — shared scope-keyed
  // cache, read non-suspending. Empty ⇒ no custom-field columns/filters.
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
        // Custom-field filters become the dynamicFilter AST (undefined = no-op).
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

  // Bulk delete is offered only while EVERY selected row is New (spec S1 — a
  // deliberate UI narrowing of the server's wider delete window).
  const selectedRows = () => rows().filter(r => selectedIds().includes(r.id));
  const allSelectedNew = () =>
    selectedRows().length > 0 && selectedRows().every(r => r.status === 'NEW');
  const singleSelectedId = () =>
    selectedIds().length === 1 ? selectedIds()[0] : undefined;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  const onFilterChange = (filter: InboundListFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };
  const onCustomFieldChange = (cf: CustomFieldFilterState) => {
    setQuery({ ...query(), cf, offset: 0 });
    setSelectedIds([]);
  };
  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  // A PO-linked shipment opens on the external-detail behaviour; both share one
  // detail route here (the view resolves plain vs external itself).
  const openRow = (row: Row) =>
    navigate(`/${params.storeId}/replenishment/inbound-shipment/${row.id}`);

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
      header: () => t('label.name'),
      meta: { headerPosition: 'primary' },
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
            {/* Stop the swatch's clicks opening the row (it edits in place). */}
            <span onClick={e => e.stopPropagation()}>
              <ColourTagPicker
                colour={row.colour ?? null}
                onSelect={colour => void setColour(row, colour)}
              />
            </span>
            {supplierIsStore(row) ? (
              <HomeIcon style={{ color: 'var(--primary-main)' }} />
            ) : (
              <TruckIcon style={{ color: 'var(--secondary-main)' }} />
            )}
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
      meta: { headerPosition: 'badge' },
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: () => '#',
      ...getNumberCell(),
    },
    {
      // Linked order (spec S1 column 4) — when linked, a link to the order
      // prefixed by kind: PO-<number> for a purchase order, IO-<number> for
      // an internal order; blank otherwise. Toned by kind via the shared
      // linkedOrder.module.css.
      c: {
        accessor: row => linkedOrderOf(params.storeId, row)?.label ?? '',
        id: 'linkedOrder',
      },
      header: () => t('label.linked-order'),
      cell: info => {
        const linked = linkedOrderOf(params.storeId, info.row.original);
        return (
          <Show when={linked}>
            {l => (
              // Stop the link's clicks opening the row (it navigates itself).
              <A
                href={l().href}
                onClick={e => e.stopPropagation()}
                class={linkStyles.link}
                data-kind={l().kind}
              >
                {l().label}
              </A>
            )}
          </Show>
        );
      },
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'deliveredDatetime' },
      sortKey: 'deliveredDatetime',
      header: () => t('label.delivered'),
      ...getDateCell(),
    },
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCommentCell(),
    },
    {
      c: { key: 'theirReference' },
      sortKey: 'theirReference',
      header: () => t('label.reference'),
    },
    {
      c: { accessor: row => row.pricing.totalAfterTax, id: 'total' },
      header: () => t('label.total'),
      ...getCurrencyCell(),
    },
    // Configured custom-field columns — not sortable; value chosen by kind.
    ...customFieldColumns<Row, SortKey>(cfDefs(), row => row.customFields),
  ];

  const crumbs = () => [
    { label: t('replenishment') },
    { label: t('inbound-shipment') },
  ];

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
            icon={<PlusCircleIcon />}
            data-testid="nothing-here-create-button"
            onClick={() => setCreateMode('manual')}
          >
            {t('button.new-shipment')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // The bulk actions for the table's selection footer (the table adds
        // the count + Clear around them, and swaps its pager for the bar
        // while rows are selected).
        selectionActions={
          <>
            {/* Delete — enabled only while every selected row is New (spec S1) */}
            <span
              title={
                allSelectedNew() ? undefined : t('messages.delete-only-new')
              }
            >
              <DeleteInboundShipmentsAction
                storeId={params.storeId}
                selectedIds={selectedIds}
                onDeleted={onDeleted}
                disabled={!allSelectedNew()}
              />
            </span>
            {/* Make a copy — enabled only for a single selection (spec AC-L4);
                shown disabled-with-reason otherwise (M5). Number/supplier come
                from the (only) selected row; when multi-selected the action is
                disabled so the confirm never opens. */}
            <span
              title={
                singleSelectedId() ? undefined : t('messages.copy-single-only')
              }
            >
              <DuplicateInboundShipmentAction
                invoiceId={singleSelectedId() ?? selectedIds()[0] ?? ''}
                number={() =>
                  rows().find(r => r.id === selectedIds()[0])?.invoiceNumber ??
                  0
                }
                supplierName={() =>
                  rows().find(r => r.id === selectedIds()[0])?.otherPartyName ??
                  ''
                }
                disabled={!singleSelectedId()}
              />
            </span>
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
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
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
