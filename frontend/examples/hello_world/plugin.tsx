/*
 * The reference frontend plugin: the smallest thing that proves the whole
 * mechanism (spec/plugins/sdk-contract.md § conformance checklist).
 *
 * Imports are the closed set — `@openmsupply/plugin-sdk` and `solid-js`, never
 * host source — and both resolve at runtime through the host's import map, so
 * `createSignal` here is the SAME Solid runtime the host renders with. That is
 * what the greeting proves: its counter is reactive, and its text re-renders on
 * a locale switch, from a module the host never built.
 */
import { createSignal } from 'solid-js';
import {
  PLUGIN_API_VERSION,
  definePlugin,
  formatNumber,
  pluginIntl,
} from '@openmsupply/plugin-sdk';

const CODE = 'hello_world';
const intl = pluginIntl(CODE);

const Greeting = () => {
  const [clicks, setClicks] = createSignal(0);
  return (
    <div>
      <p>{intl.t('greeting')}</p>
      <button type="button" onClick={() => setClicks(count => count + 1)}>
        {intl.t('clicks', { count: formatNumber(clicks()) })}
      </button>
    </div>
  );
};

// Error isolation (spec/plugins/rules.md § error isolation): gated behind
// `?pluginBoom` so the walk can trip it on demand — the host must contain it to
// this one stat and keep every sibling rendering.
const Boom = () => {
  throw new Error(`${CODE}: deliberate render failure (?pluginBoom)`);
};

const flag = (name: string) => new URLSearchParams(location.search).has(name);

/*
 * The internal-order line COLUMN slot (plugins sdk-contract § the column
 * slot). Three contributions, one per thing the slot has to prove:
 *
 *  1. `totalStock` — the declarative form. A `value` function and an anchor is
 *     the whole column: the host renders it through its own number cell, so the
 *     figure is locale-formatted, right-aligned, and hideable in column
 *     settings like a host column. What the real country plugins need.
 *  2. `arrivals` — the BATCHED form. `loadData` runs once per rendered page of
 *     rows, never per cell, and the cell component shows its own loading state
 *     while the batch is in flight (AC-PLUG-K4).
 *  3. `orphan` — the DEGRADATION, behind `?pluginBadAnchor`: an anchor naming a
 *     column that does not exist must put the column at the table's end and say
 *     so in diagnostics, never fail the table (AC-PLUG-K2).
 */

// A stand-in for a real side-fetch: ONE call for the whole page of rows,
// answering with a value per line id. Deliberately slow enough for the cells'
// loading state to be visible.
const loadArrivals = (
  rows: readonly { id: string; availableStockOnHand: number }[]
): Promise<Map<string, number>> =>
  new Promise(resolve => {
    setTimeout(
      () =>
        resolve(
          new Map(rows.map(row => [row.id, row.availableStockOnHand * 2]))
        ),
      600
    );
  });

const ArrivalsCell = (props: {
  data: number | undefined;
  isLoading: boolean;
}) => (
  <span data-numeric>
    {props.isLoading
      ? intl.t('loading')
      : props.data === undefined
        ? ''
        : formatNumber(props.data)}
  </span>
);

export default definePlugin({
  manifest: {
    code: CODE,
    version: '1.0.0',
    pluginApiVersion: PLUGIN_API_VERSION,
  },
  // Two catalogues, because one locale cannot prove anything: switching the
  // app's language must re-render this plugin's text, and only a plugin sharing
  // the host's ONE Solid instance can be re-rendered by the host's locale
  // signal.
  translations: {
    en: {
      greeting: 'Hello from a plugin',
      clicks: 'Clicked {{count}} times',
      loading: '…',
      'column.total-stock': 'Total stock',
      'column.total-stock-description': 'Initial stock on hand plus incoming',
      'column.arrivals': 'Arrivals',
      'column.orphan': 'Orphan',
    },
    fr: {
      greeting: 'Bonjour depuis un plugin',
      clicks: 'Cliqué {{count}} fois',
      loading: '…',
      'column.total-stock': 'Stock total',
      'column.total-stock-description': 'Stock initial plus arrivages',
      'column.arrivals': 'Arrivages',
      'column.orphan': 'Orphelin',
    },
  },
  contributions: [
    {
      slot: 'dashboard.stat',
      id: 'greeting',
      panel: 'replenishment.internal-order',
      Component: Greeting,
    },
    {
      slot: 'dashboard.stat',
      id: 'boom',
      panel: 'replenishment.internal-order',
      when: () => flag('pluginBoom'),
      Component: Boom,
    },
    {
      slot: 'internalOrderLine.column',
      id: 'totalStock',
      header: 'column.total-stock',
      description: 'column.total-stock-description',
      // Anchored to a PUBLISHED host column id, never an index
      // (spec/internal-orders/ui-surface.md § S8).
      anchor: { after: 'amc' },
      align: 'end',
      value: row => row.initialStockOnHandUnits + row.incomingUnits,
    },
    {
      slot: 'internalOrderLine.column',
      id: 'arrivals',
      header: 'column.arrivals',
      anchor: { after: 'mos' },
      align: 'end',
      loadData: loadArrivals,
      Component: props => (
        <ArrivalsCell
          data={props.data as number | undefined}
          isLoading={props.isLoading}
        />
      ),
    },
    {
      slot: 'internalOrderLine.column',
      id: 'orphan',
      header: 'column.orphan',
      anchor: { after: 'no-such-column' },
      when: () => flag('pluginBadAnchor'),
      value: () => '!',
    },
  ],
});
