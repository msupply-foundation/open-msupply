import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { NameRowFragmentDoc } from '../../Name/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ServiceItemRowFragment = { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null };

export type StockLineFragment = { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null, doses: number } };

export type ItemRowFragment = { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null };

export type ItemWithPackSizeFragment = { __typename: 'ItemNode', defaultPackSize: number, id: string, code: string, name: string, unitName?: string | null };

export type ItemStockOnHandFragment = { __typename: 'ItemNode', availableStockOnHand: number, defaultPackSize: number, id: string, code: string, name: string, unitName?: string | null };

export type ItemRowWithStatsFragment = { __typename: 'ItemNode', availableStockOnHand: number, defaultPackSize: number, id: string, code: string, name: string, unitName?: string | null, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number } };

export type ColdStorageTypeFragment = { __typename: 'ColdStorageTypeNode', id: string, name: string, minTemperature: number, maxTemperature: number };

export type PackagingVariantFragment = { __typename: 'PackagingVariantNode', id: string, name: string, packagingLevel: number, packSize?: number | null, volumePerUnit?: number | null };

export type ItemVariantFragment = { __typename: 'ItemVariantNode', id: string, name: string, dosesPerUnit?: number | null, manufacturerId?: string | null, coldStorageTypeId?: string | null, manufacturer?: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } | null, coldStorageType?: { __typename: 'ColdStorageTypeNode', id: string, name: string, minTemperature: number, maxTemperature: number } | null, packagingVariants: Array<{ __typename: 'PackagingVariantNode', id: string, name: string, packagingLevel: number, packSize?: number | null, volumePerUnit?: number | null }> };

export type ItemFragment = { __typename: 'ItemNode', id: string, code: string, name: string, atcCategory: string, ddd: string, defaultPackSize: number, doses: number, isVaccine: boolean, margin: number, msupplyUniversalCode: string, msupplyUniversalName: string, outerPackSize: number, strength?: string | null, type: Types.ItemNodeType, unitName?: string | null, volumePerOuterPack: number, volumePerPack: number, weight: number, availableStockOnHand: number, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null, doses: number } }> }, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number }, variants: Array<{ __typename: 'ItemVariantNode', id: string, name: string, dosesPerUnit?: number | null, manufacturerId?: string | null, coldStorageTypeId?: string | null, manufacturer?: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } | null, coldStorageType?: { __typename: 'ColdStorageTypeNode', id: string, name: string, minTemperature: number, maxTemperature: number } | null, packagingVariants: Array<{ __typename: 'PackagingVariantNode', id: string, name: string, packagingLevel: number, packSize?: number | null, volumePerUnit?: number | null }> }> };

export type ItemsWithStockLinesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type ItemsWithStockLinesQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', id: string, code: string, name: string, atcCategory: string, ddd: string, defaultPackSize: number, doses: number, isVaccine: boolean, margin: number, msupplyUniversalCode: string, msupplyUniversalName: string, outerPackSize: number, strength?: string | null, type: Types.ItemNodeType, unitName?: string | null, volumePerOuterPack: number, volumePerPack: number, weight: number, availableStockOnHand: number, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null, doses: number } }> }, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number }, variants: Array<{ __typename: 'ItemVariantNode', id: string, name: string, dosesPerUnit?: number | null, manufacturerId?: string | null, coldStorageTypeId?: string | null, manufacturer?: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } | null, coldStorageType?: { __typename: 'ColdStorageTypeNode', id: string, name: string, minTemperature: number, maxTemperature: number } | null, packagingVariants: Array<{ __typename: 'PackagingVariantNode', id: string, name: string, packagingLevel: number, packSize?: number | null, volumePerUnit?: number | null }> }> }> } };

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
  key: Types.ItemSortFieldInput;
  isDesc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;


export type ItemStockOnHandQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', availableStockOnHand: number, defaultPackSize: number, id: string, code: string, name: string, unitName?: string | null }> } };

export type ItemsWithStatsFragment = { __typename: 'ItemNode', code: string, id: string, name: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number } };

export type ItemsWithStatsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.ItemSortFieldInput;
  isDesc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;


export type ItemsWithStatsQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', code: string, id: string, name: string, unitName?: string | null, defaultPackSize: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number } }> } };

export type ItemByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
}>;


