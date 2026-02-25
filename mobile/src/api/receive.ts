import {gql} from '@apollo/client';
import {apolloClient} from './apolloClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InboundStatus = 'SHIPPED' | 'DELIVERED' | 'RECEIVED' | 'VERIFIED';

export interface InboundShipmentRow {
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
  status: InboundStatus;
  createdDatetime: string;
  theirReference: string | null;
}

export interface InboundShipmentLine {
  id: string;
  itemName: string;
  numberOfPacks: number;
  shippedNumberOfPacks: number;
  packSize: number;
}

export interface InboundShipmentDetail extends InboundShipmentRow {
  lines: {
    nodes: InboundShipmentLine[];
  };
}

// Status values as accepted by the GraphQL enum
export type UpdateInboundStatus = 'DELIVERED' | 'RECEIVED' | 'VERIFIED';

// ─── Queries / Mutations ──────────────────────────────────────────────────────

const LIST_INBOUND_SHIPMENTS = gql`
  query inboundShipments($storeId: String!) {
    invoices(
      storeId: $storeId
      filter: {
        type: {equalTo: INBOUND_SHIPMENT}
        status: {equalTo: SHIPPED}
      }
      sort: {key: CreatedDatetime, desc: true}
    ) {
      ... on InvoiceConnector {
        nodes {
          id
          invoiceNumber
          otherPartyName
          status
          createdDatetime
          theirReference
        }
      }
    }
  }
`;

const GET_INBOUND_SHIPMENT = gql`
  query inboundShipment($storeId: String!, $id: String!) {
    invoice(storeId: $storeId, id: $id) {
      ... on InvoiceNode {
        id
        invoiceNumber
        otherPartyName
        status
        createdDatetime
        theirReference
        lines {
          nodes {
            id
            itemName
            numberOfPacks
            shippedNumberOfPacks
            packSize
          }
        }
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

const UPDATE_INBOUND_SHIPMENT = gql`
  mutation updateInboundShipment(
    $storeId: String!
    $input: UpdateInboundShipmentInput!
  ) {
    updateInboundShipment(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        id
        status
      }
      ... on UpdateInboundShipmentError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

const UPDATE_INBOUND_LINE = gql`
  mutation updateInboundShipmentLine(
    $storeId: String!
    $input: UpdateInboundShipmentLineInput!
  ) {
    updateInboundShipmentLine(storeId: $storeId, input: $input) {
      ... on InvoiceLineNode {
        id
        numberOfPacks
      }
      ... on UpdateInboundShipmentLineError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

// ─── API functions ────────────────────────────────────────────────────────────

export async function listInboundShipments(
  storeId: string,
): Promise<InboundShipmentRow[]> {
  const {data} = await apolloClient.query<{
    invoices: {nodes: InboundShipmentRow[]};
  }>({
    query: LIST_INBOUND_SHIPMENTS,
    variables: {storeId},
    fetchPolicy: 'network-only',
  });
  return data.invoices?.nodes ?? [];
}

export async function getInboundShipment(
  storeId: string,
  id: string,
): Promise<InboundShipmentDetail | null> {
  const {data} = await apolloClient.query<{
    invoice: {__typename: string} & Partial<InboundShipmentDetail>;
  }>({
    query: GET_INBOUND_SHIPMENT,
    variables: {storeId, id},
    fetchPolicy: 'network-only',
  });
  if (data.invoice.__typename === 'InvoiceNode') {
    return data.invoice as InboundShipmentDetail;
  }
  return null;
}

export async function updateInboundShipmentStatus(
  storeId: string,
  id: string,
  status: UpdateInboundStatus,
): Promise<InboundStatus> {
  const {data} = await apolloClient.mutate<{
    updateInboundShipment:
      | {__typename: 'InvoiceNode'; id: string; status: InboundStatus}
      | {__typename: 'UpdateInboundShipmentError'; error: {description: string}};
  }>({
    mutation: UPDATE_INBOUND_SHIPMENT,
    variables: {storeId, input: {id, status}},
  });
  const result = data?.updateInboundShipment;
  if (result?.__typename !== 'InvoiceNode') {
    throw new Error(
      (result as {error: {description: string}})?.error?.description ??
        'Failed to update shipment',
    );
  }
  return (result as {status: InboundStatus}).status;
}

export async function updateInboundLineQty(
  storeId: string,
  lineId: string,
  numberOfPacks: number,
): Promise<void> {
  const {data} = await apolloClient.mutate<{
    updateInboundShipmentLine: {__typename: string; error?: {description: string}};
  }>({
    mutation: UPDATE_INBOUND_LINE,
    variables: {storeId, input: {id: lineId, numberOfPacks}},
  });
  const result = data?.updateInboundShipmentLine;
  if (result?.__typename !== 'InvoiceLineNode') {
    throw new Error(result?.error?.description ?? 'Failed to update quantity');
  }
}
