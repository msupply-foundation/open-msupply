import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindHostNavigate } from './hostNavigate';
import {
  bindHostSearch,
  hostSearchParam,
  setHostSearchParams,
} from './hostSearchParams';

/*
 * The query-string half of the router bridge (./hostNavigate.ts is the other),
 * which is how a plugin list screen keeps filter/sort/page in the URL without
 * `@solidjs/router` entering the SDK's import graph.
 *
 * Two things matter here and both are silent when wrong: the binding must not
 * be left dangling once the shell that made it unmounts, and a write must
 * change ONLY the parameters named — a list screen that dropped `?tab=` while
 * setting its filter would lose the user's place on every keystroke.
 */

// vitest's node environment (vitest.config.ts) has no `location`/`window` at
// all; the stub carries just what the write path reads and records where it
// was sent.
const navigated = vi.fn();
const locate = (href: string) => vi.stubGlobal('window', { location: { href } });
locate('http://host/rc/store-a/stock-count/log');

const errored = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  navigated.mockClear();
  errored.mockClear();
  locate('http://host/rc/store-a/stock-count/log');
});

describe('hostSearchParam', () => {
  it('reads a bound query string, and tracks it', () =>
    createRoot(dispose => {
      const [search, setSearch] = createSignal('?query=%7B%22offset%22%3A100%7D');
      // Handing the accessor over IS the binding; the rule cannot see that
      // `hostSearchParam` calls it, and so tracks, at every read.
      // eslint-disable-next-line solid/reactivity
      bindHostSearch(search);
      expect(hostSearchParam('query')).toBe('{"offset":100}');

      // Reactive at the source: a Back button moves the address, and the
      // screen reading this must see the state it returned to.
      setSearch('?query=%7B%22offset%22%3A0%7D');
      expect(hostSearchParam('query')).toBe('{"offset":0}');
      dispose();
    }));

  it('reads empty once the binding is released, rather than throwing', () => {
    createRoot(dispose => {
      bindHostSearch(() => '?query=x');
      dispose();
    });
    // An address with no parameter and an unbound reader mean the same thing
    // to a screen: show the default state.
    expect(hostSearchParam('query')).toBeUndefined();
  });

  it('refuses a binding made outside a component body, and reports it', () => {
    bindHostSearch(() => '?query=orphan');
    expect(errored).toHaveBeenCalledOnce();
    // Nothing was bound, so nothing can dangle.
    expect(hostSearchParam('query')).toBeUndefined();
  });

  it('is undefined for a parameter the address does not carry', () =>
    createRoot(dispose => {
      bindHostSearch(() => '?tab=lines');
      expect(hostSearchParam('query')).toBeUndefined();
      dispose();
    }));
});

describe('setHostSearchParams', () => {
  const withNavigator = (run: () => void) =>
    createRoot(dispose => {
      bindHostNavigate(navigated);
      run();
      dispose();
    });

  it('sets a parameter, keeping the path and the mount base', () =>
    withNavigator(() => {
      setHostSearchParams({ query: '{"offset":100}' });
      expect(navigated).toHaveBeenCalledWith(
        '/rc/store-a/stock-count/log?query=%7B%22offset%22%3A100%7D',
        { replace: true }
      );
    }));

  it('leaves every other parameter alone', () =>
    withNavigator(() => {
      locate('http://host/rc/store-a/stock-count/log?tab=lines&query=old');
      setHostSearchParams({ query: 'new' });
      expect(navigated.mock.calls[0]?.[0]).toBe(
        '/rc/store-a/stock-count/log?tab=lines&query=new'
      );
    }));

  it('clears a parameter on null — a pristine list has a clean URL', () =>
    withNavigator(() => {
      locate('http://host/rc/store-a/stock-count/log?query=old');
      setHostSearchParams({ query: null });
      expect(navigated).toHaveBeenCalledWith('/rc/store-a/stock-count/log', {
        replace: true,
      });
    }));

  it('replaces by default and pushes only when asked', () =>
    withNavigator(() => {
      setHostSearchParams({ query: 'a' });
      // A filter, sort or page change is not a distinct history entry —
      // otherwise Back would walk keystroke by keystroke.
      expect(navigated.mock.calls[0]?.[1]).toEqual({ replace: true });

      setHostSearchParams({ query: 'b' }, { push: true });
      expect(navigated.mock.calls[1]?.[1]).toEqual({ replace: false });
    }));
});
