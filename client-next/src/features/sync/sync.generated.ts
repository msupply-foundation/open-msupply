import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SyncStatusQueryVariables = Types.Exact<{ [key: string]: never }>;

export type SyncStatusQuery = {
  __typename: 'Queries';
  numberOfRecordsInPushQueue: number;
  latestSyncStatus?:
    | {
        __typename: 'FullSyncStatusV5V6Node';
        isSyncing: boolean;
        summary: {
          __typename: 'SyncStatusNode';
          started: string;
          finished?: string | null;
        };
        lastSuccessfulSync?: {
          __typename: 'SyncStatusNode';
          finished?: string | null;
        } | null;
        error?: { __typename: 'SyncErrorNode'; fullError: string } | null;
      }
    | {
        __typename: 'FullSyncStatusV7Node';
        isSyncing: boolean;
        summary: {
          __typename: 'SyncStatusV7Node';
          started: string;
          finished?: string | null;
        };
        lastSuccessfulSync?: {
          __typename: 'SyncStatusNode';
          finished?: string | null;
        } | null;
        error?: { __typename: 'SyncErrorV7Node'; fullError: string } | null;
      }
    | null;
};

export type ManualSyncMutationVariables = Types.Exact<{ [key: string]: never }>;

export type ManualSyncMutation = {
  __typename: 'Mutations';
  manualSync: string;
};

export const SyncStatusDocument = gql`
  query syncStatus {
    numberOfRecordsInPushQueue
    latestSyncStatus {
      __typename
      ... on FullSyncStatusV5V6Node {
        isSyncing
        summary {
          started
          finished
        }
        lastSuccessfulSync {
          finished
        }
        error {
          fullError
        }
      }
      ... on FullSyncStatusV7Node {
        isSyncing
        summary {
          started
          finished
        }
        lastSuccessfulSync {
          finished
        }
        error {
          fullError
        }
      }
    }
  }
`;
export const ManualSyncDocument = gql`
  mutation manualSync {
    manualSync
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    syncStatus(
      variables?: SyncStatusQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
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
        variables,
      );
    },
    manualSync(
      variables?: ManualSyncMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
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
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
