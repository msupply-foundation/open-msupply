import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StockMovementRowFragment = {
  __typename: 'StockRelocationNode';
  id: string;
  stockMovementNumber: number;
  status: Types.StockRelocationNodeStatus;
  comment?: string | null;
  createdDatetime: string;
  confirmedDatetime?: string | null;
  finalisedDatetime?: string | null;
  lineCount: number;
  user?: { __typename: 'UserNode'; username: string } | null;
};

export type StockMovementLineFragment = {
  __typename: 'StockRelocationLineNode';
  id: string;
  stockRelocationId: string;
  stockLineId: string;
  numberOfPacks: number;
  stockLine?: {
    __typename: 'StockLineNode';
    id: string;
    itemId: string;
    batch?: string | null;
    expiryDate?: string | null;
    packSize: number;
    availableNumberOfPacks: number;
    item: {
      __typename: 'ItemNode';
      id: string;
      code: string;
      name: string;
      unitName?: string | null;
    };
  } | null;
  sourceLocation?: {
    __typename: 'LocationNode';
    id: string;
    code: string;
    name: string;
  } | null;
  destinationLocation?: {
    __typename: 'LocationNode';
    id: string;
    code: string;
    name: string;
  } | null;
};

export type StockMovementFragment = {
  __typename: 'StockRelocationNode';
  id: string;
  stockMovementNumber: number;
  status: Types.StockRelocationNodeStatus;
  comment?: string | null;
  createdDatetime: string;
  confirmedDatetime?: string | null;
  finalisedDatetime?: string | null;
  lineCount: number;
  user?: {
    __typename: 'UserNode';
    username: string;
    email?: string | null;
  } | null;
  lines: {
    __typename: 'StockRelocationLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StockRelocationLineNode';
      id: string;
      stockRelocationId: string;
      stockLineId: string;
      numberOfPacks: number;
      stockLine?: {
        __typename: 'StockLineNode';
        id: string;
        itemId: string;
        batch?: string | null;
        expiryDate?: string | null;
        packSize: number;
        availableNumberOfPacks: number;
        item: {
          __typename: 'ItemNode';
          id: string;
          code: string;
          name: string;
          unitName?: string | null;
        };
      } | null;
      sourceLocation?: {
        __typename: 'LocationNode';
        id: string;
        code: string;
        name: string;
      } | null;
      destinationLocation?: {
        __typename: 'LocationNode';
        id: string;
        code: string;
        name: string;
      } | null;
    }>;
  };
};

export type StockRelocationsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.StockRelocationFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<
    Array<Types.StockRelocationSortInput> | Types.StockRelocationSortInput
  >;
}>;

export type StockRelocationsQuery = {
  __typename: 'Queries';
  stockRelocations: {
    __typename: 'StockRelocationConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StockRelocationNode';
      id: string;
      stockMovementNumber: number;
      status: Types.StockRelocationNodeStatus;
      comment?: string | null;
      createdDatetime: string;
      confirmedDatetime?: string | null;
      finalisedDatetime?: string | null;
      lineCount: number;
      user?: { __typename: 'UserNode'; username: string } | null;
    }>;
  };
};

export type StockRelocationQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;

export type StockRelocationQuery = {
  __typename: 'Queries';
  stockRelocation:
    | { __typename: 'RecordNotFound'; description: string }
    | {
        __typename: 'StockRelocationNode';
        id: string;
        stockMovementNumber: number;
        status: Types.StockRelocationNodeStatus;
        comment?: string | null;
        createdDatetime: string;
        confirmedDatetime?: string | null;
        finalisedDatetime?: string | null;
        lineCount: number;
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        lines: {
          __typename: 'StockRelocationLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'StockRelocationLineNode';
            id: string;
            stockRelocationId: string;
            stockLineId: string;
            numberOfPacks: number;
            stockLine?: {
              __typename: 'StockLineNode';
              id: string;
              itemId: string;
              batch?: string | null;
              expiryDate?: string | null;
              packSize: number;
              availableNumberOfPacks: number;
              item: {
                __typename: 'ItemNode';
                id: string;
                code: string;
                name: string;
                unitName?: string | null;
              };
            } | null;
            sourceLocation?: {
              __typename: 'LocationNode';
              id: string;
              code: string;
              name: string;
            } | null;
            destinationLocation?: {
              __typename: 'LocationNode';
              id: string;
              code: string;
              name: string;
            } | null;
          }>;
        };
      };
};

