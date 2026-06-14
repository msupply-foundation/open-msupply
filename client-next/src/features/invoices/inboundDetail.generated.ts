import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InboundLineRowFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  batch?: string | null;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  packSize: number;
  numberOfPacks: number;
  costPricePerPack: number;
  sellPricePerPack: number;
  note?: string | null;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
  location?: { __typename: 'LocationNode'; id: string; code: string } | null;
};

export type InboundDetailFragment = {
  __typename: 'InvoiceNode';
  id: string;
  invoiceNumber: number;
  type: Types.InvoiceNodeType;
  status: Types.InvoiceNodeStatus;
  onHold: boolean;
  theirReference?: string | null;
  comment?: string | null;
  colour?: string | null;
  otherPartyName: string;
  createdDatetime: string;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  verifiedDatetime?: string | null;
  user?: { __typename: 'UserNode'; username: string } | null;
  pricing: { __typename: 'PricingNode'; totalAfterTax: number };
  lines: {
    __typename: 'InvoiceLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceLineNode';
      id: string;
      itemId: string;
      itemName: string;
      itemCode: string;
      batch?: string | null;
      expiryDate?: string | null;
      manufactureDate?: string | null;
      packSize: number;
      numberOfPacks: number;
      costPricePerPack: number;
      sellPricePerPack: number;
      note?: string | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
      location?: {
        __typename: 'LocationNode';
        id: string;
        code: string;
      } | null;
    }>;
  };
};

export type InboundShipmentQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  invoiceId: Types.Scalars['String']['input'];
}>;

export type InboundShipmentQuery = {
  __typename: 'Queries';
  invoice:
    | {
        __typename: 'InvoiceNode';
        id: string;
        invoiceNumber: number;
        type: Types.InvoiceNodeType;
        status: Types.InvoiceNodeStatus;
        onHold: boolean;
        theirReference?: string | null;
        comment?: string | null;
        colour?: string | null;
        otherPartyName: string;
        createdDatetime: string;
        deliveredDatetime?: string | null;
        receivedDatetime?: string | null;
        verifiedDatetime?: string | null;
        user?: { __typename: 'UserNode'; username: string } | null;
        pricing: { __typename: 'PricingNode'; totalAfterTax: number };
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemId: string;
            itemName: string;
            itemCode: string;
            batch?: string | null;
            expiryDate?: string | null;
            manufactureDate?: string | null;
            packSize: number;
            numberOfPacks: number;
            costPricePerPack: number;
            sellPricePerPack: number;
            note?: string | null;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
            };
            location?: {
              __typename: 'LocationNode';
              id: string;
              code: string;
            } | null;
          }>;
        };
      }
    | { __typename: 'NodeError' };
};

export type InsertInboundMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertInboundShipmentInput;
}>;

export type InsertInboundMutation = {
  __typename: 'Mutations';
  insertInboundShipment:
    | {
        __typename: 'InsertInboundShipmentError';
        error:
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | { __typename: 'InvoiceNode'; id: string };
};

export type UpdateInboundMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateInboundShipmentInput;
}>;

export type UpdateInboundMutation = {
  __typename: 'Mutations';
  updateInboundShipment:
    | { __typename: 'InvoiceNode'; id: string; status: Types.InvoiceNodeStatus }
    | {
        __typename: 'UpdateInboundShipmentError';
        error:
          | {
              __typename: 'CannotChangeStatusOfInvoiceOnHold';
              description: string;
            }
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'CannotIssueInForeignCurrency'; description: string }
          | { __typename: 'CannotReceiveWithPendingLines'; description: string }
          | { __typename: 'CannotReverseInvoiceStatus'; description: string }
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type UpdateInboundLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateInboundShipmentLineInput;
}>;

export type UpdateInboundLineMutation = {
  __typename: 'Mutations';
  updateInboundShipmentLine:
    | { __typename: 'InvoiceLineNode'; id: string }
    | {
        __typename: 'UpdateInboundShipmentLineError';
        error:
          | { __typename: 'BatchIsReserved'; description: string }
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'NotAnInboundShipment'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type InsertInboundLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertInboundShipmentLineInput;
}>;

export type InsertInboundLineMutation = {
  __typename: 'Mutations';
  insertInboundShipmentLine:
    | {
        __typename: 'InsertInboundShipmentLineError';
        error:
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'ForeignKeyError'; description: string };
      }
    | { __typename: 'InvoiceLineNode'; id: string };
};

