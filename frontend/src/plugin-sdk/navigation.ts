/*
 * The plugin navigation surface (spec/plugins/sdk-contract.md § SDK surface —
 * "Navigation: route/link primitives plus typed deep-link builders into core
 * record pages, so plugins never hardcode host routes").
 *
 * This is the route/link half: everything a contribution needs to reach a host
 * screen (AC-PLUG-P3/P4). The typed deep-link builders are the other half
 * (./deepLinks.ts): each returns a store-relative path — the store belongs to
 * the host on this surface, which is the whole point of it — so its output is
 * exactly what these two functions take.
 *
 * A plugin never sees `@solidjs/router`: it is not in the closed import set,
 * and keeping it out is what leaves the host free to change or drop it
 * (kdd/router, kdd/plugin-loading). So the primitives are host-owned functions
 * over a PATH, not re-exported router API.
 *
 * TWO write functions, one read (`currentStorePath`) and one link
 * component (`RecordLink`, ./recordLink.tsx) — the eager SDK surface
 * is startup weight for every plugin-bearing deployment (kdd/bundling § the
 * SDK-eager rule):
 *
 *  - `storeHref` is the link primitive. Its output is an href, so a plugin
 *    links with a plain `<a href>` and gets a real anchor: middle-click, open
 *    in a new tab, the link role and keyboard activation, all for free, and the
 *    router intercepts the click so it stays a client-side navigation. A
 *    component export would add markup and CSS decisions the SDK has no reason
 *    to own.
 *
 *    An href is NOT what an SDK component takes, though: `RecordLink`
 *    (./recordLink.tsx), the one export that takes a destination, takes the
 *    same store-relative PATH these do. What comes out
 *    of `storeHref` is resolved, mount base included, because a bare `<a>` gets
 *    no resolution from anyone; the host's own link components are the router's
 *    `<A>` (see ui/elements/typography/RecordLink.tsx), which resolves against
 *    the base itself and would apply it twice. Two vocabularies, one rule for
 *    telling them apart: raw anchor ⇒ href, component ⇒ path.
 *  - `navigateTo` is the route primitive, for the case an anchor cannot serve:
 *    navigating from code, after something else happened (the audited
 *    Afghanistan plugin deep-links to the prescription it just created —
 *    kdd/plugin-loading/evidence/interface-audits/).
 */
import { type JSX } from 'solid-js';
import { hostNavigate } from '../nav/hostNavigate';
import { pageActions, pageFooter, pageTrail } from '../plugins/pageSlots';
import { hostPathname } from '../nav/hostLocation';
import {
  routerBase,
  storePath,
  storeRelativePath,
} from '../nav/storeRelativePath';
import { currentStoreId } from '../store/storeContext';

/** How a navigation joins history; matches the host's own navigations. */
export interface NavigateOptions {
  /** Replace the current entry instead of pushing one (no Back to here). */
  replace?: boolean;
}

/**
 * An href for a host screen BELOW the store root, from the path as the
 * navigation registry spells it — `'inventory/stock'`,
 * `'dispensary/dispensing'`, `''` for the store's landing screen — plus any
 * query string of its own (`'inventory/stock?query=…'`, or `'?query=…'` on the
 * landing screen itself). A leading slash is tolerated; the path is
 * store-relative either way.
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
  // The join is the shared one (storePath), so the SDK's spelling of a store
  // address cannot drift from the menu's or the keyboard's — one screen, one
  // URL (OMS-REG-NAV-01.22). The mount prefix is this function's own: a bare
  // `<a href>` gets no resolution from the router.
  return `${routerBase}${storePath(storeId, path)}`;
};

/**
 * The path the app currently shows, in the same store-relative vocabulary the
 * write primitives take — `'stock-count/report/past'`, `''` on the store's
 * landing screen. The read half of this surface: a page owns everything below
 * its own path (sdk-contract § Paths), and this is how it reads which of those
 * paths it is on, so drill-in views get real URLs — Back, refresh and links
 * all work — instead of view state a reload forgets.
 *
 * Reactive: it reads the router's live location (bound by the shell, like
 * `navigateTo`'s navigator), so a read inside a component's JSX or a memo
 * re-runs on navigation. Before a store is entered there is no store-relative
 * path to speak of, so it is `undefined` — transient by the same argument as
 * `storeHref`'s early render, since every routed page mounts inside a store.
 */
