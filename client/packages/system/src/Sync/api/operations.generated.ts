import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SyncSettingsFragment = {
  __typename: 'SyncSettingsNode';
  intervalSeconds: number;
  url: string;
  username: string;
  centralServerSiteId?: number | null;
  syncSiteId?: number | null;
};

export type SyncSettingsQueryVariables = Types.Exact<{ [key: string]: never }>;

export type SyncSettingsQuery = {
  __typename: 'Queries';
  syncSettings?: {
    __typename: 'SyncSettingsNode';
    intervalSeconds: number;
    url: string;
    username: string;
    centralServerSiteId?: number | null;
    syncSiteId?: number | null;
  } | null;
};

export type SyncErrorFragment = {
  __typename: 'SyncErrorNode';
  variant: Types.SyncErrorVariant;
  fullError: string;
};

export type InitialiseSiteMutationVariables = Types.Exact<{
  syncSettings: Types.SyncSettingsInput;
}>;

export type InitialiseSiteMutation = {
  __typename: 'Mutations';
  initialiseSite:
    | {
        __typename: 'SyncErrorNode';
        variant: Types.SyncErrorVariant;
        fullError: string;
      }
    | {
        __typename: 'SyncSettingsNode';
        intervalSeconds: number;
        url: string;
        username: string;
        centralServerSiteId?: number | null;
        syncSiteId?: number | null;
      };
};

export type UpdateSyncSettingsMutationVariables = Types.Exact<{
  syncSettings: Types.SyncSettingsInput;
}>;

export type UpdateSyncSettingsMutation = {
  __typename: 'Mutations';
  updateSyncSettings:
    | {
        __typename: 'SyncErrorNode';
        variant: Types.SyncErrorVariant;
        fullError: string;
      }
    | {
        __typename: 'SyncSettingsNode';
        intervalSeconds: number;
        url: string;
        username: string;
        centralServerSiteId?: number | null;
        syncSiteId?: number | null;
      };
};

export type SyncStatusFragment = {
  __typename: 'SyncStatusNode';
  finished?: string | null;
  durationInSeconds: number;
  started: string;
};

export type SyncStatusWithProgressFragment = {
  __typename: 'SyncStatusWithProgressNode';
  finished?: string | null;
  started: string;
  done?: number | null;
  total?: number | null;
};

