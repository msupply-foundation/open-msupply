import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type RequestLineRowFragment = {
  __typename: 'RequisitionLineNode';
  id: string;
  itemId: string;
  itemName: string;
  comment?: string | null;
  requestedQuantity: number;
  suggestedQuantity: number;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
  itemStats: {
    __typename: 'ItemStatsNode';
    availableStockOnHand: number;
    averageMonthlyConsumption: number;
  };
};

export type RequestDetailFragment = {
  __typename: 'RequisitionNode';
  id: string;
  requisitionNumber: number;
  type: Types.RequisitionNodeType;
  status: Types.RequisitionNodeStatus;
  theirReference?: string | null;
  comment?: string | null;
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
      comment?: string | null;
      requestedQuantity: number;
      suggestedQuantity: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
      itemStats: {
        __typename: 'ItemStatsNode';
        availableStockOnHand: number;
        averageMonthlyConsumption: number;
      };
    }>;
  };
};

export type RequestRequisitionQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  requisitionId: Types.Scalars['String']['input'];
}>;

export type RequestRequisitionQuery = {
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
            comment?: string | null;
            requestedQuantity: number;
            suggestedQuantity: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
            };
            itemStats: {
              __typename: 'ItemStatsNode';
              availableStockOnHand: number;
              averageMonthlyConsumption: number;
            };
          }>;
        };
      };
};

export type UpdateRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateRequestRequisitionInput;
}>;

export type UpdateRequestMutation = {
  __typename: 'Mutations';
  updateRequestRequisition:
    | {
        __typename: 'RequisitionNode';
        id: string;
        status: Types.RequisitionNodeStatus;
      }
    | {
        __typename: 'UpdateRequestRequisitionError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'OrderingTooManyItems'; description: string }
          | { __typename: 'OtherPartyNotACustomer'; description: string }
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string }
          | { __typename: 'RecordNotFound'; description: string }
          | {
              __typename: 'RequisitionReasonsNotProvided';
              description: string;
            };
      };
};

export type UpdateRequestLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateRequestRequisitionLineInput;
}>;

export type UpdateRequestLineMutation = {
  __typename: 'Mutations';
  updateRequestRequisitionLine:
    | { __typename: 'RequisitionLineNode'; id: string }
    | {
        __typename: 'UpdateRequestRequisitionLineError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'RecordNotFound'; description: string }
          | { __typename: 'RequisitionReasonNotProvided'; description: string };
      };
};

export type InsertRequestMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertRequestRequisitionInput;
}>;

export type InsertRequestMutation = {
  __typename: 'Mutations';
  insertRequestRequisition:
    | {
        __typename: 'InsertRequestRequisitionError';
        error:
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | { __typename: 'RequisitionNode'; id: string };
};

export type InsertRequestLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertRequestRequisitionLineInput;
}>;

