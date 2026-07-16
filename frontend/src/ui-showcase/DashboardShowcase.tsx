import { MemoryRouter, Route } from '@solidjs/router';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { Widget } from '../ui/elements/dashboard/Widget';
import { StatsPanel } from '../ui/elements/dashboard/StatsPanel';
import { Statistic } from '../ui/elements/dashboard/Statistic';
import { Button } from '../ui/elements/buttons/Button';
import { PlusCircleIcon } from '../ui/icons';

/*
 * Showcase for the dashboard building blocks — CardGrid laying out Widgets, each
 * holding StatsPanels of Statistics. Demonstrates the three panel states
 * (ready / loading / error), a whole-panel title link, an alert-emphasised stat,
 * an info tooltip, and a footer create action.
 *
 * Statistic renders a router <A>, so the demo is wrapped in a MemoryRouter: links
 * resolve and are clickable without navigating the real app.
 */
const Demo = () => (
  <CardGrid>
    <Widget
      title="Replenishment"
      footer={<Button icon={<PlusCircleIcon />}>New inbound shipment</Button>}
    >
      <StatsPanel title="Inbound shipment" titleHref="/demo" state="ready">
        <Statistic label="Today" value="3" href="/demo" />
        <Statistic label="This week" value="12" href="/demo" />
        <Statistic label="Not delivered" value="15" href="/demo" />
      </StatsPanel>
      <StatsPanel title="Internal order" state="ready">
        <Statistic label="Draft" value="3" href="/demo" />
      </StatsPanel>
    </Widget>

    <Widget
      title="Distribution"
      footer={<Button icon={<PlusCircleIcon />}>New outbound shipment</Button>}
    >
      <StatsPanel title="Shipments" titleHref="/demo" state="ready">
        <Statistic label="Have not shipped" value="7" href="/demo" />
      </StatsPanel>
      <StatsPanel title="Customer requisition" state="ready">
        <Statistic label="New" value="16" href="/demo" />
        <Statistic
          label="Emergency"
          value="2"
          href="/demo"
          alert
          info="New emergency requisitions need attention"
        />
      </StatsPanel>
    </Widget>

    <Widget title="Inventory management">
      <StatsPanel title="Expiring stock" state="loading" />
      <StatsPanel
        title="Stock levels"
        state="error"
        errorMessage="You do not have permission to view stock counts"
      />
    </Widget>
  </CardGrid>
);

export const DashboardShowcase = () => (
  <MemoryRouter>
    <Route path="*" component={Demo} />
  </MemoryRouter>
);
