import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ResponseLineRowFragment = {
  __typename: 'RequisitionLineNode';
  id: string;
  itemId: string;
  itemName: string;
  requestedQuantity: number;
  supplyQuantity: number;
  suggestedQuantity: number;
  alreadyIssued: number;
  remainingQuantityToSupply: number;
  availableStockOnHand: number;
  comment?: string | null;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
  itemStats: { __typename: 'ItemStatsNode'; stockOnHand: number };
};

export type ResponseDetailFragment = {
  __typename: 'RequisitionNode';
  id: string;
  requisitionNumber: number;
  type: Types.RequisitionNodeType;
  status: Types.RequisitionNodeStatus;
  theirReference?: string | null;
  comment?: string | null;
  colour?: string | null;
  otherPartyName: string;
  createdDatetime: string;
  sentDatetime?: string | null;
  finalisedDatetime?: string | null;
  user?: { __typename: 'UserNode'; username: string } | null;
  lines: {
    __typename: 'RequisitionLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'RequisitionLineNode';
      id: string;
      itemId: string;
      itemName: string;
      requestedQuantity: number;
      supplyQuantity: number;
      suggestedQuantity: number;
      alreadyIssued: number;
      remainingQuantityToSupply: number;
      availableStockOnHand: number;
      comment?: string | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
      itemStats: { __typename: 'ItemStatsNode'; stockOnHand: number };
    }>;
  };
};

export type ResponseRequisitionQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionId: Types.Scalars['String']['input'];
}>;

export type ResponseRequisitionQuery = {
  __typename: 'Queries';
  requisition:
    | { __typename: 'RecordNotFound' }
    | {
        __typename: 'RequisitionNode';
        id: string;
        requisitionNumber: number;
        type: Types.RequisitionNodeType;
        status: Types.RequisitionNodeStatus;
        theirReference?: string | null;
        comment?: string | null;
        colour?: string | null;
        otherPartyName: string;
        createdDatetime: string;
        sentDatetime?: string | null;
        finalisedDatetime?: string | null;
        user?: { __typename: 'UserNode'; username: string } | null;
        lines: {
          __typename: 'RequisitionLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'RequisitionLineNode';
            id: string;
            itemId: string;
            itemName: string;
            requestedQuantity: number;
            supplyQuantity: number;
            suggestedQuantity: number;
            alreadyIssued: number;
            remainingQuantityToSupply: number;
            availableStockOnHand: number;
            comment?: string | null;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
            };
            itemStats: { __typename: 'ItemStatsNode'; stockOnHand: number };
          }>;
        };
      };
};

export type InsertResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertResponseRequisitionInput;
}>;

export type InsertResponseMutation = {
  __typename: 'Mutations';
  insertResponseRequisition:
    | {
        __typename: 'InsertResponseRequisitionError';
        error:
          | { __typename: 'OtherPartyNotACustomer'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | { __typename: 'RequisitionNode'; id: string };
};

export type UpdateResponseMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionInput;
}>;

export type UpdateResponseMutation = {
  __typename: 'Mutations';
  updateResponseRequisition:
    | {
        __typename: 'RequisitionNode';
        id: string;
        status: Types.RequisitionNodeStatus;
      }
    | {
        __typename: 'UpdateResponseRequisitionError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'OrderingTooManyItems'; description: string }
          | { __typename: 'RecordNotFound'; description: string }
          | {
              __typename: 'RequisitionReasonsNotProvided';
              description: string;
            };
      };
};

export type UpdateResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateResponseRequisitionLineInput;
}>;

export type UpdateResponseLineMutation = {
  __typename: 'Mutations';
  updateResponseRequisitionLine:
    | { __typename: 'RequisitionLineNode'; id: string }
    | {
        __typename: 'UpdateResponseRequisitionLineError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'RecordNotFound'; description: string }
          | { __typename: 'RequisitionReasonNotProvided'; description: string };
      };
};

export type InsertResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertResponseRequisitionLineInput;
}>;

export type InsertResponseLineMutation = {
  __typename: 'Mutations';
  insertResponseRequisitionLine:
    | {
        __typename: 'InsertResponseRequisitionLineError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | {
              __typename: 'RequisitionLineWithItemIdExists';
              description: string;
            };
      }
    | { __typename: 'RequisitionLineNode'; id: string };
};

export type DeleteResponseLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteResponseRequisitionLineInput;
}>;

