import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SyncMessageRowFragment = {
  __typename: 'SyncMessageNode';
  body: string;
  createdDatetime: string;
  errorMessage?: string | null;
  fromStoreId?: string | null;
  id: string;
  status: Types.SyncMessageNodeStatus;
  toStoreId?: string | null;
  type: Types.SyncMessageNodeType;
};

export type SyncMessagesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.SyncMessageSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.SyncMessageFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type SyncMessagesQuery = {
  __typename: 'Queries';
  centralServer: {
    __typename: 'CentralServerQueryNode';
    syncMessage: {
      __typename: 'SyncMessageQueries';
      syncMessages: {
        __typename: 'SyncMessageConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'SyncMessageNode';
          body: string;
          createdDatetime: string;
          errorMessage?: string | null;
          fromStoreId?: string | null;
          id: string;
          status: Types.SyncMessageNodeStatus;
          toStoreId?: string | null;
          type: Types.SyncMessageNodeType;
        }>;
      };
    };
  };
};

export const SyncMessageRowFragmentDoc = gql`
  fragment SyncMessageRow on SyncMessageNode {
    body
    createdDatetime
    errorMessage
    fromStoreId
    id
    status
    toStoreId
    type
  }
`;
export const SyncMessagesDocument = gql`
  query syncMessages(
    $first: Int
    $offset: Int
    $key: SyncMessageSortFieldInput!
    $desc: Boolean
    $filter: SyncMessageFilterInput
    $storeId: String!
  ) {
    centralServer {
      syncMessage {
        syncMessages(
          storeId: $storeId
          page: { first: $first, offset: $offset }
          sort: { key: $key, desc: $desc }
          filter: $filter
        ) {
          ... on SyncMessageConnector {
            __typename
            nodes {
              ...SyncMessageRow
            }
            totalCount
          }
        }
      }
    }
  }
  ${SyncMessageRowFragmentDoc}
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
    syncMessages(
      variables: SyncMessagesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<SyncMessagesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncMessagesQuery>(SyncMessagesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'syncMessages',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
