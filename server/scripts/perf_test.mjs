#!/usr/bin/env node
/* eslint-disable no-console */
//
// Perf comparison harness for the properties KDD prototype.
//
// For each of the three storage strategies (legacy text JSON, legacy JSONB
// twin, V2 relational), runs a filter and a sort against the live
// `facilities` GraphQL query. Each case is warmed up once, then sampled N
// times, and the median latency is reported in a side-by-side table.
//
// Usage:
//   node server/scripts/perf_test.mjs \
//     --url http://localhost:8000/graphql \
//     --token "Bearer eyJ0..." \
//     --store-id <ANY_STORE_ID> \
//     --iterations 5
//
// The token can be the raw JWT or the full "Bearer ..." string. The
// store-id only needs to be one the JWT subject has access to — the harness
// stays inside that store's `names` query.

import { performance } from 'node:perf_hooks';

// ---------- CLI arg parsing -------------------------------------------------

const argv = process.argv.slice(2);
const flags = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
}

const URL = flags.url ?? process.env.OMS_URL ?? 'http://localhost:8000/graphql';
const STORE_ID = flags['store-id'] ?? process.env.OMS_STORE_ID;
const ITERATIONS = Number(flags.iterations ?? 5);
const FIRST = Number(flags.first ?? 50);
const RAW_TOKEN = flags.token ?? process.env.OMS_TOKEN;

if (!RAW_TOKEN) {
  console.error('Missing --token (or OMS_TOKEN env var)');
  process.exit(1);
}
if (!STORE_ID) {
  console.error(
    'Missing --store-id. Find one with:\n' +
      "  sqlite3 path/to/db.sqlite \"SELECT id FROM store WHERE id NOT LIKE 'perf_%' LIMIT 1;\""
  );
  process.exit(1);
}
const TOKEN = RAW_TOKEN.startsWith('Bearer ') ? RAW_TOKEN : `Bearer ${RAW_TOKEN}`;

// ---------- GraphQL plumbing ------------------------------------------------

const FACILITIES_QUERY = /* graphql */ `
  query PerfFacilities(
    $storeId: String!
    $key: NameSortFieldInput!
    $desc: Boolean
    $propertyKey: String
    $first: Int
    $filter: NameFilterInput
  ) {
    names(
      storeId: $storeId
      page: { first: $first, offset: 0 }
      sort: { key: $key, desc: $desc, propertyKey: $propertyKey }
      filter: $filter
    ) {
      ... on NameConnector {
        totalCount
        nodes { id }
      }
    }
  }
`;

async function gqlRequest(variables) {
  const start = performance.now();
  let res;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: TOKEN,
      },
      body: JSON.stringify({ query: FACILITIES_QUERY, variables }),
    });
  } catch (e) {
    return { elapsed: performance.now() - start, error: e.message };
  }
  const json = await res.json().catch(() => ({}));
  const elapsed = performance.now() - start;
  if (json.errors) {
    return { elapsed, error: json.errors.map(e => e.message).join('; '), raw: json };
  }
  const total = json?.data?.names?.totalCount ?? null;
  return { elapsed, total };
}

// ---------- Test matrix -----------------------------------------------------

const PROPS = {
  text: {
    label: 'Thoughts on beans',
    legacyKey: 'beans_thoughts',
    v2Id: 'perf_propv2_beans_thoughts',
  },
  number: {
    label: 'Beans',
    legacyKey: 'beans_count',
    v2Id: 'perf_propv2_beans_count',
  },
  option: {
    label: 'Favourite Bean',
    legacyKey: 'favourite_bean',
    v2Id: 'perf_propv2_favourite_bean',
    optionValueText: 'Navy',
    optionValueId: 'perf_opt_bean_navy',
  },
};

// Filter values picked to hit ~10-20% of the 10k seeded perf stores:
//   text:   "store 7" → ~1111 matches
//   number: BETWEEN 40 AND 60 → ~2100 matches
//   option: "Navy" → 2000 matches
const baseFilter = { isStore: true };
const TEXT_VALUE = 'store 7';
const NUMBER_RANGE = { min: 40, max: 60 };

function legacyValueFilter(field) {
  if (field === 'text') return { value: { like: TEXT_VALUE } };
  if (field === 'option') return { value: { like: 'Navy' } };
  return { numberValue: { min: NUMBER_RANGE.min, max: NUMBER_RANGE.max } };
}

function v2InnerFilter(field) {
  if (field === 'text') return { valueText: { like: TEXT_VALUE } };
  if (field === 'option')
    return { valueOptionId: { equalTo: PROPS.option.optionValueId } };
  return { valueNumber: { min: NUMBER_RANGE.min, max: NUMBER_RANGE.max } };
}