export type InsertRequestLineMutation = {
  __typename: 'Mutations';
  insertRequestRequisitionLine:
    | {
        __typename: 'InsertRequestRequisitionLineError';
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

export type DeleteRequestLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteRequestRequisitionLineInput;
}>;

export type DeleteRequestLineMutation = {
  __typename: 'Mutations';
  deleteRequestRequisitionLine:
    | {
        __typename: 'DeleteRequestRequisitionLineError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'DeleteResponse'; id: string };
};

export type UseSuggestedMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UseSuggestedQuantityInput;
}>;

export type UseSuggestedMutation = {
  __typename: 'Mutations';
  useSuggestedQuantity:
    | { __typename: 'RequisitionLineConnector'; totalCount: number }
    | {
        __typename: 'UseSuggestedQuantityError';
        error:
          | { __typename: 'CannotEditRequisition'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export const RequestLineRowFragmentDoc = gql`
  fragment RequestLineRow on RequisitionLineNode {
    __typename
    id
    itemId
    itemName
    comment
    requestedQuantity
    suggestedQuantity
    item {
      __typename
      id
      code
      name
      unitName
    }
    itemStats {
      __typename
      availableStockOnHand
      averageMonthlyConsumption
    }
  }
`;
export const RequestDetailFragmentDoc = gql`
  fragment RequestDetail on RequisitionNode {
    __typename
    id
    requisitionNumber
    type
    status
    theirReference
    comment
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
        ...RequestLineRow
      }
    }
  }
  ${RequestLineRowFragmentDoc}
`;
export const RequestRequisitionDocument = gql`
  query requestRequisition($storeId: String!, $requisitionId: String!) {
    requisition(storeId: $storeId, id: $requisitionId) {
      ... on RequisitionNode {
        ...RequestDetail
      }
    }
  }
  ${RequestDetailFragmentDoc}
`;
export const UpdateRequestDocument = gql`
  mutation updateRequest(
    $storeId: String!
    $input: UpdateRequestRequisitionInput!
  ) {
    updateRequestRequisition(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionNode {
        id
        status
      }
      ... on UpdateRequestRequisitionError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateRequestLineDocument = gql`
  mutation updateRequestLine(
    $storeId: String!
    $input: UpdateRequestRequisitionLineInput!
  ) {
    updateRequestRequisitionLine(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionLineNode {
        id
      }
      ... on UpdateRequestRequisitionLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const InsertRequestDocument = gql`
  mutation insertRequest(
    $storeId: String!
    $input: InsertRequestRequisitionInput!
  ) {
    insertRequestRequisition(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionNode {
        id
      }
      ... on InsertRequestRequisitionError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const InsertRequestLineDocument = gql`
  mutation insertRequestLine(
    $storeId: String!
    $input: InsertRequestRequisitionLineInput!
  ) {
    insertRequestRequisitionLine(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionLineNode {
        id
      }
      ... on InsertRequestRequisitionLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const DeleteRequestLineDocument = gql`
  mutation deleteRequestLine(
    $storeId: String!
    $input: DeleteRequestRequisitionLineInput!
  ) {
    deleteRequestRequisitionLine(storeId: $storeId, input: $input) {
      __typename
      ... on DeleteResponse {
        id
      }
      ... on DeleteRequestRequisitionLineError {
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UseSuggestedDocument = gql`
  mutation useSuggested($storeId: String!, $input: UseSuggestedQuantityInput!) {
    useSuggestedQuantity(storeId: $storeId, input: $input) {
      __typename
      ... on RequisitionLineConnector {
        totalCount
      }
      ... on UseSuggestedQuantityError {
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
    requestRequisition(
      variables: RequestRequisitionQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RequestRequisitionQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequestRequisitionQuery>({
            document: RequestRequisitionDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'requestRequisition',
        'query',
        variables,
      );
    },
    updateRequest(
      variables: UpdateRequestMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateRequestMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateRequestMutation>({
            document: UpdateRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateRequest',
        'mutation',
        variables,
      );
    },
    updateRequestLine(
      variables: UpdateRequestLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateRequestLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateRequestLineMutation>({
            document: UpdateRequestLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateRequestLine',
        'mutation',
        variables,
      );
    },
    insertRequest(
      variables: InsertRequestMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertRequestMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertRequestMutation>({
            document: InsertRequestDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertRequest',
        'mutation',
        variables,
      );
    },
    insertRequestLine(
      variables: InsertRequestLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertRequestLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertRequestLineMutation>({
            document: InsertRequestLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertRequestLine',
        'mutation',
        variables,
      );
    },
    deleteRequestLine(
      variables: DeleteRequestLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteRequestLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteRequestLineMutation>({
            document: DeleteRequestLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteRequestLine',
        'mutation',
        variables,
      );
    },
    useSuggested(
      variables: UseSuggestedMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UseSuggestedMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UseSuggestedMutation>({
            document: UseSuggestedDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'useSuggested',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
