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
    },
    fr: {
      greeting: 'Bonjour depuis un plugin',
      clicks: 'Cliqué {{count}} fois',
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
      when: () => new URLSearchParams(location.search).has('pluginBoom'),
      Component: Boom,
    },
  ],
});