function filterVariables(field, method) {
  const prop = PROPS[field];
  const legacyShape = { key: prop.legacyKey, ...legacyValueFilter(field) };
  if (method === 'legacy') {
    return {
      storeId: STORE_ID,
      key: 'name',
      first: FIRST,
      filter: { ...baseFilter, legacyProperty: [legacyShape] },
    };
  }
  if (method === 'legacyJsonb') {
    return {
      storeId: STORE_ID,
      key: 'name',
      first: FIRST,
      filter: { ...baseFilter, legacyPropertyJsonb: [legacyShape] },
    };
  }
  return {
    storeId: STORE_ID,
    key: 'name',
    first: FIRST,
    filter: {
      ...baseFilter,
      property: [
        { propertyId: { equalTo: prop.v2Id }, ...v2InnerFilter(field) },
      ],
    },
  };
}

function sortVariables(field, method) {
  const prop = PROPS[field];
  let key;
  let propertyKey;
  if (method === 'legacy') {
    key = 'legacyProperty';
    propertyKey = prop.legacyKey;
  } else if (method === 'legacyJsonb') {
    key = 'legacyPropertyJsonb';
    propertyKey = prop.legacyKey;
  } else {
    key = 'propertyV2';
    propertyKey = prop.v2Id;
  }
  return {
    storeId: STORE_ID,
    key,
    desc: false,
    propertyKey,
    first: FIRST,
    filter: baseFilter,
  };
}

const METHODS = ['legacy', 'legacyJsonb', 'v2'];
const FIELDS = ['text', 'number', 'option'];

// ---------- Runner ----------------------------------------------------------

async function runCase(variables) {
  // One warmup so the SQL planner / page cache aren't penalising the first
  // sample. We discard its latency.
  await gqlRequest(variables);
  const samples = [];
  let total = null;
  let error = null;
  for (let i = 0; i < ITERATIONS; i++) {
    const r = await gqlRequest(variables);
    if (r.error) {
      error = r.error;
      break;
    }
    samples.push(r.elapsed);
    total = r.total;
  }
  samples.sort((a, b) => a - b);
  const median = samples.length ? samples[Math.floor(samples.length / 2)] : null;
  return { samples, median, total, error };
}

function fmtMs(n) {
  if (n == null) return '   —';
  return `${n.toFixed(0).padStart(4)}ms`;
}

async function main() {
  console.log(`URL:        ${URL}`);
  console.log(`Store ID:   ${STORE_ID}`);
  console.log(`Iterations: ${ITERATIONS} (+1 warmup, page first=${FIRST})`);
  console.log('');

  // Sanity-check connectivity + auth before running the matrix.
  const ping = await gqlRequest({
    storeId: STORE_ID,
    key: 'name',
    first: 1,
    filter: baseFilter,
  });
  if (ping.error) {
    console.error('Ping failed:', ping.error);
    if (ping.raw) console.error(JSON.stringify(ping.raw, null, 2));
    process.exit(1);
  }
  console.log(`Connectivity OK — ${ping.total} stores visible from this store context.`);
  console.log('');

  const results = {}; // results[op][field][method] = { median, total }

  for (const op of ['filter', 'sort']) {
    results[op] = {};
    for (const field of FIELDS) {
      results[op][field] = {};
      for (const method of METHODS) {
        const variables =
          op === 'filter'
            ? filterVariables(field, method)
            : sortVariables(field, method);
        process.stdout.write(
          `${op.padEnd(6)} ${field.padEnd(6)} ${method.padEnd(11)} ... `
        );
        const r = await runCase(variables);
        if (r.error) {
          console.log(`ERROR: ${r.error}`);
        } else {
          console.log(
            `median ${fmtMs(r.median)}  (matches: ${r.total ?? '—'}, samples ${r.samples
              .map(s => s.toFixed(0))
              .join('/')})`
          );
        }
        results[op][field][method] = r;
      }
    }
  }

  // Summary tables.
  console.log('');
  for (const op of ['filter', 'sort']) {
    console.log(`== ${op.toUpperCase()} (median over ${ITERATIONS} samples) ==`);
    console.log(
      'field'.padEnd(8) +
        'legacy'.padStart(11) +
        'jsonb'.padStart(11) +
        'v2'.padStart(11) +
        '   matches (legacy/v2)'
    );
    for (const field of FIELDS) {
      const row = results[op][field];
      const matches = `${row.legacy?.total ?? '—'} / ${row.v2?.total ?? '—'}`;
      console.log(
        field.padEnd(8) +
          fmtMs(row.legacy?.median).padStart(11) +
          fmtMs(row.legacyJsonb?.median).padStart(11) +
          fmtMs(row.v2?.median).padStart(11) +
          `   ${matches}`
      );
    }
    console.log('');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
