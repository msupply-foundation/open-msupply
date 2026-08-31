/* @refresh reload */
import { render } from 'solid-js/web';
import '../index.css';
import { getDiscoveryHost } from '../platform/discoveryHost';

/*
 * Entry for the shells' bundled discovery page (discovery.html — a second
 * page of the app build, vite.config.ts): the pre-server half of the desktop
 * and Android-client platforms (spec/desktop) — served by the shell on this
 * machine, never by a server, because it runs before any server is chosen.
 * As with the app's own startup, the locale dictionary loads before first
 * render so library components never flash raw keys.
 *
 * The host is resolved ONCE, here, before anything renders: the page is
 * constructed against a host, or against none (a plain browser tab — stated,
 * not searched). In dev (`pnpm dev` → /discovery.html) a tab has no shell to
 * answer, so a mock host is installed instead — the import sits in a
 * statically-false branch in production builds, so neither it nor its fake
 * servers exist in what a shell loads.
 */
const boot = async () => {
  let host = await getDiscoveryHost();
  if (import.meta.env.DEV && host === undefined) {
    const { installDevHostMock } = await import('./devHostMock');
    host = installDevHostMock();
  }
  const [{ DiscoveryPage, NoHostPage }, { initialiseLocale, detectLocale }] =
    await Promise.all([import('./DiscoveryPage'), import('../intl')]);
  await initialiseLocale(detectLocale());
  // Before anything reads this page's own storage: take over what the legacy
  // shell saved somewhere this page cannot look (./discovery.ts §
  // adoptLegacyPreferences). Only the old Android shell reports any, and only
  // on the first launch after an upgrade.
  if (host?.hostInfo) {
    const { adoptLegacyPreferences } = await import('./discovery');
    const info = await host.hostInfo().catch(() => undefined);
    adoptLegacyPreferences(info?.legacy);
  }
  const resolved = host;
  render(
    () => (resolved ? <DiscoveryPage host={resolved} /> : <NoHostPage />),
    document.getElementById('root')!
  );
};

void boot();
