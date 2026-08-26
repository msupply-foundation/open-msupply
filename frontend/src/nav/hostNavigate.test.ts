import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bindHostNavigate,
  hostNavigate,
  routerHostNavigate,
} from './hostNavigate';

/*
 * The one binding between the router and code that has no router context (the
 * plugin SDK's `navigateTo`). What matters is that it cannot be left dangling:
 * the shell that binds it unmounts on logout, and a stale navigator would keep
 * pushing routes into a torn-down router.
 */

// jsdom's location is not assignable; the fallback path only needs to record
// that it was taken, plus a current URL for the same-destination guard to
// compare against.
const assign = vi.fn();
const replace = vi.fn();
const locate = (pathname: string, search = '') =>
  vi.stubGlobal('location', { assign, replace, pathname, search });
locate('/rc/store-a/dashboard');

afterEach(() => {
  assign.mockClear();
  replace.mockClear();
  locate('/rc/store-a/dashboard');
});

describe('hostNavigate', () => {
  it('hands the href and its options to the bound navigator', () =>
    createRoot(dispose => {
      const navigate = vi.fn();
      bindHostNavigate(navigate);

      hostNavigate('/rc/store-a/inventory/stock');
      hostNavigate('/rc/store-a/catalogue/items', { replace: true });

      expect(navigate).toHaveBeenNthCalledWith(
        1,
        '/rc/store-a/inventory/stock',
        undefined
      );
      expect(navigate).toHaveBeenNthCalledWith(
        2,
        '/rc/store-a/catalogue/items',
        { replace: true }
      );
      dispose();
    }));

  it('releases the binding with the component that made it', () =>
    createRoot(dispose => {
      const navigate = vi.fn();
      bindHostNavigate(navigate);
      dispose();

      hostNavigate('/store-a/inventory/stock');

      // Nothing routed is mounted any more, so the navigation goes through the
      // document rather than into a disposed router.
      expect(navigate).not.toHaveBeenCalled();
      expect(assign).toHaveBeenCalledWith('/store-a/inventory/stock');
    }));

  it('keeps the live binding when a replaced owner cleans up after it', () => {
    const first = vi.fn();
    const second = vi.fn();
    const disposeFirst = createRoot(dispose => {
      bindHostNavigate(first);
      return dispose;
    });
    const disposeSecond = createRoot(dispose => {
      bindHostNavigate(second);
      return dispose;
    });
    // The remount order a Solid transition can produce: the new owner binds
    // before the old one's cleanup runs.
    disposeFirst();

    hostNavigate('/store-a/inventory/stock');

    expect(second).toHaveBeenCalledOnce();
    expect(assign).not.toHaveBeenCalled();
    disposeSecond();
  });

  it('falls back to a document navigation when nothing is bound', () => {
    hostNavigate('/store-a/inventory/stock');
    hostNavigate('/store-a/catalogue/items', { replace: true });

    expect(assign).toHaveBeenCalledWith('/store-a/inventory/stock');
    expect(replace).toHaveBeenCalledWith('/store-a/catalogue/items');
  });

  it('drops an unbound navigation to the URL already shown', () => {
    // The plugin-module-scope shape: nothing bound, and the resolved href is
    // where the document already is (before a store is entered, `storeHref`
    // addresses the app root — the very page loading the plugin). A document
    // navigation here is a reload that re-runs the caller: an infinite reload
    // loop, so it is dropped rather than taken.
    locate('/rc/');
    hostNavigate('/rc/');
    // Trailing slash and `replace` don't make it a different destination.
    hostNavigate('/rc', { replace: true });

    expect(assign).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('still navigates unbound when only the query differs', () => {
    locate('/rc/store-a/inventory/stock', '?query=a');
    hostNavigate('/rc/store-a/inventory/stock?query=b');
    hostNavigate('/rc/store-a/inventory/stock');

    expect(assign).toHaveBeenNthCalledWith(
      1,
      '/rc/store-a/inventory/stock?query=b'
    );
    expect(assign).toHaveBeenNthCalledWith(2, '/rc/store-a/inventory/stock');
  });

  it('leaves a same-destination navigation to the router when bound', () =>
    createRoot(dispose => {
      // The guard is the unbound fallback's own; a bound router hears about
      // every navigation and settles same-route ones itself, without a reload.
      const navigate = vi.fn();
      bindHostNavigate(navigate);
      locate('/rc/store-a/inventory/stock');

      hostNavigate('/rc/store-a/inventory/stock');

      expect(navigate).toHaveBeenCalledOnce();
      dispose();
    }));
});

/*
 * The seam ShellLayout binds — the half neither suite covered while the
 * adapter was an inline lambda there, and the half a nested mount depends on
 * (AC-PLUG-P3/P4).
 *
 * `resolve: false` is the whole content of the adapter, and dropping it fails
 * ONLY on a nested mount: the router would resolve an already-resolved href
 * against the base a second time ('/rc' + '/rc/{store}/…'), match no route and
 * drop the mount — silent at the root, where the base is '' and both settings
 * agree. So it is asserted here rather than trusted to a comment. What a
 * rendered `<Router base="/rc">` would add on top is the router's own
 * behaviour, which is not this repo's to test (and has no DOM to run in).
 */
describe('routerHostNavigate', () => {
  it('tells the router the href is already resolved', () => {
    const navigate = vi.fn();

    routerHostNavigate(navigate)('/rc/store-a/inventory/stock');

    expect(navigate).toHaveBeenCalledWith('/rc/store-a/inventory/stock', {
      resolve: false,
    });
  });

  it("carries the caller's options through alongside it", () => {
    const navigate = vi.fn();

    routerHostNavigate(navigate)('/rc/store-a/catalogue/items', {
      replace: true,
    });

    expect(navigate).toHaveBeenCalledWith('/rc/store-a/catalogue/items', {
      replace: true,
      resolve: false,
    });
  });

  it('cannot be talked out of it by a caller', () => {
    const navigate = vi.fn();

    // A caller has no `resolve` in its own options type (`replace` alone), but
    // an object carrying one still passes structurally — and resolving twice
    // is the failure this seam exists to prevent. Pins the spread ORDER:
    // `{ resolve: false, ...options }` would read the same and be wrong.
    const options = { replace: false, resolve: true };
    routerHostNavigate(navigate)('/rc/store-a/inventory/stock', options);

    expect(navigate).toHaveBeenCalledWith('/rc/store-a/inventory/stock', {
      replace: false,
      resolve: false,
    });
  });
});
