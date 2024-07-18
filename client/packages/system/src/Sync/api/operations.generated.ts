import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    syncSettings(variables?: SyncSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SyncSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncSettingsQuery>(SyncSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncSettings', 'query', variables);
    },
    initialiseSite(variables: InitialiseSiteMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InitialiseSiteMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InitialiseSiteMutation>(InitialiseSiteDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'initialiseSite', 'mutation', variables);
    },
    updateSyncSettings(variables: UpdateSyncSettingsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateSyncSettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSyncSettingsMutation>(UpdateSyncSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateSyncSettings', 'mutation', variables);
    },
    syncInfo(variables?: SyncInfoQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SyncInfoQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncInfoQuery>(SyncInfoDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncInfo', 'query', variables);
    },
    syncStatus(variables?: SyncStatusQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SyncStatusQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SyncStatusQuery>(SyncStatusDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'syncStatus', 'query', variables);
    },
    manualSync(variables?: ManualSyncMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ManualSyncMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ManualSyncMutation>(ManualSyncDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'manualSync', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;