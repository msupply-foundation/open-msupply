import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ServiceItemRowFragment = { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null };

export type StockLineFragment = { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null } };

export type ItemRowFragment = { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null };

export type ItemWithPackSizeFragment = { __typename: 'ItemNode', defaultPackSize: number, id: string, code: string, name: string, unitName?: string | null };

export type ItemStockOnHandFragment = { __typename: 'ItemNode', availableStockOnHand: number, defaultPackSize: number, id: string, code: string, name: string, unitName?: string | null };

export type ItemRowWithStatsFragment = { __typename: 'ItemNode', availableStockOnHand: number, defaultPackSize: number, id: string, code: string, name: string, unitName?: string | null, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } };

export type ItemFragment = { __typename: 'ItemNode', id: string, code: string, name: string, atcCategory: string, ddd: string, defaultPackSize: number, doses: number, isVaccine: boolean, margin: number, msupplyUniversalCode: string, msupplyUniversalName: string, outerPackSize: number, strength: string, type: Types.ItemNodeType, unitName?: string | null, volumePerOuterPack: number, volumePerPack: number, weight: number, availableStockOnHand: number, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null } }> }, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } };

export type ItemsWithStockLinesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type ItemsWithStockLinesQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', id: string, code: string, name: string, atcCategory: string, ddd: string, defaultPackSize: number, doses: number, isVaccine: boolean, margin: number, msupplyUniversalCode: string, msupplyUniversalName: string, outerPackSize: number, strength: string, type: Types.ItemNodeType, unitName?: string | null, volumePerOuterPack: number, volumePerPack: number, weight: number, availableStockOnHand: number, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null } }> }, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } }> } };

export type ItemsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type ItemsQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }> } };

export type ItemStockOnHandQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key?: Types.InputMaybe<Types.ItemSortFieldInput>;
  isDesc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;


export type ItemStockOnHandQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', nodes: Array<{ __typename: 'ItemNode', code: string, id: string, name: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number }> } };

export type ItemsWithStatsFragment = { __typename: 'ItemNode', code: string, id: string, name: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } };

export type ItemsWithStatsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key?: Types.InputMaybe<Types.ItemSortFieldInput>;
  isDesc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;


export type ItemsWithStatsQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', code: string, id: string, name: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null } }> } };

export type ItemByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
}>;


export type ItemByIdQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', id: string, code: string, name: string, atcCategory: string, ddd: string, defaultPackSize: number, doses: number, isVaccine: boolean, margin: number, msupplyUniversalCode: string, msupplyUniversalName: string, outerPackSize: number, strength: string, type: Types.ItemNodeType, unitName?: string | null, volumePerOuterPack: number, volumePerPack: number, weight: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null }, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null } }> } }> } };

export type UnitFragment = { __typename: 'UnitNode', id: string, longName: string, packSize: number, shortName: string };

export type PackUnitFragment = { __typename: 'PackUnitNode', itemId: string, mostUsedPackUnitId: string, packUnits: Array<{ __typename: 'UnitNode', id: string, longName: string, packSize: number, shortName: string }> };

export type PackUnitsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type PackUnitsQuery = { __typename: 'Queries', packUnits: { __typename: 'PackUnitConnector', totalCount: number, nodes: Array<{ __typename: 'PackUnitNode', itemId: string, mostUsedPackUnitId: string, packUnits: Array<{ __typename: 'UnitNode', id: string, longName: string, packSize: number, shortName: string }> }> } };

export const ServiceItemRowFragmentDoc = gql`
    fragment ServiceItemRow on ItemNode {
  __typename
  id
  code
  name
  unitName
}
    `;
export const ItemRowFragmentDoc = gql`
    fragment ItemRow on ItemNode {
  __typename
  id
  code
  name
  unitName
}
    `;
export const ItemWithPackSizeFragmentDoc = gql`
    fragment ItemWithPackSize on ItemNode {
  ...ItemRow
  defaultPackSize
}
    ${ItemRowFragmentDoc}`;
