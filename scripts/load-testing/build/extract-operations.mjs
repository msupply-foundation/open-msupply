#!/usr/bin/env node
// Extracts the GraphQL operation documents the omSupply client actually sends and writes them
// to ../operations.generated.js as a { key: { name, query } } map for the k6 load harness to import.
//
// Why this exists: k6 runs on the goja JS engine and can't import the client's generated TS SDK
// (it's bound to graphql-request/fetch + React Query). But the *operation text* is the thing that
// guarantees the harness drives the same GraphQL as a real client and stays in sync as the schema
// evolves. We read the SAME `.graphql` documents that `codegen.yml` consumes, resolve fragment
// spreads transitively (fragments span files), and print each operation to a string.
//
// Run via `yarn generate` (wired in client/package.json) or directly:
//   node scripts/load-testing/build/extract-operations.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../../..');
const CLIENT_DIR = join(REPO_ROOT, 'client');
const OUT_FILE = resolve(SCRIPT_DIR, '../operations.generated.js');

// Resolve `graphql` from the client workspace (it's a transitive dep of graphql-codegen there).
const clientRequire = createRequire(join(CLIENT_DIR, 'package.json'));
const { parse, print, visit } = clientRequire('graphql');

// The operations the harness drives, selected by operation name (the name === the key the harness
// imports and the `operationName` sent to the server). Names are unique across the client's .graphql
// files EXCEPT for a handful that collide across packages — those are written as
// `{ name, disambiguate }` where `disambiguate` is a path substring that picks the right file.
//
// Matching is name-first: a uniquely-named operation needs no path at all, so this list does NOT
// encode the repo's folder layout and survives files moving between packages. Generation fails
// loudly only when a name is genuinely missing (a real upstream rename/removal you want to know
// about) or newly ambiguous (add a `disambiguate`). Keep in sync with the `operations.*` keys the
// harness references in ops/*.js.
const OPERATIONS = [
  // --- polling ---
  'me',
  'isCentralServer',
  'preferences',
  'initialisationStatus',
  // syncInfo (not the bare syncStatus) is what the always-on sync indicator sends: it adds
  // `numberOfRecordsInPushQueue`, which runs a COUNT over the changelog_deduped view. On a central
  // server that count is a full changelog scan and was the dominant DB cost in the v2.16.4 load test.
  'syncInfo',
  // The graphql-transport-ws subscription the real client prefers (useSyncInfo). Driven over a
  // websocket by the syncSubscriber scenario — exercises the SHARED/debounced subscription path
  // (one server-side count per 30s for all subscribers) rather than the per-client poll.
  'syncInfoUpdated',
  'itemCounts',
  'requisitionCounts',
  'stockCounts',
  'internalOrderCounts',
  'inboundInternalCounts',
  'inboundExternalCounts',
  'outboundCounts',
  // --- app-boot / per-navigation bundle (real clients emit these on login + store init; ~10% of the
  //     real 20-user capture, and entirely absent before). Several hit resolvers no other op touches. ---
  'frontendPluginMetadata',
  'supplierProgramSettings',
  'displaySettings',
  'permissions',
  'activeVvmStatuses',
  'nameProperties',
  // --- auth ---
  'authToken',
  // --- browse ---
  'items',
  'names',
  'stockLines',
  { name: 'invoices', disambiguate: 'invoices/src/InboundShipment' }, // also defined for OutboundShipment
  { name: 'invoice', disambiguate: 'invoices/src/InboundShipment' }, //  "
  { name: 'requests', disambiguate: 'requisitions/src/RequestRequisition' }, // also in invoices/InboundShipment
  'requestById',
  'stocktakes',
  'stocktake',
  'reports',
  // --- requisition workflow (per-line ops, as the real client does) ---
  'insertRequest',
  'insertRequestLine',
  'updateRequestLine',
  'updateRequest',
  // --- invoice (inbound shipment) workflow ---
  'insertInboundShipment',
  'upsertInboundShipment',
  'updateInboundShipment',
  // --- stocktake workflow ---
  'insertStocktake',
  'upsertStocktakeLines',
  'updateStocktake',
  // --- sync driver (the changelog-lock path) ---
  'manualSync',
];

function walkGraphqlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkGraphqlFiles(full, acc);
    else if (entry.name.endsWith('.graphql')) acc.push(full);
  }
  return acc;
}

