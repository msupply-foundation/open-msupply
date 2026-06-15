import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StockMovementRowFragment = {
  __typename: 'StockRelocationNode';
  id: string;
  createdDatetime: string;
  finalisedDatetime?: string | null;
  status: Types.StockRelocationNodeStatus;
  numberOfPacks: number;
  fromPackSize: number;
  availableNumberOfPacks: number;
  toPackSize?: number | null;
  onHold: boolean;
  restrictedLocationTypeId?: string | null;
  itemCode: string;
  itemName: string;
  batch?: string | null;
  expiryDate?: string | null;
  fromStockLineId: string;
  toStockLineId?: string | null;
  fromLocation?: {
    __typename: 'LocationNode';
    id: string;
    code: string;
    name: string;
    onHold: boolean;
  } | null;
  toLocation?: {
    __typename: 'LocationNode';
    id: string;
    code: string;
    name: string;
  } | null;
};

export type StockMovementDraftLineFragment = {
  __typename: 'DraftStockRelocationLineNode';
  id: string;
  fromStockLineId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  restrictedLocationTypeId?: string | null;
  batch?: string | null;
  expiryDate?: string | null;
  fromPackSize: number;
  availableNumberOfPacks: number;
  onHold: boolean;
  fromNumberOfPacks?: number | null;
  toPackSize?: number | null;
  toNumberOfPacks?: number | null;
  fromLocation?: {
    __typename: 'LocationNode';
    id: string;
    code: string;
    name: string;
  } | null;
  toLocation?: {
    __typename: 'LocationNode';
    id: string;
    code: string;
    name: string;
  } | null;
};

export type StockRelocationDraftLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.StockRelocationDraftLinesInput;
}>;

export type StockRelocationDraftLinesQuery = {
  __typename: 'Queries';
  stockRelocationDraftLines: Array<{
    __typename: 'DraftStockRelocationLineNode';
    id: string;
    fromStockLineId: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    restrictedLocationTypeId?: string | null;
    batch?: string | null;
    expiryDate?: string | null;
    fromPackSize: number;
    availableNumberOfPacks: number;
    onHold: boolean;
    fromNumberOfPacks?: number | null;
    toPackSize?: number | null;
    toNumberOfPacks?: number | null;
    fromLocation?: {
      __typename: 'LocationNode';
      id: string;
      code: string;
      name: string;
    } | null;
    toLocation?: {
      __typename: 'LocationNode';
      id: string;
      code: string;
      name: string;
    } | null;
  }>;
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
      createdDatetime: string;
      finalisedDatetime?: string | null;
      status: Types.StockRelocationNodeStatus;
      numberOfPacks: number;
      fromPackSize: number;
      availableNumberOfPacks: number;
      toPackSize?: number | null;
      onHold: boolean;
      restrictedLocationTypeId?: string | null;
      itemCode: string;
      itemName: string;
      batch?: string | null;
      expiryDate?: string | null;
      fromStockLineId: string;
      toStockLineId?: string | null;
      fromLocation?: {
        __typename: 'LocationNode';
        id: string;
        code: string;
        name: string;
        onHold: boolean;
      } | null;
      toLocation?: {
        __typename: 'LocationNode';
        id: string;
        code: string;
        name: string;
      } | null;
    }>;
  };
};

export type InsertStockRelocationMutationVariables = Types.Exact<{
  input: Types.InsertStockRelocationInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertStockRelocationMutation = {
  __typename: 'Mutations';
  insertStockRelocation:
    | {
        __typename: 'InsertStockRelocationError';
        error:
          | { __typename: 'LocationOnHold'; description: string }
          | { __typename: 'NotEnoughStock'; description: string }
          | { __typename: 'StockLineOnHold'; description: string };
      }
    | { __typename: 'InsertStockRelocationNode'; ids: Array<string> };
};

export type UpdateStockRelocationMutationVariables = Types.Exact<{
  input: Types.UpdateStockRelocationInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdateStockRelocationMutation = {
  __typename: 'Mutations';
  updateStockRelocation:
    | {
        __typename: 'UpdateStockRelocationError';
        error:
          | { __typename: 'LocationOnHold'; description: string }
          | { __typename: 'NotEnoughStock'; description: string }
          | { __typename: 'StockLineOnHold'; description: string };
      }
    | { __typename: 'UpdateStockRelocationNode'; id: string };
};

export type DeleteStockRelocationMutationVariables = Types.Exact<{
  input: Types.DeleteStockRelocationInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type DeleteStockRelocationMutation = {
  __typename: 'Mutations';
  deleteStockRelocation: { __typename: 'DeleteResponse'; id: string };
};

export const StockMovementRowFragmentDoc = gql`
  fragment StockMovementRow on StockRelocationNode {
    __typename
    id
    createdDatetime
    finalisedDatetime
    status
    numberOfPacks
    fromPackSize
    availableNumberOfPacks
    toPackSize
    onHold
    restrictedLocationTypeId
    itemCode
    itemName
    batch
    expiryDate
    fromStockLineId
    toStockLineId
    fromLocation {
      __typename
      id
      code
      name
      onHold
    }
    toLocation {
      __typename
      id
      code
      name
    }
  }
`;
export const StockMovementDraftLineFragmentDoc = gql`
  fragment StockMovementDraftLine on DraftStockRelocationLineNode {
    __typename
    id
    fromStockLineId
    itemId
    itemCode
    itemName
    restrictedLocationTypeId
    batch
    expiryDate
    fromPackSize
    availableNumberOfPacks
    onHold
    fromNumberOfPacks
    toPackSize
    toNumberOfPacks
    fromLocation {
      __typename
      id
      code
      name
    }
    toLocation {
      __typename
      id
      code
      name
    }
  }
`;
export const StockRelocationDraftLinesDocument = gql`
  query stockRelocationDraftLines(
    $storeId: String!
    $input: StockRelocationDraftLinesInput!
  ) {
    stockRelocationDraftLines(storeId: $storeId, input: $input) {
      ...StockMovementDraftLine
    }
  }
  ${StockMovementDraftLineFragmentDoc}
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
export const InsertStockRelocationDocument = gql`
  mutation insertStockRelocation(
    $input: InsertStockRelocationInput!
    $storeId: String!
  ) {
    insertStockRelocation(input: $input, storeId: $storeId) {
      __typename
      ... on InsertStockRelocationNode {
        __typename
        ids
      }
      ... on InsertStockRelocationError {
        __typename
        error {
          __typename
          description
        }
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
      ... on UpdateStockRelocationNode {
        __typename
        id
      }
      ... on UpdateStockRelocationError {
        __typename
        error {
          __typename
          description
        }
      }
    }
  }
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
    stockRelocationDraftLines(
      variables: StockRelocationDraftLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<StockRelocationDraftLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockRelocationDraftLinesQuery>({
            document: StockRelocationDraftLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stockRelocationDraftLines',
        'query',
        variables
      );
    },
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
  };
}
export type Sdk = ReturnType<typeof getSdk>;
