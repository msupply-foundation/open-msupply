import { createMemo, createResource, createSignal, Show } from 'solid-js';
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
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { CloseIcon, PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import { Prescriptions } from './prescriptions.generated';
import type {
  PrescriptionsVariables,
  PrescriptionsResult,
} from './prescriptions.generated';
import { savePrescription } from '../detail/prescriptionUpdate';
import {
  asPrescriptionStatus,
  isReadOnly,
  prescriptionDateOf,
  statusColour,
  statusLabel,
} from '../prescriptionStatus';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import { filterFields, type PrescriptionFilter } from './listFilters';
import { CreatePrescriptionModal } from './CreatePrescriptionModal';
import {
  DeletePrescriptionsAction,
  ExportPrescriptionsAction,
} from './actions';

// The prescriptions list (spec/prescriptions/ui-surface.md S1): the standard
// list screen over `invoices` pinned to type PRESCRIPTION. Read-only rows
// (VERIFIED/CANCELLED) are dimmed but stay clickable (AC-L3); the colour
// swatch on the Name column edits in place while the row is editable; default
// sort is the prescription date (backdated-or-created), newest first (AC-L1).

const DEFAULT_PAGE_SIZE = 20;

type PrescriptionRow = PrescriptionsResult['invoices']['nodes'][number];
type SortKey = NonNullable<PrescriptionsVariables['sort']>[number]['key'];

type PrescriptionsListState = {
  filter: PrescriptionFilter;
  /** Typed per-custom-field filter values → the dynamicFilter AST at query time. */
  cf?: CustomFieldFilterState;
  sort?: PrescriptionsVariables['sort'];
  offset: number;
  first: number;
};

// Name + the date pair are on by default (S1): their keys are pre-seeded as
// added-but-empty (null) so their chips show; stripEmpty keeps them off the
// wire until they hold a value.
const DEFAULT_STATE: PrescriptionsListState = {
  filter: { otherPartyName: null, createdOrBackdatedDatetime: null },
  sort: [{ key: 'invoiceDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const PrescriptionsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } =
    useUrlQueryState<PrescriptionsListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);

  const tableConfig = createTableConfig({
    tableId: 'prescriptions',
    defaultConfig: {
      compact: {
        // Narrow viewports default to the card view with the number hidden —
        // patient + status lead the card (the stocktakes compact default).
        viewMode: 'card',
        columnVisibility: { invoiceNumber: false },
      },
    },
  });

  // Custom-field definitions for the prescription scope — shared scope-keyed
  // cache, read non-suspending. Empty ⇒ no custom-field columns/filters.
  const cfReader = customFieldDefinitions('prescription');
  const cfDefs = () => cfReader.noSuspense();
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));
  const onCustomFieldChange = (cf: CustomFieldFilterState) => {
    setQuery({ ...query(), cf, offset: 0 });
    setSelectedIds([]);
  };

  // The list always pins the invoice type (contract § the list); the user's
  // filters merge over that.
  const variables = createMemo<PrescriptionsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      type: { equalTo: 'PRESCRIPTION' },
      // Custom-field filters become the dynamicFilter AST (undefined = no-op).
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf),
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
        Prescriptions,
        JSON.parse(serialised) as PrescriptionsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.invoices;
    }
  );
  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  // Exactly ONE sort key is ever sent (contract wire trap — the server
  // honours only the last; AC-L2).
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: PrescriptionFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: PrescriptionRow) =>
    navigate(`/${params.storeId}/dispensary/prescription/${row.id}`);

  const rowStatus = (row: Pick<PrescriptionRow, 'status'>) =>
    asPrescriptionStatus(row.status);

  // The in-place colour save (S1: the swatch edits while the row is editable).
  // The list re-queries afterwards so the row reflects the stored colour
  // (kdd/state-management: refresh by direct call).
  const saveColour = async (row: PrescriptionRow, colour: string) => {
    await savePrescription(params.storeId, { id: row.id, colour });
    void refetch();
  };

  const columns = (): Column<PrescriptionRow, SortKey>[] => [
    {
      c: { key: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: () => t('label.name'),
      cell: info => {
        const row = info.row.original;
        return (
          <Show
            when={!isReadOnly(rowStatus(row))}
            fallback={
              <>
                <ColourTagDot colour={row.colour ?? null} />
                {row.otherPartyName}
              </>
            }
          >
            <ColourTagPicker
              colour={row.colour ?? null}
              variant="row"
              label={t('label.color')}
              onSelect={colour => void saveColour(row, colour)}
            />
            {row.otherPartyName}
          </Show>
        );
      },
      meta: { headerPosition: 'primary' },
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      cell: info => {
        const status = rowStatus(info.row.original);
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
      // The prescription date — backdated when set, else created (AC-L1); its
      // server sort key is the same coalescence.
      c: { accessor: prescriptionDateOf, id: 'prescriptionDatetime' },
      sortKey: 'invoiceDatetime',
      header: () => t('label.prescription-date'),
      ...getDateCell(),
    },
    {
      c: { key: 'theirReference' },
      sortKey: 'theirReference',
      header: () => t('label.reference'),
    },
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCommentCell(),
    },
    // A column per configured prescription custom field (AC-CF4) — not
    // sortable; value chosen by kind.
    ...customFieldColumns<PrescriptionRow, SortKey>(
      cfDefs(),
      row => row.customFields
    ),
  ];

  const crumbs = () => [
    { label: t('dispensary') },
    { label: t('prescriptions') },
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
              data-testid="new-prescription-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('button.new-prescription')}
            </Button>
            <ExportPrescriptionsAction
              storeId={params.storeId}
              filter={() => query().filter}
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
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeletePrescriptionsAction
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
        // Read-only rows take the disabled state — de-emphasised but legible
        // and clickable (AC-L3); matches the outbound list post table-styling.
        rowState={row => (isReadOnly(rowStatus(row)) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-prescriptions')}
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
      <CreatePrescriptionModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
    </Page>
  );
};

export default PrescriptionsList;