export type DeleteResponseLineMutation = {
  __typename: 'Mutations';
  deleteResponseRequisitionLine:
    | { __typename: 'DeleteResponse'; id: string }
    | {
        __typename: 'DeleteResponseRequisitionLineError';
        error:
          | {
              __typename: 'CannotDeleteLineLinkedToShipment';
              description: string;
            }
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type SupplyRequestedMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.SupplyRequestedQuantityInput;
}>;

export type SupplyRequestedMutation = {
  __typename: 'Mutations';
  supplyRequestedQuantity:
    | { __typename: 'RequisitionLineConnector'; totalCount: number }
    | {
        __typename: 'SupplyRequestedQuantityError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export const ResponseLineRowFragmentDoc = gql`
  fragment ResponseLineRow on RequisitionLineNode {
    __typename
    id
    itemId
    itemName
    requestedQuantity
    supplyQuantity
    suggestedQuantity
    alreadyIssued
    remainingQuantityToSupply
    availableStockOnHand
    comment
    item {
      __typename
      id
      code
      name
      unitName
    }
    itemStats {
      __typename
      stockOnHand
    }
  }
`;
export const ResponseDetailFragmentDoc = gql`
  fragment ResponseDetail on RequisitionNode {
    __typename
    id
    requisitionNumber
    type
    status
    theirReference
    comment
    colour
    otherPartyName
    createdDatetime
    sentDatetime
    finalisedDatetime
    user {
      __typename
      username
    }
    lines {
      __typename
      totalCount
      nodes {
        ...ResponseLineRow
      }
    }
  }
  ${ResponseLineRowFragmentDoc}
`;
export const ResponseRequisitionDocument = gql`
  query responseRequisition($storeId: String!, $requisitionId: String!) {
    requisition(storeId: $storeId, id: $requisitionId) {
      ... on RequisitionNode {
        ...ResponseDetail
      }
    }
  }
  ${ResponseDetailFragmentDoc}
`;
export const InsertResponseDocument = gql`
  mutation insertResponse(
    $storeId: String!
    $input: InsertResponseRequisitionInput!
  ) {
    insertResponseRequisition(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionNode {
        id
      }
      ... on InsertResponseRequisitionError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateResponseDocument = gql`
  mutation updateResponse(
    $storeId: String!
    $input: UpdateResponseRequisitionInput!
  ) {
    updateResponseRequisition(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionNode {
        id
        status
      }
      ... on UpdateResponseRequisitionError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateResponseLineDocument = gql`
  mutation updateResponseLine(
    $storeId: String!
    $input: UpdateResponseRequisitionLineInput!
  ) {
    updateResponseRequisitionLine(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionLineNode {
        id
      }
      ... on UpdateResponseRequisitionLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const InsertResponseLineDocument = gql`
  mutation insertResponseLine(
    $storeId: String!
    $input: InsertResponseRequisitionLineInput!
  ) {
    insertResponseRequisitionLine(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionLineNode {
        id
      }
      ... on InsertResponseRequisitionLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const DeleteResponseLineDocument = gql`
  mutation deleteResponseLine(
    $storeId: String!
    $input: DeleteResponseRequisitionLineInput!
  ) {
    deleteResponseRequisitionLine(storeId: $storeId, input: $input) {
      __typename
      ... on DeleteResponse {
        id
      }
      ... on DeleteResponseRequisitionLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const SupplyRequestedDocument = gql`
  mutation supplyRequested(
    $storeId: String!
    $input: SupplyRequestedQuantityInput!
  ) {
    supplyRequestedQuantity(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionLineConnector {
        totalCount
      }
      ... on SupplyRequestedQuantityError {
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
    responseRequisition(
      variables: ResponseRequisitionQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ResponseRequisitionQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ResponseRequisitionQuery>({
            document: ResponseRequisitionDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'responseRequisition',
        'query',
        variables,
      );
    },
    insertResponse(
      variables: InsertResponseMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertResponseMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertResponseMutation>({
            document: InsertResponseDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertResponse',
        'mutation',
        variables,
      );
    },
    updateResponse(
      variables: UpdateResponseMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateResponseMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateResponseMutation>({
            document: UpdateResponseDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateResponse',
        'mutation',
        variables,
      );
    },
    updateResponseLine(
      variables: UpdateResponseLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateResponseLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateResponseLineMutation>({
            document: UpdateResponseLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateResponseLine',
        'mutation',
        variables,
      );
    },
    insertResponseLine(
      variables: InsertResponseLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertResponseLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertResponseLineMutation>({
            document: InsertResponseLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertResponseLine',
        'mutation',
        variables,
      );
    },
    deleteResponseLine(
      variables: DeleteResponseLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteResponseLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteResponseLineMutation>({
            document: DeleteResponseLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteResponseLine',
        'mutation',
        variables,
      );
    },
    supplyRequested(
      variables: SupplyRequestedMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SupplyRequestedMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplyRequestedMutation>({
            document: SupplyRequestedDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplyRequested',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
