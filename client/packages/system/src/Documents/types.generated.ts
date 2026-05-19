import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SyncFileReferenceFragment = {
  __typename: 'SyncFileReferenceNode';
  id: string;
  fileName: string;
  recordId: string;
  createdDatetime: string;
};

export type DummyQueryVariables = Types.Exact<{ [key: string]: never }>;

export type DummyQuery = {
  __typename: 'Queries';
  me: { __typename: 'UserNode' };
};

export const SyncFileReferenceFragmentDoc = gql`
  fragment SyncFileReference on SyncFileReferenceNode {
    __typename
    id
    fileName
    recordId
    createdDatetime
  }
`;
export const DummyDocument = gql`
  query Dummy {
    me {
      ... on UserNode {
        __typename
      }
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
    Dummy(
      variables?: DummyQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DummyQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DummyQuery>({
            document: DummyDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'Dummy',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
