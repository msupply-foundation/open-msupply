// Perf comparison harness for the properties KDD prototype, in k6.
//
// For each storage strategy (legacy text JSON, legacy JSONB twin, V2
// relational), runs a filter and a sort against the live `facilities`
// GraphQL query. Each (op, field, method) combination is tagged so k6
// reports per-case latency stats — min / med / avg / p95 / max — at the end.
//
// Usage:
//   OMS_URL=http://localhost:8000/graphql \
//   OMS_STORE_ID=<ANY_STORE_ID> \
//   OMS_TOKEN=eyJ0... \
//   OMS_ITERS=10 \
//   k6 run server/scripts/perf_test.k6.js
//
// To stress under concurrent load instead of measuring single-shot latency,
// override OMS_VUS (and optionally extend OMS_ITERS):
//   OMS_VUS=20 OMS_ITERS=50 k6 run server/scripts/perf_test.k6.js
//
// The token can be the raw JWT or include the "Bearer " prefix. The store id
// only needs to be one the JWT subject can access.

import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ---------- Config ----------------------------------------------------------

const URL = __ENV.OMS_URL || 'http://localhost:8000/graphql';
const STORE_ID = __ENV.OMS_STORE_ID;
const TOKEN_RAW = __ENV.OMS_TOKEN;
const FIRST = parseInt(__ENV.OMS_FIRST || '50', 10);
const ITERS = parseInt(__ENV.OMS_ITERS || '10', 10);
const VUS = parseInt(__ENV.OMS_VUS || '1', 10);

if (!STORE_ID) throw new Error('OMS_STORE_ID is required');
if (!TOKEN_RAW) throw new Error('OMS_TOKEN is required');
const TOKEN = TOKEN_RAW.startsWith('Bearer ') ? TOKEN_RAW : `Bearer ${TOKEN_RAW}`;

export const options = {
  vus: VUS,
  iterations: ITERS * VUS,
  // Each summary line shows these stats per case.
  summaryTrendStats: ['min', 'med', 'avg', 'p(95)', 'max', 'count'],
  // Don't fail the run on slow responses — we *want* to measure slow.
  thresholds: {},
};

// ---------- Test matrix -----------------------------------------------------

