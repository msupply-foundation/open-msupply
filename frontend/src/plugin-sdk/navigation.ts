/*
 * The plugin navigation surface (spec/plugins/sdk-contract.md § SDK surface —
 * "Navigation: route/link primitives plus typed deep-link builders into core
 * record pages, so plugins never hardcode host routes").
 *
 * This is the route/link half: everything a contribution needs to reach a host
 * screen. The typed deep-link builders — the filtered list URLs the dashboard's
 * own stats already use (src/sections/dashboard/statLinks.ts) — are promoted on
 * top of this, and produce exactly the store-relative paths these two take.
 *
 * A plugin never sees `@solidjs/router`: it is not in the closed import set,
 * and keeping it out is what leaves the host free to change or drop it
 * (kdd/router, kdd/plugin-loading). So the primitives are host-owned functions
 * over a PATH, not re-exported router API.
 *
 * TWO functions and no `<Link>` component, deliberately — the eager SDK surface
 * is startup weight for every plugin-bearing deployment (kdd/bundling § the
 * SDK-eager rule):
 *
 *  - `storeHref` is the link primitive. Its output is an href, so a plugin
 *    links with a plain `<a href>` (or hands it to an SDK component that takes
 *    one, e.g. the widget card) and gets a real anchor: middle-click, open in a
 *    new tab, the link role and keyboard activation, all for free, and the
 *    router intercepts the click so it stays a client-side navigation. A
 *    component export would add markup and CSS decisions the SDK has no reason
 *    to own.
 *  - `navigateTo` is the route primitive, for the case an anchor cannot serve:
 *    navigating from code, after something else happened (the audited
 *    Afghanistan plugin deep-links to the prescription it just created —
 *    kdd/plugin-loading/evidence/interface-audits/).
 */
import { hostNavigate } from '../nav/hostNavigate';
import { routerBase } from '../nav/storeRelativePath';
import { currentStoreId } from '../store/storeContext';

/** How a navigation joins history; matches the host's own navigations. */
export interface NavigateOptions {
  /** Replace the current entry instead of pushing one (no Back to here). */
  replace?: boolean;
}

/**
 * An href for a host screen BELOW the store root, from the path as the
 * navigation registry spells it — `'inventory/stock'`,
 * `'dispensary/prescription'`, `''` for the store's landing screen — plus any
 * query string of its own (`'inventory/stock?query=…'`). A leading slash is
 * tolerated; the path is store-relative either way.
 *
 * Two things the plugin therefore never encodes: the entered store, and where
 * the app is MOUNTED. Both are the host's, and both move — the store on every
 * switch, the mount per deploy track (`/rc/`, `/pr-123/`) — and a hand-built
 * `/{store}/inventory/stock` silently leaves the mount off, which the router
 * then declines to intercept, turning a navigation into a 404 (#1141).
 *
 * Reactive: it reads the entered store, so an href read inside a component's
 * JSX re-resolves when the user switches store. Before a store is entered
 * there is no in-store screen to address, so it addresses the app root, whose
 * own guard resolves a store and lands there.
 */
export const storeHref = (path: string): string => {
  const storeId = currentStoreId();
  if (storeId === undefined) return `${routerBase}/`;
  const relative = path.replace(/^\/+/, '');
  const storeRoot = `${routerBase}/${storeId}`;
  return relative ? `${storeRoot}/${relative}` : storeRoot;
};

/**
 * Go to a host screen below the store root, from code — same path vocabulary
 * as `storeHref`. Prefer a link where the user is choosing to go somewhere;
 * this is for navigating as the CONSEQUENCE of something (a record created, a
 * flow handed off).
 */
export const navigateTo = (path: string, options?: NavigateOptions): void =>
  hostNavigate(storeHref(path), options);