export type DeleteInboundLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteInboundShipmentLineInput;
}>;

export type DeleteInboundLineMutation = {
  __typename: 'Mutations';
  deleteInboundShipmentLine:
    | {
        __typename: 'DeleteInboundShipmentLineError';
        error:
          | { __typename: 'BatchIsReserved'; description: string }
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | {
              __typename: 'LineLinkedToTransferredInvoice';
              description: string;
            }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'DeleteResponse'; id: string };
};

export const InboundLineRowFragmentDoc = gql`
  fragment InboundLineRow on InvoiceLineNode {
    __typename
    id
    itemId
    itemName
    itemCode
    batch
    expiryDate
    manufactureDate
    packSize
    numberOfPacks
    costPricePerPack
    sellPricePerPack
    note
    item {
      __typename
      id
      code
      name
      unitName
    }
    location {
      __typename
      id
      code
    }
  }
`;
export const InboundDetailFragmentDoc = gql`
  fragment InboundDetail on InvoiceNode {
    __typename
    id
    invoiceNumber
    type
    status
    onHold
    theirReference
    comment
    colour
    otherPartyName
    createdDatetime
    deliveredDatetime
    receivedDatetime
    verifiedDatetime
    user {
      __typename
      username
    }
    pricing {
      __typename
      totalAfterTax
    }
    lines {
      __typename
      totalCount
      nodes {
        ...InboundLineRow
      }
    }
  }
  ${InboundLineRowFragmentDoc}
`;
export const InboundShipmentDocument = gql`
  query inboundShipment($storeId: String!, $invoiceId: String!) {
    invoice(storeId: $storeId, id: $invoiceId) {
      ... on InvoiceNode {
        ...InboundDetail
      }
    }
  }
  ${InboundDetailFragmentDoc}
`;
export const InsertInboundDocument = gql`
  mutation insertInbound(
    $storeId: String!
    $input: InsertInboundShipmentInput!
  ) {
    insertInboundShipment(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceNode {
        id
      }
      ... on InsertInboundShipmentError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateInboundDocument = gql`
  mutation updateInbound(
    $storeId: String!
    $input: UpdateInboundShipmentInput!
  ) {
    updateInboundShipment(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceNode {
        id
        status
      }
      ... on UpdateInboundShipmentError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateInboundLineDocument = gql`
  mutation updateInboundLine(
    $storeId: String!
    $input: UpdateInboundShipmentLineInput!
  ) {
    updateInboundShipmentLine(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceLineNode {
        id
      }
      ... on UpdateInboundShipmentLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const InsertInboundLineDocument = gql`
  mutation insertInboundLine(
    $storeId: String!
    $input: InsertInboundShipmentLineInput!
  ) {
    insertInboundShipmentLine(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceLineNode {
        id
      }
      ... on InsertInboundShipmentLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const DeleteInboundLineDocument = gql`
  mutation deleteInboundLine(
    $storeId: String!
    $input: DeleteInboundShipmentLineInput!
  ) {
    deleteInboundShipmentLine(storeId: $storeId, input: $input) {
      __typename
      ... on DeleteResponse {
        id
      }
      ... on DeleteInboundShipmentLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    inboundShipment(
      variables: InboundShipmentQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InboundShipmentQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InboundShipmentQuery>({
            document: InboundShipmentDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'inboundShipment',
        'query',
        variables,
      );
    },
    insertInbound(
      variables: InsertInboundMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertInboundMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertInboundMutation>({
            document: InsertInboundDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertInbound',
        'mutation',
        variables,
      );
    },
    updateInbound(
      variables: UpdateInboundMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateInboundMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateInboundMutation>({
            document: UpdateInboundDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateInbound',
        'mutation',
        variables,
      );
    },
    updateInboundLine(
      variables: UpdateInboundLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateInboundLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateInboundLineMutation>({
            document: UpdateInboundLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateInboundLine',
        'mutation',
        variables,
      );
    },
    insertInboundLine(
      variables: InsertInboundLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertInboundLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertInboundLineMutation>({
            document: InsertInboundLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertInboundLine',
        'mutation',
        variables,
      );
    },
    deleteInboundLine(
      variables: DeleteInboundLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteInboundLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteInboundLineMutation>({
            document: DeleteInboundLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteInboundLine',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
