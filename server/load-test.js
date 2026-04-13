import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

// Run with k6 run load-test.js
// use brew install k6 to get k6 on macOS

// ── Configuration ──────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const USERNAME = __ENV.USERNAME || "mSupply Support";
const PASSWORD = __ENV.PASSWORD || "****";
const STORE_ID = __ENV.STORE_ID || ""; // set this or it will be resolved from login

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 0 },
        { duration: "1m", target: 1 },
        { duration: "10s", target: 0 },
      ],
      exec: "browse",
    },
    sync_status: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 0 },
        { duration: "1m", target: 10 },
        { duration: "10s", target: 0 },
      ],
      exec: "syncStatus",
      tags: { scenario: "sync_status" },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
    "http_req_duration{scenario:sync_status}": ["p(95)<2000"],
    "http_req_failed{scenario:sync_status}": ["rate<0.05"],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function gql(query, variables, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ query, variables }),
    { headers },
  );
  if (res.status !== 200 || res.error) {
    console.error(
      `FAILED [${res.status}] ${res.error || ""} body: ${(res.body || "").substring(0, 500)}`,
    );
  }
  return res;
}

function parseGql(res) {
  try {
    const body = JSON.parse(res.body);
    if (body?.errors) {
      console.error(
        `GQL ERRORS: ${JSON.stringify(body.errors).substring(0, 500)}`,
      );
    }
    return body;
  } catch (_) {
    return null;
  }
}

// ── Auth ────────────────────────────────────────────────────────────────────

function login() {
  const res = gql(
    `query authToken($username: String!, $password: String!) {
      authToken(password: $password, username: $username) {
        ... on AuthToken { __typename token }
        ... on AuthTokenError { __typename error { description } }
      }
    }`,
    { username: USERNAME, password: PASSWORD },
  );
  const body = parseGql(res);
  const token = body?.data?.authToken?.token;
  check(res, { "login succeeded": () => !!token });
  return token;
}

function getStoreId(token) {
  if (STORE_ID) return STORE_ID;
  const res = gql(
    `query me {
      me {
        ... on UserNode {
          defaultStore { id }
          stores { nodes { id } }
        }
      }
    }`,
    {},
    token,
  );
  const body = parseGql(res);
  const me = body?.data?.me;
  return me?.defaultStore?.id || me?.stores?.nodes?.[0]?.id || "";
}

// ── Sync Status Query ──────────────────────────────────────────────────────

const SYNC_STATUS = `
query syncInfo {
  syncStatus: latestSyncStatus {
    ...FullSyncStatus
  }
  numberOfRecordsInPushQueue
}

fragment FullSyncStatus on FullSyncStatusNode {
  __typename
  error { ...SyncError }
  integration { ...SyncStatusWithProgress }
  isSyncing
  prepareInitial { ...SyncStatus }
  pullCentral { ...SyncStatusWithProgress }
  pullRemote { ...SyncStatusWithProgress }
  push { ...SyncStatusWithProgress }
  pullV6 { ...SyncStatusWithProgress }
  pushV6 { ...SyncStatusWithProgress }
  summary { ...SyncStatus }
  lastSuccessfulSync { ...SyncStatus }
  errorThreshold
  warningThreshold
}

fragment SyncError on SyncErrorNode {
  __typename
  variant
  fullError
}

fragment SyncStatusWithProgress on SyncStatusWithProgressNode {
  __typename
  finished
  started
  done
  total
}

fragment SyncStatus on SyncStatusNode {
  __typename
  finished
  durationInSeconds
  started
}`;

// ── List Queries ────────────────────────────────────────────────────────────

const INVOICE_LIST = `
query invoices($storeId: String!, $first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput) {
  invoices(storeId: $storeId, page: { first: $first, offset: $offset }, sort: { key: $key, desc: $desc }, filter: $filter) {
    ... on InvoiceConnector {
      totalCount
      nodes {
        id
        invoiceNumber
        otherPartyName
        status
        createdDatetime
        comment
        type
      }
    }
  }
}`;

const REQUISITION_LIST = `
query requisitions($storeId: String!, $filter: RequisitionFilterInput, $page: PaginationInput, $sort: [RequisitionSortInput!]) {
  requisitions(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
    ... on RequisitionConnector {
      totalCount
      nodes {
        id
        requisitionNumber
        otherPartyName
        status
        createdDatetime
        comment
        type
      }
    }
  }
}`;

const STOCK_LIST = `
query stockLines($storeId: String!, $first: Int, $offset: Int, $key: StockLineSortFieldInput!, $desc: Boolean, $filter: StockLineFilterInput) {
  stockLines(storeId: $storeId, page: { first: $first, offset: $offset }, sort: { key: $key, desc: $desc }, filter: $filter) {
    ... on StockLineConnector {
      totalCount
      nodes {
        id
        batch
        expiryDate
        availableNumberOfPacks
        totalNumberOfPacks
        item { code name }
      }
    }
  }
}`;

// ── Detail Queries ──────────────────────────────────────────────────────────

const INVOICE_DETAIL = `
query invoice($id: String!, $storeId: String!) {
  invoice(id: $id, storeId: $storeId) {
    ... on InvoiceNode {
      id invoiceNumber status createdDatetime comment otherPartyName type
      lines { totalCount nodes { id numberOfPacks } }
      pricing { totalAfterTax totalBeforeTax }
    }
  }
}`;

const REQUISITION_DETAIL = `
query requisition($id: String!, $storeId: String!) {
  requisition(id: $id, storeId: $storeId) {
    ... on RequisitionNode {
      id requisitionNumber status createdDatetime comment otherPartyName type
      lines { totalCount nodes { id requestedQuantity } }
    }
  }
}`;

