import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/src/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type SyncSettingsFragment = { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string };

export type SyncSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncSettingsQuery = { __typename: 'Queries', syncSettings?: { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string } | null };

export type DisplaySettingsQueryVariables = Types.Exact<{
  input: Types.DisplaySettingsHash;
}>;


export type DisplaySettingsQuery = { __typename: 'Queries', displaySettings: { __typename: 'DisplaySettingsNode', customTheme?: { __typename: 'DisplaySettingNode', value: string, hash: string } | null, customLogo?: { __typename: 'DisplaySettingNode', value: string, hash: string } | null } };

export type SyncErrorFragment = { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string };

export type InitialiseSiteMutationVariables = Types.Exact<{
  syncSettings: Types.SyncSettingsInput;
}>;


export type InitialiseSiteMutation = { __typename: 'Mutations', initialiseSite: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string } };

export type UpdateSyncSettingsMutationVariables = Types.Exact<{
  syncSettings: Types.SyncSettingsInput;
}>;


export type UpdateSyncSettingsMutation = { __typename: 'Mutations', updateSyncSettings: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | { __typename: 'SyncSettingsNode', intervalSeconds: number, url: string, username: string } };

export type UpdateDisplaySettingsMutationVariables = Types.Exact<{
  displaySettings: Types.DisplaySettingsInput;
}>;


export type UpdateDisplaySettingsMutation = { __typename: 'Mutations', updateDisplaySettings: { __typename: 'UpdateDisplaySettingsError', error: string } | { __typename: 'UpdateResult', theme?: string | null, logo?: string | null } };

export type SyncStatusFragment = { __typename: 'SyncStatusNode', finished?: string | null, started: string };

export type SyncStatusWithProgressFragment = { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null };

export type FullSyncStatusFragment = { __typename: 'FullSyncStatusNode', isSyncing: boolean, error?: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | null, integration?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, prepareInitial?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, pullCentral?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullRemote?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, push?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, summary: { __typename: 'SyncStatusNode', finished?: string | null, started: string } };

export type SyncInfoQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncInfoQuery = { __typename: 'Queries', numberOfRecordsInPushQueue: number, syncStatus?: { __typename: 'FullSyncStatusNode', isSyncing: boolean, error?: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | null, integration?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, prepareInitial?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, pullCentral?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullRemote?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, push?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, summary: { __typename: 'SyncStatusNode', finished?: string | null, started: string } } | null };

export type SyncStatusQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type SyncStatusQuery = { __typename: 'Queries', syncStatus?: { __typename: 'FullSyncStatusNode', isSyncing: boolean, error?: { __typename: 'SyncErrorNode', variant: Types.SyncErrorVariant, fullError: string } | null, integration?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, prepareInitial?: { __typename: 'SyncStatusNode', finished?: string | null, started: string } | null, pullCentral?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, pullRemote?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, push?: { __typename: 'SyncStatusWithProgressNode', finished?: string | null, started: string, done?: number | null, total?: number | null } | null, summary: { __typename: 'SyncStatusNode', finished?: string | null, started: string } } | null };

export type ManualSyncMutationVariables = Types.Exact<{ [key: string]: never; }>;


export type ManualSyncMutation = { __typename: 'Mutations', manualSync: string };

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
  done
  total
}
    `;
export const FullSyncStatusFragmentDoc = gql`
    fragment FullSyncStatus on FullSyncStatusNode {
  __typename
  error {
    ...SyncError
  }
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
    ${SyncErrorFragmentDoc}
${SyncStatusFragmentDoc}
${SyncStatusWithProgressFragmentDoc}`;
export const SyncSettingsDocument = gql`
    query syncSettings {
  syncSettings {
    ...SyncSettings
  }
}
    ${SyncSettingsFragmentDoc}`;
export const DisplaySettingsDocument = gql`
    query displaySettings($input: DisplaySettingsHash!) {
  displaySettings(input: $input) {
    customTheme {
      value
      hash
    }
    customLogo {
      value
      hash
    }
  }
}
    `;
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
export const UpdateDisplaySettingsDocument = gql`
    mutation updateDisplaySettings($displaySettings: DisplaySettingsInput!) {
  updateDisplaySettings(input: $displaySettings) {
    __typename
    ... on UpdateResult {
      __typename
      theme
      logo
    }
    ... on UpdateDisplaySettingsError {
      __typename
      error
    }
  }
}
    `;
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    syncSettings(variables?: SyncSettingsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<SyncSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncSettingsQuery>(SyncSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncSettings', 'query');
    },
    displaySettings(variables: DisplaySettingsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DisplaySettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DisplaySettingsQuery>(DisplaySettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'displaySettings', 'query');
    },
    initialiseSite(variables: InitialiseSiteMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InitialiseSiteMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InitialiseSiteMutation>(InitialiseSiteDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'initialiseSite', 'mutation');
    },
    updateSyncSettings(variables: UpdateSyncSettingsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateSyncSettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSyncSettingsMutation>(UpdateSyncSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateSyncSettings', 'mutation');
    },
    updateDisplaySettings(variables: UpdateDisplaySettingsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateDisplaySettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateDisplaySettingsMutation>(UpdateDisplaySettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateDisplaySettings', 'mutation');
    },
    syncInfo(variables?: SyncInfoQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<SyncInfoQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncInfoQuery>(SyncInfoDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncInfo', 'query');
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
 * mockDisplaySettingsQuery((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ displaySettings })
 *   )
 * })
 */
export const mockDisplaySettingsQuery = (resolver: ResponseResolver<GraphQLRequest<DisplaySettingsQueryVariables>, GraphQLContext<DisplaySettingsQuery>, any>) =>
  graphql.query<DisplaySettingsQuery, DisplaySettingsQueryVariables>(
    'displaySettings',
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
 * mockUpdateDisplaySettingsMutation((req, res, ctx) => {
 *   const { displaySettings } = req.variables;
 *   return res(
 *     ctx.data({ updateDisplaySettings })
 *   )
 * })
 */
export const mockUpdateDisplaySettingsMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateDisplaySettingsMutationVariables>, GraphQLContext<UpdateDisplaySettingsMutation>, any>) =>
  graphql.mutation<UpdateDisplaySettingsMutation, UpdateDisplaySettingsMutationVariables>(
    'updateDisplaySettings',
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
