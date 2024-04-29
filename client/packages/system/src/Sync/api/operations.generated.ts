import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type SyncSettingsFragment = { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string };

export type SyncSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncSettingsQuery = { __typename: 'Queries', syncSettings?: { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string } | null };

export type SyncErrorFragment = { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string };

export type InitialiseSiteMutationVariables = Types.Exact<{
  syncSettings: Types.SyncSettingsInput;
}>;


export type InitialiseSiteMutation = { __typename: 'Mutations', initialiseSite: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string } };

export type UpdateSyncSettingsMutationVariables = Types.Exact<{
  syncSettings: Types.SyncSettingsInput;
}>;


export type UpdateSyncSettingsMutation = { __typename: 'Mutations', updateSyncSettings: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string } };

export type SyncStatusFragment = { __typename: 'SyncStatusNode', finished?: string | null, started: string };

export type SyncStatusWithProgressFragment = { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null };

export type FullSyncStatusFragment = { __typename: 'FullSyncStatusNode', isSyncing: boolean, error?: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | null, integration?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, prepareInitial?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, pullCentral?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullRemote?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, push?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullV6?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pushV6?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, summary: { __typename: 'SyncStatusNode', finished?: string | null, started: string }, lastSuccessfulSync?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null };

export type SyncInfoQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncInfoQuery = { __typename: 'Queries', numberOfRecordsInPushQueue: number, syncStatus?: { __typename: 'FullSyncStatusNode', isSyncing: boolean, error?: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | null, integration?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, prepareInitial?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, pullCentral?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullRemote?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, push?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullV6?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pushV6?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, summary: { __typename: 'SyncStatusNode', finished?: string | null, started: string }, lastSuccessfulSync?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null } | null };

export type SyncStatusQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncStatusQuery = { __typename: 'Queries', syncStatus?: { __typename: 'FullSyncStatusNode', isSyncing: boolean, error?: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | null, integration?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, prepareInitial?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, pullCentral?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullRemote?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, push?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullV6?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pushV6?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, summary: { __typename: 'SyncStatusNode', finished?: string | null, started: string }, lastSuccessfulSync?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null } | null };

export type ManualSyncMutationVariables = Types.Exact<{ [key: string]: never; }>;


export type ManualSyncMutation = { __typename: 'Mutations', manualSync: string };

export type UpdateUserFragment = { __typename: 'UpdateUserNode', lastSuccessfulSync?: string | null };

export type UpdateUserMutationVariables = Types.Exact<{ [key: string]: never; }>;


export type UpdateUserMutation = { __typename: 'Mutations', updateUser: { __typename: 'ConnectionError' } | { __typename: 'UpdateUserNode', lastSuccessfulSync?: string | null } };

export type LastSuccessfulUserSyncQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type LastSuccessfulUserSyncQuery = { __typename: 'Queries', lastSuccessfulUserSync: { __typename: 'UpdateUserNode', lastSuccessfulSync?: string | null } };

export const SyncSettingsFragmentDoc = gql`
    fragment SyncSettings on SyncSettingsNode {
  __typename
  intervalSeconds
  url
  username
}
    `;
export const SyncErrorFragmentDoc = gql`
    fragment SyncError on SyncErrorNode {
  __typename
  variant
  fullError
}
    `;
export const SyncStatusWithProgressFragmentDoc = gql`
    fragment SyncStatusWithProgress on SyncStatusWithProgressNode {
  __typename
  finished
  started
  done
  total
}
    `;
export const SyncStatusFragmentDoc = gql`
    fragment SyncStatus on SyncStatusNode {
  __typename
  finished
  started
}
    `;
export const FullSyncStatusFragmentDoc = gql`
    fragment FullSyncStatus on FullSyncStatusNode {
  __typename
  error {
    ...SyncError
  }
  integration {
    ...SyncStatusWithProgress
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
  pullV6 {
    ...SyncStatusWithProgress
  }
  pushV6 {
    ...SyncStatusWithProgress
  }
  summary {
    ...SyncStatus
  }
  lastSuccessfulSync {
    ...SyncStatus
  }
}
    ${SyncErrorFragmentDoc}
${SyncStatusWithProgressFragmentDoc}
${SyncStatusFragmentDoc}`;
export const UpdateUserFragmentDoc = gql`
    fragment UpdateUser on UpdateUserNode {
  lastSuccessfulSync
}
    `;
export const SyncSettingsDocument = gql`
    query syncSettings {
  syncSettings {
    ...SyncSettings
  }
}
    ${SyncSettingsFragmentDoc}`;
