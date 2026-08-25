import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
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
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
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
import { PrescriptionOrders } from './prescriptionOrders.generated';
import type {
  PrescriptionOrdersVariables,
  PrescriptionOrdersResult,
} from './prescriptionOrders.generated';
import {
  asOrderStatus,
  isEditable,
  statusColour,
  statusLabel,
} from '../prescriptionOrderStatus';
import { filterFields, type PrescriptionOrderFilter } from './listFilters';
import { CreatePrescriptionOrderModal } from './CreatePrescriptionOrderModal';
import { DeletePrescriptionOrdersAction } from './actions/DeletePrescriptionOrdersAction';

// The prescription-orders list (spec/prescription-orders/ui-surface.md S1):
// the standard list screen over prescriptionOrders. Past-New rows take the
// read-only row treatment but stay clickable; default sort is created
// datetime, newest first (AC-L1).

type OrderRow = PrescriptionOrdersResult['prescriptionOrders']['nodes'][number];
type SortKey = NonNullable<PrescriptionOrdersVariables['sort']>[number]['key'];

type PrescriptionOrdersListState = {
  filter: PrescriptionOrderFilter;
  sort?: PrescriptionOrdersVariables['sort'];
  offset: number;
  first: number;
};

// Patient + the date range are on by default (S1): their keys are pre-seeded
// as added-but-empty (null) so their chips show; stripEmpty keeps them off
// the wire until they hold a value.
const DEFAULT_STATE: PrescriptionOrdersListState = {
  filter: { patientName: null, prescriptionDatetime: null },
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const PrescriptionOrdersList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<PrescriptionOrdersListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);

  // Alt+N — this screen's add action (spec/keyboard KB-R2). Declared by the
  // screen, once, for the two controls that trigger it.
  createAddAction({
    name: 'button.new-prescription',
    run: () => setCreateOpen(true),
  });

  const tableConfig = createTableConfig({
    tableId: 'prescription-orders',
    defaultConfig: {
      base: {
        columnVisibility: { createdDatetime: false },
      },
      compact: {
        // Narrow viewports default to the card view with the number hidden —
        // patient + status lead the card.
        viewMode: 'card',
        columnVisibility: {
          prescriptionOrderNumber: false,
          createdDatetime: false,
        },
      },
    },
  });

  const variables = createMemo<PrescriptionOrdersVariables>(() => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Keyed on the SERIALISED variables; read via `.latest` — never suspends,
  // so the table mounts immediately and shows its own loading treatment
  // (kdd/solid-reactivity-pitfalls § no remounts on interaction).
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        PrescriptionOrders,
        JSON.parse(serialised) as PrescriptionOrdersVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.prescriptionOrders;
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

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  // Exactly ONE sort key is ever sent (the app-wide single-sort convention).
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: PrescriptionOrderFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: OrderRow) =>
    navigate(`/${params.storeId}/dispensary/prescription-order/${row.id}`);

  const columns = (): Column<OrderRow, SortKey>[] => [
    {
      c: { accessor: row => row.patient?.name ?? '', id: 'patientName' },
      header: () => t('label.patient'),
      meta: { headerPosition: 'primary' },
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      cell: info => {
        const status = asOrderStatus(info.row.original.status);
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
      c: { key: 'prescriptionOrderNumber' },
      sortKey: 'prescriptionOrderNumber',
      header: () => t('label.number'),
      ...getNumberCell(),
    },
    {
      c: { key: 'prescriptionDatetime' },
      sortKey: 'prescriptionDatetime',
      header: () => t('label.prescription-date'),
      ...getDateCell(),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
  ];

  const crumbs = () => [{ label: t('prescriptions') }];

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
              data-testid="new-prescription-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('button.new-prescription')}
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
            <DeletePrescriptionOrdersAction
              storeId={params.storeId}
              selectedIds={selectedIds}
              statusOf={id => rows().find(row => row.id === id)?.status}
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
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        // Past-New rows take the read-only treatment — de-emphasised but
        // legible and clickable (ui-surface S1).
        rowState={row =>
          isEditable(asOrderStatus(row.status)) ? undefined : 'disabled'
        }
        emptyMessage={t('error.no-prescriptions')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
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
      <CreatePrescriptionOrderModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
    </Page>
  );
};

export default PrescriptionOrdersList;
