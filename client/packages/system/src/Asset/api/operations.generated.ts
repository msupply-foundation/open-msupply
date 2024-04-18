import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type AssetCatalogueItemFragment = { __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string, subCatalogue: string, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null };

export type AssetLogFragment = { __typename: 'AssetLogNode', comment?: string | null, id: string, logDatetime: any, status?: Types.StatusType | null, type?: string | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null, user?: { __typename: 'UserNode', firstName?: string | null, lastName?: string | null, username: string, jobTitle?: string | null } | null };

export type AssetLogReasonFragment = { __typename: 'AssetLogReasonNode', id: string, assetLogStatus: Types.StatusType, reason: string };

export type AssetCatalogueItemsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.AssetCatalogueItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
}>;


export type AssetCatalogueItemsQuery = { __typename: 'Queries', assetCatalogueItems: { __typename: 'AssetCatalogueItemConnector', totalCount: number, nodes: Array<{ __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string, subCatalogue: string, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null }> } };

export type AssetCatalogueItemByIdQueryVariables = Types.Exact<{
  assetCatalogueItemId: Types.Scalars['String']['input'];
}>;


export type AssetCatalogueItemByIdQuery = { __typename: 'Queries', assetCatalogueItems: { __typename: 'AssetCatalogueItemConnector', totalCount: number, nodes: Array<{ __typename: 'AssetCatalogueItemNode', assetCategoryId: string, assetClassId: string, assetTypeId: string, code: string, id: string, manufacturer?: string | null, model: string, subCatalogue: string, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null }> } };

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

export type InsertAssetCatalogueItemMutationVariables = Types.Exact<{
  input: Types.InsertAssetCatalogueItemInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertAssetCatalogueItemMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', assetCatalogue: { __typename: 'AssetCatalogueMutations', insertAssetCatalogueItem: { __typename: 'AssetCatalogueItemNode', id: string } | { __typename: 'InsertAssetCatalogueItemError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueCombinationViolation', fields: Array<Types.UniqueCombinationKey>, description: string } | { __typename: 'UniqueValueViolation', field: Types.UniqueValueKey, description: string } } } } };

export type DeleteAssetCatalogueItemMutationVariables = Types.Exact<{
  assetCatalogueItemId: Types.Scalars['String']['input'];
}>;


export type DeleteAssetCatalogueItemMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', assetCatalogue: { __typename: 'AssetCatalogueMutations', deleteAssetCatalogueItem: { __typename: 'DeleteAssetCatalogueItemError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } } } };

export type AssetLogReasonsQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.AssetLogReasonFilterInput>;
  sort?: Types.InputMaybe<Types.AssetLogReasonSortInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetLogReasonsQuery = { __typename: 'Queries', assetLogReasons: { __typename: 'AssetLogReasonConnector', totalCount: number, nodes: Array<{ __typename: 'AssetLogReasonNode', id: string, assetLogStatus: Types.StatusType, reason: string }> } };

export type InsertAssetLogReasonMutationVariables = Types.Exact<{
  input: Types.InsertAssetLogReasonInput;
}>;


export type InsertAssetLogReasonMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', logReason: { __typename: 'AssetLogReasonMutations', insertAssetLogReason: { __typename: 'AssetLogReasonNode', id: string, reason: string } | { __typename: 'InsertAssetLogReasonError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } } } };

export type DeleteLogReasonMutationVariables = Types.Exact<{
  reasonId: Types.Scalars['String']['input'];
}>;


export type DeleteLogReasonMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', logReason: { __typename: 'AssetLogReasonMutations', deleteLogReason: { __typename: 'DeleteAssetLogReasonError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } } } };

