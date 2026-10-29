import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chunkName, measure, stableName } from './bundle-size.mjs';
import {
  CHUNK_BYTES,
  MARKER,
  SIGNIFICANT_BYTES,
  compareSizes,
} from './bundle-size-report.mjs';

/** A dist/ with a manifest and real files, so gzip sizes are real too. */
const fakeDist = (manifest, files) => {
  const dist = mkdtempSync(join(tmpdir(), 'bundle-size-'));
  mkdirSync(join(dist, '.vite'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, '.vite/manifest.json'), JSON.stringify(manifest));
  for (const [f, body] of Object.entries(files))
    writeFileSync(join(dist, f), body);
  return dist;
};
const gz = s => gzipSync(Buffer.from(s)).length;

describe('measure', () => {
  const files = {
    'assets/index-AAAAAAAA.js': 'console.log("app");'.repeat(20),
    'assets/Badge-BBBBBBBB.js': 'export const badge = 1;',
    'assets/lazy-CCCCCCCC.js': 'export const lazy = 2;'.repeat(5),
    'assets/discovery-DDDDDDDD.js': 'console.log("discovery");',
    'assets/index-EEEEEEEE.css': 'body{color:red}',
  };
  const dist = fakeDist(
    {
      'index.html': {
        file: 'assets/index-AAAAAAAA.js',
        isEntry: true,
        imports: ['_Badge-BBBBBBBB.js'],
        dynamicImports: ['src/lazy.ts'],
        css: ['assets/index-EEEEEEEE.css'],
      },
      '_Badge-BBBBBBBB.js': { file: 'assets/Badge-BBBBBBBB.js' },
      'src/lazy.ts': { file: 'assets/lazy-CCCCCCCC.js', isDynamicEntry: true },
      'discovery.html': {
        file: 'assets/discovery-DDDDDDDD.js',
        isEntry: true,
        imports: ['_Badge-BBBBBBBB.js'],
      },
    },
    files
  );

  it('counts the served app, dynamic imports included, and keeps the discovery page apart', () => {
    const m = measure(dist);
    const appJs = ['index-AAAAAAAA', 'Badge-BBBBBBBB', 'lazy-CCCCCCCC'].map(n =>
      gz(files[`assets/${n}.js`])
    );
    expect(m.app.js.total).toBe(appJs.reduce((a, b) => a + b));
    expect(m.app.js.count).toBe(3);
    expect(m.app.css.total).toBe(gz(files['assets/index-EEEEEEEE.css']));
    // Badge is shared, so it's app weight, not discovery-only.
    expect(m.discoveryOnly.js.count).toBe(1);
    // Up front is the static imports only: the lazy chunk is left out.
    expect(Object.keys(m.upfront.js.byName).sort()).toEqual([
      'assets/Badge.js',
      'index.html',
    ]);
    expect(m.upfront.js.total).toBe(appJs[0] + appJs[1]);
    expect(m.upfront.css.total).toBe(m.app.css.total);
    // Source-path keys name their chunk; the shared chunk falls back to its
    // file name.
    expect(Object.keys(m.app.js.byName).sort()).toEqual([
      'assets/Badge.js',
      'index.html',
      'src/lazy.ts',
    ]);
  });

  it('keeps same-named chunks apart where the manifest has their source', () => {
    const dist = fakeDist(
      {
        'index.html': {
          file: 'assets/index-AAAAAAAA.js',
          isEntry: true,
          imports: ['_intl-BBBBBBBB.js', '_intl-CCCCCCCC.js'],
          dynamicImports: [
            'src/intl/locales/en/common.json',
            'src/intl/locales/fr/common.json',
          ],
        },
        'src/intl/locales/en/common.json': {
          file: 'assets/common-DDDDDDDD.js',
        },
        'src/intl/locales/fr/common.json': {
          file: 'assets/common-EEEEEEEE.js',
        },
        '_intl-BBBBBBBB.js': { file: 'assets/intl-BBBBBBBB.js' },
        '_intl-CCCCCCCC.js': { file: 'assets/intl-CCCCCCCC.js' },
      },
      {
        'assets/index-AAAAAAAA.js': 'console.log(1);',
        'assets/common-DDDDDDDD.js': 'export default {"a":"en"};',
        'assets/common-EEEEEEEE.js': 'export default {"a":"fr"};',
        'assets/intl-BBBBBBBB.js': 'export const a = 1;',
        'assets/intl-CCCCCCCC.js': 'export const b = 2;',
      }
    );
    const { byName, countByName } = measure(dist).app.js;
    expect(Object.keys(byName).sort()).toEqual([
      'assets/intl.js',
      'index.html',
      'src/intl/locales/en/common.json',
      'src/intl/locales/fr/common.json',
    ]);
    // The two shared chunks have no source path, so they stay summed.
    expect(countByName['assets/intl.js']).toBe(2);
  });

  it('names chunks without their content hash', () => {
    expect(chunkName('assets/Badge-BiJqBSfC.js')).toBe('assets/Badge.js');
    expect(chunkName('assets/return_Status-a_b-C9xY.css')).toBe(
      'assets/return_Status.css'
    );
    expect(chunkName('assets/no-hash.js')).toBe('assets/no-hash.js');
  });

  it('names a chunk by its source, without the pnpm store path', () => {
    expect(stableName('src/lazy.ts', 'assets/lazy-CCCCCCCC.js')).toBe(
      'src/lazy.ts'
    );
    expect(
      stableName(
        'node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.4.1/node_modules/@capacitor/app/dist/esm/web.js',
        'assets/web-AAAAAAAA.js'
      )
    ).toBe('@capacitor/app/dist/esm/web.js');
    expect(stableName('_web-BjTeafRi.js', 'assets/web-BjTeafRi.js')).toBe(
      'assets/web.js'
    );
  });
});

