import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { PlusCircleIcon } from '@/ui/icons';
import { remToPx } from '@/ui/utils/rem';
import { useUrlQueryState } from '@/list/urlQueryState';
import { stripEmpty } from '@/typeHelpers';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { RnrForms } from './rnrForms.generated';
import type {
  RnrFormsVariables,
  RnrFormRowFragment,
} from './rnrForms.generated';
import { isFinalised, statusLabel, STATUS_COLOURS } from './rnrFormStatus';
import { filterFields, type RnrFormFilter } from './listFilters';
import { DeleteRnrFormsAction } from './actions/DeleteRnrFormsAction';
import { RnrFormCreateModal } from './create/RnrFormCreateModal';

// The R&R forms list (spec/rnr-forms/ui-surface.md S1): the store's forms,
// newest created first, with the Created filter chip, the New form create
// modal and the draft-only bulk delete.

type SortKey = NonNullable<RnrFormsVariables['sort']>['key'];

type RnrFormsListState = {
  filter: RnrFormFilter;
  sort: NonNullable<RnrFormsVariables['sort']>;
  offset: number;
  first: number;
};

// Default sort: created, newest first (ui-surface S1 § columns).
const DEFAULT_STATE: RnrFormsListState = {
  filter: {},
  sort: { key: 'createdDatetime', desc: true },
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const RnrFormsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<RnrFormsListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);

  // stripEmpty drops added-but-empty filter chips (held as null keys) so an
  // empty chip does not change the effective filter or reflash the list.
  const variables = (): RnrFormsVariables => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  });

  // Read via `.latest` only — never a suspending read on this screen
  // (kdd/solid-reactivity-pitfalls).
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        RnrForms,
        JSON.parse(serialised) as RnrFormsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.rAndRForms;
    }
  );

  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;
  const selectedRows = () =>
    rows().filter(row => selectedIds().includes(row.id));

  const currentSort = (): SortState<SortKey> => ({
    key: query().sort.key,
    desc: query().sort.desc ?? false,
  });

  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: { key, desc }, offset: 0 });
  };

  const onFilterChange = (filter: RnrFormFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
  };

  // The bulk delete is drafts-only (rules § deleting); the action opens
  // blocked-and-explaining when this is false (OMS-REG-REPL-07.48).
  const canDelete = () => !selectedRows().some(row => isFinalised(row.status));

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: RnrFormRowFragment) =>
    navigate(`/${params.storeId}/replenishment/r-and-r-forms/${row.id}`);

  // OMS-REG-REPL-07.4: the New form button opens the creation modal.
  const openCreate = () => setCreateOpen(true);
  createAddAction({ name: 'button.new-form', run: openCreate });

  const tableConfig = createTableConfig({
    tableId: 'rnr-forms',
    defaultConfig: { compact: { viewMode: 'card' } },
  });

  // Columns per ui-surface S1 § columns. The Period column sorts by the real
  // `period` server key (the reference client's created-datetime mis-map is a
  // recorded defect, not behaviour to copy).
  const columns = (): Column<RnrFormRowFragment, SortKey>[] => [
    {
      c: { accessor: row => row.period.name, id: 'period' },
      sortKey: 'period',
      header: () => t('label.period'),
      // The 'name' preset: the card-primary text column's width sink.
      ...getCellDefinition('name', { headerPosition: 'primary' }),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      // 'campaign' is the documented preset for "a campaign OR program name".
      c: { key: 'programName' },
      sortKey: 'program',
      header: () => t('label.program-name'),
      ...getCellDefinition('campaign'),
    },
    {
      c: { key: 'supplierName' },
      sortKey: 'supplierName',
      header: () => t('label.supplier'),
      ...getCellDefinition('supplierName'),
    },
    {
      c: { key: 'status' },
      header: () => t('label.status'),
      cell: info => (
        <StatusChip
          label={statusLabel(info.row.original.status)}
          colour={STATUS_COLOURS[info.row.original.status]}
        />
      ),
      meta: { headerPosition: 'badge' },
      // Status chips are page-rendered; the page supplies the chip column's
      // width pair (ui docs › CELL_TYPES § inventory).
      size: remToPx(7.5),
      maxSize: remToPx(9.375),
    },
  ];

  const crumbs = () => [{ label: t('r-and-r-forms') }];

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
              data-testid="new-rnr-form-button"
              onClick={openCreate}
            >
              {t('button.new-form')}
            </Button>
          </HeaderButtons>
        </Header>
      }
    >
      {/* Mounted only while open, so its resources first fetch inside it and
          each open starts from a fresh prefill (kdd/action-modal). */}
      <Show when={createOpen()}>
        <RnrFormCreateModal
          storeId={params.storeId}
          onClose={() => setCreateOpen(false)}
          onCreated={id =>
            navigate(`/${params.storeId}/replenishment/r-and-r-forms/${id}`)
          }
        />
      </Show>
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
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // OMS-REG-REPL-07.48: finalised rows read as inactive (still open).
        rowState={row => (isFinalised(row.status) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-rnr-forms')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            onClick={openCreate}
          >
            {t('button.new-form')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        selectionActions={
          <DeleteRnrFormsAction
            storeId={params.storeId}
            selectedIds={selectedIds}
            canDelete={canDelete}
            onDeleted={onDeleted}
          />
        }
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
    </Page>
  );
};

export default RnrFormsList;
