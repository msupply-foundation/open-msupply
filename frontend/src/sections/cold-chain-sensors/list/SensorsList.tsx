import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { formatNumber, localisedDateTime, t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HStack } from '@/ui/layout/Stack/HStack';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { StatusMarker } from '@/ui/elements/feedback/StatusMarker';
import { ToggleSwitch } from '@/ui/elements/inputs/ToggleSwitch';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { SunIcon, ThermometerIcon } from '@/ui/icons';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize, rememberPageSize } from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { SensorsList as SensorsListQuery } from '../sensors.generated';
import type { SensorsListVariables } from '../sensors.generated';
import { filterFields } from './listFilters';
import {
  DEFAULT_STATE,
  SORTABLE_KEYS,
  buildListVariables,
  type SensorsListState,
  type SensorSortKey,
  type SensorUserFilter,
} from './listState';
import {
  ABSENT,
  breachLabelKey,
  breachParts,
  displaySerial,
  equipmentNumbers,
  fullBreachLabelKey,
  latestReadingDatetime,
  latestTemperature,
  sensorTypeLabelKey,
  type SensorRow,
} from './sensorDisplay';
import { SensorEditModal } from './SensorEditModal';

// S1 — the sensor list (spec/cold-chain-sensors, ui-surface S1). The standard
// list screen: data + URL-backed filter/sort/pagination state from the
// vertical, UI from the library components, no page CSS.
//
// Anchors: spec/cold-chain-sensors/cases/OMS-REG-CCE-03 — `.n` below.
//
// Deliberately absent (ui-surface S1 § layout): page actions — devices register
// themselves, so there is nothing to create here and nothing to export; row
// selection and bulk actions — there is nothing to do to sensors in bulk, and
// no delete exists anywhere in the schema (.41). A row click opens the
// details modal (S2); there is no detail screen.

// Sortable columns are typed to the generated sort-field union — only serial
// and name exist (.3/.4; kdd/type-safety). SORTABLE_KEYS is the same set as a
// value, so the column definitions below and the test read one list.
type SortKey = SensorSortKey;

/**
 * The arrival hand-off (rules › arrival from an import): the fridge-tag import
 * navigates here with the newly registered sensor's id in `edit`, so the user
 * lands with its editor already open, ready to name and place it (.49).
 */
const EDIT_PARAM = 'edit';