// Build global maps of fragments and operations across every .graphql file.
function buildIndex(files) {
  const fragments = new Map(); // name -> definition node
  const operations = []; // { name, node, file }
  for (const file of files) {
    let doc;
    try {
      doc = parse(readFileSync(file, 'utf8'));
    } catch (e) {
      throw new Error(`Failed to parse ${relative(REPO_ROOT, file)}: ${e.message}`);
    }
    for (const def of doc.definitions) {
      if (def.kind === 'FragmentDefinition') {
        const name = def.name.value;
        // Same fragment text may be defined identically in multiple files — only error on real divergence.
        const existing = fragments.get(name);
        if (existing && print(existing) !== print(def)) {
          throw new Error(`Conflicting definitions for fragment "${name}" across files.`);
        }
        fragments.set(name, def);
      } else if (def.kind === 'OperationDefinition' && def.name) {
        operations.push({ name: def.name.value, node: def, file });
      }
    }
  }
  return { fragments, operations };
}

// Collect (transitively) every fragment a node depends on.
function collectFragments(node, fragments, acc = new Map()) {
  visit(node, {
    FragmentSpread(spread) {
      const name = spread.name.value;
      if (acc.has(name)) return;
      const frag = fragments.get(name);
      if (!frag) throw new Error(`Fragment "${name}" referenced by "${node.name?.value}" not found.`);
      acc.set(name, frag);
      collectFragments(frag, fragments, acc);
    },
  });
  return acc;
}

function main() {
  const files = walkGraphqlFiles(CLIENT_DIR);
  const { fragments, operations } = buildIndex(files);

  const out = {};
  const seen = new Set();
  const errors = [];

  for (const entry of OPERATIONS) {
    // Each entry is either a bare operation name or { name, disambiguate }.
    const name = typeof entry === 'string' ? entry : entry.name;
    const disambiguate = typeof entry === 'string' ? null : entry.disambiguate;

    if (seen.has(name)) {
      errors.push(`Duplicate operation "${name}" in OPERATIONS.`);
      continue;
    }
    seen.add(name);

    let matches = operations.filter(o => o.name === name);
    if (matches.length === 0) {
      errors.push(`Operation "${name}" not found — renamed or removed upstream? Update OPERATIONS.`);
      continue;
    }
    // Only consult the path hint when the name is genuinely ambiguous, so unique names never depend
    // on folder layout.
    if (matches.length > 1) {
      if (!disambiguate) {
        const where = matches.map(m => relative(REPO_ROOT, m.file)).join(', ');
        errors.push(`Operation "${name}" is ambiguous — found in: ${where}. Add a \`disambiguate\` path substring.`);
        continue;
      }
      matches = matches.filter(o => o.file.split('\\').join('/').includes(disambiguate));
      if (matches.length !== 1) {
        const where = operations.filter(o => o.name === name).map(m => relative(REPO_ROOT, m.file)).join(', ');
        errors.push(`Operation "${name}" disambiguate "${disambiguate}" matched ${matches.length} of: ${where}.`);
        continue;
      }
    }

    const opNode = matches[0].node;
    const fragDefs = [...collectFragments(opNode, fragments).values()];
    const query = print({ kind: 'Document', definitions: [opNode, ...fragDefs] });
    out[name] = { name, query };
  }

  if (errors.length) {
    console.error('extract-operations failed:\n  - ' + errors.join('\n  - '));
    process.exit(1);
  }

  const banner =
    '// AUTO-GENERATED — do not edit by hand.\n' +
    '// Source: client/**/*.graphql (the same documents graphql-codegen consumes).\n' +
    '// Regenerate with `yarn generate` or `node scripts/load-testing/build/extract-operations.mjs`.\n';
  const body =
    'export const operations = {\n' +
    Object.entries(out)
      .map(([key, { name, query }]) => `  ${JSON.stringify(key)}: { name: ${JSON.stringify(name)}, query: ${JSON.stringify(query)} },`)
      .join('\n') +
    '\n};\n';

  writeFileSync(OUT_FILE, banner + '\n' + body);
  console.log(`Wrote ${relative(REPO_ROOT, OUT_FILE)} with ${Object.keys(out).length} operations.`);
}

main();