export type InsertStockRelocationMutationVariables = Types.Exact<{
  input: Types.InsertStockRelocationInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertStockRelocationMutation = {
  __typename: 'Mutations';
  insertStockRelocation: { __typename: 'StockRelocationNode'; id: string };
};

export type UpdateStockRelocationMutationVariables = Types.Exact<{
  input: Types.UpdateStockRelocationInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdateStockRelocationMutation = {
  __typename: 'Mutations';
  updateStockRelocation:
    | {
        __typename: 'StockRelocationNode';
        id: string;
        stockMovementNumber: number;
        status: Types.StockRelocationNodeStatus;
        comment?: string | null;
        createdDatetime: string;
        confirmedDatetime?: string | null;
        finalisedDatetime?: string | null;
        lineCount: number;
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        lines: {
          __typename: 'StockRelocationLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'StockRelocationLineNode';
            id: string;
            stockRelocationId: string;
            stockLineId: string;
            numberOfPacks: number;
            stockLine?: {
              __typename: 'StockLineNode';
              id: string;
              itemId: string;
              batch?: string | null;
              expiryDate?: string | null;
              packSize: number;
              availableNumberOfPacks: number;
              item: {
                __typename: 'ItemNode';
                id: string;
                code: string;
                name: string;
                unitName?: string | null;
              };
            } | null;
            sourceLocation?: {
              __typename: 'LocationNode';
              id: string;
              code: string;
              name: string;
            } | null;
            destinationLocation?: {
              __typename: 'LocationNode';
              id: string;
              code: string;
              name: string;
            } | null;
          }>;
        };
      }
    | {
        __typename: 'UpdateStockRelocationError';
        error:
          | {
              __typename: 'LocationOnHold';
              locationId: string;
              description: string;
            }
          | {
              __typename: 'NotEnoughStock';
              stockLineId: string;
              description: string;
            };
      };
};

export type DeleteStockRelocationMutationVariables = Types.Exact<{
  input: Types.DeleteStockRelocationInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type DeleteStockRelocationMutation = {
  __typename: 'Mutations';
  deleteStockRelocation: { __typename: 'DeleteResponse'; id: string };
};

export type DeleteStockRelocationsMutationVariables = Types.Exact<{
  ids:
    | Array<Types.Scalars['String']['input']>
    | Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type DeleteStockRelocationsMutation = {
  __typename: 'Mutations';
  deleteStockRelocations: {
    __typename: 'DeleteStockRelocationsNode';
    ids: Array<string>;
  };
};

export const StockMovementRowFragmentDoc = gql`
  fragment StockMovementRow on StockRelocationNode {
    __typename
    id
    stockMovementNumber
    status
    comment
    createdDatetime
    confirmedDatetime
    finalisedDatetime
    lineCount
    user {
      __typename
      username
    }
  }
`;
export const StockMovementLineFragmentDoc = gql`
  fragment StockMovementLine on StockRelocationLineNode {
    __typename
    id
    stockRelocationId
    stockLineId
    numberOfPacks
    stockLine {
      __typename
      id
      itemId
      batch
      expiryDate
      packSize
      availableNumberOfPacks
      item {
        __typename
        id
        code
        name
        unitName
      }
    }
    sourceLocation {
      __typename
      id
      code
      name
    }
    destinationLocation {
      __typename
      id
      code
      name
    }
  }
`;
export const StockMovementFragmentDoc = gql`
  fragment StockMovement on StockRelocationNode {
    __typename
    id
    stockMovementNumber
    status
    comment
    createdDatetime
    confirmedDatetime
    user {
      __typename
      username
      email
    }
    finalisedDatetime
    lineCount
    lines {
      __typename
      totalCount
      nodes {
        ...StockMovementLine
      }
    }
  }
  ${StockMovementLineFragmentDoc}
`;
export const StockRelocationsDocument = gql`
  query stockRelocations(
    $storeId: String!
    $filter: StockRelocationFilterInput
    $page: PaginationInput
    $sort: [StockRelocationSortInput!]
  ) {
    stockRelocations(
      storeId: $storeId
      filter: $filter
      page: $page
      sort: $sort
    ) {
      __typename
      ... on StockRelocationConnector {
        __typename
        totalCount
        nodes {
          ...StockMovementRow
        }
      }
    }
  }
  ${StockMovementRowFragmentDoc}
`;
export const StockRelocationDocument = gql`
  query stockRelocation($storeId: String!, $id: String!) {
    stockRelocation(storeId: $storeId, id: $id) {
      __typename
      ... on StockRelocationNode {
        ...StockMovement
      }
      ... on RecordNotFound {
        __typename
        description
      }
    }
  }
  ${StockMovementFragmentDoc}
`;
export const InsertStockRelocationDocument = gql`
  mutation insertStockRelocation(
    $input: InsertStockRelocationInput!
    $storeId: String!
  ) {
    insertStockRelocation(input: $input, storeId: $storeId) {
      __typename
      ... on StockRelocationNode {
        id
      }
    }
  }
`;
export const UpdateStockRelocationDocument = gql`
  mutation updateStockRelocation(
    $input: UpdateStockRelocationInput!
    $storeId: String!
  ) {
    updateStockRelocation(input: $input, storeId: $storeId) {
      __typename
      ... on StockRelocationNode {
        ...StockMovement
      }
      ... on UpdateStockRelocationError {
        __typename
        error {
          __typename
          description
          ... on NotEnoughStock {
            stockLineId
          }
          ... on LocationOnHold {
            locationId
          }
        }
      }
    }
  }
  ${StockMovementFragmentDoc}
`;
export const DeleteStockRelocationDocument = gql`
  mutation deleteStockRelocation(
    $input: DeleteStockRelocationInput!
    $storeId: String!
  ) {
    deleteStockRelocation(input: $input, storeId: $storeId) {
      __typename
      ... on DeleteResponse {
        __typename
        id
      }
    }
  }
`;
export const DeleteStockRelocationsDocument = gql`
  mutation deleteStockRelocations($ids: [String!]!, $storeId: String!) {
    deleteStockRelocations(ids: $ids, storeId: $storeId) {
      __typename
      ... on DeleteStockRelocationsNode {
        __typename
        ids
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    stockRelocations(
      variables: StockRelocationsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<StockRelocationsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockRelocationsQuery>({
            document: StockRelocationsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stockRelocations',
        'query',
        variables
      );
    },
    stockRelocation(
      variables: StockRelocationQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<StockRelocationQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockRelocationQuery>({
            document: StockRelocationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stockRelocation',
        'query',
        variables
      );
    },
    insertStockRelocation(
      variables: InsertStockRelocationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertStockRelocationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertStockRelocationMutation>({
            document: InsertStockRelocationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertStockRelocation',
        'mutation',
        variables
      );
    },
    updateStockRelocation(
      variables: UpdateStockRelocationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateStockRelocationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateStockRelocationMutation>({
            document: UpdateStockRelocationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateStockRelocation',
        'mutation',
        variables
      );
    },
    deleteStockRelocation(
      variables: DeleteStockRelocationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteStockRelocationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteStockRelocationMutation>({
            document: DeleteStockRelocationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteStockRelocation',
        'mutation',
        variables
      );
    },
    deleteStockRelocations(
      variables: DeleteStockRelocationsMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteStockRelocationsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteStockRelocationsMutation>({
            document: DeleteStockRelocationsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteStockRelocations',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