export type FullSyncStatusFragment = {
  __typename: 'FullSyncStatusNode';
  isSyncing: boolean;
  errorThreshold: number;
  warningThreshold: number;
  error?: {
    __typename: 'SyncErrorNode';
    variant: Types.SyncErrorVariant;
    fullError: string;
  } | null;
  integration?: {
    __typename: 'SyncStatusWithProgressNode';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  prepareInitial?: {
    __typename: 'SyncStatusNode';
    finished?: string | null;
    durationInSeconds: number;
    started: string;
  } | null;
  pullCentral?: {
    __typename: 'SyncStatusWithProgressNode';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  pullRemote?: {
    __typename: 'SyncStatusWithProgressNode';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  push?: {
    __typename: 'SyncStatusWithProgressNode';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  pullV6?: {
    __typename: 'SyncStatusWithProgressNode';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  pushV6?: {
    __typename: 'SyncStatusWithProgressNode';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  summary: {
    __typename: 'SyncStatusNode';
    finished?: string | null;
    durationInSeconds: number;
    started: string;
  };
  lastSuccessfulSync?: {
    __typename: 'SyncStatusNode';
    finished?: string | null;
    durationInSeconds: number;
    started: string;
  } | null;
};

export type SyncInfoQueryVariables = Types.Exact<{ [key: string]: never }>;

export type SyncInfoQuery = {
  __typename: 'Queries';
  numberOfRecordsInPushQueue: number;
  syncStatus?: {
    __typename: 'FullSyncStatusNode';
    isSyncing: boolean;
    errorThreshold: number;
    warningThreshold: number;
    error?: {
      __typename: 'SyncErrorNode';
      variant: Types.SyncErrorVariant;
      fullError: string;
    } | null;
    integration?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    prepareInitial?: {
      __typename: 'SyncStatusNode';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
    pullCentral?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    pullRemote?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    push?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    pullV6?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    pushV6?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    summary: {
      __typename: 'SyncStatusNode';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    };
    lastSuccessfulSync?: {
      __typename: 'SyncStatusNode';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
  } | null;
};

export type SyncStatusQueryVariables = Types.Exact<{ [key: string]: never }>;

export type SyncStatusQuery = {
  __typename: 'Queries';
  syncStatus?: {
    __typename: 'FullSyncStatusNode';
    isSyncing: boolean;
    errorThreshold: number;
    warningThreshold: number;
    error?: {
      __typename: 'SyncErrorNode';
      variant: Types.SyncErrorVariant;
      fullError: string;
    } | null;
    integration?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    prepareInitial?: {
      __typename: 'SyncStatusNode';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
    pullCentral?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    pullRemote?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    push?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    pullV6?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    pushV6?: {
      __typename: 'SyncStatusWithProgressNode';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    summary: {
      __typename: 'SyncStatusNode';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    };
    lastSuccessfulSync?: {
      __typename: 'SyncStatusNode';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
  } | null;
};

export type ManualSyncMutationVariables = Types.Exact<{
  fetchPatientId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;

export type ManualSyncMutation = {
  __typename: 'Mutations';
  manualSync: string;
};

export type SyncInfoUpdatedSubscriptionVariables = Types.Exact<{
  [key: string]: never;
}>;

export type SyncInfoUpdatedSubscription = {
  __typename: 'Subscriptions';
  syncInfoUpdated: {
    __typename: 'SyncInfoUpdatedNode';
    numberOfRecordsInPushQueue: number;
    syncStatus?: {
      __typename: 'FullSyncStatusNode';
      isSyncing: boolean;
      errorThreshold: number;
      warningThreshold: number;
      error?: {
        __typename: 'SyncErrorNode';
        variant: Types.SyncErrorVariant;
        fullError: string;
      } | null;
      integration?: {
        __typename: 'SyncStatusWithProgressNode';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      prepareInitial?: {
        __typename: 'SyncStatusNode';
        finished?: string | null;
        durationInSeconds: number;
        started: string;
      } | null;
      pullCentral?: {
        __typename: 'SyncStatusWithProgressNode';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      pullRemote?: {
        __typename: 'SyncStatusWithProgressNode';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      push?: {
        __typename: 'SyncStatusWithProgressNode';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      pullV6?: {
        __typename: 'SyncStatusWithProgressNode';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      pushV6?: {
        __typename: 'SyncStatusWithProgressNode';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      summary: {
        __typename: 'SyncStatusNode';
        finished?: string | null;
        durationInSeconds: number;
        started: string;
      };
      lastSuccessfulSync?: {
        __typename: 'SyncStatusNode';
        finished?: string | null;
        durationInSeconds: number;
        started: string;
      } | null;
    } | null;
  };
};

export type SyncErrorV7Fragment = {
  __typename: 'SyncErrorV7Node';
  variant: Types.SyncErrorVariantV7;
  fullError: string;
};

export type SyncStatusV7Fragment = {
  __typename: 'SyncStatusV7Node';
  finished?: string | null;
  durationInSeconds: number;
  started: string;
};

export type SyncStatusWithProgressV7Fragment = {
  __typename: 'SyncStatusWithProgressV7Node';
  finished?: string | null;
  started: string;
  done?: number | null;
  total?: number | null;
};

export type FullSyncStatusV7Fragment = {
  __typename: 'FullSyncStatusV7Node';
  isSyncing: boolean;
  errorThreshold: number;
  warningThreshold: number;
  error?: {
    __typename: 'SyncErrorV7Node';
    variant: Types.SyncErrorVariantV7;
    fullError: string;
  } | null;
  summary: {
    __typename: 'SyncStatusV7Node';
    finished?: string | null;
    durationInSeconds: number;
    started: string;
  };
  push?: {
    __typename: 'SyncStatusWithProgressV7Node';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  waitingForIntegration?: {
    __typename: 'SyncStatusV7Node';
    finished?: string | null;
    durationInSeconds: number;
    started: string;
  } | null;
  pull?: {
    __typename: 'SyncStatusWithProgressV7Node';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  integration?: {
    __typename: 'SyncStatusWithProgressV7Node';
    finished?: string | null;
    started: string;
    done?: number | null;
    total?: number | null;
  } | null;
  lastSuccessfulSync?: {
    __typename: 'SyncStatusV7Node';
    finished?: string | null;
    durationInSeconds: number;
    started: string;
  } | null;
};

export type SyncInfoV7QueryVariables = Types.Exact<{ [key: string]: never }>;

export type SyncInfoV7Query = {
  __typename: 'Queries';
  numberOfRecordsInPushQueue: number;
  syncStatus?: {
    __typename: 'FullSyncStatusV7Node';
    isSyncing: boolean;
    errorThreshold: number;
    warningThreshold: number;
    error?: {
      __typename: 'SyncErrorV7Node';
      variant: Types.SyncErrorVariantV7;
      fullError: string;
    } | null;
    summary: {
      __typename: 'SyncStatusV7Node';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    };
    push?: {
      __typename: 'SyncStatusWithProgressV7Node';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    waitingForIntegration?: {
      __typename: 'SyncStatusV7Node';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
    pull?: {
      __typename: 'SyncStatusWithProgressV7Node';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    integration?: {
      __typename: 'SyncStatusWithProgressV7Node';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    lastSuccessfulSync?: {
      __typename: 'SyncStatusV7Node';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
  } | null;
};

export type SyncStatusV7QueryVariables = Types.Exact<{ [key: string]: never }>;

export type SyncStatusV7Query = {
  __typename: 'Queries';
  syncStatus?: {
    __typename: 'FullSyncStatusV7Node';
    isSyncing: boolean;
    errorThreshold: number;
    warningThreshold: number;
    error?: {
      __typename: 'SyncErrorV7Node';
      variant: Types.SyncErrorVariantV7;
      fullError: string;
    } | null;
    summary: {
      __typename: 'SyncStatusV7Node';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    };
    push?: {
      __typename: 'SyncStatusWithProgressV7Node';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    waitingForIntegration?: {
      __typename: 'SyncStatusV7Node';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
    pull?: {
      __typename: 'SyncStatusWithProgressV7Node';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    integration?: {
      __typename: 'SyncStatusWithProgressV7Node';
      finished?: string | null;
      started: string;
      done?: number | null;
      total?: number | null;
    } | null;
    lastSuccessfulSync?: {
      __typename: 'SyncStatusV7Node';
      finished?: string | null;
      durationInSeconds: number;
      started: string;
    } | null;
  } | null;
};

export type SyncInfoV7UpdatedSubscriptionVariables = Types.Exact<{
  [key: string]: never;
}>;

export type SyncInfoV7UpdatedSubscription = {
  __typename: 'Subscriptions';
  syncInfoV7Updated: {
    __typename: 'SyncInfoV7UpdatedNode';
    numberOfRecordsInPushQueue: number;
    syncStatus?: {
      __typename: 'FullSyncStatusV7Node';
      isSyncing: boolean;
      errorThreshold: number;
      warningThreshold: number;
      error?: {
        __typename: 'SyncErrorV7Node';
        variant: Types.SyncErrorVariantV7;
        fullError: string;
      } | null;
      summary: {
        __typename: 'SyncStatusV7Node';
        finished?: string | null;
        durationInSeconds: number;
        started: string;
      };
      push?: {
        __typename: 'SyncStatusWithProgressV7Node';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      waitingForIntegration?: {
        __typename: 'SyncStatusV7Node';
        finished?: string | null;
        durationInSeconds: number;
        started: string;
      } | null;
      pull?: {
        __typename: 'SyncStatusWithProgressV7Node';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      integration?: {
        __typename: 'SyncStatusWithProgressV7Node';
        finished?: string | null;
        started: string;
        done?: number | null;
        total?: number | null;
      } | null;
      lastSuccessfulSync?: {
        __typename: 'SyncStatusV7Node';
        finished?: string | null;
        durationInSeconds: number;
        started: string;
      } | null;
    } | null;
  };
};

export const SyncSettingsFragmentDoc = gql`
  fragment SyncSettings on SyncSettingsNode {
    __typename
    intervalSeconds
    url
    username
    centralServerSiteId
    syncSiteId
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
    durationInSeconds
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
    errorThreshold
    warningThreshold
  }
  ${SyncErrorFragmentDoc}
  ${SyncStatusWithProgressFragmentDoc}
  ${SyncStatusFragmentDoc}
`;
export const SyncErrorV7FragmentDoc = gql`
  fragment SyncErrorV7 on SyncErrorV7Node {
    __typename
    variant
    fullError
  }
`;
export const SyncStatusV7FragmentDoc = gql`
  fragment SyncStatusV7 on SyncStatusV7Node {
    __typename
    finished
    durationInSeconds
    started
  }
`;
export const SyncStatusWithProgressV7FragmentDoc = gql`
  fragment SyncStatusWithProgressV7 on SyncStatusWithProgressV7Node {
    __typename
    finished
    started
    done
    total
  }
`;
export const FullSyncStatusV7FragmentDoc = gql`
  fragment FullSyncStatusV7 on FullSyncStatusV7Node {
    __typename
    isSyncing
    error {
      ...SyncErrorV7
    }
    summary {
      ...SyncStatusV7
    }
    push {
      ...SyncStatusWithProgressV7
    }
    waitingForIntegration {
      ...SyncStatusV7
    }
    pull {
      ...SyncStatusWithProgressV7
    }
    integration {
      ...SyncStatusWithProgressV7
    }
    lastSuccessfulSync {
      ...SyncStatusV7
    }
    errorThreshold
    warningThreshold
  }
  ${SyncErrorV7FragmentDoc}
  ${SyncStatusV7FragmentDoc}
  ${SyncStatusWithProgressV7FragmentDoc}
`;
export const SyncSettingsDocument = gql`
  query syncSettings {
    syncSettings {
      ...SyncSettings
    }
  }
  ${SyncSettingsFragmentDoc}
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
  ${SyncErrorFragmentDoc}
`;
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
  ${SyncErrorFragmentDoc}
`;
export const SyncInfoDocument = gql`
  query syncInfo {
    syncStatus: latestSyncStatus {
      ...FullSyncStatus
    }
    numberOfRecordsInPushQueue
  }
  ${FullSyncStatusFragmentDoc}
`;
export const SyncStatusDocument = gql`
  query syncStatus {
    syncStatus: latestSyncStatus {
      ...FullSyncStatus
    }
  }
  ${FullSyncStatusFragmentDoc}
`;
export const ManualSyncDocument = gql`
  mutation manualSync($fetchPatientId: String) {
    manualSync(fetchPatientId: $fetchPatientId)
  }
`;
export const SyncInfoUpdatedDocument = gql`
  subscription syncInfoUpdated {
    syncInfoUpdated {
      syncStatus {
        ...FullSyncStatus
      }
      numberOfRecordsInPushQueue
    }
  }
  ${FullSyncStatusFragmentDoc}
`;
export const SyncInfoV7Document = gql`
  query syncInfoV7 {
    syncStatus: latestSyncStatusV7 {
      ...FullSyncStatusV7
    }
    numberOfRecordsInPushQueue
  }
  ${FullSyncStatusV7FragmentDoc}
`;
export const SyncStatusV7Document = gql`
  query syncStatusV7 {
    syncStatus: latestSyncStatusV7 {
      ...FullSyncStatusV7
    }
  }
  ${FullSyncStatusV7FragmentDoc}
`;
export const SyncInfoV7UpdatedDocument = gql`
  subscription syncInfoV7Updated {
    syncInfoV7Updated {
      syncStatus {
        ...FullSyncStatusV7
      }
      numberOfRecordsInPushQueue
    }
  }
  ${FullSyncStatusV7FragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    syncSettings(
      variables?: SyncSettingsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SyncSettingsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncSettingsQuery>({
            document: SyncSettingsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'syncSettings',
        'query',
        variables
      );
    },
    initialiseSite(
      variables: InitialiseSiteMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InitialiseSiteMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InitialiseSiteMutation>({
            document: InitialiseSiteDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'initialiseSite',
        'mutation',
        variables
      );
    },
    updateSyncSettings(
      variables: UpdateSyncSettingsMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateSyncSettingsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateSyncSettingsMutation>({
            document: UpdateSyncSettingsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateSyncSettings',
        'mutation',
        variables
      );
    },
    syncInfo(
      variables?: SyncInfoQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SyncInfoQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncInfoQuery>({
            document: SyncInfoDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'syncInfo',
        'query',
        variables
      );
    },
    syncStatus(
      variables?: SyncStatusQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SyncStatusQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncStatusQuery>({
            document: SyncStatusDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'syncStatus',
        'query',
        variables
      );
    },
    manualSync(
      variables?: ManualSyncMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ManualSyncMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ManualSyncMutation>({
            document: ManualSyncDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'manualSync',
        'mutation',
        variables
      );
    },
    syncInfoUpdated(
      variables?: SyncInfoUpdatedSubscriptionVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SyncInfoUpdatedSubscription> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncInfoUpdatedSubscription>({
            document: SyncInfoUpdatedDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'syncInfoUpdated',
        'subscription',
        variables
      );
    },
    syncInfoV7(
      variables?: SyncInfoV7QueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SyncInfoV7Query> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncInfoV7Query>({
            document: SyncInfoV7Document,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'syncInfoV7',
        'query',
        variables
      );
    },
    syncStatusV7(
      variables?: SyncStatusV7QueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SyncStatusV7Query> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncStatusV7Query>({
            document: SyncStatusV7Document,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'syncStatusV7',
        'query',
        variables
      );
    },
    syncInfoV7Updated(
      variables?: SyncInfoV7UpdatedSubscriptionVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SyncInfoV7UpdatedSubscription> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncInfoV7UpdatedSubscription>({
            document: SyncInfoV7UpdatedDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'syncInfoV7Updated',
        'subscription',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
