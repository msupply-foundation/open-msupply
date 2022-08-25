import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type SyncSettingsFragment = { __typename: 'SyncSettingsNode', centralServerSiteId: number, intervalSec: number, url: string, username: string };

export type ApiVersionQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type ApiVersionQuery = { __typename: 'FullQuery', apiVersion: string };

export type ServerSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type ServerSettingsQuery = { __typename: 'FullQuery', serverSettings: { __typename: 'ServerSettingsNode', status: Types.ServerStatus, syncSettingsDb?: { __typename: 'SyncSettingsNode', centralServerSiteId: number, intervalSec: number, url: string, username: string } | null, syncSettings?: { __typename: 'SyncSettingsNode', centralServerSiteId: number, intervalSec: number, url: string, username: string } | null } };

export type ServerRestartQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type ServerRestartQuery = { __typename: 'FullQuery', serverRestart: { __typename: 'RestartNode', message: string } };

export type UpdateServerSettingsMutationVariables = Types.Exact<{
  syncSettings: Types.UpdateSyncSettingsInput;
}>;


export type UpdateServerSettingsMutation = { __typename: 'FullMutation', updateServerSettings: { __typename: 'ServerSettingsNode', status: Types.ServerStatus } };

export const SyncSettingsFragmentDoc = gql`
    fragment SyncSettings on SyncSettingsNode {
  __typename
  centralServerSiteId
  intervalSec
  url
  username
}
    `;
export const ApiVersionDocument = gql`
    query apiVersion {
  apiVersion
}
    `;
export const ServerSettingsDocument = gql`
    query serverSettings {
  serverSettings {
    ... on ServerSettingsNode {
      __typename
      status
      syncSettingsDb {
        ...SyncSettings
      }
      syncSettings {
        ...SyncSettings
      }
    }
  }
}
    ${SyncSettingsFragmentDoc}`;
export const ServerRestartDocument = gql`
    query serverRestart {
  serverRestart {
    __typename
    message
  }
}
    `;
export const UpdateServerSettingsDocument = gql`
    mutation updateServerSettings($syncSettings: UpdateSyncSettingsInput!) {
  updateServerSettings(input: {syncSettings: $syncSettings}) {
    ... on ServerSettingsNode {
      __typename
      status
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    apiVersion(variables?: ApiVersionQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ApiVersionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ApiVersionQuery>(ApiVersionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'apiVersion', 'query');
    },
    serverSettings(variables?: ServerSettingsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ServerSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ServerSettingsQuery>(ServerSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'serverSettings', 'query');
    },
    serverRestart(variables?: ServerRestartQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ServerRestartQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ServerRestartQuery>(ServerRestartDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'serverRestart', 'query');
    },
    updateServerSettings(variables: UpdateServerSettingsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateServerSettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateServerSettingsMutation>(UpdateServerSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateServerSettings', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockApiVersionQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ apiVersion })
 *   )
 * })
 */
export const mockApiVersionQuery = (resolver: ResponseResolver<GraphQLRequest<ApiVersionQueryVariables>, GraphQLContext<ApiVersionQuery>, any>) =>
  graphql.query<ApiVersionQuery, ApiVersionQueryVariables>(
    'apiVersion',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockServerSettingsQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ serverSettings })
 *   )
 * })
 */
export const mockServerSettingsQuery = (resolver: ResponseResolver<GraphQLRequest<ServerSettingsQueryVariables>, GraphQLContext<ServerSettingsQuery>, any>) =>
  graphql.query<ServerSettingsQuery, ServerSettingsQueryVariables>(
    'serverSettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockServerRestartQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ serverRestart })
 *   )
 * })
 */
export const mockServerRestartQuery = (resolver: ResponseResolver<GraphQLRequest<ServerRestartQueryVariables>, GraphQLContext<ServerRestartQuery>, any>) =>
  graphql.query<ServerRestartQuery, ServerRestartQueryVariables>(
    'serverRestart',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateServerSettingsMutation((req, res, ctx) => {
 *   const { syncSettings } = req.variables;
 *   return res(
 *     ctx.data({ updateServerSettings })
 *   )
 * })
 */
export const mockUpdateServerSettingsMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateServerSettingsMutationVariables>, GraphQLContext<UpdateServerSettingsMutation>, any>) =>
  graphql.mutation<UpdateServerSettingsMutation, UpdateServerSettingsMutationVariables>(
    'updateServerSettings',
    resolver
  )
