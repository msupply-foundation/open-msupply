import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { locale, t } from '../../../intl';
import type { LocaleKey } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { WidgetCard } from '../../../ui/elements/display/WidgetCard';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Text } from '../../../ui/elements/typography/Text';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { SidePanelSection } from '../../../ui/layout/SidePanel/SidePanel';
import { ReportsIcon } from '../../../ui/icons';
import { storeContext } from '../../../store/storeContext';
import { Reports } from '../api/reports.generated';
import type { ReportsResult, ReportsVariables } from '../api/reports.generated';
import { reportName } from '../reportName';

// S1 — the Reports dashboard (spec/reports S1, AC-X1/X3). NOT a list screen: a
// widget dashboard of clickable report cards grouped into category panels by
// sub-context, with a preferences side panel. The grouping and gating are
// entirely client-owned — the server only supplies context/sub-context values
// (spec/reports "Contexts"). Only general-context reports are fetched
// (context ∈ {REPORT, DISPENSARY}); record-context reports never appear here.

type ReportNode = Extract<
  ReportsResult['reports'],
  { __typename: 'ReportConnector' }
>['nodes'][number];

// The category panels, in display order. `subContexts` is the client-owned map
// from a report's free-form sub-context to a category (spec S1 table); a report
// whose sub-context matches none is dropped. `gate`:
//  - 'primary' — always rendered (the stable dashboard skeleton), even empty;
//  - 'ifAny'   — rendered only when it has cards (Other);
//  - 'programs'— rendered only when it has cards AND the store's program-module
//    preference is on (AC-X3).
type CategoryGate = 'primary' | 'ifAny' | 'programs';
type CategoryDef = {
  titleKey: LocaleKey;
  subContexts: readonly string[];
  gate: CategoryGate;
};

const CATEGORIES: readonly CategoryDef[] = [
  {
    titleKey: 'report.category.stock-and-items',
    subContexts: ['StockAndItems'],
    gate: 'primary',
  },
  {
    titleKey: 'report.category.distribution',
    subContexts: ['Distribution'],
    gate: 'primary',
  },
  {
    titleKey: 'report.category.replenishment',
    subContexts: ['Replenishment'],
    gate: 'primary',
  },
  { titleKey: 'report.category.other', subContexts: ['Other'], gate: 'ifAny' },
  {
    titleKey: 'report.category.programs',
    subContexts: ['HIVCareProgram', 'Vaccinations', 'Encounters'],
    gate: 'programs',
  },
];

// A read-only threshold-preference field for the side panel: the value is
// preferences-owned and shown here purely for reference (spec S1). Undefined
// while the store context is still loading — rendered blank.
const PrefField = (props: { label: string; value: number | undefined }) => (
  <TextField
    label={props.label}
    value={props.value ?? ''}
    readOnly
    width="short"
    helperText={t('report.side-panel.months')}
  />
);

const stackStyle = {
  display: 'flex',
  'flex-direction': 'column',
  gap: 'var(--space-3)',
} as const;