describe('compareSizes', () => {
  // Every chunk counts as up front unless named in `lazy`.
  const sizes = (js, css = {}, lazy = []) => {
    const part = byName => ({
      total: Object.values(byName).reduce((a, b) => a + b, 0),
      count: Object.keys(byName).length,
      byName,
    });
    const upfront = byName =>
      Object.fromEntries(
        Object.entries(byName).filter(([n]) => !lazy.includes(n))
      );
    return {
      app: { js: part(js), css: part(css) },
      upfront: { js: part(upfront(js)), css: part(upfront(css)) },
    };
  };
  const base = sizes({ 'assets/index.js': 100_000, 'assets/Badge.js': 2_000 });

  it('is not significant for a few bytes of hash churn', () => {
    const pr = sizes({ 'assets/index.js': 100_010, 'assets/Badge.js': 2_000 });
    const r = compareSizes(base, pr);
    expect(r.significant).toBe(false);
    expect(r.markdown.startsWith(MARKER)).toBe(true);
    expect(r.markdown).not.toContain('<details>');
  });

  it('is significant once JS or CSS moves by the threshold', () => {
    const pr = sizes({
      'assets/index.js': 100_000 + SIGNIFICANT_BYTES,
      'assets/Badge.js': 2_000,
    });
    expect(compareSizes(base, pr).significant).toBe(true);
    const cssOnly = sizes(base.app.js.byName, {
      'assets/x.css': SIGNIFICANT_BYTES,
    });
    expect(compareSizes(base, cssOnly).significant).toBe(true);
  });

  it('lists new, removed and moved chunks, biggest first, and how each loads', () => {
    const pr = sizes(
      {
        'assets/index.js': 100_000 + CHUNK_BYTES,
        'assets/Feature.js': 5_000,
      },
      {},
      ['assets/Feature.js']
    );
    const md = compareSizes(base, pr, { baseSha: '0123456789abcdef' }).markdown;
    expect(md).toContain('against `0123456789`');
    const rows = md.split('\n').filter(l => l.startsWith('| `'));
    expect(rows).toEqual([
      '| `assets/Feature.js` | lazily | new | 4.9 KB | +4.9 KB |',
      '| `assets/Badge.js` | up front | 2.0 KB | removed | −2.0 KB |',
      '| `assets/index.js` | up front | 97.7 KB | 98.2 KB | +0.5 KB |',
    ]);
    // The comment is the record now: nothing to copy into the KDD by hand.
    expect(md).not.toContain('bundle-size-by-pr.md');
  });

  it('reports up front and total separately', () => {
    const pr = sizes(
      {
        'assets/index.js': 100_000,
        'assets/Badge.js': 2_000,
        'assets/Lazy.js': 3_000,
      },
      {},
      ['assets/Lazy.js']
    );
    const md = compareSizes(base, pr).markdown;
    expect(md).toContain(
      '| JS up front | 99.6 KB (2 chunks) | 99.6 KB (2 chunks) | ±0.0 KB'
    );
    expect(md).toContain(
      '| JS total (tracked) | 99.6 KB (2 chunks) | 102.5 KB (3 chunks) | +2.9 KB'
    );
  });

  it('is significant when code moves up front without changing the total', () => {
    const lazyBase = sizes(
      { 'assets/index.js': 100_000, 'assets/Badge.js': 2_000 },
      {},
      ['assets/Badge.js']
    );
    const r = compareSizes(lazyBase, base);
    expect(base.app.js.total).toBe(lazyBase.app.js.total);
    expect(r.significant).toBe(true);
  });

  it('says how many chunks a shared name sums, and "mixed" when they load both ways', () => {
    // Two assets/intl.js chunks: 3,000 B up front and 1,000 B lazily, which
    // the PR grows by 1,000 B on the lazy side.
    const withIntl = lazyBytes => {
      const m = sizes({ 'assets/index.js': 100_000 });
      const total = 3_000 + lazyBytes;
      m.app.js.byName['assets/intl.js'] = total;
      m.app.js.countByName = { 'assets/intl.js': 2 };
      m.app.js.total += total;
      m.upfront.js.byName['assets/intl.js'] = 3_000;
      return m;
    };
    const md = compareSizes(withIntl(1_000), withIntl(2_000)).markdown;
    expect(md).toContain(
      '| `assets/intl.js` (2 chunks) | mixed | 3.9 KB | 4.9 KB | +1.0 KB |'
    );
  });

  it('leaves out chunks that barely moved', () => {
    const pr = sizes({
      'assets/index.js': 100_000 + CHUNK_BYTES - 1,
      'assets/Badge.js': 2_000,
    });
    expect(compareSizes(base, pr).markdown).not.toContain('<details>');
  });
});
