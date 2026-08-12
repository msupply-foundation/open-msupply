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
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getFlagCell,
} from '../../../ui/elements/table/tableHelpers';
import { getChipListCell } from '../../../ui/elements/table/ChipListCell';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { initialPageSize, rememberPageSize } from '../../../list/pageSize';
import { stripEmpty } from '../../../typeHelpers';
import { hasPermission, patientPreferences } from '../../../store/storeContext';
import { genderLabel } from '../../../domain/patient';
import { Patients } from './patients.generated';
import type { PatientsVariables, PatientsResult } from './patients.generated';
import { filterFields, type PatientFilter } from './listFilters';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';
import { CreatePatientModal } from './CreatePatientModal';
import { ExportPatientsAction } from './actions';

// The patient list view (spec/patients S1). Site-wide (NOT store-scoped despite
// storeId — contract › visibility wire trap), server-paginated, default sort by
// creation date descending. Composed from library components (Page / Header /
// FilterBar / DataTable / Pagination), so the page owns no CSS. Row selection
// is OFF — patients have no delete (spec/patients cross-cutting › no delete).

const DEFAULT_PAGE_SIZE = 20;

type PatientRow = PatientsResult['patients']['nodes'][number];
type SortKey = NonNullable<PatientsVariables['sort']>[number]['key'];

