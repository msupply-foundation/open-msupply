import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type SyncSettingsFragment = { __typename: 'SyncSettingsNode', intervalSec?: number | null, url?: string | null, username?: string | null };

export type SyncSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncSettingsQuery = { __typename: 'Queries', syncSettings: { __typename: 'SyncSettingsNode', intervalSec?: number | null, url?: string | null, username?: string | null } };

export type SyncStateQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncStateQuery = { __typename: 'Queries', syncState: Types.SyncStateType };

export type InitialiseSiteMutationVariables = Types.Exact<{
  syncSettings: Types.SyncSettingsInput;
}>;


export type InitialiseSiteMutation = { __typename: 'Mutations', initialiseSite: { __typename: 'SyncSettingsNode', intervalSec?: number | null, url?: string | null, username?: string | null } };

export type SyncStatusFragment = { __typename: 'SyncStatusNode', finished?: any | null, started: any };

export type SyncStatusWithProgressFragment = { __typename: 'SyncStatusWithProgressNode', finished?: any | null, started: any, doneProgress?: number | null, totalProgress?: number | null };

export type SyncStatusQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncStatusQuery = { __typename: 'Queries', latestSyncStatus?: { __typename: 'FullSyncStatusNode', error?: string | null, isSyncing: boolean, integration?: { __typename: 'SyncStatusNode', finished?: any | null, started: any } | null, prepareInitial?: { __typename: 'SyncStatusNode', finished?: any | null, started: any } | null, pullCentral?: { __typename: 'SyncStatusWithProgressNode', finished?: any | null, started: any, doneProgress?: number | null, totalProgress?: number | null } | null, pullRemote?: { __typename: 'SyncStatusWithProgressNode', finished?: any | null, started: any, doneProgress?: number | null, totalProgress?: number | null } | null, push?: { __typename: 'SyncStatusWithProgressNode', finished?: any | null, started: any, doneProgress?: number | null, totalProgress?: number | null } | null, summary: { __typename: 'SyncStatusNode', finished?: any | null, started: any } } | null };

export type ManualSyncMutationVariables = Types.Exact<{ [key: string]: never; }>;


export type ManualSyncMutation = { __typename: 'Mutations', manualSync: string };

export const SyncSettingsFragmentDoc = gql`
    fragment SyncSettings on SyncSettingsNode {
  __typename
  intervalSec
  url
  username
}
    `;
export const SyncStatusFragmentDoc = gql`
    fragment SyncStatus on SyncStatusNode {
  __typename
  finished
  started
}
    `;
export const SyncStatusWithProgressFragmentDoc = gql`
    fragment SyncStatusWithProgress on SyncStatusWithProgressNode {
  __typename
  finished
  started
  doneProgress
  totalProgress
}
    `;
export const SyncSettingsDocument = gql`
    query syncSettings {
  syncSettings {
    ... on SyncSettingsNode {
      ...SyncSettings
    }
  }
}
    ${SyncSettingsFragmentDoc}`;
export const SyncStateDocument = gql`
    query syncState {
  syncState
}
    `;
export const InitialiseSiteDocument = gql`
    mutation initialiseSite($syncSettings: SyncSettingsInput!) {
  initialiseSite(input: $syncSettings) {
    ... on SyncSettingsNode {
      ...SyncSettings
    }
  }
}
    ${SyncSettingsFragmentDoc}`;
export const SyncStatusDocument = gql`
    query syncStatus {
  latestSyncStatus {
    __typename
    error
    integration {
      ...SyncStatus
    }
    isSyncing
    prepareInitial {
      ...SyncStatus
    }
    pullCentral {
      ...SyncStatusWithProgress
    }
    pullRemote {
      ...SyncStatusWithProgress
    }
    push {
      ...SyncStatusWithProgress
    }
    summary {
      ...SyncStatus
    }
  }
}
    ${SyncStatusFragmentDoc}
${SyncStatusWithProgressFragmentDoc}`;
export const ManualSyncDocument = gql`
    mutation manualSync {
  manualSync
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    syncSettings(variables?: SyncSettingsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<SyncSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncSettingsQuery>(SyncSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncSettings', 'query');
    },
    syncState(variables?: SyncStateQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<SyncStateQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncStateQuery>(SyncStateDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncState', 'query');
    },
    initialiseSite(variables: InitialiseSiteMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InitialiseSiteMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InitialiseSiteMutation>(InitialiseSiteDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'initialiseSite', 'mutation');
    },
    syncStatus(variables?: SyncStatusQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<SyncStatusQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncStatusQuery>(SyncStatusDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncStatus', 'query');
    },
    manualSync(variables?: ManualSyncMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ManualSyncMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ManualSyncMutation>(ManualSyncDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'manualSync', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockSyncSettingsQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ syncSettings })
 *   )
 * })
 */
export const mockSyncSettingsQuery = (resolver: ResponseResolver<GraphQLRequest<SyncSettingsQueryVariables>, GraphQLContext<SyncSettingsQuery>, any>) =>
  graphql.query<SyncSettingsQuery, SyncSettingsQueryVariables>(
    'syncSettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockSyncStateQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ syncState })
 *   )
 * })
 */
export const mockSyncStateQuery = (resolver: ResponseResolver<GraphQLRequest<SyncStateQueryVariables>, GraphQLContext<SyncStateQuery>, any>) =>
  graphql.query<SyncStateQuery, SyncStateQueryVariables>(
    'syncState',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInitialiseSiteMutation((req, res, ctx) => {
 *   const { syncSettings } = req.variables;
 *   return res(
 *     ctx.data({ initialiseSite })
 *   )
 * })
 */
export const mockInitialiseSiteMutation = (resolver: ResponseResolver<GraphQLRequest<InitialiseSiteMutationVariables>, GraphQLContext<InitialiseSiteMutation>, any>) =>
  graphql.mutation<InitialiseSiteMutation, InitialiseSiteMutationVariables>(
    'initialiseSite',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockSyncStatusQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ latestSyncStatus })
 *   )
 * })
 */
export const mockSyncStatusQuery = (resolver: ResponseResolver<GraphQLRequest<SyncStatusQueryVariables>, GraphQLContext<SyncStatusQuery>, any>) =>
  graphql.query<SyncStatusQuery, SyncStatusQueryVariables>(
    'syncStatus',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockManualSyncMutation((req, res, ctx) => {
 *   return res(
 *     ctx.data({ manualSync })
 *   )
 * })
 */
export const mockManualSyncMutation = (resolver: ResponseResolver<GraphQLRequest<ManualSyncMutationVariables>, GraphQLContext<ManualSyncMutation>, any>) =>
  graphql.mutation<ManualSyncMutation, ManualSyncMutationVariables>(
    'manualSync',
    resolver
  )
