// k6 load test simulating a client that caches totalCount per filter: most requests fetch
// rows only (no totalCount selected), and one in COUNT_FREQ iterations refreshes the count.
// Usage:
//   k6 run -e URL=https://localhost:8002/graphql -e STORE_ID=... -e COUNT_FREQ=25 bench/load/invoices_lazy.js
// COUNT_FREQ=0 disables count requests entirely (rows-only mode).
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  insecureSkipTLSVerify: true,
  scenarios: {
    load: { executor: 'constant-vus', vus: 50, duration: '20s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // Per-request-type latency, reported separately in the summary.
    'http_req_duration{name:rows}': [],
    'http_req_duration{name:count}': [],
  },
};

const URL = __ENV.URL || 'http://localhost:8001/graphql';
const STORE = __ENV.STORE_ID || 'store-1';
const COUNT_FREQ = parseInt(__ENV.COUNT_FREQ || '25', 10);

// Same selection as invoices.js minus totalCount: the server must skip the COUNT entirely.
const rowsQuery = `query Invoices($storeId: String!) {
  invoices(storeId: $storeId, page: { first: 50 }, sort: [{ key: invoiceNumber }]) {
    ... on InvoiceConnector {
      nodes {
        id type status invoiceNumber createdDatetime
        otherParty(storeId: $storeId) { id name code }
      }
    }
  }
}`;

// Count-only refresh: totalCount depends only on the filter, so no sort and a minimal page.
const countQuery = `query InvoicesCount($storeId: String!) {
  invoices(storeId: $storeId, page: { first: 1 }) {
    ... on InvoiceConnector {
      totalCount
    }
  }
}`;

function post(query, tagName) {
  return http.post(URL, JSON.stringify({ query, variables: { storeId: STORE } }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: tagName },
  });
}

export default function () {
  const isCount = COUNT_FREQ > 0 && __ITER % COUNT_FREQ === 0;
  const res = isCount ? post(countQuery, 'count') : post(rowsQuery, 'rows');
  check(res, {
    'status 200': (r) => r.status === 200,
    'no errors': (r) => !r.body.includes('"errors"'),
    'has data': (r) => (isCount ? r.body.includes('"totalCount"') : r.body.includes('"nodes"')),
  });
}