export const InitialiseSiteDocument = gql`
    mutation initialiseSite($syncSettings: SyncSettingsInput!) {
  initialiseSite(input: $syncSettings) {
    __typename
    ... on SyncSettingsNode {
      ...SyncSettings
    }
    ... on SyncErrorNode {
      ...SyncError
    }
  }
}
    ${SyncSettingsFragmentDoc}
${SyncErrorFragmentDoc}`;
export const UpdateSyncSettingsDocument = gql`
    mutation updateSyncSettings($syncSettings: SyncSettingsInput!) {
  updateSyncSettings(input: $syncSettings) {
    __typename
    ... on SyncSettingsNode {
      ...SyncSettings
    }
    ... on SyncErrorNode {
      ...SyncError
    }
  }
}
    ${SyncSettingsFragmentDoc}
${SyncErrorFragmentDoc}`;
export const SyncInfoDocument = gql`
    query syncInfo {
  syncStatus: latestSyncStatus {
    ...FullSyncStatus
  }
  numberOfRecordsInPushQueue
}
    ${FullSyncStatusFragmentDoc}`;
export const SyncStatusDocument = gql`
    query syncStatus {
  syncStatus: latestSyncStatus {
    ...FullSyncStatus
  }
}
    ${FullSyncStatusFragmentDoc}`;
export const ManualSyncDocument = gql`
    mutation manualSync {
  manualSync
}
    `;
export const UpdateUserDocument = gql`
    mutation updateUser {
  updateUser {
    __typename
    ... on UpdateUserNode {
      ...UpdateUser
    }
  }
}
    ${UpdateUserFragmentDoc}`;
export const LastSuccessfulUserSyncDocument = gql`
    query lastSuccessfulUserSync {
  lastSuccessfulUserSync {
    __typename
    ...UpdateUser
  }
}
    ${UpdateUserFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    syncSettings(variables?: SyncSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SyncSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncSettingsQuery>(SyncSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncSettings', 'query');
    },
    initialiseSite(variables: InitialiseSiteMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InitialiseSiteMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InitialiseSiteMutation>(InitialiseSiteDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'initialiseSite', 'mutation');
    },
    updateSyncSettings(variables: UpdateSyncSettingsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateSyncSettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSyncSettingsMutation>(UpdateSyncSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateSyncSettings', 'mutation');
    },
    syncInfo(variables?: SyncInfoQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SyncInfoQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncInfoQuery>(SyncInfoDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncInfo', 'query');
    },
    syncStatus(variables?: SyncStatusQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SyncStatusQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncStatusQuery>(SyncStatusDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncStatus', 'query');
    },
    manualSync(variables?: ManualSyncMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ManualSyncMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ManualSyncMutation>(ManualSyncDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'manualSync', 'mutation');
    },
    updateUser(variables?: UpdateUserMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateUserMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateUserMutation>(UpdateUserDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateUser', 'mutation');
    },
    lastSuccessfulUserSync(variables?: LastSuccessfulUserSyncQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LastSuccessfulUserSyncQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LastSuccessfulUserSyncQuery>(LastSuccessfulUserSyncDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'lastSuccessfulUserSync', 'query');
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
 * mockUpdateSyncSettingsMutation((req, res, ctx) => {
 *   const { syncSettings } = req.variables;
 *   return res(
 *     ctx.data({ updateSyncSettings })
 *   )
 * })
 */
export const mockUpdateSyncSettingsMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateSyncSettingsMutationVariables>, GraphQLContext<UpdateSyncSettingsMutation>, any>) =>
  graphql.mutation<UpdateSyncSettingsMutation, UpdateSyncSettingsMutationVariables>(
    'updateSyncSettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockSyncInfoQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ latestSyncStatus, numberOfRecordsInPushQueue })
 *   )
 * })
 */
export const mockSyncInfoQuery = (resolver: ResponseResolver<GraphQLRequest<SyncInfoQueryVariables>, GraphQLContext<SyncInfoQuery>, any>) =>
  graphql.query<SyncInfoQuery, SyncInfoQueryVariables>(
    'syncInfo',
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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateUserMutation((req, res, ctx) => {
 *   return res(
 *     ctx.data({ updateUser })
 *   )
 * })
 */
export const mockUpdateUserMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateUserMutationVariables>, GraphQLContext<UpdateUserMutation>, any>) =>
  graphql.mutation<UpdateUserMutation, UpdateUserMutationVariables>(
    'updateUser',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLastSuccessfulUserSyncQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ lastSuccessfulUserSync })
 *   )
 * })
 */
export const mockLastSuccessfulUserSyncQuery = (resolver: ResponseResolver<GraphQLRequest<LastSuccessfulUserSyncQueryVariables>, GraphQLContext<LastSuccessfulUserSyncQuery>, any>) =>
  graphql.query<LastSuccessfulUserSyncQuery, LastSuccessfulUserSyncQueryVariables>(
    'lastSuccessfulUserSync',
    resolver
  )
