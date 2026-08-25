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
import { createSignal, onCleanup } from 'solid-js';
import {
  InfoTooltip,
  PLUGIN_API_VERSION,
  Table,
  definePlugin,
  formatNumber,
  navigateTo,
  pluginIntl,
  storeHref,
  type InternalOrderLineInfoPanelProps,
} from '@openmsupply/plugin-sdk';

const CODE = 'hello_world';
const intl = pluginIntl(CODE);

/*
 * Both navigation primitives (spec/plugins/sdk-contract.md § SDK surface), in
 * the two shapes a contribution reaches a host screen by:
 *
 *  - the LINK — `storeHref` gives an href, so this is a plain <a> with a real
 *    link role, middle-click and open-in-new-tab, and the host's router
 *    intercepts the click into a client-side navigation;
 *  - the ROUTE — `navigateTo` goes from code, for when there is no anchor to
 *    click (here, after doing something else first).
 *
 * Neither names the entered store or the app's mount: the same bundle is
 * correct in every store and on every deploy track.
 */
const Greeting = () => {
  const [clicks, setClicks] = createSignal(0);
  return (
    <div>
      <p>{intl.t('greeting')}</p>
      <button type="button" onClick={() => setClicks(count => count + 1)}>
        {intl.t('clicks', { count: formatNumber(clicks()) })}
      </button>{' '}
      <a href={storeHref('inventory/stock')} data-testid="hello-world-link">
        {intl.t('nav.stock')}
      </a>{' '}
      <button
        type="button"
        data-testid="hello-world-navigate"
        onClick={() => {
          setClicks(count => count + 1);
          navigateTo('catalogue/items');
        }}
      >
        {intl.t('nav.items')}
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

/*
 * The internal-order line INFO PANEL slot (plugins sdk-contract § the
 * info-panel slot), behind `?pluginPanel`. One contribution proving the three
 * things that slot has to prove:
 *
 *  1. it receives BOTH published DTOs — the line and its order — and renders
 *     them read-only;
 *  2. a prop change (Save & next) reaches it IN PLACE: the mount stamp and the
 *     click counter below survive the change, because the host must not remount
 *     a contribution to give it new props (AC-PLUG-N2);
 *  3. SDK components carry the host's styling across the boundary: the facts
 *     below are a host `Table`, styled by the host's own stylesheet, and the
 *     gloss is a host `InfoTooltip` — the plugin ships no CSS at all.
 */
let mountCount = 0;

const InfoPanel = (props: InternalOrderLineInfoPanelProps) => {
  // Minted ONCE per mount, so a remount is visible on screen and in the DOM.
  const stamp = `mount-${++mountCount}`;
  const [clicks, setClicks] = createSignal(0);
  onCleanup(() =>
    console.info(`[plugins] ${CODE}: info panel ${stamp} was disposed`)
  );
  return (
    <div
      data-testid="hello-world-info-panel"
      data-panel-mount={stamp}
      data-panel-clicks={clicks()}
    >
      <Table label={intl.t('panel.table-label')}>
        <thead>
          <tr>
            <th>{intl.t('panel.fact')}</th>
            <th>{intl.t('panel.value')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{intl.t('panel.item')}</td>
            <td data-testid="hello-world-info-panel-item">
              {props.line.itemCode} · {props.line.itemName}
            </td>
          </tr>
          <tr>
            <td>{intl.t('panel.amc')}</td>
            <td data-numeric>
              {formatNumber(props.line.averageMonthlyConsumption)}
            </td>
          </tr>
          <tr>
            <td>{intl.t('panel.order')}</td>
            <td>
              #{formatNumber(props.order.requisitionNumber)} ·{' '}
              {props.order.status} ·{' '}
              {props.order.editable
                ? intl.t('panel.editable')
                : intl.t('panel.read-only')}
            </td>
          </tr>
          <tr>
            <td>{intl.t('panel.program')}</td>
            <td>{props.order.programName ?? intl.t('panel.general-order')}</td>
          </tr>
          <tr>
            <td>{intl.t('panel.period')}</td>
            <td>{props.order.periodName ?? ''}</td>
          </tr>
        </tbody>
      </Table>
      <p>
        <button
          type="button"
          data-testid="hello-world-info-panel-counter"
          onClick={() => setClicks(count => count + 1)}
        >
          {intl.t('clicks', { count: formatNumber(clicks()) })}
        </button>{' '}
        <span data-testid="hello-world-info-panel-mount">{stamp}</span>{' '}
        <InfoTooltip
          text={intl.t('panel.help')}
          label={intl.t('panel.help')}
          triggerTestId="hello-world-info-panel-help"
        />
      </p>
    </div>
  );
};

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
      'nav.stock': 'Stock (link)',
      'nav.items': 'Items (from code)',
      'column.total-stock': 'Total stock',
      'column.total-stock-description': 'Initial stock on hand plus incoming',
      'column.arrivals': 'Arrivals',
      'column.orphan': 'Orphan',
      'panel.table-label': 'Plugin item information',
      'panel.fact': 'Fact',
      'panel.value': 'Value',
      'panel.item': 'Line',
      'panel.amc': 'AMC (units)',
      'panel.order': 'Order',
      'panel.program': 'Program',
      'panel.period': 'Period',
      'panel.general-order': 'General order',
      'panel.editable': 'editable',
      'panel.read-only': 'read-only',
      'panel.help': 'Everything here came from the slot props',
    },
    fr: {
      greeting: 'Bonjour depuis un plugin',
      clicks: 'Cliqué {{count}} fois',
      loading: '…',
      'nav.stock': 'Stock (lien)',
      'nav.items': 'Articles (depuis le code)',
      'column.total-stock': 'Stock total',
      'column.total-stock-description': 'Stock initial plus arrivages',
      'column.arrivals': 'Arrivages',
      'column.orphan': 'Orphelin',
      'panel.table-label': "Informations sur l'article (plugin)",
      'panel.fact': 'Donnée',
      'panel.value': 'Valeur',
      'panel.item': 'Ligne',
      'panel.amc': 'CMM (unités)',
      'panel.order': 'Commande',
      'panel.program': 'Programme',
      'panel.period': 'Période',
      'panel.general-order': 'Commande générale',
      'panel.editable': 'modifiable',
      'panel.read-only': 'lecture seule',
      'panel.help': 'Tout ceci provient des props du slot',
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
    {
      slot: 'internalOrderLine.infoPanel',
      id: 'itemInfo',
      // Behind a flag so the SAME session can show the region both ways: with
      // it, the panel renders below the line's statistics; without it, the
      // editor has no seam at all (AC-PLUG-N1).
      when: () => flag('pluginPanel'),
      Component: InfoPanel,
    },
    {
      slot: 'internalOrderLine.infoPanel',
      id: 'panelBoom',
      when: () => flag('pluginPanelBoom'),
      Component: Boom,
    },
  ],
});
