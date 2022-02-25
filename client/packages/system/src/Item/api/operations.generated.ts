import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ItemRowFragment = { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null };

export type ItemFragment = { __typename: 'ItemNode', code: string, id: string, isVisible: boolean, name: string, unitName?: string | null, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, totalNumberOfPacks: number, onHold: boolean, note?: string | null, storeId: string, locationName?: string | null }> }, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand: number } };

export type ItemsWithStockLinesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type ItemsWithStockLinesQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', code: string, id: string, isVisible: boolean, name: string, unitName?: string | null, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, totalNumberOfPacks: number, onHold: boolean, note?: string | null, storeId: string, locationName?: string | null }> }, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand: number } }> } };

export type ItemsListViewQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type ItemsListViewQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }> } };

export const ItemRowFragmentDoc = gql`
    fragment ItemRow on ItemNode {
  __typename
  id
  code
  name
  unitName
}
    `;
export const ItemFragmentDoc = gql`
    fragment Item on ItemNode {
  __typename
  code
  id
  isVisible
  name
  unitName
  availableBatches(storeId: $storeId) {
    __typename
    totalCount
    nodes {
      __typename
      availableNumberOfPacks
      batch
      costPricePerPack
      expiryDate
      id
      itemId
      packSize
      sellPricePerPack
      totalNumberOfPacks
      onHold
      note
      storeId
      locationName
    }
  }
  stats(storeId: $storeId) {
    __typename
    averageMonthlyConsumption
    availableStockOnHand
    availableMonthsOfStockOnHand
  }
}
    `;
export const ItemsWithStockLinesDocument = gql`
    query itemsWithStockLines($first: Int, $offset: Int, $key: ItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput, $storeId: String!) {
  items(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ItemConnector {
      __typename
      nodes {
        ...Item
      }
      totalCount
    }
  }
}
    ${ItemFragmentDoc}`;
export const ItemsListViewDocument = gql`
    query itemsListView($first: Int, $offset: Int, $key: ItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput, $storeId: String!) {
  items(
    store: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ItemConnector {
      __typename
      nodes {
        ...ItemRow
      }
      totalCount
    }
  }
}
    ${ItemRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    itemsWithStockLines(variables: ItemsWithStockLinesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ItemsWithStockLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsWithStockLinesQuery>(ItemsWithStockLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsWithStockLines');
    },
    itemsListView(variables: ItemsListViewQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ItemsListViewQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsListViewQuery>(ItemsListViewDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsListView');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsWithStockLinesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsWithStockLinesQuery = (resolver: ResponseResolver<GraphQLRequest<ItemsWithStockLinesQueryVariables>, GraphQLContext<ItemsWithStockLinesQuery>, any>) =>
  graphql.query<ItemsWithStockLinesQuery, ItemsWithStockLinesQueryVariables>(
    'itemsWithStockLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsListViewQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsListViewQuery = (resolver: ResponseResolver<GraphQLRequest<ItemsListViewQueryVariables>, GraphQLContext<ItemsListViewQuery>, any>) =>
  graphql.query<ItemsListViewQuery, ItemsListViewQueryVariables>(
    'itemsListView',
    resolver
  )
