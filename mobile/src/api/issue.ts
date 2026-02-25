import {gql} from '@apollo/client';
import {apolloClient} from './apolloClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarcodeResult {
  itemId: string;
  gtin: string;
  packSize: number;
}

export interface ItemSearchResult {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
}

export interface OutboundShipment {
  id: string;
  invoiceNumber: number;
}

// ─── Queries / Mutations ──────────────────────────────────────────────────────

const BARCODE_BY_GTIN = gql`
  query barcodeByGtin($storeId: String!, $gtin: String!) {
    barcodeByGtin(storeId: $storeId, gtin: $gtin) {
      ... on BarcodeNode {
        __typename
        itemId
        gtin
        packSize
      }
      ... on NodeError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

const SEARCH_ITEMS = gql`
  query searchItems($storeId: String!, $search: String!) {
    items(
      storeId: $storeId
      filter: {codeOrName: {like: $search}, isVisible: true}
      sort: {key: Name}
      page: {first: 30}
    ) {
      ... on ItemConnector {
        nodes {
          id
          code
          name
          unitName
        }
      }
    }
  }
`;

const INSERT_OUTBOUND_SHIPMENT = gql`
  mutation insertOutboundShipment(
    $id: String!
    $otherPartyId: String!
    $storeId: String!
  ) {
    insertOutboundShipment(
      storeId: $storeId
      input: {id: $id, otherPartyId: $otherPartyId}
    ) {
      ... on InvoiceNode {
        id
        invoiceNumber
      }
      ... on InsertOutboundShipmentError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

const INSERT_OUTBOUND_LINE = gql`
  mutation insertOutboundShipmentUnallocatedLine(
    $storeId: String!
    $id: String!
    $invoiceId: String!
    $itemId: String!
    $quantity: Int!
  ) {
    insertOutboundShipmentUnallocatedLine(
      storeId: $storeId
      input: {id: $id, invoiceId: $invoiceId, itemId: $itemId, quantity: $quantity}
    ) {
      ... on InvoiceLineNode {
        id
        itemId
        numberOfPacks
      }
      ... on InsertOutboundShipmentUnallocatedLineError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

const UPDATE_OUTBOUND_LINE = gql`
  mutation updateOutboundShipmentUnallocatedLine(
    $storeId: String!
    $id: String!
    $quantity: Int!
  ) {
    updateOutboundShipmentUnallocatedLine(
      storeId: $storeId
      input: {id: $id, quantity: $quantity}
    ) {
      ... on InvoiceLineNode {
        id
        numberOfPacks
      }
      ... on UpdateOutboundShipmentUnallocatedLineError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

const GET_ITEM_BY_ID = gql`
  query getItemById($storeId: String!, $itemId: String!) {
    items(storeId: $storeId, filter: {id: {equalTo: $itemId}}, sort: {key: Name}) {
      ... on ItemConnector {
        nodes {
          id
          code
          name
          unitName
        }
      }
    }
  }
`;

const LOOKUP_NAME_BY_CODE = gql`
  query lookupNameByCode($storeId: String!, $code: String!) {
    names(
      storeId: $storeId
      filter: {code: {equalTo: $code}, isCustomer: true}
      sort: {key: Name}
    ) {
      ... on NameConnector {
        nodes {
          id
          code
          name
        }
      }
    }
  }
`;

// ─── API functions ────────────────────────────────────────────────────────────

export async function lookupBarcode(
  storeId: string,
  gtin: string,
): Promise<BarcodeResult | null> {
  const {data} = await apolloClient.query<{
    barcodeByGtin: {__typename: string} & Partial<BarcodeResult>;
  }>({
    query: BARCODE_BY_GTIN,
    variables: {storeId, gtin},
    fetchPolicy: 'network-only',
  });
  if (data.barcodeByGtin.__typename === 'BarcodeNode') {
    return data.barcodeByGtin as BarcodeResult;
  }
  return null;
}

export async function searchItems(
  storeId: string,
  search: string,
): Promise<ItemSearchResult[]> {
  const {data} = await apolloClient.query<{
    items: {nodes: ItemSearchResult[]};
  }>({
    query: SEARCH_ITEMS,
    variables: {storeId, search: `%${search}%`},
    fetchPolicy: 'network-only',
  });
  return data.items?.nodes ?? [];
}

export async function createOutboundShipment(
  storeId: string,
  id: string,
  otherPartyId: string,
): Promise<OutboundShipment> {
  const {data} = await apolloClient.mutate<{
    insertOutboundShipment: {__typename: string} & Partial<OutboundShipment> & {
        error?: {description: string};
      };
  }>({
    mutation: INSERT_OUTBOUND_SHIPMENT,
    variables: {storeId, id, otherPartyId},
  });
  const result = data?.insertOutboundShipment;
  if (result?.__typename !== 'InvoiceNode') {
    throw new Error(
      result?.error?.description ?? 'Failed to create outbound shipment',
    );
  }
  return result as OutboundShipment;
}

export async function insertOutboundLine(
  storeId: string,
  lineId: string,
  invoiceId: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  const {data} = await apolloClient.mutate<{
    insertOutboundShipmentUnallocatedLine: {__typename: string; error?: {description: string}};
  }>({
    mutation: INSERT_OUTBOUND_LINE,
    variables: {storeId, id: lineId, invoiceId, itemId, quantity},
  });
  const result = data?.insertOutboundShipmentUnallocatedLine;
  if (result?.__typename !== 'InvoiceLineNode') {
    throw new Error(result?.error?.description ?? 'Failed to add item');
  }
}

export async function updateOutboundLine(
  storeId: string,
  lineId: string,
  quantity: number,
): Promise<void> {
  const {data} = await apolloClient.mutate<{
    updateOutboundShipmentUnallocatedLine: {__typename: string; error?: {description: string}};
  }>({
    mutation: UPDATE_OUTBOUND_LINE,
    variables: {storeId, id: lineId, quantity},
  });
  const result = data?.updateOutboundShipmentUnallocatedLine;
  if (result?.__typename !== 'InvoiceLineNode') {
    throw new Error(result?.error?.description ?? 'Failed to update quantity');
  }
}

export async function getItemById(
  storeId: string,
  itemId: string,
): Promise<ItemSearchResult | null> {
  const {data} = await apolloClient.query<{
    items: {nodes: ItemSearchResult[]};
  }>({
    query: GET_ITEM_BY_ID,
    variables: {storeId, itemId},
    fetchPolicy: 'cache-first',
  });
  return data.items?.nodes?.[0] ?? null;
}

export async function lookupNameByCode(
  storeId: string,
  code: string,
): Promise<{id: string; name: string} | null> {
  const {data} = await apolloClient.query<{
    names: {nodes: Array<{id: string; code: string; name: string}>};
  }>({
    query: LOOKUP_NAME_BY_CODE,
    variables: {storeId, code},
    fetchPolicy: 'network-only',
  });
  return data.names?.nodes?.[0] ?? null;
}