export type ItemByIdQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', id: string, code: string, name: string, atcCategory: string, ddd: string, defaultPackSize: number, doses: number, isVaccine: boolean, margin: number, msupplyUniversalCode: string, msupplyUniversalName: string, outerPackSize: number, strength?: string | null, type: Types.ItemNodeType, unitName?: string | null, volumePerOuterPack: number, volumePerPack: number, weight: number, availableStockOnHand: number, stats: { __typename: 'ItemStatsNode', averageMonthlyConsumption: number, availableStockOnHand: number, availableMonthsOfStockOnHand?: number | null, totalConsumption: number }, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null, doses: number } }> }, variants: Array<{ __typename: 'ItemVariantNode', id: string, name: string, dosesPerUnit?: number | null, manufacturerId?: string | null, coldStorageTypeId?: string | null, manufacturer?: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } | null, coldStorageType?: { __typename: 'ColdStorageTypeNode', id: string, name: string, minTemperature: number, maxTemperature: number } | null, packagingVariants: Array<{ __typename: 'PackagingVariantNode', id: string, name: string, packagingLevel: number, packSize?: number | null, volumePerUnit?: number | null }> }> }> } };

export type ItemVariantOptionFragment = { __typename: 'ItemVariantNode', id: string, label: string };

export type ItemVariantsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
}>;


export type ItemVariantsQuery = { __typename: 'Queries', items: { __typename: 'ItemConnector', nodes: Array<{ __typename: 'ItemNode', variants: Array<{ __typename: 'ItemVariantNode', id: string, label: string }> }> } };

export type GetHistoricalStockLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
  datetime?: Types.InputMaybe<Types.Scalars['DateTime']['input']>;
}>;


export type GetHistoricalStockLinesQuery = { __typename: 'Queries', historicalStockLines: { __typename: 'StockLineConnector', nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, note?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, location?: { __typename: 'LocationNode', code: string, id: string, name: string, onHold: boolean } | null, item: { __typename: 'ItemNode', name: string, code: string, unitName?: string | null, doses: number } }> } };

export type UpsertItemVariantMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpsertItemVariantInput;
}>;


export type UpsertItemVariantMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', itemVariant: { __typename: 'ItemVariantMutations', upsertItemVariant: { __typename: 'ItemVariantNode', id: string, name: string, dosesPerUnit?: number | null, manufacturerId?: string | null, coldStorageTypeId?: string | null, manufacturer?: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null } | null, coldStorageType?: { __typename: 'ColdStorageTypeNode', id: string, name: string, minTemperature: number, maxTemperature: number } | null, packagingVariants: Array<{ __typename: 'PackagingVariantNode', id: string, name: string, packagingLevel: number, packSize?: number | null, volumePerUnit?: number | null }> } | { __typename: 'UpsertItemVariantError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'UniqueValueViolation', description: string, field: Types.UniqueValueKey } } } } };

export type DeleteItemVariantMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteItemVariantInput;
}>;


export type DeleteItemVariantMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', itemVariant: { __typename: 'ItemVariantMutations', deleteItemVariant: { __typename: 'DeleteResponse', id: string } } } };

export type ColdStorageTypesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type ColdStorageTypesQuery = { __typename: 'Queries', coldStorageTypes: { __typename: 'ColdStorageTypeConnector', nodes: Array<{ __typename: 'ColdStorageTypeNode', id: string, name: string, minTemperature: number, maxTemperature: number }> } };

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
    totalConsumption
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
    doses
  }
  note
  onHold
  packSize
  sellPricePerPack
  storeId
  totalNumberOfPacks
}
    `;
export const ColdStorageTypeFragmentDoc = gql`
    fragment ColdStorageType on ColdStorageTypeNode {
  __typename
  id
  name
  minTemperature
  maxTemperature
}
    `;
export const PackagingVariantFragmentDoc = gql`
    fragment PackagingVariant on PackagingVariantNode {
  __typename
  id
  name
  packagingLevel
  packSize
  volumePerUnit
}
    `;
export const ItemVariantFragmentDoc = gql`
    fragment ItemVariant on ItemVariantNode {
  __typename
  id
  name
  dosesPerUnit
  manufacturerId
  manufacturer(storeId: $storeId) {
    ...NameRow
  }
  coldStorageTypeId
  coldStorageType {
    ...ColdStorageType
  }
  packagingVariants {
    ...PackagingVariant
  }
}
    ${NameRowFragmentDoc}
