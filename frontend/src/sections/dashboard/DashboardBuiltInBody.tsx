import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  lazy,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import {
  graphqlFetch,
  isForbidden,
  reportPermissionDenied,
  type TypedDocument,
} from '@/api/graphql';
import { gated } from '@/api/gated';
import { formatNumber, t, tPlural } from '@/intl';
import { hasPermission, storeContext } from '@/store/storeContext';
import { CardGrid } from '@/ui/layout/CardGrid/CardGrid';
import { DashboardCard } from '@/ui/elements/dashboard/DashboardCard';
import { StatsPanel } from '@/ui/elements/dashboard/StatsPanel';
import type { StatsPanelState } from '@/ui/elements/dashboard/StatsPanel';
import { Statistic } from '@/ui/elements/dashboard/Statistic';
import { Button } from '@/ui/elements/buttons/Button';
import { PlusCircleIcon, StockIcon } from '@/ui/icons';
import {
  InboundShipmentCounts,
  InboundShipmentExternalCounts,
  ItemCounts,
  OutboundShipmentCounts,
  RequisitionCounts,
  StockCounts,
} from './dashboardCounts.generated';
import type { StockCountsVariables } from './dashboardCounts.generated';
import { dashboardGates, dashboardSlots } from './dashboardPreferences';
import { itemCountsThresholds } from './dashboardGates';
import { countPanelState, type CountValue } from './panelState';
import { suppressedPieces } from '@/plugins/registry';
import { recordPluginDiagnostic } from '@/plugins/diagnostics';
import { visibleContributions } from '@/plugins/PluginSlot';
import { applicableSuppressions, DASHBOARD_IDS } from './regions';
import { widgetBuiltIns } from './regionBuiltIns';
import { PluginRegion } from './PluginRegion';
import {
  customerRequisitionListHref,
  customerRequisitionNewHref,
  customerRequisitionEmergencyHref,
  DAYS_TILL_EXPIRED,
  expiredHref,
  expiringBetweenThresholdsHref,
  expiringNextThreeMonthsHref,
  expiringSoonHref,
  inboundListHref,
  inboundNotDeliveredHref,
  inboundThisWeekHref,
  inboundTodayHref,
  internalOrderDraftHref,
  internalOrderListHref,
  itemCatalogueHref,
  itemsAtRiskHref,
  itemsHighStockHref,
  itemsLowStockHref,
  itemsOutOfStockHref,
  itemsOutOfStockRecentlyUsedHref,
  itemsOverstockedHref,
  outboundListHref,
  outboundNotShippedHref,
  stockListHref,
} from './statLinks';

// The create shortcuts hand off to the owning verticals' flows (rules.md §
// create shortcuts): both modals are self-contained (they navigate to the
// created record themselves) and lazy, so the dashboard bundle doesn't carry
// them until a shortcut is used. Each gets its OWN <Suspense> where it mounts
// (below) — a lazy component's first read suspends the nearest boundary, which
// here is the router's fallback-less one, detaching the whole open dashboard
// while the chunk loads (kdd/solid-reactivity-pitfalls § no remounts on
// interaction).
const CreateInboundShipmentModal = lazy(() =>
  import('@/sections/inbound-shipments/list/CreateInboundShipmentModal').then(
    m => ({
      default: m.CreateInboundShipmentModal,
    })
  )
);
const CustomerSearchModal = lazy(() =>
  import('@/sections/outbound-shipments/list/CustomerSearchModal').then(m => ({
    default: m.CustomerSearchModal,
  }))
);
const CreateInternalOrderModal = lazy(() =>
  import('@/sections/internal-orders/list/create/CreateInternalOrderModal').then(
    m => ({
      default: m.CreateInternalOrderModal,
    })
  )
);
const StocktakeWarningDialog = lazy(() =>
  import('@/sections/internal-orders/list/create/StocktakeWarningDialog').then(
    m => ({
      default: m.StocktakeWarningDialog,
    })
  )
);

// One count family = one resource owning one panel's loading / error state
// (ui-surface S2: panels load independently and fail independently —
// OMS-REG-DB-01.23).
// Forbidden is handled IN the panel (returnGraphqlErrors), not by the global
// permission modal: a count the user can't read shows an error in place of a
// value while every other panel keeps working. The outcome → panel-state
// mapping is the pure panelState module.
type CountResource<T> = {
  /** The StatsPanel state — loading / error(with message) / ready. */
  state: () => StatsPanelState;
  /** The counts, when ready. */
  data: () => T | undefined;
};

