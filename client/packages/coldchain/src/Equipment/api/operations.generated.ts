import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type AssetFragment = { __typename: 'AssetNode', catalogueItemId?: string | null, code: string, createdDatetime: any, id: string, installationDate?: string | null, modifiedDatetime: any, notes?: string | null, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string, assetType?: { __typename: 'AssetTypeNode', name: string } | null, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null } | null };

export type AssetsQueryVariables = Types.Exact<{
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter: Types.AssetFilterInput;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.AssetSortFieldInput;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetsQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', catalogueItemId?: string | null, code: string, createdDatetime: any, id: string, installationDate?: string | null, modifiedDatetime: any, notes?: string | null, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string, assetType?: { __typename: 'AssetTypeNode', name: string } | null, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null } | null }> } };

export type AssetByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  assetId: Types.Scalars['String']['input'];
}>;


export type AssetByIdQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', catalogueItemId?: string | null, code: string, createdDatetime: any, id: string, installationDate?: string | null, modifiedDatetime: any, notes?: string | null, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string, assetType?: { __typename: 'AssetTypeNode', name: string } | null, assetClass?: { __typename: 'AssetClassNode', name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', name: string } | null } | null }> } };

export type DeleteAssetMutationVariables = Types.Exact<{
  assetId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type DeleteAssetMutation = { __typename: 'Mutations', deleteAsset: { __typename: 'DeleteAssetError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } };

export type InsertAssetMutationVariables = Types.Exact<{
  input: Types.InsertAssetInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertAssetMutation = { __typename: 'Mutations', insertAsset: { __typename: 'AssetNode', id: string } | { __typename: 'InsertAssetError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } };

export type UpdateAssetMutationVariables = Types.Exact<{
  input: Types.UpdateAssetInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateAssetMutation = { __typename: 'Mutations', updateAsset: { __typename: 'AssetNode', id: string } | { __typename: 'UpdateAssetError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } | { __typename: 'UniqueValueViolation', description: string } } };

export const AssetFragmentDoc = gql`
    fragment Asset on AssetNode {
  __typename
  catalogueItemId
  code
  createdDatetime
  id
  installationDate
  modifiedDatetime
  notes
  replacementDate
  serialNumber
  storeId
  catalogueItem {
    manufacturer
    model
    assetType {
      name
    }
    assetClass {
      name
    }
    assetCategory {
      name
    }
  }
}
    `;
export const AssetsDocument = gql`
    query assets($desc: Boolean, $filter: AssetFilterInput!, $first: Int, $key: AssetSortFieldInput!, $offset: Int, $storeId: String!) {
  assets(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    storeId: $storeId
  ) {
    ... on AssetConnector {
      nodes {
        ...Asset
      }
      totalCount
    }
  }
}
    ${AssetFragmentDoc}`;
export const AssetByIdDocument = gql`
    query assetById($storeId: String!, $assetId: String!) {
  assets(storeId: $storeId, filter: {id: {equalTo: $assetId}}) {
    ... on AssetConnector {
      __typename
      nodes {
        __typename
        ...Asset
      }
      totalCount
    }
  }
}
    ${AssetFragmentDoc}`;
export const DeleteAssetDocument = gql`
    mutation deleteAsset($assetId: String!, $storeId: String!) {
  deleteAsset(assetId: $assetId, storeId: $storeId) {
    ... on DeleteResponse {
      __typename
      id
    }
    ... on DeleteAssetError {
      __typename
      error {
        description
      }
    }
  }
}
    `;
export const InsertAssetDocument = gql`
    mutation insertAsset($input: InsertAssetInput!, $storeId: String!) {
  insertAsset(input: $input, storeId: $storeId) {
    ... on InsertAssetError {
      __typename
      error {
        description
      }
    }
    ... on AssetNode {
      __typename
      id
    }
  }
}
    `;
export const UpdateAssetDocument = gql`
    mutation updateAsset($input: UpdateAssetInput!, $storeId: String!) {
  updateAsset(input: $input, storeId: $storeId) {
    ... on UpdateAssetError {
      __typename
      error {
        description
      }
    }
    ... on AssetNode {
      __typename
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    assets(variables: AssetsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetsQuery>(AssetsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assets', 'query');
    },
    assetById(variables: AssetByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetByIdQuery>(AssetByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetById', 'query');
    },
    deleteAsset(variables: DeleteAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteAssetMutation>(DeleteAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteAsset', 'mutation');
    },
    insertAsset(variables: InsertAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertAssetMutation>(InsertAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertAsset', 'mutation');
    },
    updateAsset(variables: UpdateAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateAssetMutation>(UpdateAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateAsset', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetsQuery((req, res, ctx) => {
 *   const { desc, filter, first, key, offset, storeId } = req.variables;
 *   return res(
 *     ctx.data({ assets })
 *   )
 * })
 */
export const mockAssetsQuery = (resolver: ResponseResolver<GraphQLRequest<AssetsQueryVariables>, GraphQLContext<AssetsQuery>, any>) =>
  graphql.query<AssetsQuery, AssetsQueryVariables>(
    'assets',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetByIdQuery((req, res, ctx) => {
 *   const { storeId, assetId } = req.variables;
 *   return res(
 *     ctx.data({ assets })
 *   )
 * })
 */
export const mockAssetByIdQuery = (resolver: ResponseResolver<GraphQLRequest<AssetByIdQueryVariables>, GraphQLContext<AssetByIdQuery>, any>) =>
  graphql.query<AssetByIdQuery, AssetByIdQueryVariables>(
    'assetById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteAssetMutation((req, res, ctx) => {
 *   const { assetId, storeId } = req.variables;
 *   return res(
 *     ctx.data({ deleteAsset })
 *   )
 * })
 */
export const mockDeleteAssetMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteAssetMutationVariables>, GraphQLContext<DeleteAssetMutation>, any>) =>
  graphql.mutation<DeleteAssetMutation, DeleteAssetMutationVariables>(
    'deleteAsset',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertAssetMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertAsset })
 *   )
 * })
 */
export const mockInsertAssetMutation = (resolver: ResponseResolver<GraphQLRequest<InsertAssetMutationVariables>, GraphQLContext<InsertAssetMutation>, any>) =>
  graphql.mutation<InsertAssetMutation, InsertAssetMutationVariables>(
    'insertAsset',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateAssetMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ updateAsset })
 *   )
 * })
 */
export const mockUpdateAssetMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateAssetMutationVariables>, GraphQLContext<UpdateAssetMutation>, any>) =>
  graphql.mutation<UpdateAssetMutation, UpdateAssetMutationVariables>(
    'updateAsset',
    resolver
  )
