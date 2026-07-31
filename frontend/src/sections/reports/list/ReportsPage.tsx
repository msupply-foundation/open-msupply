import { createMemo, createResource, For, Show } from 'solid-js';
import type { Component, JSX } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { locale, t } from '../../../intl';
import type { LocaleKey } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Button } from '../../../ui/elements/buttons/Button';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { ALT_M } from '../../../ui/utils/shortcuts';
import { CardGrid } from '../../../ui/layout/CardGrid/CardGrid';
import { DashboardCard } from '../../../ui/elements/dashboard/DashboardCard';
import { WidgetCard } from '../../../ui/elements/display/WidgetCard';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { SidePanelSection } from '../../../ui/layout/SidePanel/SidePanel';
import {
  BarIcon,
  FileIcon,
  ReplenishmentIcon,
  SidebarIcon,
  TruckIcon,
} from '../../../ui/icons';
import { storeContext } from '../../../store/storeContext';
// The list operation and label helper are the cross-vertical ones owned by
// domain/reports (shared with the S4 record-screen selector) — the section
// only adds its own filter (general contexts, active only).
import { Reports } from '../../../domain/reports/reports.generated';
import type {
  ReportsResult,
  ReportsVariables,
} from '../../../domain/reports/reports.generated';
import { reportLabel } from '../../../domain/reports';

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
  /** The category-heading icon (spec S1: headings carry the icon, cards none). */
  icon: () => JSX.Element;
};

const CATEGORIES: readonly CategoryDef[] = [
  {
    titleKey: 'heading.stock-and-items',
    subContexts: ['StockAndItems'],
    gate: 'primary',
    icon: () => <BarIcon />,
  },
  {
    titleKey: 'distribution',
    subContexts: ['Distribution'],
    gate: 'primary',
    icon: () => <TruckIcon />,
  },
  {
    titleKey: 'replenishment',
    subContexts: ['Replenishment'],
    gate: 'primary',
    icon: () => <ReplenishmentIcon />,
  },
  {
    titleKey: 'heading.other',
    subContexts: ['Other'],
    gate: 'ifAny',
    icon: () => <FileIcon />,
  },
  {
    titleKey: 'label.programs',
    subContexts: ['HIVCareProgram', 'Vaccinations', 'Encounters'],
    gate: 'programs',
    icon: () => <FileIcon />,
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
    helperText={t('label.months')}
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
  // The preferences side panel: open by default on wide viewports, closed
  // below; the user's explicit choice wins and persists across reloads. While
  // closed, the app bar's More button is the reopen affordance (spec S1
  // layout, AC-U6, ui-standards/layout.md → page regions).
  const [panelOpen, setPanelOpen] = createSidePanelOpen();

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
        value="notification-preferences"
        title={t('heading.notification-preferences')}
        collapsible
      >
        <div style={stackStyle}>
          <PrefField
            label={t('label.threshold-for-overstock')}
            value={prefs()?.monthsOverstock}
          />
          <PrefField
            label={t('label.threshold-for-understock')}
            value={prefs()?.monthsUnderstock}
          />
          <PrefField
            label={t('label.expiring-item-period-report-panel')}
            value={prefs()?.monthsItemsExpire}
          />
        </div>
      </SidePanelSection>
      <SidePanelSection value="custom" title={t('heading.custom')} collapsible>
        <div style={stackStyle}>
          <PrefField
            label={t('label.stocktake-frequency')}
            value={prefs()?.stocktakeFrequency}
          />
          <PrefField
            label={t('label.monthly-consumption-look-back-period')}
            value={prefs()?.monthlyConsumptionLookBackPeriod}
          />
          <PrefField
            label={t('label.lead-time')}
            value={prefs()?.monthsLeadTime}
          />
        </div>
      </SidePanelSection>
    </>
  );

  return (
    <Page
      sidePanelOpen={panelOpen()}
      sidePanelTitle={t('label.preferences')}
      onSidePanelClose={() => setPanelOpen(false)}
      sidePanelContent={sidePanelContent}
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('reports') }]} />
          <HeaderButtons>
            {/* A labelled "More" button (sidebar glyph + text) that reopens the
                closed side panel; it hides while the panel is open — the
                panel's own close button takes over (AC-U6). */}
            <Show when={!panelOpen()}>
              <Button
                variant="secondary"
                icon={<SidebarIcon />}
                // createSidePanelOpen registers Alt+M; this is the control that
                // advertises it (ui-surface S2).
                shortcut={ALT_M}
                onClick={() => setPanelOpen(true)}
              >
                {t('button.more')}
              </Button>
            </Show>
          </HeaderButtons>
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
            fallback={<EmptyState message={t('message.contact-support')} />}
          >
            <Spinner center />
          </Show>
        }
      >
        {/* One DashboardCard per category in the generic Card grid, mirroring
            the landing dashboard (spec S1 layout): the category's captured
            icon chip on the card title, its iconless report cards stacked as
            full-width rows inside. */}
        <CardGrid>
          <For each={visible()}>
            {group => (
              <DashboardCard
                title={t(group.def.titleKey)}
                icon={group.def.icon()}
              >
                <For each={group.nodes}>
                  {report => (
                    <WidgetCard
                      title={reportLabel(report)}
                      href={`/${params.storeId}/reports/${report.id}`}
                    />
                  )}
                </For>
              </DashboardCard>
            )}
          </For>
        </CardGrid>
      </Show>
    </Page>
  );
};

export default ReportsPage;
