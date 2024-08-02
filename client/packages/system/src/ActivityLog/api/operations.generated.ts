import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ActivityLogRowFragment = { __typename: 'ActivityLogNode', id: string, datetime: string, to?: string | null, from?: string | null, recordId?: string | null, storeId?: string | null, type: Types.ActivityLogNodeType, user?: { __typename: 'UserNode', username: string } | null };

export type ActivityLogsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  sort?: Types.InputMaybe<Array<Types.ActivityLogSortInput> | Types.ActivityLogSortInput>;
  filter?: Types.InputMaybe<Types.ActivityLogFilterInput>;
}>;


export type ActivityLogsQuery = { __typename: 'Queries', activityLogs: { __typename: 'ActivityLogConnector', totalCount: number, nodes: Array<{ __typename: 'ActivityLogNode', id: string, datetime: string, to?: string | null, from?: string | null, recordId?: string | null, storeId?: string | null, type: Types.ActivityLogNodeType, user?: { __typename: 'UserNode', username: string } | null }> } };

export const ActivityLogRowFragmentDoc = gql`
    fragment ActivityLogRow on ActivityLogNode {
  id
  datetime
  to
  from
  recordId
  storeId
  type
  user {
    username
  }
}
    `;
export const ActivityLogsDocument = gql`
    query activityLogs($first: Int, $offset: Int, $sort: [ActivityLogSortInput!], $filter: ActivityLogFilterInput) {
  activityLogs(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: $sort
  ) {
    ... on ActivityLogConnector {
      nodes {
        ...ActivityLogRow
      }
      totalCount
    }
  }
}
    ${ActivityLogRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    activityLogs(variables?: ActivityLogsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ActivityLogsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ActivityLogsQuery>(ActivityLogsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'activityLogs', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;