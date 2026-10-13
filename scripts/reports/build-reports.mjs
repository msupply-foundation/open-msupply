#!/usr/bin/env node
// Builds reports - standard reports, standard forms and custom reports - into
// the JSON the server installs: `generated/*.json` beside the reports, and the
// report a `remote_server_cli show-report` renders.
//
// Usage:
//
//   node scripts/reports/build-reports.mjs
//       standard_reports/ and standard_forms/ into their
//       generated/standard_reports.json and generated/standard_forms.json
//   node scripts/reports/build-reports.mjs --path <dir> [<dir>...]
//       every report under each dir into <dir>/generated/reports.json
//   node scripts/reports/build-reports.mjs --report <report dir> --output <file>
//       one report, as a single report object - what show-report reads
//   node scripts/reports/build-reports.mjs --report <report dir> --output <file> --definition
//       just its report definition - what `report_builder print` and
//       `remote_server_cli upsert-report` read
//   node scripts/reports/build-reports.mjs --each <dir> --out <dir>
//       each folder in <dir> - a client, in private/reports/clients - as a
//       bundle of its own, into <out>, with <out>/clients.json saying which
//       built and which failed. One client failing does not stop the rest;
//       it exits non-zero only when none built. What publish-reports.yaml runs.
//
// A report is a directory holding a report-manifest.json; every one found
// under a dir is built, at any depth, skipping node_modules.
//
// THE SERVER OWNS THE FORMAT
//
// What this writes is deserialised by the server into `ReportsData` / `ReportData`
// (server/service/src/standard_reports.rs) and `ReportDefinition`
// (server/service/src/report/definition.rs), and the standard reports' output is
// embedded in the server binary. It used to be written by the Rust CLI
// (`remote_server_cli build-reports`). A test in standard_reports.rs reads the
// committed output through those types, so a change to them that this script
// has not caught up with fails `cargo nextest run`, not a server in the field.
//
// No dependencies, like the other scripts here: plain node. A report's
// convert_data package is built with pnpm: each tree of reports is a pnpm
// workspace (its pnpm-workspace.yaml lists the packages), installed once from
// its lockfile, frozen, before the first of its reports is built.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The report contexts the server accepts - ContextType in
// server/repository/src/db_diesel/report_row.rs, as serde writes it. A test
// there checks every variant is listed here.
export const CONTEXT_TYPES = [
  'ASSET',
  'INBOUND_SHIPMENT',
  'OUTBOUND_SHIPMENT',
  'REQUISITION',
  'STOCKTAKE',
  'RESOURCE',
  'PATIENT',
  'DISPENSARY',
  'REPACK',
  'OUTBOUND_RETURN',
  'INBOUND_RETURN',
  'REPORT',
  'PRESCRIPTION',
  'INTERNAL_ORDER',
  'PURCHASE_ORDER',
  'SUPPLIER_RETURN',
  'CUSTOMER_RETURN',
  'STOCK_MOVEMENT',
  'PRESCRIPTION_REQUEST',
];

const CONVERT_DATA_TYPES = ['BoaJs', 'Extism'];
const DEFAULT_QUERIES = { invoice: 'Invoice', stocktake: 'Stocktake', requisition: 'Requisition' };
const MANIFEST_FILE = 'report-manifest.json';
const IGNORED_DIRS = ['node_modules'];

export class ReportBuildError extends Error {}
const fail = msg => {
  throw new ReportBuildError(msg);
};

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The field, checked against the type the server wants, or null when absent. */
function field(obj, key, type, { required = false, where }) {
  const v = obj[key];
  if (v === undefined || v === null) {
    if (required) fail(`${where}: missing field \`${key}\``);
    return null;
  }
  const ok = type === 'string[]'
    ? Array.isArray(v) && v.every(x => typeof x === 'string')
    : type === 'object' ? isObject(v) : typeof v === type;
  if (!ok) fail(`${where}: \`${key}\` should be ${type === 'string[]' ? 'a list of strings' : `a ${type}`}`);
  return v;
}