const QUERY = `
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

const PROPS = {
  text: {
    legacyKey: 'beans_thoughts',
    v2Id: 'perf_propv2_beans_thoughts',
  },
  number: {
    legacyKey: 'beans_count',
    v2Id: 'perf_propv2_beans_count',
  },
  option: {
    legacyKey: 'favourite_bean',
    v2Id: 'perf_propv2_favourite_bean',
    optionValueText: 'Navy',
    optionValueId: 'perf_opt_bean_navy',
  },
};

// Values chosen to match a non-trivial subset of the 10k seeded perf stores:
//   text:   "store 7" → ~1111 matches (suffix 7, 70-79, 700-799, 7000-7999)
//   number: BETWEEN 40 AND 60 → ~2100 matches (uniform across 0-99)
//   option: "Navy" → 2000 matches (every 5th store)
const baseFilter = { isStore: true };
const TEXT_VALUE = 'store 7';
const NUMBER_RANGE = { min: 40, max: 60 };

function legacyValueFilter(field) {
  if (field === 'text') return { value: { like: TEXT_VALUE } };
  if (field === 'option') return { value: { like: 'Navy' } };
  // number → range filter via CAST + BETWEEN on the JSON-extracted value
  return { numberValue: { min: NUMBER_RANGE.min, max: NUMBER_RANGE.max } };
}

function v2InnerFilter(field) {
  if (field === 'text') return { valueText: { like: TEXT_VALUE } };
  if (field === 'option') {
    return { valueOptionId: { equalTo: PROPS.option.optionValueId } };
  }
  return { valueNumber: { min: NUMBER_RANGE.min, max: NUMBER_RANGE.max } };
}

function filterVariables(field, method) {
  const prop = PROPS[field];
  const legacyShape = { key: prop.legacyKey, ...legacyValueFilter(field) };
  if (method === 'legacy') {
    return {
      storeId: STORE_ID, key: 'name', first: FIRST,
      filter: { ...baseFilter, legacyProperty: [legacyShape] },
    };
  }
  if (method === 'legacyJsonb') {
    return {
      storeId: STORE_ID, key: 'name', first: FIRST,
      filter: { ...baseFilter, legacyPropertyJsonb: [legacyShape] },
    };
  }
  return {
    storeId: STORE_ID, key: 'name', first: FIRST,
    filter: {
      ...baseFilter,
      property: [{ propertyId: { equalTo: prop.v2Id }, ...v2InnerFilter(field) }],
    },
  };
}

function sortVariables(field, method) {
  const prop = PROPS[field];
  let key, propertyKey;
  if (method === 'legacy') { key = 'legacyProperty'; propertyKey = prop.legacyKey; }
  else if (method === 'legacyJsonb') { key = 'legacyPropertyJsonb'; propertyKey = prop.legacyKey; }
  else { key = 'propertyV2'; propertyKey = prop.v2Id; }
  return {
    storeId: STORE_ID, key, desc: false, propertyKey, first: FIRST,
    filter: baseFilter,
  };
}

// ---------- Per-case Trend metrics ------------------------------------------
//
// k6 lets us tag each request, but Trend metrics with explicit names give
// nicer per-case rows in the end-of-run summary. Pre-declare them so the
// summary order is predictable.

const METHODS = ['legacy', 'legacyJsonb', 'v2'];
const FIELDS = ['text', 'number', 'option'];
const OPS = ['filter', 'sort'];

const trends = {};
for (const op of OPS) {
  for (const field of FIELDS) {
    for (const method of METHODS) {
      const name = `${op}_${field}_${method}`;
      trends[name] = new Trend(name, true);
    }
  }
}

// ---------- Runner ----------------------------------------------------------

function runCase(op, field, method) {
  const variables = op === 'filter'
    ? filterVariables(field, method)
    : sortVariables(field, method);
  const res = http.post(URL, JSON.stringify({ query: QUERY, variables }), {
    headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    tags: { op, field, method },
  });
  trends[`${op}_${field}_${method}`].add(res.timings.duration);
  // Surface GraphQL errors loudly — they'd otherwise produce free-running
  // 200 OK timings that look fast but are meaningless. Connection resets
  // (server restart, OOM) come through as status 0 with a null body.
  if (res.error_code || res.status !== 200) {
    const snippet = (res.body || res.error || '').toString().slice(0, 400);
    console.error(
      `HTTP ${res.status} ${op}/${field}/${method}: ${snippet || '(no body)'}`
    );
  } else {
    let body;
    try { body = res.json(); } catch (_) { body = null; }
    if (body && body.errors) {
      console.error(
        `GQL error ${op}/${field}/${method}: ${JSON.stringify(body.errors).slice(0, 400)}`
      );
    }
  }
}

export default function () {
  for (const op of OPS) {
    for (const field of FIELDS) {
      for (const method of METHODS) {
        runCase(op, field, method);
      }
    }
  }
}

// ---------- Pretty summary --------------------------------------------------
//
// k6's default summary lumps every metric together. Build a per-op table so
// the comparison reads at a glance.

function fmt(n) {
  if (n == null || isNaN(n)) return '   —';
  return `${n.toFixed(0).padStart(4)}ms`;
}

function row(label, leg, jsonb, v2) {
  return (
    label.padEnd(18) +
    fmt(leg).padStart(10) +
    fmt(jsonb).padStart(10) +
    fmt(v2).padStart(10)
  );
}

export function handleSummary(data) {
  const out = [];
  out.push('');
  out.push(`URL:    ${URL}`);
  out.push(`Store:  ${STORE_ID}`);
  out.push(`VUs:    ${VUS}    iterations/VU: ${ITERS}    page first=${FIRST}`);
  out.push('');
  for (const op of OPS) {
    out.push(`== ${op.toUpperCase()} median latency ==`);
    out.push('field'.padEnd(18) + 'legacy'.padStart(10) + 'jsonb'.padStart(10) + 'v2'.padStart(10));
    for (const field of FIELDS) {
      const leg = data.metrics[`${op}_${field}_legacy`]?.values?.med;
      const jsonb = data.metrics[`${op}_${field}_legacyJsonb`]?.values?.med;
      const v2 = data.metrics[`${op}_${field}_v2`]?.values?.med;
      out.push(row(field, leg, jsonb, v2));
    }
    out.push('');
    out.push(`== ${op.toUpperCase()} p95 latency ==`);
    out.push('field'.padEnd(18) + 'legacy'.padStart(10) + 'jsonb'.padStart(10) + 'v2'.padStart(10));
    for (const field of FIELDS) {
      const leg = data.metrics[`${op}_${field}_legacy`]?.values?.['p(95)'];
      const jsonb = data.metrics[`${op}_${field}_legacyJsonb`]?.values?.['p(95)'];
      const v2 = data.metrics[`${op}_${field}_v2`]?.values?.['p(95)'];
      out.push(row(field, leg, jsonb, v2));
    }
    out.push('');
  }
  return {
    stdout:
      out.join('\n') +
      '\n----\n' +
      textSummary(data, { indent: '  ', enableColors: true }),
  };
}