const SensorsList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout. The query is store-scoped server-side by it (.1), and
  // the destination's own gates — the vaccine module, then SENSOR_QUERY — are
  // applied before this screen by the router (spec/navigation); this vertical
  // renders no permission state of its own.
  const params = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams<{ edit?: string }>();
  const { query, setQuery } = useUrlQueryState<SensorsListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  // The S2 modal's opening state — the clicked row, or null. Mounted fresh per
  // open (<Show> below), so the form seeds once.
  const [editing, setEditing] = createSignal<SensorRow | null>(null);

  const tableConfig = createTableConfig({
    tableId: 'sensors',
    defaultConfig: { compact: { viewMode: 'card' } },
  });

  const variables = createMemo<SensorsListVariables>(() =>
    buildListVariables(query(), params.storeId)
  );

  // Global resource-style fetch (kdd/state-management): codegen output through
  // the single never-throwing query method; failures surface globally. The
  // resource SOURCE is the SERIALISED variables (a stable string), so states
  // with identical query content don't refetch.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        SensorsListQuery,
        JSON.parse(serialised) as SensorsListVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.sensors;
    }
  );

  // The gated read, NOT `data()` and not `.latest` alone: `gated` yields a
  // value only once one has resolved, so nothing here can suspend — the table
  // mounts immediately with its own loading treatment instead of blanking the
  // page into the router's fallback-less <Suspense> (kdd/solid-reactivity-
  // pitfalls § no remounts, rule 2 — `.latest` suspends on the FIRST pending
  // read, which is exactly this screen's arrival).
  const page = () => gated(data);
  const rows = (): SensorRow[] => page()?.nodes ?? [];
  const totalCount = () => page()?.totalCount ?? 0;

  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  /*
   * The hand-off, consumed ONCE (.50). The id is cleared from the URL as the
   * modal opens, so re-reading, resharing or restoring the address does not
   * re-open it — and closing the modal cannot re-trigger this, because the
   * parameter it reads is already gone.
   *
   * An effect, because opening the modal and rewriting the address are side
   * effects, not a derived value. It settles: clearing the parameter re-runs it
   * once, and the re-run returns on the first line. An id naming no sensor in
   * the loaded page simply opens nothing.
   */
  createEffect(() => {
    const id = searchParams[EDIT_PARAM];
    if (!id) return;
    const sensor = rows().find(row => row.id === id);
    if (!sensor) return;
    setSearchParams({ [EDIT_PARAM]: undefined }, { replace: true });
    setEditing(sensor);
  });

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: SensorUserFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  // Columns are an accessor: their text comes from t(), which must be read in a
  // reactive scope to re-translate on a language switch.
  const columns = (): Column<SensorRow, SortKey>[] => [
    {
      c: { key: 'name' },
      sortKey: SORTABLE_KEYS[0],
      header: () => t('label.name'),
      // The text (flex-sink) preset; card view: the name is the card's title.
      ...getCellDefinition('name', { headerPosition: 'primary' }),
    },
    {
      // In service or retired. The WORD carries the state — a sensor is never
      // deleted, so this column is how a retired one reads (.39/.40).
      c: {
        accessor: row =>
          row.isActive ? t('label.active') : t('label.inactive'),
        id: 'status',
      },
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(6),
    },
    {
      // The equipment recorded AT the sensor's location — empty when it has no
      // location, because equipment hangs off the location (.46/.47).
      c: { accessor: equipmentNumbers, id: 'cce' },
      header: () => t('label.cce'),
      ...getTextCell(),
      size: remToPx(7),
    },
    {
      // The location's CODE, not its name — the `location` preset is sized and
      // typed for exactly that.
      c: { accessor: row => row.location?.code ?? '', id: 'location' },
      header: () => t('label.location'),
      ...getCellDefinition('location'),
    },
    {
      // Identity part only; the server's strip leaves a trailing space
      // (.38, contract ⚠️ wire trap).
      c: { accessor: row => displaySerial(row.serial), id: 'serial' },
      sortKey: SORTABLE_KEYS[1],
      header: () => t('label.serial'),
      ...getTextCell(),
      size: remToPx(11),
    },
    {
      // A dash, not blank: beside a percentage, blank reads as a value that
      // failed to load (ui-surface S1 § columns).
      c: {
        accessor: row =>
          row.batteryLevel == null
            ? ABSENT
            : `${formatNumber(row.batteryLevel)}%`,
        id: 'battery',
      },
      header: () => t('label.battery-level'),
      ...getTextCell({ align: 'right' }),
      size: remToPx(6),
    },
    {
      // Degrees Celsius, two decimals, formatted for the locale. Dash when the
      // sensor has never reported (.42/.43).
      c: {
        accessor: row => {
          const temperature = latestTemperature(row);
          return temperature === undefined
            ? ABSENT
            : formatNumber(temperature, {
                style: 'unit',
                unit: 'celsius',
                unitDisplay: 'short',
                maximumFractionDigits: 2,
              });
        },
        id: 'lastReading',
      },
      header: () => t('label.last-reading'),
      ...getTextCell({ align: 'right' }),
      size: remToPx(7),
    },
    {
      // When that reading was taken — blank, not a dash, when there is none:
      // the column is a date, and its own row in ui-surface says blank.
      c: {
        accessor: row => {
          const datetime = latestReadingDatetime(row);
          return datetime ? localisedDateTime(datetime) : '';
        },
        id: 'lastRecording',
      },
      header: () => t('label.date-time'),
      // The column's meaning beyond its two-word header (ui-surface S1). Meta,
      // where a column declares its header tooltip text.
      ...getTextCell({ description: t('description.last-reading-datetime') }),
      size: remToPx(9),
    },
    {
      c: {
        accessor: row => t(sensorTypeLabelKey(row.type)),
        id: 'sensorType',
      },
      header: () => t('label.sensor-type'),
      ...getTextCell(),
      size: remToPx(7),
    },
    {
      // The ONGOING breach only — empty when nothing is ongoing (.45). The
      // toned marker distinguishes hot from cold and carries the breach's full
      // name as its accessible label, so the tone is never the only carrier;
      // the visible word is the duration half.
      c: { key: 'breach' },
      header: () => t('label.breach-type'),
      ...getTextCell({ description: t('description.breach-type') }),
      size: remToPx(8),
      cell: info => {
        const breach = info.getValue<SensorRow['breach']>();
        if (!breach) return '';
        const hot = breachParts(breach).hot;
        return (
          <HStack gap="sm">
            <StatusMarker
              severity={hot ? 'warning' : 'info'}
              icon={hot ? SunIcon : ThermometerIcon}
              label={t(fullBreachLabelKey(breach))}
            />
            {t(breachLabelKey(breach))}
          </HStack>
        );
      },
    },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          {/* No page actions: nothing is created, exported or deleted here
              (ui-surface S1 § layout). */}
          <Breadcrumb crumbs={[{ label: t('sensors') }]} />
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // toolbar), state stays URL-backed here. The active-only restriction
        // rides the same bar but stands apart from the chips: it is already on,
        // and it is not something the user adds or removes (rules › reading the
        // list).
        filters={
          <HStack justify="between" wrap>
            <FilterBar
              filters={filterFields()}
              filter={query().filter}
              onChange={onFilterChange}
            />
            <ToggleSwitch
              label={t('label.active-only')}
              testId="active-only-toggle"
              checked={query().activeOnly}
              onChange={activeOnly =>
                setQuery({ ...query(), activeOnly, offset: 0 })
              }
            />
          </HStack>
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={setEditing}
        emptyMessage={t('error.no-sensors')}
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
      <Show when={editing()}>
        {sensor => (
          <SensorEditModal
            storeId={params.storeId}
            sensor={sensor()}
            onClose={() => setEditing(null)}
            onSaved={() => void refetch()}
          />
        )}
      </Show>
    </Page>
  );
};

export default SensorsList;
