import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { parse as gqlParse } from 'graphql';
import {
  buildImporters,
  buildServerIndex,
  checkConfig,
  classify,
  compileGlob,
  diffSnapshots,
  nextGreen,
  planRun,
  visibleTo,
  ownersOf,
  runtimeImports,
  rustRefs,
  select,
} from './affected.mjs';

// A miniature repo. Front end: two verticals sharing a domain module through
// its index barrel, a vertical with no suite, a shell-only component, and a
// GraphQL document per vertical. Server: two service modules behind a
// service_provider, one reached by `use service::`, the other only through
// `service_provider.x_service`; a repository row type; one cross-module
// `crate::` reference; and `auth`, which every resolver imports.
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
    "import { StockLinesDocument } from './stock.generated';",
  ].join('\n'),
  'frontend/src/sections/stock/stock.graphql':
    'query stockLines { stockLines { nodes { id } } }',
  'frontend/src/sections/stock/stock.generated.ts': '',
  'frontend/src/sections/stock/index.test.ts': "import '../items';",
  'frontend/src/sections/outbound/index.tsx': [
    "import { Modal, type X } from '@/domain/invoice';",
    "import { InvoicesDocument } from './outbound.generated';",
  ].join('\n'),
  'frontend/src/sections/outbound/outbound.graphql':
    'query invoices { __typename invoices { nodes { id } } }\nmutation insertOutbound { insertOutboundShipment { id } }',
  'frontend/src/sections/outbound/outbound.generated.ts': '',
  'frontend/src/sections/items/index.tsx': "import { Chip } from '@/ui/Chip';",
  'frontend/e2e/helpers/stock.ts': 'export const h = 1;',
  'frontend/e2e/specs/stock-regression.spec.ts': "import '../helpers/stock';",
  'frontend/e2e/specs/outbound-regression.spec.ts': '',
  'frontend/e2e/specs/login-regression.spec.ts': '',
  'server/service/src/service_provider.rs': [
    'pub struct ServiceProvider {',
    '  pub stock_line_service: Box<dyn StockLineServiceTrait>,',
    '  pub invoice_service: Box<dyn InvoiceServiceTrait>,',
    '}',
  ].join('\n'),
  'server/service/src/auth.rs': 'pub fn validate_auth() {}',
  'server/service/src/stock_line/mod.rs':
    'use repository::{StockLineRow, EqualFilter};\npub trait StockLineServiceTrait {}',
  'server/service/src/invoice/mod.rs': [
    'use crate::{',
    '  auth::validate_auth,',
    '  stock_line::{StockLineServiceTrait, x},',
    '};',
    'pub trait InvoiceServiceTrait {}',
  ].join('\n'),
  'server/service/src/orphan.rs': '',
  'server/graphql/stock_line/src/lib.rs': [
    'use service::auth::validate_auth;',
    'pub struct StockLineQueries;',
    '#[Object]',
    'impl StockLineQueries {',
    "  pub async fn stock_lines(&self, ctx: &Context<'_>) -> R {",
    '    ctx.service_provider().stock_line_service.q()',
    '  }',
    '}',
  ].join('\n'),
  'server/graphql/invoice/src/lib.rs': [
    'use service::{auth::validate_auth, invoice::InvoiceFilter};',
    'pub struct InvoiceQueries;',
    '#[Object]',
    'impl InvoiceQueries {',
    '  pub async fn invoices(&self) -> R { get_invoices(ctx) }',
    '  pub async fn insert_outbound_shipment(&self) -> R { insert(ctx) }',
    '}',
  ].join('\n'),
  'server/graphql/invoice/src/queries.rs':
    'use service::invoice_line::X;\npub fn get_invoices() {}',
  'server/graphql/invoice/src/mutations.rs':
    'use service::auth::validate_auth;\npub fn insert() {}',
  'server/service/src/invoice_line/mod.rs': '',
  'server/repository/src/db_diesel/stock_line_row.rs':
    'pub struct StockLineRow;',
  'server/repository/src/db_diesel/filter.rs': 'pub struct EqualFilter;',
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
  overrides: { 'login-regression': [] },
};

const files = new Set(Object.keys(SOURCES));
const read = f => SOURCES[f];
const owners = ownersOf(config, files);
const importers = buildImporters(ts, files, read);
const server = buildServerIndex(gqlParse, {
  config,
  files,
  read,
  importers,
  owners,
});
const ctx = { config, files, owners, importers, server };
const suiteNames = [
  'stock-regression',
  'outbound-regression',
  'login-regression',
];
const suitesOf = f =>
  (classify(f, ctx).suites ?? []).map(s => [s.name, s.distance]).sort();

