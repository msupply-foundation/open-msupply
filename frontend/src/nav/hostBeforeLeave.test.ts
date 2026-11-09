/*
 * The route-leave hook's ERROR ISOLATION (spec/plugins/sdk-contract.md § SDK
 * surface — navigation; spec/plugins/rules.md § error isolation). The host
 * forwards these events from inside the router's own `useBeforeLeave` handler
 * (src/nav/ShellLayout.tsx), so an uncontained throw aborts the host's
 * navigation — not just the plugin's guard — and the listeners after it never
 * run. The ownership refusal is pinned here too: it is the only thing stopping
 * a listener nothing releases from outliving its screen.
 */
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import {
  dispatchHostBeforeLeave,
  onHostBeforeLeave,
  type HostLeaveEvent,
} from './hostBeforeLeave';

const event = (): HostLeaveEvent & {
  preventDefault: ReturnType<typeof vi.fn>;
  retry: ReturnType<typeof vi.fn>;
} => {
  let prevented = false;
  return {
    toPathname: 'inventory/stock',
    fromPathname: 'daily-tally/t-1',
    get defaultPrevented() {
      return prevented;
    },
    preventDefault: vi.fn(() => {
      prevented = true;
    }),
    retry: vi.fn(),
  };
};

describe('dispatchHostBeforeLeave', () => {
  it('contains a listener that throws, and still runs the ones after it', () => {
    const after = vi.fn();
    const dispose = createRoot(dispose => {
      onHostBeforeLeave(() => {
        throw new Error('the plugin guard is broken');
      });
      onHostBeforeLeave(after);
      return dispose;
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const e = event();
    expect(() => dispatchHostBeforeLeave(e)).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalled();

    error.mockRestore();
    dispose();
  });

  it('releases a navigation the throwing listener was holding', () => {
    const dispose = createRoot(dispose => {
      onHostBeforeLeave(leave => {
        leave.preventDefault();
        throw new Error('threw before arranging its own retry');
      });
      return dispose;
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const e = event();
    dispatchHostBeforeLeave(e);
    // Nothing else will ever replay it, and a held navigation no one retries
    // leaves the app unable to move off the screen.
    expect(e.retry).toHaveBeenCalledWith(true);

    error.mockRestore();
    dispose();
  });

  it('leaves another listener’s hold standing when a later one throws', () => {
    const dispose = createRoot(dispose => {
      onHostBeforeLeave(leave => leave.preventDefault());
      onHostBeforeLeave(leave => {
        leave.preventDefault();
        throw new Error('threw on a navigation already held');
      });
      return dispose;
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const e = event();
    dispatchHostBeforeLeave(e);
    // The first listener's draft is still unsaved: forcing the leave through
    // here would discard it on the second listener's bug.
    expect(e.retry).not.toHaveBeenCalled();

    error.mockRestore();
    dispose();
  });

  it('releases the listener with its owner, and refuses one without', () => {
    const listener = vi.fn();
    const dispose = createRoot(dispose => {
      onHostBeforeLeave(listener);
      return dispose;
    });
    dispose();
    dispatchHostBeforeLeave(event());
    expect(listener).not.toHaveBeenCalled();

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unowned = vi.fn();
    onHostBeforeLeave(unowned);
    expect(error).toHaveBeenCalled();
    dispatchHostBeforeLeave(event());
    expect(unowned).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
