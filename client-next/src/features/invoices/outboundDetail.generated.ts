import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type OutboundLineRowFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  batch?: string | null;
  expiryDate?: string | null;
  packSize: number;
  numberOfPacks: number;
  sellPricePerPack: number;
  note?: string | null;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
};

export type OutboundDetailFragment = {
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
  allocatedDatetime?: string | null;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  deliveredDatetime?: string | null;
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
      packSize: number;
      numberOfPacks: number;
      sellPricePerPack: number;
      note?: string | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
    }>;
  };
};

export type OutboundShipmentQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  invoiceId: Types.Scalars['String']['input'];
}>;

export type OutboundShipmentQuery = {
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
        allocatedDatetime?: string | null;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        deliveredDatetime?: string | null;
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
            packSize: number;
            numberOfPacks: number;
            sellPricePerPack: number;
            note?: string | null;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
            };
          }>;
        };
      }
    | { __typename: 'NodeError' };
};

export type InsertOutboundMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertOutboundShipmentInput;
}>;

export type InsertOutboundMutation = {
  __typename: 'Mutations';
  insertOutboundShipment:
    | {
        __typename: 'InsertOutboundShipmentError';
        error:
          | { __typename: 'OtherPartyNotACustomer'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | { __typename: 'InvoiceNode'; id: string }
    | {
        __typename: 'NodeError';
        error:
          | { __typename: 'DatabaseError'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type UpdateOutboundMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateOutboundShipmentInput;
}>;

export type UpdateOutboundMutation = {
  __typename: 'Mutations';
  updateOutboundShipment:
    | { __typename: 'InvoiceNode'; id: string; status: Types.InvoiceNodeStatus }
    | {
        __typename: 'NodeError';
        error:
          | { __typename: 'DatabaseError'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | {
        __typename: 'UpdateOutboundShipmentError';
        error:
          | {
              __typename: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines';
              description: string;
            }
          | {
              __typename: 'CannotChangeStatusOfInvoiceOnHold';
              description: string;
            }
          | {
              __typename: 'CannotHaveEstimatedDeliveryDateBeforeShippedDate';
              description: string;
            }
          | { __typename: 'CannotIssueInForeignCurrency'; description: string }
          | { __typename: 'CannotReverseInvoiceStatus'; description: string }
          | { __typename: 'InvoiceIsNotEditable'; description: string }
          | { __typename: 'NotAnOutboundShipmentError'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type InsertOutboundLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertOutboundShipmentLineInput;
}>;

export type InsertOutboundLineMutation = {
  __typename: 'Mutations';
  insertOutboundShipmentLine:
    | {
        __typename: 'InsertOutboundShipmentLineError';
        error:
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'LocationIsOnHold'; description: string }
          | { __typename: 'LocationNotFound'; description: string }
          | { __typename: 'NotEnoughStockForReduction'; description: string }
          | {
              __typename: 'StockLineAlreadyExistsInInvoice';
              description: string;
            }
          | { __typename: 'StockLineIsOnHold'; description: string };
      }
    | { __typename: 'InvoiceLineNode'; id: string };
};

export type UpdateOutboundLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateOutboundShipmentLineInput;
}>;

export type UpdateOutboundLineMutation = {
  __typename: 'Mutations';
  updateOutboundShipmentLine:
    | { __typename: 'InvoiceLineNode'; id: string }
    | {
        __typename: 'UpdateOutboundShipmentLineError';
        error:
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'LocationIsOnHold'; description: string }
          | { __typename: 'LocationNotFound'; description: string }
          | { __typename: 'NotEnoughStockForReduction'; description: string }
          | { __typename: 'RecordNotFound'; description: string }
          | {
              __typename: 'StockLineAlreadyExistsInInvoice';
              description: string;
            }
          | { __typename: 'StockLineIsOnHold'; description: string };
      };
};

export type DeleteOutboundLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteOutboundShipmentLineInput;
}>;

export type DeleteOutboundLineMutation = {
  __typename: 'Mutations';
  deleteOutboundShipmentLine:
    | {
        __typename: 'DeleteOutboundShipmentLineError';
        error:
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'DeleteResponse'; id: string };
};

export const OutboundLineRowFragmentDoc = gql`
  fragment OutboundLineRow on InvoiceLineNode {
    __typename
    id
    itemId
    itemName
    itemCode
    batch
    expiryDate
    packSize
    numberOfPacks
    sellPricePerPack
    note
    item {
      __typename
      id
      code
      name
      unitName
    }
  }
`;
export const OutboundDetailFragmentDoc = gql`
  fragment OutboundDetail on InvoiceNode {
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
    allocatedDatetime
    pickedDatetime
    shippedDatetime
    deliveredDatetime
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
        ...OutboundLineRow
      }
    }
  }
  ${OutboundLineRowFragmentDoc}
`;
export const OutboundShipmentDocument = gql`
  query outboundShipment($storeId: String!, $invoiceId: String!) {
    invoice(storeId: $storeId, id: $invoiceId) {
      ... on InvoiceNode {
        ...OutboundDetail
      }
    }
  }
  ${OutboundDetailFragmentDoc}
`;
export const InsertOutboundDocument = gql`
  mutation insertOutbound(
    $storeId: String!
    $input: InsertOutboundShipmentInput!
  ) {
    insertOutboundShipment(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceNode {
        id
      }
      ... on InsertOutboundShipmentError {
        error {
          __typename
          description
        }
      }
      ... on NodeError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateOutboundDocument = gql`
  mutation updateOutbound(
    $storeId: String!
    $input: UpdateOutboundShipmentInput!
  ) {
    updateOutboundShipment(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceNode {
        id
        status
      }
      ... on UpdateOutboundShipmentError {
        error {
          __typename
          description
        }
      }
      ... on NodeError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const InsertOutboundLineDocument = gql`
  mutation insertOutboundLine(
    $storeId: String!
    $input: InsertOutboundShipmentLineInput!
  ) {
    insertOutboundShipmentLine(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceLineNode {
        id
      }
      ... on InsertOutboundShipmentLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateOutboundLineDocument = gql`
  mutation updateOutboundLine(
    $storeId: String!
    $input: UpdateOutboundShipmentLineInput!
  ) {
    updateOutboundShipmentLine(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceLineNode {
        id
      }
      ... on UpdateOutboundShipmentLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const DeleteOutboundLineDocument = gql`
  mutation deleteOutboundLine(
    $storeId: String!
    $input: DeleteOutboundShipmentLineInput!
  ) {
    deleteOutboundShipmentLine(storeId: $storeId, input: $input) {
      __typename
      ... on DeleteResponse {
        id
      }
      ... on DeleteOutboundShipmentLineError {
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
    outboundShipment(
      variables: OutboundShipmentQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<OutboundShipmentQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<OutboundShipmentQuery>({
            document: OutboundShipmentDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'outboundShipment',
        'query',
        variables,
      );
    },
    insertOutbound(
      variables: InsertOutboundMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertOutboundMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertOutboundMutation>({
            document: InsertOutboundDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertOutbound',
        'mutation',
        variables,
      );
    },
    updateOutbound(
      variables: UpdateOutboundMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateOutboundMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateOutboundMutation>({
            document: UpdateOutboundDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateOutbound',
        'mutation',
        variables,
      );
    },
    insertOutboundLine(
      variables: InsertOutboundLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertOutboundLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertOutboundLineMutation>({
            document: InsertOutboundLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertOutboundLine',
        'mutation',
        variables,
      );
    },
    updateOutboundLine(
      variables: UpdateOutboundLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateOutboundLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateOutboundLineMutation>({
            document: UpdateOutboundLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateOutboundLine',
        'mutation',
        variables,
      );
    },
    deleteOutboundLine(
      variables: DeleteOutboundLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteOutboundLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteOutboundLineMutation>({
            document: DeleteOutboundLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteOutboundLine',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
