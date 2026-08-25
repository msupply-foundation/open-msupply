import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindHostNavigate, hostNavigate } from './hostNavigate';

/*
 * The one binding between the router and code that has no router context (the
 * plugin SDK's `navigateTo`). What matters is that it cannot be left dangling:
 * the shell that binds it unmounts on logout, and a stale navigator would keep
 * pushing routes into a torn-down router.
 */

// jsdom's location is not assignable; the fallback path only needs to record
// that it was taken.
const assign = vi.fn();
const replace = vi.fn();
vi.stubGlobal('location', { assign, replace });

afterEach(() => {
  assign.mockClear();
  replace.mockClear();
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
});
