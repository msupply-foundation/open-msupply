import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { SyncFileReferenceFragmentDoc } from '../../Documents/types.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SyncMessageRowFragment = {
  __typename: 'SyncMessageNode';
  id: string;
  body: string;
  type: Types.SyncMessageNodeType;
  status: Types.SyncMessageNodeStatus;
  createdDatetime: string;
  errorMessage?: string | null;
  toStore?: {
    __typename: 'StoreNode';
    id: string;
    code: string;
    storeName: string;
  } | null;
  fromStore?: {
    __typename: 'StoreNode';
    id: string;
    code: string;
    storeName: string;
  } | null;
  files?: {
    __typename: 'SyncFileReferenceConnector';
    nodes: Array<{
      __typename: 'SyncFileReferenceNode';
      id: string;
      fileName: string;
      recordId: string;
      createdDatetime: string;
      status: Types.SyncFileReferenceNodeStatus;
      error?: string | null;
    }>;
  } | null;
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
          id: string;
          body: string;
          type: Types.SyncMessageNodeType;
          status: Types.SyncMessageNodeStatus;
          createdDatetime: string;
          errorMessage?: string | null;
          toStore?: {
            __typename: 'StoreNode';
            id: string;
            code: string;
            storeName: string;
          } | null;
          fromStore?: {
            __typename: 'StoreNode';
            id: string;
            code: string;
            storeName: string;
          } | null;
          files?: {
            __typename: 'SyncFileReferenceConnector';
            nodes: Array<{
              __typename: 'SyncFileReferenceNode';
              id: string;
              fileName: string;
              recordId: string;
              createdDatetime: string;
              status: Types.SyncFileReferenceNodeStatus;
              error?: string | null;
            }>;
          } | null;
        }>;
      };
    };
  };
};

export type SyncMessageByIdQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type SyncMessageByIdQuery = {
  __typename: 'Queries';
  centralServer: {
    __typename: 'CentralServerQueryNode';
    syncMessage: {
      __typename: 'SyncMessageQueries';
      syncMessage:
        | { __typename: 'RecordNotFound' }
        | {
            __typename: 'SyncMessageNode';
            id: string;
            body: string;
            type: Types.SyncMessageNodeType;
            status: Types.SyncMessageNodeStatus;
            createdDatetime: string;
            errorMessage?: string | null;
            toStore?: {
              __typename: 'StoreNode';
              id: string;
              code: string;
              storeName: string;
            } | null;
            fromStore?: {
              __typename: 'StoreNode';
              id: string;
              code: string;
              storeName: string;
            } | null;
            files?: {
              __typename: 'SyncFileReferenceConnector';
              nodes: Array<{
                __typename: 'SyncFileReferenceNode';
                id: string;
                fileName: string;
                recordId: string;
                createdDatetime: string;
                status: Types.SyncFileReferenceNodeStatus;
                error?: string | null;
              }>;
            } | null;
          };
    };
  };
};

export type InsertSyncMessageMutationVariables = Types.Exact<{
  input: Types.InsertSyncMessageInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertSyncMessageMutation = {
  __typename: 'Mutations';
  insertSyncMessage: { __typename: 'IdResponse'; id: string };
};

export const SyncMessageRowFragmentDoc = gql`
  fragment SyncMessageRow on SyncMessageNode {
    id
    body
    type
    status
    toStore {
      id
      code
      storeName
    }
    fromStore {
      id
      code
      storeName
    }
    createdDatetime
    errorMessage
    files {
      __typename
      nodes {
        ...SyncFileReference
      }
    }
  }
  ${SyncFileReferenceFragmentDoc}
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
export const SyncMessageByIdDocument = gql`
  query syncMessageById($id: String!, $storeId: String!) {
    centralServer {
      syncMessage {
        syncMessage(id: $id, storeId: $storeId) {
          ... on SyncMessageNode {
            __typename
            ...SyncMessageRow
          }
        }
      }
    }
  }
  ${SyncMessageRowFragmentDoc}
`;
export const InsertSyncMessageDocument = gql`
  mutation insertSyncMessage(
    $input: InsertSyncMessageInput!
    $storeId: String!
  ) {
    insertSyncMessage(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
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
    syncMessageById(
      variables: SyncMessageByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<SyncMessageByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SyncMessageByIdQuery>(
            SyncMessageByIdDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'syncMessageById',
        'query',
        variables
      );
    },
    insertSyncMessage(
      variables: InsertSyncMessageMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertSyncMessageMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertSyncMessageMutation>(
            InsertSyncMessageDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertSyncMessage',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
