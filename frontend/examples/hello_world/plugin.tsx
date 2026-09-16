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
 * correct in every store and on every deploy track (AC-PLUG-P3/P4).
 *
 * The link's LOOK is the plugin's own, because the host styles no anchor
 * globally — a bare <a> would come out browser-default blue. One host design
 * token is all it takes to sit in key with the surrounding chrome, in either
 * theme (sdk-contract § styling: bespoke styles self-contained, host tokens
 * MAY be consumed — never host class names).
 */
const Greeting = () => {
  const [clicks, setClicks] = createSignal(0);
  return (
    <div>
      <p>{intl.t('greeting')}</p>
      <button type="button" onClick={() => setClicks(count => count + 1)}>
        {intl.t('clicks', { count: formatNumber(clicks()) })}
      </button>{' '}
      <a
        href={storeHref('inventory/stock')}
        style={{ color: 'var(--secondary-main)' }}
        data-testid="hello-world-link"
      >
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

// See the pages contribution below: its gate must survive in-app navigation,
// which drops the query string, so this one is a boot-time fact.
const pagesFlagAtBoot = flag('pluginPages');

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

/*
 * The dashboard BODY slot (plugins sdk-contract § the dashboard region slot),
 * behind `?pluginBody`. The only SCREEN-LEVEL seam in v1: the occupant IS the
 * dashboard body, so the built-in card grid is not beside it — it is never
 * mounted, and none of its six count queries is issued. Two contributions, one
 * per thing this slot has to prove that the piece slots do not:
 *
 *  1. `body` — the SWAP. The frame stays the host's (app frame, page header,
 *     breadcrumb, menu); everything below it is this component. The mount stamp
 *     is the same trick the info panel uses: the host must not remount the
 *     occupant when the registry or the store context churns around it.
 *  2. `bodyBoom` — the FALLBACK, behind `?pluginBodyBoom`: a body that throws
 *     falls back to the BUILT-IN body, never to the neutral piece-region text,
 *     which in a whole-body region would leave the screen with nothing in it.
 */
const Body = () => {
  // Shares the info panel's counter, so the two can never mint the same stamp.
  const stamp = `mount-${++mountCount}`;
  const [clicks, setClicks] = createSignal(0);
  onCleanup(() =>
    console.info(`[plugins] ${CODE}: dashboard body ${stamp} was disposed`)
  );
  return (
    <div
      data-testid="hello-world-dashboard-body"
      data-body-mount={stamp}
      data-body-clicks={clicks()}
    >
      <h2>{intl.t('body.title')}</h2>
      <p>{intl.t('body.blurb')}</p>
      <Table label={intl.t('body.table-label')}>
        <thead>
          <tr>
            <th>{intl.t('panel.fact')}</th>
            <th>{intl.t('panel.value')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{intl.t('body.slot')}</td>
            <td>dashboard.body</td>
          </tr>
          <tr>
            <td>{intl.t('body.built-ins')}</td>
            <td>{intl.t('body.not-mounted')}</td>
          </tr>
        </tbody>
      </Table>
      <p>
        <button
          type="button"
          data-testid="hello-world-dashboard-body-counter"
          onClick={() => setClicks(count => count + 1)}
        >
          {intl.t('clicks', { count: formatNumber(clicks()) })}
        </button>{' '}
        <span data-testid="hello-world-dashboard-body-mount">{stamp}</span>
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
      'pages.section': 'Hello world',
      'pages.hello': 'Hello page',
      'pages.blurb':
        'This whole screen is a plugin page: the menu section, the route, the breadcrumb and this body all came from one pages declaration.',
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
      'body.title': 'This whole dashboard body came from a plugin',
      'body.blurb':
        'The page frame above is still the host’s. Everything below it is one contribution.',
      'body.table-label': 'Plugin dashboard body',
      'body.slot': 'Slot',
      'body.built-ins': 'Built-in widgets',
      'body.not-mounted': 'not mounted — no count query was issued',
    },
    fr: {
      greeting: 'Bonjour depuis un plugin',
      clicks: 'Cliqué {{count}} fois',
      loading: '…',
      'nav.stock': 'Stock (lien)',
      'nav.items': 'Articles (depuis le code)',
      'pages.section': 'Bonjour le monde',
      'pages.hello': 'Page bonjour',
      'pages.blurb':
        'Cet écran entier est une page de plugin : la section du menu, la route, le fil d’Ariane et ce corps proviennent d’une seule déclaration de pages.',
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
      'body.title': 'Tout ce corps de tableau de bord vient d’un plugin',
      'body.blurb':
        'Le cadre de la page ci-dessus reste celui de l’hôte. Tout ce qui suit est une seule contribution.',
      'body.table-label': 'Corps du tableau de bord (plugin)',
      'body.slot': 'Slot',
      'body.built-ins': 'Widgets intégrés',
      'body.not-mounted': 'non montés — aucune requête de comptage émise',
    },
  },
  /*
   * The PAGE contribution (plugins sdk-contract § the page contribution),
   * behind `?pluginPages`: a routed screen placed in a labelled nav section
   * of the plugin's own.
   * What it proves: the page joins the menu and the command palette, the
   * route mounts under the host frame, and the page's code — its own module,
   * inlined into this bundle by the build but a real chunk in dev — is
   * imported on first navigation, never at startup (AC-PLUG-P2). The gate here
   * is a demo flag; a real plugin gates on the session context it is handed
   * (`ctx.storeMode === 'dispensary'`), and MAY add `permissions` to guard the
   * nav entry and the URL with one condition (AC-PLUG-P1).
   */
  navSections: [
    {
      // A menu group is a menu object, not a page: it has no path and no
      // route of its own — pages join it by naming its id in their `nav.in`,
      // and a group nothing offered is placed in simply does not render.
      id: 'helloSection',
      labelKey: 'pages.section',
      // Placement against a published host section id (one shape, every
      // anchored surface): the section renders just above Inventory. An anchor
      // naming a section the store's gates hide falls to the end of the upper
      // list, named in diagnostics — placement is a preference, never a gate.
      anchor: { before: 'inventory' },
      // The flag is captured at module evaluation (boot, when the query string
      // is still in the URL), NOT read live: in-app navigation rewrites the
      // URL without the query, so a live read would fail its own gate the
      // moment the user follows the menu entry it enabled — bouncing them off
      // the page while the menu still lists it. A real plugin gates on the
      // ctx it is handed, which never has this problem. A group gate composes
      // with each placed page's own, on every surface at once.
      when: () => pagesFlagAtBoot,
    },
  ],
  pages: [
    {
      id: 'hello',
      // The page's FULL store-relative path — routing is the page's own,
      // independent of where (or whether) its menu entry is placed.
      path: 'hello-world/hello',
      labelKey: 'pages.hello',
      load: () => import('./HelloPage'),
      // The placement: inside the plugin's own group above. `{ in }` also
      // takes a published host section id; `{ root: true }` is a top-level
      // entry of its own; absent means routed with no menu entry (a detail
      // screen). An `in` id the host and the plugin both lack refuses the
      // plugin at validation, by name (AC-PLUG-P5).
      nav: { in: 'helloSection' },
    },
  ],
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
    // The ids tie-break alphabetically (registry § contributionsFor), so with
    // both flags on `body` takes the region and `bodyBoom` is named in
    // diagnostics as passed over — turn `?pluginBodyBoom` on by itself to watch
    // the built-in body come back in a failed occupant's place.
    {
      slot: 'dashboard.body',
      id: 'body',
      when: () => flag('pluginBody'),
      Component: Body,
    },
    {
      slot: 'dashboard.body',
      id: 'bodyBoom',
      when: () => flag('pluginBodyBoom'),
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
