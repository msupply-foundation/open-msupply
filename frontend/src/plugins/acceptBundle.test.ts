/*
 * The loader's acceptance decision (spec/plugins/rules.md § discovery &
 * loading, § compatibility gates; invariants summary).
 *
 * The MUSTs under test:
 * · "A plugin that fails to load or register is SKIPPED: the app continues
 *   without it, other plugins are unaffected, and the failure is surfaced."
 * · "A plugin built against a NEWER plugin API than the host never loads; one
 *   built against an OLDER same-major API always does."
 * · "A plugin failure MUST NOT take down the app."
 *
 * A bundle is arbitrary third-party code, so the malformed cases are the point:
 * every one of them must come back as a stated reason rather than a throw. The
 * non-array `contributions` case is the load-bearing one — `contributionsFor`
 * flatMaps over that value on every slot render, outside any error boundary, so
 * letting it through would break every slot in the app, not just this plugin's.
 */
import { describe, expect, it } from 'vitest';
import type { JSX } from 'solid-js';
import { acceptBundle } from './acceptBundle';
import { PLUGIN_API_VERSION, SLOTS } from './sdk/types';

const manifest = (overrides: Record<string, unknown> = {}) => ({
  code: 'civ_plugins',
  version: '2.0.0',
  pluginApiVersion: PLUGIN_API_VERSION,
  ...overrides,
});

const bundle = (definition: unknown) => ({ default: definition });

const contribution = {
  slot: SLOTS.prescriptionPaymentForm,
  id: 'payment-capture',
  Component: (): JSX.Element => null,
};

describe('acceptBundle — a well-formed bundle', () => {
  it('accepts it and takes code and version from the manifest', () => {
    const verdict = acceptBundle(
      bundle({ manifest: manifest(), contributions: [contribution] })
    );
    expect(verdict).toEqual({
      kind: 'accepted',
      plugin: {
        code: 'civ_plugins',
        version: '2.0.0',
        contributions: [contribution],
      },
    });
  });

  it('accepts one with no contributions at all', () => {
    const verdict = acceptBundle(bundle({ manifest: manifest() }));
    expect(verdict.kind).toBe('accepted');
    expect(verdict.kind === 'accepted' && verdict.plugin.contributions).toEqual(
      []
    );
  });
});

describe('acceptBundle — compatibility gates', () => {
  it('refuses a plugin built against a newer plugin API', () => {
    const verdict = acceptBundle(
      bundle({
        manifest: manifest({ pluginApiVersion: PLUGIN_API_VERSION + 1 }),
      })
    );
    expect(verdict.kind).toBe('skipped');
    // The message must name the mismatch for whoever installed it.
    expect(verdict.kind === 'skipped' && verdict.reason).toContain(
      `v${PLUGIN_API_VERSION + 1}`
    );
  });

  it('accepts a plugin built against an older same-major API', () => {
    expect(
      acceptBundle(bundle({ manifest: manifest({ pluginApiVersion: 1 }) })).kind
    ).toBe('accepted');
  });

  it('refuses a manifest whose code disagrees with the installed code', () => {
    const verdict = acceptBundle(
      bundle({ manifest: manifest() }),
      'haiti_plugins'
    );
    expect(verdict.kind).toBe('skipped');
    expect(verdict.kind === 'skipped' && verdict.reason).toContain(
      'installed as "haiti_plugins"'
    );
  });

  it('accepts when the manifest matches the installed code', () => {
    expect(
      acceptBundle(bundle({ manifest: manifest() }), 'civ_plugins').kind
    ).toBe('accepted');
  });

  it('does not compare against an installed code when there is none', () => {
    // A DEV-LINKED plugin has no installed code — the directory it sits in is
    // not its identity. Comparing against one rejected every dev-linked plugin
    // whose folder was named anything but its code.
    expect(acceptBundle(bundle({ manifest: manifest() })).kind).toBe(
      'accepted'
    );
  });
});

describe('acceptBundle — a malformed bundle is skipped, never thrown', () => {
  const cases: [string, unknown][] = [
    ['a module with no default export', {}],
    ['a default export that is not an object', bundle('nope')],
    ['a null default export', bundle(null)],
    ['a definition with no manifest', bundle({ contributions: [] })],
    ['a manifest that is not an object', bundle({ manifest: 'civ_plugins' })],
    [
      'a manifest with no code',
      bundle({ manifest: manifest({ code: undefined }) }),
    ],
    ['an empty code', bundle({ manifest: manifest({ code: '' }) })],
    ['a non-string code', bundle({ manifest: manifest({ code: 42 }) })],
    ['a non-string version', bundle({ manifest: manifest({ version: 2 }) })],
    [
      'a non-numeric plugin API version',
      bundle({ manifest: manifest({ pluginApiVersion: '1' }) }),
    ],
    ['undefined', undefined],
    ['null', null],
    ['a string', 'export default 1'],
    // The one that would break every slot in the app rather than just its own.
    [
      'a non-array contributions',
      bundle({
        manifest: manifest(),
        contributions: { payment: contribution },
      }),
    ],
  ];

  for (const [description, module] of cases) {
    it(`skips ${description}`, () => {
      expect(() => acceptBundle(module)).not.toThrow();
      expect(acceptBundle(module).kind).toBe('skipped');
    });
  }

  it('always states a reason', () => {
    for (const [, module] of cases) {
      const verdict = acceptBundle(module);
      expect(
        verdict.kind === 'skipped' && verdict.reason.length
      ).toBeGreaterThan(0);
    }
  });
});