describe('compileGlob', () => {
  it('matches like node:path matchesGlob for *, ** and ?', () => {
    const t = (g, f) => compileGlob(g).test(f);
    expect(t('**/*.md', 'README.md')).toBe(true);
    expect(t('**/*.md', 'a/b/README.md')).toBe(true);
    expect(t('server/**/test_*.rs', 'server/x/test_a.rs')).toBe(true);
    expect(t('server/**/test_*.rs', 'server/test_a.rs')).toBe(true);
    expect(t('frontend/*.html', 'frontend/index.html')).toBe(true);
    expect(t('frontend/*.html', 'frontend/a/index.html')).toBe(false);
    expect(
      t(
        'frontend/src/sections/stock/**',
        'frontend/src/sections/stocktakes/x.ts'
      )
    ).toBe(false);
    expect(t('a.b', 'aXb')).toBe(false);
  });
});

describe('ownersOf', () => {
  it('owns sections by the spec-name convention, with overrides, and names the rest uncovered', () => {
    expect(owners.map(o => [o.name, o.kind]).sort()).toEqual([
      ['items', 'uncovered'],
      ['login-regression', 'suite'],
      ['outbound-regression', 'suite'],
      ['stock-regression', 'suite'],
    ]);
    const stock = owners.find(o => o.name === 'stock-regression');
    expect(stock.frontend).toEqual([
      'frontend/src/sections/stock/**',
      'frontend/e2e/specs/stock-regression.spec.ts',
    ]);
  });
});

describe('runtimeImports', () => {
  it('drops `import type` but keeps a mixed import', () => {
    const stock = runtimeImports(
      ts,
      'frontend/src/sections/stock/index.tsx',
      read('frontend/src/sections/stock/index.tsx'),
      files
    );
    expect([...stock]).toEqual([
      'frontend/src/domain/invoice/index.ts',
      'frontend/src/sections/stock/stock.generated.ts',
    ]);
    const outbound = runtimeImports(
      ts,
      'frontend/src/sections/outbound/index.tsx',
      read('frontend/src/sections/outbound/index.tsx'),
      files
    );
    expect([...outbound]).toEqual([
      'frontend/src/domain/invoice/index.ts',
      'frontend/src/sections/outbound/outbound.generated.ts',
    ]);
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
      ['stock-regression', 1],
    ]);
  });

  it('charges a deleted file to its own owner', () => {
    expect(suitesOf('frontend/src/sections/outbound/Gone.tsx')).toEqual([
      ['outbound-regression', 0],
    ]);
  });
});

describe('rustRefs', () => {
  it('reads plain and grouped paths, nested groups included', () => {
    const src = [
      'use crate::number::next;',
      'use crate::{',
      '  auth::{Resource, ResourceAccessRequest},',
      '  invoice::validate::check,',
      '  stock_line::{self, query::{a, b}},',
      '  ListResult,',
      '};',
      'let x = crate::item::get();',
    ].join('\n');
    expect([...rustRefs(src, 'crate')].sort()).toEqual([
      'ListResult',
      'auth',
      'invoice',
      'item',
      'number',
      'stock_line',
    ]);
  });
});

