/*
 * The reference plugin PAGE (spec/plugins/sdk-contract.md § the page
 * contribution) — its own module, reached through the section's `load`, so the
 * host imports it on FIRST navigation to the page and never at startup
 * (AC-PLUG-P2). The console line below is the proof: it prints when this
 * module evaluates, which must be the first visit to the page, not app boot.
 *
 * The host owns the frame — the page header carries this page's translated
 * label as its breadcrumb — and this component is the body only. Like every
 * contribution it imports nothing but the SDK and solid-js.
 */
import { createSignal } from 'solid-js';
import { formatNumber, pluginIntl, storeHref } from '@openmsupply/plugin-sdk';

const intl = pluginIntl('hello_world');

console.info('[plugins] hello_world: page code evaluated (first navigation)');

const HelloPage = () => {
  const [clicks, setClicks] = createSignal(0);
  return (
    <div data-testid="hello-world-page">
      <p>{intl.t('pages.blurb')}</p>
      <p>
        <button
          type="button"
          data-testid="hello-world-page-counter"
          onClick={() => setClicks(count => count + 1)}
        >
          {intl.t('clicks', { count: formatNumber(clicks()) })}
        </button>{' '}
        {/* The SDK link primitive works from a plugin page exactly as from a
            slot: store and mount are the host's business (AC-PLUG-P3). */}
        <a
          href={storeHref('inventory/stock')}
          style={{ color: 'var(--secondary-main)' }}
          data-testid="hello-world-page-link"
        >
          {intl.t('nav.stock')}
        </a>
      </p>
    </div>
  );
};

export default HelloPage;
