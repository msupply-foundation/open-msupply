#!/usr/bin/env node
// Tests for build-reports.mjs: whole reports built from scratch directories.
// Run:  node scripts/reports/build-reports.test.mjs
//
// Plain node, no runner and no dependency, like .github/scripts/publish-bundles.test.mjs.
// That the committed standard reports read through the server's own types is
// checked on the Rust side - see standard_reports.rs.

import assert from 'node:assert';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDir, buildEach, buildReport, bundleFileName, findReports, parseArgs, readManifest } from './build-reports.mjs';

let passed = 0;
let failed = 0;
const eq = (name, actual, expected) => {
  try {
    assert.deepStrictEqual(actual, expected);
    passed++;
  } catch {
    failed++;
    console.error(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
};
const throws = (name, fn, pattern) => {
  try {
    fn();
    failed++;
    console.error(`FAIL ${name}: did not throw`);
  } catch (e) {
    if (pattern.test(e.message)) passed++;
    else {
      failed++;
      console.error(`FAIL ${name}: threw "${e.message}", expected ${pattern}`);
    }
  }
};

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

const manifest = extra => JSON.stringify({
  is_custom: false, version: '2.3.0', code: 'stock', context: 'REPORT', name: 'Stock', ...extra,
});
eq('convert_data_type defaults to Extism', readManifest(manifest({}), 'm').convert_data_type, 'Extism');
throws('an unknown context', () => readManifest(manifest({ context: 'NOPE' }), 'm'), /unknown context/);
throws('a missing name', () => readManifest(manifest({ name: undefined }), 'm'), /missing field `name`/);
throws('a null convert_data_type', () => readManifest(manifest({ convert_data_type: null }), 'm'), /cannot be null/);
throws('sql that is not a list', () => readManifest(manifest({ queries: { sql: 'q' } }), 'm'), /list of strings/);

// ---------------------------------------------------------------------------
// Whole reports
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'build-reports-test-'));
const write = (path, content) => {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
};
/** A report directory: its manifest and src/ files. */
const report = (dir, manifestFields, src, extra = {}) => {
  write(join(dir, 'report-manifest.json'), manifest(manifestFields));
  for (const [name, content] of Object.entries(src)) write(join(dir, 'src', name), content);
  for (const [name, content] of Object.entries(extra)) write(join(dir, name), content);
  return dir;
};
const noConvertData = (_dir, m) => (m.convert_data ? 'Y29udmVydA==' : null);
const warnings = [];
const build = dir => buildReport(dir, { convertData: noConvertData, warn: w => warnings.push(w) });