export const ItemStockOnHandFragmentDoc = gql`
    fragment ItemStockOnHand on ItemNode {
  ...ItemWithPackSize
  availableStockOnHand(storeId: $storeId)
}
    ${ItemWithPackSizeFragmentDoc}`;
export const ItemRowWithStatsFragmentDoc = gql`
    fragment ItemRowWithStats on ItemNode {
  ...ItemStockOnHand
  stats(storeId: $storeId) {
    __typename
    averageMonthlyConsumption
    availableStockOnHand
    availableMonthsOfStockOnHand
  }
}
    ${ItemStockOnHandFragmentDoc}`;
export const StockLineFragmentDoc = gql`
    fragment StockLine on StockLineNode {
  availableNumberOfPacks
  batch
  costPricePerPack
  expiryDate
  id
  itemId
  location {
    code
    id
    name
    onHold
  }
  item {
    name
    code
    unitName
  }
  note
  onHold
  packSize
  sellPricePerPack
  storeId
  totalNumberOfPacks
}
    `;
export const ItemFragmentDoc = gql`
    fragment Item on ItemNode {
  __typename
  id
  code
  name
  atcCategory
  ddd
  defaultPackSize
  doses
  isVaccine
  margin
  msupplyUniversalCode
  msupplyUniversalName
  outerPackSize
  strength
  type
  unitName
  volumePerOuterPack
  volumePerPack
  weight
  availableStockOnHand(storeId: $storeId)
  availableBatches(storeId: $storeId) {
    __typename
    totalCount
    nodes {
      __typename
      ...StockLine
    }
  }
  stats(storeId: $storeId) {
    __typename
    averageMonthlyConsumption
    availableStockOnHand
    availableMonthsOfStockOnHand
  }
}
    ${StockLineFragmentDoc}`;
export const ItemsWithStatsFragmentDoc = gql`
    fragment ItemsWithStats on ItemNode {
  __typename
  code
  id
  name
  unitName
  defaultPackSize
  availableStockOnHand(storeId: $storeId)
  stats(storeId: $storeId) {
    __typename
    averageMonthlyConsumption
    availableStockOnHand
    availableMonthsOfStockOnHand
  }
}
    `;
export const UnitFragmentDoc = gql`
    fragment Unit on UnitNode {
  id
  longName
  packSize
  shortName
}
    `;
export const PackUnitFragmentDoc = gql`
    fragment PackUnit on PackUnitNode {
  itemId
  mostUsedPackUnitId
  packUnits {
    ...Unit
  }
}
    ${UnitFragmentDoc}`;
