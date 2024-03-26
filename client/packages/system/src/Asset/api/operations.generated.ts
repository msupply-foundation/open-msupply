import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type AssetCatalogueItemFragment = { __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null };

export type AssetCatalogueItemsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.AssetCatalogueItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
}>;


export type AssetCatalogueItemsQuery = { __typename: 'Queries', assetCatalogueItems: { __typename: 'AssetCatalogueItemConnector', totalCount: number, nodes: Array<{ __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null }> } };

export type AssetCatalogueItemByIdQueryVariables = Types.Exact<{
  assetCatalogueItemId: Types.Scalars['String']['input'];
}>;


export type AssetCatalogueItemByIdQuery = { __typename: 'Queries', assetCatalogueItems: { __typename: 'AssetCatalogueItemConnector', totalCount: number, nodes: Array<{ __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null }> } };

export type AssetClassesQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Types.AssetClassSortInput>;
}>;


export type AssetClassesQuery = { __typename: 'Queries', assetClasses: { __typename: 'AssetClassConnector', totalCount: number, nodes: Array<{ __typename: 'AssetClassNode', id: string, name: string }> } };

export type AssetTypesQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Types.AssetTypeSortInput>;
  filter?: Types.InputMaybe<Types.AssetTypeFilterInput>;
}>;


export type AssetTypesQuery = { __typename: 'Queries', assetTypes: { __typename: 'AssetTypeConnector', totalCount: number, nodes: Array<{ __typename: 'AssetTypeNode', id: string, name: string, categoryId: string }> } };

export type AssetCategoriesQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Types.AssetCategorySortInput>;
  filter?: Types.InputMaybe<Types.AssetCategoryFilterInput>;
}>;


export type AssetCategoriesQuery = { __typename: 'Queries', assetCategories: { __typename: 'AssetCategoryConnector', totalCount: number, nodes: Array<{ __typename: 'AssetCategoryNode', id: string, name: string, classId: string }> } };

export const AssetCatalogueItemFragmentDoc = gql`
    fragment AssetCatalogueItem on AssetCatalogueItemNode {
  assetCategoryId
  assetClassId
  assetTypeId
  code
  id
  manufacturer
  model
  assetClass {
    name
  }
  assetCategory {
    name
  }
  assetType {
    name
  }
}
    `;
export const AssetCatalogueItemsDocument = gql`
    query assetCatalogueItems($first: Int, $offset: Int, $key: AssetCatalogueItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput) {
  assetCatalogueItems(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
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
    query assetCatalogueItemById($assetCatalogueItemId: String!) {
  assetCatalogueItems(filter: {id: {equalTo: $assetCatalogueItemId}}) {
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
export const AssetClassesDocument = gql`
    query assetClasses($sort: AssetClassSortInput) {
  assetClasses(sort: $sort) {
    ... on AssetClassConnector {
      nodes {
        id
        name
      }
      totalCount
    }
  }
}
    `;
export const AssetTypesDocument = gql`
    query assetTypes($sort: AssetTypeSortInput, $filter: AssetTypeFilterInput) {
  assetTypes(sort: $sort, filter: $filter) {
    ... on AssetTypeConnector {
      nodes {
        id
        name
        categoryId
      }
      totalCount
    }
  }
}
    `;
export const AssetCategoriesDocument = gql`
    query assetCategories($sort: AssetCategorySortInput, $filter: AssetCategoryFilterInput) {
  assetCategories(sort: $sort, filter: $filter) {
    ... on AssetCategoryConnector {
      nodes {
        id
        name
        classId
      }
      totalCount
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    assetCatalogueItems(variables: AssetCatalogueItemsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetCatalogueItemsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetCatalogueItemsQuery>(AssetCatalogueItemsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetCatalogueItems', 'query');
    },
    assetCatalogueItemById(variables: AssetCatalogueItemByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetCatalogueItemByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetCatalogueItemByIdQuery>(AssetCatalogueItemByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetCatalogueItemById', 'query');
    },
    assetClasses(variables?: AssetClassesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetClassesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetClassesQuery>(AssetClassesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetClasses', 'query');
    },
    assetTypes(variables?: AssetTypesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetTypesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetTypesQuery>(AssetTypesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetTypes', 'query');
    },
    assetCategories(variables?: AssetCategoriesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetCategoriesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetCategoriesQuery>(AssetCategoriesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetCategories', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetCatalogueItemsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter } = req.variables;
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
 *   const { assetCatalogueItemId } = req.variables;
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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetClassesQuery((req, res, ctx) => {
 *   const { sort } = req.variables;
 *   return res(
 *     ctx.data({ assetClasses })
 *   )
 * })
 */
export const mockAssetClassesQuery = (resolver: ResponseResolver<GraphQLRequest<AssetClassesQueryVariables>, GraphQLContext<AssetClassesQuery>, any>) =>
  graphql.query<AssetClassesQuery, AssetClassesQueryVariables>(
    'assetClasses',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetTypesQuery((req, res, ctx) => {
 *   const { sort, filter } = req.variables;
 *   return res(
 *     ctx.data({ assetTypes })
 *   )
 * })
 */
export const mockAssetTypesQuery = (resolver: ResponseResolver<GraphQLRequest<AssetTypesQueryVariables>, GraphQLContext<AssetTypesQuery>, any>) =>
  graphql.query<AssetTypesQuery, AssetTypesQueryVariables>(
    'assetTypes',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetCategoriesQuery((req, res, ctx) => {
 *   const { sort, filter } = req.variables;
 *   return res(
 *     ctx.data({ assetCategories })
 *   )
 * })
 */
export const mockAssetCategoriesQuery = (resolver: ResponseResolver<GraphQLRequest<AssetCategoriesQueryVariables>, GraphQLContext<AssetCategoriesQuery>, any>) =>
  graphql.query<AssetCategoriesQuery, AssetCategoriesQueryVariables>(
    'assetCategories',
    resolver
  )
