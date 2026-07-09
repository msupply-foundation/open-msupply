/**
 * Data arrange step ("seed verbs, not nouns").
 *
 * The e2e reference datafile (server/data/e2e) deliberately contains no
 * stock — stock is store-local state the API can create, so the suites
 * arrange it here rather than baking it into the seed image. This step runs
 * once per Playwright invocation (after auth.setup, before the suites) and
 * is idempotent: if the store already has stock lines it does nothing, so
 * it's safe against a long-lived local datafile too.
 *
 * The API origin usually equals BASE_URL (the server serves the built FE).
 * When driving a webpack dev server, pass API_URL for the backend origin.
 */
import { test as setup, expect } from '@playwright/test';

const API_URL =
  process.env['API_URL'] ?? process.env['BASE_URL'] ?? 'http://localhost:3003';
const USERNAME = process.env['PW_USERNAME'] ?? 'admin';
const PASSWORD = process.env['PW_PASSWORD'] ?? 'pass';

/** Stock lines to guarantee; a store "with stock" for the suites. */
const SEED_LINES = 6;
const PACKS_PER_LINE = 100;

setup('Seed stock via API', async ({ request }) => {
  const gql = async (
    query: string,
    variables: Record<string, unknown> = {},
    token?: string
  ) => {
    const res = await request.post(`${API_URL}/graphql`, {
      data: { query, variables },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await res.json();
    if (body.errors)
      throw new Error(
        `GraphQL error for ${query.slice(0, 60)}...: ${JSON.stringify(body.errors)}`
      );
    return body.data;
  };

  const auth = await gql(
    `query($u: String!, $p: String!) {
       authToken(username: $u, password: $p) {
         ... on AuthToken { token }
         ... on AuthTokenError { error { description } }
       }
     }`,
    { u: USERNAME, p: PASSWORD }
  );
  const token = auth.authToken.token;
  expect(token, 'API login failed').toBeTruthy();

  // The user's own store joins — not `stores`, which returns every store
  // known to the datafile (hundreds), not the one active on this site.
  const me = await gql(
    `query {
       me {
         ... on UserNode {
           stores { ... on UserStoreConnector { nodes { id code } } }
         }
       }
     }`,
    {},
    token
  );
  const storeId = me.me.stores.nodes[0]?.id;
  expect(storeId, 'API user has no store joins').toBeTruthy();

  const existing = await gql(
    `query($storeId: String!) {
       stockLines(storeId: $storeId, page: { first: 1 }) {
         ... on StockLineConnector { totalCount }
       }
     }`,
    { storeId },
    token
  );
  if (existing.stockLines.totalCount >= SEED_LINES) return;

  // A positive adjustment reason is required when the datafile defines any.
  const reasons = await gql(
    `query {
       reasonOptions(filter: {
         type: { equalTo: POSITIVE_INVENTORY_ADJUSTMENT },
         isActive: true,
       }) { ... on ReasonOptionConnector { nodes { id } } }
     }`,
    {},
    token
  );
  const reasonOptionId = reasons.reasonOptions.nodes?.[0]?.id ?? null;

  // The suites search for 'amox' throughout — those items must have stock.
  // Top up to SEED_LINES with the first visible items after that.
  const itemsQuery = `query($storeId: String!, $first: Int!, $filter: ItemFilterInput!) {
    items(storeId: $storeId, page: { first: $first }, filter: $filter) {
      ... on ItemConnector { nodes { id code } }
    }
  }`;
  const amox = await gql(
    itemsQuery,
    {
      storeId,
      first: SEED_LINES,
      filter: { isVisible: true, isActive: true, name: { like: 'amox' } },
    },
    token
  );
  const general = await gql(
    itemsQuery,
    { storeId, first: SEED_LINES, filter: { isVisible: true, isActive: true } },
    token
  );
  const byId = new Map<string, { id: string; code: string }>();
  for (const n of [...amox.items.nodes, ...general.items.nodes])
    if (byId.size < SEED_LINES) byId.set(n.id, n);
  const nodes = [...byId.values()];
  expect(
    nodes.length,
    'no visible items in the store — the seed datafile is missing item/master-list data'
  ).toBeGreaterThan(0);

  // One outbound shipment so list-driven distribution tests (search by
  // customer name, row-dependent assertions) have a row to work with.
  const invoices = await gql(
    `query($storeId: String!) {
       invoices(storeId: $storeId, page: { first: 1 },
                filter: { type: { equalTo: OUTBOUND_SHIPMENT } }) {
         ... on InvoiceConnector { totalCount }
       }
     }`,
    { storeId },
    token
  );
  if (invoices.invoices.totalCount === 0) {
    const customers = await gql(
      `query($storeId: String!) {
         names(storeId: $storeId, page: { first: 1 },
               filter: { isCustomer: true, isVisible: true }) {
           ... on NameConnector { nodes { id } }
         }
       }`,
      { storeId },
      token
    );
    const customerId = customers.names.nodes[0]?.id;
    expect(customerId, 'no customer visible to the store').toBeTruthy();
    const shipment = await gql(
      `mutation($storeId: String!, $input: InsertOutboundShipmentInput!) {
         insertOutboundShipment(storeId: $storeId, input: $input) { __typename }
       }`,
      { storeId, input: { id: crypto.randomUUID(), otherPartyId: customerId } },
      token
    );
    expect(shipment.insertOutboundShipment.__typename).toBe('InvoiceNode');
  }

  const amoxIds = new Set(amox.items.nodes.map((n: { id: string }) => n.id));
  for (const item of nodes) {
    // Multi-batch items are needed by the sort/batch-picker tests; give the
    // 'amox' items two batches, everything else one.
    const batches = amoxIds.has(item.id) ? ['a', 'b'] : ['a'];
    for (const suffix of batches) {
      const result = await gql(
        `mutation($storeId: String!, $input: InsertStockLineInput!) {
           insertStockLine(storeId: $storeId, input: $input) { __typename }
         }`,
        {
          storeId,
          input: {
            id: crypto.randomUUID(),
            itemId: item.id,
            numberOfPacks: PACKS_PER_LINE,
            packSize: 1,
            costPricePerPack: 1,
            sellPricePerPack: 2,
            onHold: false,
            batch: `e2e-${item.code}-${suffix}`,
            reasonOptionId,
          },
        },
        token
      );
      expect(result.insertStockLine.__typename).toBe('StockLineNode');
    }
  }
});