const createCountResource = <TResult, TVariables>(
  document: TypedDocument<TResult, TVariables>,
  // Serialised variables (stable resource key — kdd/solid-reactivity-pitfalls);
  // undefined pauses the fetch (e.g. a gated-off family).
  source: () => string | undefined
): CountResource<TResult> => {
  const [resource] = createResource(
    source,
    async (serialised): Promise<CountValue<TResult>> => {
      const result = await graphqlFetch(
        document,
        JSON.parse(serialised) as TVariables,
        { returnGraphqlErrors: true }
      );
      if (result.kind === 'success')
        return { kind: 'ready', data: result.data };
      if (result.kind === 'graphqlError' && isForbidden(result.errors)) {
        return { kind: 'forbidden' };
      }
      return { kind: 'error' };
    }
  );
  // Read via resource.state, never a bare resource() — these panels sit inside
  // the router; a suspending read would tear down the page on refetch
  // (kdd/solid-reactivity-pitfalls rule 1).
  const value = (): CountValue<TResult> | undefined =>
    gated(resource) ??
    // A throw the fetcher didn't turn into an outcome (graphqlFetch never
    // throws, so this needs something unexpected) still has to read as a
    // failed panel, not a panel stuck on "Loading…" (ui-surface § S2).
    (resource.state === 'errored' ? { kind: 'error' } : undefined);
  return {
    state: () => {
      const display = countPanelState(value());
      if (display.status === 'loading')
        return { status: 'loading', loadingMessage: t('loading') };
      if (display.status === 'error')
        return { status: 'error', errorMessage: t(display.messageKey) };
      return { status: 'ready' };
    },
    data: () => {
      const current = value();
      return current?.kind === 'ready' ? current.data : undefined;
    },
  };
};