/** report-manifest.json, with the fields the build uses checked. */
export function readManifest(text, where) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    fail(`${where}: ${e.message}`);
  }
  if (!isObject(raw)) fail(`${where}: should be an object`);
  const opts = { where };
  const req = { where, required: true };
  const context = field(raw, 'context', 'string', req);
  if (!CONTEXT_TYPES.includes(context)) fail(`${where}: unknown context \`${context}\``);
  // `convert_data_type` is `#[serde(default)]`: absent means Extism, null is refused.
  if (raw.convert_data_type === null) fail(`${where}: \`convert_data_type\` cannot be null`);
  const convertDataType = raw.convert_data_type ?? 'Extism';
  if (!CONVERT_DATA_TYPES.includes(convertDataType)) fail(`${where}: unknown convert_data_type \`${convertDataType}\``);
  const queries = field(raw, 'queries', 'object', opts);
  const args = field(raw, 'arguments', 'object', opts);
  return {
    is_custom: field(raw, 'is_custom', 'boolean', req),
    version: field(raw, 'version', 'string', req),
    code: field(raw, 'code', 'string', req),
    context,
    sub_context: field(raw, 'sub_context', 'string', opts),
    name: field(raw, 'name', 'string', req),
    description: field(raw, 'description', 'string', opts),
    header: field(raw, 'header', 'string', opts),
    footer: field(raw, 'footer', 'string', opts),
    queries: queries && {
      gql: field(queries, 'gql', 'string', { where: `${where} queries` }),
      sql: field(queries, 'sql', 'string[]', { where: `${where} queries` }),
    },
    arguments: args && {
      schema: field(args, 'schema', 'string', { where: `${where} arguments` }),
      ui: field(args, 'ui', 'string', { where: `${where} arguments` }),
    },
    convert_data: field(raw, 'convert_data', 'string', opts),
    convert_data_type: convertDataType,
    query_default: field(raw, 'query_default', 'string', opts),
    excel_template: field(raw, 'excel_template', 'string', opts),
  };
}

// ---------------------------------------------------------------------------
// One report
// ---------------------------------------------------------------------------

const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** A file as text, or null when it is not UTF-8. */
function readText(path) {
  try {
    return utf8.decode(readFileSync(path));
  } catch (e) {
    if (e instanceof TypeError) return null;
    throw e;
  }
}

function readRequiredText(path, what) {
  const text = readText(path);
  if (text === null) fail(`Failed to load ${what} file: ${path} is not valid UTF-8`);
  return text;
}

const templateEntry = template => ({ type: 'TeraTemplate', data: { output: 'Html', template } });

/**
 * The report definition built from a report's src/ directory: its template,
 * header and footer, its queries, and every other file there as a resource.
 * Only files directly in src/ count, and a symlink does not.
 */
