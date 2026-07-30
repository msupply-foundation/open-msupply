import { createResource, createSignal } from 'solid-js';
import { MemoryRouter, Route } from '@solidjs/router';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { StatsPanel } from '../ui/elements/dashboard/StatsPanel';
import { PluginRegionOutlet } from '../ui/elements/plugins/PluginRegionOutlet';
import { PluginSlotOutlet } from '../ui/elements/plugins/PluginSlotOutlet';
import { SectionTitle } from '../ui/elements/dashboard/SectionTitle';
import { Statistic } from '../ui/elements/dashboard/Statistic';
import { Button } from '../ui/elements/buttons/Button';
import { PlusCircleIcon, StockIcon, ThermometerIcon } from '../ui/icons';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { Lead, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './StatisticsShowcase.module.css';

/*
 * Showcase for the statistics building blocks — common, reusable components
 * whose main consumer is the dashboard. Shown component-by-component
 * (SectionTitle → Statistic → StatsPanel → DashboardCard), like the other
 * component sections, then one composition example where CardGrid lays out
 * several DashboardCards (CardGrid renders nothing on its own — it only shows
 * behaviour once it has cards to arrange, so it's demonstrated doing its real
 * job here rather than as a standalone card).
 *
 * Statistic and SectionTitle render router <A>s, so the whole demo sits in a
 * MemoryRouter: links resolve and are clickable without navigating the app.
 */

/* Reusable demo cards — one is shown alone under "DashboardCard", all four
   under "Composition". Labels/values mirror the current app's dashboard. */
const ReplenishmentCard = () => (
  <DashboardCard
    title="Replenishment"
    footer={<Button icon={<PlusCircleIcon />}>New inbound shipment</Button>}
  >
    <StatsPanel
      title="Inbound Shipments"
      titleHref="/demo"
      icon={<StockIcon />}
      state={{ status: 'ready' }}
    >
      <Statistic label="Today" value="0" href="/demo" />
      <Statistic label="This week" value="0" href="/demo" />
      <Statistic label="Not delivered" value="15" href="/demo" />
    </StatsPanel>
    <StatsPanel
      title="Internal Orders"
      icon={<StockIcon />}
      state={{ status: 'ready' }}
    >
      <Statistic label="Draft" value="3" href="/demo" />
    </StatsPanel>
  </DashboardCard>
);

const DistributionCard = () => (
  <DashboardCard
    title="Distribution"
    footer={<Button icon={<PlusCircleIcon />}>New outbound shipment</Button>}
  >
    <StatsPanel
      title="Outbound Shipments"
      titleHref="/demo"
      icon={<StockIcon />}
      state={{ status: 'ready' }}
    >
      <Statistic label="Have not been shipped" value="7" href="/demo" />
    </StatsPanel>
    <StatsPanel
      title="Requisitions"
      icon={<StockIcon />}
      state={{ status: 'ready' }}
    >
      <Statistic label="New" value="16" href="/demo" />
      <Statistic
        label="Emergency"
        value="2"
        href="/demo"
        alert
        alertLabel="Needs attention"
      />
    </StatsPanel>
  </DashboardCard>
);

const InventoryCard = () => (
  <DashboardCard
    title="Inventory Management"
    footer={<Button icon={<PlusCircleIcon />}>Order more</Button>}
  >
    <StatsPanel
      title="Expiring stock"
      titleHref="/demo"
      icon={<StockIcon />}
      state={{ status: 'ready' }}
    >
      <Statistic label="Expired batches" value="2" href="/demo" />
      <Statistic label="Batches expiring in a month" value="2" href="/demo" />
    </StatsPanel>
    <StatsPanel
      title="Stock levels"
      titleHref="/demo"
      icon={<StockIcon />}
      state={{ status: 'ready' }}
    >
      <Statistic label="Out of stock (all items)" value="42" href="/demo" />
      <Statistic
        label="Products at risk of being out of stock"
        value="1"
        href="/demo"
        info="Items projected to run out of stock within 3 months, based on average monthly consumption (AMC)."
      />
      <Statistic label="Total items" value="47" href="/demo" />
    </StatsPanel>
  </DashboardCard>
);

const ColdChainCard = () => (
  <DashboardCard title="Cold Chain">
    <StatsPanel
      title="Temperature sensors"
      titleHref="/demo"
      icon={<ThermometerIcon />}
      state={{ status: 'ready' }}
    >
      <Statistic
        label="Sensors in breach"
        value="1"
        href="/demo"
        alert
        alertLabel="Needs attention"
      />
      <Statistic label="Sensors offline" value="2" href="/demo" />
    </StatsPanel>
  </DashboardCard>
);

/*
 * Loads its demo contributions from `./demoPlugin` via dynamic `import()`, so
 * the components arrive the way plugin components do — from a module this
 * file never statically sees. Read non-suspending (gated on `.state`) —
 * the section mounts on a menu interaction, so it must not suspend an outer
 * boundary (kdd/solid-reactivity-pitfalls). Until the module lands the
 * region is simply empty.
 */
const PluginOutletCard = () => {
  const [demoPlugin] = createResource(() => import('./demoPlugin'));
  const statContributions = () =>
    demoPlugin.state === 'ready'
      ? demoPlugin.latest.demoPluginStatContributions
      : [];
  const widgetContributions = () =>
    demoPlugin.state === 'ready'
      ? demoPlugin.latest.demoPluginWidgetContributions
      : [];
  return (
    <DashboardCard
      id="statistics-plugin-outlet"
      title="PluginRegionOutlet — plugin contribution mount point"
    >
      <Lead>
        The mount point for plugin contributions inside a dashboard container.
        It renders the list it is given, in that order (merging is the
        dashboard's job), with <em>no wrapper element</em> — and an empty region
        renders nothing. The contributions come from <code>demoPlugin.tsx</code>{' '}
        via dynamic <code>import()</code>, the way plugin components arrive.
        Shown at two regions: the <em>stat region</em> — inside the built-in
        widget, a plugin stat joins the built-in stat, and a second contribution
        throws on render, so only its slot shows the neutral fallback (dashboard
        AC-D6); and the <em>widget region</em> — a whole plugin card (Cold
        Chain) joins the same card grid.
      </Lead>
      <CardGrid maxColumnWidth="26rem">
        <DashboardCard title="Replenishment">
          <StatsPanel
            title="Inbound Shipments"
            titleHref="/demo"
            icon={<StockIcon />}
            state={{ status: 'ready' }}
          >
            <Statistic label="Built-in stat" value="3" href="/demo" />
            <PluginRegionOutlet
              contributions={statContributions()}
              errorFallback="A plugin contribution failed to load"
            />
          </StatsPanel>
        </DashboardCard>
        <PluginRegionOutlet
          contributions={widgetContributions()}
          errorFallback="A plugin contribution failed to load"
        />
      </CardGrid>
    </DashboardCard>
  );
};

/*
 * The props-carrying sibling (PluginSlotOutlet). Same contribution-as-data
 * shape, plus the guarantee a changing record needs: switching records here
 * must move the facts WITHOUT moving the contribution's own mount number or
 * resetting its click count.
 */
const RECORDS = [
  { code: '030062', name: 'Acetylsalicylic Acid 300mg tabs', amc: 120 },
  { code: '201116', name: 'Bandage W.O.W. 15cm x 5m', amc: 8 },
];

const PluginSlotOutletCard = () => {
  const [index, setIndex] = createSignal(0);
  const record = () => RECORDS[index() % RECORDS.length]!;
  const [demoPlugin] = createResource(() => import('./demoPlugin'));
  // Non-suspending (`.state`-gated): the section mounts on a menu interaction.
  const contributions = () =>
    demoPlugin.state === 'ready'
      ? demoPlugin.latest.demoPluginPanelContributions
      : [];
  return (
    <DashboardCard
      id="statistics-plugin-slot-outlet"
      title="PluginSlotOutlet — a contribution that receives props"
    >
      <Lead>
        The same mount point for a slot whose contributions take{' '}
        <em>props</em> — the internal-order line editor's info panel (plugins
        sdk-contract § the info-panel slot). Identical rules: what it is given,
        in that order, <em>no wrapper element</em>, one error boundary each (the
        second contribution throws, so only its own place shows the fallback).
        What it adds is the walk's guarantee: the slot props arrive as an{' '}
        <strong>accessor</strong> and are delivered per key, so a new record
        reaches a <em>live</em> contribution. Press <em>Next record</em>: the
        facts change while the contribution's mount number and click count stay
        put — a remount would reset both (AC-PLUG-N2).
      </Lead>
      <Button variant="secondary" onClick={() => setIndex(n => n + 1)}>
        Next record
      </Button>
      <PluginSlotOutlet
        contributions={contributions()}
        slotProps={() => ({ record: record() })}
        errorFallback="A plugin contribution failed to load"
      />
    </DashboardCard>
  );
};

/*
 * The component cards read best at the form measure, but the closing
 * composition demo needs the whole panel so its CardGrid has room to wrap —
 * so the measure wraps only the component cards, and the composition card
 * sits beside (not inside) it at full width. Measure is a per-group content
 * choice, not page geometry (see ContentContainer.tsx).
 */
const Demo = () => (
  <Stack gap="lg">
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={statisticsMetadata} />
        <DashboardCard
          id="statistics-building-blocks"
          title="SectionTitle — iconed action-tone panel heading"
        >
          <Lead>
            Hand-rolled, pure CSS — an <code>&lt;h3&gt;</code> with an optional
            leading icon and text in the action tone (
            <code>--secondary-main</code>
            ), extracted from StatsPanel so the iconed panel heading is defined
            once. The icon inherits <code>currentColor</code>, so it always
            tracks the title; with <code>href</code> the text becomes a router{' '}
            <code>&lt;A&gt;</code> into the unfiltered list, and the icon stays{' '}
            <em>outside</em> the link so it's never part of the accessible name.
            Mirrors the current app's blue box-iconed panel titles.
          </Lead>
          <div class={styles.titleList}>
            <SectionTitle
              title="Inbound Shipments"
              href="/demo"
              icon={<StockIcon />}
            />
            <SectionTitle title="Expiring stock" icon={<StockIcon />} />
          </div>
        </DashboardCard>

        <DashboardCard title="Statistic — value, label, optional link (+ alert / info)">
          <Lead>
            Hand-rolled over a semantic router <code>&lt;A&gt;</code>, so the
            link role and accessible name (value + label) come for free — no
            library. A big value sits in a right-aligned column so labels line
            up down a panel, matching the current app. <code>alert</code> raises
            a red "needs attention" <code>StatusChip</code> beneath (the value
            stays normal) — the meaning is carried by the chip's text,{' '}
            <em>never by colour alone</em> (accessibility § colour
            independence).
          </Lead>
          <Lead>
            <code>info</code> hangs an <code>InfoTooltip</code> beside the
            label: a real focusable trigger that opens on hover, keyboard focus{' '}
            <em>and</em> tap, named after the stat it explains. It sits{' '}
            <em>outside</em> the row's <code>&lt;A&gt;</code> — a{' '}
            <code>&lt;button&gt;</code> may not nest inside an anchor — so the
            stat is a wrapper holding the link and the marker side by side, in
            both the linked and unlinked forms.
          </Lead>
          <Lead>
            <code>href</code> is <em>optional</em>. A metric with no drill-down
            omits it and renders as plain text (the last row below): hover it
            and the label doesn't underline, and it takes no tab stop. Never
            point a stat at the page it already sits on — that ships an element
            announced as a link that leads nowhere.
          </Lead>
          <div class={styles.statList}>
            <Statistic label="Not delivered" value="15" href="/demo" />
            <Statistic
              label="Emergency"
              value="2"
              href="/demo"
              alert
              alertLabel="Needs attention"
            />
            <Statistic
              label="Products at risk of being out of stock"
              value="1"
              href="/demo"
              info="The info marker explains the count in a tooltip."
            />
            <Statistic
              label="Batches expiring in between 30 days and 90 days"
              value="128"
              href="/demo"
            />
            {/* No href — the no-drill-down form (e.g. the item detail's
                average-monthly-consumption stat), here carrying an info marker
                too: the tooltip is reachable on a row that is not a link. */}
            <Statistic
              label="Months of stock (no drill-down)"
              value="4.75"
              info="Stock on hand divided by average monthly consumption."
            />
          </div>
        </DashboardCard>

        <DashboardCard title="StatsPanel — ready / loading / error states">
          <Lead>
            Hand-rolled inner card grouping Statistics as a vertical list, with
            a <code>SectionTitle</code> heading. Each panel owns its own loading
            / error state from its count query, so one forbidden family errors
            in place without touching its siblings: <code>loading</code> (
            <code>aria-busy</code>) and <code>error</code> both replace the
            stats with a muted text line — the current app's understated
            treatment, and the repo's content-loading standard (a short text,
            not a skeleton or spinner).
          </Lead>
          <div class={styles.panels}>
            <StatsPanel
              title="Inbound Shipments"
              titleHref="/demo"
              icon={<StockIcon />}
              state={{ status: 'ready' }}
            >
              <Statistic label="Today" value="0" href="/demo" />
              <Statistic label="This week" value="0" href="/demo" />
              <Statistic label="Not delivered" value="15" href="/demo" />
            </StatsPanel>
            <StatsPanel
              title="Expiring stock"
              icon={<StockIcon />}
              state={{ status: 'loading', loadingMessage: 'Loading…' }}
            />
            <StatsPanel
              title="Stock levels"
              icon={<StockIcon />}
              state={{
                status: 'error',
                errorMessage: 'You do not have permission to view stock counts',
              }}
            />
          </div>
        </DashboardCard>

        <PluginOutletCard />

        <PluginSlotOutletCard />

        <DashboardCard title="DashboardCard — titled card of panels + footer action">
          <Lead>
            Hand-rolled card (<code>--surface-raised</code>,{' '}
            <code>--radius-lg</code>, <code>shadow[2]</code>) — the outer
            dashboard tile: an <code>&lt;h2&gt;</code> title, a column of
            StatsPanels, and an optional <code>footer</code> action pinned to
            the bottom edge. Presentational only — the section owns the data,
            the display gates and what fills the footer. Equal-height, so cards
            across a row line up however many stats each holds.
          </Lead>
          <div class={styles.widgetFrame}>
            <ReplenishmentCard />
          </div>
        </DashboardCard>
      </Stack>
    </ContentContainer>

    <DashboardCard
      id="statistics-composition"
      title="Composition — CardGrid laying out DashboardCards"
    >
      <Lead>
        <code>CardGrid</code> is a generic intrinsic grid (ui-standards §
        Layout): <code>repeat(auto-fit, minmax(minColumnWidth, 1fr))</code> — it
        fits as many equal columns of at least <code>minColumnWidth</code> as
        the width allows and wraps the rest, with <em>no breakpoint maths</em>{' '}
        (principle #7, intrinsic-first). It renders nothing on its own, so it's
        shown here doing its real job — laying out DashboardCards. Resize the
        panel to watch them reflow. Columns here are also capped (
        <code>maxColumnWidth="26rem"</code>), so cards hold a dashboard-tile
        width instead of growing to share spare row space.
      </Lead>
      <CardGrid maxColumnWidth="26rem">
        <ReplenishmentCard />
        <DistributionCard />
        <InventoryCard />
        <ColdChainCard />
      </CardGrid>
    </DashboardCard>
  </Stack>
);

export const statisticsMetadata: PageMetadata = {
  id: 'statistics',
  title: 'Statistics',
  searchTerms: ['dashboard', 'stat', 'widget', 'metric'],
  items: [
    {
      id: 'statistics-building-blocks',
      title: 'Building blocks',
      searchTerms: [
        'section title',
        'statistic',
        'stats panel',
        'dashboard card',
        'kpi',
      ],
    },
    {
      id: 'statistics-plugin-outlet',
      title: 'Plugin outlet',
      searchTerms: ['plugin', 'region', 'contribution', 'mount point'],
    },
    {
      id: 'statistics-plugin-slot-outlet',
      title: 'Plugin slot outlet',
      searchTerms: ['plugin', 'slot', 'props', 'info panel', 'no remount'],
    },
    {
      id: 'statistics-composition',
      title: 'Composition',
      searchTerms: ['cardgrid', 'grid', 'layout', 'assembled'],
    },
  ],
};

export const StatisticsShowcase = () => (
  <MemoryRouter>
    <Route path="*" component={Demo} />
  </MemoryRouter>
);