describe('classify — server (derived)', () => {
  it('treats a module every resolver imports as plumbing — a full run', () => {
    expect(server.plumbing).toEqual(new Set(['auth']));
    expect(classify('server/service/src/auth.rs', ctx).via).toBe('all');
  });

  it('reaches a suite through service_provider.<x>_service, and one crate:: hop further', () => {
    // stock_line is reached by StockLineQueries via the provider field only;
    // invoice references crate::stock_line in a grouped import.
    expect(suitesOf('server/service/src/stock_line/query.rs')).toEqual([
      ['outbound-regression', 2],
      ['stock-regression', 0],
    ]);
  });

  it('reaches a suite through `use service::<module>`, and does not propagate upward', () => {
    expect(suitesOf('server/service/src/invoice/mod.rs')).toEqual([
      ['outbound-regression', 0],
    ]);
  });

  it('resolves a resolver that delegates by free-function name', () => {
    // queries.rs is named by `get_invoices(ctx)` in the root impl.
    expect(suitesOf('server/service/src/invoice_line/mod.rs')).toEqual([
      ['outbound-regression', 0],
    ]);
    expect(suitesOf('server/graphql/invoice/src/queries.rs')).toEqual([
      ['outbound-regression', 0],
    ]);
  });

  it('charges a resolver file to the suites selecting its fields', () => {
    expect(suitesOf('server/graphql/stock_line/src/lib.rs')).toEqual([
      ['stock-regression', 0],
    ]);
  });

  it('reaches a suite from a repository row type through the service that uses it', () => {
    expect(
      suitesOf('server/repository/src/db_diesel/stock_line_row.rs')
    ).toEqual([
      ['outbound-regression', 3],
      ['stock-regression', 1],
    ]);
  });

  it('reports what nothing reaches', () => {
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
      config,
      suiteNames
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

  it('goes broad past maxTargeted, and full on an `all` path or plumbing', () => {
    expect(run(['frontend/src/domain/invoice/Modal.tsx']).tier).toBe('broad');
    const full = run(['server/repository/src/migrations/v2/mod.rs']);
    expect(full.tier).toBe('full');
    expect(full.suites).toHaveLength(suiteNames.length);
    expect(run(['server/service/src/auth.rs']).tier).toBe('full');
  });

  it('keeps the near set to distance ≤ 1 when broad', () => {
    const sel = run([
      'server/repository/src/db_diesel/stock_line_row.rs',
      'frontend/src/domain/invoice/Modal.tsx',
    ]);
    expect(sel.tier).toBe('broad');
    // outbound is near through Modal (1), not through the row type (3)
    expect(sel.near.sort()).toEqual([
      'login-regression',
      'outbound-regression',
      'stock-regression',
    ]);
    expect(run(['server/service/src/stock_line/query.rs']).near.sort()).toEqual(
      ['login-regression', 'stock-regression']
    );
  });

  it('smoke-tests and names a path nothing reaches', () => {
    const sel = run(['server/service/src/orphan.rs']);
    expect(sel.unmapped).toEqual(['server/service/src/orphan.rs']);
    expect(sel.suites.map(s => s.name)).toEqual(['login-regression']);
  });
});

describe('checkConfig', () => {
  it('passes the miniature config', () => {
    expect(checkConfig(config, files)).toEqual([]);
  });

  it('catches a suite that owns nothing, an override naming no spec, and a glob matching nothing', () => {
    const broken = {
      ...config,
      overrides: {
        ...config.overrides,
        'gone-regression': [],
        'stock-regression': ['frontend/src/sections/stok/**'],
      },
    };
    const withSpec = new Set([
      ...files,
      'frontend/e2e/specs/new-regression.spec.ts',
    ]);
    const problems = checkConfig(broken, withSpec);
    expect(problems).toContain('overrides.gone-regression names no spec file');
    expect(problems).toContain(
      "new-regression owns nothing: no frontend/src/sections/new/ — add it to 'overrides'"
    );
    expect(problems).toContain(
      "stock-regression: 'frontend/src/sections/stok/**' matches no file"
    );
  });
});

describe('green record', () => {
  it('sees every file but ignored ones, with rules winning over ignore', () => {
    const visible = visibleTo(config);
    expect(visible('frontend/src/sections/stock/index.tsx')).toBe(true);
    expect(visible('README.md')).toBe(false);
    expect(visible('frontend/scripts/other.mjs')).toBe(false);
    expect(visible('frontend/scripts/e2e/run-e2e.sh')).toBe(true);
  });

  it('diffs snapshots by content, additions and deletions included', () => {
    expect(
      diffSnapshots({ a: '1', b: '2', c: '3' }, { a: '1', b: '9', d: '4' })
    ).toEqual(['b', 'c', 'd']);
  });

  const run = changed =>
    new Set(
      select(
        changed.map(f => classify(f, ctx)),
        config,
        suiteNames
      ).suites.map(s => s.name)
    );
  const runList = [
    'stock-regression',
    'outbound-regression',
    'login-regression',
  ];
  const green = new Set(runList);

  it('skips everything when nothing visible changed since a green run', () => {
    expect(planRun({ runList, green, reached: run([]) })).toEqual({
      run: [],
      skip: runList,
    });
  });

  it('re-runs only what the change since then reaches, plus smoke', () => {
    const plan = planRun({
      runList,
      green,
      reached: run(['frontend/src/sections/stock/index.tsx']),
    });
    expect(plan.run).toEqual(['stock-regression', 'login-regression']);
    expect(plan.skip).toEqual(['outbound-regression']);
  });

  it('runs a suite that was never green even when nothing reaches it', () => {
    const plan = planRun({
      runList,
      green: new Set(['stock-regression']),
      reached: run([]),
    });
    expect(plan.run).toEqual(['outbound-regression', 'login-regression']);
  });

  it('re-runs everything after an `all` change since the green run', () => {
    expect(
      planRun({
        runList,
        green,
        reached: run(['server/repository/src/migrations/v2/mod.rs']),
      }).skip
    ).toEqual([]);
  });

  it('keeps unreached suites green, adds what passed, drops what failed', () => {
    const reached = new Set(['stock-regression', 'login-regression']);
    expect(
      [
        ...nextGreen({
          green,
          reached,
          ran: ['stock-regression', 'login-regression'],
          passed: true,
        }),
      ].sort()
    ).toEqual(['login-regression', 'outbound-regression', 'stock-regression']);
    expect([
      ...nextGreen({
        green,
        reached,
        ran: ['stock-regression', 'login-regression'],
        passed: false,
      }),
    ]).toEqual(['outbound-regression']);
  });
});
