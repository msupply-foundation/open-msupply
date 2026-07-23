import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { StatsPanel } from '../ui/elements/dashboard/StatsPanel';
import { Statistic } from '../ui/elements/dashboard/Statistic';
import { ThermometerIcon } from '../ui/icons';
import type { PluginRegionContribution } from '../ui/elements/plugins/PluginRegionOutlet';

/*
 * A demo plugin bundle: contributions defined in their own module, loaded by
 * the showcase via dynamic `import()`. An installed plugin's bundle differs
 * only upstream (built out-of-tree, served through the import map —
 * kdd/plugin-loading); by the time contributions reach the outlet, both are
 * just `{ id, Component }`.
 */

const DemoStat = () => (
  <Statistic label="Contributed by a plugin" value="8" href="/demo" />
);

/* A broken plugin as the outlet sees it: a component that throws on render. */
const BrokenStat = () => {
  throw new Error('demo: contribution failed to render');
};

/* A whole widget card for the card-grid region — the cold-chain example, the
   canonical plugin widget. */
const ColdChainWidget = () => (
  <DashboardCard title="Cold Chain">
    <StatsPanel
      title="Temperature sensors"
      titleHref="/demo"
      icon={<ThermometerIcon />}
      state={{ status: 'ready' }}
    >
      {/* <Statistic
        label="Sensors in breach"
        value="1"
        href="/demo"
        alert
        alertLabel="Needs attention"
      /> */}
      <Statistic label="Sensors offline" value="2" href="/demo" />
    </StatsPanel>
  </DashboardCard>
);

export const demoPluginStatContributions: PluginRegionContribution[] = [
  { id: 'demo-plugin.working-stat', Component: DemoStat },
  { id: 'demo-plugin.throwing-stat', Component: BrokenStat },
];

export const demoPluginWidgetContributions: PluginRegionContribution[] = [
  { id: 'demo-plugin.cold-chain', Component: ColdChainWidget },
];
