import { createSignal } from 'solid-js';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { StatsPanel } from '../ui/elements/dashboard/StatsPanel';
import { Statistic } from '../ui/elements/dashboard/Statistic';
import { ThermometerIcon } from '../ui/icons';
import { Table } from '../ui/elements/table/Table';
import { Button } from '../ui/elements/buttons/Button';
import type { PluginRegionContribution } from '../ui/elements/plugins/PluginRegionOutlet';
import type { PluginSlotContribution } from '../ui/elements/plugins/PluginSlotOutlet';

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

/*
 * The props-carrying outlet's demo contribution (PluginSlotOutlet): a panel
 * over a record it is GIVEN, the way the internal-order line editor's
 * info-panel slot hands over the line being edited.
 *
 * Its point is the mount counter: switching records must change the facts
 * WITHOUT the mount count moving, because the host may never remount a
 * contribution to give it new props (plugins AC-PLUG-N2).
 */
export type DemoPanelRecord = {
  readonly code: string;
  readonly name: string;
  readonly amc: number;
};

let panelMounts = 0;

const DemoInfoPanel = (props: { record: DemoPanelRecord }) => {
  const mount = ++panelMounts;
  const [clicks, setClicks] = createSignal(0);
  return (
    <div>
      <Table label="Contributed item information">
        <thead>
          <tr>
            <th>Fact</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Item</td>
            <td>
              {props.record.code} · {props.record.name}
            </td>
          </tr>
          <tr>
            <td>AMC</td>
            <td data-numeric>{props.record.amc}</td>
          </tr>
        </tbody>
      </Table>
      <p>
        <Button variant="secondary" onClick={() => setClicks(n => n + 1)}>
          Clicked {clicks()} times
        </Button>{' '}
        mounted #{mount}
      </p>
    </div>
  );
};

export const demoPluginPanelContributions: PluginSlotContribution<{
  record: DemoPanelRecord;
}>[] = [
  { id: 'demo-plugin.item-info', Component: DemoInfoPanel },
  { id: 'demo-plugin.throwing-panel', Component: BrokenStat },
];
