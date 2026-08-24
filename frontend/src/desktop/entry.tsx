/* @refresh reload */
import { render } from 'solid-js/web';
import '../index.css';

/*
 * Entry for the desktop shell's bundled discovery page (discovery.html →
 * vite.discovery.config.ts, `pnpm build:discovery`): the pre-server half of
 * the desktop platform (spec/desktop) — served by the shell on this machine,
 * never by a server, because it runs before any server is chosen. As with the
 * app's own startup, the locale dictionary loads before first render so
 * library components never flash raw keys.
 *
 * In dev (`pnpm dev` → /discovery.html) a plain browser tab has no shell to
 * inject the host bridge, so a mock is installed instead — the import sits in
 * a statically-false branch in production builds, so neither it nor its fake
 * servers exist in what the shell loads.
 */
const boot = async () => {
  const [{ DiscoveryPage }, { initialiseLocale, detectLocale }] =
    await Promise.all([import('./DiscoveryPage'), import('../intl')]);
  await initialiseLocale(detectLocale());
  render(() => <DiscoveryPage />, document.getElementById('root')!);
};

if (import.meta.env.DEV && window.electronNativeAPI === undefined) {
  void import('./devHostMock').then(({ installDevHostMock }) => {
    installDevHostMock();
    void boot();
  });
} else {
  void boot();
}
