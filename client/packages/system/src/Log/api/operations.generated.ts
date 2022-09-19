import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type LogRowFragment = { __typename: 'LogNode', id: string, datetime: any, recordId?: string | null, storeId?: string | null, type: Types.LogNodeType, user?: { __typename: 'UserNode', username: string } | null };

export type LogsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  sort?: Types.InputMaybe<Types.LogSortInput>;
  filter?: Types.InputMaybe<Types.LogFilterInput>;
}>;


export type LogsQuery = { __typename: 'FullQuery', logs: { __typename: 'LogConnector', totalCount: number, nodes: Array<{ __typename: 'LogNode', id: string, datetime: any, recordId?: string | null, storeId?: string | null, type: Types.LogNodeType, user?: { __typename: 'UserNode', username: string } | null }> } };

export const LogRowFragmentDoc = gql`
    fragment LogRow on LogNode {
  id
  datetime
  recordId
  storeId
  type
  user {
    username
  }
}
    `;
export const LogsDocument = gql`
    query logs($first: Int, $offset: Int, $sort: LogSortInput, $filter: LogFilterInput) {
  logs(filter: $filter, page: {first: $first, offset: $offset}, sort: $sort) {
    ... on LogConnector {
      nodes {
        ...LogRow
      }
      totalCount
    }
  }
}
    ${LogRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    logs(variables?: LogsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<LogsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LogsQuery>(LogsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'logs', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLogsQuery((req, res, ctx) => {
 *   const { first, offset, sort, filter } = req.variables;
 *   return res(
 *     ctx.data({ logs })
 *   )
 * })
 */
export const mockLogsQuery = (resolver: ResponseResolver<GraphQLRequest<LogsQueryVariables>, GraphQLContext<LogsQuery>, any>) =>
  graphql.query<LogsQuery, LogsQueryVariables>(
    'logs',
    resolver
  )
