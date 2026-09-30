import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  buildImporters,
  buildServiceReferrers,
  checkConfig,
  classify,
  ownersOf,
  runtimeImports,
  select,
} from './affected.mjs';

// A miniature repo: two verticals sharing a domain module through its index
// barrel, a vertical with no suite, a shell-only component, and a server
// crate with one cross-module reference.
const SOURCES = {
  'frontend/src/index.tsx': "import './App';",
  'frontend/src/App.tsx': [
    "import { StockPage } from './sections/stock';",
    "import { ItemsPage } from './sections/items';",
    "import { Footer } from './ui/Footer';",
  ].join('\n'),
  'frontend/src/ui/Footer.tsx': 'export const Footer = 1;',
  'frontend/src/ui/Chip.tsx': 'export const Chip = 1;',
  'frontend/src/domain/invoice/index.ts': "export { Modal } from './Modal';",
  'frontend/src/domain/invoice/Modal.tsx': "import { Chip } from '@/ui/Chip';",
  'frontend/src/domain/invoice/types.ts':
    'export type Invoice = { id: string };',
  'frontend/src/sections/stock/index.tsx': [
    "import { Modal } from '@/domain/invoice';",
    "import type { Invoice } from '@/domain/invoice/types';",
  ].join('\n'),
  'frontend/src/sections/stock/index.test.ts': "import '../items';",
  'frontend/src/sections/outbound/index.tsx':
    "import { Modal, type X } from '@/domain/invoice';",
  'frontend/src/sections/items/index.tsx': "import { Chip } from '@/ui/Chip';",
  'frontend/e2e/helpers/stock.ts': 'export const h = 1;',
  'frontend/e2e/specs/stock-regression.spec.ts': "import '../helpers/stock';",
  'frontend/e2e/specs/outbound-regression.spec.ts': '',
  'frontend/e2e/specs/login-regression.spec.ts': '',
  'server/service/src/stock_line/mod.rs': 'pub fn x() {}',
  'server/service/src/invoice/mod.rs': 'use crate::stock_line::x;',
  'server/service/src/orphan.rs': '',
  'server/repository/src/migrations/v2/mod.rs': '',
  'frontend/scripts/e2e/run-e2e.sh': '',
};

const config = {
  smoke: ['login-regression'],
  maxTargeted: 2,
  all: ['server/repository/src/migrations/**'],
  ignore: ['**/*.md', '**/*.test.ts', 'frontend/scripts/**'],
  rules: [
    {
      paths: ['frontend/scripts/e2e/run-e2e.sh'],
      suites: ['login-regression'],
    },
  ],
  suites: {
    'stock-regression': {
      frontend: ['frontend/src/sections/stock/**'],
      server: ['server/service/src/stock_line/**'],
    },
    'outbound-regression': {
      frontend: ['frontend/src/sections/outbound/**'],
      server: ['server/service/src/invoice/**'],
    },
    'login-regression': { frontend: [], server: [] },
  },
  uncovered: {
    items: { frontend: ['frontend/src/sections/items/**'], server: [] },
  },
};

const files = new Set(Object.keys(SOURCES));
const read = f => SOURCES[f];
const ctx = {
  config,
  files,
  owners: ownersOf(config),
  importers: buildImporters(ts, files, read),
  referrers: buildServiceReferrers(files, read),
};
const suitesOf = f => (classify(f, ctx).suites ?? []).map(s => s.name).sort();

describe('runtimeImports', () => {
  it('drops `import type` but keeps a mixed import', () => {
    const stock = runtimeImports(
      ts,
      'frontend/src/sections/stock/index.tsx',
      read('frontend/src/sections/stock/index.tsx'),
      files
    );
    expect([...stock]).toEqual(['frontend/src/domain/invoice/index.ts']);
    const outbound = runtimeImports(
      ts,
      'frontend/src/sections/outbound/index.tsx',
      read('frontend/src/sections/outbound/index.tsx'),
      files
    );
    expect([...outbound]).toEqual(['frontend/src/domain/invoice/index.ts']);
  });

  it('follows template dynamic imports as a prefix match', () => {
    const all = new Set([
      'frontend/src/intl/load.ts',
      'frontend/src/intl/locales/en/common.json',
      'frontend/src/intl/locales/fr/common.json',
    ]);
    const src = 'const load = l => import(`./locales/${l}/common.json`);';
    expect(
      [...runtimeImports(ts, 'frontend/src/intl/load.ts', src, all)].sort()
    ).toEqual([
      'frontend/src/intl/locales/en/common.json',
      'frontend/src/intl/locales/fr/common.json',
    ]);
  });
});

