import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import {
  hasPermission,
  prescriptionPreferences,
} from '../../../store/storeContext';
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
  getDateTimeCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import { HStack } from '../../../ui/layout/Stack/HStack';
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
import { shownPatientName } from '../patientName';
import { medicinesGiven } from './medicinesGiven';
import { CreatePrescriptionModal } from './CreatePrescriptionModal';
import {
  DeletePrescriptionsAction,
  ExportPrescriptionsAction,
} from './actions';
import { VerifyAllAction } from './actions/VerifyAllAction';

// The prescriptions list (spec/prescriptions/ui-surface.md S1): the standard
// list screen over `invoices` pinned to type PRESCRIPTION. Read-only rows
// (VERIFIED/CANCELLED) are dimmed but stay clickable (OMS-REG-DIS-03.51); the
// colour swatch on the Name column edits in place while the row is editable;
// default sort is the prescription date (backdated-or-created), newest first
// (OMS-REG-DIS-03.49).

type PrescriptionRow = PrescriptionsResult['invoices']['nodes'][number];
type SortKey = NonNullable<PrescriptionsVariables['sort']>[number]['key'];

type PrescriptionsListState = {
  filter: PrescriptionFilter;
  /**
   * Typed per-custom-field filter values → the dynamicFilter AST at query
   * time.
   */
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
  const { query, setQuery } = useUrlQueryState<PrescriptionsListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);
  // A new visit is dispensed the store's way (spec/prescriptions rules › the
  // Simple screen): where the store dispenses on the Simple screen, this list
  // is its Dispensing records, and a new record starts there instead.
  const simpleStore = () =>
    prescriptionPreferences().dispensingScreen === 'SIMPLE';
  const newRecord = () => {
    if (simpleStore())
      navigate(`/${params.storeId}/dispensary/dispensing/simple`);
    else setCreateOpen(true);
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2,
  // OMS-REG-KBD-01.14/.15). Declared by the SCREEN, once, for the two controls
  // that trigger it (the header button and the ghost button in the table's
  // empty slot); each carries `shortcut={ALT_N}` for its badge, neither owns
  // the action.
  createAddAction({
    name: 'button.new-dispensing-record',
    run: newRecord,
  });

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

  // The invoice type is pinned by the query's top-level `type` argument, which
  // both selects the permission and overwrites `filter.type` server-side — so
  // a filter pin here would be silently discarded (contract § the list). Only
  // the user's own filters travel in `filter`.
  const variables = createMemo<PrescriptionsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      // Custom-field filters become the dynamicFilter AST (undefined = no-op).
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf, cfDefs()),
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
    // The Medicines column's lines, only where it shows (rules › Dispensing
    // records).
    withMedicines: simpleStore(),
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
  // Exactly ONE sort key is ever sent (contract wire trap — the server
  // honours only the last; OMS-REG-DIS-03.50).
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

  // A store that dispenses on the Simple screen opens a past visit there
  // (rules › a dispensed visit); any other, on the record screen.
  const rowHref = (row: PrescriptionRow) =>
    simpleStore()
      ? `/${params.storeId}/dispensary/dispensing/simple/${row.id}`
      : `/${params.storeId}/dispensary/dispensing/${row.id}`;
  const openRow = (row: PrescriptionRow) => navigate(rowHref(row));

  const rowStatus = (row: Pick<PrescriptionRow, 'status'>) =>
    asPrescriptionStatus(row.status);

  // The in-place colour save (S1: the swatch edits while the row is editable).
  // The list re-queries afterwards so the row reflects the stored colour
  // (kdd/state-management: refresh by direct call).
  const saveColour = async (row: PrescriptionRow, colour: string) => {
    await savePrescription(params.storeId, { id: row.id, colour });
    void refetch();
  };

  // A Simple store's widths (ui-surface S1 › layout), in rem: each column
  // sized to what it holds, so the row fits a 1280px laptop with the side
  // menu and Medicines takes the room left. A Standard store keeps the
  // table's defaults.
  const width = (size: number, max = size) =>
    simpleStore() ? { size: remToPx(size), maxSize: remToPx(max) } : {};

  const columns = (): Column<PrescriptionRow, SortKey>[] => [
    {
      c: { key: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: () => t('label.name'),
      cell: info => {
        const row = info.row.original;
        return (
          <HStack gap="sm">
            <Show
              when={!isReadOnly(rowStatus(row))}
              fallback={<ColourTagDot colour={row.colour ?? null} />}
            >
              <ColourTagPicker
                colour={row.colour ?? null}
                variant="row"
                label={t('label.color')}
                onSelect={colour => void saveColour(row, colour)}
              />
            </Show>
            <span>
              {shownPatientName(row.otherPartyName, row.isForUnnamedPatient)}
            </span>
          </HStack>
        );
      },
      meta: { headerPosition: 'primary' },
      ...width(14, 15),
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
      ...width(8),
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: () => t('label.number'),
      ...getNumberCell(),
      // Wide enough for the header and its sort arrow on one line.
      ...width(6.5),
    },
    {
      // The prescription date — backdated when set, else created
      // (OMS-REG-DIS-03.49); its server sort key is the same coalescence.
      c: { accessor: prescriptionDateOf, id: 'prescriptionDatetime' },
      sortKey: 'invoiceDatetime',
      // A Simple store finds a visit by when it was (rules › Dispensing
      // records): the date and the time in one column, so sorting by it
      // orders the day's visits too.
      header: () =>
        simpleStore() ? t('label.dispensed') : t('label.dispensed-date'),
      ...(simpleStore() ? getDateTimeCell() : getDateCell()),
      ...width(9.5),
    },
    // And by what was given.
    ...(simpleStore()
      ? [
          {
            // One line, cut short; a clipped cell shows the whole list on
            // hover (the table's own reveal).
            c: {
              accessor: (row: PrescriptionRow) =>
                medicinesGiven(row.lines?.nodes ?? []),
              id: 'medicines',
            },
            header: () => t('label.medicines'),
            ...width(11.5, 22),
          } satisfies Column<PrescriptionRow, SortKey>,
        ]
      : []),
    {
      c: { key: 'theirReference' },
      sortKey: 'theirReference',
      header: () => t('label.reference'),
      ...width(6, 7),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
    // A column per configured prescription custom field (OMS-REG-DIS-03.43) —
    // not sortable; value chosen by kind.
    ...customFieldColumns<PrescriptionRow, SortKey>(
      cfDefs(),
      row => row.customFields
    ),
  ];

  const crumbs = () => [{ label: t('dispensing') }];

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
              onClick={newRecord}
            >
              {t('button.new-dispensing-record')}
            </Button>
            <ExportPrescriptionsAction
              storeId={params.storeId}
              withMedicines={simpleStore()}
              filter={() => query().filter}
              customFieldFilter={() => query().cf}
              customFields={cfDefs}
            />
            {/* A Simple store verifies a month's records together, when it
                does the monthly report (rules › verifying the month's
                records); a Standard store verifies each on its record. */}
            <Show when={simpleStore() && hasPermission('PRESCRIPTION_MUTATE')}>
              <VerifyAllAction
                storeId={params.storeId}
                onVerified={() => void refetch()}
              />
            </Show>
          </HeaderButtons>
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
        rowHref={rowHref}
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
        // Read-only rows take the disabled state — de-emphasised but legible
        // and clickable (OMS-REG-DIS-03.51); matches the outbound list post
        // table-styling.
        rowState={row => (isReadOnly(rowStatus(row)) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-dispensing-records')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            onClick={newRecord}
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
      <CreatePrescriptionModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
    </Page>
  );
};

export default PrescriptionsList;
