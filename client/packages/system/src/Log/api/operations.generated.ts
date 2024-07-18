import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type LogLevelRowFragment = { __typename: 'LogLevelNode', level: Types.LogLevelEnum };

export type LogRowFragment = { __typename: 'LogNode', fileContent?: Array<string> | null, fileNames?: Array<string> | null };

export type LogLevelQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type LogLevelQuery = { __typename: 'Queries', logLevel: { __typename: 'LogLevelNode', level: Types.LogLevelEnum } };

export type LogFileNamesQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type LogFileNamesQuery = { __typename: 'Queries', logFileNames: { __typename: 'LogNode', fileContent?: Array<string> | null, fileNames?: Array<string> | null } };

export type LogContentsByFileNameQueryVariables = Types.Exact<{
  fileName: Types.Scalars['String']['input'];
}>;


export type LogContentsByFileNameQuery = { __typename: 'Queries', logContents: { __typename: 'LogNode', fileContent?: Array<string> | null, fileNames?: Array<string> | null } };

export const LogLevelRowFragmentDoc = gql`
    fragment LogLevelRow on LogLevelNode {
  __typename
  level
}
    `;
export const LogRowFragmentDoc = gql`
    fragment LogRow on LogNode {
  __typename
  fileContent
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
    ${LogLevelRowFragmentDoc}`;
export const LogFileNamesDocument = gql`
    query logFileNames {
  logFileNames {
    __typename
    ... on LogNode {
      ...LogRow
    }
  }
}
    ${LogRowFragmentDoc}`;
export const LogContentsByFileNameDocument = gql`
    query logContentsByFileName($fileName: String!) {
  logContents(fileName: $fileName) {
    __typename
    ... on LogNode {
      ...LogRow
    }
  }
}
    ${LogRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    logLevel(variables?: LogLevelQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LogLevelQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LogLevelQuery>(LogLevelDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'logLevel', 'query', variables);
    },
    logFileNames(variables?: LogFileNamesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LogFileNamesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LogFileNamesQuery>(LogFileNamesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'logFileNames', 'query', variables);
    },
    logContentsByFileName(variables: LogContentsByFileNameQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LogContentsByFileNameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LogContentsByFileNameQuery>(LogContentsByFileNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'logContentsByFileName', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;