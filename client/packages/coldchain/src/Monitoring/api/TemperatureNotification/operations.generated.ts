import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type TemperatureNotificationBreachFragment = { __typename: 'TemperatureBreachNode', id: string, startDatetime: string, maxOrMinTemperature?: number | null, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', name: string } | null };

export type TemperatureExcursionFragment = { __typename: 'TemperatureExcursionNode', id: string, startDatetime: string, maxOrMinTemperature: number, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', name: string } | null };

export type TemperatureNotificationsQueryVariables = Types.Exact<{
  page?: Types.InputMaybe<Types.PaginationInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type TemperatureNotificationsQuery = { __typename: 'Queries', temperatureNotifications: { __typename: 'TemperatureNotificationConnector', breaches: { __typename: 'TemperatureBreachConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureBreachNode', id: string, startDatetime: string, maxOrMinTemperature?: number | null, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', name: string } | null }> }, excursions: { __typename: 'TemperatureExcursionConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureExcursionNode', id: string, startDatetime: string, maxOrMinTemperature: number, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', name: string } | null }> } } };

export const TemperatureNotificationBreachFragmentDoc = gql`
    fragment TemperatureNotificationBreach on TemperatureBreachNode {
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
export const TemperatureExcursionFragmentDoc = gql`
    fragment TemperatureExcursion on TemperatureExcursionNode {
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
    query temperatureNotifications($page: PaginationInput, $storeId: String!) {
  temperatureNotifications(page: $page, storeId: $storeId) {
    ... on TemperatureNotificationConnector {
      breaches {
        totalCount
        nodes {
          ...TemperatureNotificationBreach
        }
      }
      excursions {
        totalCount
        nodes {
          ...TemperatureExcursion
        }
      }
    }
  }
}
    ${TemperatureNotificationBreachFragmentDoc}
${TemperatureExcursionFragmentDoc}`;

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