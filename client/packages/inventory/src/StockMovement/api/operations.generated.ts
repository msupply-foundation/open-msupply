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
  } | null;
  toLocation?: {
    __typename: 'LocationNode';
    id: string;
    code: string;
    name: string;
  } | null;
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
          | {
              __typename: 'LocationOnHold';
              locationId: string;
              description: string;
            }
          | {
              __typename: 'NotEnoughStock';
              stockLineId: string;
              description: string;
            }
          | {
              __typename: 'StockLineOnHold';
              stockLineId: string;
              description: string;
            };
      }
    | { __typename: 'InsertStockRelocationNode'; ids: Array<string> };
};

export const StockMovementRowFragmentDoc = gql`
  fragment StockMovementRow on StockRelocationNode {
    __typename
    id
    createdDatetime
    finalisedDatetime
    status
    numberOfPacks
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
    }
    toLocation {
      __typename
      id
      code
      name
    }
  }
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
          ... on StockLineOnHold {
            stockLineId
          }
          ... on LocationOnHold {
            locationId
          }
          ... on NotEnoughStock {
            stockLineId
          }
        }
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
  };
}
export type Sdk = ReturnType<typeof getSdk>;
