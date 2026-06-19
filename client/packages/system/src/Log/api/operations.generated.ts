import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type LogLevelRowFragment = {
  __typename: 'LogLevelNode';
  level: Types.LogLevelEnum;
};

export type LogRowFragment = {
  __typename: 'LogNode';
  fileNames?: Array<string> | null;
};

export type LogLevelQueryVariables = Types.Exact<{ [key: string]: never }>;

export type LogLevelQuery = {
  __typename: 'Queries';
  logLevel: { __typename: 'LogLevelNode'; level: Types.LogLevelEnum };
};

export type LogFileNamesQueryVariables = Types.Exact<{ [key: string]: never }>;

export type LogFileNamesQuery = {
  __typename: 'Queries';
  logFileNames: { __typename: 'LogNode'; fileNames?: Array<string> | null };
};

export const LogLevelRowFragmentDoc = gql`
  fragment LogLevelRow on LogLevelNode {
    __typename
    level
  }
`;
export const LogRowFragmentDoc = gql`
  fragment LogRow on LogNode {
    __typename
    fileNames
  }
`;
export const LogLevelDocument = gql`
  query logLevel {
    logLevel {
      __typename
      ... on LogLevelNode {
        ...LogLevelRow
      }
    }
  }
  ${LogLevelRowFragmentDoc}
`;
export const LogFileNamesDocument = gql`
  query logFileNames {
    logFileNames {
      __typename
      ... on LogNode {
        ...LogRow
      }
    }
  }
  ${LogRowFragmentDoc}
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
    logLevel(
      variables?: LogLevelQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<LogLevelQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<LogLevelQuery>({
            document: LogLevelDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'logLevel',
        'query',
        variables
      );
    },
    logFileNames(
      variables?: LogFileNamesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<LogFileNamesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<LogFileNamesQuery>({
            document: LogFileNamesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'logFileNames',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