// ── Tab Definitions ─────────────────────────────────────────────────────────

const TABS = [
  {
    name: "Outbound Shipments",
    query: INVOICE_LIST,
    vars: (storeId) => ({
      storeId,
      first: 20,
      offset: 0,
      key: "createdDatetime",
      desc: true,
      filter: { type: { equalTo: "OUTBOUND_SHIPMENT" } },
    }),
    nodesPath: (b) => b?.data?.invoices?.nodes,
    detailQuery: INVOICE_DETAIL,
  },
  {
    name: "Inbound Shipments",
    query: INVOICE_LIST,
    vars: (storeId) => ({
      storeId,
      first: 20,
      offset: 0,
      key: "createdDatetime",
      desc: true,
      filter: { type: { equalTo: "INBOUND_SHIPMENT" } },
    }),
    nodesPath: (b) => b?.data?.invoices?.nodes,
    detailQuery: INVOICE_DETAIL,
  },
  {
    name: "Outbound Returns",
    query: INVOICE_LIST,
    vars: (storeId) => ({
      storeId,
      first: 20,
      offset: 0,
      key: "createdDatetime",
      desc: true,
      filter: { type: { equalTo: "CUSTOMER_RETURN" } },
    }),
    nodesPath: (b) => b?.data?.invoices?.nodes,
    detailQuery: INVOICE_DETAIL,
  },
  {
    name: "Inbound Returns",
    query: INVOICE_LIST,
    vars: (storeId) => ({
      storeId,
      first: 20,
      offset: 0,
      key: "createdDatetime",
      desc: true,
      filter: { type: { equalTo: "SUPPLIER_RETURN" } },
    }),
    nodesPath: (b) => b?.data?.invoices?.nodes,
    detailQuery: INVOICE_DETAIL,
  },
  {
    name: "Request Requisitions",
    query: REQUISITION_LIST,
    vars: (storeId) => ({
      storeId,
      filter: { type: { equalTo: "REQUEST" } },
      page: { first: 20, offset: 0 },
      sort: { key: "createdDatetime", desc: true },
    }),
    nodesPath: (b) => b?.data?.requisitions?.nodes,
    detailQuery: REQUISITION_DETAIL,
  },
  {
    name: "Response Requisitions",
    query: REQUISITION_LIST,
    vars: (storeId) => ({
      storeId,
      filter: { type: { equalTo: "RESPONSE" } },
      page: { first: 20, offset: 0 },
      sort: { key: "createdDatetime", desc: true },
    }),
    nodesPath: (b) => b?.data?.requisitions?.nodes,
    detailQuery: REQUISITION_DETAIL,
  },
  {
    name: "Stock",
    query: STOCK_LIST,
    vars: (storeId) => ({
      storeId,
      first: 20,
      offset: 0,
      key: "expiryDate",
      desc: false,
    }),
    nodesPath: (b) => b?.data?.stockLines?.nodes,
    detailQuery: null, // no separate detail view needed
  },
];

// ── VU-scoped state (persists across iterations, one set per VU) ────────────

let vuToken = null;
let vuStoreId = null;

function getVuCredentials() {
  if (!vuToken) {
    vuToken = login();
  }
  if (vuToken && !vuStoreId) {
    vuStoreId = getStoreId(vuToken);
  }
  return { token: vuToken, storeId: vuStoreId };
}

// ── Main VU Logic ───────────────────────────────────────────────────────────

export function syncStatus() {
  const { token } = getVuCredentials();
  if (!token) return;

  const res = gql(SYNC_STATUS, {}, token);
  const body = parseGql(res);
  check(res, {
    "syncStatus OK": (r) => r.status === 200,
    "syncStatus has data": () => !!body?.data?.syncStatus,
  });
  sleep(Math.random() * 0.5);
}

export function browse() {
  const { token, storeId } = getVuCredentials();
  if (!token) return;

  if (!storeId) {
    console.error("Could not resolve storeId");
    return;
  }

  // Shuffle tabs to simulate random browsing
  const shuffled = TABS.slice().sort(() => Math.random() - 0.5);

  for (const tab of shuffled) {
    // 1. Load the list view
    const listRes = gql(tab.query, tab.vars(storeId), token);
    const listBody = parseGql(listRes);

    check(listRes, {
      [`${tab.name} list OK`]: (r) => r.status === 200,
      [`${tab.name} list has data`]: () => !!listBody?.data,
    });

    // Think time — simulates user reading the list
    sleep(Math.random() * 2 + 1); // 1-3s

    // 2. Click into a random item from the list
    const nodes = tab.nodesPath(listBody) || [];
    if (nodes.length > 0 && tab.detailQuery) {
      const item = nodes[Math.floor(Math.random() * nodes.length)];
      const detailRes = gql(tab.detailQuery, { id: item.id, storeId }, token);
      check(detailRes, {
        [`${tab.name} detail OK`]: (r) => r.status === 200,
      });

      // Think time — simulates user reading the detail
      sleep(Math.random() * 2 + 1);
    }

    // Sometimes paginate (30% chance)
    if (Math.random() < 0.3 && listBody?.data) {
      const pageVars = tab.vars(storeId);
      // Move to page 2
      if (pageVars.offset !== undefined) {
        pageVars.offset = 20;
      } else if (pageVars.page) {
        pageVars.page.offset = 20;
      }
      const page2Res = gql(tab.query, pageVars, token);
      check(page2Res, {
        [`${tab.name} page 2 OK`]: (r) => r.status === 200,
      });
      sleep(Math.random() + 0.5);
    }
  }
}
