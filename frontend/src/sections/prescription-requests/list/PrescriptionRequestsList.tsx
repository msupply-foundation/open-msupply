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
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import { PrescriptionRequests } from './prescriptionRequests.generated';
import type {
  PrescriptionRequestsVariables,
  PrescriptionRequestsResult,
} from './prescriptionRequests.generated';
import {
  asRequestStatus,
  isEditable,
  statusColour,
  statusLabel,
} from '../prescriptionRequestStatus';
import { filterFields, type PrescriptionRequestFilter } from './listFilters';
import { CreatePrescriptionRequestModal } from './CreatePrescriptionRequestModal';
import { DeletePrescriptionRequestsAction } from './actions/DeletePrescriptionRequestsAction';
import { ExportPrescriptionRequestsAction } from './actions/ExportPrescriptionRequestsAction';

// The prescription-requests list (spec/prescription-requests/ui-surface.md S1):
// the standard list screen over prescriptionRequests. Past-New rows take the
// read-only row treatment but stay clickable; default sort is created
// datetime, newest first (AC-L1).

type RequestRow =
  PrescriptionRequestsResult['prescriptionRequests']['nodes'][number];
type SortKey = NonNullable<
  PrescriptionRequestsVariables['sort']
>[number]['key'];

type PrescriptionRequestsListState = {
  filter: PrescriptionRequestFilter;
  /**
   * Typed per-custom-field filter values → the dynamicFilter AST at query
   * time.
   */
  cf?: CustomFieldFilterState;
  sort?: PrescriptionRequestsVariables['sort'];
  offset: number;
  first: number;
};

// Patient + the date range are on by default (S1): their keys are pre-seeded
// as added-but-empty (null) so their chips show; stripEmpty keeps them off
// the wire until they hold a value.
const DEFAULT_STATE: PrescriptionRequestsListState = {
  filter: { patientName: null, prescriptionDatetime: null },
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const PrescriptionRequestsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<PrescriptionRequestsListState>({
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
    tableId: 'prescription-requests',
    defaultConfig: {
      base: {
        columnVisibility: { createdDatetime: false },
      },
      compact: {
        // Narrow viewports default to the card view with the number hidden —
        // patient + status lead the card.
        viewMode: 'card',
        columnVisibility: {
          prescriptionRequestNumber: false,
          createdDatetime: false,
        },
      },
    },
  });

  // Custom-field definitions for the request scope — shared scope-keyed cache,
  // read non-suspending. Empty ⇒ no custom-field columns/filters.
  const cfReader = customFieldDefinitions('prescription_request');
  const cfDefs = () => cfReader.noSuspense();
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));
  const onCustomFieldChange = (cf: CustomFieldFilterState) => {
    setQuery({ ...query(), cf, offset: 0 });
    setSelectedIds([]);
  };

  const variables = createMemo<PrescriptionRequestsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      // Custom-field filters become the dynamicFilter AST (undefined = no-op).
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf, cfDefs()),
    },
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
        PrescriptionRequests,
        JSON.parse(serialised) as PrescriptionRequestsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.prescriptionRequests;
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

  const onFilterChange = (filter: PrescriptionRequestFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: RequestRow) =>
    navigate(`/${params.storeId}/dispensary/prescription-request/${row.id}`);

  const columns = (): Column<RequestRow, SortKey>[] => [
    // The request number leads the table: it is how a paper script and a
    // dispensary conversation identify the record, so it is what the eye
    // lands on first. The narrow-viewport card keeps Patient in the lead
    // instead (the number is hidden there — see the compact config above).
    {
      c: { key: 'prescriptionRequestNumber' },
      sortKey: 'prescriptionRequestNumber',
      header: () => t('label.number'),
      ...getNumberCell(),
    },
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
        const status = asRequestStatus(info.row.original.status);
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
    // Entered by — the account that created the request (rules § who is
    // recorded); a data-entry fact, not a claim about who prescribed. No
    // server sort key backs it, so it displays only; the matching filter is a
    // username contains-match (listFilters).
    {
      c: { accessor: row => row.user?.username ?? '', id: 'username' },
      header: () => t('label.entered-by'),
      enableSorting: false,
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
    // A column per configured request custom field (AC-CF4) — not sortable;
    // value chosen by kind.
    ...customFieldColumns<RequestRow, SortKey>(
      cfDefs(),
      row => row.customFields
    ),
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
            <ExportPrescriptionRequestsAction
              storeId={params.storeId}
              filter={() => query().filter}
              customFieldFilter={() => query().cf}
              customFields={cfDefs}
            />
          </HeaderButtons>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeletePrescriptionRequestsAction
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
            extra={{
              filters: cfFilters(),
              filter: query().cf ?? {},
              onChange: onCustomFieldChange,
            }}
          />
        }
        // Past-New rows take the read-only treatment — de-emphasised but
        // legible and clickable (ui-surface S1).
        rowState={row =>
          isEditable(asRequestStatus(row.status)) ? undefined : 'disabled'
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
      <CreatePrescriptionRequestModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
    </Page>
  );
};

export default PrescriptionRequestsList;
