import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type TemperatureNotificationFragment = { __typename: 'TemperatureNotificationNode', id: string, startDatetime: string, maxOrMinTemperature?: number | null, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', name: string } | null };

export type TemperatureNotificationsQueryVariables = Types.Exact<{
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.TemperatureNotificationSortInput> | Types.TemperatureNotificationSortInput>;
  filter?: Types.InputMaybe<Types.TemperatureNotificationFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type TemperatureNotificationsQuery = { __typename: 'Queries', temperatureNotifications: { __typename: 'TemperatureNotificationConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureNotificationNode', id: string, startDatetime: string, maxOrMinTemperature?: number | null, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', name: string } | null }> } };

export const TemperatureNotificationFragmentDoc = gql`
    fragment TemperatureNotification on TemperatureNotificationNode {
  __typename
  id
  startDatetime
  maxOrMinTemperature
  sensor {
    id
    name
  }
  location {
    name
  }
}
    `;
export const TemperatureNotificationsDocument = gql`
    query temperatureNotifications($page: PaginationInput, $sort: [TemperatureNotificationSortInput!], $filter: TemperatureNotificationFilterInput, $storeId: String!) {
  temperatureNotifications(
    page: $page
    sort: $sort
    filter: $filter
    storeId: $storeId
  ) {
    ... on TemperatureNotificationConnector {
      totalCount
      nodes {
        ...TemperatureNotification
      }
    }
  }
}
    ${TemperatureNotificationFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    temperatureNotifications(variables: TemperatureNotificationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<TemperatureNotificationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<TemperatureNotificationsQuery>(TemperatureNotificationsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'temperatureNotifications', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockTemperatureNotificationsQuery((req, res, ctx) => {
 *   const { page, sort, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ temperatureNotifications })
 *   )
 * })
 */
export const mockTemperatureNotificationsQuery = (resolver: ResponseResolver<GraphQLRequest<TemperatureNotificationsQueryVariables>, GraphQLContext<TemperatureNotificationsQuery>, any>) =>
  graphql.query<TemperatureNotificationsQuery, TemperatureNotificationsQueryVariables>(
    'temperatureNotifications',
    resolver
  )
