import { MemoryRouter, Route } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { StatsPanel } from '../ui/elements/dashboard/StatsPanel';
import { SectionTitle } from '../ui/elements/dashboard/SectionTitle';
import { Statistic } from '../ui/elements/dashboard/Statistic';
import { Button } from '../ui/elements/buttons/Button';
import { PlusCircleIcon, StockIcon } from '../ui/icons';
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
const Card = (props: {
  title: string;
  lead: JSX.Element;
  children: JSX.Element;
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
);

/* Reusable demo cards — one is shown alone under "DashboardCard", all three
   under "Composition". Labels/values mirror the current app's dashboard. */
const ReplenishmentCard = () => (
  <DashboardCard
    title="Replenishment"
    footer={
      <Button variant="secondary" icon={<PlusCircleIcon />}>
        New inbound shipment
      </Button>
    }
  >
    <StatsPanel
      title="Inbound Shipments"
      titleHref="/demo"
      icon={<StockIcon />}
      state="ready"
    >
      <Statistic label="Today" value="0" href="/demo" />
      <Statistic label="This week" value="0" href="/demo" />
      <Statistic label="Not delivered" value="15" href="/demo" />
    </StatsPanel>
    <StatsPanel title="Internal Orders" icon={<StockIcon />} state="ready">
      <Statistic label="Draft" value="3" href="/demo" />
    </StatsPanel>
  </DashboardCard>
);

const DistributionCard = () => (
  <DashboardCard
    title="Distribution"
    footer={
      <Button variant="secondary" icon={<PlusCircleIcon />}>
        New outbound shipment
      </Button>
    }
  >
    <StatsPanel
      title="Outbound Shipments"
      titleHref="/demo"
      icon={<StockIcon />}
      state="ready"
    >
      <Statistic label="Have not been shipped" value="7" href="/demo" />
    </StatsPanel>
    <StatsPanel title="Requisitions" icon={<StockIcon />} state="ready">
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
    footer={
      <Button variant="secondary" icon={<PlusCircleIcon />}>
        Order more
      </Button>
    }
  >
    <StatsPanel
      title="Expiring stock"
      titleHref="/demo"
      icon={<StockIcon />}
      state="ready"
    >
      <Statistic label="Expired batches" value="2" href="/demo" />
      <Statistic label="Batches expiring in a month" value="2" href="/demo" />
    </StatsPanel>
    <StatsPanel
      title="Stock levels"
      titleHref="/demo"
      icon={<StockIcon />}
      state="ready"
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

const Demo = () => (
  <div class={styles.stack}>
    <Card
      title="SectionTitle — iconed action-tone panel heading"
      lead={
        <>
          Hand-rolled, pure CSS — an <code>&lt;h3&gt;</code> with an optional
          leading icon and text in the action tone (
          <code>--secondary-main</code>
          ), extracted from StatsPanel so the iconed panel heading is defined
          once. The icon inherits <code>currentColor</code>, so it always tracks
          the title; with <code>href</code> the text becomes a router{' '}
          <code>&lt;A&gt;</code> into the unfiltered list, and the icon stays{' '}
          <em>outside</em> the link so it's never part of the accessible name.
          Mirrors the current app's blue box-iconed panel titles.
        </>
      }
    >
      <div class={styles.titleList}>
        <SectionTitle
          title="Inbound Shipments"
          href="/demo"
          icon={<StockIcon />}
        />
        <SectionTitle title="Expiring stock" icon={<StockIcon />} />
      </div>
    </Card>

    <Card
      title="Statistic — value, label, link (+ alert / info)"
      lead={
        <>
          Hand-rolled over a semantic router <code>&lt;A&gt;</code>, so the link
          role and accessible name (value + label) come for free — no library. A
          big value sits in a right-aligned column so labels line up down a
          panel, matching the current app. <code>alert</code> raises a red
          "needs attention" <code>StatusChip</code> beneath (the value stays
          normal), and <code>info</code> adds a brand-toned tooltip marker — the
          meaning is carried by the chip's text and the marker,{' '}
          <em>never by colour alone</em> (accessibility § colour independence).
        </>
      }
    >
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
      </div>
    </Card>

    <Card
      title="StatsPanel — ready / loading / error states"
      lead={
        <>
          Hand-rolled inner card grouping Statistics as a vertical list, with a{' '}
          <code>SectionTitle</code> heading. Each panel owns its own loading /
          error state from its count query, so one forbidden family errors in
          place without touching its siblings: <code>loading</code> (
          <code>aria-busy</code>) and <code>error</code> both replace the stats
          with a muted text line — the current app's understated treatment, and
          the repo's content-loading standard (a short text, not a skeleton or
          spinner).
        </>
      }
    >
      <div class={styles.panels}>
        <StatsPanel
          title="Inbound Shipments"
          titleHref="/demo"
          icon={<StockIcon />}
          state="ready"
        >
          <Statistic label="Today" value="0" href="/demo" />
          <Statistic label="This week" value="0" href="/demo" />
          <Statistic label="Not delivered" value="15" href="/demo" />
        </StatsPanel>
        <StatsPanel
          title="Expiring stock"
          icon={<StockIcon />}
          state="loading"
          loadingMessage="Loading…"
        />
        <StatsPanel
          title="Stock levels"
          icon={<StockIcon />}
          state="error"
          errorMessage="You do not have permission to view stock counts"
        />
      </div>
    </Card>

    <Card
      title="DashboardCard — titled card of panels + footer action"
      lead={
        <>
          Hand-rolled card (<code>--surface-raised</code>,{' '}
          <code>--radius-lg</code>, <code>shadow[2]</code>) — the outer
          dashboard tile: an <code>&lt;h2&gt;</code> title, a column of
          StatsPanels, and an optional <code>footer</code> action pinned to the
          bottom edge. Presentational only — the section owns the data, the
          display gates and what fills the footer. Equal-height, so cards across
          a row line up however many stats each holds.
        </>
      }
    >
      <div class={styles.widgetFrame}>
        <ReplenishmentCard />
      </div>
    </Card>

    <Card
      title="Composition — CardGrid laying out DashboardCards"
      lead={
        <>
          <code>CardGrid</code> is a generic intrinsic grid (ui-standards §
          Layout): <code>repeat(auto-fit, minmax(minColumnWidth, 1fr))</code> —
          it fits as many equal columns of at least <code>minColumnWidth</code>{' '}
          as the width allows and wraps the rest, with{' '}
          <em>no breakpoint maths</em> (principle #7, intrinsic-first). It
          renders nothing on its own, so it's shown here doing its real job —
          laying out DashboardCards. Resize the panel to watch them reflow.
        </>
      }
    >
      <CardGrid>
        <ReplenishmentCard />
        <DistributionCard />
        <InventoryCard />
      </CardGrid>
    </Card>
  </div>
);

export const StatisticsShowcase = () => (
  <MemoryRouter>
    <Route path="*" component={Demo} />
  </MemoryRouter>
);
