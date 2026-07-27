import { createResource, createSignal, lazy, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import {
  graphqlFetch,
  isForbidden,
  reportPermissionDenied,
  type TypedDocument,
} from '../../api/graphql';
import { formatNumber, t, tPlural } from '../../intl';
import { hasPermission } from '../../store/storeContext';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { CardGrid } from '../../ui/layout/CardGrid/CardGrid';
import { DashboardCard } from '../../ui/elements/dashboard/DashboardCard';
import { StatsPanel } from '../../ui/elements/dashboard/StatsPanel';
import type { StatsPanelState } from '../../ui/elements/dashboard/StatsPanel';
import { Statistic } from '../../ui/elements/dashboard/Statistic';
import { Button } from '../../ui/elements/buttons/Button';
import { PlusCircleIcon, StockIcon } from '../../ui/icons';
import {
  InboundShipmentCounts,
  InboundShipmentExternalCounts,
  ItemCounts,
  OutboundShipmentCounts,
  RequisitionCounts,
  StockCounts,
} from './dashboardCounts.generated';
import type {
  InboundShipmentCountsResult,
  InboundShipmentExternalCountsResult,
  ItemCountsResult,
  ItemCountsVariables,
  OutboundShipmentCountsResult,
  RequisitionCountsResult,
  StockCountsResult,
  StockCountsVariables,
} from './dashboardCounts.generated';
import { dashboardGates, dashboardSlots } from './dashboardPreferences';
import { itemCountsThresholds } from './dashboardGates';
import { countPanelState, type CountValue } from './panelState';
import {
  customerRequisitionListHref,
  DAYS_TILL_EXPIRED,
  expiredHref,
  expiringBetweenThresholdsHref,
  expiringNextThreeMonthsHref,
  expiringSoonHref,
  inboundListHref,
  inboundNotDeliveredHref,
  inboundThisWeekHref,
  inboundTodayHref,
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
// them until a shortcut is used.
const CreateInboundShipmentModal = lazy(() =>
  import('../inbound-shipments/list/CreateInboundShipmentModal').then(m => ({
    default: m.CreateInboundShipmentModal,
  }))
);
const CustomerSearchModal = lazy(() =>
  import('../outbound-shipments/list/CustomerSearchModal').then(m => ({
    default: m.CustomerSearchModal,
  }))
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
    resource.state === 'ready' || resource.state === 'refreshing'
      ? resource.latest
      : undefined;
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

// S1 — the dashboard screen (spec/dashboard/ui-surface.md): three widgets in the
// card grid (Replenishment, Distribution, Inventory Management), each a
// DashboardCard of StatsPanels with a footer create shortcut. Read-only and
// store-scoped (OMS-REG-DB-01.21/.24) — the only actions are the stat links
// and the three permission-gated create shortcuts (OMS-REG-DB-01.56).
//
// Every widget / panel / stat is a built-in with a stable published id
// (ui-surface § S3); the `id:` markers below mirror the published-id registry
// (`DASHBOARD_IDS` in `regions.ts`, the single source of truth for the ids).
// The dashboard OWNS the plugin-region merge / suppression semantics in
// `regions.ts` (published-id tree + `mergeRegion`, unit-tested against an empty
// contribution set — OMS-REG-DB-01.58 + OMS-REG-DB-02.2–.8). The RENDER
// integration of those semantics
// (mounting contributions, honouring suppression at render) belongs with the
// plugins vertical that supplies contributions — greenfield today — so the page
// stays explicit composition: built-ins render directly, gated only by their
// preference gates. See BUILD_REPORT § plugin-region for the deferral.
const DashboardPage: Component = () => {
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

  const inbound = createCountResource<
    InboundShipmentCountsResult,
    { storeId: string }
  >(InboundShipmentCounts, storeVars);
  // Fetched only while the procurement gate shows the panel
  // (OMS-REG-DB-02.10's principle: a hidden piece costs nothing).
  const inboundExternal = createCountResource<
    InboundShipmentExternalCountsResult,
    { storeId: string }
  >(InboundShipmentExternalCounts, () =>
    gates()?.externalInboundPanel ? storeVars() : undefined
  );
  const requisitions = createCountResource<
    RequisitionCountsResult,
    { storeId: string }
  >(RequisitionCounts, storeVars);
  const outbound = createCountResource<
    OutboundShipmentCountsResult,
    { storeId: string }
  >(OutboundShipmentCounts, storeVars);
  const stock = createCountResource<StockCountsResult, StockCountsVariables>(
    StockCounts,
    () =>
      JSON.stringify({
        storeId: params.storeId,
        daysTillExpired: DAYS_TILL_EXPIRED,
      } satisfies StockCountsVariables)
  );
  // The thresholds are always sent explicitly from the store understock /
  // overstock preferences (contract.md § stock levels); the fetch waits for the
  // store context so the explicit values are never skipped.
  const items = createCountResource<ItemCountsResult, ItemCountsVariables>(
    ItemCounts,
    () => itemCountsThresholds(params.storeId, slots())
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
  // The internal-order create flow is the requisitions vertical's, which isn't
  // built yet — the shortcut degrades to its registered placeholder (the
  // OMS-REG-DB-01.57 rule for unbuilt targets), still permission-gated.
  const orderMore = () => {
    if (!hasPermission('REQUISITION_MUTATE')) {
      reportPermissionDenied(['RequisitionMutate']);
      return;
    }
    navigate(internalOrderListHref(params.storeId));
  };

  const num = (n: number | undefined) => formatNumber(n ?? 0);

  return (
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('dashboard') }]} />
        </Header>
      }
    >
      <CardGrid>
        {/* id: replenishment */}
        <DashboardCard
          title={t('replenishment')}
          footer={
            <Button
              variant="secondary"
              icon={<PlusCircleIcon />}
              onClick={newInboundShipment}
            >
              {t('button.new-inbound-shipment')}
            </Button>
          }
        >
          {/* id: replenishment.inbound */}
          <StatsPanel
            title={t('inbound-shipment')}
            titleHref={inboundListHref(params.storeId)}
            icon={<StockIcon />}
            state={inbound.state()}
          >
            {/* id: replenishment.inbound.today */}
            <Statistic
              label={t('label.today')}
              value={num(inbound.data()?.inboundShipmentCounts.created.today)}
              href={inboundTodayHref(params.storeId, today)}
            />
            {/* id: replenishment.inbound.this-week */}
            <Statistic
              label={t('label.this-week')}
              value={num(
                inbound.data()?.inboundShipmentCounts.created.thisWeek
              )}
              href={inboundThisWeekHref(params.storeId, today)}
            />
            {/* id: replenishment.inbound.not-delivered */}
            <Statistic
              label={t('label.inbound-not-delivered')}
              value={num(inbound.data()?.inboundShipmentCounts.notDelivered)}
              href={inboundNotDeliveredHref(params.storeId)}
            />
          </StatsPanel>
          {/* id: replenishment.inbound-external — procurement gate
              (OMS-REG-DB-01.36); absent entirely when off, not shown
              disabled. */}
          <Show when={gates()?.externalInboundPanel}>
            <StatsPanel
              title={t('dashboard.inbound-shipment-external')}
              titleHref={inboundListHref(params.storeId)}
              icon={<StockIcon />}
              state={inboundExternal.state()}
            >
              {/* id: replenishment.inbound-external.today */}
              <Statistic
                label={t('label.today')}
                value={num(
                  inboundExternal.data()?.inboundShipmentExternalCounts.created
                    .today
                )}
                href={inboundTodayHref(params.storeId, today)}
              />
              {/* id: replenishment.inbound-external.this-week */}
              <Statistic
                label={t('label.this-week')}
                value={num(
                  inboundExternal.data()?.inboundShipmentExternalCounts.created
                    .thisWeek
                )}
                href={inboundThisWeekHref(params.storeId, today)}
              />
              {/* id: replenishment.inbound-external.not-delivered */}
              <Statistic
                label={t('label.inbound-not-delivered')}
                value={num(
                  inboundExternal.data()?.inboundShipmentExternalCounts
                    .notDelivered
                )}
                href={inboundNotDeliveredHref(params.storeId)}
              />
            </StatsPanel>
          </Show>
          {/* id: replenishment.internal-order */}
          <StatsPanel
            title={t('internal-order')}
            titleHref={internalOrderListHref(params.storeId)}
            icon={<StockIcon />}
            state={requisitions.state()}
          >
            {/* id: replenishment.internal-order.draft */}
            <Statistic
              label={t('label.draft')}
              value={num(requisitions.data()?.requisitionCounts.request.draft)}
              href={internalOrderListHref(params.storeId)}
            />
          </StatsPanel>
        </DashboardCard>

        {/* id: distribution */}
        <DashboardCard
          title={t('distribution')}
          footer={
            <Button
              variant="secondary"
              icon={<PlusCircleIcon />}
              onClick={newOutboundShipment}
            >
              {t('button.new-outbound-shipment')}
            </Button>
          }
        >
          {/* id: distribution.shipments */}
          <StatsPanel
            title={t('heading.shipments')}
            titleHref={outboundListHref(params.storeId)}
            icon={<StockIcon />}
            state={outbound.state()}
          >
            {/* id: distribution.shipments.not-shipped */}
            <Statistic
              label={t('label.have-not-shipped')}
              value={num(outbound.data()?.outboundShipmentCounts.notShipped)}
              href={outboundNotShippedHref(params.storeId)}
            />
          </StatsPanel>
          {/* id: distribution.customer-requisition */}
          <StatsPanel
            title={t('customer-requisition')}
            titleHref={customerRequisitionListHref(params.storeId)}
            icon={<StockIcon />}
            state={requisitions.state()}
          >
            {/* id: distribution.customer-requisition.new */}
            <Statistic
              label={t('label.new')}
              value={num(requisitions.data()?.requisitionCounts.response.new)}
              href={customerRequisitionListHref(params.storeId)}
            />
            {/* id: distribution.customer-requisition.emergency — program-module
                gate (OMS-REG-DB-01.39); alert emphasis when > 0. */}
            <Show when={gates()?.emergencyStat}>
              <Statistic
                label={t('label.emergency')}
                value={num(
                  requisitions.data()?.requisitionCounts.emergency.new
                )}
                href={customerRequisitionListHref(params.storeId)}
                alert={
                  (requisitions.data()?.requisitionCounts.emergency.new ?? 0) >
                  0
                }
                alertLabel={t('label.needs-attention')}
              />
            </Show>
          </StatsPanel>
        </DashboardCard>

        {/* id: inventory */}
        <DashboardCard
          title={t('inventory-management')}
          footer={
            <Button
              variant="secondary"
              icon={<PlusCircleIcon />}
              onClick={orderMore}
            >
              {t('button.order-more')}
            </Button>
          }
        >
          {/* id: inventory.expiring-stock */}
          <StatsPanel
            title={t('heading.expiring-stock')}
            titleHref={stockListHref(params.storeId)}
            icon={<StockIcon />}
            state={stock.state()}
          >
            {/* id: inventory.expiring-stock.expired */}
            <Statistic
              label={tPlural(
                'label.expired',
                stock.data()?.stockCounts.expired ?? 0
              )}
              value={num(stock.data()?.stockCounts.expired)}
              href={expiredHref(params.storeId, today)}
            />
            {/* id: inventory.expiring-stock.expiring-soon */}
            <Statistic
              label={tPlural(
                'label.expiring-soon',
                stock.data()?.stockCounts.expiringSoon ?? 0
              )}
              value={num(stock.data()?.stockCounts.expiringSoon)}
              href={expiringSoonHref(params.storeId, today)}
            />
            {/* id: inventory.expiring-stock.expiring-three-months — the 30/90 in
                the label are fixed copy, not slots. */}
            <Statistic
              label={t('label.batches-expiring-between-days')}
              value={num(stock.data()?.stockCounts.expiringInNextThreeMonths)}
              href={expiringNextThreeMonthsHref(params.storeId, today)}
            />
            {/* id: inventory.expiring-stock.expiring-between — expiry thresholds
                gate (OMS-REG-DB-01.45). */}
            <Show when={gates()?.expiringBetweenThresholdsStat && slots()}>
              {s => (
                <Statistic
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
          </StatsPanel>
          {/* id: inventory.stock-levels */}
          <StatsPanel
            title={t('heading.stock-levels')}
            titleHref={itemCatalogueHref(params.storeId)}
            icon={<StockIcon />}
            state={items.state()}
          >
            {/* id: inventory.stock-levels.out-of-stock-recently-used —
                consumption look-back gate (OMS-REG-DB-01.48). */}
            <Show when={gates()?.outOfStockRecentlyUsedStat && slots()}>
              {s => (
                <Statistic
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
            <Statistic
              label={t('label.out-of-stock-all-items')}
              value={num(items.data()?.itemCounts.itemCounts.noStock)}
              href={itemsOutOfStockHref(params.storeId)}
            />
            {/* id: inventory.stock-levels.at-risk — low-stock-alert gate
                (OMS-REG-DB-01.51); the tooltip's months slot is the same
                preference. */}
            <Show when={gates()?.atRiskStat && slots()}>
              {s => (
                <Statistic
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
            <Show when={slots()}>
              {s => (
                <Statistic
                  label={tPlural(
                    'label.low-stock-items',
                    items.data()?.itemCounts.itemCounts.lowStock ?? 0,
                    { num: s().understockMonths }
                  )}
                  value={num(items.data()?.itemCounts.itemCounts.lowStock)}
                  href={itemsLowStockHref(params.storeId, s().understockMonths)}
                />
              )}
            </Show>
            {/* id: inventory.stock-levels.overstocked — over-stock-alert gate
                (OMS-REG-DB-01.52: the threshold-0 degenerate count is never
                displayed). Always plural (the one (s)-less label). */}
            <Show when={gates()?.overstockedStat && slots()}>
              {s => (
                <Statistic
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
            <Show when={slots()}>
              {s => (
                <Statistic
                  label={tPlural(
                    'label.high-stock-items',
                    items.data()?.itemCounts.itemCounts.highStock ?? 0,
                    { num: s().overstockMonths }
                  )}
                  value={num(items.data()?.itemCounts.itemCounts.highStock)}
                  href={itemsHighStockHref(params.storeId, s().overstockMonths)}
                />
              )}
            </Show>
            {/* id: inventory.stock-levels.total-items */}
            <Statistic
              label={tPlural(
                'label.total-items',
                items.data()?.itemCounts.itemCounts.total ?? 0
              )}
              value={num(items.data()?.itemCounts.itemCounts.total)}
              href={itemCatalogueHref(params.storeId)}
            />
          </StatsPanel>
        </DashboardCard>
      </CardGrid>

      {/* The owning verticals' create flows, mounted lazily on first use. */}
      <Show when={inboundCreateOpen()}>
        <CreateInboundShipmentModal
          open={inboundCreateOpen()}
          mode="manual"
          onClose={() => setInboundCreateOpen(false)}
        />
      </Show>
      <Show when={outboundCreateOpen()}>
        <CustomerSearchModal
          open={outboundCreateOpen()}
          onClose={() => setOutboundCreateOpen(false)}
        />
      </Show>
    </Page>
  );
};

export default DashboardPage;
