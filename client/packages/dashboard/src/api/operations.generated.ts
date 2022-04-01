import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ItemStatsFragment = { __typename: 'ItemNode', stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } };

export type StockCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  daysTillExpired?: Types.InputMaybe<Types.Scalars['Int']>;
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type StockCountsQuery = { __typename: 'FullQuery', stockCounts: { __typename: 'StockCounts', expired: number, expiringSoon: number } };

export type ItemStatsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
}>;


export type ItemStatsQuery = { __typename: 'FullQuery', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } }> } };

export const ItemStatsFragmentDoc = gql`
    fragment ItemStats on ItemNode {
  stats(storeId: $storeId) {
    averageMonthlyConsumption
    availableStockOnHand
    availableMonthsOfStockOnHand
  }
}
    `;
export const StockCountsDocument = gql`
    query stockCounts($storeId: String!, $daysTillExpired: Int, $timezoneOffset: Int) {
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
export const ItemStatsDocument = gql`
    query itemStats($storeId: String!) {
  items(storeId: $storeId, filter: {isVisible: true}) {
    ... on ItemConnector {
      nodes {
        ...ItemStats
      }
      totalCount
    }
  }
}
    ${ItemStatsFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    stockCounts(variables: StockCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StockCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StockCountsQuery>(StockCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stockCounts');
    },
    itemStats(variables: ItemStatsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ItemStatsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemStatsQuery>(ItemStatsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemStats');
    }
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
export const mockStockCountsQuery = (resolver: ResponseResolver<GraphQLRequest<StockCountsQueryVariables>, GraphQLContext<StockCountsQuery>, any>) =>
  graphql.query<StockCountsQuery, StockCountsQueryVariables>(
    'stockCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemStatsQuery((req, res, ctx) => {
 *   const { storeId } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemStatsQuery = (resolver: ResponseResolver<GraphQLRequest<ItemStatsQueryVariables>, GraphQLContext<ItemStatsQuery>, any>) =>
  graphql.query<ItemStatsQuery, ItemStatsQueryVariables>(
    'itemStats',
    resolver
  )