${ColdStorageTypeFragmentDoc}
${PackagingVariantFragmentDoc}`;
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
    totalConsumption
  }
  variants {
    ...ItemVariant
  }
}
    ${StockLineFragmentDoc}
${ItemVariantFragmentDoc}`;
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
    totalConsumption
  }
}
    `;
export const ItemVariantOptionFragmentDoc = gql`
    fragment ItemVariantOption on ItemVariantNode {
  __typename
  id
  label: name
}
    `;
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
    query itemStockOnHand($storeId: String!, $key: ItemSortFieldInput!, $isDesc: Boolean, $filter: ItemFilterInput, $first: Int, $offset: Int) {
  items(
    storeId: $storeId
    sort: {key: $key, desc: $isDesc}
    filter: $filter
    page: {first: $first, offset: $offset}
  ) {
    ... on ItemConnector {
      __typename
      nodes {
        ...ItemStockOnHand
      }
      totalCount
    }
  }
}
    ${ItemStockOnHandFragmentDoc}`;
export const ItemsWithStatsDocument = gql`
    query itemsWithStats($storeId: String!, $key: ItemSortFieldInput!, $isDesc: Boolean, $filter: ItemFilterInput, $first: Int, $offset: Int) {
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
  items(storeId: $storeId, filter: {id: {equalTo: $itemId}, isActive: true}) {
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
export const ItemVariantsDocument = gql`
    query itemVariants($storeId: String!, $itemId: String!) {
  items(storeId: $storeId, filter: {id: {equalTo: $itemId}, isActive: true}) {
    ... on ItemConnector {
      __typename
      nodes {
        __typename
        variants {
          ...ItemVariantOption
        }
      }
    }
  }
}
    ${ItemVariantOptionFragmentDoc}`;
export const GetHistoricalStockLinesDocument = gql`
    query getHistoricalStockLines($storeId: String!, $itemId: String!, $datetime: DateTime) {
  historicalStockLines(storeId: $storeId, itemId: $itemId, datetime: $datetime) {
    ... on StockLineConnector {
      nodes {
        ...StockLine
      }
    }
  }
}
    ${StockLineFragmentDoc}`;
export const UpsertItemVariantDocument = gql`
    mutation upsertItemVariant($storeId: String!, $input: UpsertItemVariantInput!) {
  centralServer {
    itemVariant {
      upsertItemVariant(storeId: $storeId, input: $input) {
        __typename
        ... on ItemVariantNode {
          ...ItemVariant
        }
        ... on UpsertItemVariantError {
          __typename
          error {
            __typename
            description
            ... on UniqueValueViolation {
              description
              field
            }
          }
        }
      }
    }
  }
}
    ${ItemVariantFragmentDoc}`;
export const DeleteItemVariantDocument = gql`
    mutation deleteItemVariant($storeId: String!, $input: DeleteItemVariantInput!) {
  centralServer {
    itemVariant {
      deleteItemVariant(storeId: $storeId, input: $input) {
        __typename
        ... on DeleteResponse {
          __typename
          id
        }
      }
    }
  }
}
    `;
export const ColdStorageTypesDocument = gql`
    query coldStorageTypes($storeId: String!) {
  coldStorageTypes(storeId: $storeId) {
    ... on ColdStorageTypeConnector {
      nodes {
        ...ColdStorageType
      }
    }
  }
}
    ${ColdStorageTypeFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    itemsWithStockLines(variables: ItemsWithStockLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemsWithStockLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsWithStockLinesQuery>(ItemsWithStockLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsWithStockLines', 'query', variables);
    },
    items(variables: ItemsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsQuery>(ItemsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'items', 'query', variables);
    },
    itemStockOnHand(variables: ItemStockOnHandQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemStockOnHandQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemStockOnHandQuery>(ItemStockOnHandDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemStockOnHand', 'query', variables);
    },
    itemsWithStats(variables: ItemsWithStatsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemsWithStatsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsWithStatsQuery>(ItemsWithStatsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsWithStats', 'query', variables);
    },
    itemById(variables: ItemByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemByIdQuery>(ItemByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemById', 'query', variables);
    },
    itemVariants(variables: ItemVariantsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemVariantsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemVariantsQuery>(ItemVariantsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemVariants', 'query', variables);
    },
    getHistoricalStockLines(variables: GetHistoricalStockLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetHistoricalStockLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetHistoricalStockLinesQuery>(GetHistoricalStockLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getHistoricalStockLines', 'query', variables);
    },
    upsertItemVariant(variables: UpsertItemVariantMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpsertItemVariantMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertItemVariantMutation>(UpsertItemVariantDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertItemVariant', 'mutation', variables);
    },
    deleteItemVariant(variables: DeleteItemVariantMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteItemVariantMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteItemVariantMutation>(DeleteItemVariantDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteItemVariant', 'mutation', variables);
    },
    coldStorageTypes(variables: ColdStorageTypesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ColdStorageTypesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ColdStorageTypesQuery>(ColdStorageTypesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'coldStorageTypes', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;