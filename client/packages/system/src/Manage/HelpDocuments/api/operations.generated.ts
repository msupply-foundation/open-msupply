import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type HelpDocumentFileFragment = {
  __typename: 'SyncFileReferenceNode';
  id: string;
  fileName: string;
  mimeType?: string | null;
  createdDatetime: string;
  status: Types.SyncFileReferenceNodeStatus;
};

export type HelpDocumentRowFragment = {
  __typename: 'HelpDocumentNode';
  id: string;
  title: string;
  createdDatetime: string;
  files: {
    __typename: 'SyncFileReferenceConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'SyncFileReferenceNode';
      id: string;
      fileName: string;
      mimeType?: string | null;
      createdDatetime: string;
      status: Types.SyncFileReferenceNodeStatus;
    }>;
  };
};

export type HelpDocumentsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  filter?: Types.InputMaybe<Types.HelpDocumentFilterInput>;
}>;

export type HelpDocumentsQuery = {
  __typename: 'Queries';
  helpDocuments: {
    __typename: 'HelpDocumentConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'HelpDocumentNode';
      id: string;
      title: string;
      createdDatetime: string;
      files: {
        __typename: 'SyncFileReferenceConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'SyncFileReferenceNode';
          id: string;
          fileName: string;
          mimeType?: string | null;
          createdDatetime: string;
          status: Types.SyncFileReferenceNodeStatus;
        }>;
      };
    }>;
  };
};

export type InsertHelpDocumentMutationVariables = Types.Exact<{
  input: Types.InsertHelpDocumentInput;
}>;

export type InsertHelpDocumentMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    helpDocument: {
      __typename: 'HelpDocumentMutations';
      insertHelpDocument:
        | {
            __typename: 'HelpDocumentNode';
            id: string;
            title: string;
            createdDatetime: string;
            files: {
              __typename: 'SyncFileReferenceConnector';
              totalCount: number;
              nodes: Array<{
                __typename: 'SyncFileReferenceNode';
                id: string;
                fileName: string;
                mimeType?: string | null;
                createdDatetime: string;
                status: Types.SyncFileReferenceNodeStatus;
              }>;
            };
          }
        | {
            __typename: 'InsertHelpDocumentError';
            error:
              | {
                  __typename: 'DatabaseError';
                  description: string;
                  fullError: string;
                }
              | {
                  __typename: 'InternalError';
                  description: string;
                  fullError: string;
                }
              | { __typename: 'RecordAlreadyExist'; description: string };
          };
    };
  };
};

export type DeleteHelpDocumentMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
}>;

export type DeleteHelpDocumentMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    helpDocument: {
      __typename: 'HelpDocumentMutations';
      deleteHelpDocument:
        | {
            __typename: 'DeleteHelpDocumentError';
            error:
              | {
                  __typename: 'DatabaseError';
                  description: string;
                  fullError: string;
                }
              | { __typename: 'InternalError'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | { __typename: 'DeleteResponse'; id: string };
    };
  };
};

export const HelpDocumentFileFragmentDoc = gql`
  fragment HelpDocumentFile on SyncFileReferenceNode {
    __typename
    id
    fileName
    mimeType
    createdDatetime
    status
  }
`;
export const HelpDocumentRowFragmentDoc = gql`
  fragment HelpDocumentRow on HelpDocumentNode {
    __typename
    id
    title
    createdDatetime
    files {
      __typename
      totalCount
      nodes {
        __typename
        ...HelpDocumentFile
      }
    }
  }
  ${HelpDocumentFileFragmentDoc}
`;
export const HelpDocumentsDocument = gql`
  query helpDocuments(
    $first: Int
    $offset: Int
    $filter: HelpDocumentFilterInput
  ) {
    helpDocuments(page: { first: $first, offset: $offset }, filter: $filter) {
      __typename
      ... on HelpDocumentConnector {
        __typename
        totalCount
        nodes {
          __typename
          ...HelpDocumentRow
        }
      }
    }
  }
  ${HelpDocumentRowFragmentDoc}
`;
export const InsertHelpDocumentDocument = gql`
  mutation insertHelpDocument($input: InsertHelpDocumentInput!) {
    centralServer {
      helpDocument {
        insertHelpDocument(input: $input) {
          ... on InsertHelpDocumentError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
              ... on InternalError {
                __typename
                description
                fullError
              }
              ... on RecordAlreadyExist {
                __typename
                description
              }
            }
          }
          ... on HelpDocumentNode {
            ...HelpDocumentRow
          }
        }
      }
    }
  }
  ${HelpDocumentRowFragmentDoc}
`;
export const DeleteHelpDocumentDocument = gql`
  mutation deleteHelpDocument($id: String!) {
    centralServer {
      helpDocument {
        deleteHelpDocument(input: { id: $id }) {
          ... on DeleteHelpDocumentError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
              ... on RecordNotFound {
                __typename
                description
              }
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
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
    helpDocuments(
      variables?: HelpDocumentsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<HelpDocumentsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<HelpDocumentsQuery>({
            document: HelpDocumentsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'helpDocuments',
        'query',
        variables
      );
    },
    insertHelpDocument(
      variables: InsertHelpDocumentMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertHelpDocumentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertHelpDocumentMutation>({
            document: InsertHelpDocumentDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertHelpDocument',
        'mutation',
        variables
      );
    },
    deleteHelpDocument(
      variables: DeleteHelpDocumentMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteHelpDocumentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteHelpDocumentMutation>({
            document: DeleteHelpDocumentDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteHelpDocument',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
