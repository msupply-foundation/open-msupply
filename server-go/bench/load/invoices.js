// k6 load test for the invoices GraphQL query. Usage:
//   k6 run -e URL=http://localhost:8001/graphql bench/load/invoices.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  insecureSkipTLSVerify: true,
  scenarios: {
    load: { executor: 'constant-vus', vus: 50, duration: '20s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

const URL = __ENV.URL || 'http://localhost:8001/graphql';
const STORE = __ENV.STORE_ID || 'store-1';

// Identical document sent to BOTH servers. Includes otherParty { ... } so the per-node
// DataLoader (name batched by id) is exercised on each server, not just scalar columns.
const query = `query Invoices($storeId: String!) {
  invoices(storeId: $storeId, page: { first: 50 }, sort: [{ key: invoiceNumber }]) {
    ... on InvoiceConnector {
      totalCount
      nodes {
        id type status invoiceNumber createdDatetime
        otherParty(storeId: $storeId) { id name code }
      }
    }
  }
}`;

export default function () {
  const res = http.post(
    URL,
    JSON.stringify({ query, variables: { storeId: STORE } }),
    {
      headers: { 'Content-Type': 'application/json' },
      ...(__ENV.TOKEN ? { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.TOKEN}` } } : {}),
    }
  );
  check(res, {
    'status 200': (r) => r.status === 200,
    'has nodes': (r) => r.body.includes('"nodes"'),
    'no errors': (r) => !r.body.includes('"errors"'),
  });
}