export const AssetCatalogueItemFragmentDoc = gql`
    fragment AssetCatalogueItem on AssetCatalogueItemNode {
  assetCategoryId
  assetClassId
  assetTypeId
  code
  id
  manufacturer
  model
  subCatalogue
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
export const AssetLogFragmentDoc = gql`
    fragment AssetLog on AssetLogNode {
  comment
  id
  logDatetime
  reason {
    reason
  }
  status
  type
  user {
    firstName
    lastName
    username
    jobTitle
  }
}
    `;
export const AssetLogReasonFragmentDoc = gql`
    fragment AssetLogReason on AssetLogReasonNode {
  id
  assetLogStatus
  reason
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
      nodes {
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
export const InsertAssetCatalogueItemDocument = gql`
    mutation insertAssetCatalogueItem($input: InsertAssetCatalogueItemInput!, $storeId: String!) {
  centralServer {
    assetCatalogue {
      insertAssetCatalogueItem(input: $input, storeId: $storeId) {
        ... on AssetCatalogueItemNode {
          id
        }
        ... on InsertAssetCatalogueItemError {
          __typename
          error {
            ... on UniqueValueViolation {
              __typename
              field
              description
            }
            ... on UniqueCombinationViolation {
              __typename
              fields
              description
            }
            ... on RecordAlreadyExist {
              __typename
              description
            }
            description
          }
        }
      }
    }
  }
}
    `;
export const DeleteAssetCatalogueItemDocument = gql`
    mutation deleteAssetCatalogueItem($assetCatalogueItemId: String!) {
  centralServer {
    assetCatalogue {
      deleteAssetCatalogueItem(assetCatalogueItemId: $assetCatalogueItemId) {
        ... on DeleteResponse {
          id
        }
        ... on DeleteAssetCatalogueItemError {
          error {
            description
          }
        }
      }
    }
  }
}
    `;
export const AssetLogReasonsDocument = gql`
    query assetLogReasons($filter: AssetLogReasonFilterInput, $sort: AssetLogReasonSortInput, $storeId: String!) {
  assetLogReasons(filter: $filter, sort: $sort, storeId: $storeId) {
    ... on AssetLogReasonConnector {
      __typename
      totalCount
      nodes {
        __typename
        ...AssetLogReason
      }
    }
  }
}
    ${AssetLogReasonFragmentDoc}`;
export const InsertAssetLogReasonDocument = gql`
    mutation insertAssetLogReason($input: InsertAssetLogReasonInput!) {
  centralServer {
    logReason {
      insertAssetLogReason(input: $input) {
        ... on AssetLogReasonNode {
          __typename
          id
          reason
        }
        ... on InsertAssetLogReasonError {
          __typename
          error {
            description
          }
        }
      }
    }
  }
}
    `;
export const DeleteLogReasonDocument = gql`
    mutation deleteLogReason($reasonId: String!) {
  centralServer {
    logReason {
      deleteLogReason(reasonId: $reasonId) {
        ... on DeleteResponse {
          __typename
          id
        }
        ... on DeleteAssetLogReasonError {
          __typename
          error {
            description
          }
        }
      }
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
    },
    insertAssetCatalogueItem(variables: InsertAssetCatalogueItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertAssetCatalogueItemMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertAssetCatalogueItemMutation>(InsertAssetCatalogueItemDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertAssetCatalogueItem', 'mutation');
    },
    deleteAssetCatalogueItem(variables: DeleteAssetCatalogueItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteAssetCatalogueItemMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteAssetCatalogueItemMutation>(DeleteAssetCatalogueItemDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteAssetCatalogueItem', 'mutation');
    },
    assetLogReasons(variables: AssetLogReasonsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetLogReasonsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetLogReasonsQuery>(AssetLogReasonsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetLogReasons', 'query');
    },
    insertAssetLogReason(variables: InsertAssetLogReasonMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertAssetLogReasonMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertAssetLogReasonMutation>(InsertAssetLogReasonDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertAssetLogReason', 'mutation');
    },
    deleteLogReason(variables: DeleteLogReasonMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteLogReasonMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteLogReasonMutation>(DeleteLogReasonDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteLogReason', 'mutation');
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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertAssetCatalogueItemMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockInsertAssetCatalogueItemMutation = (resolver: ResponseResolver<GraphQLRequest<InsertAssetCatalogueItemMutationVariables>, GraphQLContext<InsertAssetCatalogueItemMutation>, any>) =>
  graphql.mutation<InsertAssetCatalogueItemMutation, InsertAssetCatalogueItemMutationVariables>(
    'insertAssetCatalogueItem',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteAssetCatalogueItemMutation((req, res, ctx) => {
 *   const { assetCatalogueItemId } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockDeleteAssetCatalogueItemMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteAssetCatalogueItemMutationVariables>, GraphQLContext<DeleteAssetCatalogueItemMutation>, any>) =>
  graphql.mutation<DeleteAssetCatalogueItemMutation, DeleteAssetCatalogueItemMutationVariables>(
    'deleteAssetCatalogueItem',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetLogReasonsQuery((req, res, ctx) => {
 *   const { filter, sort, storeId } = req.variables;
 *   return res(
 *     ctx.data({ assetLogReasons })
 *   )
 * })
 */
export const mockAssetLogReasonsQuery = (resolver: ResponseResolver<GraphQLRequest<AssetLogReasonsQueryVariables>, GraphQLContext<AssetLogReasonsQuery>, any>) =>
  graphql.query<AssetLogReasonsQuery, AssetLogReasonsQueryVariables>(
    'assetLogReasons',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertAssetLogReasonMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockInsertAssetLogReasonMutation = (resolver: ResponseResolver<GraphQLRequest<InsertAssetLogReasonMutationVariables>, GraphQLContext<InsertAssetLogReasonMutation>, any>) =>
  graphql.mutation<InsertAssetLogReasonMutation, InsertAssetLogReasonMutationVariables>(
    'insertAssetLogReason',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteLogReasonMutation((req, res, ctx) => {
 *   const { reasonId } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockDeleteLogReasonMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteLogReasonMutationVariables>, GraphQLContext<DeleteLogReasonMutation>, any>) =>
  graphql.mutation<DeleteLogReasonMutation, DeleteLogReasonMutationVariables>(
    'deleteLogReason',
    resolver
  )
