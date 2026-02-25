import {gql} from '@apollo/client';
import {apolloClient} from './apolloClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StocktakeStatus = 'NEW' | 'FINALISED';

export interface StocktakeRow {
  id: string;
  stocktakeNumber: number;
  status: StocktakeStatus;
  createdDatetime: string;
}

export interface StocktakeLine {
  id: string;
  itemId: string;
  itemName: string;
  snapshotNumberOfPacks: number;
  countedNumberOfPacks: number | null;
}

// For the UI: lines grouped by item (summing batch quantities)
export interface StocktakeItem {
  itemId: string;
  itemName: string;
  snapshotTotal: number;
  countedTotal: number | null;
  // Raw lines needed for proportional distribution when saving
  lines: StocktakeLine[];
}

// ─── Queries / Mutations ──────────────────────────────────────────────────────

const LIST_IN_PROGRESS_STOCKTAKES = gql`
  query stocktakesInProgress($storeId: String!) {
    stocktakes(
      storeId: $storeId
      filter: {status: {equalTo: NEW}}
      sort: {key: CreatedDatetime, desc: true}
      page: {first: 1}
    ) {
      ... on StocktakeConnector {
        nodes {
          id
          stocktakeNumber
          status
          createdDatetime
        }
      }
    }
  }
`;

const GET_STOCKTAKE_LINES = gql`
  query stocktakeLines($storeId: String!, $stocktakeId: String!) {
    stocktake(id: $stocktakeId, storeId: $storeId) {
      ... on StocktakeNode {
        id
        status
        lines {
          nodes {
            id
            itemId
            itemName
            snapshotNumberOfPacks
            countedNumberOfPacks
          }
        }
      }
    }
  }
`;

const INSERT_STOCKTAKE = gql`
  mutation insertStocktake($storeId: String!, $input: InsertStocktakeInput!) {
    insertStocktake(storeId: $storeId, input: $input) {
      ... on StocktakeNode {
        id
        stocktakeNumber
        status
        createdDatetime
      }
    }
  }
`;

const BATCH_UPDATE_STOCKTAKE_LINES = gql`
  mutation batchUpdateStocktakeLines(
    $storeId: String!
    $updateStocktakeLines: [UpdateStocktakeLineInput!]
  ) {
    batchStocktake(
      storeId: $storeId
      input: {updateStocktakeLines: $updateStocktakeLines}
    ) {
      ... on BatchStocktakeResponse {
        updateStocktakeLines {
          id
          response {
            ... on UpdateStocktakeLineError {
              error {
                description
              }
            }
          }
        }
      }
    }
  }
`;

const FINALISE_STOCKTAKE = gql`
  mutation finaliseStocktake($storeId: String!, $input: UpdateStocktakeInput!) {
    updateStocktake(storeId: $storeId, input: $input) {
      ... on StocktakeNode {
        id
        status
      }
      ... on UpdateStocktakeError {
        error {
          description
        }
      }
    }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Group raw stocktake lines by itemId, summing batch quantities. */
export function groupLinesByItem(lines: StocktakeLine[]): StocktakeItem[] {
  const map = new Map<string, StocktakeItem>();
  for (const line of lines) {
    const existing = map.get(line.itemId);
    if (existing) {
      existing.snapshotTotal += line.snapshotNumberOfPacks;
      if (line.countedNumberOfPacks !== null) {
        existing.countedTotal =
          (existing.countedTotal ?? 0) + line.countedNumberOfPacks;
      }
      existing.lines.push(line);
    } else {
      map.set(line.itemId, {
        itemId: line.itemId,
        itemName: line.itemName,
        snapshotTotal: line.snapshotNumberOfPacks,
        countedTotal:
          line.countedNumberOfPacks !== null ? line.countedNumberOfPacks : null,
        lines: [line],
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Distribute a total count across multiple batch lines proportionally.
 * Returns `{lineId → countedNumberOfPacks}` assignments.
 */
export function distributeCount(
  lines: StocktakeLine[],
  total: number,
): Array<{id: string; countedNumberOfPacks: number}> {
  if (lines.length === 1) {
    return [{id: lines[0].id, countedNumberOfPacks: total}];
  }
  const snapshotSum = lines.reduce(
    (sum, l) => sum + l.snapshotNumberOfPacks,
    0,
  );
  if (snapshotSum === 0) {
    // No snapshot data — put everything on the first line
    return lines.map((l, i) => ({
      id: l.id,
      countedNumberOfPacks: i === 0 ? total : 0,
    }));
  }
  // Proportional distribution; the last line absorbs rounding remainder
  let remaining = total;
  return lines.map((l, i) => {
    if (i === lines.length - 1) {
      return {id: l.id, countedNumberOfPacks: remaining};
    }
    const share = Math.round((l.snapshotNumberOfPacks / snapshotSum) * total);
    remaining -= share;
    return {id: l.id, countedNumberOfPacks: share};
  });
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function findInProgressStocktake(
  storeId: string,
): Promise<StocktakeRow | null> {
  const {data} = await apolloClient.query<{
    stocktakes: {nodes: StocktakeRow[]};
  }>({
    query: LIST_IN_PROGRESS_STOCKTAKES,
    variables: {storeId},
    fetchPolicy: 'network-only',
  });
  return data.stocktakes?.nodes?.[0] ?? null;
}

export async function createStocktake(
  storeId: string,
  id: string,
): Promise<StocktakeRow> {
  const {data} = await apolloClient.mutate<{
    insertStocktake: StocktakeRow;
  }>({
    mutation: INSERT_STOCKTAKE,
    variables: {storeId, input: {id, isAllItemsStocktake: true}},
  });
  const result = data?.insertStocktake;
  if (!result) {
    throw new Error('Failed to create stocktake');
  }
  return result;
}

export async function loadStocktakeLines(
  storeId: string,
  stocktakeId: string,
): Promise<{id: string; status: StocktakeStatus; lines: StocktakeLine[]}> {
  const {data} = await apolloClient.query<{
    stocktake: {
      id: string;
      status: StocktakeStatus;
      lines: {nodes: StocktakeLine[]};
    };
  }>({
    query: GET_STOCKTAKE_LINES,
    variables: {storeId, stocktakeId},
    fetchPolicy: 'network-only',
  });
  const st = data.stocktake;
  return {
    id: st.id,
    status: st.status,
    lines: st.lines?.nodes ?? [],
  };
}

export async function saveItemCount(
  storeId: string,
  lines: StocktakeLine[],
  total: number,
): Promise<void> {
  const updates = distributeCount(lines, total);
  await apolloClient.mutate({
    mutation: BATCH_UPDATE_STOCKTAKE_LINES,
    variables: {
      storeId,
      updateStocktakeLines: updates.map(u => ({
        id: u.id,
        countedNumberOfPacks: u.countedNumberOfPacks,
      })),
    },
  });
}

export async function finaliseStocktake(
  storeId: string,
  stocktakeId: string,
): Promise<void> {
  const {data} = await apolloClient.mutate<{
    updateStocktake:
      | {__typename: 'StocktakeNode'; id: string}
      | {__typename: 'UpdateStocktakeError'; error: {description: string}};
  }>({
    mutation: FINALISE_STOCKTAKE,
    variables: {storeId, input: {id: stocktakeId, status: 'FINALISED'}},
  });
  const result = data?.updateStocktake;
  if (result?.__typename !== 'StocktakeNode') {
    throw new Error(
      (result as {error: {description: string}})?.error?.description ??
        'Failed to finalise stocktake',
    );
  }
}