export function buildReportDefinition(srcDir, manifest, warn = console.warn) {
  let names;
  try {
    names = readdirSync(srcDir, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name);
  } catch (e) {
    fail(`Failed to read ${srcDir}: ${e.message}`);
  }
  const files = new Map(names.map(name => [name, join(srcDir, name)]));
  const take = (name, missing) => {
    const path = files.get(name);
    if (path === undefined) fail(missing);
    files.delete(name);
    return path;
  };

  const index = {
    template: 'template.html',
    header: null,
    footer: null,
    query: [],
    convert_data: null,
    convert_data_type: 'Extism',
  };
  const entries = {};

  entries['template.html'] = templateEntry(readRequiredText(take('template.html', 'Template file does not exist'), 'template'));
  if (manifest.header !== null) {
    const text = readRequiredText(take(manifest.header, 'Header file does not exist'), 'header');
    index.header = manifest.header;
    entries[manifest.header] = templateEntry(text);
  }
  if (manifest.footer !== null) {
    const text = readRequiredText(take(manifest.footer, 'Footer file does not exist'), 'footer');
    index.footer = manifest.footer;
    entries[manifest.footer] = templateEntry(text);
  }

  const gql = manifest.queries?.gql ?? null;
  const sql = manifest.queries?.sql ?? null;
  // No query at all is fine: a RESOURCE report (a shared footer, a logo) has none.
  if (gql !== null) {
    const query = readRequiredText(take(gql, 'GraphQl query file does not exist'), 'GQL query');
    index.query.push(gql);
    entries[gql] = { type: 'GraphGLQuery', data: { query, variables: null } };
  } else if (manifest.query_default !== null) {
    const data = DEFAULT_QUERIES[manifest.query_default];
    if (!data) fail(`Invalid default query: ${manifest.query_default}`);
    index.query.push('query_default');
    entries.query_default = { type: 'DefaultQuery', data };
  }
  for (const name of sql ?? []) {
    let querySqlite;
    let queryPostgres;
    if (files.has(`${name}.sql`)) {
      querySqlite = queryPostgres = readRequiredText(take(`${name}.sql`), 'query');
    } else {
      querySqlite = readRequiredText(take(`${name}.sqlite.sql`, `Sqlite query file (${name}.sqlite.sql) does not exist`), 'Sqlite query');
      queryPostgres = readRequiredText(take(`${name}.postgres.sql`, `Postgres query file (${name}.postgres.sql) does not exist`), 'Postgres query');
    }
    index.query.push(name);
    entries[name] = { type: 'SQLQuery', data: { name, query_sqlite: querySqlite, query_postgres: queryPostgres } };
  }

  // Everything left is a resource. Sorted so that two files claiming the same
  // entry (`logo.json` and `logo`) fail the same way every time.
  const resources = new Map();
  for (const name of [...files.keys()].sort()) {
    if (name.endsWith('.graphql')) continue; // only the one named as the query is used
    const path = files.get(name);
    const text = readText(path);
    if (text === null) {
      warn(`Ignore non text file resource: ${path}`);
      continue;
    }
    let key;
    let entry;
    try {
      if (name.endsWith('.ref.json')) {
        key = name.slice(0, -'.ref.json'.length);
        const ref = JSON.parse(text);
        if (!isObject(ref)) fail('should be an object');
        entry = {
          type: 'Ref',
          data: {
            source: field(ref, 'source', 'string', { where: name, required: true }),
            source_name: field(ref, 'source_name', 'string', { where: name }),
          },
        };
      } else if (name.endsWith('.json')) {
        key = name.slice(0, -'.json'.length);
        if (key === 'manifest') {
          const manifestEntry = JSON.parse(text);
          if (!isObject(manifestEntry)) fail('should be an object');
          const context = field(manifestEntry, 'context', 'string', { where: name, required: true });
          if (!CONTEXT_TYPES.includes(context)) fail(`unknown context \`${context}\``);
          entry = { type: 'Manifest', data: { context } };
        } else {
          entry = { type: 'Resource', data: JSON.parse(text) };
        }
      } else {
        key = name;
        entry = { type: 'Resource', data: text };
      }
    } catch (e) {
      fail(`Failed to parse resource ${name}: ${e.message}`);
    }
    if (Object.hasOwn(entries, key)) {
      fail(`${resources.get(key) ?? key} and ${name} would both be the report entry \`${key}\``);
    }
    resources.set(key, name);
    entries[key] = entry;
  }

  return { index, entries };
}

function run(cmd, args, cwd) {
  // pnpm is a .cmd on Windows, which only a shell runs.
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) fail(`Failed to run ${cmd} ${args.join(' ')} in ${cwd}: ${result.error.message}`);
  if (result.status !== 0) fail(`${cmd} ${args.join(' ')} failed in ${cwd} (exit ${result.status})`);
}

/** The pnpm workspace `dir` is in - the nearest directory up holding a pnpm-workspace.yaml. */
export function workspaceOf(dir) {
  for (let d = resolve(dir); ; d = dirname(d)) {
    if (existsSync(join(d, 'pnpm-workspace.yaml'))) return d;
    if (dirname(d) === d) return null;
  }
}

const installed = new Set();

