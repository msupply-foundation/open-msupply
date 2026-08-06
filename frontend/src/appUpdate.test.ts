import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkServedVersion,
  parseBuildVersion,
  parseVersionManifest,
  reloadForUpdate,
  startUpdateWatch,
  updateAvailable,
  versionsDiffer,
} from './appUpdate';

// APP_VERSION is a transform-time define ('0.0.0-test', vitest.config.ts), so
// checkServedVersion always compares against that literal here; the parsing
// and comparison branches a define can't reach are covered directly through
// the exported pieces.

const MANIFEST =
  'version: v0.0.82\n' +
  'package: 0.0.82\n' +
  'commit: 2ae7bd2c0ffee0ffee0ffee0ffee0ffee0ffee00\n';

const stubFetch = (response: { ok: boolean; text: string }) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    text: () => Promise.resolve(response.text),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('parseVersionManifest', () => {
  it('reads the tag and full commit from a release manifest', () => {
    expect(parseVersionManifest(MANIFEST)).toEqual({
      tag: 'v0.0.82',
      commit: '2ae7bd2c0ffee0ffee0ffee0ffee0ffee0ffee00',
    });
  });

  it('tolerates a manifest without a commit line', () => {
    expect(parseVersionManifest('version: v0.0.82\n')).toEqual({
      tag: 'v0.0.82',
      commit: undefined,
    });
  });

  it('rejects an SPA fallback answering with HTML', () => {
    expect(
      parseVersionManifest('<!doctype html><html><head></head></html>')
    ).toBeUndefined();
  });
});

describe('parseBuildVersion', () => {
  it('splits a pipeline release into tag + short commit stamp', () => {
    expect(parseBuildVersion('v0.0.82 (2ae7bd2)')).toEqual({
      tag: 'v0.0.82',
      commit: '2ae7bd2',
    });
  });

  it('keeps a git-describe build whole, with no commit stamp', () => {
    expect(parseBuildVersion('v0.0.81-5-g89ccd1b5')).toEqual({
      tag: 'v0.0.81-5-g89ccd1b5',
    });
  });
});

describe('versionsDiffer', () => {
  const served = parseVersionManifest(MANIFEST)!;

  it('matches the same build: equal tags, full sha extending the stamp', () => {
    expect(versionsDiffer(served, parseBuildVersion('v0.0.82 (2ae7bd2)'))).toBe(
      false
    );
  });

  it('flags a different tag', () => {
    expect(versionsDiffer(served, parseBuildVersion('v0.0.81 (1111111)'))).toBe(
      true
    );
  });

  it('flags a re-published tag with a different commit', () => {
    expect(versionsDiffer(served, parseBuildVersion('v0.0.82 (1111111)'))).toBe(
      true
    );
  });

  it('compares by tag alone when either commit is unknown', () => {
    expect(
      versionsDiffer({ tag: 'v0.0.82' }, parseBuildVersion('v0.0.82 (1111111)'))
    ).toBe(false);
  });
});

describe('checkServedVersion', () => {
  it('raises the signal when the served tag differs from the build', async () => {
    stubFetch({ ok: true, text: MANIFEST });
    await checkServedVersion();
    expect(updateAvailable()).toBe(true);
  });

  it('withdraws the signal when the served tag matches again (rollback)', async () => {
    stubFetch({ ok: true, text: 'version: 0.0.0-test\n' });
    await checkServedVersion();
    expect(updateAvailable()).toBe(false);
  });

  it('treats a non-OK response as no signal, keeping the last answer', async () => {
    stubFetch({ ok: true, text: MANIFEST });
    await checkServedVersion();
    stubFetch({ ok: false, text: 'Not Found' });
    await checkServedVersion();
    expect(updateAvailable()).toBe(true);
  });

  it('treats an unparseable body as no signal, keeping the last answer', async () => {
    stubFetch({ ok: true, text: MANIFEST });
    await checkServedVersion();
    stubFetch({ ok: true, text: '<!doctype html>' });
    await checkServedVersion();
    expect(updateAvailable()).toBe(true);
  });

  it('swallows a failed fetch (offline) without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(checkServedVersion()).resolves.toBeUndefined();
  });

  it('bypasses the HTTP cache (servers predating oms#12634 send max-age=1y)', async () => {
    const fetchMock = stubFetch({ ok: true, text: MANIFEST });
    await checkServedVersion();
    expect(fetchMock).toHaveBeenCalledWith('/VERSION.txt', {
      cache: 'no-store',
    });
  });
});

describe('startUpdateWatch', () => {
  it('is a strict no-op in dev — vitest runs with import.meta.env.DEV set', () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch({ ok: true, text: MANIFEST });

    const stop = startUpdateWatch();
    vi.advanceTimersByTime(10 * 60_000);

    expect(fetchMock).not.toHaveBeenCalled();
    stop();
  });
});

describe('reloadForUpdate', () => {
  it('reloads the page', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    reloadForUpdate();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
