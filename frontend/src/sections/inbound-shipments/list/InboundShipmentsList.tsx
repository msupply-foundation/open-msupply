import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import { ColourTagPicker } from '../../../ui/elements/selectors/ColourTag';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import {
  CloseIcon,
  HomeIcon,
  PlusCircleIcon,
  TruckIcon,
} from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import { inboundShipmentPreferences } from '../../../store/storeContext';
import {
  InboundShipments,
  type InboundRowFragment,
  type InboundShipmentsVariables,
} from './inboundShipments.generated';
import { updateInboundShipment } from '../detail/inboundShipmentUpdate';
import { filterFields, type InboundFilter } from './listFilters';
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
  filter: InboundFilter;
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

  const variables = () => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  });

  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        InboundShipments,
        JSON.parse(serialised) as InboundShipmentsVariables
      );
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
  const onFilterChange = (filter: InboundFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
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
      // Supplier — kind icon (truck = external supplier, home = a supplier that
      // is itself another store) + colour swatch + name. (Inline colour edit is
      // deferred to the detail side panel — see README delta.)
      c: { accessor: row => row.otherPartyName, id: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: t('label.name'),
      meta: { card: { region: 'primary' } },
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
            {supplierIsStore(row) ? <HomeIcon /> : <TruckIcon />}
            <span>{row.otherPartyName}</span>
          </span>
        );
      },
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: t('label.status'),
      cell: info => {
        const status = info.getValue<Row['status']>();
        return (
          <StatusChip
            label={statusLabel(status)}
            colour={statusColour(status)}
          />
        );
      },
      meta: { card: { region: 'badge' } },
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: '#',
      ...getNumberCell(),
    },
    {
      // Linked order — a purchase-order or internal-order number when linked,
      // blank otherwise (spec S1 column 4).
      c: {
        accessor: row =>
          row.purchaseOrder
            ? `#${row.purchaseOrder.number}`
            : row.requisition
              ? `#${row.requisition.requisitionNumber}`
              : '',
        id: 'linkedOrder',
      },
      header: t('label.linked-order'),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'deliveredDatetime' },
      sortKey: 'deliveredDatetime',
      header: t('label.delivered'),
      ...getDateCell(),
    },
    {
      c: { key: 'comment' },
      sortKey: 'comment',
      header: t('label.comment'),
      meta: { wrapLines: 2 },
    },
    {
      c: { key: 'theirReference' },
      sortKey: 'theirReference',
      header: t('label.reference'),
    },
    {
      c: { accessor: row => row.pricing.totalAfterTax, id: 'total' },
      header: t('label.total'),
      ...getCurrencyCell(),
    },
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
                testId="new-shipment"
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
          <Toolbar>
            <FilterBar
              filters={filterFields()}
              filter={query().filter}
              onChange={onFilterChange}
            />
          </Toolbar>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            {/* Delete — only while every selected row is New (spec S1). */}
            <Show when={allSelectedNew()}>
              <DeleteInboundShipmentsAction
                storeId={params.storeId}
                selectedIds={selectedIds}
                onDeleted={onDeleted}
              />
            </Show>
            {/* Make a copy — single selection only (spec AC-L4). */}
            <Show when={singleSelectedId()}>
              {id => <DuplicateInboundShipmentAction invoiceId={id()} />}
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
        rowKey={r => r.id}
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