/** The convert_data package, built, as the base64 the server stores. */
function buildConvertData(reportDir, manifest) {
  if (manifest.convert_data === null) return null;
  const dir = join(reportDir, manifest.convert_data);
  const workspace = workspaceOf(dir);
  if (workspace === null) {
    fail(`${dir} is not in a pnpm workspace - its report tree needs a pnpm-workspace.yaml listing its convert_data packages`);
  }
  if (!installed.has(workspace)) {
    run('pnpm', ['install', '--frozen-lockfile'], workspace);
    installed.add(workspace);
  }
  run('pnpm', ['run', 'build'], dir);
  const output = join(dir, 'dist', manifest.convert_data_type === 'BoaJs' ? 'convert_data.js' : 'plugin.wasm');
  try {
    return readFileSync(output).toString('base64');
  } catch (e) {
    fail(`convert_data was built but ${output} is missing: ${e.message}`);
  }
}

/** One report directory - the one holding report-manifest.json - as the server's `ReportData`. */
export function buildReport(reportDir, { warn = console.warn, convertData = buildConvertData } = {}) {
  const manifestPath = join(reportDir, MANIFEST_FILE);
  let manifestText;
  try {
    manifestText = readFileSync(manifestPath, 'utf8');
  } catch (e) {
    fail(`Failed to open report manifest file ${manifestPath}: ${e.message}`);
  }
  const manifest = readManifest(manifestText, manifestPath);

  const convertDataBase64 = convertData(reportDir, manifest);
  const id = `${manifest.code}_${manifest.version.replaceAll('.', '_')}_${manifest.is_custom}`;

  let template;
  try {
    template = buildReportDefinition(join(reportDir, 'src'), manifest, warn);
  } catch (e) {
    fail(`Failed to build report ${reportDir}: ${e.message}`);
  }
  template.index.convert_data = convertDataBase64;
  template.index.convert_data_type = manifest.convert_data_type;

  const schemaPath = manifest.arguments?.schema ?? null;
  const uiPath = manifest.arguments?.ui ?? null;
  if ((schemaPath === null) !== (uiPath === null)) {
    fail(`Failure to generate argument schema ${reportDir}: give both arguments.schema and arguments.ui, or neither`);
  }
  let formSchema = null;
  if (schemaPath !== null) {
    const readSchema = p => {
      let text;
      try {
        text = readFileSync(join(reportDir, p), 'utf8');
      } catch (e) {
        fail(`Failed to argument schema file ${join(reportDir, p)}: ${e.message}`);
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        fail(`Cannot generate schema struct ${reportDir}: ${p}: ${e.message}`);
      }
    };
    formSchema = {
      id: `for_report_${id}`,
      type: 'reportArgument',
      json_schema: readSchema(schemaPath),
      ui_schema: readSchema(uiPath),
    };
  }

  let excelTemplate = null;
  if (manifest.excel_template !== null) {
    const path = join(reportDir, manifest.excel_template);
    try {
      excelTemplate = [...readFileSync(path)];
    } catch (e) {
      fail(`Failed to read excel template file ${path}: ${e.message}`);
    }
  }

  return {
    id,
    name: manifest.name,
    description: manifest.description,
    template,
    context: manifest.context,
    sub_context: manifest.sub_context,
    argument_schema_id: formSchema?.id ?? null,
    comment: null,
    is_custom: manifest.is_custom,
    version: manifest.version,
    code: manifest.code,
    form_schema: formSchema,
    excel_template_buffer: excelTemplate,
  };
}

// ---------------------------------------------------------------------------
// Every report under a directory
// ---------------------------------------------------------------------------

/** Every report directory under `dir`, in the order they are built. */
export function findReports(dir) {
  const found = [];
  const walk = path => {
    if (IGNORED_DIRS.includes(basename(path))) return;
    let stat;
    try {
      stat = statSync(path);
    } catch {
      return; // a dangling symlink
    }
    if (stat.isFile()) {
      if (basename(path) === MANIFEST_FILE) found.push(dirname(path));
      return;
    }
    if (!stat.isDirectory()) return;
    for (const name of readdirSync(path).sort()) walk(join(path, name));
  };
  walk(dir);
  return found;
}