describe('classify — front end', () => {
  it('charges shared code to every screen that reaches it, through a barrel at no hop cost', () => {
    const r = classify('frontend/src/domain/invoice/Modal.tsx', ctx);
    expect(r.suites.map(s => [s.name, s.distance]).sort()).toEqual([
      ['outbound-regression', 1],
      ['stock-regression', 1],
    ]);
    expect(r.shell).toBe(false);
  });

  it('charges a type-only dependency to nothing', () => {
    expect(suitesOf('frontend/src/domain/invoice/types.ts')).toEqual([]);
  });

  it('stops at a vertical with no suite and names it, instead of calling it shell', () => {
    const r = classify('frontend/src/sections/items/index.tsx', ctx);
    expect(r.suites).toEqual([]);
    expect(r.uncovered).toEqual(['items']);
    expect(r.shell).toBe(false);
  });

  it('flags code the shell uses outside every screen', () => {
    expect(classify('frontend/src/ui/Footer.tsx', ctx).shell).toBe(true);
    // Chip reaches App only through items — a boundary — so it is not shell.
    expect(classify('frontend/src/ui/Chip.tsx', ctx).shell).toBe(false);
  });

  it('does not walk up through test files', () => {
    // stock/index.test.ts imports items; that must not charge stock.
    expect(
      classify('frontend/src/sections/items/index.tsx', ctx).suites
    ).toEqual([]);
  });

  it('charges an e2e helper to the specs that import it', () => {
    expect(suitesOf('frontend/e2e/helpers/stock.ts')).toEqual([
      'stock-regression',
    ]);
  });

  it('charges a deleted file to its own owner', () => {
    expect(suitesOf('frontend/src/sections/outbound/Gone.tsx')).toEqual([
      'outbound-regression',
    ]);
  });
});

describe('classify — server', () => {
  it('charges a module to its suite and, one hop, to modules that reference it', () => {
    const r = classify('server/service/src/stock_line/mod.rs', ctx);
    expect(r.suites.map(s => [s.name, s.distance]).sort()).toEqual([
      ['outbound-regression', 1],
      ['stock-regression', 0],
    ]);
  });

  it('does not propagate upward — invoice does not charge stock', () => {
    expect(suitesOf('server/service/src/invoice/mod.rs')).toEqual([
      'outbound-regression',
    ]);
  });

  it('reports what it cannot place', () => {
    expect(classify('server/service/src/orphan.rs', ctx).via).toBe('unmapped');
  });
});

describe('classify — precedence', () => {
  it('lets an explicit rule win over a broad ignore', () => {
    expect(classify('frontend/scripts/e2e/run-e2e.sh', ctx).via).toBe('rule');
    expect(classify('frontend/scripts/other.mjs', ctx).via).toBe('ignore');
  });
});

describe('select', () => {
  const run = changed =>
    select(
      changed.map(f => classify(f, ctx)),
      config
    );

  it('selects nothing when only unobservable files changed', () => {
    expect(
      run(['frontend/src/sections/stock/index.test.ts', 'README.md'])
    ).toMatchObject({ tier: 'none', suites: [] });
  });

  it('adds smoke to any real selection, after what the change reaches', () => {
    const sel = run(['frontend/src/sections/stock/index.tsx']);
    expect(sel.tier).toBe('targeted');
    expect(sel.suites.map(s => s.name)).toEqual([
      'stock-regression',
      'login-regression',
    ]);
  });

  it('goes broad past maxTargeted, and full on an `all` path', () => {
    expect(run(['frontend/src/domain/invoice/Modal.tsx']).tier).toBe('broad');
    const full = run(['server/repository/src/migrations/v2/mod.rs']);
    expect(full.tier).toBe('full');
    expect(full.suites).toHaveLength(Object.keys(config.suites).length);
  });

  it('smoke-tests and names a path the map does not know', () => {
    const sel = run(['server/service/src/orphan.rs']);
    expect(sel.unmapped).toEqual(['server/service/src/orphan.rs']);
    expect(sel.suites.map(s => s.name)).toEqual(['login-regression']);
  });
});

describe('checkConfig', () => {
  it('passes the miniature map', () => {
    expect(checkConfig(config, files)).toEqual([
      // orphan.rs is deliberately unplaced above.
      "server/service/src/orphan.rs is owned by no suite — add it to a suite, or to 'uncovered'",
    ]);
  });

  it('catches a spec without an entry and a glob that matches nothing', () => {
    const broken = {
      ...config,
      suites: {
        ...config.suites,
        'stock-regression': {
          frontend: ['frontend/src/sections/stok/**'],
          server: [],
        },
      },
    };
    const withSpec = new Set([
      ...files,
      'frontend/e2e/specs/new-regression.spec.ts',
    ]);
    const problems = checkConfig(broken, withSpec);
    expect(problems).toContain(
      'spec new-regression.spec.ts has no entry in suites'
    );
    expect(problems).toContain(
      "stock-regression: 'frontend/src/sections/stok/**' matches no file"
    );
  });
});
