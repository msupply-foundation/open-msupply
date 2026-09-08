import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  Switch,
  Match,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useParams, useSearchParams } from '@solidjs/router';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Toolbar } from '@/ui/layout/Header/Toolbar';
import { Tabs, TabList, TabPanel } from '@/ui/elements/tabs/Tabs';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { Alert } from '@/ui/elements/feedback/Alert';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize } from '@/list/pageSize';
import {
  DEFAULT_STATE,
  DEFAULT_TAB,
  needsArrivalWindow,
  tabFromParam,
  withDefaultWindow,
  type MonitoringFilter,
  type MonitoringState,
} from './monitoringState';
import { filterFields } from './monitoringFilters';
import { ChartTab } from '../chart/ChartTab';
import { BreachesTab } from '../breaches/BreachesTab';
import { LogTab } from '../log/LogTab';
import { ImportFridgeTagAction } from '../import/ImportFridgeTagAction';
import type { ImportOutcome } from '../import/importFridgeTag';

// S1 — the Monitoring screen (spec/cold-chain-monitoring ui-surface S1): one
// screen, three tabs over the same temperature record — Chart · Breaches ·
// Log — sharing ONE filter set, so narrowing on one tab carries to the others
// (rules › the monitoring screen). The active tab (`?tab=`) and every filter
// (`?query=`) live in the address, so a filtered view is linkable and survives
// reload. Offered in full at every width: no chart-only phone screen.
//
// App bar: breadcrumb (Cold chain glyph / Monitoring); the import page action
// at the inline-end; the filter bar in the page-content row — it serves the
// chart as well as the two tables, so it lives here rather than in a table's
// own toolbar; the tab strip as the header's bottom edge. No footer, no side
// panel: a read surface with one per-row action.

const MonitoringScreen: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout. Every read is store-scoped server-side by it, and the
  // destination's gates — the vaccine module, then SENSOR_QUERY — are applied
  // before this screen by the router (spec/navigation).
  const params = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams<{
    tab?: string;
    query?: string;
  }>();
  const { query, setQuery } = useUrlQueryState<MonitoringState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });

  const tab = () => tabFromParam(searchParams.tab);
  // The first tab carries no param, keeping the base URL clean.
  const setTab = (value: string) =>
    setSearchParams({ tab: value === DEFAULT_TAB ? undefined : value });

  // A pristine arrival adopts the default 24-hour window and records it in
  // the address, so every tab then shares it (rules › the chart). An address
  // that already names a filter is honoured as written.
  onMount(() => {
    if (needsArrivalWindow(searchParams.query))
      setQuery({
        ...query(),
        filter: withDefaultWindow(query().filter, new Date()),
      });
  });

  // A filter edit resets both tables to their first page.
  const onFilterChange = (filter: MonitoringFilter) =>
    setQuery({ ...query(), filter, breachOffset: 0, logOffset: 0 });

  // Something outside the filters changed the record (an import): every tab's
  // resource keys on this, so the data shows without a reload (rules ›
  // importing a fridge-sensor file).
  const [refreshVersion, setRefreshVersion] = createSignal(0);
  const refresh = () => setRefreshVersion(v => v + 1);

  // The import's outcome, stated in place under the filter bar rather than as
  // a toast (ui-standards › action feedback). A success clears itself once
  // read; a failure stays until the next attempt.
  const [importOutcome, setImportOutcome] = createSignal<ImportOutcome>();
  let outcomeTimer: ReturnType<typeof setTimeout> | undefined;
  const onOutcome = (outcome: ImportOutcome) => {
    if (outcomeTimer) clearTimeout(outcomeTimer);
    setImportOutcome(outcome);
    if (outcome.kind === 'imported')
      outcomeTimer = setTimeout(() => setImportOutcome(undefined), 8000);
  };
  onCleanup(() => outcomeTimer && clearTimeout(outcomeTimer));

  // A marker's "View all breaches": the Breaches tab, sorted by breach start.
  const viewAllBreaches = () => {
    setQuery({
      ...query(),
      breachSort: [{ key: 'startDatetime', desc: true }],
      breachOffset: 0,
    });
    setTab('breaches');
  };

  const tabDefs = () => [
    { value: 'chart', label: t('label.chart') },
    { value: 'breaches', label: t('label.breaches') },
    { value: 'log', label: t('label.log') },
  ];

  return (
    <Tabs value={tab()} onValueChange={setTab}>
      <Page
        // The two tables fill and scroll themselves; the chart tab is
        // ordinary padded, scrolling content.
        fillBody={tab() !== 'chart'}
        header={
          <Header>
            <Breadcrumb crumbs={[{ label: t('monitoring') }]} />
            <HeaderButtons>
              <ImportFridgeTagAction
                storeId={params.storeId}
                onOutcome={onOutcome}
                onImported={refresh}
                onNarrow={onFilterChange}
              />
            </HeaderButtons>
            <Toolbar>
              <FilterBar
                filters={filterFields()}
                filter={query().filter}
                onChange={onFilterChange}
              />
            </Toolbar>
            <Show when={importOutcome()}>
              {outcome => (
                <Toolbar>
                  <Switch>
                    <Match when={outcome().kind === 'imported' && outcome()}>
                      {o => (
                        <Alert
                          severity="success"
                          testId="import-fridge-tag-outcome"
                        >
                          {t('messages.fridge-tag-import-successful', {
                            numberOfLogs:
                              o().kind === 'imported'
                                ? (
                                    o() as Extract<
                                      ImportOutcome,
                                      { kind: 'imported' }
                                    >
                                  ).response.numberOfLogs
                                : 0,
                            numberOfBreaches:
                              o().kind === 'imported'
                                ? (
                                    o() as Extract<
                                      ImportOutcome,
                                      { kind: 'imported' }
                                    >
                                  ).response.numberOfBreaches
                                : 0,
                          })}
                        </Alert>
                      )}
                    </Match>
                    <Match when={outcome().kind === 'empty'}>
                      {/* Neither readings nor breaches: a failure, not an empty
                          success (rules; `.35`/`.36`). */}
                      <Alert
                        severity="error"
                        testId="import-fridge-tag-outcome"
                      >
                        {t('error.fridge-tag-import', {
                          message: t('error.fridge-tag-import-empty'),
                        })}
                      </Alert>
                    </Match>
                    <Match when={outcome().kind === 'failed' && outcome()}>
                      {o => (
                        <Alert
                          severity="error"
                          testId="import-fridge-tag-outcome"
                        >
                          {t('error.fridge-tag-import', {
                            message:
                              o().kind === 'failed'
                                ? (
                                    o() as Extract<
                                      ImportOutcome,
                                      { kind: 'failed' }
                                    >
                                  ).message
                                : '',
                          })}
                        </Alert>
                      )}
                    </Match>
                  </Switch>
                </Toolbar>
              )}
            </Show>
            <TabList tabs={tabDefs()} />
          </Header>
        }
      >
        <TabPanel value="chart">
          <ChartTab
            storeId={params.storeId}
            filter={query().filter}
            refreshVersion={refreshVersion()}
            onViewAllBreaches={viewAllBreaches}
          />
        </TabPanel>
        <TabPanel value="breaches">
          <BreachesTab
            storeId={params.storeId}
            state={query()}
            setState={setQuery}
            refreshVersion={refreshVersion()}
          />
        </TabPanel>
        <TabPanel value="log">
          <LogTab
            storeId={params.storeId}
            state={query()}
            setState={setQuery}
            refreshVersion={refreshVersion()}
          />
        </TabPanel>
      </Page>
    </Tabs>
  );
};

export default MonitoringScreen;
