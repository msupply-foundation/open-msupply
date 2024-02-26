import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type AssetCatalogueItemFragment = { __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string };

export type AssetCatalogueItemsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.AssetCatalogueItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetCatalogueItemsQuery = { __typename: 'Queries', assetCatalogueItems: { __typename: 'AssetCatalogueItemConnector', totalCount: number, nodes: Array<{ __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string }> } };

export type AssetCatalogueItemByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  assetCatalogueItemId: Types.Scalars['String']['input'];
}>;


export type AssetCatalogueItemByIdQuery = { __typename: 'Queries', assetCatalogueItems: { __typename: 'AssetCatalogueItemConnector', totalCount: number, nodes: Array<{ __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string }> } };

export const AssetCatalogueItemFragmentDoc = gql`
    fragment AssetCatalogueItem on AssetCatalogueItemNode {
  __typename
  assetCategoryId
  assetClassId
  assetTypeId
  code
  id
  manufacturer
  model
}
    `;
export const AssetCatalogueItemsDocument = gql`
    query assetCatalogueItems($first: Int, $offset: Int, $key: AssetCatalogueItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput, $storeId: String!) {
  assetCatalogueItems(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on AssetCatalogueItemConnector {
      __typename
      nodes {
        ...AssetCatalogueItem
      }
      totalCount
    }
  }
}
    ${AssetCatalogueItemFragmentDoc}`;
export const AssetCatalogueItemByIdDocument = gql`
    query assetCatalogueItemById($storeId: String!, $assetCatalogueItemId: String!) {
  assetCatalogueItems(
    storeId: $storeId
    filter: {id: {equalTo: $assetCatalogueItemId}}
  ) {
    ... on AssetCatalogueItemConnector {
      __typename
      nodes {
        __typename
        ...AssetCatalogueItem
      }
      totalCount
    }
  }
}
    ${AssetCatalogueItemFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    assetCatalogueItems(variables: AssetCatalogueItemsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetCatalogueItemsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetCatalogueItemsQuery>(AssetCatalogueItemsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetCatalogueItems', 'query');
    },
    assetCatalogueItemById(variables: AssetCatalogueItemByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetCatalogueItemByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetCatalogueItemByIdQuery>(AssetCatalogueItemByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetCatalogueItemById', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetCatalogueItemsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ assetCatalogueItems })
 *   )
 * })
 */
export const mockAssetCatalogueItemsQuery = (resolver: ResponseResolver<GraphQLRequest<AssetCatalogueItemsQueryVariables>, GraphQLContext<AssetCatalogueItemsQuery>, any>) =>
  graphql.query<AssetCatalogueItemsQuery, AssetCatalogueItemsQueryVariables>(
    'assetCatalogueItems',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetCatalogueItemByIdQuery((req, res, ctx) => {
 *   const { storeId, assetCatalogueItemId } = req.variables;
 *   return res(
 *     ctx.data({ assetCatalogueItems })
 *   )
 * })
 */
export const mockAssetCatalogueItemByIdQuery = (resolver: ResponseResolver<GraphQLRequest<AssetCatalogueItemByIdQueryVariables>, GraphQLContext<AssetCatalogueItemByIdQuery>, any>) =>
  graphql.query<AssetCatalogueItemByIdQuery, AssetCatalogueItemByIdQueryVariables>(
    'assetCatalogueItemById',
    resolver
  )