export const currentStorePath = (): string | undefined => {
  const storeId = currentStoreId();
  if (storeId === undefined) return undefined;
  return storeRelativePath(hostPathname(), storeId);
};

/**
 * Go to a host screen below the store root, from code — same path vocabulary
 * as `storeHref`. Prefer a link where the user is choosing to go somewhere;
 * this is for navigating as the CONSEQUENCE of something (a record created, a
 * flow handed off).
 */
export const navigateTo = (path: string, options?: NavigateOptions): void => {
  // Reported, not silent: with no store entered the href is the app root, so
  // the named path (query included) is dropped and the root guard picks the
  // landing screen — a redirect the caller did not ask for. An href rendered
  // early is normal (it re-resolves reactively); a navigation TAKEN early is a
  // programming error, reported on the same contract as the SDK's no-store
  // guards (bridge.ts). The navigation still happens — the root guard
  // re-enters a store, which beats going nowhere.
  if (currentStoreId() === undefined) {
    console.warn(
      `navigateTo(${path}): no store entered — navigating to the app root instead`
    );
  }
  hostNavigate(storeHref(path), options);
};

/**
 * The route-leave hook (sdk-contract § SDK surface — navigation): listen for
 * every route navigation away from the calling page, for the life of the
 * component. Hold one with `preventDefault()` and replay it with
 * `retry(true)` — a page that saves before it leaves, and prompts only when
 * that save fails (plugins/afghanistan rules § drafts). A reload or tab close
 * is not a route leave: guard those with the browser's own `beforeunload`.
 * Bound by the shell, like `navigateTo`'s navigator (src/nav/hostBeforeLeave).
 */
export { onHostBeforeLeave as onBeforeLeave } from '../nav/hostBeforeLeave';
export type { HostLeaveEvent as BeforeLeaveEvent } from '../nav/hostBeforeLeave';

/**
 * The breadcrumb trail BELOW a plugin page's own crumb (sdk-contract § the
 * page contribution › rendering): a page that owns paths below itself names
 * the screen it is showing, and the host frame renders the page's crumb as
 * the parent link with these after it. Reactive — pass an accessor; the trail
 * is given up when the calling component is disposed. Must be called under an
 * owner (a component body).
 */
export const usePageTrail = (
  trail: () => readonly { label: string; path?: string }[]
): void => pageTrail.use(trail);

/**
 * A plugin page's header action cluster (sdk-contract § the page contribution
 * › rendering): the host frame renders it top-end beside the breadcrumb, where
 * every host page's actions sit. Pass a render function; it is evaluated in
 * the frame, so signals it reads stay live. Given up when the calling
 * component is disposed. Must be called under an owner (a component body).
 */
export const usePageActions = (actions: () => JSX.Element): void =>
  pageActions.use(() => actions);

/**
 * A plugin page's pinned action footer (sdk-contract § the page contribution
 * › rendering): the host frame pins it below the scrolling body, where every
 * host detail screen's actions sit — so the page's own body never has to fake
 * a footer with sticky positioning, which stops behaving the moment the body
 * fits. Pass a render function; it is evaluated in the frame, so signals it
 * reads stay live, and a bar that exists only in some states renders nothing
 * in the others. Given up when the calling component is disposed. Must be
 * called under an owner (a component body).
 */
export const usePageFooter = (footer: () => JSX.Element): void =>
  pageFooter.use(() => footer);