// S1 — the BUILT-IN dashboard body (spec/dashboard/ui-surface.md): three
// widgets in the card grid (Replenishment, Distribution, Inventory Management),
// each a DashboardCard of StatsPanels with a footer create shortcut. Read-only
// and store-scoped (OMS-REG-DB-01.21/.24) — the only actions are the stat links
// and the three permission-gated create shortcuts (OMS-REG-DB-01.56).
//
// The body only: the page frame around it is `DashboardPage`'s, and which of
// the two bodies renders is `DashboardBody`'s (§ body-region semantics). This
// component is mounted only when nothing claims the body region, which is what
// makes a replaced body cost nothing — the count resources below are never
// CREATED, so none of the six count queries is issued (OMS-REG-DB-02.13/.14).
//
// Every widget / panel / stat is a built-in with a stable published id
// (ui-surface § S3); the `id:` markers below name the published-id registry
// (`DASHBOARD_IDS` in `regions.ts`, the single source of truth for the ids).
// The dashboard OWNS the plugin-region merge / suppression semantics in
// `regions.ts` (published-id tree + `mergeRegion`, unit-tested against an empty
// contribution set — OMS-REG-DB-01.58 + OMS-REG-DB-02.2–.8); the render
// integration is the `PluginRegion` at each container's tail plus the
// `shows(id)` guard on each built-in. Built-ins stay explicit composition — the
// page renders them directly, gated by their preference gates and their
// suppression guard — so no count update can remount anything (the risk
// BUILD_REPORT § plugin-region flagged); only contributions come from a merged
// list, behind one memo. Suppressing a widget or panel drops its whole subtree
// for free, because the built-ins nest.
export const DashboardBuiltInBody: Component = () => {
  // storeId is guaranteed by StoreGuardLayout; counts re-key on it, so a store
  // switch re-fetches every panel (ui-surface § cross-cutting).
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  // The window boundaries the stat links restate (OMS-REG-DB-01.55). Captured
  // per mount: the counts themselves are server-computed, this only feeds the
  // links.
  const today = new Date();

  const gates = dashboardGates;
  const slots = dashboardSlots;

  // ── count resources (one per panel family) ────────────────────────────────
  const storeVars = () => JSON.stringify({ storeId: params.storeId });

  // Each document carries its own result + variables types, so both come from
  // the argument — no type arguments to restate (kdd/type-safety).
  const inbound = createCountResource(InboundShipmentCounts, storeVars);
  // Fetched only while the procurement gate shows the panel
  // (OMS-REG-DB-02.10's principle: a hidden piece costs nothing).
  const inboundExternal = createCountResource(
    InboundShipmentExternalCounts,
    () => (gates()?.externalInboundPanel ? storeVars() : undefined)
  );
  const requisitions = createCountResource(RequisitionCounts, storeVars);
  const outbound = createCountResource(OutboundShipmentCounts, storeVars);
  const stock = createCountResource(StockCounts, () =>
    JSON.stringify({
      storeId: params.storeId,
      daysTillExpired: DAYS_TILL_EXPIRED,
    } satisfies StockCountsVariables)
  );
  // The thresholds are always sent explicitly from the store understock /
  // overstock preferences (contract.md § stock levels); the fetch waits for the
  // store context so the explicit values are never skipped.
  const items = createCountResource(ItemCounts, () =>
    itemCountsThresholds(params.storeId, slots())
  );

  // ── create shortcuts (OMS-REG-DB-01.56) ───────────────────────────────────
  const [inboundCreateOpen, setInboundCreateOpen] = createSignal(false);
  const [outboundCreateOpen, setOutboundCreateOpen] = createSignal(false);

  const newInboundShipment = () => {
    if (!hasPermission('INBOUND_SHIPMENT_MUTATE')) {
      reportPermissionDenied(['InboundShipmentMutate']);
      return;
    }
    setInboundCreateOpen(true);
  };
  const newOutboundShipment = () => {
    if (!hasPermission('OUTBOUND_SHIPMENT_MUTATE')) {
      reportPermissionDenied(['OutboundShipmentMutate']);
      return;
    }
    setOutboundCreateOpen(true);
  };
  // Order more hands off to the internal-orders vertical's create flow —
  // including its recent-stocktake warning gate (spec/internal-orders
  // AC-C1/C5), so the dashboard entry behaves exactly like the list's
  // New-order button. The warn preference rides the guard-3 store context;
  // the insufficiency check (and its module) load only on click.
  const [internalOrderCreateOpen, setInternalOrderCreateOpen] =
    createSignal(false);
  const [stocktakeGateOpen, setStocktakeGateOpen] = createSignal(false);
  const [orderMoreChecking, setOrderMoreChecking] = createSignal(false);
  const warnStocktake = () =>
    storeContext()?.preferences.warnWhenMissingRecentStocktake;

  const orderMore = async () => {
    if (!hasPermission('REQUISITION_MUTATE')) {
      reportPermissionDenied(['RequisitionMutate']);
      return;
    }
    const warn = warnStocktake();
    if (!warn?.enabled) {
      setInternalOrderCreateOpen(true);
      return;
    }
    setOrderMoreChecking(true);
    const { recentStocktakeIsInsufficient } =
      await import('@/sections/internal-orders/list/create/createInternalOrder');
    const insufficient = await recentStocktakeIsInsufficient(
      params.storeId,
      warn.maxAge,
      warn.minItems
    );
    setOrderMoreChecking(false);
    if (insufficient) setStocktakeGateOpen(true);
    else setInternalOrderCreateOpen(true);
  };

  const num = (n: number | undefined) => formatNumber(n ?? 0);

  // Suppression at render (OMS-REG-DB-02.6–.8): a built-in a loaded plugin
  // names by published id is absent, not disabled. Reactive, so a plugin
  // loading after the page mounts removes its pieces in place; and because
  // built-ins nest, suppressing a widget or a panel takes its whole subtree
  // with it.
  //
  // Except where obeying it would leave the body blank (OMS-REG-DB-02.18):
  // suppression is site-wide, so a plugin clearing the widgets to make room for
  // a screen meant for some stores would empty the dashboard of all the others.
  // `applicableSuppressions` refuses that set and names it; the body region is
  // how a store-conditional screen is built. ONE memo, so nothing here can tear
  // down a live contribution's subtree.
  const suppression = createMemo(() =>
    applicableSuppressions(
      widgetBuiltIns(),
      visibleContributions('dashboard.widget').length,
      suppressedPieces()
    )
  );
  const shows = (id: string) => !suppression().applied.has(id);

  // Recorded out of the memo (a memo's body stays a pure computation) and
  // deduped, so a re-evaluation cannot spam the same refusal.
  const reported = new Set<string>();
  createEffect(() => {
    for (const id of suppression().ignored) {
      if (reported.has(id)) continue;
      reported.add(id);
      recordPluginDiagnostic({
        level: 'warning',
        message: `dashboard: suppression of built-in widget "${id}" ignored — obeying every suppression would leave the dashboard body empty, and no plugin contributes a body. A screen only some stores should see belongs in the dashboard.body slot.`,
      });
    }
  });

  return (
    <>
      <CardGrid>
        {/* id: replenishment */}
        <Show when={shows(DASHBOARD_IDS.replenishment.id)}>
          <DashboardCard
            title={t('replenishment')}
            testId="dashboard-widget-replenishment"
            footer={
              <Button
                icon={<PlusCircleIcon />}
                onClick={newInboundShipment}
                data-testid="dashboard-create-replenishment"
              >
                {t('button.new-inbound-shipment')}
              </Button>
            }
          >
            {/* id: replenishment.inbound */}
            <Show when={shows(DASHBOARD_IDS.replenishment.inbound.id)}>
              <StatsPanel
                title={t('inbound-shipment')}
                titleHref={inboundListHref(params.storeId)}
                icon={<StockIcon />}
                state={inbound.state()}
                testId="dashboard-panel-replenishment.inbound"
              >
                {/* id: replenishment.inbound.today */}
                <Show when={shows(DASHBOARD_IDS.replenishment.inbound.today)}>
                  <Statistic
                    testId="dashboard-stat-replenishment.inbound.today"
                    label={t('label.today')}
                    value={num(
                      inbound.data()?.inboundShipmentCounts.created.today
                    )}
                    href={inboundTodayHref(params.storeId, today)}
                  />
                </Show>
                {/* id: replenishment.inbound.this-week */}
                <Show
                  when={shows(DASHBOARD_IDS.replenishment.inbound.thisWeek)}
                >
                  <Statistic
                    testId="dashboard-stat-replenishment.inbound.this-week"
                    label={t('label.this-week')}
                    value={num(
                      inbound.data()?.inboundShipmentCounts.created.thisWeek
                    )}
                    href={inboundThisWeekHref(params.storeId, today)}
                  />
                </Show>
                {/* id: replenishment.inbound.not-delivered */}
                <Show
                  when={shows(DASHBOARD_IDS.replenishment.inbound.notDelivered)}
                >
                  <Statistic
                    testId="dashboard-stat-replenishment.inbound.not-delivered"
                    label={t('label.inbound-not-delivered')}
                    value={num(
                      inbound.data()?.inboundShipmentCounts.notDelivered
                    )}
                    href={inboundNotDeliveredHref(params.storeId)}
                  />
                </Show>
                <PluginRegion
                  slot="dashboard.stat"
                  container={DASHBOARD_IDS.replenishment.inbound.id}
                />
              </StatsPanel>
            </Show>
            {/* id: replenishment.inbound-external — procurement gate
                (OMS-REG-DB-01.36); absent entirely when off, not shown
                disabled. */}
            <Show
              when={
                gates()?.externalInboundPanel &&
                shows(DASHBOARD_IDS.replenishment.inboundExternal.id)
              }
            >
              <StatsPanel
                title={t('dashboard.inbound-shipment-external')}
                titleHref={inboundListHref(params.storeId, true)}
                icon={<StockIcon />}
                state={inboundExternal.state()}
                testId="dashboard-panel-replenishment.inbound-external"
              >
                {/* id: replenishment.inbound-external.today */}
                <Show
                  when={shows(
                    DASHBOARD_IDS.replenishment.inboundExternal.today
                  )}
                >
                  <Statistic
                    testId="dashboard-stat-replenishment.inbound-external.today"
                    label={t('label.today')}
                    value={num(
                      inboundExternal.data()?.inboundShipmentExternalCounts
                        .created.today
                    )}
                    href={inboundTodayHref(params.storeId, today, true)}
                  />
                </Show>
                {/* id: replenishment.inbound-external.this-week */}
                <Show
                  when={shows(
                    DASHBOARD_IDS.replenishment.inboundExternal.thisWeek
                  )}
                >
                  <Statistic
                    testId="dashboard-stat-replenishment.inbound-external.this-week"
                    label={t('label.this-week')}
                    value={num(
                      inboundExternal.data()?.inboundShipmentExternalCounts
                        .created.thisWeek
                    )}
                    href={inboundThisWeekHref(params.storeId, today, true)}
                  />
                </Show>
                {/* id: replenishment.inbound-external.not-delivered */}
                <Show
                  when={shows(
                    DASHBOARD_IDS.replenishment.inboundExternal.notDelivered
                  )}
                >
                  <Statistic
                    testId="dashboard-stat-replenishment.inbound-external.not-delivered"
                    label={t('label.inbound-not-delivered')}
                    value={num(
                      inboundExternal.data()?.inboundShipmentExternalCounts
                        .notDelivered
                    )}
                    href={inboundNotDeliveredHref(params.storeId, true)}
                  />
                </Show>
                <PluginRegion
                  slot="dashboard.stat"
                  container={DASHBOARD_IDS.replenishment.inboundExternal.id}
                />
              </StatsPanel>
            </Show>
            {/* id: replenishment.internal-order */}
            <Show when={shows(DASHBOARD_IDS.replenishment.internalOrder.id)}>
              <StatsPanel
                title={t('internal-order')}
                titleHref={internalOrderListHref(params.storeId)}
                icon={<StockIcon />}
                state={requisitions.state()}
                testId="dashboard-panel-replenishment.internal-order"
              >
                {/* id: replenishment.internal-order.draft */}
                <Show
                  when={shows(DASHBOARD_IDS.replenishment.internalOrder.draft)}
                >
                  <Statistic
                    testId="dashboard-stat-replenishment.internal-order.draft"
                    label={t('label.draft')}
                    value={num(
                      requisitions.data()?.requisitionCounts.request.draft
                    )}
                    href={internalOrderDraftHref(params.storeId)}
                  />
                </Show>
                <PluginRegion
                  slot="dashboard.stat"
                  container={DASHBOARD_IDS.replenishment.internalOrder.id}
                />
              </StatsPanel>
            </Show>
            <PluginRegion
              slot="dashboard.panel"
              container={DASHBOARD_IDS.replenishment.id}
            />
          </DashboardCard>
        </Show>

        {/* id: distribution */}
        <Show when={shows(DASHBOARD_IDS.distribution.id)}>
          <DashboardCard
            title={t('distribution')}
            testId="dashboard-widget-distribution"
            footer={
              <Button
                icon={<PlusCircleIcon />}
                onClick={newOutboundShipment}
                data-testid="dashboard-create-distribution"
              >
                {t('button.new-outbound-shipment')}
              </Button>
            }
          >
            {/* id: distribution.shipments */}
            <Show when={shows(DASHBOARD_IDS.distribution.shipments.id)}>
              <StatsPanel
                title={t('heading.shipments')}
                titleHref={outboundListHref(params.storeId)}
                icon={<StockIcon />}
                state={outbound.state()}
                testId="dashboard-panel-distribution.shipments"
              >
                {/* id: distribution.shipments.not-shipped */}
                <Show
                  when={shows(DASHBOARD_IDS.distribution.shipments.notShipped)}
                >
                  <Statistic
                    testId="dashboard-stat-distribution.shipments.not-shipped"
                    label={t('label.have-not-shipped')}
                    value={num(
                      outbound.data()?.outboundShipmentCounts.notShipped
                    )}
                    href={outboundNotShippedHref(params.storeId)}
                  />
                </Show>
                <PluginRegion
                  slot="dashboard.stat"
                  container={DASHBOARD_IDS.distribution.shipments.id}
                />
              </StatsPanel>
            </Show>
            {/* id: distribution.customer-requisition */}
            <Show
              when={shows(DASHBOARD_IDS.distribution.customerRequisition.id)}
            >
              <StatsPanel
                title={t('customer-requisition')}
                titleHref={customerRequisitionListHref(params.storeId)}
                icon={<StockIcon />}
                state={requisitions.state()}
                testId="dashboard-panel-distribution.customer-requisition"
              >
                {/* id: distribution.customer-requisition.new */}
                <Show
                  when={shows(
                    DASHBOARD_IDS.distribution.customerRequisition.new
                  )}
                >
                  <Statistic
                    testId="dashboard-stat-distribution.customer-requisition.new"
                    label={t('label.new')}
                    value={num(
                      requisitions.data()?.requisitionCounts.response.new
                    )}
                    href={customerRequisitionNewHref(params.storeId)}
                  />
                </Show>
                {/* id: distribution.customer-requisition.emergency — program-module
                    gate (OMS-REG-DB-01.39); alert emphasis when > 0. */}
                <Show
                  when={
                    gates()?.emergencyStat &&
                    shows(
                      DASHBOARD_IDS.distribution.customerRequisition.emergency
                    )
                  }
                >
                  <Statistic
                    testId="dashboard-stat-distribution.customer-requisition.emergency"
                    label={t('label.emergency')}
                    value={num(
                      requisitions.data()?.requisitionCounts.emergency.new
                    )}
                    href={customerRequisitionEmergencyHref(params.storeId)}
                    alert={
                      (requisitions.data()?.requisitionCounts.emergency.new ??
                        0) > 0
                    }
                    alertLabel={t('label.needs-attention')}
                  />
                </Show>
                <PluginRegion
                  slot="dashboard.stat"
                  container={DASHBOARD_IDS.distribution.customerRequisition.id}
                />
              </StatsPanel>
            </Show>
            <PluginRegion
              slot="dashboard.panel"
              container={DASHBOARD_IDS.distribution.id}
            />
          </DashboardCard>
        </Show>

        {/* id: inventory */}
        <Show when={shows(DASHBOARD_IDS.inventory.id)}>
          <DashboardCard
            title={t('inventory-management')}
            testId="dashboard-widget-inventory"
            footer={
              <Button
                icon={<PlusCircleIcon />}
                loading={orderMoreChecking()}
                onClick={() => void orderMore()}
                data-testid="dashboard-create-inventory"
              >
                {t('button.order-more')}
              </Button>
            }
          >
            {/* id: inventory.expiring-stock */}
            <Show when={shows(DASHBOARD_IDS.inventory.expiringStock.id)}>
              <StatsPanel
                title={t('heading.expiring-stock')}
                titleHref={stockListHref(params.storeId)}
                icon={<StockIcon />}
                state={stock.state()}
                testId="dashboard-panel-inventory.expiring-stock"
              >
                {/* id: inventory.expiring-stock.expired */}
                <Show
                  when={shows(DASHBOARD_IDS.inventory.expiringStock.expired)}
                >
                  <Statistic
                    testId="dashboard-stat-inventory.expiring-stock.expired"
                    label={tPlural(
                      'label.expired',
                      stock.data()?.stockCounts.expired ?? 0
                    )}
                    value={num(stock.data()?.stockCounts.expired)}
                    href={expiredHref(params.storeId, today)}
                  />
                </Show>
                {/* id: inventory.expiring-stock.expiring-soon */}
                <Show
                  when={shows(
                    DASHBOARD_IDS.inventory.expiringStock.expiringSoon
                  )}
                >
                  <Statistic
                    testId="dashboard-stat-inventory.expiring-stock.expiring-soon"
                    label={tPlural(
                      'label.expiring-soon',
                      stock.data()?.stockCounts.expiringSoon ?? 0
                    )}
                    value={num(stock.data()?.stockCounts.expiringSoon)}
                    href={expiringSoonHref(params.storeId, today)}
                  />
                </Show>
                {/* id: inventory.expiring-stock.expiring-three-months — the 30/90 in
                    the label are fixed copy, not slots. */}
                <Show
                  when={shows(
                    DASHBOARD_IDS.inventory.expiringStock.expiringThreeMonths
                  )}
                >
                  <Statistic
                    testId="dashboard-stat-inventory.expiring-stock.expiring-three-months"
                    label={t('label.batches-expiring-between-days')}
                    value={num(
                      stock.data()?.stockCounts.expiringInNextThreeMonths
                    )}
                    href={expiringNextThreeMonthsHref(params.storeId, today)}
                  />
                </Show>
                {/* id: inventory.expiring-stock.expiring-between — expiry thresholds
                    gate (OMS-REG-DB-01.45). */}
                <Show
                  when={
                    gates()?.expiringBetweenThresholdsStat &&
                    shows(
                      DASHBOARD_IDS.inventory.expiringStock.expiringBetween
                    ) &&
                    slots()
                  }
                >
                  {s => (
                    <Statistic
                      testId="dashboard-stat-inventory.expiring-stock.expiring-between"
                      label={t('label.batches-expiring-in-days', {
                        firstThreshold: s().firstExpiryDays,
                        secondThreshold: s().secondExpiryDays,
                      })}
                      value={num(
                        stock.data()?.stockCounts.expiringBetweenThresholds
                      )}
                      href={expiringBetweenThresholdsHref(
                        params.storeId,
                        today,
                        s().firstExpiryDays,
                        s().secondExpiryDays
                      )}
                    />
                  )}
                </Show>
                <PluginRegion
                  slot="dashboard.stat"
                  container={DASHBOARD_IDS.inventory.expiringStock.id}
                />
              </StatsPanel>
            </Show>
            {/* id: inventory.stock-levels */}
            <Show when={shows(DASHBOARD_IDS.inventory.stockLevels.id)}>
              <StatsPanel
                title={t('heading.stock-levels')}
                titleHref={itemCatalogueHref(params.storeId)}
                icon={<StockIcon />}
                state={items.state()}
                testId="dashboard-panel-inventory.stock-levels"
              >
                {/* id: inventory.stock-levels.out-of-stock-recently-used —
                    consumption look-back gate (OMS-REG-DB-01.48). */}
                <Show
                  when={
                    gates()?.outOfStockRecentlyUsedStat &&
                    shows(
                      DASHBOARD_IDS.inventory.stockLevels.outOfStockRecentlyUsed
                    ) &&
                    slots()
                  }
                >
                  {s => (
                    <Statistic
                      testId="dashboard-stat-inventory.stock-levels.out-of-stock-recently-used"
                      label={t('label.out-of-stock-recently-used', {
                        num: s().consumptionLookbackMonths,
                      })}
                      value={num(
                        items.data()?.itemCounts.itemCounts.outOfStockProducts
                      )}
                      href={itemsOutOfStockRecentlyUsedHref(params.storeId)}
                    />
                  )}
                </Show>
                {/* id: inventory.stock-levels.out-of-stock */}
                <Show
                  when={shows(DASHBOARD_IDS.inventory.stockLevels.outOfStock)}
                >
                  <Statistic
                    testId="dashboard-stat-inventory.stock-levels.out-of-stock"
                    label={t('label.out-of-stock-all-items')}
                    value={num(items.data()?.itemCounts.itemCounts.noStock)}
                    href={itemsOutOfStockHref(params.storeId)}
                  />
                </Show>
                {/* id: inventory.stock-levels.at-risk — low-stock-alert gate
                    (OMS-REG-DB-01.51); the tooltip's months slot is the same
                    preference. */}
                <Show
                  when={
                    gates()?.atRiskStat &&
                    shows(DASHBOARD_IDS.inventory.stockLevels.atRisk) &&
                    slots()
                  }
                >
                  {s => (
                    <Statistic
                      testId="dashboard-stat-inventory.stock-levels.at-risk"
                      label={t('label.products-at-risk-of-being-out-of-stock')}
                      value={num(
                        items.data()?.itemCounts.itemCounts
                          .productsAtRiskOfBeingOutOfStock
                      )}
                      href={itemsAtRiskHref(params.storeId)}
                      info={t('messages.products-at-risk-of-stock-out-info', {
                        num: s().lowStockAlertMonths,
                      })}
                    />
                  )}
                </Show>
                {/* id: inventory.stock-levels.low-stock */}
                <Show
                  when={
                    shows(DASHBOARD_IDS.inventory.stockLevels.lowStock) &&
                    slots()
                  }
                >
                  {s => (
                    <Statistic
                      testId="dashboard-stat-inventory.stock-levels.low-stock"
                      label={tPlural(
                        'label.low-stock-items',
                        items.data()?.itemCounts.itemCounts.lowStock ?? 0,
                        { num: s().understockMonths }
                      )}
                      value={num(items.data()?.itemCounts.itemCounts.lowStock)}
                      href={itemsLowStockHref(
                        params.storeId,
                        s().understockMonths
                      )}
                    />
                  )}
                </Show>
                {/* id: inventory.stock-levels.overstocked — over-stock-alert gate
                    (OMS-REG-DB-01.52: the threshold-0 degenerate count is never
                    displayed). Always plural (the one (s)-less label). */}
                <Show
                  when={
                    gates()?.overstockedStat &&
                    shows(DASHBOARD_IDS.inventory.stockLevels.overstocked) &&
                    slots()
                  }
                >
                  {s => (
                    <Statistic
                      testId="dashboard-stat-inventory.stock-levels.overstocked"
                      label={t('label.overstocked-products', {
                        num: s().overstockAlertMonths,
                      })}
                      value={num(
                        items.data()?.itemCounts.itemCounts.productsOverstocked
                      )}
                      href={itemsOverstockedHref(
                        params.storeId,
                        s().overstockAlertMonths
                      )}
                    />
                  )}
                </Show>
                {/* id: inventory.stock-levels.high-stock */}
                <Show
                  when={
                    shows(DASHBOARD_IDS.inventory.stockLevels.highStock) &&
                    slots()
                  }
                >
                  {s => (
                    <Statistic
                      testId="dashboard-stat-inventory.stock-levels.high-stock"
                      label={tPlural(
                        'label.high-stock-items',
                        items.data()?.itemCounts.itemCounts.highStock ?? 0,
                        { num: s().overstockMonths }
                      )}
                      value={num(items.data()?.itemCounts.itemCounts.highStock)}
                      href={itemsHighStockHref(
                        params.storeId,
                        s().overstockMonths
                      )}
                    />
                  )}
                </Show>
                {/* id: inventory.stock-levels.total-items */}
                <Show
                  when={shows(DASHBOARD_IDS.inventory.stockLevels.totalItems)}
                >
                  <Statistic
                    testId="dashboard-stat-inventory.stock-levels.total-items"
                    label={tPlural(
                      'label.total-items',
                      items.data()?.itemCounts.itemCounts.total ?? 0
                    )}
                    value={num(items.data()?.itemCounts.itemCounts.total)}
                    href={itemCatalogueHref(params.storeId)}
                  />
                </Show>
                <PluginRegion
                  slot="dashboard.stat"
                  container={DASHBOARD_IDS.inventory.stockLevels.id}
                />
              </StatsPanel>
            </Show>
            <PluginRegion
              slot="dashboard.panel"
              container={DASHBOARD_IDS.inventory.id}
            />
          </DashboardCard>
        </Show>
        {/* The card grid's own region: whole plugin widgets, last. */}
        <PluginRegion slot="dashboard.widget" />
      </CardGrid>

      {/* The owning verticals' create flows, mounted lazily on first use. The
          <Show> gates the mount, so each modal takes a bare `open`; the
          <Suspense> keeps the chunk's load off the router's boundary (see the
          lazy imports above). */}
      <Show when={inboundCreateOpen()}>
        <Suspense>
          <CreateInboundShipmentModal
            open
            mode="manual"
            onClose={() => setInboundCreateOpen(false)}
          />
        </Suspense>
      </Show>
      <Show when={outboundCreateOpen()}>
        <Suspense>
          <CustomerSearchModal
            open
            onClose={() => setOutboundCreateOpen(false)}
          />
        </Suspense>
      </Show>
      <Show when={stocktakeGateOpen()}>
        <Suspense>
          <StocktakeWarningDialog
            open
            minItems={warnStocktake()?.minItems ?? 0}
            maxAge={warnStocktake()?.maxAge ?? 0}
            onCancel={() => setStocktakeGateOpen(false)}
            onContinue={() => {
              setStocktakeGateOpen(false);
              setInternalOrderCreateOpen(true);
            }}
            onGoToStocktakes={() => {
              setStocktakeGateOpen(false);
              navigate(`/${params.storeId}/inventory/stocktakes`);
            }}
          />
        </Suspense>
      </Show>
      <Show when={internalOrderCreateOpen()}>
        <Suspense>
          <CreateInternalOrderModal
            storeId={params.storeId}
            open
            onClose={() => setInternalOrderCreateOpen(false)}
            onCreated={id => {
              setInternalOrderCreateOpen(false);
              navigate(`/${params.storeId}/replenishment/internal-order/${id}`);
            }}
          />
        </Suspense>
      </Show>
    </>
  );
};
