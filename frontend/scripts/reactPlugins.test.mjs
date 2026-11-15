import { describe, expect, it } from 'vitest';
import { checkReactParts } from './reactPlugins.mjs';

const solidFrontend = { code: 'civ_plugins', version: '3.0.1', dir: 'civ' };
const solidBackend = {
  code: 'civ_plugins',
  version: '3.0.1',
  dir: 'civ/backend',
};
const reactFrontend = {
  code: 'civ_plugins',
  version: '3.0.1',
  dir: 'civ/react/frontend/latest',
  target: 'frontend',
  hostRuntime: 'react',
};
const reactBackend = {
  code: 'civ_plugins',
  version: '3.0.1',
  dir: 'civ/react/backend/latest',
  target: 'backend',
  hostRuntime: 'react',
};

describe('checkReactParts', () => {
  it('passes a plugin whose parts agree', () => {
    expect(
      checkReactParts([solidFrontend, solidBackend], [reactFrontend], 'solid')
    ).toBeNull();
  });

  it('blocks a SolidJS and React frontend on different versions', () => {
    const failure = checkReactParts(
      [solidFrontend, undefined],
      [{ ...reactFrontend, version: '3.0.0' }],
      'solid'
    );
    expect(failure.blocking).toBe(true);
    expect(failure.why).toContain('different versions');
  });

  it('blocks a SolidJS and React frontend with different codes', () => {
    const failure = checkReactParts(
      [solidFrontend, undefined],
      [{ ...reactFrontend, code: 'civ_react' }],
      'solid'
    );
    expect(failure.blocking).toBe(true);
    expect(failure.why).toContain('different plugin codes');
  });

  it('blocks a React backend beside a SolidJS backend', () => {
    const failure = checkReactParts(
      [solidFrontend, solidBackend],
      [reactFrontend, reactBackend],
      'solid'
    );
    expect(failure.blocking).toBe(true);
    expect(failure.why).toContain('two backends');
  });

  it('blocks a React part declaring the SolidJS runtime', () => {
    const failure = checkReactParts(
      [solidFrontend, undefined],
      [{ ...reactFrontend, hostRuntime: 'solid' }],
      'solid'
    );
    expect(failure.blocking).toBe(true);
    expect(failure.why).toContain('host_runtime "solid"');
  });

  it("reports a React-only plugin's mismatch without blocking", () => {
    const failure = checkReactParts(
      [undefined, undefined],
      [reactFrontend, { ...reactBackend, version: '1.0.1' }],
      'solid'
    );
    expect(failure.blocking).toBe(false);
    expect(failure.why).toContain('different versions');
  });
});
