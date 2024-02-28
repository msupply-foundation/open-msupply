import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type AssetFragment = { __typename: 'AssetNode', catalogueItemId?: string | null, code: string, createdDatetime: any, id: string, installationDate?: string | null, modifiedDatetime: any, name: string, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null };

export type AssetsQueryVariables = Types.Exact<{
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter: Types.AssetFilterInput;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.AssetSortFieldInput;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetsQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', catalogueItemId?: string | null, code: string, createdDatetime: any, id: string, installationDate?: string | null, modifiedDatetime: any, name: string, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null }> } };

export type AssetByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  assetId: Types.Scalars['String']['input'];
}>;


export type AssetByIdQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', catalogueItemId?: string | null, code: string, createdDatetime: any, id: string, installationDate?: string | null, modifiedDatetime: any, name: string, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null }> } };

export const AssetFragmentDoc = gql`
    fragment Asset on AssetNode {
  __typename
  catalogueItemId
  code
  createdDatetime
  id
  installationDate
  modifiedDatetime
  name
  replacementDate
  serialNumber
  storeId
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    assets(variables: AssetsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetsQuery>(AssetsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assets', 'query');
    },
    assetById(variables: AssetByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetByIdQuery>(AssetByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetById', 'query');
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