const ReportsPage: Component = () => {
  // storeId is guaranteed present (StoreGuardLayout resolves it before
  // routing).
  const params = useParams<{ storeId: string }>();
  // The preferences side panel opens by default and is closable (spec S1). S1
  // has no page actions, so there is no reopen affordance — closing hides it.
  const [panelOpen, setPanelOpen] = createSignal(true);

  // Only the standalone (general-context) reports, active ones. userLanguage is
  // the current UI locale so schema/name strings arrive translated (AC-R2).
  const variables = createMemo<ReportsVariables>(() => ({
    storeId: params.storeId,
    userLanguage: locale(),
    filter: {
      context: { equalAny: ['REPORT', 'DISPENSARY'] },
      isActive: true,
    },
  }));

  // Global resource-style fetch (kdd/state-management): keyed on the SERIALISED
  // variables (stable string) and read via `.latest`, which never suspends —
  // so a slow initial load shows the spinner below rather than blanking the
  // router's fallback-less boundary (kdd/solid-reactivity-pitfalls rule 1). A
  // failed load trips the global permission/error modal inside graphqlFetch
  // (AC-U5); the empty state sits behind it.
  const [reportsRes] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Reports,
        JSON.parse(serialised) as ReportsVariables
      );
      if (result.kind !== 'success') return undefined;
      const reports = result.data.reports;
      return reports.__typename === 'ReportConnector'
        ? reports.nodes
        : undefined;
    }
  );

  const reports = (): ReportNode[] => reportsRes.latest ?? [];
  const programModule = (): boolean =>
    !!storeContext()?.storePreferences.omProgramModule;

  // Group the reports into the ordered category panels. Programs reports are
  // only eligible when the module preference is on (AC-X3).
  const grouped = createMemo(() => {
    const module = programModule();
    return CATEGORIES.map(def => {
      const gatedOff = def.gate === 'programs' && !module;
      const nodes = gatedOff
        ? []
        : reports().filter(
            r => r.subContext != null && def.subContexts.includes(r.subContext)
          );
      return { def, nodes };
    });
  });

  // Total cards across every eligible category — 0 means "no reports available"
  // (the whole-page empty state, spec S1).
  const totalShown = (): number =>
    grouped().reduce((n, g) => n + g.nodes.length, 0);

  // Panels that render: primary categories always (even empty), Other/Programs
  // only when they hold cards (spec S1 gating table).
  const visible = () =>
    grouped().filter(g => g.def.gate === 'primary' || g.nodes.length > 0);

  const prefs = () => storeContext()?.storePreferences;

  const sidePanelContent = (
    <>
      <SidePanelSection
        title={t('report.side-panel.notification-preferences')}
        collapsible
      >
        <div style={stackStyle}>
          <PrefField
            label={t('report.side-panel.overstock')}
            value={prefs()?.monthsOverstock}
          />
          <PrefField
            label={t('report.side-panel.understock')}
            value={prefs()?.monthsUnderstock}
          />
          <PrefField
            label={t('report.side-panel.expiring')}
            value={prefs()?.monthsItemsExpire}
          />
        </div>
      </SidePanelSection>
      <SidePanelSection title={t('report.side-panel.custom')} collapsible>
        <div style={stackStyle}>
          <PrefField
            label={t('report.side-panel.stocktake-frequency')}
            value={prefs()?.stocktakeFrequency}
          />
          <PrefField
            label={t('report.side-panel.look-back')}
            value={prefs()?.monthlyConsumptionLookBackPeriod}
          />
          <PrefField
            label={t('report.side-panel.lead-time')}
            value={prefs()?.monthsLeadTime}
          />
        </div>
      </SidePanelSection>
    </>
  );

  return (
    <Page
      sidePanelOpen={panelOpen()}
      sidePanelTitle={t('report.side-panel.title')}
      onSidePanelClose={() => setPanelOpen(false)}
      sidePanelContent={sidePanelContent}
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('nav.reports') }]} />
        </Header>
      }
    >
      <Show
        when={totalShown() > 0}
        fallback={
          // Don't flash the empty state during the initial load — show the
          // spinner until the first fetch lands
          // (kdd/solid-reactivity-pitfalls).
          <Show
            when={reportsRes.loading}
            fallback={<EmptyState message={t('report.empty')} />}
          >
            <Spinner center />
          </Show>
        }
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: 'var(--space-5)',
          }}
        >
          <For each={visible()}>
            {group => (
              <section style={stackStyle}>
                <Text variant="heading" level={2}>
                  {t(group.def.titleKey)}
                </Text>
                <div
                  style={{
                    display: 'grid',
                    'grid-template-columns':
                      'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
                    gap: 'var(--space-4)',
                  }}
                >
                  <For each={group.nodes}>
                    {report => (
                      <WidgetCard
                        title={reportName(report)}
                        icon={<ReportsIcon />}
                        href={`/${params.storeId}/reports/${report.id}`}
                      />
                    )}
                  </For>
                </div>
              </section>
            )}
          </For>
        </div>
      </Show>
    </Page>
  );
};

export default ReportsPage;