try {
  const full = report(
    join(scratch, 'full'),
    {
      header: 'header.html',
      footer: 'footer.html',
      queries: { gql: 'query.graphql', sql: ['totals', 'split'] },
      arguments: { schema: 'args/arguments.json', ui: 'args/arguments_ui.json' },
      excel_template: 'template.xlsx',
      convert_data: 'convert_data_js',
      convert_data_type: 'BoaJs',
      sub_context: 'Other',
    },
    {
      'template.html': '<p>{{ data }}</p>\n',
      'header.html': 'head',
      'footer.html': 'foot',
      'query.graphql': 'query { a }',
      'other.graphql': 'query { ignored }',
      'totals.sql': 'SELECT 1',
      'split.sqlite.sql': 'SELECT 2',
      'split.postgres.sql': 'SELECT 3',
      'style.css': 'p {}',
      'logo.json': '{"w": 10.0, "h": 2}',
      'shared.ref.json': '{"source": "base"}',
      'manifest.json': '{"context": "REPORT", "ignored": 1}',
      'image.png': Buffer.from([0xff, 0xfe, 0x00]),
    },
    {
      'args/arguments.json': '{"type": "object", "properties": {}}',
      'args/arguments_ui.json': '{"type": "VerticalLayout"}',
      'template.xlsx': Buffer.from([1, 2, 255]),
    },
  );
  const built = build(full);
  eq('the id', built.id, 'stock_2_3_0_false');
  eq('field order is ReportData\'s', Object.keys(built), [
    'id', 'name', 'description', 'template', 'context', 'sub_context', 'argument_schema_id',
    'comment', 'is_custom', 'version', 'code', 'form_schema', 'excel_template_buffer',
  ]);
  eq('the index', built.template.index, {
    template: 'template.html',
    header: 'header.html',
    footer: 'footer.html',
    query: ['query.graphql', 'totals', 'split'],
    convert_data: 'Y29udmVydA==',
    convert_data_type: 'BoaJs',
  });
  // other.graphql is not the query, and image.png is not text: neither is an entry.
  eq('the entries', Object.keys(built.template.entries).sort(), [
    'footer.html', 'header.html', 'logo', 'manifest', 'query.graphql', 'shared', 'split', 'style.css',
    'template.html', 'totals',
  ]);
  eq('a split SQL query', built.template.entries.split, {
    type: 'SQLQuery', data: { name: 'split', query_sqlite: 'SELECT 2', query_postgres: 'SELECT 3' },
  });
  eq('a shared SQL query', built.template.entries.totals.data.query_postgres, 'SELECT 1');
  eq('a graphql query', built.template.entries['query.graphql'], {
    type: 'GraphGLQuery', data: { query: 'query { a }', variables: null },
  });
  eq('a ref', built.template.entries.shared, { type: 'Ref', data: { source: 'base', source_name: null } });
  eq('a manifest resource keeps only the context', built.template.entries.manifest, {
    type: 'Manifest', data: { context: 'REPORT' },
  });
  eq('a text resource', built.template.entries['style.css'], { type: 'Resource', data: 'p {}' });
  eq('a JSON resource', built.template.entries.logo, { type: 'Resource', data: { w: 10, h: 2 } });
  eq('a non-text file is skipped, with a warning', warnings.some(w => w.includes('image.png')), true);
  eq('the excel template is its bytes', built.excel_template_buffer, [1, 2, 255]);
  eq('the form schema', built.form_schema.id, 'for_report_stock_2_3_0_false');
  eq('it is referred to', built.argument_schema_id, 'for_report_stock_2_3_0_false');

  const minimal = build(report(join(scratch, 'minimal'), { query_default: 'invoice' }, { 'template.html': 't' }));
  eq('a default query', minimal.template.entries.query_default, { type: 'DefaultQuery', data: 'Invoice' });
  eq('no convert_data', minimal.template.index.convert_data, null);
  eq('no form schema', [minimal.form_schema, minimal.argument_schema_id, minimal.excel_template_buffer], [null, null, null]);
  eq('no query at all still builds - a RESOURCE report has none', build(report(join(scratch, 'none'), {}, { 'template.html': 't' })).template.index.query, []);

  throws('no template', () => build(report(join(scratch, 'no-template'), {}, { 'other.html': 't' })), /Template file does not exist/);
  throws('a missing header', () => build(report(join(scratch, 'no-header'), { header: 'h.html' }, { 'template.html': 't' })), /Header file does not exist/);
  throws('a missing split query half', () => build(report(join(scratch, 'half-sql'), { queries: { sql: ['q'] } }, { 'template.html': 't', 'q.sqlite.sql': 's' })), /q\.postgres\.sql/);
  throws('an unknown default query', () => build(report(join(scratch, 'bad-default'), { query_default: 'item' }, { 'template.html': 't' })), /Invalid default query/);
  throws('a schema without its ui', () => build(report(join(scratch, 'half-args'), { arguments: { schema: 'a.json' } }, { 'template.html': 't' }, { 'a.json': '{}' })), /arguments\.schema and arguments\.ui/);
  throws('two files claiming one entry', () => build(report(join(scratch, 'clash'), {}, { 'template.html': 't', logo: 'x', 'logo.json': '{}' })), /both be the report entry `logo`/);

  // Finding reports: sorted, at any depth, never in node_modules.
  const tree = join(scratch, 'tree');
  report(join(tree, 'b'), {}, { 'template.html': 't' });
  report(join(tree, 'a', 'latest'), {}, { 'template.html': 't' });
  report(join(tree, 'a', '2_6'), {}, { 'template.html': 't' });
  report(join(tree, 'node_modules', 'x'), {}, { 'template.html': 't' });
  symlinkSync(join(scratch, 'nowhere'), join(tree, 'dangling'));
  eq('reports found', findReports(tree).map(d => d.slice(tree.length + 1)), ['a/2_6', 'a/latest', 'b']);

  const out = buildDir(tree, 'reports.json', { convertData: noConvertData, warn: () => {} });

  // Each folder as a bundle of its own, carrying on past one that fails.
  const clients = join(scratch, 'clients');
  report(join(clients, 'Nigeria UNICEF', 'stock', 'latest'), {}, { 'template.html': 't' });
  report(join(clients, 'Nigeria UNICEF', 'stock', '2_10'), { version: '2.10.0' }, { 'template.html': 't' });
  report(join(clients, 'Broken', 'r', 'latest'), {}, { 'nope.html': 't' });
  mkdirSync(join(clients, 'Empty', 'notes'), { recursive: true });
  const bundles = join(scratch, 'bundles');
  const quiet = console.error;
  console.error = () => {};
  let results;
  try {
    results = buildEach(clients, bundles, { convertData: noConvertData, warn: () => {} });
  } finally {
    console.error = quiet;
  }
  eq('each client, with its real name; one with no reports is left out', results.map(r => [r.client, r.file ?? 'failed']), [
    ['Broken', 'failed'],
    ['Nigeria UNICEF', 'Nigeria-UNICEF.json'],
  ]);
  eq('the failure says why', /Template file does not exist/.test(results[0].error), true);
  eq('a bundle holds every version in the folder', JSON.parse(readFileSync(join(bundles, 'Nigeria-UNICEF.json'), 'utf8')).reports.map(r => r.version), ['2.10.0', '2.3.0']);
  eq('clients.json is written beside them', JSON.parse(readFileSync(join(bundles, 'clients.json'), 'utf8')), results);
  eq('nothing else is written', readdirSync(bundles).sort(), ['Nigeria-UNICEF.json', 'clients.json']);
  eq('a file name keeps only safe characters', bundleFileName('São Tomé/x'), 'S-o-Tom--x.json');

  // A client called `clients` would overwrite clients.json: it fails instead.
  const named = join(scratch, 'named');
  report(join(named, 'clients', 'r', 'latest'), {}, { 'template.html': 't' });
  console.error = () => {};
  let clash;
  try {
    clash = buildEach(named, join(scratch, 'named-out'), { convertData: noConvertData, warn: () => {} });
  } finally {
    console.error = quiet;
  }
  eq('a client may not be written as clients.json', /is already taken/.test(clash[0].error ?? ''), true);
  eq('a dir builds into generated/', out, join(tree, 'generated', 'reports.json'));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

eq('no arguments: the standard reports', parseArgs([]), { paths: null, report: null, output: null, definition: false, each: null, out: null });
eq('--path takes several', parseArgs(['--path', 'a', 'b', '--path', 'c']).paths, ['a', 'b', 'c']);
eq('one report', parseArgs(['--report', 'r', '--output', 'o.json']), { paths: null, report: 'r', output: 'o.json', definition: false, each: null, out: null });
eq('each folder', [parseArgs(['--each', 'clients', '--out', 'b']).each, parseArgs(['--each', 'clients', '--out', 'b']).out], ['clients', 'b']);
throws('--each without --out', () => parseArgs(['--each', 'clients']), /go together/);
throws('--each with --path', () => parseArgs(['--each', 'c', '--out', 'b', '--path', 'x']), /goes with nothing but --out/);
eq('its definition only', parseArgs(['--report', 'r', '--definition', '--output', 'o.json']).definition, true);
throws('--definition without --report', () => parseArgs(['--definition']), /goes with --report/);
throws('--report without --output', () => parseArgs(['--report', 'r']), /go together/);
throws('an unknown option', () => parseArgs(['--frobnicate']), /Unknown option/);

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