type PatientsListState = {
  filter: PatientFilter;
  /**
   * Custom-field filter values (per key), converted to the dynamicFilter AST.
   */
  cf?: CustomFieldFilterState;
  sort?: PatientsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: newest by creation (AC-L1). Filter seeds the three
// default-shown chips (First name / Last name / Patient ID) present-as-null so
// they render on a pristine list (AC-L2); stripEmpty drops them from the query
// until typed.
const DEFAULT_STATE: PatientsListState = {
  filter: { firstName: null, lastName: null, identifier: null },
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const PatientsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<PatientsListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [createOpen, setCreateOpen] = createSignal(false);

  // Create/edit affordances are gated on patient-mutate permission (AC-E1);
  // hidden when absent (spec/patients cross-cutting).
  const canMutate = () => hasPermission('PATIENT_MUTATE');

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the two controls that trigger it (the header button
  // and the ghost button in the table's empty slot); each carries
  // `shortcut={ALT_N}` for its badge. Gated on the same permission that hides
  // both, and on nothing else — KB-R2's "gated on the thing it acts on being
  // present".
  createAddAction({
    name: 'button.new-patient',
    run: () => setCreateOpen(true),
    disabled: () => !canMutate(),
  });

  const tableConfig = createTableConfig({
    tableId: 'patients',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: {
          code2: false,
          nextOfKinName: false,
          isDeceased: false,
          programEnrolments: false,
        },
      },
    },
  });

  // Custom-field definitions for the patient scope — the shared scope-keyed
  // cache, read NON-SUSPENDING (kdd/solid-reactivity-pitfalls). Empty ⇒ no
  // custom-field columns and no custom-field filters (spec/patients ui-surface;
  // rules § list).
  const cfReader = customFieldDefinitions('patient');
  const cfDefs = () => cfReader.noSuspense();
  // Stable Filter identities across edits (FilterBar keys chips by reference —
  // rebuilding would remount and drop focus).
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));

  const variables = createMemo<PatientsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      // Custom-field filters become the dynamicFilter AST (undefined = no-op).
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf),
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Patients,
        JSON.parse(serialised) as PatientsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.patients;
    }
  );

  // Read `.latest` (non-suspending), never `data()` — see the stocktakes list
  // note (kdd/solid-reactivity-pitfalls rule 1).
  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: PatientFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  const onCustomFieldChange = (cf: CustomFieldFilterState) =>
    setQuery({ ...query(), cf, offset: 0 });

  const openRow = (row: PatientRow) =>
    navigate(`/${params.storeId}/dispensary/patients/${row.id}`);

  // The program-enrolments chip column (program module only, AC-G2): one chip
  // per enrolment as "{registry name} ({enrolment id})". The registry name is
  // the enrolment `type`; the document `name` carries a `p/{patientId}/` prefix
  // and is never shown.
  const enrolmentLabels = (row: PatientRow): string[] =>
    row.programEnrolments.nodes.map(n =>
      n.programEnrolmentId ? `${n.type} (${n.programEnrolmentId})` : n.type
    );

  // Cell-type presets carry each column's rendering AND its width
  // (ui/docs/CELL_TYPES.md): getCellDefinition where the shared CELL_DEF map
  // has the key, an explicit helper + a call-site `size` where it doesn't
  // (the flag and chip-list cells, which need an argument).
  const columns = (): Column<PatientRow, SortKey>[] => [
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: () => t('label.patient-id'),
      ...getCellDefinition('code', { headerPosition: 'primary' }),
    },
    {
      c: { key: 'code2' },
      sortKey: 'code2',
      header: () => t('label.patient-nuic'),
      ...getCellDefinition('code2'),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      c: { key: 'firstName' },
      sortKey: 'firstName',
      header: () => t('label.first-name'),
      ...getCellDefinition('firstName'),
    },
    {
      c: { key: 'lastName' },
      sortKey: 'lastName',
      header: () => t('label.last-name'),
      ...getCellDefinition('lastName'),
    },
    {
      // The preset is spread FIRST so the label cell overrides its (absent)
      // renderer while keeping the short-text width.
      c: { key: 'gender' },
      sortKey: 'gender',
      header: () => t('label.gender'),
      ...getCellDefinition('gender'),
      cell: info => {
        const g = info.getValue<PatientRow['gender']>();
        return g ? genderLabel(g) : '';
      },
    },
    {
      c: { key: 'dateOfBirth' },
      sortKey: 'dateOfBirth',
      header: () => t('label.date-of-birth'),
      ...getCellDefinition('dateOfBirth'),
    },
    {
      c: { key: 'nextOfKinName' },
      header: () => t('label.next-of-kin'),
      ...getCellDefinition('nextOfKinName'),
    },
    ...(patientPreferences().programModule
      ? [
          {
            c: {
              accessor: (row: PatientRow) => enrolmentLabels(row),
              id: 'programEnrolments',
            },
            header: () => t('label.program-enrolments'),
            ...getChipListCell<PatientRow>(),
            // The chip-list kind's default width (KIND_WIDTH.chipList).
            size: remToPx(12),
          } satisfies Column<PatientRow, SortKey>,
        ]
      : []),
    {
      c: { key: 'isDeceased' },
      header: () => t('label.deceased'),
      ...getFlagCell(t('label.deceased')),
      // A marker cell is narrow; the header word is the binding constraint.
      size: remToPx(5.5),
    },
    // Configured custom-field columns — not sortable; value chosen by kind
    // (option → resolved name, number/date → localised).
    ...customFieldColumns<PatientRow, SortKey>(
      cfDefs(),
      row => row.customFields
    ),
  ];

  const crumbs = () => [{ label: t('label.patients') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Show when={canMutate()}>
              <Button
                icon={<PlusCircleIcon />}
                shortcut={ALT_N}
                data-testid="new-patient-button"
                onClick={() => setCreateOpen(true)}
              >
                {t('button.new-patient')}
              </Button>
            </Show>
            <ExportPatientsAction
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
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // One filter menu, in the table's OWN toolbar — never the page header
        // (ui-standards/tables § Toolbar, binding). The default patient
        // filters plus the patient scope's configured custom-field filters as
        // the bar's second group (spec/patients rules § list).
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
        emptyMessage={t('error.no-patients')}
        empty={
          <Show when={canMutate()}>
            <Button
              variant="ghost"
              shortcut={ALT_N}
              data-testid="nothing-here-create-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('button.create-a-new-one')}
            </Button>
          </Show>
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
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
      <CreatePatientModal
        open={createOpen()}
        storeId={params.storeId}
        onClose={() => setCreateOpen(false)}
      />
    </Page>
  );
};

export default PatientsList;