export const ItemsWithStockLinesDocument = gql`
    query itemsWithStockLines($first: Int, $offset: Int, $key: ItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput, $storeId: String!) {
  items(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
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
export const ItemsDocument = gql`
    query items($first: Int, $offset: Int, $key: ItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput, $storeId: String!) {
  items(
    storeId: $storeId
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
export const ItemStockOnHandDocument = gql`
    query itemStockOnHand($storeId: String!, $key: ItemSortFieldInput, $isDesc: Boolean, $filter: ItemFilterInput, $first: Int, $offset: Int) {
  items(
    storeId: $storeId
    sort: {key: $key, desc: $isDesc}
    filter: $filter
    page: {first: $first, offset: $offset}
  ) {
    ... on ItemConnector {
      __typename
      nodes {
        __typename
        code
        id
        name
        unitName
        defaultPackSize
        availableStockOnHand(storeId: $storeId)
      }
    }
  }
}
    `;
export const ItemsWithStatsDocument = gql`
    query itemsWithStats($storeId: String!, $key: ItemSortFieldInput, $isDesc: Boolean, $filter: ItemFilterInput, $first: Int, $offset: Int) {
  items(
    storeId: $storeId
    sort: {key: $key, desc: $isDesc}
    filter: $filter
    page: {first: $first, offset: $offset}
  ) {
    ... on ItemConnector {
      __typename
      nodes {
        ...ItemsWithStats
      }
      totalCount
    }
  }
}
    ${ItemsWithStatsFragmentDoc}`;
export const ItemByIdDocument = gql`
    query itemById($storeId: String!, $itemId: String!) {
  items(storeId: $storeId, filter: {id: {equalTo: $itemId}}) {
    ... on ItemConnector {
      __typename
      nodes {
        __typename
        ...Item
        stats(storeId: $storeId) {
          __typename
          averageMonthlyConsumption
          availableStockOnHand
          availableMonthsOfStockOnHand
        }
        availableBatches(storeId: $storeId) {
          totalCount
          nodes {
            ...StockLine
          }
        }
      }
      totalCount
    }
  }
}
    ${ItemFragmentDoc}
${StockLineFragmentDoc}`;
export const PackUnitsDocument = gql`
    query packUnits($storeId: String!) {
  packUnits(storeId: $storeId) {
    __typename
    nodes {
      ...PackUnit
    }
    totalCount
  }
}
    ${PackUnitFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    itemsWithStockLines(variables: ItemsWithStockLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemsWithStockLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsWithStockLinesQuery>(ItemsWithStockLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsWithStockLines', 'query');
    },
    items(variables: ItemsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsQuery>(ItemsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'items', 'query');
    },
    itemStockOnHand(variables: ItemStockOnHandQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemStockOnHandQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemStockOnHandQuery>(ItemStockOnHandDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemStockOnHand', 'query');
    },
    itemsWithStats(variables: ItemsWithStatsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemsWithStatsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsWithStatsQuery>(ItemsWithStatsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsWithStats', 'query');
    },
    itemById(variables: ItemByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemByIdQuery>(ItemByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemById', 'query');
    },
    packUnits(variables: PackUnitsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PackUnitsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PackUnitsQuery>(PackUnitsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'packUnits', 'query');
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
 * mockItemsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsQuery = (resolver: ResponseResolver<GraphQLRequest<ItemsQueryVariables>, GraphQLContext<ItemsQuery>, any>) =>
  graphql.query<ItemsQuery, ItemsQueryVariables>(
    'items',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemStockOnHandQuery((req, res, ctx) => {
 *   const { storeId, key, isDesc, filter, first, offset } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemStockOnHandQuery = (resolver: ResponseResolver<GraphQLRequest<ItemStockOnHandQueryVariables>, GraphQLContext<ItemStockOnHandQuery>, any>) =>
  graphql.query<ItemStockOnHandQuery, ItemStockOnHandQueryVariables>(
    'itemStockOnHand',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsWithStatsQuery((req, res, ctx) => {
 *   const { storeId, key, isDesc, filter, first, offset } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsWithStatsQuery = (resolver: ResponseResolver<GraphQLRequest<ItemsWithStatsQueryVariables>, GraphQLContext<ItemsWithStatsQuery>, any>) =>
  graphql.query<ItemsWithStatsQuery, ItemsWithStatsQueryVariables>(
    'itemsWithStats',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemByIdQuery((req, res, ctx) => {
 *   const { storeId, itemId } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemByIdQuery = (resolver: ResponseResolver<GraphQLRequest<ItemByIdQueryVariables>, GraphQLContext<ItemByIdQuery>, any>) =>
  graphql.query<ItemByIdQuery, ItemByIdQueryVariables>(
    'itemById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPackUnitsQuery((req, res, ctx) => {
 *   const { storeId } = req.variables;
 *   return res(
 *     ctx.data({ packUnits })
 *   )
 * })
 */
export const mockPackUnitsQuery = (resolver: ResponseResolver<GraphQLRequest<PackUnitsQueryVariables>, GraphQLContext<PackUnitsQuery>, any>) =>
  graphql.query<PackUnitsQuery, PackUnitsQueryVariables>(
    'packUnits',
    resolver
  )
