import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InitialisationStatusQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type InitialisationStatusQuery = {
  __typename: 'Queries';
  initialisationStatus: {
    __typename: 'InitialisationStatusNode';
    status: Types.InitialisationStatusType;
    siteName?: string | null;
  };
};

export type InitialisationStatusUpdatedSubscriptionVariables = Types.Exact<{
  [key: string]: never;
}>;

export type InitialisationStatusUpdatedSubscription = {
  __typename: 'Subscriptions';
  initialisationStatusUpdated: {
    __typename: 'InitialisationStatusNode';
    status: Types.InitialisationStatusType;
    siteName?: string | null;
  };
};

export const InitialisationStatusDocument = gql`
  query initialisationStatus {
    initialisationStatus {
      status
      siteName
    }
  }
`;
export const InitialisationStatusUpdatedDocument = gql`
  subscription initialisationStatusUpdated {
    initialisationStatusUpdated {
      status
      siteName
    }
  }
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
    initialisationStatus(
      variables?: InitialisationStatusQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InitialisationStatusQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InitialisationStatusQuery>({
            document: InitialisationStatusDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'initialisationStatus',
        'query',
        variables
      );
    },
    initialisationStatusUpdated(
      variables?: InitialisationStatusUpdatedSubscriptionVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InitialisationStatusUpdatedSubscription> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InitialisationStatusUpdatedSubscription>({
            document: InitialisationStatusUpdatedDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'initialisationStatusUpdated',
        'subscription',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
