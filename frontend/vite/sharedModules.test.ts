import { describe, expect, it } from 'vitest';
import { SHARED_MODULES, buildImportMap, hostPages } from './sharedModules.ts';

describe('SHARED_MODULES', () => {
  it('is exactly the KDD shared-singleton set', () => {
    expect(SHARED_MODULES.map(m => m.specifier)).toEqual([
      'solid-js',
      'solid-js/web',
      'solid-js/store',
      '@openmsupply/plugin-sdk',
    ]);
  });

  it('has unique entry names (they become build entry chunks)', () => {
    const entries = SHARED_MODULES.map(m => m.entry);
    expect(new Set(entries).size).toBe(entries.length);
  });
});

describe('buildImportMap', () => {
  it('maps every shared specifier through the URL resolver', () => {
    const map = JSON.parse(buildImportMap(m => `/assets/${m.entry}-abc123.js`));
    expect(map).toEqual({
      imports: {
        'solid-js': '/assets/shared-solid-abc123.js',
        'solid-js/web': '/assets/shared-solid-web-abc123.js',
        'solid-js/store': '/assets/shared-solid-store-abc123.js',
        '@openmsupply/plugin-sdk': '/assets/shared-plugin-sdk-abc123.js',
      },
    });
  });

  it('produces valid JSON with no extra top-level keys', () => {
    const map = JSON.parse(buildImportMap(m => m.source));
    expect(Object.keys(map)).toEqual(['imports']);
  });
});

describe('hostPages', () => {
  it('defaults to index.html when the config names no input', () => {
    expect(hostPages({})).toEqual({ index: 'index.html' });
  });

  it('keys a string input (showcase/prototypes configs) as the index page', () => {
    expect(
      hostPages({ build: { rollupOptions: { input: 'showcase.html' } } })
    ).toEqual({ index: 'showcase.html' });
  });

  it('passes an object input through — a second page must never be collapsed away', () => {
    const input = { index: 'index.html', discovery: 'discovery.html' };
    expect(hostPages({ build: { rollupOptions: { input } } })).toEqual(input);
  });

  it('rejects the array form (no entry names to key the pages by)', () => {
    expect(() =>
      hostPages({ build: { rollupOptions: { input: ['index.html'] } } })
    ).toThrow(/array rollup input/);
  });
});