/** Builds every report under `dir` into `dir/generated/<outputName>`. */
export function buildDir(dir, outputName, options) {
  const reports = findReports(dir).map(reportDir => buildReport(reportDir, options));
  const output = join(dir, 'generated', outputName);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify({ reports }, null, 2)}\n`);
  console.log(`Built ${reports.length} report${reports.length === 1 ? '' : 's'} into ${output}`);
  return output;
}

/** A file name for a folder's bundle: its name, with anything but [A-Za-z0-9._-] made a dash. */
export const bundleFileName = name => `${name.replace(/[^A-Za-z0-9._-]/g, '-')}.json`;

/**
 * Builds each folder in `dir` that holds a report as a bundle of its own, into
 * `outDir`. Returns what goes in clients.json: `{ client, file }` for one that
 * built, `{ client, error }` for one that did not - its name kept as it is,
 * spaces and all, since the file name cannot keep it.
 */
export function buildEach(dir, outDir, options) {
  mkdirSync(outDir, { recursive: true });
  const results = [];
  const folders = readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !IGNORED_DIRS.includes(d.name))
    .map(d => d.name)
    .sort();
  const taken = new Set();
  for (const client of folders) {
    const reportDirs = findReports(join(dir, client));
    if (!reportDirs.length) continue;
    try {
      const reports = reportDirs.map(reportDir => buildReport(reportDir, options));
      const file = bundleFileName(client);
      if (taken.has(file)) fail(`${client} would be written as ${file}, which another folder already is`);
      taken.add(file);
      writeFileSync(join(outDir, file), `${JSON.stringify({ reports }, null, 2)}\n`);
      console.log(`Built ${client}: ${reports.length} report${reports.length === 1 ? '' : 's'}`);
      results.push({ client, file });
    } catch (e) {
      console.error(`error: ${client}: ${e.message}`);
      results.push({ client, error: e.message });
    }
  }
  writeFileSync(join(outDir, 'clients.json'), `${JSON.stringify(results, null, 2)}\n`);
  return results;
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const out = { paths: null, report: null, output: null, definition: false, each: null, out: null };
  let list = null;
  for (const arg of argv) {
    if (arg === '--path') {
      out.paths ??= [];
      list = out.paths;
    } else if (arg === '--definition') {
      out.definition = true;
      list = null;
    } else if (['--report', '--output', '--each', '--out'].includes(arg)) {
      list = arg;
    } else if (arg.startsWith('--')) {
      fail(`Unknown option ${arg}`);
    } else if (typeof list === 'string') {
      out[list.slice(2)] = arg;
      list = null;
    } else if (Array.isArray(list)) {
      list.push(arg);
    } else {
      fail(`Unexpected argument ${arg}`);
    }
  }
  if ((out.report === null) !== (out.output === null)) fail('--report and --output go together');
  if (out.report !== null && out.paths !== null) fail('--report builds one report; it does not go with --path');
  if (out.definition && out.report === null) fail('--definition goes with --report');
  if ((out.each === null) !== (out.out === null)) fail('--each and --out go together');
  if (out.each !== null && (out.report !== null || out.paths !== null)) fail('--each builds every folder in a directory; it goes with nothing but --out');
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.report !== null) {
    const report = buildReport(resolve(args.report));
    mkdirSync(dirname(resolve(args.output)), { recursive: true });
    writeFileSync(args.output, `${JSON.stringify(args.definition ? report.template : report, null, 2)}\n`);
    return;
  }
  if (args.paths !== null) {
    for (const dir of args.paths) buildDir(resolve(dir), 'reports.json');
    return;
  }
  if (args.each !== null) {
    const results = buildEach(resolve(args.each), resolve(args.out));
    if (!results.some(r => r.file)) fail(`nothing in ${args.each} built`);
    return;
  }
  // Named after their folder, which is how the server finds them to embed.
  buildDir(join(REPO_ROOT, 'standard_reports'), 'standard_reports.json');
  buildDir(join(REPO_ROOT, 'standard_forms'), 'standard_forms.json');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    if (!(e instanceof ReportBuildError)) throw e;
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
