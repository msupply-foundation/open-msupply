import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/src/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw';
export type StockCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  daysTillExpired?: Types.InputMaybe<Types.Scalars['Int']>;
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;

export type StockCountsQuery = {
  __typename: 'Queries';
  stockCounts: {
    __typename: 'StockCounts';
    expired: number;
    expiringSoon: number;
  };
};

export type ItemCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  lowStockThreshold: Types.Scalars['Int'];
}>;

export type ItemCountsQuery = {
  __typename: 'Queries';
  itemCounts: {
    __typename: 'ItemCounts';
    itemCounts: {
      __typename: 'ItemCountsResponse';
      lowStock: number;
      noStock: number;
      total: number;
    };
  };
};

export const StockCountsDocument = gql`
  query stockCounts(
    $storeId: String!
    $daysTillExpired: Int
    $timezoneOffset: Int
  ) {
    stockCounts(
      storeId: $storeId
      daysTillExpired: $daysTillExpired
      timezoneOffset: $timezoneOffset
    ) {
      expired
      expiringSoon
    }
  }
`;
export const ItemCountsDocument = gql`
  query itemCounts($storeId: String!, $lowStockThreshold: Int!) {
    itemCounts(lowStockThreshold: $lowStockThreshold, storeId: $storeId) {
      itemCounts {
        lowStock
        noStock
        total
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    stockCounts(
      variables: StockCountsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<StockCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockCountsQuery>(StockCountsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'stockCounts',
        'query'
      );
    },
    itemCounts(
      variables: ItemCountsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<ItemCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemCountsQuery>(ItemCountsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'itemCounts',
        'query'
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStockCountsQuery((req, res, ctx) => {
 *   const { storeId, daysTillExpired, timezoneOffset } = req.variables;
 *   return res(
 *     ctx.data({ stockCounts })
 *   )
 * })
 */
export const mockStockCountsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<StockCountsQueryVariables>,
    GraphQLContext<StockCountsQuery>,
    any
  >
) =>
  graphql.query<StockCountsQuery, StockCountsQueryVariables>(
    'stockCounts',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemCountsQuery((req, res, ctx) => {
 *   const { storeId, lowStockThreshold } = req.variables;
 *   return res(
 *     ctx.data({ itemCounts })
 *   )
 * })
 */
export const mockItemCountsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<ItemCountsQueryVariables>,
    GraphQLContext<ItemCountsQuery>,
    any
  >
) =>
  graphql.query<ItemCountsQuery, ItemCountsQueryVariables>(
    'itemCounts',
    resolver
  );
